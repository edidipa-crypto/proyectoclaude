"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import { saveClient, type FormState } from "@/app/actions";
import { Field, NativeSelect, SubmitButton } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { clientSchema, fieldErrors, nitCheckDigit } from "@/lib/validation";

export function ClientForm() {
  const [state, action] = useFormState<FormState, FormData>(saveClient, {});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [kind, setKind] = useState<"empresa" | "persona">("empresa");
  const [idNumber, setIdNumber] = useState("");
  const errors = { ...state.errors, ...clientErrors };
  const isCompany = kind === "empresa";

  function validate(e: React.FormEvent<HTMLFormElement>) {
    const parsed = clientSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    setClientErrors(parsed.success ? {} : fieldErrors(parsed.error));
    if (!parsed.success) e.preventDefault();
  }

  return (
    <form action={action} onSubmit={validate} className="grid gap-4" noValidate>
      {state.message && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.message}</p>}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Tipo de cliente</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["empresa", "persona"] as const).map((k) => (
            <label
              key={k}
              className={cn(
                "flex h-10 cursor-pointer items-center justify-center rounded-md border text-sm font-medium",
                kind === k ? "border-primary bg-primary/10" : "border-input",
              )}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {k === "empresa" ? "Empresa (NIT)" : "Persona (cédula)"}
            </label>
          ))}
        </div>
      </fieldset>
      <input type="hidden" name="idType" value={isCompany ? "NIT" : "CC"} />

      <Field id="name" label={isCompany ? "Razón social (como aparece en el RUT)" : "Nombre completo"} error={errors.name}>
        <Input id="name" name="name" autoComplete="off" />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <div className={isCompany ? "col-span-2" : "col-span-3"}>
          <Field id="idNumber" label={isCompany ? "NIT (sin dígito de verificación)" : "Cédula"} error={errors.idNumber}>
            <Input id="idNumber" name="idNumber" inputMode="numeric" value={idNumber} onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))} />
          </Field>
        </div>
        {isCompany && (
          <Field id="dv" label="DV" error={errors.dv} hint={idNumber.length >= 5 ? `Debe ser ${nitCheckDigit(idNumber)}` : undefined}>
            <Input id="dv" name="dv" inputMode="numeric" maxLength={1} />
          </Field>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="phone" label="Teléfono" error={errors.phone}>
          <Input id="phone" name="phone" inputMode="tel" placeholder="3001234567" />
        </Field>
        <Field id="billingEmail" label="Correo para factura electrónica" error={errors.billingEmail}>
          <Input id="billingEmail" name="billingEmail" type="email" />
        </Field>
        <Field id="city" label="Ciudad" error={errors.city}>
          <Input id="city" name="city" defaultValue="Bogotá" />
        </Field>
        <Field id="address" label="Dirección">
          <Input id="address" name="address" />
        </Field>
        <Field id="paymentTermDays" label="Condición de pago" error={errors.paymentTermDays}>
          <NativeSelect id="paymentTermDays" name="paymentTermDays" defaultValue="0">
            <option value="0">Contado</option>
            <option value="15">Crédito 15 días</option>
            <option value="30">Crédito 30 días</option>
            <option value="45">Crédito 45 días</option>
            <option value="60">Crédito 60 días</option>
          </NativeSelect>
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Guardar cliente</SubmitButton>
      </div>
    </form>
  );
}
