# DieselPro · Plataforma para centro de servicio diésel

Gestión de un taller especializado 100% en motores diésel (inyección common rail, bombas de
alta presión, turbos, reparación de motor): órdenes de trabajo, clientes y vehículos,
inventario con kárdex, terceros, facturación DIAN, cartera, cuentas por pagar y finanzas.

**Estado:** Fase 0 — todas las pantallas funcionan sobre **datos de prueba en memoria**
(`src/lib/seed.ts`), con roles y permisos. La base de datos real (Supabase) llega en la Fase 1.

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · shadcn/ui ·
Recharts · TanStack Table · zod · Vitest · Supabase (PostgreSQL) · Docker (Coolify).

## Rutas

| Ruta | Descripción | Roles |
|---|---|---|
| `/login` | Entrada con un usuario de prueba por rol (Fase 1: Supabase Auth). | todos |
| `/dashboard` | P&L por mes cerrado calculado desde OTs entregadas y gastos: KPIs, ingresos vs egresos, dona de costos, estado de resultados. Filtro 3/6/12 meses. | admin, contabilidad |
| `/technician` | Vista móvil del técnico: sus OTs abiertas. | técnico, admin |
| `/work-orders` | Tabla de OTs (búsqueda, filtro, orden, paginación) y botón de nueva OT. | admin, asesor |
| `/work-orders/[id]` | Detalle: recepción, cotización por líneas (mano de obra, repuestos, terceros), IVA, retenciones, rentabilidad, envíos a terceros, cambio de estado e historial. | admin, asesor, técnico asignado |
| `/clients`, `/clients/[id]`, `/vehicles/[id]` | Clientes (NIT con DV), flota, horómetro en maquinaria e historial por vehículo. | admin, asesor, contabilidad |
| `/inventory`, `/inventory/[id]` | Inventario con costo promedio ponderado, "qué pedir" y kárdex. | todos |
| `/third-party` | Trabajos tercerizados enlazados a OTs; modal de registro. | admin, asesor, contabilidad |
| `/billing` | Estado de las facturas electrónicas DIAN. | admin, contabilidad |
| `/receivables` | Cartera por edades y por cliente (neto de retenciones). | admin, contabilidad |
| `/payables` | Cuentas por pagar a proveedores y terceros. | admin, contabilidad |
| `/expenses` | Gastos generales por mes y categoría. | admin, contabilidad |
| `/users` | Usuarios y matriz de permisos por rol. | admin |
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
    clients/           # formulario de cliente
    forms/             # campos de formulario compartidos
  app/actions.ts       # Server Actions (escrituras), validadas con zod
  lib/
    supabase/          # clientes browser / server / admin (service role)
    data.ts            # capa de datos (hoy datos de prueba en memoria, lista para Supabase)
    seed.ts            # datos de prueba realistas y determinísticos (fechas relativas a hoy)
    money.ts           # IVA, retenciones, márgenes, costo promedio, kárdex, P&L, cartera
    validation.ts      # esquemas zod compartidos formulario/servidor, DV del NIT
    permissions.ts     # qué puede ver y hacer cada rol; flujo de estados de la OT
    session.ts         # sesión de prueba (Fase 1: Supabase Auth)
    dates.ts           # fechas en America/Bogota
  types/               # tipos de dominio
supabase/migrations/   # esquema SQL inicial (tablas, enums, vista monthly_pnl, RLS)
```

## Desarrollo local

```bash
npm install
npm run dev                  # http://localhost:3000
npm test                     # pruebas de cálculos de dinero, validaciones y datos de prueba
npm run typecheck && npm run lint && npm run build
```

En la Fase 0 no hace falta `.env.local`: la app corre con datos de prueba en memoria (se
reinician al reiniciar el servidor). Las API routes validan y responden con `persisted: false`
mientras no haya variables de Supabase.

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

## Despliegue en Railway (maqueta)

`railway.json` le indica a Railway que construya con el `Dockerfile` y vigile `/api/health`.

1. Railway → **New Project** → **Deploy from GitHub repo** → este repositorio.
2. **Settings → Source**: rama `fase-0-integracion`.
3. **Variables**: `DEMO_USER` y `DEMO_PASSWORD` (el navegador pedirá esa clave antes de entrar).
4. **Settings → Networking → Generate Domain**.

La maqueta guarda los datos de prueba en memoria: se reinician en cada despliegue o reinicio.

## Despliegue en Coolify

1. Nuevo recurso → **Docker Compose** → este repositorio (`docker-compose.yml`).
2. Definir variables de entorno (ver `.env.example`). Marcar `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` como *Build Variables* (se incrustan en el bundle).
3. Asignar el dominio al servicio `app` (puerto 3000). El healthcheck usa `/api/health`.

Alternativa: recurso **Dockerfile** usando el `Dockerfile` directamente (puerto 3000).

La imagen usa `output: "standalone"` de Next.js, build multi-stage y usuario no root.
