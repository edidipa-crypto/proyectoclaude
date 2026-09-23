-- ============================================================================
-- Esquema inicial: Centro de servicio diésel (OT, terceros, inventario, DIAN)
-- ============================================================================

create extension if not exists "pgcrypto";

-- --- Clientes y vehículos ---------------------------------------------------
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  nit         text not null unique,
  email       text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete restrict,
  plate        text not null unique,
  brand        text not null,
  model        text not null,
  engine       text not null,           -- Cummins ISX15, Detroit DD15, ...
  year         int,
  odometer_km  int,
  created_at   timestamptz not null default now()
);

-- --- Órdenes de trabajo -----------------------------------------------------
create type public.work_order_status as enum (
  'recibida','diagnostico','en_reparacion','esperando_repuestos',
  'en_tercero','lista','entregada','facturada'
);
create type public.work_order_priority as enum ('baja','media','alta','critica');

create table public.work_orders (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,     -- OT-2026-0142
  client_id     uuid not null references public.clients(id),
  vehicle_id    uuid not null references public.vehicles(id),
  service       text not null,
  status        public.work_order_status not null default 'recibida',
  priority      public.work_order_priority not null default 'media',
  technician    text,
  opened_at     date not null default current_date,
  promised_at   date,
  labor_amount  numeric(14,2) not null default 0,
  parts_amount  numeric(14,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index work_orders_status_idx on public.work_orders(status);
create index work_orders_opened_at_idx on public.work_orders(opened_at);

-- --- Inventario diésel ------------------------------------------------------
create table public.inventory_items (
  id            uuid primary key default gen_random_uuid(),
  sku           text not null unique,
  name          text not null,            -- Inyector CR Bosch 0445120..., Bomba CP3, ...
  category      text not null,            -- inyeccion, turbo, filtros, empaques...
  oem_ref       text,
  stock         numeric(12,2) not null default 0,
  min_stock     numeric(12,2) not null default 0,
  unit_cost     numeric(14,2) not null default 0,
  created_at    timestamptz not null default now()
);

create table public.work_order_parts (
  id               uuid primary key default gen_random_uuid(),
  work_order_id    uuid not null references public.work_orders(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id),
  description      text not null,
  quantity         numeric(12,2) not null,
  unit_cost        numeric(14,2) not null,
  unit_price       numeric(14,2) not null
);

-- --- Terceros (outsourcing) -------------------------------------------------
create type public.provider_type as enum (
  'laboratorio_inyeccion','rectificadora','reparacion_turbos','radiadores','electronica'
);
create type public.third_party_status as enum ('cotizado','enviado','en_proceso','recibido','pagado');

create table public.providers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  nit         text not null unique,
  type        public.provider_type not null,
  city        text,
  created_at  timestamptz not null default now()
);

create table public.third_party_jobs (
  id             uuid primary key default gen_random_uuid(),
  work_order_id  uuid references public.work_orders(id) on delete set null,
  provider_id    uuid not null references public.providers(id),
  description    text not null,
  cost           numeric(14,2) not null,
  markup_pct     numeric(5,2) not null default 20,
  status         public.third_party_status not null default 'cotizado',
  sent_at        date,
  expected_at    date,
  invoice_ref    text,
  created_at     timestamptz not null default now()
);
create index third_party_jobs_wo_idx on public.third_party_jobs(work_order_id);

-- --- Facturación electrónica DIAN -------------------------------------------
create type public.dian_status as enum (
  'pendiente','enviado','aceptado','aceptado_con_notificaciones','rechazado','error'
);

create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  work_order_id   uuid not null references public.work_orders(id),
  number          text unique,             -- prefijo + consecutivo autorizado (ej. FE-10452)
  cufe            text unique,
  subtotal        numeric(14,2) not null,
  tax_total       numeric(14,2) not null,
  total           numeric(14,2) not null,
  dian_status     public.dian_status not null default 'pendiente',
  dian_message    text,
  xml_url         text,
  pdf_url         text,
  idempotency_key text unique,
  issued_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.dian_events (
  id            bigserial primary key,
  invoice_id    uuid references public.invoices(id) on delete cascade,
  event_type    text not null,
  payload       jsonb not null,
  received_at   timestamptz not null default now()
);

-- --- Vista P&L mensual ------------------------------------------------------
create or replace view public.monthly_pnl as
select
  date_trunc('month', wo.opened_at)::date                               as month,
  sum(wo.labor_amount + wo.parts_amount)                                as revenue_own,
  coalesce(sum(tp.cost * (1 + tp.markup_pct / 100)), 0)                 as revenue_third_party,
  coalesce(sum(p.parts_cost), 0)                                        as diesel_parts_cost,
  coalesce(sum(tp.cost), 0)                                             as third_party_cost
from public.work_orders wo
left join (
  select work_order_id, sum(quantity * unit_cost) as parts_cost
  from public.work_order_parts group by work_order_id
) p on p.work_order_id = wo.id
left join (
  select work_order_id, sum(cost) as cost, avg(markup_pct) as markup_pct
  from public.third_party_jobs group by work_order_id
) tp on tp.work_order_id = wo.id
group by 1
order by 1;

-- --- RLS: solo usuarios autenticados del taller -----------------------------
alter table public.clients          enable row level security;
alter table public.vehicles         enable row level security;
alter table public.work_orders      enable row level security;
alter table public.inventory_items  enable row level security;
alter table public.work_order_parts enable row level security;
alter table public.providers        enable row level security;
alter table public.third_party_jobs enable row level security;
alter table public.invoices         enable row level security;
alter table public.dian_events      enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'clients','vehicles','work_orders','inventory_items','work_order_parts',
    'providers','third_party_jobs','invoices','dian_events'
  ] loop
    execute format(
      'create policy "authenticated_all_%1$s" on public.%1$I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
