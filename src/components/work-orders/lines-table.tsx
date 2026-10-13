import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computeTotals, lineAmounts, type Withholdings } from "@/lib/money";
import { cn, formatCOP, formatPercent } from "@/lib/utils";
import type { LineKind, WorkOrderLine } from "@/types";

const KIND_LABEL: Record<LineKind, string> = {
  labor: "Mano de obra",
  part: "Repuestos diésel",
  third_party: "Trabajos de terceros",
};

/** Líneas de la OT agrupadas por tipo, con totales, retenciones y rentabilidad. */
export function LinesTable({ lines, showCosts, withholdings }: { lines: WorkOrderLine[]; showCosts: boolean; withholdings?: Withholdings }) {
  if (lines.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-muted-foreground">Todavía no hay trabajos ni repuestos cotizados.</p>;
  }
  const totals = computeTotals(lines);
  const kinds = (Object.keys(KIND_LABEL) as LineKind[]).filter((k) => lines.some((l) => l.kind === k));

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Descripción</TableHead>
            <TableHead className="text-right">Cant.</TableHead>
            <TableHead className="text-right">Valor unit.</TableHead>
            {showCosts && <TableHead className="text-right">Costo</TableHead>}
            <TableHead className="text-right">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kinds.map((kind) => (
            <KindRows key={kind} title={KIND_LABEL[kind]} lines={lines.filter((l) => l.kind === kind)} showCosts={showCosts} />
          ))}
        </TableBody>
      </Table>
      <dl className="ml-auto max-w-sm space-y-1.5 border-t p-6 text-sm tabular-nums">
        <Row label="Subtotal" value={formatCOP(totals.subtotal)} />
        {totals.discount > 0 && <Row label="Descuentos" value={`− ${formatCOP(totals.discount)}`} />}
        <Row label="IVA 19 %" value={formatCOP(totals.tax)} />
        <Row label="Total" value={formatCOP(totals.total)} strong />
        {withholdings && withholdings.total > 0 && (
          <>
            {withholdings.income > 0 && <Row label="Retención en la fuente" value={`− ${formatCOP(withholdings.income)}`} />}
            {withholdings.vat > 0 && <Row label="ReteIVA" value={`− ${formatCOP(withholdings.vat)}`} />}
            {withholdings.ica > 0 && <Row label="ReteICA" value={`− ${formatCOP(withholdings.ica)}`} />}
            <Row label="Neto a pagar" value={formatCOP(withholdings.netPayable)} strong />
          </>
        )}
        {showCosts && (
          <div className="mt-3 space-y-1.5 rounded-md bg-muted p-3">
            <Row label="Costo real" value={formatCOP(totals.cost)} />
            <Row label={`Rentabilidad (${formatPercent(totals.marginPct)})`} value={formatCOP(totals.profit)} strong />
            <p className="text-xs text-muted-foreground">Repuestos al costo promedio, terceros a lo que cobran y la hora técnica a su costo estimado.</p>
          </div>
        )}
      </dl>
    </>
  );
}

function KindRows({ title, lines, showCosts }: { title: string; lines: WorkOrderLine[]; showCosts: boolean }) {
  return (
    <>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={showCosts ? 5 : 4} className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </TableCell>
      </TableRow>
      {lines.map((l) => {
        const a = lineAmounts(l);
        return (
          <TableRow key={l.id}>
            <TableCell className="min-w-[220px]">{l.description}</TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">
              {l.quantity.toLocaleString("es-CO")}
              {l.kind === "labor" ? " h" : ""}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">{formatCOP(l.unitPrice)}</TableCell>
            {showCosts && <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">{formatCOP(a.cost)}</TableCell>}
            <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{formatCOP(a.subtotal)}</TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4", strong ? "font-semibold" : "text-muted-foreground")}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
