import { Check, Minus } from "lucide-react";

import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUsers } from "@/lib/data";
import { NAV_ITEMS } from "@/lib/navigation";
import { can, ROLE_LABEL, type Section } from "@/lib/permissions";
import { userWithAccess } from "@/lib/session";
import type { Role } from "@/types";

export const metadata = { title: "Usuarios y roles · DieselPro" };

const ROLES: Role[] = ["admin", "asesor", "tecnico", "contabilidad"];
const ROWS: [Section, string][] = [...NAV_ITEMS.map((i) => [i.section, i.title] as [Section, string]), ["costs", "Ver costos y márgenes"]];

export default async function UsersPage() {
  const user = await userWithAccess("users");
  if (!user) return <NoAccess />;
  const users = await getUsers();

  return (
    <>
      <PageHeader title="Usuarios y roles" description="Quién entra al sistema y qué puede ver cada rol." />
      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Usuarios ({users.length})</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.email} · {u.phone}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{ROLE_LABEL[u.role]}</TableCell>
                    <TableCell>{u.active ? <Badge variant="success">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Permisos por rol</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Sección</TableHead>
                  {ROLES.map((r) => (
                    <TableHead key={r} className="text-center">
                      {ROLE_LABEL[r]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROWS.map(([section, label]) => (
                  <TableRow key={section}>
                    <TableCell className="whitespace-nowrap">{label}</TableCell>
                    {ROLES.map((r) => (
                      <TableCell key={r} className="text-center">
                        {can(r, section) ? (
                          <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Sí" />
                        ) : (
                          <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" aria-label="No" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
      <p className="text-xs text-muted-foreground">
        El técnico también puede abrir las OTs que tiene asignadas. En la Fase 1 podrás crear usuarios, asignar su rol y desactivarlos; cada uno entrará con su correo y contraseña.
      </p>
    </>
  );
}
