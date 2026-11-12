"use client";

import { useFormState } from "react-dom";

import { setPassword, type FormState } from "@/app/actions";
import { Field, NativeSelect, SubmitButton } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SetPasswordForm({ users }: { users: { id: string; label: string }[] }) {
  const [state, action] = useFormState<FormState, FormData>(setPassword, {});
  return (
    <form action={action} className="grid gap-4">
      {state.message && (
        <p className={cn("rounded-md p-3 text-sm", state.ok ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "bg-destructive/10 text-destructive")}>
          {state.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="userId" label="Persona" error={state.errors?.userId}>
          <NativeSelect id="userId" name="userId" defaultValue="">
            <option value="">Elige…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="password" label="Nueva contraseña" error={state.errors?.password} hint="Mínimo 8 caracteres. Entrégasela en persona.">
          {/* La clave cambia después de guardar, así el campo queda vacío */}
          <Input key={state.message ?? "inicial"} id="password" name="password" type="password" autoComplete="new-password" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Guardar contraseña</SubmitButton>
      </div>
    </form>
  );
}
