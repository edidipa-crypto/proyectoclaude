import { BackLink } from "@/components/layout/back-link";
import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { NewWorkOrderForm } from "@/components/work-orders/new-work-order-form";
import { getClients, getUsers, getVehicles } from "@/lib/data";
import { userWithAccess } from "@/lib/session";

export const metadata = { title: "Nueva OT · DieselPro" };

export default async function NewWorkOrderPage({ searchParams }: { searchParams: { vehicle?: string } }) {
  const user = await userWithAccess("work-orders");
  if (!user) return <NoAccess />;
  const [vehicles, clients, users] = await Promise.all([getVehicles(), getClients(), getUsers()]);
  const options = [...vehicles]
    .sort((a, b) => a.plate.localeCompare(b.plate))
    .map((v) => ({
      id: v.id,
      label: `${v.plate} · ${v.brand} ${v.model} · ${clients.find((c) => c.id === v.clientId)?.name}`,
      reading: v.type === "Maquinaria" ? v.hourMeter ?? 0 : v.odometerKm,
      isMachine: v.type === "Maquinaria",
    }));
  const technicians = users.filter((u) => u.role === "tecnico" && u.active).map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/work-orders">Órdenes de trabajo</BackLink>
      <PageHeader title="Nueva orden de trabajo" description="Recepción del vehículo que acaba de llegar al taller." />
      <Card>
        <CardContent className="p-6">
          <NewWorkOrderForm vehicles={options} technicians={technicians} initialVehicle={searchParams.vehicle} />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Con datos de prueba la OT queda guardada mientras el programa esté abierto. Desde la Fase 1 se guarda en la base de datos.
      </p>
    </div>
  );
}
