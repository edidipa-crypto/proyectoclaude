"use client";

import { useMemo, useState } from "react";
import { Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROVIDER_TYPE, THIRD_PARTY_STATUS } from "@/lib/constants";
import { formatCOP, formatDate } from "@/lib/utils";
import type { ThirdPartyJob, ThirdPartyProvider, WorkOrder } from "@/types";
import { NewJobDialog } from "./new-job-dialog";

interface Props {
  initialJobs: ThirdPartyJob[];
  providers: ThirdPartyProvider[];
  workOrders: WorkOrder[];
}

const billed = (job: ThirdPartyJob) => job.cost * (1 + job.markupPct / 100);

export function ThirdPartyPanel({ initialJobs, providers, workOrders }: Props) {
  const [jobs, setJobs] = useState(initialJobs);

  const providerById = useMemo(() => new Map(providers.map((p) => [p.id, p])), [providers]);
  const woById = useMemo(() => new Map(workOrders.map((w) => [w.id, w])), [workOrders]);

  const totals = useMemo(() => {
    const active = jobs.filter((j) => j.status !== "cotizado");
    const cost = active.reduce((a, j) => a + j.cost, 0);
    const revenue = active.filter((j) => j.workOrderId).reduce((a, j) => a + billed(j), 0);
    const pendingPay = jobs.filter((j) => j.status === "recibido").reduce((a, j) => a + j.cost, 0);
    const unlinked = jobs.filter((j) => !j.workOrderId).length;
    return { cost, revenue, margin: revenue - cost, pendingPay, unlinked };
  }, [jobs]);

  const byProvider = useMemo(() => {
    const map = new Map<string, { cost: number; count: number }>();
    for (const j of jobs) {
      if (j.status === "cotizado") continue;
      const cur = map.get(j.providerId) ?? { cost: 0, count: 0 };
      map.set(j.providerId, { cost: cur.cost + j.cost, count: cur.count + 1 });
    }
    return [...map.entries()]
      .map(([id, v]) => ({ provider: providerById.get(id)!, ...v }))
      .sort((a, b) => b.cost - a.cost);
  }, [jobs, providerById]);

  const maxProviderCost = Math.max(...byProvider.map((p) => p.cost), 1);

  function linkToWorkOrder(jobId: string, workOrderId: string) {
    // TODO(supabase): update third_party_jobs set work_order_id = ... where id = jobId
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, workOrderId } : j)));
  }

  const summary = [
    { label: "Costo tercerizado", value: formatCOP(totals.cost), hint: "enviados, en proceso y cerrados" },
    { label: "Facturado a clientes", value: formatCOP(totals.revenue), hint: "costo + margen en OT" },
    { label: "Margen terceros", value: formatCOP(totals.margin), hint: "diferencia cobrada" },
    { label: "Por pagar a proveedores", value: formatCOP(totals.pendingPay), hint: `${totals.unlinked} trabajo(s) sin OT` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <NewJobDialog providers={providers} workOrders={workOrders} onCreate={(job) => setJobs((prev) => [job, ...prev])} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Trabajos tercerizados</CardTitle>
            <CardDescription>Cada costo se enlaza a una OT para imputarlo al P&amp;L del vehículo.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Trabajo</TableHead>
                  <TableHead>OT enlazada</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Costo / Cobro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const provider = providerById.get(job.providerId);
                  const wo = job.workOrderId ? woById.get(job.workOrderId) : undefined;
                  const status = THIRD_PARTY_STATUS[job.status];
                  return (
                    <TableRow key={job.id}>
                      <TableCell className="min-w-[260px]">
                        <p className="font-medium">{provider?.name}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{job.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Enviado {formatDate(job.sentAt)} · Est. {formatDate(job.expectedAt)}
                          {job.invoiceRef && ` · Fact. ${job.invoiceRef}`}
                        </p>
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        {wo ? (
                          <div className="flex items-start gap-1.5">
                            <Link2 className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                            <div>
                              <p className="font-mono text-xs font-semibold">{wo.code}</p>
                              <p className="text-xs text-muted-foreground">
                                {wo.vehicle.plate} · {wo.vehicle.engine}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <Select onValueChange={(v) => linkToWorkOrder(job.id, v)}>
                            <SelectTrigger className="h-8 text-xs" aria-label="Enlazar a OT">
                              <SelectValue placeholder="Enlazar a OT…" />
                            </SelectTrigger>
                            <SelectContent>
                              {workOrders
                                .filter((w) => !["entregada", "facturada"].includes(w.status))
                                .map((w) => (
                                  <SelectItem key={w.id} value={w.id}>
                                    {w.code} · {w.vehicle.plate}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="whitespace-nowrap">
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="whitespace-nowrap font-medium tabular-nums">{formatCOP(job.cost)}</p>
                        <p className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                          {job.workOrderId ? `${formatCOP(billed(job))} (+${job.markupPct}%)` : "—"}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costo por proveedor</CardTitle>
            <CardDescription>Excluye cotizaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {byProvider.map(({ provider, cost, count }) => (
                <li key={provider.id}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{provider.name}</span>
                    <span className="shrink-0 tabular-nums">{formatCOP(cost)}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${(cost / maxProviderCost) * 100}%`, background: "var(--chart-1)" }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {PROVIDER_TYPE[provider.type]} · {count} trabajo(s) · {provider.city}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
