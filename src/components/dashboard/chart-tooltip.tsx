import type { TooltipProps } from "recharts";

import { formatCOP } from "@/lib/utils";

/** Tooltip compartido: el color identifica la serie, el texto usa tinta neutra. */
export function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[180px] rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label && <p className="mb-1.5 font-semibold">{label}</p>}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey ?? entry.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: (entry.payload?.fill as string) ?? entry.color }}
                aria-hidden
              />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums">{formatCOP(Number(entry.value))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
