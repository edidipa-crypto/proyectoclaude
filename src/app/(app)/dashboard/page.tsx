import { FinancialDashboard } from "@/components/dashboard/financial-dashboard";
import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { getMonthlyFinancials } from "@/lib/data";
import { userWithAccess } from "@/lib/session";

export const metadata = { title: "Dashboard Financiero · DieselPro" };

export default async function DashboardPage() {
  const user = await userWithAccess("dashboard");
  if (!user) return <NoAccess />;
  const data = await getMonthlyFinancials();

  return (
    <>
      <PageHeader
        title="Dashboard financiero"
        description="Pérdidas y ganancias del taller por mes cerrado, calculadas desde las OTs entregadas y los gastos registrados."
      />
      <FinancialDashboard data={data} />
    </>
  );
}
