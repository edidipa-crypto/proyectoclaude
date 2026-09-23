import { PageHeader } from "@/components/layout/page-header";
import { ThirdPartyPanel } from "@/components/third-party/third-party-panel";
import { getProviders, getThirdPartyJobs, getWorkOrders } from "@/lib/data";

export const metadata = { title: "Gestión de Terceros · DieselPro" };

export default async function ThirdPartyPage() {
  const [jobs, providers, workOrders] = await Promise.all([getThirdPartyJobs(), getProviders(), getWorkOrders()]);

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
