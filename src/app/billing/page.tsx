import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DIAN_STATUS } from "@/lib/constants";
import { getInvoices, getWorkOrders } from "@/lib/data";
import { formatCOP, formatDate } from "@/lib/utils";

export const metadata = { title: "Facturación DIAN · DieselPro" };

const FLOW = [
  { step: "1", title: "Emitir", body: "El taller (o n8n) llama POST /api/billing/emit con la OT; se valida y se registra la factura como pendiente." },
  { step: "2", title: "UBL 2.1", body: "n8n construye el XML UBL 2.1, calcula el CUFE, firma con el certificado y lo envía al web service de la DIAN." },
  { step: "3", title: "Estado", body: "n8n reporta la respuesta de la DIAN en POST /api/dian/webhook y el estado se actualiza aquí." },
];

export default async function BillingPage() {
  const [invoices, workOrders] = await Promise.all([getInvoices(), getWorkOrders()]);
  const woById = new Map(workOrders.map((w) => [w.id, w]));

  return (
    <>
      <PageHeader
        title="Facturación electrónica DIAN"
        description="Documentos UBL 2.1 orquestados por n8n: emisión, validación previa y acuse de la DIAN."
      />

      <section className="grid gap-4 md:grid-cols-3">
        {FLOW.map((f) => (
          <Card key={f.step}>
            <CardContent className="flex gap-3 p-5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {f.step}
              </span>
              <div>
                <p className="font-semibold">{f.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Documentos electrónicos</CardTitle>
          <CardDescription>Últimas facturas generadas desde órdenes de trabajo</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Número</TableHead>
                <TableHead>OT / Cliente</TableHead>
                <TableHead>Estado DIAN</TableHead>
                <TableHead>CUFE</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const wo = woById.get(inv.workOrderId);
                const s = DIAN_STATUS[inv.dianStatus];
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="whitespace-nowrap">
                      <p className="font-mono text-xs font-semibold">{inv.number ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{inv.issuedAt ? formatDate(inv.issuedAt) : "Sin emitir"}</p>
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <p className="font-mono text-xs">{wo?.code}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{wo?.client}</p>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <Badge variant={s.variant} className="whitespace-nowrap">{s.label}</Badge>
                      {inv.message && <p className="mt-1 text-xs text-muted-foreground">{inv.message}</p>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{inv.cufe ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{formatCOP(inv.total)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
