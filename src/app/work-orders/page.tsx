import { ClipboardList, Clock, Truck, Wrench } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { WorkOrdersTable } from "@/components/work-orders/work-orders-table";
import { getWorkOrders } from "@/lib/data";
import { formatCOP, workOrderTotal } from "@/lib/utils";

export const metadata = { title: "Órdenes de Trabajo · DieselPro" };

export default async function WorkOrdersPage() {
  const orders = await getWorkOrders();

  const open = orders.filter((o) => !["entregada", "facturada"].includes(o.status));
  const inThirdParty = orders.filter((o) => o.status === "en_tercero");
  const waitingParts = orders.filter((o) => o.status === "esperando_repuestos");
  const openValue = open.reduce((acc, o) => acc + workOrderTotal(o), 0);

  return (
    <>
      <PageHeader
        title="Órdenes de trabajo"
        description="Vehículos pesados en taller: tractocamiones, volquetas, buses y maquinaria."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="OTs abiertas" value={String(open.length)} icon={ClipboardList} hint={`de ${orders.length} registradas`} />
        <KpiCard title="Valor en proceso" value={formatCOP(openValue)} icon={Wrench} hint="por facturar" />
        <KpiCard title="En tercero" value={String(inThirdParty.length)} icon={Truck} hint="laboratorio / rectificadora" />
        <KpiCard title="Esperando repuestos" value={String(waitingParts.length)} icon={Clock} hint="bombas, inyectores, rieles" />
      </section>
      <WorkOrdersTable data={orders} />
    </>
  );
}
