import { AlertTriangle, Boxes, PackageCheck, Wallet } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVENTORY_CATEGORY } from "@/lib/constants";
import { getInventory } from "@/lib/data";
import { formatCOP } from "@/lib/utils";

export const metadata = { title: "Inventario Diésel · DieselPro" };

export default async function InventoryPage() {
  const items = await getInventory();
  const value = items.reduce((a, i) => a + i.stock * i.unitCost, 0);
  const low = items.filter((i) => i.stock < i.minStock);

  return (
    <>
      <PageHeader
        title="Inventario diésel"
        description="Inyectores common rail, bombas de alta presión, turbos, filtros y sensores."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Referencias" value={String(items.length)} icon={Boxes} hint="SKUs activos" />
        <KpiCard title="Valor del inventario" value={formatCOP(value)} icon={Wallet} hint="a costo" />
        <KpiCard title="Bajo mínimo" value={String(low.length)} icon={AlertTriangle} hint="requieren pedido" />
        <KpiCard title="Con stock sano" value={String(items.length - low.length)} icon={PackageCheck} />
      </section>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Repuesto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Ref. OEM</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Costo unit.</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="min-w-[240px]">
                    <p className="font-medium">{i.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{i.sku}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{INVENTORY_CATEGORY[i.category]}</TableCell>
                  <TableCell className="font-mono text-xs">{i.oemRef}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {i.stock < i.minStock && (
                        <Badge variant="warning">
                          <AlertTriangle className="h-3 w-3" aria-hidden /> Bajo mínimo
                        </Badge>
                      )}
                      <span className="tabular-nums">
                        {i.stock} <span className="text-xs text-muted-foreground">/ mín {i.minStock}</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{formatCOP(i.unitCost)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                    {formatCOP(i.stock * i.unitCost)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
