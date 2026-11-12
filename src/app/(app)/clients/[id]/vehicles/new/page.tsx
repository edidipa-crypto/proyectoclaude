import { notFound } from "next/navigation";

import { VehicleForm } from "@/components/clients/vehicle-form";
import { BackLink } from "@/components/layout/back-link";
import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getClient } from "@/lib/data";
import { userWithAccess } from "@/lib/session";

export const metadata = { title: "Nuevo vehículo · DieselPro" };

export default async function NewVehiclePage({ params }: { params: { id: string } }) {
  const user = await userWithAccess("work-orders");
  if (!user) return <NoAccess />;
  const client = await getClient(params.id);
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href={`/clients/${client.id}`}>{client.name}</BackLink>
      <PageHeader title="Nuevo vehículo o máquina" description={`Se registra a nombre de ${client.name}.`} />
      <Card>
        <CardContent className="p-6">
          <VehicleForm clientId={client.id} />
        </CardContent>
      </Card>
    </div>
  );
}
