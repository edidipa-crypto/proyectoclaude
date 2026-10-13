import Link from "next/link";
import { AlertTriangle, Boxes, PackageCheck, Wallet } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVENTORY_CATEGORY } from "@/lib/constants";
import { getInventory } from "@/lib/data";
import { can } from "@/lib/permissions";
import { userWithAccess } from "@/lib/session";
import { formatCOP } from "@/lib/utils";

export const metadata = { title: "Inventario Diésel · DieselPro" };

export default async function InventoryPage() {
  const user = await userWithAccess("inventory");
  if (!user) return <NoAccess />;
  const showCosts = can(user.role, "costs");
  const items = await getInventory();
  const value = items.reduce((a, i) => a + i.stock * i.unitCost, 0);
  const low = items.filter((i) => i.stock <= i.minStock);
  // Pedido sugerido: llevar cada referencia al doble del mínimo
  const toOrder = low.map((i) => ({ ...i, qty: i.minStock * 2 - i.stock }));

  return (
    <>
      <PageHeader
        title="Inventario diésel"
        description="Inyectores common rail, bombas de alta presión, turbos, filtros y sensores. Costo promedio ponderado."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Referencias" value={String(items.length)} icon={Boxes} hint="SKUs activos" />
        {showCosts && <KpiCard title="Valor del inventario" value={formatCOP(value)} icon={Wallet} hint="a costo promedio" />}
        <KpiCard title="Bajo mínimo" value={String(low.length)} icon={AlertTriangle} hint="requieren pedido" />
        <KpiCard title="Con stock sano" value={String(items.length - low.length)} icon={PackageCheck} />
      </section>

      {toOrder.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Qué pedir</CardTitle>
            <CardDescription>Referencias en el mínimo o por debajo; cantidad sugerida para quedar en el doble del mínimo.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <ul className="divide-y text-sm">
              {toOrder.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-6 py-2.5">
                  <span className="min-w-0">
                    <Link href={`/inventory/${i.id}`} className="font-medium text-primary hover:underline">
                      {i.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      Hay {i.stock} · mínimo {i.minStock}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-right">
                    <span className="font-semibold tabular-nums">
                      {i.qty} {i.unit}
                    </span>
                    {showCosts && <span className="block text-xs text-muted-foreground tabular-nums">≈ {formatCOP(i.qty * i.unitCost)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Repuesto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Ref. OEM</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                {showCosts && <TableHead className="text-right">Costo prom.</TableHead>}
                <TableHead className="text-right">Precio venta</TableHead>
                {showCosts && <TableHead className="text-right">Valor</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="min-w-[240px]">
                    <Link href={`/inventory/${i.id}`} className="font-medium text-primary hover:underline">
                      {i.name}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">{i.sku}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{INVENTORY_CATEGORY[i.category]}</TableCell>
                  <TableCell className="font-mono text-xs">{i.oemRef}</TableCell>
                  <TableCell className="font-mono text-xs">{i.location}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {i.stock <= i.minStock && (
                        <Badge variant="warning">
                          <AlertTriangle className="h-3 w-3" aria-hidden /> Bajo mínimo
                        </Badge>
                      )}
                      <span className="whitespace-nowrap tabular-nums">
                        {i.stock} <span className="text-xs text-muted-foreground">/ mín {i.minStock}</span>
                      </span>
                    </div>
                  </TableCell>
                  {showCosts && <TableCell className="whitespace-nowrap text-right tabular-nums">{formatCOP(i.unitCost)}</TableCell>}
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{formatCOP(i.salePrice)}</TableCell>
                  {showCosts && (
                    <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{formatCOP(i.stock * i.unitCost)}</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
