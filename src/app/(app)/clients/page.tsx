import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clientDocument, getClients, getReceivables, getVehicles } from "@/lib/data";
import { userWithAccess } from "@/lib/session";
import { cn, formatCOP } from "@/lib/utils";

export const metadata = { title: "Clientes y vehículos · DieselPro" };

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await userWithAccess("clients");
  if (!user) return <NoAccess />;
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const [clients, vehicles, receivables] = await Promise.all([getClients(), getVehicles(), getReceivables()]);
  const balances = new Map<string, number>();
  for (const r of receivables) balances.set(r.clientId, (balances.get(r.clientId) ?? 0) + r.balance);
  const matches = (id: string) => vehicles.some((v) => v.clientId === id && v.plate.toLowerCase().includes(q));
  const list = clients.filter((c) => !q || c.name.toLowerCase().includes(q) || c.idNumber.includes(q) || matches(c.id));

  return (
    <>
      <PageHeader
        title="Clientes y vehículos"
        description={`${clients.length} clientes · ${vehicles.length} vehículos y máquinas`}
        actions={
          user.role !== "contabilidad" && (
            <Button asChild>
              <Link href="/clients/new">
                <Plus /> Nuevo cliente
              </Link>
            </Button>
          )
        }
      />
      <form role="search" className="relative sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={searchParams.q} placeholder="Buscar por nombre, NIT, cédula o placa…" className="pl-9" aria-label="Buscar clientes" />
      </form>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-right">Vehículos</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Saldo por cobrar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No se encontraron clientes.
                  </TableCell>
                </TableRow>
              )}
              {list.map((c) => {
                const balance = balances.get(c.id) ?? 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="min-w-[240px]">
                      <Link href={`/clients/${c.id}`} className="font-medium text-primary hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{clientDocument(c)} · {c.city}</p>
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      {c.contactName && <p>{c.contactName}</p>}
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{vehicles.filter((v) => v.clientId === c.id).length}</TableCell>
                    <TableCell>
                      {c.paymentTermDays === 0 ? <Badge variant="outline">Contado</Badge> : <Badge variant="info">Crédito {c.paymentTermDays} días</Badge>}
                    </TableCell>
                    <TableCell className={cn("whitespace-nowrap text-right tabular-nums", balance === 0 ? "text-muted-foreground" : "font-medium")}>
                      {formatCOP(balance)}
                    </TableCell>
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
