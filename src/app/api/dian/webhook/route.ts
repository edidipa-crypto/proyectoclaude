import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSecret } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/dian/webhook
//
// n8n reporta aquí el resultado de cada envío a la DIAN (SendBillSync /
// GetStatus / GetStatusZip). Autenticación: header `x-webhook-secret`.
//
// Ejemplo de payload:
// {
//   "event": "dian.status",
//   "invoiceId": "8f4c…",            // o "number": "FE-10453"
//   "status": "aceptado",
//   "cufe": "c0f3a8…",
//   "trackId": "…",
//   "statusCode": "00",
//   "message": "Procesado Correctamente.",
//   "errors": [],
//   "xmlUrl": "https://…/FE-10453.xml",
//   "pdfUrl": "https://…/FE-10453.pdf"
// }
// ---------------------------------------------------------------------------

const webhookSchema = z
  .object({
    event: z.enum(["dian.status", "dian.sent", "dian.error"]).default("dian.status"),
    invoiceId: z.string().uuid().optional(),
    number: z.string().optional(),
    status: z.enum(["pendiente", "enviado", "aceptado", "aceptado_con_notificaciones", "rechazado", "error"]),
    cufe: z.string().optional(),
    trackId: z.string().optional(),
    statusCode: z.string().optional(),
    message: z.string().optional(),
    errors: z.array(z.string()).default([]),
    xmlUrl: z.string().url().optional(),
    pdfUrl: z.string().url().optional(),
    issuedAt: z.string().datetime({ offset: true }).optional(),
  })
  .refine((d) => d.invoiceId || d.number, { message: "Se requiere invoiceId o number" });

export async function POST(request: Request) {
  const denied = requireSecret(
    request.headers.get("x-webhook-secret"),
    process.env.DIAN_WEBHOOK_SECRET,
    "DIAN_WEBHOOK_SECRET",
  );
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validación fallida", issues: parsed.error.issues }, { status: 422 });
  }
  const evt = parsed.data;

  const supabase = createAdminClient();
  if (!supabase) {
    // Modo demo: se acusa recibo sin persistir.
    return NextResponse.json({ received: true, persisted: false, status: evt.status });
  }

  const update: Record<string, unknown> = {
    dian_status: evt.status,
    dian_message: [evt.message, ...evt.errors].filter(Boolean).join(" | ") || null,
    updated_at: new Date().toISOString(),
  };
  if (evt.cufe) update.cufe = evt.cufe;
  if (evt.number) update.number = evt.number;
  if (evt.xmlUrl) update.xml_url = evt.xmlUrl;
  if (evt.pdfUrl) update.pdf_url = evt.pdfUrl;
  if (evt.issuedAt) update.issued_at = evt.issuedAt;

  const query = supabase.from("invoices").update(update);
  const { data: invoice, error } = await (evt.invoiceId ? query.eq("id", evt.invoiceId) : query.eq("number", evt.number!))
    .select("id, work_order_id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar la factura", detail: error.message }, { status: 502 });
  }
  if (!invoice) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }

  await supabase.from("dian_events").insert({ invoice_id: invoice.id, event_type: evt.event, payload: evt });

  // Factura aceptada => la OT pasa a "facturada".
  if (evt.status === "aceptado" || evt.status === "aceptado_con_notificaciones") {
    await supabase.from("work_orders").update({ status: "facturada" }).eq("id", invoice.work_order_id);
  }

  return NextResponse.json({ received: true, persisted: true, invoiceId: invoice.id, status: evt.status });
}
