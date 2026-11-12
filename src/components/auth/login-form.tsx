"use client";

import { useFormState } from "react-dom";

import { signIn, type FormState } from "@/app/actions";
import { Field, SubmitButton } from "@/components/forms/field";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, action] = useFormState<FormState, FormData>(signIn, {});
  return (
    <form action={action} className="grid gap-4">
      {state.message && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.message}</p>}
      <Field id="login" label="Usuario o correo" hint="El administrador entra con el usuario: admin">
        <Input id="login" name="login" autoComplete="username" autoCapitalize="none" required />
      </Field>
      <Field id="password" label="Contraseña">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton>Entrar</SubmitButton>
    </form>
  );
}
