"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROVIDER_TYPE } from "@/lib/constants";
import type { ThirdPartyJob, ThirdPartyProvider, WorkOrder } from "@/types";

const NO_WO = "none";

const schema = z.object({
  providerId: z.string().min(1, "Seleccione un proveedor"),
  workOrderId: z.string().nullable(),
  description: z.string().trim().min(5, "Describa el trabajo (mín. 5 caracteres)"),
  cost: z.coerce.number().positive("El costo debe ser mayor a 0"),
  markupPct: z.coerce.number().min(0).max(100),
  expectedAt: z.string().min(1, "Indique la fecha estimada"),
});

interface Props {
  providers: ThirdPartyProvider[];
  workOrders: WorkOrder[];
  onCreate: (job: ThirdPartyJob) => void;
}

export function NewJobDialog({ providers, workOrders, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [workOrderId, setWorkOrderId] = useState<string>(NO_WO);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      providerId,
      workOrderId: workOrderId === NO_WO ? null : workOrderId,
      description: form.get("description"),
      cost: form.get("cost"),
      markupPct: form.get("markupPct"),
      expectedAt: form.get("expectedAt"),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }

    // TODO(supabase): insert en public.third_party_jobs y revalidar la ruta.
    onCreate({
      id: `tp-${Date.now()}`,
      status: "enviado",
      sentAt: new Date().toISOString().slice(0, 10),
      ...parsed.data,
    });
    setErrors({});
    setProviderId("");
    setWorkOrderId(NO_WO);
    setOpen(false);
  }

  const openOrders = workOrders.filter((wo) => !["entregada", "facturada"].includes(wo.status));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Nuevo trabajo tercerizado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar trabajo tercerizado</DialogTitle>
          <DialogDescription>
            Envío a laboratorio de inyección, rectificadora o taller de turbos. El costo se carga a la OT enlazada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="provider">Proveedor</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Seleccione proveedor" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {PROVIDER_TYPE[p.type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.providerId && <p className="text-xs text-destructive">{errors.providerId}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="workOrder">Orden de trabajo</Label>
            <Select value={workOrderId} onValueChange={setWorkOrderId}>
              <SelectTrigger id="workOrder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_WO}>Sin OT (stock / cotización)</SelectItem>
                {openOrders.map((wo) => (
                  <SelectItem key={wo.id} value={wo.id}>
                    {wo.code} · {wo.vehicle.plate} · {wo.vehicle.engine}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descripción del trabajo</Label>
            <Input id="description" name="description" placeholder="Ej. Calibración 6 inyectores Bosch CRIN en banco" />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="cost">Costo (COP)</Label>
              <Input id="cost" name="cost" type="number" min={0} step={1000} placeholder="2500000" />
              {errors.cost && <p className="text-xs text-destructive">{errors.cost}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="markupPct">Margen %</Label>
              <Input id="markupPct" name="markupPct" type="number" min={0} max={100} defaultValue={20} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expectedAt">Entrega estimada</Label>
              <Input id="expectedAt" name="expectedAt" type="date" />
              {errors.expectedAt && <p className="text-xs text-destructive">{errors.expectedAt}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Registrar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
