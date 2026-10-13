import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { ThirdPartyPanel } from "@/components/third-party/third-party-panel";
import { getProviders, getThirdPartyJobs, getWorkOrders } from "@/lib/data";
import { userWithAccess } from "@/lib/session";

export const metadata = { title: "Gestión de Terceros · DieselPro" };

export default async function ThirdPartyPage() {
  const user = await userWithAccess("third-party");
  if (!user) return <NoAccess />;
  const [allJobs, allProviders, workOrders] = await Promise.all([getThirdPartyJobs(), getProviders(), getWorkOrders()]);
  // Este módulo trata con talleres externos; los proveedores de repuestos se ven en Cuentas por pagar.
  const providers = allProviders.filter((p) => p.type !== "repuestos");
  // Todos los trabajos abiertos y los 25 pagados más recientes
  const jobs = allJobs.filter((j) => j.status !== "pagado").concat(allJobs.filter((j) => j.status === "pagado").slice(0, 25));

  return (
    <>
      <PageHeader
        title="Gestión de terceros"
        description="Outsourcing a laboratorios de inyección, rectificadoras y talleres de turbos, con costos enlazados a cada OT."
      />
      <ThirdPartyPanel initialJobs={jobs} providers={providers} workOrders={workOrders} />
    </>
  );
}
