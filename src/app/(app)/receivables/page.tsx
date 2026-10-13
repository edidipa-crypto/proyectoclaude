import Link from "next/link";

import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReceivables } from "@/lib/data";
import { AGING_LABEL, agingBucket, type AgingBucket } from "@/lib/money";
import { userWithAccess } from "@/lib/session";
import { cn, formatCOP, formatDate, formatPercent } from "@/lib/utils";

export const metadata = { title: "Cartera · DieselPro" };

const BUCKETS = Object.keys(AGING_LABEL) as AgingBucket[];

export default async function ReceivablesPage() {
  const user = await userWithAccess("receivables");
  if (!user) return <NoAccess />;
  const pending = (await getReceivables()).filter((r) => r.balance > 0).sort((a, b) => b.daysOverdue - a.daysOverdue);
  const total = pending.reduce((s, r) => s + r.balance, 0);
  const byBucket = BUCKETS.map((b) => ({ bucket: b, value: pending.filter((r) => agingBucket(r.daysOverdue) === b).reduce((s, r) => s + r.balance, 0) }));

  const byClient = new Map<string, { id: string; name: string; balance: number; overdue: number; count: number }>();
  for (const r of pending) {
    const c = byClient.get(r.clientId) ?? { id: r.client.id, name: r.client.name, balance: 0, overdue: 0, count: 0 };
    c.balance += r.balance;
    if (r.daysOverdue > 0) c.overdue += r.balance;
    c.count++;
    byClient.set(r.clientId, c);
  }

  return (
    <>
      <PageHeader title="Cartera" description={`Por cobrar ${formatCOP(total)} en ${pending.length} facturas. Valores netos de retenciones.`} />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5" aria-label="Edades de cartera">
        {byBucket.map(({ bucket, value }) => (
          <Card key={bucket} className={cn(bucket !== "al_dia" && value > 0 && "border-amber-300 dark:border-amber-800")}>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">{AGING_LABEL[bucket]}</p>
              <p className="mt-2 text-lg font-bold tabular-nums">{formatCOP(value)}</p>
              <p className="text-xs text-muted-foreground">{formatPercent(total ? (value / total) * 100 : 0)} del total</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Por cliente</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <ul className="divide-y text-sm">
              {[...byClient.values()]
                .sort((a, b) => b.balance - a.balance)
                .map((c) => (
                  <li key={c.id}>
                    <Link href={`/clients/${c.id}`} className="flex justify-between gap-3 px-6 py-3 hover:bg-muted/50">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.count} facturas</span>
                      </span>
                      <span className="whitespace-nowrap text-right tabular-nums">
                        {formatCOP(c.balance)}
                        {c.overdue > 0 && <span className="block text-xs text-destructive">{formatCOP(c.overdue)} vencido</span>}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Facturas pendientes</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      <p className="font-mono text-xs font-semibold">{r.number}</p>
                      <p className="font-mono text-xs text-muted-foreground">{r.workOrder.code}</p>
                    </TableCell>
                    <TableCell className="min-w-[180px]">{r.client.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.dueDate && formatDate(r.dueDate)}</TableCell>
                    <TableCell>
                      {r.daysOverdue > 0 ? (
                        <Badge variant={r.daysOverdue > 60 ? "destructive" : "warning"} className="whitespace-nowrap">
                          Vencida {r.daysOverdue} días
                        </Badge>
                      ) : (
                        <Badge variant="success">Al día</Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{formatCOP(r.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
      <p className="text-xs text-muted-foreground">El registro de abonos y pagos llega en la Fase 4, junto con la facturación electrónica real.</p>
    </>
  );
}
