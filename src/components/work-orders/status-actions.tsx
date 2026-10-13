import { advanceWorkOrder } from "@/app/actions";
import { WORK_ORDER_STATUS } from "@/lib/constants";
import { NEXT_STATUSES, technicianCanMoveTo } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Role, WorkOrderStatus } from "@/types";

const ACTION_LABEL: Partial<Record<WorkOrderStatus, string>> = {
  diagnostico: "Empezar diagnóstico",
  cotizada: "Enviar cotización al cliente",
  aprobada: "El cliente aprobó la cotización",
  en_reparacion: "Empezar / continuar reparación",
  esperando_repuestos: "Faltan repuestos",
  en_tercero: "Enviado a tercero",
  lista: "Marcar como lista",
  entregada: "Entregar al cliente",
};

/** Botones grandes (cómodos en el celular) para mover la OT al siguiente estado. */
export function StatusActions({ workOrderId, status, role }: { workOrderId: string; status: WorkOrderStatus; role: Role }) {
  const next = NEXT_STATUSES[status].filter((s) => role !== "tecnico" || technicianCanMoveTo(s));
  if (next.length === 0) {
    const waiting = role === "tecnico" && (status === "diagnostico" || status === "cotizada" || status === "lista");
    return waiting ? <p className="text-sm text-muted-foreground">El asesor de servicio se encarga del siguiente paso.</p> : null;
  }

  return (
    <form action={advanceWorkOrder} className="space-y-3">
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <textarea
        name="note"
        rows={2}
        maxLength={300}
        placeholder="Novedad opcional (ej.: se encontró fuga en el retorno del inyector 3)"
        className="w-full rounded-md border border-input bg-background p-2.5 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex flex-col gap-2">
        {next.map((s, i) => (
          <button
            key={s}
            type="submit"
            name="status"
            value={s}
            className={cn(
              "min-h-11 rounded-md px-4 text-sm font-medium transition-colors",
              i === next.length - 1 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-input bg-background hover:bg-accent",
            )}
          >
            {ACTION_LABEL[s] ?? WORK_ORDER_STATUS[s].label}
          </button>
        ))}
      </div>
    </form>
  );
}
