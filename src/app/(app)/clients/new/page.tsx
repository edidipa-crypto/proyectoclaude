import { ClientForm } from "@/components/clients/client-form";
import { BackLink } from "@/components/layout/back-link";
import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { userWithAccess } from "@/lib/session";

export const metadata = { title: "Nuevo cliente · DieselPro" };

export default async function NewClientPage() {
  const user = await userWithAccess("clients");
  if (!user || user.role === "contabilidad") return <NoAccess />;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/clients">Clientes y vehículos</BackLink>
      <PageHeader title="Nuevo cliente" description="Los datos deben coincidir con el RUT para poder facturar electrónicamente." />
      <Card>
        <CardContent className="p-6">
          <ClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
