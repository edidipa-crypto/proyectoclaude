import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { BackLink } from "@/components/layout/back-link";
import { NoAccess } from "@/components/layout/no-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WORK_ORDER_STATUS } from "@/lib/constants";
import { getClient, getUsers, getVehicle, getWorkOrderRecords } from "@/lib/data";
import { computeTotals } from "@/lib/money";
import { can } from "@/lib/permissions";
import { userWithAccess } from "@/lib/session";
import { formatCOP, formatDate } from "@/lib/utils";

export default async function VehiclePage({ params }: { params: { id: string } }) {
  const user = await userWithAccess("clients");
  if (!user) return <NoAccess />;
  const vehicle = await getVehicle(params.id);
  if (!vehicle) notFound();
  const [client, records, users] = await Promise.all([getClient(vehicle.clientId), getWorkOrderRecords(), getUsers()]);
  const history = records.filter((w) => w.vehicleId === vehicle.id);
  const parts = history.flatMap((w) => w.lines.filter((l) => l.kind === "part").map((l) => ({ ...l, code: w.code, date: w.openedAt })));
  const isMachine = vehicle.type === "Maquinaria";
  const canOpenOrders = can(user.role, "work-orders");

  return (
    <>
      <BackLink href={`/clients/${vehicle.clientId}`}>{client?.name}</BackLink>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded border bg-amber-100 px-3 py-1 font-mono text-xl font-bold tracking-wider text-slate-900 dark:bg-amber-400">{vehicle.plate}</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {vehicle.brand} {vehicle.model} {vehicle.year}
            </h1>
            <p className="text-sm text-muted-foreground">
              {vehicle.type} · {vehicle.engine} ·{" "}
              {isMachine ? `${(vehicle.hourMeter ?? 0).toLocaleString("es-CO")} horas` : `${vehicle.odometerKm.toLocaleString("es-CO")} km`}
            </p>
          </div>
        </div>
        {canOpenOrders && (
          <Button asChild>
            <Link href={`/work-orders/new?vehicle=${vehicle.id}`}>
              <Plus /> Nueva OT
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de servicios ({history.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>OT</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">{isMachine ? "Horómetro" : "Km"}</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((w) => {
                const s = WORK_ORDER_STATUS[w.status];
                return (
                  <TableRow key={w.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs font-semibold">
                      {canOpenOrders ? <Link href={`/work-orders/${w.id}`} className="text-primary hover:underline">{w.code}</Link> : w.code}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(w.openedAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">{(isMachine ? w.hourMeter ?? 0 : w.odometerKm).toLocaleString("es-CO")}</TableCell>
                    <TableCell className="min-w-[220px]">{w.service}</TableCell>
                    <TableCell className="whitespace-nowrap">{users.find((u) => u.id === w.technicianId)?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.variant} className="whitespace-nowrap">{s.label}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{formatCOP(computeTotals(w.lines).total)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repuestos instalados</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {parts.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">Sin repuestos registrados.</p>
          ) : (
            <ul className="divide-y text-sm">
              {parts.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 px-6 py-2.5">
                  <span>
                    {p.description}
                    <span className="block text-xs text-muted-foreground">
                      {p.code} · {formatDate(p.date)}
                    </span>
                  </span>
                  <span className="whitespace-nowrap tabular-nums text-muted-foreground">× {p.quantity.toLocaleString("es-CO")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
