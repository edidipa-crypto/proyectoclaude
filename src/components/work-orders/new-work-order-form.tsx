"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import { saveWorkOrder, type FormState } from "@/app/actions";
import { Field, NativeSelect, SubmitButton } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { WORK_ORDER_PRIORITY } from "@/lib/constants";
import { fieldErrors, newWorkOrderSchema } from "@/lib/validation";

export interface VehicleOption {
  id: string;
  label: string;
  reading: number;
  isMachine: boolean;
}

export function NewWorkOrderForm({ vehicles, technicians, initialVehicle }: { vehicles: VehicleOption[]; technicians: { id: string; name: string }[]; initialVehicle?: string }) {
  const [state, action] = useFormState<FormState, FormData>(saveWorkOrder, {});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [vehicleId, setVehicleId] = useState(initialVehicle ?? "");
  const errors = { ...state.errors, ...clientErrors };
  const vehicle = vehicles.find((v) => v.id === vehicleId);

  // Se valida primero en el navegador con el mismo esquema que usa el servidor.
  function validate(e: React.FormEvent<HTMLFormElement>) {
    const parsed = newWorkOrderSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    setClientErrors(parsed.success ? {} : fieldErrors(parsed.error));
    if (!parsed.success) e.preventDefault();
  }

  return (
    <form action={action} onSubmit={validate} className="grid gap-4" noValidate>
      {state.message && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.message}</p>}
      <Field id="vehicleId" label="Vehículo" error={errors.vehicleId}>
        <NativeSelect id="vehicleId" name="vehicleId" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} invalid={!!errors.vehicleId}>
          <option value="">Selecciona por placa…</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          id="odometerKm"
          label={vehicle?.isMachine ? "Horómetro (horas)" : "Kilometraje"}
          error={errors.odometerKm}
          hint={vehicle ? `Último registrado: ${vehicle.reading.toLocaleString("es-CO")}` : undefined}
        >
          <Input id="odometerKm" name="odometerKm" inputMode="numeric" key={vehicleId} defaultValue={vehicle?.reading ?? ""} />
        </Field>
        <Field id="technicianId" label="Técnico asignado" error={errors.technicianId}>
          <NativeSelect id="technicianId" name="technicianId" defaultValue="" invalid={!!errors.technicianId}>
            <option value="">Selecciona…</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="priority" label="Prioridad">
          <NativeSelect id="priority" name="priority" defaultValue="media">
            {Object.entries(WORK_ORDER_PRIORITY).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field id="symptoms" label="¿Qué reporta el cliente?" error={errors.symptoms}>
        <textarea
          id="symptoms"
          name="symptoms"
          rows={3}
          placeholder="Ej.: humo negro y pérdida de potencia en subida"
          className="w-full rounded-md border border-input bg-background p-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Field>
      <div className="flex justify-end">
        <SubmitButton>Abrir orden de trabajo</SubmitButton>
      </div>
    </form>
  );
}
