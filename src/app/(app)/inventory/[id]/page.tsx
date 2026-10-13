import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/layout/back-link";
import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVENTORY_CATEGORY } from "@/lib/constants";
import { getInventoryItem, getWorkOrderRecords } from "@/lib/data";
import { can } from "@/lib/permissions";
import { userWithAccess } from "@/lib/session";
import { formatCOP, formatDate } from "@/lib/utils";

const MOVEMENT = {
  entrada: { label: "Entrada", variant: "success" },
  salida: { label: "Salida a OT", variant: "info" },
  ajuste: { label: "Ajuste", variant: "warning" },
} as const;

export default async function InventoryItemPage({ params }: { params: { id: string } }) {
  const user = await userWithAccess("inventory");
  if (!user) return <NoAccess />;
  const found = await getInventoryItem(params.id);
  if (!found) notFound();
  const { item, kardex } = found;
  const showCosts = can(user.role, "costs");
  const linkOrders = can(user.role, "work-orders");
  const idByCode = new Map((await getWorkOrderRecords()).map((w) => [w.code, w.id]));
  const rows = [...kardex].reverse();

  return (
    <>
      <BackLink href="/inventory">Inventario diésel</BackLink>
      <PageHeader title={item.name} description={`${item.sku} · OEM ${item.oemRef} · ${item.brand} · Ubicación ${item.location}`} />

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Item label="Categoría">{INVENTORY_CATEGORY[item.category]}</Item>
              <Item label="Existencia">
                {item.stock} {item.unit}
              </Item>
              <Item label="Mínimo">
                {item.minStock} {item.unit}
              </Item>
              <Item label="Precio de venta">{formatCOP(item.salePrice)}</Item>
              {showCosts && <Item label="Costo promedio">{formatCOP(item.unitCost)}</Item>}
              {showCosts && <Item label="Valor en bodega">{formatCOP(item.stock * item.unitCost)}</Item>}
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Kárdex</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Movimiento</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  {showCosts && <TableHead className="text-right">Costo unit.</TableHead>}
                  <TableHead className="text-right">Saldo</TableHead>
                  {showCosts && <TableHead className="text-right">Costo prom.</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((k) => {
                  const m = MOVEMENT[k.type];
                  const orderId = idByCode.get(k.reference);
                  const sign = k.type === "entrada" || (k.type === "ajuste" && k.quantity > 0) ? "+" : "−";
                  return (
                    <TableRow key={k.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(k.date)}</TableCell>
                      <TableCell>
                        <Badge variant={m.variant} className="whitespace-nowrap">
                          {m.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {orderId && linkOrders ? (
                          <Link href={`/work-orders/${orderId}`} className="text-primary hover:underline">
                            {k.reference}
                          </Link>
                        ) : (
                          k.reference
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {sign}
                        {Math.abs(k.quantity)}
                      </TableCell>
                      {showCosts && <TableCell className="whitespace-nowrap text-right tabular-nums">{formatCOP(k.unitCost)}</TableCell>}
                      <TableCell className="text-right font-medium tabular-nums">{k.balance}</TableCell>
                      {showCosts && <TableCell className="whitespace-nowrap text-right tabular-nums">{formatCOP(k.averageCost)}</TableCell>}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
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
