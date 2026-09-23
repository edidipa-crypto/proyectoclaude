import { NextResponse } from "next/server";
import { z } from "zod";

import { bearerToken, requireSecret } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/billing/emit
//
// Punto de entrada para emitir una factura electrónica a partir de una OT.
// Lo invoca n8n (o el propio dashboard) con `Authorization: Bearer <BILLING_API_TOKEN>`.
//
//  1. Valida el payload y calcula subtotales / impuestos por tarifa.
//  2. Registra la factura como "pendiente" en Supabase (idempotente).
//  3. Opcionalmente reenvía el documento normalizado al webhook de n8n, que
//     genera el XML UBL 2.1, calcula CUFE, firma y lo envía a la DIAN.
//     El resultado vuelve por POST /api/dian/webhook.
// ---------------------------------------------------------------------------

const lineSchema = z.object({
  code: z.string().min(1), // SKU o código de servicio
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitCode: z.string().default("94"), // 94 = unidad (UN/ECE rec 20)
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  taxRate: z.union([z.literal(0), z.literal(5), z.literal(19)]).default(19), // IVA
});

const emitSchema = z.object({
  workOrderId: z.string().min(1),
  idempotencyKey: z.string().min(8).optional(),
  documentType: z.enum(["01", "02", "03", "91", "92"]).default("01"), // 01 factura de venta, 91 NC, 92 ND
  currency: z.literal("COP").default("COP"),
  customer: z.object({
    name: z.string().min(1),
    idType: z.enum(["13", "31"]), // 13 CC, 31 NIT
    idNumber: z.string().regex(/^\d+$/, "Solo dígitos, sin DV"),
    dv: z.string().regex(/^\d$/).optional(),
    email: z.string().email(),
    address: z.string().optional(),
    cityCode: z.string().optional(), // código DANE
  }),
  payment: z
    .object({
      form: z.enum(["1", "2"]).default("1"), // 1 contado, 2 crédito
      method: z.string().default("10"), // 10 efectivo, 42 consignación, 47 transferencia...
      dueDate: z.string().optional(),
    })
    .default({ form: "1", method: "10" }),
  lines: z.array(lineSchema).min(1),
  notes: z.string().max(5000).optional(),
  dispatchToN8n: z.boolean().default(false),
});

export type EmitRequest = z.infer<typeof emitSchema>;

const round2 = (n: number) => Math.round(n * 100) / 100;

function computeTotals(lines: EmitRequest["lines"]) {
  const computed = lines.map((l, i) => {
    const lineExtension = round2(l.quantity * l.unitPrice - l.discount);
    const taxAmount = round2((lineExtension * l.taxRate) / 100);
    return { ...l, lineNumber: i + 1, lineExtension, taxAmount };
  });

  const taxes = new Map<number, { taxableAmount: number; taxAmount: number }>();
  for (const l of computed) {
    const t = taxes.get(l.taxRate) ?? { taxableAmount: 0, taxAmount: 0 };
    taxes.set(l.taxRate, {
      taxableAmount: round2(t.taxableAmount + l.lineExtension),
      taxAmount: round2(t.taxAmount + l.taxAmount),
    });
  }

  const subtotal = round2(computed.reduce((a, l) => a + l.lineExtension, 0));
  const taxTotal = round2(computed.reduce((a, l) => a + l.taxAmount, 0));

  return {
    lines: computed,
    taxSubtotals: [...taxes.entries()].map(([rate, v]) => ({ taxScheme: "01", rate, ...v })), // 01 = IVA
    subtotal,
    taxTotal,
    total: round2(subtotal + taxTotal),
  };
}

export async function POST(request: Request) {
  const denied = requireSecret(bearerToken(request), process.env.BILLING_API_TOKEN, "BILLING_API_TOKEN");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = emitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validación fallida", issues: parsed.error.issues }, { status: 422 });
  }

  const input = parsed.data;
  const idempotencyKey = request.headers.get("idempotency-key") ?? input.idempotencyKey ?? null;
  const totals = computeTotals(input.lines);

  const document = {
    ublVersion: "UBL 2.1",
    customizationId: "10", // operación estándar
    profileExecutionId: process.env.DIAN_ENVIRONMENT === "production" ? "1" : "2", // 1 prod, 2 habilitación
    documentType: input.documentType,
    currency: input.currency,
    issueDate: new Date().toISOString().slice(0, 10),
    workOrderId: input.workOrderId,
    customer: input.customer,
    payment: input.payment,
    notes: input.notes,
    ...totals,
  };

  // --- Persistencia (si Supabase está configurado) ------------------------
  let invoiceId: string | null = null;
  const supabase = createAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("invoices")
      .upsert(
        {
          work_order_id: input.workOrderId,
          subtotal: totals.subtotal,
          tax_total: totals.taxTotal,
          total: totals.total,
          dian_status: "pendiente",
          idempotency_key: idempotencyKey,
        },
        { onConflict: "idempotency_key", ignoreDuplicates: false },
      )
      .select("id, dian_status")
      .single();

    if (error) {
      return NextResponse.json({ error: "No se pudo registrar la factura", detail: error.message }, { status: 502 });
    }
    invoiceId = data.id;
  }

  // --- Reenvío opcional a n8n --------------------------------------------
  let dispatched = false;
  if (input.dispatchToN8n) {
    const url = process.env.N8N_BILLING_WEBHOOK_URL;
    if (!url) {
      return NextResponse.json({ error: "N8N_BILLING_WEBHOOK_URL no configurado" }, { status: 500 });
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}) },
      body: JSON.stringify({ invoiceId, document }),
      signal: AbortSignal.timeout(15_000),
    }).catch((e: Error) => ({ ok: false, status: 0, statusText: e.message }) as const);

    if (!res.ok) {
      return NextResponse.json(
        { error: "n8n no aceptó el documento", status: res.status, detail: res.statusText, invoiceId },
        { status: 502 },
      );
    }
    dispatched = true;
  }

  return NextResponse.json(
    { invoiceId, status: "pendiente", persisted: Boolean(supabase), dispatched, document },
    { status: 202 },
  );
}
