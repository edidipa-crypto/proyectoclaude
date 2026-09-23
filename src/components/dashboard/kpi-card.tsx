import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn, formatPercent } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  /** Variación % último mes vs anterior */
  delta?: number;
  hint?: string;
}

export function KpiCard({ title, value, icon: Icon, delta, hint }: KpiCardProps) {
  const up = (delta ?? 0) >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {delta !== undefined && (
            <span className={cn("inline-flex items-center font-medium text-foreground")}>
              <Arrow className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">{up ? "Aumento" : "Disminución"}</span>
              {formatPercent(Math.abs(delta))}
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
