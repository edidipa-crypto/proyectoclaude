"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import { saveVehicle, type FormState } from "@/app/actions";
import { Field, NativeSelect, SubmitButton } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { fieldErrors, VEHICLE_TYPES, vehicleSchema } from "@/lib/validation";

export function VehicleForm({ clientId }: { clientId: string }) {
  const [state, action] = useFormState<FormState, FormData>(saveVehicle, {});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [type, setType] = useState<string>("Tractocamión");
  const errors = { ...state.errors, ...clientErrors };
  const isMachine = type === "Maquinaria";

  function validate(e: React.FormEvent<HTMLFormElement>) {
    const parsed = vehicleSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    setClientErrors(parsed.success ? {} : fieldErrors(parsed.error));
    if (!parsed.success) e.preventDefault();
  }

  return (
    <form action={action} onSubmit={validate} className="grid gap-4" noValidate>
      {state.message && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.message}</p>}
      <input type="hidden" name="clientId" value={clientId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="type" label="Tipo" error={errors.type}>
          <NativeSelect id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
            {VEHICLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="plate" label={isMachine ? "Placa o código interno" : "Placa"} error={errors.plate}>
          <Input id="plate" name="plate" placeholder={isMachine ? "Ej.: MAQ416" : "Ej.: SNK482"} className="uppercase" autoComplete="off" />
        </Field>
        <Field id="brand" label="Marca" error={errors.brand}>
          <Input id="brand" name="brand" placeholder="Ej.: Kenworth, Isuzu, Caterpillar" />
        </Field>
        <Field id="model" label="Modelo / línea" error={errors.model}>
          <Input id="model" name="model" placeholder="Ej.: T800, NPR, 416F" />
        </Field>
        <Field id="engine" label="Motor" error={errors.engine}>
          <Input id="engine" name="engine" placeholder="Ej.: Cummins ISX15, Isuzu 4HK1" />
        </Field>
        <Field id="year" label="Año" error={errors.year}>
          <Input id="year" name="year" inputMode="numeric" placeholder="2018" />
        </Field>
        <Field id="reading" label={isMachine ? "Horómetro (horas)" : "Kilometraje"} error={errors.reading}>
          <Input id="reading" name="reading" inputMode="numeric" defaultValue="0" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Guardar vehículo</SubmitButton>
      </div>
    </form>
  );
}
