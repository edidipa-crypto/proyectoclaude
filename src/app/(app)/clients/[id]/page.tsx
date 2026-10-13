import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ClipboardList, HandCoins, Plus } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { BackLink } from "@/components/layout/back-link";
import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WORK_ORDER_STATUS } from "@/lib/constants";
import { clientDocument, getClient, getReceivables, getVehicles, getWorkOrders } from "@/lib/data";
import { can } from "@/lib/permissions";
import { userWithAccess } from "@/lib/session";
import { formatCOP, formatDate, workOrderTotal } from "@/lib/utils";

export default async function ClientPage({ params }: { params: { id: string } }) {
  const user = await userWithAccess("clients");
  if (!user) return <NoAccess />;
  const client = await getClient(params.id);
  if (!client) notFound();

  const [vehicles, orders, receivables] = await Promise.all([getVehicles(), getWorkOrders(), getReceivables()]);
  const fleet = vehicles.filter((v) => v.clientId === client.id);
  const history = orders.filter((o) => o.clientId === client.id);
  const invoices = receivables.filter((r) => r.clientId === client.id);
  const balance = invoices.reduce((s, r) => s + r.balance, 0);
  const overdue = invoices.filter((r) => r.daysOverdue > 0).reduce((s, r) => s + r.balance, 0);
  const billed = invoices.reduce((s, r) => s + r.subtotal, 0);
  const canOpenOrders = can(user.role, "work-orders");
  const withholdings = [client.withholdings.income && "Retefuente", client.withholdings.vat && "ReteIVA", client.withholdings.ica && "ReteICA"].filter(Boolean);

  return (
    <>
      <BackLink href="/clients">Clientes y vehículos</BackLink>
      <PageHeader
        title={client.name}
        description={`${clientDocument(client)} · ${client.city}`}
        actions={
          canOpenOrders && (
            <Button asChild>
              <Link href="/work-orders/new">
                <Plus /> Nueva OT
              </Link>
            </Button>
          )
        }
      />
      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Facturado (12 meses)" value={formatCOP(billed)} icon={ClipboardList} hint={`${invoices.length} facturas, sin IVA`} />
        <KpiCard title="Saldo por cobrar" value={formatCOP(balance)} icon={HandCoins} hint={overdue > 0 ? `${formatCOP(overdue)} vencido` : "Nada vencido"} />
        <KpiCard
          title="Condición de pago"
          value={client.paymentTermDays === 0 ? "Contado" : `${client.paymentTermDays} días`}
          icon={CalendarClock}
          hint={withholdings.length ? `Practica ${withholdings.join(", ")}` : "No practica retenciones"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contacto y facturación</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {client.contactName && <Item label="Persona de contacto">{client.contactName}</Item>}
              <Item label="Teléfono">{client.phone}</Item>
              <Item label="Correo para factura electrónica">{client.billingEmail || "—"}</Item>
              <Item label="Dirección">{client.address || "—"}</Item>
            </dl>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vehículos y máquinas ({fleet.length})</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <ul className="divide-y text-sm">
              {fleet.map((v) => (
                <li key={v.id}>
                  <Link href={`/vehicles/${v.id}`} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/50">
                    <span>
                      <span className="mr-2 rounded border bg-amber-100 px-1.5 py-0.5 font-mono text-xs text-slate-900 dark:bg-amber-400">{v.plate}</span>
                      {v.brand} {v.model} {v.year}
                      <span className="block pt-1 text-xs text-muted-foreground">{v.type} · {v.engine}</span>
                    </span>
                    <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                      {v.type === "Maquinaria" ? `${(v.hourMeter ?? 0).toLocaleString("es-CO")} h` : `${v.odometerKm.toLocaleString("es-CO")} km`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Últimas órdenes de trabajo</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <ul className="divide-y text-sm">
            {history.slice(0, 15).map((o) => {
              const s = WORK_ORDER_STATUS[o.status];
              return (
                <li key={o.id}>
                  <Link
                    href={canOpenOrders ? `/work-orders/${o.id}` : `/clients/${client.id}`}
                    className="flex flex-col gap-1 px-6 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      <span className="font-mono text-xs font-semibold">{o.code}</span> · {o.vehicle.plate} · {formatDate(o.openedAt)}
                      <span className="block truncate text-muted-foreground">{o.service}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <Badge variant={s.variant}>{s.label}</Badge>
                      <span className="whitespace-nowrap tabular-nums">{formatCOP(workOrderTotal(o))}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
