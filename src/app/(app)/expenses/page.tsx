import Link from "next/link";

import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getExpenses, today } from "@/lib/data";
import { lastMonths, monthLabel, monthOf } from "@/lib/dates";
import { userWithAccess } from "@/lib/session";
import { formatCOP, formatDate } from "@/lib/utils";

export const metadata = { title: "Gastos · DieselPro" };

export default async function ExpensesPage({ searchParams }: { searchParams: { mes?: string } }) {
  const user = await userWithAccess("expenses");
  if (!user) return <NoAccess />;
  const months = lastMonths(today(), 6);
  const month = months.includes(searchParams.mes ?? "") ? searchParams.mes! : months.at(-1)!;
  const list = (await getExpenses()).filter((e) => monthOf(e.date) === month);
  const total = list.reduce((s, e) => s + e.amount, 0);
  const byCategory = [...list.reduce((m, e) => m.set(e.category, (m.get(e.category) ?? 0) + e.amount), new Map<string, number>())].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader title="Gastos generales" description={`Total de ${monthLabel(month).toLowerCase()} ${month.slice(0, 4)}: ${formatCOP(total)}`} />
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Mes">
        <span className="mr-1 text-sm text-muted-foreground">Mes:</span>
        {[...months].reverse().map((m) => (
          <Button key={m} asChild size="sm" variant={m === month ? "default" : "outline"}>
            <Link href={`/expenses?mes=${m}`}>
              {monthLabel(m)} {m.slice(2, 4)}
            </Link>
          </Button>
        ))}
      </div>
      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {byCategory.map(([category, value]) => (
                <li key={category}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{category}</span>
                    <span className="shrink-0 tabular-nums">{formatCOP(value)}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full" style={{ width: `${(value / total) * 100}%`, background: "var(--chart-1)" }} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detalle</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(e.date)}</TableCell>
                    <TableCell className="whitespace-nowrap">{e.category}</TableCell>
                    <TableCell className="min-w-[200px]">{e.description}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{formatCOP(e.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
      <p className="text-xs text-muted-foreground">El registro de gastos nuevos llega en la Fase 5.</p>
    </>
  );
}
