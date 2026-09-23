import { inventoryItems, invoices, monthlyFinancials, providers, thirdPartyJobs, workOrders } from "@/lib/mock-data";

// ---------------------------------------------------------------------------
// Capa de acceso a datos. Hoy devuelve mocks; el contrato (async) ya está listo
// para cambiar a consultas de Supabase sin tocar las páginas, p. ej.:
//
//   const supabase = createClient();
//   const { data } = await supabase.from("monthly_pnl").select("*");
// ---------------------------------------------------------------------------

export async function getMonthlyFinancials() {
  return monthlyFinancials;
}

export async function getWorkOrders() {
  return workOrders;
}

export async function getProviders() {
  return providers;
}

export async function getThirdPartyJobs() {
  return thirdPartyJobs;
}

export async function getInventory() {
  return inventoryItems;
}

export async function getInvoices() {
  return invoices;
}
