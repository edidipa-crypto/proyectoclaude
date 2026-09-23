"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Fuel, Menu, X } from "lucide-react";

import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Navegación principal">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-white/10 text-white"
                : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-amber-400" : "text-sidebar-foreground/50")} />
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-6 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-500 text-slate-950">
        <Fuel className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold text-white">DieselPro</p>
        <p className="text-xs text-sidebar-foreground/60">Centro de servicio</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Brand />
        <NavLinks />
        <div className="mt-auto border-t border-white/10 px-6 py-4 text-xs text-sidebar-foreground/50">
          MVP · Datos de demostración
        </div>
      </aside>

      {/* Móvil: barra superior + cajón */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-sidebar px-4 text-sidebar-foreground md:hidden">
        <div className="flex items-center gap-2">
          <Fuel className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-bold text-white">DieselPro</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <Brand />
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
