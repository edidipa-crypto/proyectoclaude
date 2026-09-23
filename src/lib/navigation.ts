import { FileText, LayoutDashboard, Package, Truck, Wrench, type LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard (Finanzas)", href: "/dashboard", icon: LayoutDashboard, description: "P&L y KPIs del taller" },
  { title: "Órdenes de Trabajo", href: "/work-orders", icon: Wrench, description: "OTs de vehículos pesados" },
  { title: "Inventario Diésel", href: "/inventory", icon: Package, description: "Inyectores, bombas, turbos y filtros" },
  { title: "Gestión de Terceros", href: "/third-party", icon: Truck, description: "Laboratorios y rectificadoras" },
  { title: "Facturación DIAN", href: "/billing", icon: FileText, description: "Factura electrónica UBL 2.1" },
];
