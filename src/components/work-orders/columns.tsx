"use client";

import type { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WORK_ORDER_PRIORITY, WORK_ORDER_STATUS } from "@/lib/constants";
import { formatCOP, formatDate, workOrderTotal } from "@/lib/utils";
import type { WorkOrder } from "@/types";

function SortHeader<T>({ column, title, align }: { column: Column<T>; title: string; align?: "right" }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={align === "right" ? "-mr-3 ml-auto flex" : "-ml-3"}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </Button>
  );
}

export const workOrderColumns: ColumnDef<WorkOrder>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <SortHeader column={column} title="OT" />,
    cell: ({ row }) => <span className="whitespace-nowrap font-mono text-xs font-semibold">{row.original.code}</span>,
  },
  {
    id: "vehicle",
    accessorFn: (wo) => `${wo.vehicle.plate} ${wo.vehicle.brand} ${wo.vehicle.model} ${wo.vehicle.engine}`,
    header: "Vehículo",
    cell: ({ row }) => {
      const v = row.original.vehicle;
      return (
        <div className="min-w-[170px]">
          <p className="font-medium">
            <span className="mr-2 rounded border bg-amber-100 px-1.5 py-0.5 font-mono text-xs text-slate-900 dark:bg-amber-400">
              {v.plate}
            </span>
            {v.brand} {v.model}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {v.engine} · {v.year} · {v.odometerKm.toLocaleString("es-CO")} km
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "client",
    header: "Cliente",
    cell: ({ row }) => (
      <div className="min-w-[160px]">
        <p className="line-clamp-1">{row.original.client}</p>
        <p className="text-xs text-muted-foreground">NIT {row.original.clientNit}</p>
      </div>
    ),
  },
  {
    accessorKey: "service",
    header: "Servicio",
    cell: ({ row }) => <p className="line-clamp-2 min-w-[220px] max-w-[320px]">{row.original.service}</p>,
  },
  {
    accessorKey: "status",
    header: "Estado",
    filterFn: (row, id, value: string) => !value || row.getValue(id) === value,
    cell: ({ row }) => {
      const s = WORK_ORDER_STATUS[row.original.status];
      return <Badge variant={s.variant} className="whitespace-nowrap">{s.label}</Badge>;
    },
  },
  {
    accessorKey: "priority",
    header: "Prioridad",
    cell: ({ row }) => {
      const p = WORK_ORDER_PRIORITY[row.original.priority];
      return <Badge variant={p.variant}>{p.label}</Badge>;
    },
  },
  {
    accessorKey: "technician",
    header: "Técnico",
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.technician}</span>,
  },
  {
    accessorKey: "openedAt",
    header: ({ column }) => <SortHeader column={column} title="Apertura" />,
    cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.openedAt)}</span>,
  },
  {
    id: "total",
    accessorFn: workOrderTotal,
    header: ({ column }) => <SortHeader column={column} title="Total" align="right" />,
    cell: ({ row }) => (
      <div className="text-right">
        <p className="whitespace-nowrap font-semibold tabular-nums">{formatCOP(workOrderTotal(row.original))}</p>
        {row.original.thirdPartyAmount > 0 && (
          <p className="whitespace-nowrap text-xs text-muted-foreground">
            Terceros {formatCOP(row.original.thirdPartyAmount)}
          </p>
        )}
      </div>
    ),
  },
];
