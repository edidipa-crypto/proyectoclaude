import { Fuel } from "lucide-react";

import { signIn } from "@/app/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUsers } from "@/lib/data";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/permissions";

export const metadata = { title: "Ingresar · DieselPro" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Un usuario de prueba por rol
  const users = (await getUsers()).filter((u, i, all) => all.findIndex((x) => x.role === u.role) === i);

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-amber-500 text-slate-950">
            <Fuel className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">DieselPro</h1>
            <p className="text-sm text-sidebar-foreground/60">Centro de servicio diésel</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Entrar con datos de prueba</CardTitle>
            <CardDescription>
              Elige un rol para ver lo que esa persona vería. En la Fase 1 aquí irán tu correo y contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {users.map((u) => (
              <form key={u.id} action={signIn}>
                <input type="hidden" name="userId" value={u.id} />
                <button
                  type="submit"
                  className="w-full rounded-md border p-3 text-left transition-colors hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{ROLE_LABEL[u.role]}</span>
                    <span className="text-xs text-muted-foreground">{u.name}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{ROLE_DESCRIPTION[u.role]}</span>
                </button>
              </form>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
