import { AlertTriangle, CalendarClock, Wallet } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROVIDER_TYPE } from "@/lib/constants";
import { getPayables, today } from "@/lib/data";
import { addDays, daysBetween } from "@/lib/dates";
import { userWithAccess } from "@/lib/session";
import { formatCOP, formatDate } from "@/lib/utils";

export const metadata = { title: "Cuentas por pagar · DieselPro" };

export default async function PayablesPage() {
  const user = await userWithAccess("payables");
  if (!user) return <NoAccess />;
  const pending = (await getPayables()).filter((p) => p.balance > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdue = pending.filter((p) => p.daysOverdue > 0);
  const week = pending.filter((p) => p.daysOverdue === 0 && p.dueDate <= addDays(today(), 7));
  const sum = (list: typeof pending) => list.reduce((s, p) => s + p.balance, 0);

  return (
    <>
      <PageHeader title="Cuentas por pagar" description="Facturas pendientes de proveedores de repuestos y talleres externos." />
      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Total por pagar" value={formatCOP(sum(pending))} icon={Wallet} hint={`${pending.length} facturas`} />
        <KpiCard title="Vencidas" value={formatCOP(sum(overdue))} icon={AlertTriangle} hint={`${overdue.length} facturas`} />
        <KpiCard title="Vencen en 7 días" value={formatCOP(sum(week))} icon={CalendarClock} hint={`${week.length} facturas`} />
      </section>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Proveedor</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((p) => {
                const left = daysBetween(today(), p.dueDate);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="min-w-[200px]">
                      <p className="font-medium">{p.provider.name}</p>
                      <p className="text-xs text-muted-foreground">{PROVIDER_TYPE[p.provider.type]}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{p.invoiceRef}</TableCell>
                    <TableCell className="min-w-[220px]">{p.concept}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(p.dueDate)}
                      <span className="block pt-1">
                        {p.daysOverdue > 0 ? (
                          <Badge variant="destructive">Vencida {p.daysOverdue} d</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{left === 0 ? "Vence hoy" : `En ${left} días`}</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{formatCOP(p.amount)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{formatCOP(p.balance)}</TableCell>
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
