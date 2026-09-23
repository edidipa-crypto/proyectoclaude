import { FinancialDashboard } from "@/components/dashboard/financial-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { getMonthlyFinancials } from "@/lib/data";

export const metadata = { title: "Dashboard Financiero · DieselPro" };

export default async function DashboardPage() {
  const data = await getMonthlyFinancials();

  return (
    <>
      <PageHeader
        title="Dashboard financiero"
        description="Pérdidas y ganancias del taller: inyección common rail, bombas de alta presión, turbos y reparación de motor."
      />
      <FinancialDashboard data={data} />
    </>
  );
}
