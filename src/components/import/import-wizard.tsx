"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";

import { importData, type ImportResult } from "@/app/actions";
import { NativeSelect } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { autoMap, FIELDS, findHeaderRow, KIND_LABEL, planImport, type ImportKind, type ImportSnapshot, type Mapping } from "@/lib/import";
import { cellText } from "@/lib/parse";
import { cn } from "@/lib/utils";

type Cell = string | number | boolean | null;
interface Sheet {
  name: string;
  data: Cell[][];
}

const KIND_HELP: Record<ImportKind, string> = {
  clients: "Nombre o razón social, NIT o cédula, teléfono, correo, ciudad…",
  vehicles: "Placa, cliente, marca, modelo, motor, año, kilometraje u horómetro…",
  workOrders: "Fecha, placa o cliente, trabajo realizado y valor cobrado (o mano de obra, repuestos y terceros por separado).",
};

const TEMPLATE: Record<ImportKind, string> = {
  clients: "/plantillas/plantilla-clientes.xlsx",
  vehicles: "/plantillas/plantilla-vehiculos.xlsx",
  workOrders: "/plantillas/plantilla-trabajos.xlsx",
};

const STATUS = {
  nuevo: { label: "Se agrega", variant: "success" },
  existe: { label: "Ya existe", variant: "secondary" },
  error: { label: "Error", variant: "destructive" },
} as const;

/** CSV con coma o punto y coma (Excel en español usa punto y coma). */
function parseCsv(text: string): Cell[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: Cell[][] = [];
  let row: Cell[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) row.push(cell), (cell = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) rows.push([...row, cell]);
  return rows;
}

async function readFile(file: File): Promise<Sheet[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) return [{ name: file.name, data: parseCsv(await file.text()) }];
  if (name.endsWith(".xls")) throw new Error("Ese archivo es de Excel antiguo (.xls). Ábrelo en Excel y guárdalo como .xlsx, o descárgalo de Google Sheets como .xlsx.");
  const { default: readXlsxFile } = await import("read-excel-file/browser");
  const sheets = await readXlsxFile(file);
  return sheets.map((s) => ({
    name: s.sheet,
    // Las fechas se envían como texto AAAA-MM-DD
    data: s.data.map((r) => r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : (c as Cell)))),
  }));
}

export function ImportWizard({ snapshot }: { snapshot: ImportSnapshot }) {
  const [kind, setKind] = useState<ImportKind>("clients");
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<Mapping>({});
  const [includesVat, setIncludesVat] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [saving, startSaving] = useTransition();

  const sheet = sheets[sheetIndex];
  const headerRow = sheet ? findHeaderRow(sheet.data) : 0;
  const headers = sheet?.data[headerRow] ?? [];
  const rows = useMemo(() => sheet?.data.slice(headerRow + 1) ?? [], [sheet, headerRow]);

  const plan = useMemo(() => {
    if (!sheet) return null;
    let n = 0;
    return planImport(kind, rows, mapping, snapshot, { pricesIncludeVat: includesVat }, (p) => `${p}-preview-${++n}`, headerRow + 2);
  }, [sheet, kind, rows, mapping, snapshot, includesVat, headerRow]);

  const counts = { nuevo: 0, existe: 0, error: 0 };
  for (const r of plan?.rows ?? []) counts[r.status]++;
  const toCreate = plan ? plan.clients.length + plan.vehicles.length + plan.workOrders.length : 0;

  function chooseKind(k: ImportKind) {
    setKind(k);
    setResult(null);
    if (sheet) setMapping(autoMap(k, sheet.data[findHeaderRow(sheet.data)] ?? []));
  }

  async function onFile(file: File | undefined) {
    setError("");
    setResult(null);
    setSheets([]);
    if (!file) return;
    try {
      const read = await readFile(file);
      const usable = read.filter((s) => s.data.length > 1);
      if (!usable.length) throw new Error("El archivo no tiene filas con datos.");
      setFileName(file.name);
      setSheets(usable);
      setSheetIndex(0);
      setMapping(autoMap(kind, usable[0].data[findHeaderRow(usable[0].data)] ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  }

  function chooseSheet(i: number) {
    setSheetIndex(i);
    setMapping(autoMap(kind, sheets[i].data[findHeaderRow(sheets[i].data)] ?? []));
  }

  function save() {
    startSaving(async () => {
      const res = await importData({ kind, rows, mapping, options: { pricesIncludeVat: includesVat }, firstLine: headerRow + 2 });
      setResult(res);
      if (res.ok) setSheets([]);
    });
  }

  return (
    <div className="space-y-6">
      {/* 1. Qué se va a cargar */}
      <Card>
        <CardHeader>
          <CardTitle>1. ¿Qué vas a cargar?</CardTitle>
          <CardDescription>Te recomiendo este orden: primero clientes, luego vehículos y por último los trabajos realizados.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(KIND_LABEL) as ImportKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => chooseKind(k)}
              aria-pressed={kind === k}
              className={cn("rounded-md border p-4 text-left transition-colors", kind === k ? "border-primary bg-primary/10" : "hover:bg-accent")}
            >
              <span className="font-semibold">{KIND_LABEL[k]}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{KIND_HELP[k]}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* 2. Archivo */}
      <Card>
        <CardHeader>
          <CardTitle>2. Sube el archivo</CardTitle>
          <CardDescription>
            Excel (.xlsx) o CSV. Si está en Google Drive: ábrelo y usa Archivo → Descargar → Microsoft Excel (.xlsx). La primera fila con títulos se toma como
            encabezados. Tus columnas no tienen que llamarse igual; si quieres una guía,{" "}
            <a href={TEMPLATE[kind]} download className="text-primary underline">
              descarga la plantilla de {KIND_LABEL[kind].toLowerCase()}
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed p-8 text-center hover:bg-accent/50">
            <Upload className="h-6 w-6 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">{fileName ? `Archivo: ${fileName} (toca para cambiarlo)` : "Toca aquí para elegir el archivo"}</span>
            <input type="file" accept=".xlsx,.csv,.txt,.xls" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {sheets.length > 1 && (
            <div className="grid gap-2 sm:max-w-sm">
              <Label htmlFor="sheet">Hoja del archivo</Label>
              <NativeSelect id="sheet" value={sheetIndex} onChange={(e) => chooseSheet(Number(e.target.value))}>
                {sheets.map((s, i) => (
                  <option key={s.name} value={i}>
                    {s.name} ({s.data.length} filas)
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Columnas */}
      {sheet && (
        <Card>
          <CardHeader>
            <CardTitle>3. Revisa las columnas</CardTitle>
            <CardDescription>
              Las reconocí por su título. Corrige las que estén mal; las marcadas con * son obligatorias. Encabezados en la fila {headerRow + 1}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS[kind].map((f) => (
                <div key={f.key} className="grid gap-1.5">
                  <Label htmlFor={`map-${f.key}`}>
                    {f.label}
                    {f.required && " *"}
                  </Label>
                  <NativeSelect
                    id={`map-${f.key}`}
                    value={mapping[f.key] ?? -1}
                    onChange={(e) => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}
                    invalid={f.required && !(mapping[f.key] >= 0)}
                  >
                    <option value={-1}>— No está en el archivo —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {cellText(h) || `Columna ${i + 1}`}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ))}
            </div>
            {kind === "workOrders" && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={includesVat} onChange={(e) => setIncludesVat(e.target.checked)} />
                <span>
                  Los valores del archivo <strong>incluyen IVA</strong> (se descuenta el 19 % para guardarlos antes de IVA). Desmárcalo si son valores sin IVA.
                </span>
              </label>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Vista previa */}
      {plan && (
        <Card>
          <CardHeader>
            <CardTitle>4. Vista previa</CardTitle>
            <CardDescription>
              {counts.nuevo} filas se agregan · {counts.existe} ya existen y se saltan · {counts.error} con error.
              {plan.clients.length + plan.vehicles.length + plan.workOrders.length > 0 &&
                ` Se crearán: ${plan.clients.length} clientes, ${plan.vehicles.length} vehículos, ${plan.workOrders.length} trabajos.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan.warnings.map((w) => (
              <p key={w} className="flex items-start gap-2 rounded-md bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {w}
              </p>
            ))}
            {plan.rows.length > 0 && (
              <div className="max-h-[420px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-20">Fila</TableHead>
                      <TableHead className="w-28">Resultado</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.rows.slice(0, 300).map((r) => (
                      <TableRow key={r.line}>
                        <TableCell className="tabular-nums text-muted-foreground">{r.line}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS[r.status].variant} className="whitespace-nowrap">
                            {STATUS[r.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{r.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {plan.rows.length > 300 && <p className="text-xs text-muted-foreground">Se muestran las primeras 300 filas de {plan.rows.length}.</p>}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Las filas con error o que ya existen no se guardan. Puedes corregir el archivo y volver a subirlo.</p>
              <Button onClick={save} disabled={saving || toCreate === 0}>
                <FileSpreadsheet /> {saving ? "Guardando…" : `Guardar ${toCreate} registros`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className={result.ok ? "border-emerald-400" : "border-destructive"}>
          <CardContent className="flex items-start gap-3 p-5 text-sm">
            {result.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden /> : <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />}
            <div>
              <p className="font-semibold">{result.message}</p>
              {result.created && (
                <p className="mt-1 text-muted-foreground">
                  {result.created.clients} clientes, {result.created.vehicles} vehículos y {result.created.workOrders} trabajos guardados.{" "}
                  <Link href={result.created.workOrders ? "/work-orders" : "/clients"} className="text-primary hover:underline">
                    Ver lo cargado
                  </Link>
                  . Puedes subir otro archivo.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
