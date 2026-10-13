import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WORK_ORDER_PRIORITY, WORK_ORDER_STATUS } from "@/lib/constants";
import { getClients, getUsers, getVehicles, getWorkOrderRecords, today } from "@/lib/data";
import { daysBetween } from "@/lib/dates";
import { userWithAccess } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { WorkOrderStatus } from "@/types";

export const metadata = { title: "Mis trabajos · DieselPro" };

const ORDER: WorkOrderStatus[] = ["en_reparacion", "aprobada", "diagnostico", "recibida", "esperando_repuestos", "en_tercero", "cotizada", "lista"];

export default async function TechnicianPage({ searchParams }: { searchParams: { tecnico?: string } }) {
  const user = await userWithAccess("technician");
  if (!user) return <NoAccess />;
  const [records, vehicles, clients, users] = await Promise.all([getWorkOrderRecords(), getVehicles(), getClients(), getUsers()]);
  const technicians = users.filter((u) => u.role === "tecnico");
  // El administrador puede ver la pantalla de cualquier técnico
  const technicianId = user.role === "admin" ? searchParams.tecnico ?? technicians[0].id : user.id;
  const technician = users.find((u) => u.id === technicianId)!;
  const mine = records
    .filter((w) => w.technicianId === technicianId && !["entregada", "facturada"].includes(w.status))
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Mis trabajos" description={`${technician.name} · ${mine.length} vehículos asignados`} />
      {user.role === "admin" && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Técnico">
          {technicians.map((t) => (
            <Button key={t.id} asChild size="sm" variant={t.id === technicianId ? "default" : "outline"}>
              <Link href={`/technician?tecnico=${t.id}`}>{t.name.split(" ")[0]}</Link>
            </Button>
          ))}
        </div>
      )}
      {mine.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">No tienes vehículos asignados.</CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {mine.map((w) => {
            const v = vehicles.find((x) => x.id === w.vehicleId)!;
            const days = daysBetween(w.openedAt, today());
            const status = WORK_ORDER_STATUS[w.status];
            const urgent = w.priority === "alta" || w.priority === "critica";
            return (
              <li key={w.id}>
                <Link href={`/work-orders/${w.id}`}>
                  <Card className={cn("transition-colors hover:bg-accent/50", urgent && "border-amber-400")}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border bg-amber-100 px-2 py-0.5 font-mono text-base font-bold tracking-wider text-slate-900 dark:bg-amber-400">
                            {v.plate}
                          </span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {urgent && <Badge variant={WORK_ORDER_PRIORITY[w.priority].variant}>{WORK_ORDER_PRIORITY[w.priority].label}</Badge>}
                        </div>
                        <p className="mt-2 font-medium">{w.service}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {v.brand} {v.model} · {v.engine}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {w.code} · {clients.find((c) => c.id === w.clientId)?.name} · {days === 0 ? "llegó hoy" : `${days} ${days === 1 ? "día" : "días"} en taller`}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
