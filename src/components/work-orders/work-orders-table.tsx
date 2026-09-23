"use client";

import { Search } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WORK_ORDER_STATUS } from "@/lib/constants";
import type { WorkOrder } from "@/types";
import { workOrderColumns } from "./columns";

const ALL = "all";

export function WorkOrdersTable({ data }: { data: WorkOrder[] }) {
  return (
    <DataTable
      columns={workOrderColumns}
      data={data}
      emptyMessage="No hay órdenes de trabajo que coincidan con el filtro."
      toolbar={(table) => (
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar placa, cliente, motor, servicio…"
              value={(table.getState().globalFilter as string) ?? ""}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              className="pl-9"
              aria-label="Buscar órdenes de trabajo"
            />
          </div>
          <Select
            value={(table.getColumn("status")?.getFilterValue() as string) ?? ALL}
            onValueChange={(v) => table.getColumn("status")?.setFilterValue(v === ALL ? undefined : v)}
          >
            <SelectTrigger className="sm:w-[220px]" aria-label="Filtrar por estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {Object.entries(WORK_ORDER_STATUS).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    />
  );
}
