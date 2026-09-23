# DieselPro · Dashboard financiero para centro de servicio diésel

MVP de gestión y análisis financiero para un taller especializado 100% en motores diésel
(inyección common rail, bombas de alta presión, turbos, reparación de motor).

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · shadcn/ui ·
Recharts · TanStack Table · Supabase (PostgreSQL) · Docker (Coolify).

## Rutas

| Ruta | Descripción |
|---|---|
| `/dashboard` | P&L: KPIs (ingresos, costos diésel, costos terceros, margen bruto), barras ingresos vs egresos, dona de costos, estado de resultados. Filtro 3/6/12 meses. |
| `/work-orders` | Data Table (shadcn + TanStack) de OTs de vehículos pesados: búsqueda, filtro por estado, orden y paginación. |
| `/inventory` | Inventario diésel (inyectores, bombas CP3, turbos, filtros) con alertas de stock mínimo. |
| `/third-party` | Trabajos tercerizados (laboratorios de inyección, rectificadoras, turbos) enlazados a OTs; modal de registro. |
| `/billing` | Estado de las facturas electrónicas DIAN. |
| `POST /api/billing/emit` | Emisión de factura desde una OT (n8n → app). |
| `POST /api/dian/webhook` | Recepción de estados DIAN (n8n → app). |
| `GET /api/health` | Healthcheck para Docker/Coolify. |

## Estructura

```
src/
  app/                 # rutas (App Router) y API routes
  components/
    ui/                # primitivas shadcn/ui (button, card, table, dialog, select, data-table…)
    layout/            # sidebar y encabezados
    dashboard/         # KPIs y gráficos (Recharts)
    work-orders/       # columnas y tabla de OTs
    third-party/       # panel y modal de terceros
  lib/
    supabase/          # clientes browser / server / admin (service role)
    data.ts            # capa de datos (hoy mocks, lista para Supabase)
    mock-data.ts       # datos de demostración realistas (COP)
  types/               # tipos de dominio
supabase/migrations/   # esquema SQL inicial (tablas, enums, vista monthly_pnl, RLS)
```

## Desarrollo local

```bash
cp .env.example .env.local   # completar variables
npm install
npm run dev                  # http://localhost:3000
```

Sin variables de Supabase la app funciona en **modo demo** con datos mock; las API routes
validan y responden con `persisted: false`.

Para crear el esquema: ejecutar `supabase/migrations/0001_initial_schema.sql` en el SQL editor
de Supabase (o `supabase db push`).

## Integración n8n / DIAN

```
Dashboard / n8n ──POST /api/billing/emit──▶ App (valida, calcula IVA, registra "pendiente")
                                             │  dispatchToN8n=true
                                             ▼
                                   n8n: arma XML UBL 2.1, CUFE, firma, envía a la DIAN
                                             │
App ◀──POST /api/dian/webhook (estado DIAN)──┘  (aceptado ⇒ OT pasa a "facturada")
```

**Emitir** — `Authorization: Bearer $BILLING_API_TOKEN`, header opcional `Idempotency-Key`:

```bash
curl -X POST https://tu-dominio/api/billing/emit \
  -H "Authorization: Bearer $BILLING_API_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "workOrderId": "<uuid OT>",
    "customer": { "name": "Transportes Andinos de Carga S.A.S.", "idType": "31",
                  "idNumber": "900123456", "dv": "7", "email": "facturas@andinos.co" },
    "lines": [
      { "code": "MO-INY", "description": "Overhaul inyectores common rail", "quantity": 1, "unitPrice": 3850000 },
      { "code": "INY-XPI-2872", "description": "Inyector Cummins XPI", "quantity": 6, "unitPrice": 1600000 }
    ],
    "dispatchToN8n": true
  }'
```

Responde `202` con el documento normalizado (líneas, subtotales por tarifa de IVA, totales).

**Webhook de estado** — header `x-webhook-secret: $DIAN_WEBHOOK_SECRET`:

```json
{ "event": "dian.status", "invoiceId": "<uuid>", "status": "aceptado",
  "cufe": "…", "message": "Procesado Correctamente.", "xmlUrl": "https://…", "pdfUrl": "https://…" }
```

Estados: `pendiente | enviado | aceptado | aceptado_con_notificaciones | rechazado | error`.

## Despliegue en Coolify

1. Nuevo recurso → **Docker Compose** → este repositorio (`docker-compose.yml`).
2. Definir variables de entorno (ver `.env.example`). Marcar `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` como *Build Variables* (se incrustan en el bundle).
3. Asignar el dominio al servicio `app` (puerto 3000). El healthcheck usa `/api/health`.

Alternativa: recurso **Dockerfile** usando el `Dockerfile` directamente (puerto 3000).

La imagen usa `output: "standalone"` de Next.js, build multi-stage y usuario no root.
