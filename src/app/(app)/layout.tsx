import { Sidebar } from "@/components/layout/sidebar";
import { NAV_SECTIONS } from "@/lib/navigation";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const allowed = NAV_SECTIONS.filter((s) => can(user.role, s));

  return (
    <>
      <Sidebar allowed={allowed} user={{ name: user.name, role: ROLE_LABEL[user.role] }} />
      <main className="min-h-screen md:pl-64">
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </>
  );
}
