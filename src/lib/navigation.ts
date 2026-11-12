import {
  Banknote,
  ClipboardList,
  FileText,
  HandCoins,
  LayoutDashboard,
  Package,
  Truck,
  Upload,
  UserCog,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { Section } from "@/lib/permissions";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  section: Section;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard (Finanzas)", href: "/dashboard", icon: LayoutDashboard, description: "P&L y KPIs del taller", section: "dashboard" },
  { title: "Mis trabajos", href: "/technician", icon: Wrench, description: "OTs asignadas al técnico", section: "technician" },
  { title: "Órdenes de Trabajo", href: "/work-orders", icon: ClipboardList, description: "OTs de vehículos pesados", section: "work-orders" },
  { title: "Clientes y vehículos", href: "/clients", icon: Users, description: "Flotas, NIT y contactos", section: "clients" },
  { title: "Inventario Diésel", href: "/inventory", icon: Package, description: "Inyectores, bombas, turbos y filtros", section: "inventory" },
  { title: "Gestión de Terceros", href: "/third-party", icon: Truck, description: "Laboratorios y rectificadoras", section: "third-party" },
  { title: "Facturación DIAN", href: "/billing", icon: FileText, description: "Factura electrónica UBL 2.1", section: "billing" },
  { title: "Cartera", href: "/receivables", icon: HandCoins, description: "Cuentas por cobrar", section: "receivables" },
  { title: "Cuentas por pagar", href: "/payables", icon: Wallet, description: "Proveedores y terceros", section: "payables" },
  { title: "Gastos", href: "/expenses", icon: Banknote, description: "Gastos generales del taller", section: "expenses" },
  { title: "Cargar datos", href: "/import", icon: Upload, description: "Subir clientes, vehículos y trabajos desde Excel", section: "import" },
  { title: "Usuarios y roles", href: "/users", icon: UserCog, description: "Accesos al sistema", section: "users" },
];

export const NAV_SECTIONS: Section[] = NAV_ITEMS.map((i) => i.section);
