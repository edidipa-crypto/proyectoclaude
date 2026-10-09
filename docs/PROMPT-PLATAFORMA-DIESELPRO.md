# Prompt: convertir DieselPro en una plataforma funcional

> Cómo usarlo: llena la sección **"Datos de mi negocio"**, luego copia todo el bloque
> desde "INICIO DEL PROMPT" hasta "FIN DEL PROMPT" y pégalo en Claude Code abierto sobre
> este repositorio (`edidipa-crypto/proyectoclaude`). Lo que no sepas, déjalo en blanco:
> Claude te lo preguntará.

---

## Datos de mi negocio (llénalos antes de pegar)

- Nombre comercial y razón social:
- NIT:
- Ciudad / sedes:
- Número de técnicos y de personas administrativas que usarán el sistema:
- ¿Facturas electrónicamente hoy? ¿Con qué proveedor tecnológico (o directo con la DIAN)?:
- Resolución de facturación DIAN (prefijo y rango), si ya la tienes:
- ¿Usas algún programa contable (Siigo, Alegra, World Office…)?:
- Servicios principales y precio de la hora de mano de obra:
- Margen que aplicas a los trabajos de terceros (%):
- Laboratorios, rectificadoras y talleres con los que trabajas:
- ¿Dónde quieres alojarlo? (servidor con Coolify, otro):

---

## INICIO DEL PROMPT

Actúa como un Senior Full Stack Engineer y analista de procesos para talleres automotrices.
Vas a convertir el MVP de este repositorio, **DieselPro**, en una plataforma administrativa
**funcional y en producción** para mi centro de servicio, especializado 100% en motores diésel
(inyección common rail, bombas de alta presión, turbos, reparación de motor) para vehículos
pesados: tractocamiones, volquetas, buses y maquinaria.

Soy el dueño del negocio y **no soy técnico**: explícame las decisiones en lenguaje sencillo,
en español, y pídeme confirmación antes de tomar decisiones de negocio.

### Punto de partida (ya existe en el repo)

- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Recharts + TanStack Table.
- Vistas con **datos simulados**: `/dashboard` (P&L, KPIs, gráficos), `/work-orders`,
  `/inventory`, `/third-party`, `/billing`. Todas leen de `src/lib/data.ts`.
- Esquema SQL inicial de Supabase en `supabase/migrations/0001_initial_schema.sql`.
- API para n8n: `POST /api/billing/emit` y `POST /api/dian/webhook`.
- Dockerfile y docker-compose listos para Coolify.

Lee el README y el código antes de empezar. **Conserva el diseño visual actual** (barra lateral
oscura, tarjetas de KPIs, colores de gráficos, formato COP y fechas es-CO); el objetivo es que
todo lo que hoy es maqueta funcione con datos reales.

### Datos de mi negocio

(Usa la sección "Datos de mi negocio" que va adjunta. Si falta algo que necesites, pregúntame.)

### Qué debe hacer la plataforma

**1. Acceso y usuarios**
- Inicio de sesión con Supabase Auth (correo + contraseña, recuperación de clave).
- Roles: **Administrador** (todo), **Asesor de servicio** (clientes, OTs, cotizaciones),
  **Técnico** (solo sus OTs: avance, horas, repuestos usados), **Contabilidad** (finanzas,
  facturación, pagos). Aplicar los permisos también en la base de datos (RLS por rol), no solo
  en la interfaz.
- Registro de auditoría: quién creó o cambió qué y cuándo.

**2. Clientes y vehículos**
- Crear, editar y buscar clientes (NIT/CC con dígito de verificación, contacto, correo de facturación).
- Vehículos por cliente: placa, marca, modelo, motor, año, kilometraje/horómetro.
- Historial completo del vehículo: todas sus OTs, repuestos cambiados y facturas.

**3. Órdenes de trabajo (el corazón del sistema)**
- Crear OT con recepción del vehículo: síntomas reportados, kilometraje, fotos (Supabase Storage).
- Flujo de estados: Recibida → Diagnóstico → Cotización → Aprobada por cliente → En reparación /
  Esperando repuestos / En tercero → Lista → Entregada → Facturada. Registrar fecha y usuario de
  cada cambio.
- Cotización con líneas de mano de obra, repuestos (del inventario) y trabajos de terceros;
  generar PDF para enviarla al cliente y marcar si la aprobó.
- Asignar técnico; el técnico registra horas y novedades desde el celular.
- Al usar un repuesto en la OT, **descontarlo del inventario** automáticamente.
- Costo real vs precio cobrado por OT (rentabilidad de cada trabajo).
- Imprimir/descargar la OT en PDF.

**4. Inventario diésel**
- Catálogo de repuestos (SKU, referencia OEM, categoría, ubicación en bodega).
- Entradas por compra (proveedor, factura, costo) y salidas a OT; **kárdex** por repuesto.
- Costo promedio ponderado, alertas de stock mínimo y listado de "qué pedir".
- Ajustes de inventario con motivo (conteo físico).

**5. Gestión de terceros (outsourcing)**
- Proveedores: laboratorios de inyección, rectificadoras, turbos, radiadores, electrónica.
- Envíos a tercero enlazados a una OT: qué se envió, fecha, entrega estimada, estado, costo,
  factura del proveedor y margen aplicado al cliente.
- Cuentas por pagar a proveedores y alertas de trabajos atrasados.

**6. Facturación electrónica DIAN**
- Generar la factura desde una OT entregada (sin volver a digitar nada).
- Configuración de resolución DIAN (prefijo, rango, vigencia) y alerta cuando se esté agotando.
- Integración con n8n usando los endpoints existentes; n8n arma el XML UBL 2.1, lo firma y lo
  envía. Si no tengo n8n listo, propón la alternativa más sencilla (proveedor tecnológico con API).
- Notas crédito, reenvío de rechazadas, y descarga de PDF/XML.
- Cuentas por cobrar: facturas pendientes de pago, abonos y cartera vencida.

**7. Finanzas (el dashboard actual, con datos reales)**
- KPIs, ingresos vs egresos, distribución de costos y estado de resultados calculados desde la
  base de datos.
- Registro de gastos generales (arriendo, servicios, nómina, herramientas) por categoría.
- Filtros por periodo, cliente, tipo de servicio y técnico.
- Exportar reportes a Excel.

**8. Configuración**
- Datos de la empresa, logo, IVA, precio de la hora de mano de obra, margen de terceros por defecto.
- Gestión de usuarios y roles.

### Reglas técnicas

- Todo en español, moneda COP, zona horaria America/Bogota.
- Usable en celular (los técnicos lo usarán en el taller).
- Migraciones SQL versionadas en `supabase/migrations/`; nunca editar una migración ya aplicada.
- Datos de prueba (seed) realistas para poder probar sin afectar datos reales.
- Validación con zod en formularios y en el servidor; Server Actions para escrituras.
- Pruebas automáticas de los cálculos de dinero (IVA, márgenes, costo promedio, P&L) y de los
  flujos principales.
- Secretos solo en variables de entorno; nada sensible en el código.
- Mantener funcionando el Dockerfile para desplegar en Coolify.

### Cómo quiero que trabajes

1. Primero hazme las preguntas que necesites sobre mi negocio (máximo 10, en lenguaje sencillo).
2. Propón un plan por **fases**, donde cada fase deje algo que ya pueda usar. Sugerencia:
   - Fase 1: acceso, roles, clientes, vehículos y OTs básicas con datos reales.
   - Fase 2: inventario conectado a las OTs y gestión de terceros.
   - Fase 3: cotizaciones y OTs en PDF, fotos, vista móvil del técnico.
   - Fase 4: facturación DIAN, cartera y cuentas por pagar.
   - Fase 5: dashboard financiero real, gastos, reportes y exportación a Excel.
3. Espera mi aprobación del plan antes de programar.
4. Al terminar cada fase: corre las pruebas y el build, haz commit, y explícame en pocas líneas
   qué puedo hacer ahora y cómo probarlo (sin jerga técnica).
5. Dime claramente qué necesito conseguir yo (cuentas, claves, certificado de firma digital,
   resolución DIAN, servidor) y en qué momento.

## FIN DEL PROMPT
