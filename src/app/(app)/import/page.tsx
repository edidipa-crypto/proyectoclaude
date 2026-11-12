import { ImportWizard } from "@/components/import/import-wizard";
import { NoAccess } from "@/components/layout/no-access";
import { PageHeader } from "@/components/layout/page-header";
import { dataMode, getImportSnapshot } from "@/lib/data";
import { userWithAccess } from "@/lib/session";

export const metadata = { title: "Cargar datos · DieselPro" };

export default async function ImportPage() {
  const user = await userWithAccess("import");
  if (!user) return <NoAccess />;
  const snapshot = await getImportSnapshot();
  const real = dataMode() === "sheets";

  return (
    <>
      <PageHeader
        title="Cargar datos"
        description="Sube tus archivos de Excel con clientes, vehículos y trabajos realizados para tenerlos en la herramienta."
      />
      {!real && (
        <p className="rounded-md bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Todavía no está conectada la hoja de Google: lo que cargues ahora se mezcla con los datos de prueba y se borra al reiniciar. Sirve para
          probar tus archivos; la carga definitiva la haremos cuando conectemos Google Sheets.
        </p>
      )}
      <ImportWizard snapshot={snapshot} />
    </>
  );
}
