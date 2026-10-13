import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Printer } from "lucide-react";

import { BackLink } from "@/components/layout/back-link";
import { NoAccess } from "@/components/layout/no-access";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinesTable } from "@/components/work-orders/lines-table";
import { StatusActions } from "@/components/work-orders/status-actions";
import { DIAN_STATUS, THIRD_PARTY_STATUS, WORK_ORDER_PRIORITY, WORK_ORDER_STATUS } from "@/lib/constants";
import { clientDocument, getProviders, getUsers, getWorkOrder, today } from "@/lib/data";
import { daysBetween } from "@/lib/dates";
import { computeWithholdings } from "@/lib/money";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { formatCOP, formatDate, formatDateTime } from "@/lib/utils";

export default async function WorkOrderPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const wo = await getWorkOrder(params.id);
  if (!wo) notFound();

  const isOwn = user.role === "tecnico" && wo.technicianId === user.id;
  if (!can(user.role, "work-orders") && !isOwn) return <NoAccess />;

  const [users, providers] = await Promise.all([getUsers(), getProviders()]);
  const isTechnician = user.role === "tecnico";
  const showCosts = can(user.role, "costs");
  const status = WORK_ORDER_STATUS[wo.status];
  const priority = WORK_ORDER_PRIORITY[wo.priority];
  const days = daysBetween(wo.openedAt, wo.deliveredAt ?? today());
  const isMachine = wo.vehicle.type === "Maquinaria";

  return (
    <>
      <BackLink href={isTechnician ? "/technician" : "/work-orders"}>{isTechnician ? "Mis trabajos" : "Órdenes de trabajo"}</BackLink>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-bold tracking-tight">{wo.code}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge variant={priority.variant}>Prioridad {priority.label.toLowerCase()}</Badge>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded border bg-amber-100 px-1.5 py-0.5 font-mono text-xs text-slate-900 dark:bg-amber-400">{wo.vehicle.plate}</span>
            {wo.vehicle.brand} {wo.vehicle.model} · {wo.vehicle.engine} · {days} {days === 1 ? "día" : "días"} en taller
          </p>
        </div>
        <span
          className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-md border border-dashed px-3 text-sm text-muted-foreground"
          title="Disponible en la Fase 3"
        >
          <Printer className="h-4 w-4" aria-hidden /> PDF de la OT (Fase 3)
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recepción y diagnóstico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Lo que reporta el cliente</p>
                <p className="mt-0.5">{wo.symptoms}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diagnóstico del técnico</p>
                <p className="mt-0.5">{wo.diagnosis ?? <span className="text-muted-foreground">Pendiente</span>}</p>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-muted-foreground">
                <Camera className="h-5 w-5 shrink-0" aria-hidden />
                Aquí irán las fotos del vehículo tomadas desde el celular (Fase 3).
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{isTechnician ? "Trabajos y repuestos" : "Cotización: trabajos, repuestos y terceros"}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {isTechnician ? (
                <ul className="divide-y text-sm">
                  {wo.lines.length === 0 && <li className="px-6 py-8 text-center text-muted-foreground">Sin trabajos cargados todavía.</li>}
                  {wo.lines.map((l) => (
                    <li key={l.id} className="flex justify-between gap-3 px-6 py-3">
                      <span>{l.description}</span>
                      <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                        {l.quantity.toLocaleString("es-CO")} {l.kind === "labor" ? "h" : "und"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <LinesTable lines={wo.lines} showCosts={showCosts} withholdings={computeWithholdings(wo.totals, wo.client.withholdings)} />
              )}
            </CardContent>
          </Card>

          {wo.thirdPartyJobs.length > 0 && !isTechnician && (
            <Card>
              <CardHeader>
                <CardTitle>Envíos a terceros</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {wo.thirdPartyJobs.map((j) => {
                  const s = THIRD_PARTY_STATUS[j.status];
                  return (
                    <div key={j.id} className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{providers.find((p) => p.id === j.providerId)?.name}</p>
                        <p className="text-muted-foreground">{j.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Enviado {formatDate(j.sentAt)} · Entrega estimada {formatDate(j.expectedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                        <Badge variant={s.variant}>{s.label}</Badge>
                        {showCosts && <span className="tabular-nums">{formatCOP(j.cost)} + {j.markupPct}%</span>}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {!["entregada", "facturada"].includes(wo.status) && (
            <Card>
              <CardHeader>
                <CardTitle>Siguiente paso</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusActions workOrderId={wo.id} status={wo.status} role={user.role} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Cliente">
                  {isTechnician ? wo.client.name : <Link href={`/clients/${wo.client.id}`} className="text-primary hover:underline">{wo.client.name}</Link>}
                </Field>
                <Field label="Documento">{clientDocument(wo.client)}</Field>
                <Field label="Teléfono">{wo.client.phone}</Field>
                <Field label={isMachine ? "Horómetro" : "Kilometraje"}>
                  {isMachine ? `${(wo.hourMeter ?? 0).toLocaleString("es-CO")} h` : `${wo.odometerKm.toLocaleString("es-CO")} km`}
                </Field>
                <Field label="Técnico">{wo.technician?.name ?? "Por asignar"}</Field>
                <Field label="Apertura">{formatDate(wo.openedAt)}</Field>
                <Field label="Promesa de entrega">{formatDate(wo.promisedAt)}</Field>
                {wo.deliveredAt && <Field label="Entregada">{formatDate(wo.deliveredAt)}</Field>}
                {wo.invoice && can(user.role, "billing") && (
                  <Field label="Factura">
                    <span className="font-mono">{wo.invoice.number ?? "Sin emitir"}</span>{" "}
                    <Badge variant={DIAN_STATUS[wo.invoice.dianStatus].variant} className="mt-1">
                      {DIAN_STATUS[wo.invoice.dianStatus].label}
                    </Badge>
                  </Field>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {[...wo.history].reverse().map((h, i) => (
                  <li key={i} className="border-l-2 pl-3 text-sm">
                    <p className="font-medium">{WORK_ORDER_STATUS[h.status].label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(h.at)} · {users.find((u) => u.id === h.userId)?.name}
                    </p>
                    {h.note && <p className="mt-0.5 text-muted-foreground">{h.note}</p>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
