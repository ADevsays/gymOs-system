# GymOS — Documento de Arquitectura y SPEC v4.0

> Proyecto: **Gym AGOD** · Versión: 4.0 · Julio 2026  
> Stack: Nuxt 4 + Tauri v2 + SQLite + Tesseract.js (OCR-B MRZ)

---

## 1. ¿Qué es esta App? (Definición del Proyecto)

**GymOS es un software integral de administración y control para gimnasios.**
En términos simples: es el programa de computadora que utilizará el recepcionista o dueño del gimnasio todos los días para registrar rápidamente a los nuevos clientes cuando llegan, cobrarles sus mensualidades, llevar el control exacto de quién tiene la suscripción vencida, y consultar reportes y gráficas de cuánto dinero está generando el negocio.

| Elemento | Descripción |
| --- | --- |
| **Naturaleza de la App** | Aplicación de escritorio descargable (híbrida local) para la administración del gimnasio. |
| **Objetivo Principal** | Experiencia de usuario (UX) extremadamente fluida. Una facilidad "absurda" para operar, logrando que el usuario sienta que no puede trabajar sin ella. |
| **Registro de Usuarios** | Sumamente fácil y cómodo, capturando datos directamente de la cédula colombiana. |
| **Captura de Cédula** | El usuario conecta su móvil (mediante red local) a la app de escritorio para usarlo como cámara en tiempo real. |
| **Perfil del Usuario** | Datos base de la cédula, plan de gimnasio activo, fechas y montos pagados, tiempo de suscripción activa y ganancias totales generadas por el usuario. |
| **Métricas Claves** | Tasa de ganancia en diferentes meses por usuarios totales, tasa de cancelación (Churn rate) y qué plan genera más ingresos. |

---

## Changelog v3 → v4

| # | Cambio | Razón |
| --- | --- | --- |
| 1 | Actualización a Nuxt 4 | Adoptar las últimas mejoras de rendimiento y convenciones del framework. |
| 2 | Eliminación de Google Vision | La aplicación ahora es 100% offline mediante Tesseract.js, simplificando la arquitectura y configuraciones. |
| 3 | Inclusión de la Definición del Proyecto | Alinear el documento técnico con la visión y casos de uso principales de la aplicación. |
| 4 | Separación estricta Frontend/Backend | Migración completa a las convenciones de Nuxt 4, moviendo toda la lógica Nitro a `server/api` y `server/services` en la raíz (no dentro de `app/`). |
| 5 | Rediseño conceptual de Planes | Se separan la "Modalidad" (Individual/Grupal) y la "Promoción" (Temporal) en conceptos ortogonales no excluyentes para mayor flexibilidad comercial. |

---

## 1. Stack Definitivo

| Capa | Tecnología | Justificación |
| --- | --- | --- |
| **Shell escritorio** | Tauri v2 | ~5MB de overhead, sin Rust manual en este proyecto |
| **Frontend + Backend** | Nuxt 4 (Nitro embebido) | Un solo proceso, `server/api/` incluido, sin servidor extra |
| **ORM + DB** | Drizzle ORM + SQLite (`better-sqlite3`) | Local, un archivo, backup = copiar archivo |
| **OCR** | Tesseract.js + modelo OCR-B entrenado para MRZ | 100% offline, ~2-5MB, alta precisión en zona MRZ de documentos ICAO |
| **Parser MRZ** | paquete npm `mrz` + parser colombiano propio | `mrz` cubre el estándar ICAO; el parser propio aplica reglas específicas de la CC |
| **OCR opcional** | Google Cloud Vision API | Activable en Settings; fallback para imágenes muy degradadas |
| **WebRTC cámara** | Nitro WebSocket + WebRTC nativo del navegador | Sin librerías extra, relay de señalización en el propio servidor Nuxt |
| **Estilos** | Tailwind CSS + CSS custom properties (tokens) | Cambio de paleta en un solo archivo |
| **Estado** | Pinia | Nativo Nuxt 4 |
| **Gráficas** | Chart.js + vue-chartjs | Maduro, simple, sin dependencias de servidor |
| **Instalador** | Tauri Bundler | `.exe`, `.dmg`, `.AppImage` — peso total ~17-20MB |

### Por qué Tesseract.js con modelo OCR-B y no Tesseract.js genérico

Tesseract.js genérico tiene precisión del 70-80% en cédulas físicas con condiciones imperfectas. El problema específico de la zona MRZ es que usa la fuente **OCR-B** y solo 37 caracteres posibles (`A-Z`, `0-9`, `<`). Con un modelo entrenado específicamente para ese conjunto de caracteres y esa fuente, la precisión sube dramáticamente en los errores más comunes (confusión `0`/`O`, `1`/`I`, etc.).

Este modelo existe publicado para Tesseract y pesa pocos MB. Se incluye en el build de la app.

### Stack OCR — Flujo completo

```text
Imagen de cédula (frame WebRTC)
      ↓
Tesseract.js (modelo OCR-B entrenado para MRZ)
      ↓
texto MRZ crudo: "IDCOL1234567890<<<<<<<<<\n..."
      ↓
paquete `mrz` (parser ICAO genérico — npm, activo)
      ↓
{ surname, givenNames, documentNumber, birthDate, sex }
      ↓
parser colombiano propio (~50 líneas, basado en colombian_cedula_mrz_reader)
      ↓
{ cedula, firstName, lastName, birthDate, gender, ... }
```

Todo corre en Node.js dentro de Nitro. Sin internet, sin Python, sin binarios externos. El modelo OCR-B pesa ~2-5MB y se incluye en el build.

### Por qué NO Python/sidecar

Tauri soporta sidecars nativamente (PyInstaller → `externalBin` en `tauri.conf.json`), pero PaddleOCR compilado con PyInstaller genera un ejecutable de 400MB–1.5GB dependiendo de si incluye los modelos. Inaceptable para un instalador de gimnasio.

---

## 2. Sistema de Tokens de Color — Fácil de Cambiar

Toda la identidad visual se define en **un solo archivo**: `assets/css/tokens.css`.  
Para cambiar la paleta completa del sistema = editar ese archivo.

```css
/* assets/css/tokens.css */
/* ─── PALETA AGOD (valores actuales) ─── */
:root {
  /* Colores base */
  --color-bg:          #0D0D0D;
  --color-surface:     #1A1A1A;
  --color-surface-2:   #242424;
  --color-border:      #2E2E2E;

  /* Acento primario — el rojo AGOD */
  --color-accent:      #CC1414;
  --color-accent-soft: #FF2222;
  --color-accent-dim:  #7A0A0A;

  /* Acento secundario — plata del logo */
  --color-silver:      #B0B0B0;
  --color-silver-dim:  #707070;

  /* Texto */
  --color-text:        #F0F0F0;
  --color-muted:       #888888;

  /* Semánticos */
  --color-success:     #22C55E;
  --color-warning:     #F59E0B;
  --color-danger:      #EF4444;
  --color-info:        #3B82F6;

  /* Tipografía */
  --font-display:      'Space Grotesk', sans-serif;
  --font-body:         'Inter', sans-serif;
  --font-mono:         'JetBrains Mono', monospace;

  /* Espaciado base */
  --sidebar-width:     260px;
  --panel-width:       300px;
  --radius:            10px;
  --radius-sm:         6px;
}
```

---

## 2.1 Doctrina Universal de Componetización y DRY en UI (Regla Obligatoria para Agentes)

> **PRINCIPIO ARQUITECTÓNICO FUNDAMENTAL:**  
> Ningún desarrollador o agente debe escribir marcado HTML ad-hoc ni duplicar estructuras visuales sin antes evaluar la reusabilidad.  
> **Antes de crear CUALQUIER elemento o estructura HTML en cualquier vista, sección, modal o pantalla, el agente SIEMPRE DEBE hacerse estas dos preguntas:**
>
> 1. **¿Ya existe algo similar?**  
>    Inspeccionar siempre `app/ui/components/` y los componentes de módulos existentes. Si ya existe un componente o patrón que resuelva la necesidad, DEBE reutilizarse obligatoriamente.
> 2. **¿Es algo lo suficientemente copiable como para componetizarlo?**  
>    Si un patrón visual, contenedor, tarjeta, control, badge, zona de entrada o bloque de interacción se repite (o tiene alta probabilidad de repetirse en dos o más lugares), **queda prohibido escribirlo como HTML inline repetido**. Debe componetizarse de inmediato como un componente reutilizable, agnóstico y limpio.

### Clasificación y Ubicación de Componentes

- **Componentes Globales Agnósticos (`app/ui/components/`):**  
  Todo control, contenedor, botón, campo de formulario, modal o widget base que no dependa de la lógica interna de un único módulo. Ejemplos: `AppInput.vue`, `AppSelect.vue`, `AppLayout.vue`, `SidebarNav.vue`, `ImagePreviewModal.vue`. Disponibles con auto-import global en Nuxt.
- **Componentes de Módulo (`app/modules/<feature>/components/`):**  
  Componentes específicos del dominio de negocio del feature (ej: `ProductCard.vue` en inventario, `PlanCard.vue` en planes, `PaymentHistory.vue` en miembros).

### Estándar Único de Formularios e Inputs (UI Form System)

> **REGLA ESTRICTA DE FORMULARIOS:** Queda terminantemente prohibido crear elementos nativos `<input>`, `<textarea>`, `<select>` o estructuras ad-hoc de labels y envolturas (`.field-group`) dentro de los formularios y modales de las páginas.
> Todo formulario de cualquier pantalla (`/cash`, `/inventory`, `/plans`, `/members`, `/register`) debe consumir obligatoriamente los componentes canónicos de `app/ui/components/`:
>
> - `AppInput.vue`: Maneja inputs de texto, numéricos, fechas, teléfonos, emails y áreas de texto multilínea (`type="textarea"`).
> - `AppSelect.vue`: Maneja selectores y menús desplegables.

#### Anatomía de la Zona de Input Unificada (`Input Zone`)

1. **Contenedor:** `flex flex-col gap-1 w-full`.
2. **Label Superior:** Tipografía `text-xs font-semibold text-muted uppercase tracking-wide`. Si el campo es obligatorio (`required`), incluye un asterisco `*` en color acento (`text-accent font-bold`).
3. **Elemento de Entrada:**
   - Fondo: `bg-surface-2`
   - Borde: `border border-border`
   - Texto: `text-text` (o `font-mono` cuando aplique para importes, códigos o stock)
   - Espaciado: `px-3.5 py-2.5 rounded-xl text-xs lg:text-sm`
   - Foco: `outline-none focus:border-accent transition-colors duration-150`
   - Deshabilitado: `disabled:opacity-50 disabled:cursor-not-allowed`
4. **Mensaje Inferior:** Soporte unificado para errores de validación (`text-[11px] text-danger font-medium`) o notas de ayuda (`text-[11px] text-muted`).

---

## 3. Layout del Sistema

Basado en la imagen de referencia: sidebar fijo izquierdo + área principal + panel de detalle derecho.

```text
┌──────┬─────────────────────────────────┬──────────────┐
│      │                                 │              │
│ Nav  │     Área principal              │   Panel de   │
│ Icon │     (dashboard / lista /        │   detalle    │
│ Bar  │      métricas)                  │   (perfil /  │
│  48px│                                 │    contexto) │
│      │  ┌──────────────────────────┐   │   300px      │
│      │  │ Header de sección        │   │              │
│      │  ├──────────────────────────┤   │              │
│      │  │ Widgets / Tabla / Gráfica│   │              │
│      │  └──────────────────────────┘   │              │
└──────┴─────────────────────────────────┴──────────────┘
  48px   sidebar 260px   flex-1              300px
```

El panel derecho es contextual: en el Dashboard muestra el miembro más reciente; en la lista de miembros muestra el perfil del seleccionado; en métricas muestra el detalle del plan seleccionado.

---

## 4. Estructura de Directorios (Feature-Based Modular)

```text
gymos/                              ← Raíz del monorepo
│
├── src-tauri/                      ← Shell Tauri (boilerplate, no tocar)
│   ├── src/main.rs
│   └── tauri.conf.json
│
└── nuxt-app/                       ← Todo el proyecto Nuxt
    │
    ├── pages/                      ← File-based routing de Nuxt
    │   ├── index.vue               → Dashboard
    │   ├── members/
    │   │   ├── index.vue           → Lista de miembros
    │   │   ├── new.vue             → Flujo de registro
    │   │   └── [id].vue           → Perfil del miembro
    │   ├── plans/
    │   │   └── index.vue
    │   ├── metrics/
    │   │   └── index.vue
    │   └── settings/
    │       └── index.vue
    │
    ├── modules/                    ← Features del negocio
    │   │
    │   ├── dashboard/
    │   │   ├── components/
    │   │   │   ├── StatWidget.vue
    │   │   │   ├── RecentActivity.vue
    │   │   │   └── ExpiringList.vue
    │   │   ├── composables/
    │   │   │   └── useDashboard.ts
    │   │   ├── sections/
    │   │   │   └── WidgetRow.vue
    │   │   └── views/
    │   │       └── View.vue
    │   │
    │   ├── members/
    │   │   ├── components/
    │   │   │   ├── MemberRow.vue
    │   │   │   ├── MemberCard.vue
    │   │   │   ├── SubscriptionBadge.vue
    │   │   │   ├── PaymentHistory.vue
    │   │   │   └── LifetimeValue.vue
    │   │   ├── composables/
    │   │   │   ├── useMembers.ts
    │   │   │   └── useSubscription.ts
    │   │   ├── server/
    │   │   │   ├── api/
    │   │   │   │   ├── index.get.ts
    │   │   │   │   ├── index.post.ts
    │   │   │   │   ├── [id].get.ts
    │   │   │   │   ├── [id].put.ts
    │   │   │   │   └── [id].delete.ts
    │   │   │   └── services/
    │   │   │       └── memberService.ts
    │   │   ├── sections/
    │   │   │   ├── MemberListSection.vue
    │   │   │   └── MemberDetailPanel.vue
    │   │   ├── store/
    │   │   │   └── members.ts
    │   │   ├── types/
    │   │   │   └── index.ts
    │   │   └── views/
    │   │       ├── ListView.vue
    │   │       ├── NewView.vue
    │   │       └── ProfileView.vue
    │   │
    │   ├── register/                       ← Flujo de registro con cédula
    │   │   ├── components/
    │   │   │   ├── QRConnect.vue           # Muestra QR para conectar móvil
    │   │   │   ├── CamStream.vue           # Video WebRTC en tiempo real
    │   │   │   ├── CaptureOverlay.vue      # Overlay de detección de cédula
    │   │   │   ├── OcrResultForm.vue       # Formulario pre-llenado con OCR
    │   │   │   └── ConfidenceBadge.vue     # Indicador de confianza por campo
    │   │   ├── composables/
    │   │   │   ├── useCam.ts               # Cliente WebRTC (peer connection)
    │   │   │   └── useOcr.ts               # Llama /api/ocr, parsea resultado
    │   │   ├── server/
    │   │   │   ├── api/
    │   │   │   │   └── ocr.post.ts         # POST /api/ocr — OCR offline
    │   │   │   ├── services/
    │   │   │   │   ├── tesseractOcr.ts     # Wrapper Tesseract.js con modelo OCR-B
    │   │   │   │   └── cedulaParser.ts     # mrz (npm) + parser colombiano propio
    │   │   │   └── utils/
    │   │   │       └── mrzUtils.ts         # Helpers: recorte zona MRZ, validación checkdigit
    │   │   ├── sections/
    │   │   │   ├── StepCamera.vue          # Paso 1: conectar móvil + capturar
    │   │   │   ├── StepReview.vue          # Paso 2: revisar datos OCR
    │   │   │   └── StepPlan.vue            # Paso 3: seleccionar plan y pagar
    │   │   ├── const/
    │   │   │   └── steps.ts
    │   │   └── views/
    │   │       └── RegisterView.vue        # Wizard de 3 pasos
    │   │
    │   ├── plans/
    │   │   ├── components/
    │   │   │   ├── PlanCard.vue
    │   │   │   └── PlanForm.vue
    │   │   ├── composables/
    │   │   │   └── usePlans.ts
    │   │   ├── server/
    │   │   │   ├── api/
    │   │   │   │   ├── index.get.ts
    │   │   │   │   ├── index.post.ts
    │   │   │   │   └── [id].put.ts
    │   │   │   └── services/
    │   │   │       └── planService.ts
    │   │   ├── types/
    │   │   │   └── index.ts
    │   │   └── views/
    │   │       └── PlansView.vue
    │   │
    │   ├── metrics/
    │   │   ├── components/
    │   │   │   ├── RevenueChart.vue
    │   │   │   ├── ChurnChart.vue
    │   │   │   ├── PlanPieChart.vue
    │   │   │   └── LtvStat.vue
    │   │   ├── composables/
    │   │   │   └── useMetrics.ts
    │   │   ├── server/
    │   │   │   ├── api/
    │   │   │   │   ├── revenue.get.ts
    │   │   │   │   ├── churn.get.ts
    │   │   │   │   ├── plans.get.ts
    │   │   │   │   └── ltv.get.ts
    │   │   │   └── services/
    │   │   │       └── metricsService.ts
    │   │   └── views/
    │   │       └── MetricsView.vue
    │   │
    │   └── settings/
    │       ├── components/
    │       │   ├── GymProfileForm.vue
    │       │   ├── BackupPanel.vue
    │       │   └── ThresholdConfig.vue
    │       ├── server/
    │       │   └── api/
    │       │       ├── config.get.ts
    │       │       └── config.put.ts
    │       └── views/
    │           └── SettingsView.vue
    │
    ├── ui/                                 ← Componentes UI agnósticos globales
    │   ├── components/
    │   │   ├── AppLayout.vue
    │   │   ├── SidebarNav.vue
    │   │   ├── AppInput.vue                # Input, textarea y zona de campo unificada
    │   │   ├── AppSelect.vue               # Selector y dropdown unificado
    │   │   ├── PageHeader.vue
    │   │   ├── DataTable.vue
    │   │   ├── StatusBadge.vue
    │   │   ├── StatCard.vue
    │   │   ├── ConfirmDialog.vue
    │   │   ├── ToastUndo.vue
    │   │   ├── EmptyState.vue
    │   │   └── CommandPalette.vue
    │   └── sections/
    │       └── RightPanel.vue
    │
    ├── composables/
    │   ├── useApi.ts
    │   ├── useCommandPalette.ts
    │   └── useToast.ts
    │
    ├── server/
    │   ├── lib/
    │   │   └── db.ts
    │   ├── services/
    │   │   └── migrationRunner.ts
    │   ├── utils/
    │   │   └── apiResponse.ts
    │   └── const/
    │       └── errors.ts
    │
    ├── assets/
    │   ├── css/
    │   │   ├── tokens.css
    │   │   └── main.css
    │   └── models/
    │       └── tessdata/
    │           └── ocrb.traineddata       # Modelo OCR-B para Tesseract (~2-5MB)
    │
    ├── const/
    │   └── plans.ts
    │
    ├── utils/
    │   ├── formatCurrency.ts
    │   ├── formatDate.ts
    │   └── calcAge.ts
    │
    ├── public/
    │   └── cam/
    │       └── index.html                  # Página HTML mínima para el móvil (cámara)
    │
    ├── nuxt.config.ts
    ├── tailwind.config.ts
    └── drizzle/
        ├── schema.ts
        └── migrations/
```

---

## 5. Schema de Base de Datos

```typescript
// drizzle/schema.ts
import { sqliteTable, integer, text, real, sql } from 'drizzle-orm/sqlite-core';

export const plans = sqliteTable('plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  price: real('price').notNull(),
  durationDays: integer('duration_days').notNull(),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const members = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cedula: text('cedula').unique().notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  birthDate: text('birth_date'),
  gender: text('gender'),                   // 'M' | 'F'
  bloodType: text('blood_type'),

  phone: text('phone'),
  email: text('email'),
  photoPath: text('photo_path'),
  cedulaFrontPath: text('cedula_front_path'),
  notes: text('notes'),
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').notNull().references(() => members.id),
  planId: integer('plan_id').notNull().references(() => plans.id),
  planName: text('plan_name').notNull(),
  planPrice: real('plan_price').notNull(),  // Snapshot del precio al crear (RN-06)
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').notNull().references(() => members.id),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id),
  amount: real('amount').notNull(),         // Negativo = ajuste/devolución
  method: text('method').notNull().default('cash'),
  paidAt: text('paid_at').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const gymConfig = sqliteTable('gym_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  // Claves: gym_name, gym_logo, expiry_warning_days, churn_threshold_days,
  //         backup_path, pin_hash
});

export const productCategories = sqliteTable('product_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  color: text('color'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  categoryId: integer('category_id').references(() => productCategories.id),
  category: text('category').notNull().default('bebidas'),
  price: real('price').notNull(),
  cost: real('cost').default(0),
  stock: integer('stock').notNull().default(0),
  minStock: integer('min_stock').default(5),
  photoPath: text('photo_path'),
  barcode: text('barcode'),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const cashRegisters = sqliteTable('cash_registers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  openedAt: text('opened_at').notNull(),
  closedAt: text('closed_at'),
  openingBalance: real('opening_balance').notNull().default(0),
  closingBalance: real('closing_balance'),
  expectedCash: real('expected_cash'),
  difference: real('difference'),
  status: text('status').notNull().default('open'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const cashMovements = sqliteTable('cash_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cashRegisterId: integer('cash_register_id').references(() => cashRegisters.id),
  type: text('type').notNull(), // 'income' | 'expense'
  category: text('category').notNull(), // 'membership' | 'product' | 'sporadic' | 'expense'
  concept: text('concept').notNull(),
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method').notNull().default('cash'),
  memberId: integer('member_id').references(() => members.id),
  customerName: text('customer_name'),
  paymentId: integer('payment_id').references(() => payments.id),
  receiptPath: text('receipt_path'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cashMovementId: integer('cash_movement_id').notNull().references(() => cashMovements.id),
  productId: integer('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  subtotal: real('subtotal').notNull(),
});
```

---

## 6. Flujo de OCR Offline — Detalle de Implementación

### Endpoint principal: `modules/register/server/api/ocr.post.ts`

```typescript
export default defineEventHandler(async (event) => {
  const { imageBase64 } = await readBody(event);

  const rawText = await runTesseractMRZ(imageBase64);
  const parsed = parseCedulaColombia(rawText);

  return { success: true, data: parsed, source: 'tesseract' };
});
```

### Wrapper Tesseract: `modules/register/server/services/tesseractOcr.ts`

```typescript
import Tesseract from 'tesseract.js';
import { join } from 'path';

const MODEL_PATH = join(process.cwd(), 'assets/models/tessdata');

export async function runTesseractMRZ(imageBase64: string): Promise<string> {
  const { data } = await Tesseract.recognize(
    Buffer.from(imageBase64, 'base64'),
    'ocrb',
    {
      langPath: MODEL_PATH,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
      tessedit_pageseg_mode: '6',
    }
  );
  return data.text;
}
```

### Parser de Cédula: `modules/register/server/services/cedulaParser.ts`

```typescript
import { parse } from 'mrz';

interface CedulaData {
  cedula: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;   // YYYY-MM-DD
  gender: 'M' | 'F' | null;
  bloodType: string | null;

  confidence: {
    cedula: number;
    firstName: number;
    lastName: number;
    birthDate: number;
    overall: number;
  };
}

export function parseCedulaColombia(rawText: string): CedulaData {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const mrzLines = lines.filter(l => /^[A-Z0-9<]{28,30}$/.test(l));

  if (mrzLines.length >= 2) {
    return parseMRZWithLib(mrzLines);
  }

  return parseVisualZone(lines);
}

function parseMRZWithLib(lines: string[]): CedulaData {
  const result = parse(lines);

  const cedula = result.fields.documentNumber?.replace(/</g, '').trim() ?? '';
  const lastName = result.fields.lastName?.replace(/</g, ' ').trim() ?? '';
  const firstName = result.fields.firstName?.replace(/</g, ' ').trim() ?? '';

  const confidence = {
    cedula: result.valid ? 0.95 : 0.7,
    firstName: result.valid ? 0.9 : 0.65,
    lastName: result.valid ? 0.9 : 0.65,
    birthDate: result.valid ? 0.95 : 0.7,
    overall: result.valid ? 0.92 : 0.67,
  };

  return {
    cedula,
    firstName,
    lastName,
    birthDate: formatMRZDate(result.fields.birthDate),
    gender: result.fields.sex === 'M' ? 'M' : 'F',
    bloodType: null,

    confidence,
  };
}

function formatMRZDate(mrzDate: string | null | undefined): string | null {
  if (!mrzDate) return null;
  const yy = parseInt(mrzDate.slice(0, 2));
  const fullYear = yy > 30 ? 1900 + yy : 2000 + yy;
  return `${fullYear}-${mrzDate.slice(2, 4)}-${mrzDate.slice(4, 6)}`;
}
```

---

## 7. Flujo WebRTC Cámara Móvil

La página del móvil vive en `public/cam/index.html` — HTML puro, sin dependencias, sin build. Funciona en cualquier navegador móvil moderno.

```text
SETUP:
1. App desktop abre /cam?session=UUID                  → genera token UUID v4
2. App desktop suscribe a WS: /api/cam-signal/[UUID]
3. Desktop muestra QR con URL: http://[LAN-IP]:3000/cam?s=UUID

CONEXIÓN:
4. Operador escanea QR con móvil
5. Móvil carga /cam/index.html?s=UUID
6. Móvil conecta al mismo WS /api/cam-signal/UUID
7. WebRTC handshake via WS relay:
   - Móvil crea offer SDP → WS → Desktop
   - Desktop responde answer SDP → WS → Móvil
   - Ambos intercambian ICE candidates → WS → otro peer
8. Video stream directo Móvil → Desktop (peer-to-peer en LAN)

CAPTURA:
9.  Desktop recibe frames via RTCPeerConnection
10. Canvas 2D detecta rectángulo con relación ~1.585 (formato CC)
11. Frame estable >1s → captura automática
12. Sino en 5s → botón manual
13. Frame capturado → POST /api/ocr → Tesseract OCR-B → parseCedulaColombia
```

Endpoint WebSocket Nitro: `server/api/cam-signal/[session].ts` — relay simple entre los dos peers.

---

## 8. Reglas de Negocio (consolidadas)

| # | Regla |
| --- | --- |
| RN-01 | La cédula es identificador único. No duplicados. |
| RN-02 | Un miembro tiene máximo una suscripción `status: 'active'` simultánea. |
| RN-03 | Renovación: `startDate = max(endDateAnterior + 1 día, hoy)`. Nunca se pierde tiempo pagado. |
| RN-04 | Pagos son inmutables. Devolución = pago negativo con nota. |
| RN-05 | Plan desactivado no aparece en selector de nuevas suscripciones. |
| RN-06 | `planName` y `planPrice` se guardan en la suscripción al crearla (snapshot). Las métricas históricas usan ese valor, no el precio actual del plan. |
| RN-07 | Archivar un miembro es soft delete: `isArchived = true`. No aparece en búsquedas por defecto. Sus datos y métricas se conservan. |
| RN-08 | Churn: miembro con suscripción vencida hace más de `churn_threshold_days` (config, default 15) sin renovar. |
| RN-09 | Churn rate = `(churned en período / activos al inicio) × 100`. |
| RN-10 | Sesión de cámara expira a los 10 minutos. |
| RN-11 | Si Tesseract no supera confianza del 75% → formulario con campos en amarillo + banner "OCR con baja confianza — revisa los datos". El flujo no se interrumpe. |
| RN-12 | Backup automático: copia fechada del `.db` en ruta configurada. Retiene 30 copias. |
| RN-13 | **Modalidad de Planes**: Un plan es por defecto individual, pero puede configurarse como grupal requiriendo un mínimo estricto de 2 miembros (`maxMembers >= 2`). |
| RN-14 | **Planes Promocionales**: Cualquier plan (individual o grupal) puede marcarse como temporalmente en promoción, añadiendo una fecha límite opcional (`validUntil`). |
| RN-15 | **Arqueo de Caja**: Solo puede haber una sesión de caja activa (`status: 'open'`) simultánea. Los movimientos de venta, cobro esporádico o gasto requieren caja abierta. |
| RN-16 | **Unificación de Movimientos**: Las partidas agregadas en el modal unificado de caja se persisten transaccionalmente clasificadas por tipo (`product`, `sporadic`, `expense`), impactando automáticamente el stock de productos y el saldo esperado de caja. |

---

## 9. API Endpoints (Nitro / Nuxt server/api)

```text
# Miembros
GET    /api/members              ?q=&page=&archived=false
POST   /api/members
GET    /api/members/:id          → perfil + suscripción activa + totales
PUT    /api/members/:id
DELETE /api/members/:id          → soft delete (isArchived = true)

# Suscripciones
POST   /api/subscriptions        → nueva o renovación
GET    /api/subscriptions/expiring?days=7

# Pagos
POST   /api/payments
GET    /api/payments/member/:id

# Planes
GET    /api/plans
POST   /api/plans
PUT    /api/plans/:id
DELETE /api/plans/:id            → desactivar

# Inventario de Productos
GET    /api/products             ?category=&q=&lowStock=
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
POST   /api/products/:id/stock-adjust
GET    /api/products/stats

# Categorías de Productos (Base de Datos Normalizada)
GET    /api/categories           → listado con productCount
POST   /api/categories           → crear categoría con slug automático
PUT    /api/categories/:id       → actualizar nombre/slug
DELETE /api/categories/:id       → eliminar (protección referencial)

# Caja y Flujo Diario
GET    /api/cash/session         → sesión activa de caja y balance
POST   /api/cash/open            → apertura de caja
POST   /api/cash/close           → cierre y arqueo de caja
GET    /api/cash/movements       ?period=daily|weekly|monthly
POST   /api/cash/sale            → registro de venta de productos e impacto en stock
POST   /api/cash/sporadic        → cobros esporádicos a no miembros
POST   /api/cash/expense         → egresos / gastos operativos
DELETE /api/cash/movement/:id    → anular movimiento con reversión automática de stock
PUT    /api/cash/movement/:id    → editar datos de movimiento (monto, concepto, método de pago, cliente)
GET    /api/cash/history         → histórico de cierres diarios

# OCR
POST   /api/ocr                  → Tesseract OCR-B offline

# Métricas
GET    /api/metrics/revenue?year=&planId=
GET    /api/metrics/churn?months=12
GET    /api/metrics/plans
GET    /api/metrics/ltv

# Configuración
GET    /api/config
PUT    /api/config

# WebSocket cámara
WS     /api/cam-signal/:session  → relay WebRTC signaling
```

---

## 10. UX — Principios no Negociables

1. **`Ctrl+K` en todo momento** — command palette que busca miembros y navega a cualquier sección.
2. **Tab + Enter completa el flujo de registro** — sin mouse obligatorio.
3. **Campos OCR de baja confianza** en amarillo con valor original en tooltip. El operador ve exactamente qué revisar.
4. **Toast con deshacer** (5 segundos) para creaciones y ediciones. Sin confirmaciones para acciones no destructivas.
5. **Pantallas vacías accionables** — nunca "No hay datos", siempre "Registra tu primer miembro →".
6. **Barra de días restantes** en cada perfil: verde → amarillo (<7 días) → rojo (vencido).
7. **El panel derecho actualiza** al seleccionar cualquier miembro en la lista. Sin navegación extra.
8. **Animación de odómetro** en los números grandes del dashboard — un solo efecto visual, todo lo demás quieto.
9. **Formulario de revisión claro**: Si el OCR tuvo baja confianza, muestra alertas visuales directas al operador.
10. **Modal Unificado de Movimientos de Caja**: En lugar de forzar al usuario a decidir a priori entre modales separados (Venta, Cobro, Gasto), se utiliza un único modal omnibox con buscador inteligente, clasificación automática de signo (+/-), chips de sugerencias rápidas, partidas acumulativas y balance neto en vivo.
11. **Doctrina de Modales y Resiliencia de Datos (`AppModal`)**: Todos los modales de la aplicación deben utilizar el componente base universal `<AppModal>`. Si el operador hace clic fuera del modal (backdrop) o presiona `Esc`, el modal se cierra visualmente pero **el borrador y los datos ingresados se preservan intactos**. Los datos únicamente se reinician a cero si se hace clic explícitamente en la 'X' (`@dismiss`) o en el botón Cancelar.
12. **Prohibición de Presets Falsos (Zero Mock Data)**: Ningún modal, buscador o componente de formulario debe contener listas o arreglos hardcodeados de conceptos o precios inventados (ej. `servicePresets`, `expensePresets`). Todas las opciones y sugerencias deben provenir de la base de datos real (tablas `products`, `plans`, etc.) o de entradas libres del usuario.
13. **Integridad y Reversión en Caja**: Los movimientos de caja registrados pueden ser editados o anulados directamente desde la lista de movimientos del turno. Si se anula una venta de productos, el sistema restituye automáticamente el stock vendido al inventario físico mediante transacciones atómicas de base de datos.

---

## 11. Experiencia de Instalación

### El instalador hace todo

```text
GymOS-Setup.exe (Windows) / GymOS.dmg (macOS) / GymOS.AppImage (Linux)
  ↓
1. Instala la app (~17-20MB total)
2. Crea ~/GymOS/data/ para DB y archivos adjuntos
3. Corre migraciones iniciales (crea las tablas)
4. Abre la app → pantalla de bienvenida "Configura tu gimnasio"
   - Nombre del gimnasio
   - Preferencias básicas
5. Listo. El usuario ya puede registrar su primer miembro.
```

**Peso estimado del instalador:**

- Tauri runtime: ~5MB
- Nuxt app buildeada (Nitro output): ~8-10MB
- Modelo OCR-B (Tesseract traineddata): ~2-5MB
- Assets y fuentes: ~2MB
- **Total comprimido: ~17-20MB**

> **Nota:** El shell vacío de Tauri sin app adentro pesa ~3-5MB. El número relevante para el usuario es el instalador completo: ~17-20MB, que es perfectamente razonable.

### Actualizaciones

Tauri Updater verifica al arrancar contra un endpoint configurable. Si hay update disponible → banner no intrusivo abajo. Las migraciones de DB corren automáticamente. El usuario no hace nada.

---

## 12. Checklist de Desarrollo

### Fase 0 — Scaffold (3-4 días)

- [ ] Monorepo: `src-tauri/` + `nuxt-app/`
- [ ] Nuxt 4 configurado, corre en dev
- [ ] Tauri apunta a `http://localhost:3000`
- [ ] Drizzle + SQLite conectado
- [ ] Primera migración (todas las tablas)
- [ ] `tokens.css` con paleta AGOD
- [ ] Layout base: `AppLayout.vue` + `SidebarNav.vue` + `RightPanel.vue`

### Fase 1 — Registro (1.5 semanas)

- [ ] Formulario de registro manual completo
- [ ] WebRTC: QR → móvil → stream en desktop
- [ ] `tesseractOcr.ts` — Tesseract.js con modelo OCR-B
- [ ] `cedulaParser.ts` — paquete `mrz` + parser colombiano propio
- [ ] Endpoint `/api/ocr` con lógica local offline
- [ ] Formulario pre-llenado con badges de confianza + badge de fuente
- [ ] Wizard 3 pasos: Cámara → Revisión → Plan/Pago
- [ ] RN-01 a RN-04 implementadas

### Fase 2 — Perfiles y lista (1 semana)

- [ ] Vista de lista con búsqueda y paginación
- [ ] Panel derecho con perfil al seleccionar
- [ ] Vista de perfil completa con historial y LTV
- [ ] Badge de estado + barra de días restantes
- [ ] Renovación desde el perfil
- [ ] Command palette `Ctrl+K`

### Fase 3 — Dashboard y planes (4-5 días)

- [ ] Dashboard con widgets y lista de vencimientos
- [ ] CRUD de planes con validaciones
- [ ] Toast con deshacer
- [ ] Pantallas vacías accionables

### Fase 4 — Métricas (1 semana)

- [ ] Ingresos por mes (Chart.js barras)
- [ ] Churn rate mensual (línea)
- [ ] Rentabilidad por plan (dona + tabla)
- [ ] LTV promedio

### Fase 5 — Ajustes y distribución (4-5 días)

- [ ] Página de settings completa
- [ ] Backup automático
- [ ] Tauri build → instaladores los 3 OS
- [ ] Pantalla de bienvenida (onboarding)
- [ ] Tests de integración: registro, renovación, cálculo de churn

---

## 13. Expansión a Futuro

La arquitectura feature-based permite agregar módulos sin tocar los existentes:

| Versión | Módulo nuevo | Impacto en existente |
| --- | --- | --- |
| v1.1 | `modules/notifications/` — WhatsApp de renovación | Ninguno |
| v1.2 | `modules/products/` — Venta de suplementos/accesorios | Solo agrega tabla `products` y `product_sales` |
| v2.0 | Sincronización cloud (Turso en lugar de SQLite local) | Drizzle soporta Turso con cambio de 3 líneas en `server/lib/db.ts` |
| v2.1 | Módulo `locations` — multi-sede | Agregar `locationId` a `members` y `subscriptions` |
| v3.0 | Multi-tenant SaaS | Nitro puede deployarse en Cloudflare Workers sin cambios en rutas |

---

*GymOS para Gym AGOD — Rojo, oscuro, rápido. Como debe ser.*
