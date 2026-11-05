# Bitácora del Proyecto (Logs & Sesiones)

## Sesión: 14 de Julio de 2026

### Resoluciones de Tipado (TypeScript)
- Se corrigió el error `ts(2322)` y `ts(2740)` del paquete `heic-convert`. El buffer binario nativo de Node.js ahora se transfiere explícitamente a un `Uint8Array` respetando los márgenes de memoria (`byteOffset` y `byteLength`), para eliminar los avisos de métodos deprecados de la clase Buffer.
- Se resolvió el error estricto de nulos en `cedulaParser.ts` asegurando el chequeo de longitud del array `mrzLines` y usando aserciones correctas (`!`).
- El código ahora compila limpiamente (cero errores usando `npx tsc --noEmit`).

### Lógica de Extracción (OCR y MRZ)
- **Extracción real de Cédula:** Se identificó que el número de cédula real (NUIP) de Colombia no está en el campo estándar `documentNumber` de la línea 1 (que guarda un número de serie interno), sino que está incrustado en el campo *optional data* de la **Línea 2, posiciones 19–29**. Se creó un parser personalizado (`extractNuip`) para apuntar a esta zona.
- **Tolerancia a fallos de Tesseract:** Para evitar que el paquete `mrz` se rompa con la excepción *"unrecognized document format..."* si el OCR se salta un `<` al final de la línea, se implementó un relleno (`padEnd(30, '<')`) y truncado que fuerza a las líneas a medir exactamente 30 caracteres, cumpliendo el estándar ID1.
- **Fechas en UI:** Se corrigió el formato de la `birthDate` de `DD/MM/YYYY` (legible por humanos) al formato estándar ISO `YYYY-MM-DD`, permitiendo que Vue autocompleta con éxito la etiqueta nativa `<input type="date">`.

### Unificación de Experiencia de Cámara (UX)
- Se descartó el modelo doble ("Escáner Automático" vs "Subir Foto Nativa").
- Se diseñó un **punto intermedio perfecto**: la inmediatez de encendido de la cámara web combinada con la decisión manual de captura del usuario.
  - El PC ahora muestra un único código QR.
  - Al escanear, el móvil abre la cámara de inmediato (`getUserMedia`).
  - El usuario encuadra a su ritmo y pulsa un botón de captura en pantalla.
  - El servidor evalúa la foto instantáneamente en el endpoint `/api/cam-signal`. Si falla la lectura, el móvil se lo informa al usuario y le permite reintentar enseguida. Si acierta, envía señal verde y el PC recoge los datos listos.
- **Fix de Mobile Viewport:** Se reescribió el layout del `index.html` de la cámara utilizando un diseño puro en capas (absoluto y `z-index`). El video ahora funciona como un "fondo de pantalla" y los controles flotan encima de él, impidiendo que el video desplace el botón de captura fuera de la pantalla por debajo de las barras de los navegadores móviles (Safari/Brave).

## Sesión: 15 de Julio de 2026 (Rediseño UI/UX y Zero-Friction)

### Rediseño Arquitectónico del Registro ("Zero Friction")
- **Panel Unificado:** Se eliminó el wizard fragmentado de 3 pasos (`StepCamera`, `StepReview`, `StepPlan`) reemplazándolo por una única vista de registro de dos columnas. El usuario no sufre fricción para llenar campos; puede usar teclado o esperar al escáner OCR, que llena los datos de inmediato con una animación de auto-escritura.
- **Limpieza de Datos de Entrada:** Se simplificó la base de datos y la interfaz removiendo *Fecha de Expedición* y *Lugar de Expedición* (aportaban fricción innecesaria). Además, se retiró el *Teléfono* y *Email* del proceso de registro inicial para solicitarlos a posteriori, minimizando la barrera de entrada.
- **Mejora de UX (Tipo de Sangre):** Integrado nativamente debajo de Datos Personales usando chips (botones) apaisados en formato fila. Combina máxima velocidad de clic y visibilidad.

### Branding & UI Premium (Gym AGOD)
- **Tema Oscuro:** Transición a la estética "Gym AGOD" implementando tokens de color oscuros/rojos e inyectando las fuentes *Oswald* (display) y *Chakra Petch* (body).
- **Rediseño de Cámara Móvil:** Se adaptó `public/cam/index.html` para respetar la paleta oscura/industrial. Se implementó un estado final de éxito limpio ("¡Escáner Listo!"), que apaga la cámara, bloquea la pantalla y redirige la atención al PC.
- **Estricto Español:** Se consolidó en `SPEC.md` la regla obligatoria de usar español en toda la interfaz de usuario.

## Sesión: 24-25 de Julio de 2026 (Estabilización OCR, Resiliencia y Máquina de Estados)

### Resiliencia y Timeout Protector en OCR
- **Timeout Protector:** Se envolvió el pipeline de OCR (`extractTextFromImage`) en un wrapper con `Promise.race` y un timeout estricto de 25 segundos para evitar que peticiones ilegibles o bloqueos de Tesseract dejen al móvil en espera infinita.
- **Recuperación de Worker:** Si la inicialización de Tesseract o una pasada de reconocimiento arroja un error o timeout, la instancia global del worker se limpia (`workerInstance = null`), garantizando que la siguiente toma instancie un nuevo worker limpio sin colapsar el proceso Nitro.

### Mejoras de Lectura y Parseo en Cédulas Amarillas
- **Recorte Enfocado Doble (`focusedSurnameText` / `focusedNameText`):** Se crearon crops específicos con Sharp para la franja de apellidos y nombres en la cédula amarilla, aplicando binarización y afilado de bordes para superar la interferencia de hologramas y firmas.
- **Normalización de Nombres Incompletos (`selectCompleteName`):** Se implementó un algoritmo heurístico que compara palabras entre las distintas pasadas OCR para reconstruir caracteres iniciales/finales perdidos por destellos (ej. "JUAN" vs "UAN").
- **Robustez en Fecha y Tipo de Sangre (Reverso):**
  - Se agregó pre-limpieza de ruido OCR antes de abreviaturas de mes (ej. `1T1JUN` -> `11 JUN`).
  - Se implementó normalización de caracteres para tipos de sangre donde Tesseract confunde la `O` con el número cero `0` (ej. `0+`, `176 0` -> `O+`).
  - Se aisló la extracción de datos en capturas del reverso para evitar que números de códigos de barras o nombres de ciudades de expedición contaminen la información del frontal.

### Sincronización de Estados Móvil-Servidor (UX Zero-Friction)
- **Control de Paso por Cliente (`clientStep`):** El cliente de cámara móvil (`public/cam/index.html`) ahora envía explícitamente su paso actual (`step: 'scan_front'` | `'scan_reverse'`) en cada petición `POST` a `/api/cam-signal/[session]`.
- **Prevención de Caídas a Frontal:** La máquina de estados del servidor respeta la intención del cliente: si el usuario está en la fase de reverso y la lectura falla en esa toma, la sesión se mantiene en `scan_reverse` permitiendo reintentos del reverso sin regresar al frontal.
- **Botón Glassmorphic Non-Intrusive (`↺ Frontal`):** Se integró un botón secundario sutil con estilo glassmorphic en la esquina superior izquierda de la vista móvil. Permite reiniciar la sesión y repetir la captura del frontal en cualquier momento si los datos leídos del frontal no satisfacen al usuario.
- **Auditoría Local (`ocr-attempts/`):** Consolidación del sistema de logs locales que guarda cada foto procesada (`.jpg`) y su correspondiente resultado JSON (`.json`) para auditoría y diagnóstico empírico continuo.
- **Batería de Pruebas Automáticas (`test-ocr-all.ts`):** Suite de pruebas que ejecuta la batería completa de imágenes de prueba (`cédula ejemplo.HEIC`, `amarilla 1 frontal.jpeg`, `amarilla 1 reverso.jpeg`, `amarilla 2 frontal.PNG` e imagen ilegible), alcanzando un resultado final de 5/5 pruebas pasadas (100% de éxito).

## Sesión: 2–4 de Septiembre de 2026 (Refinamiento UI/UX, Pagos con Transferencia, Lightbox y Consistencia Visual)

### Visualización y Layout Responsivo en Laptops (Sin `scale` ni `font-size` global)
- **Diagnóstico:** En viewports típicos de laptop (1366x768 / 1352x674) al 100% de zoom, la presencia de `h-full flex-col` y alturas rígidas forzaba la compresión de Flexbox, aplastando las tarjetas del dashboard y recortando los avatares en el banner superior.
- **Solución:**
  - En `DashboardHero.vue` se sustituyó la altura fija `h-[130px]` por una altura responsiva mínima `min-h-[150px] md:min-h-[160px] 2xl:min-h-[220px]` y se añadió `shrink-0`.
  - En `DashboardView.vue` se eliminó la restricción `h-full` y el doble scroll, permitiendo un flujo natural vertical holgado y nítido a escala 100%.

### Ampliación de Foto de Perfil de Miembros (Lightbox Modal)
- **Componente Reutilizable (`ImagePreviewModal.vue`):** Modal creado con estética Gym AGOD, fondo con `backdrop-blur`, animación suave de entrada (`animate-reveal`), soporte para cierre con tecla `Esc` o clic fuera del contenedor, y enlace de acceso directo al recurso de imagen.
- **Integración en Panel de Detalle (`MemberDetailPanel.vue`):** El avatar del perfil es interactivo (`cursor-pointer`) y muestra un efecto hover con icono de lupa (`ZoomIn`), permitiendo a los administradores abrir y revisar la foto del miembro en tamaño completo.

### Pagos con Transferencia Bancaria y Gestión de Comprobantes
- **Esquema de Base de Datos (Drizzle ORM):**
  - En `drizzle/schema.ts` se agregaron los campos `receiptPath: text('receipt_path')` y `transferReference: text('transfer_reference')` a la tabla `payments`.
  - En `server/lib/db.ts` se implementó auto-migración preventiva que evalúa `PRAGMA table_info(payments)` para añadir las columnas automáticamente si no existían en SQLite.
  - En `app/modules/members/types/index.ts` se actualizó la interfaz TypeScript `Payment`.
- **Backend Nitro (`memberService.ts`):**
  - Procesamiento y guardado de comprobantes en base64 hacia el directorio `public/uploads/receipts/`, persistiendo la ruta física y el código de referencia en el registro de pago.
- **Flujo de Registro (`RegisterPlanSelection.vue` y `useRegisterForm.ts`):**
  - Al seleccionar "Transferencia" como método de pago, se despliega el cargador de comprobante con previsualización en miniatura, botón para eliminar/reemplazar y campo de texto para el número de referencia bancaria.
- **Historial de Pagos y Lightbox de Comprobantes:**
  - En `PaymentHistory.vue`, los pagos por transferencia muestran una etiqueta interactiva `Comprobante`.
  - En `PaymentReceiptModal.vue` se visualiza el comprobante bancario en alta resolución junto con los datos de monto, fecha y código de transacción, con manejo amigable para pagos sin imagen adjunta.

### Rediseño de Planes y Promociones (Grilla 4 Columnas y Tarjetas Compactas)
- **Grilla Optimizada (`PlansView.vue`):** Configuración en 4 columnas en escritorios y laptops (`xl:grid-cols-4 2xl:grid-cols-4 gap-3.5 md:gap-4`).
- **Tarjetas Compactas (`PlanCard.vue`):** Reducción de padding (`p-3.5 md:p-4`), tipografía ajustada (`text-base md:text-lg` en títulos y `text-lg md:text-xl` en precios), badges pequeños y botones compactos (`py-1.5 text-[11px]`), eliminando el aspecto sobredimensionado anterior.

### Estabilidad en Transiciones de Página y Eliminación de Tirones Verticales
- **Diagnóstico:** `AppLayout.vue` aplicaba condicionalmente `isFullBleed` en `/members`, quitando de golpe el padding de `<main>` al navegar, lo que junto a `transform: translateY(10px) scale(0.99)` causaba un salto vertical abrupto ("tirón hacia arriba").
- **Solución:**
  - Se unificó `<main class="flex-1 min-w-0 flex flex-col overflow-y-auto">` de forma constante para todas las rutas.
  - En `app/assets/css/main.css`, la animación de página se simplificó a un desvanecimiento limpio por opacidad (`opacity 0.15s ease-out`), eliminando por completo cualquier salto o cabeceo.

### Preservación del Diseño Limpio en Directorio de Miembros
- En `ListView.vue` se descartó el uso de contenedores perimetrales con bordes redundantes (`border border-border rounded-2xl bg-surface shadow-sm`), restaurando la división nativa y directa de pantalla completa: encabezado superior con `border-b` y panel lateral derecho con `border-l border-border bg-surface`.

### Corrección de Bug Visual en Estados de Suscripción (Punto y Texto)
- **Diagnóstico:** El indicador del avatar en `MemberListSection.vue` evaluaba únicamente `status === 'active'`, manteniéndose verde aun si la fecha de vencimiento ya había pasado. El texto mostraba siempre `"Vence <fecha>"`.
- **Solución:**
  - En `MemberListSection.vue` se incorporó `getStatusDotClass(member)`: punto rojo (`bg-danger`) si la suscripción expiró (`diff < 0`), amarillo si vence en <= 3 días, y verde si está activa.
  - El texto ahora evalúa la diferencia: si el plan expiró indica `"Venció hace X días (fecha)"` en color rojo, coincidiendo con la barra lateral izquierda (`SecondarySidebar.vue`).
  - En `MemberDetailPanel.vue` se enlazó el badge rojo "VENCIDO" y el texto `"Venció hace X días"` cuando `daysRemaining < 0`.

### Estandarización de Encabezados, Padding y Alineación Horizontal Exacta
- **Alineación con Elementos Inferiores:** Sincronización estricta del padding horizontal a `px-6 lg:px-8` tanto en el encabezado superior como en los contenedores inferiores de todas las vistas (`DashboardView`, `ListView`, `PlansView`, `RegisterView/new` y `EditView/edit`), logrando que el título coincida al píxel con el borde de las tarjetas, widgets y formularios.
- **Incremento de Padding Vertical:** Se amplió a `py-5 lg:py-6` en todas las barras de título, otorgando mayor holgura visual y simetría con la barra lateral secundaria.
- **Tipografía Unificada:** Todos los encabezados principales se estandarizaron a `font-display font-bold text-2xl tracking-wide uppercase text-text`.
- **Vista de Edición de Miembro (`EditView.vue` y `edit.vue`):** Se adaptó el botón de regreso, el encabezado y el contenedor de dos columnas para respetar la misma cuadrícula de padding y alineación vertical/horizontal.

### Inventario de Componentes y Archivos Afectados
- **Nuevos Componentes Creados:**
  - `app/ui/components/ImagePreviewModal.vue`: Modal de previsualización en alta definición con zoom y soporte para teclado `Esc`.
  - `app/modules/members/components/PaymentReceiptModal.vue`: Modal para visualizar y descargar comprobantes de pago por transferencia.
- **Base de Datos y Backend:**
  - `drizzle/schema.ts`: Incorporación de columnas `receipt_path` y `transfer_reference` en la tabla `payments`.
  - `server/lib/db.ts`: Auto-migración SQLite mediante `PRAGMA table_info(payments)`.
  - `server/services/memberService.ts`: Almacenamiento seguro en disco de imágenes de comprobantes y persistencia de referencias bancarias.
- **Vistas y Secciones Frontend:**
  - `app/ui/components/AppLayout.vue`: Unificación del elemento `<main>` sin saltos de scroll o márgenes condicionales.
  - `app/assets/css/main.css`: Transición de página suave basada en opacidad.
  - `app/modules/dashboard/views/DashboardView.vue` & `DashboardHero.vue`: Corrección de escala y alturas mínimas para pantallas de laptop.
  - `app/modules/members/views/ListView.vue` & `sections/MemberListSection.vue`: Corrección de punto/texto de vencimiento y eliminación de cajas con bordes redundantes.
  - `app/modules/members/sections/MemberDetailPanel.vue` & `PaymentHistory.vue`: Integración de disparadores de foto completa y recibos de transferencia.
  - `app/modules/members/sections/RegisterPlanSelection.vue` & `composables/useRegisterForm.ts`: Carga de comprobante y referencia bancaria en registro.
  - `app/modules/plans/views/PlansView.vue` & `components/PlanCard.vue`: Grilla de 4 columnas compacta y balanceada.
  - `app/pages/members/new.vue` & `app/pages/members/edit.vue`: Estandarización de márgenes y tipografía de encabezado.

## Sesión: 6 de Septiembre de 2026 (Estandarización de Escala Visual, Botones, KPIs y Modales en Caja)

### Homologación de Escala Tipográfica y Componentes en Caja (/cash)
- **Diagnóstico:** La página de Caja (`CashRegisterView.vue`) presentaba una escala tipográfica y de componentes subdimensionada frente al resto de vistas (`/members`, `/plans`, `/inventory`), con uso recurrente de textos diminutos (`text-[10px]`, `text-[11px]`), botones de cabecera fijos sin breakpoints responsivos `lg:`, iconos pequeños `w-3.5 h-3.5`, un contenedor plano de KPIs sin iconografía, y modales con radios disonantes (`rounded-2xl`).
- **Botones del Encabezado:**
  - El botón primario desplegable (`Nuevo movimiento`) y el botón secundario (`Cerrar Caja` / `Abrir Caja de Hoy`) se estandarizaron con la escala global responsiva: `py-2 px-3.5 lg:py-2.5 lg:px-5 text-xs lg:text-sm shadow-md` con iconos `w-4 h-4`.
- **Badge de Estado:**
  - Reemplazo de la píldora achatada `rounded-full text-[11px]` por el badge estándar `text-xs px-3 py-1 rounded-lg font-bold uppercase tracking-wider flex items-center gap-2`.
- **Grilla Estándar de 4 Tarjetas de KPIs:**
  - Sustitución de la barra horizontal compacta con divisores por la cuadrícula estándar de 4 tarjetas (`grid grid-cols-2 lg:grid-cols-4 gap-3.5`), idéntica al patrón visual de `InventoryView.vue`.
  - Incorporación de cajas de iconos (`w-10 h-10 rounded-xl bg-surface-2 border border-border`) con `TrendingUp` (Ingresos), `TrendingDown` (Egresos), `Scale` (Balance Neto) y `Banknote` (Efectivo en Cajón), con etiquetas en `text-[11px]` y cifras en `font-display font-bold text-xl lg:text-2xl`.
- **Filtros y Feed de Movimientos:**
  - Pestañas de período y barra de filtros con espaciado ampliado a `p-2.5 sm:p-3` y botones `text-xs lg:text-sm`.
  - Lista de transacciones con mayor padding de fila (`p-3.5 sm:px-4 sm:py-3.5`), avatares de categoría de 10x10 (`w-9 h-9 sm:w-10 sm:h-10 rounded-xl`), conceptos en `text-sm lg:text-base` y montos destacados en `font-display font-bold text-base sm:text-lg lg:text-xl`.
- **Modales de Caja:**
  - Estandarización de `rounded-2xl` a `rounded-xl` en los 5 modales (`OpenRegisterModal`, `CloseRegisterModal`, `SaleModal`, `SporadicIncomeModal`, `ExpenseModal`), con botones de acción en `py-2.5 px-4 lg:px-5 rounded-xl text-xs lg:text-sm font-bold uppercase tracking-wider`.

### Refactorización Visual del Modal de Producto (Inventario)
- **Componente Afectado:** `app/modules/inventory/components/ProductFormModal.vue`.
- **Foto del Producto:** Placeholder compacto de 48x48px (`w-12 h-12 rounded-xl`) ubicado a la izquierda en la misma fila del campo "Nombre del Producto *". Al hacer clic sobre el placeholder o el icono de subida se activa nativamente el explorador de archivos para cargar o cambiar la imagen, manteniendo el botón hover de eliminación rápida `X`.
- **Selector de Categoría:** Reemplazo de la grilla de 6 botones por un control `<select>` nativo elegante con las mismas 6 categorías (`Bebidas`, `Proteínas`, `Snacks`, `Suplementos`, `Accesorios`, `Otros`), vinculado a la misma variable `form.category`.
- **Agrupación de Precios y Stock:** Incorporación del subtítulo visual `"PRECIOS Y STOCK"` (`text-[11px] font-bold text-muted uppercase tracking-wider`) sobre la grilla de dos columnas (`Precio de venta`, `Costo unitario`, `Stock inicial`, `Alerta stock mínimo`), preservando las validaciones de campos requeridos (*).
- **Campos Opcionales Colapsables:** Agrupación de `Código de barras / SKU` y `Descripción` dentro de un acordeón `<details>` con estilo nativo (`rounded-xl bg-surface-2/40 border border-border`), cerrado por defecto con el título `"Detalles opcionales"`.
- **Integridad:** Sin alteraciones en la lógica de negocio, validaciones requeridas (`name`, `price`, `stock`), manejo de subida/conversión de imágenes en base64 ni en la estructura del payload emitido en `@save`.

## Sesión: 6 de Septiembre de 2026 (Componetización Unificada de Formularios y Correcciones de Linter)

### Correcciones de Linter y Utilidades Tailwind v4
- **`RevenueChart.vue`:** Eliminación de la clase redundante `block` que colisionaba con `flex` en el enlace a `/cash`.
- **`PlanCard.vue`:** Sustitución de valores arbitrarios `min-h-[22px]` y `min-h-[28px]` por las clases estándar de Tailwind v4 `min-h-5.5` y `min-h-7`.
- **`SidebarNav.vue`:** Migración de `w-[var(--sidebar-icon-width)]` a la sintaxis nativa `w-(--sidebar-icon-width)`.

### Doctrina Universal de Componetización y DRY (Regla Obligatoria para Agentes)
- **Consolidación en `SPEC.md` (Sección 2.1):** Se fijó formalmente como regla arquitectónica previa a escribir cualquier elemento HTML que todo agente o desarrollador debe evaluar dos preguntas obligatorias:
  1. *¿Ya existe algo similar?* (Inspeccionar `app/ui/components/` o componentes de módulos antes de crear nuevo HTML).
  2. *¿Es algo lo suficientemente copiable como para componetizarlo?* (Si se repite o se copiará en más de un lugar, debe nacer inmediatamente como componente reutilizable en lugar de HTML inline repetido).
- **Alcance Universal:** Esta política rige para cualquier elemento de la interfaz (botones, badges, tarjetas, modales, tablas, contenedores y controles interactivos), no únicamente para formularios.

## Sesión: 6 de Septiembre de 2026 (Normalización de Base de Datos para Categorías Dinámicas, Dropzone con Cámara QR y Estandarización en Inventario)

### 1. Normalización de Base de Datos (Drizzle ORM + SQLite)
- **Nueva Tabla Relacional `product_categories`:**
  - Definición en `drizzle/schema.ts` y `server/lib/db.ts`: `id` (INTEGER PRIMARY KEY AUTOINCREMENT), `name` (TEXT NOT NULL), `slug` (TEXT NOT NULL UNIQUE), `createdAt` (TEXT NOT NULL).
  - Sembrado automático de categorías canónicas por defecto (`Bebidas`, `Proteínas`, `Snacks`, `Suplementos`, `Accesorios`, `Otros`).
- **Relación Foránea en `products`:**
  - Columna `categoryId: integer('category_id').references(() => productCategories.id)`.
  - Auto-migración idempotente en `server/lib/db.ts`: detección y creación de columna con `PRAGMA table_info(products)` y backfill automático de productos preexistentes según su slug histórico (`category_id` poblado para todos los productos).

### 2. Backend y Endpoints de Categorías Dinámicas
- **Servicio `server/services/categoryService.ts`:**
  - `getCategories()`: Retorna listado completo de categorías con conteo dinámico de productos asociados (`productCount`).
  - `getCategoryById(id)`: Consulta por ID.
  - `createCategory(name)`: Generación automática de slugs limpios e inserción.
  - `updateCategory(id, name)`: Actualización de nombre y slug.
  - `deleteCategory(id)`: Eliminación protegida (impide borrar categorías si poseen productos activos asociados).
- **Rutas Nitro REST:**
  - `GET /api/categories`: Listado con conteos.
  - `POST /api/categories`: Creación de categoría.
  - `PUT /api/categories/:id`: Modificación de categoría.
  - `DELETE /api/categories/:id`: Eliminación con validación de integridad referencial.
- **Actualización de `productService.ts`:**
  - Consultas con `leftJoin(productCategories, eq(products.categoryId, productCategories.id))` para retornar `categoryId`, `categoryName` y `categorySlug`.
  - `createProduct` y `updateProduct` resuelven bidireccionalmente `categoryId` y `category` asegurando consistencia y retrocompatibilidad.

### 3. Frontend de Inventario y Dropzone con Captura QR
- **Modal de Gestión de Categorías (`CategoryManagerModal.vue`):**
  - CRUD interactivo para añadir, renombrar inline y eliminar categorías.
  - Botón de acceso directo en la barra superior ("Categorías") y atajo en la barra de filtros de `InventoryView.vue`.
  - Píldoras de filtrado generadas 100% dinámicas desde la base de datos.
- **Dropzone Ampliado para Fotos de Productos (`ProductFormModal.vue`):**
  - Zona de arrastre y soltado (`drag & drop`) amplia con soporte visual interactivo (`dragover`, `dragleave`, `drop`) y mensajes de asistencia ("Arrastra y suelta una foto aquí").
  - Integración nativa con la infraestructura de cámara móvil vía QR (`qrcode.vue`):
    - Conexión a `/api/tunnel` o fallback local para generar sesión de captura `/cam?session=...&mode=photo`.
    - Polling sincronizado a `/api/cam-signal/[session]` con timeout de seguridad y limpieza en desmontaje.
    - Carga automática e instantánea de la foto capturada con el celular directamente al modal en el PC.
- **Estandarización del Acordeón "Detalles Opcionales":**
  - La cabecera interactiva (`summary`) fue homologada al píxel con las medidas, bordes, tipografía, padding (`px-3.5 py-2.5 rounded-xl text-xs lg:text-sm`) y colores de `AppInput`, garantizando armonía visual total con los demás campos del formulario.

## Sesión: 6 de Septiembre de 2026 (Alineación Tipográfica de KPIs en Inventario y Caja, y Sincronización de SPEC.md)

### 1. Alineación y Nivelación de Tarjetas de Métricas (KPIs)
- **Componentes Afectados:** [`app/modules/inventory/views/InventoryView.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/inventory/views/InventoryView.vue) y [`app/modules/cash/views/CashRegisterView.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/views/CashRegisterView.vue).
- **Diagnóstico:** Los números de las tarjetas de KPIs presentaban un desfase visual respecto al icono de la izquierda y las etiquetas superiores, ocasionado por la ausencia de contenedor `flex-col justify-center`, el comportamiento inline del `span` de la etiqueta y el `leading-tight` asimétrico de Oswald en la cifra grande.
- **Solución Aplicada:**
  - Se envolvió el bloque de texto con `min-w-0 flex flex-col justify-center`.
  - Se fijó la etiqueta con `block truncate leading-none tracking-wider text-[11px]`.
  - Se ajustó la cifra a `font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate`, logrando que la altura total del bloque coincida exactamente con los 40px del contenedor del icono y eliminando espacios en blanco accidentales.

### 2. Cumplimiento de Doctrina UI (DRY) en Modal de Categorías
- **Componente Afectado:** [`app/modules/inventory/components/CategoryManagerModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/inventory/components/CategoryManagerModal.vue).
- Se eliminó la etiqueta nativa `<input>` usada en la edición inline de categorías y se reemplazó por [`AppInput`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/ui/components/AppInput.vue), respetando estrictamente la directriz de la Sección 2.1 de `SPEC.md`.

### 3. Consolidación de Esquema en SPEC.md
- **Documento Afectado:** [`spec/SPEC.md`](file:///d:/Proyectos/inventario-gym/spec/SPEC.md).
- Se actualizó la Sección 5 (`Schema de Base de Datos`) agregando formalmente las tablas `product_categories`, `products`, `cash_registers`, `cash_movements` y `sale_items`.

## Sesión: 6 de Septiembre de 2026 (Rediseño Unificado de Nuevo Movimiento en Caja)

### 1. Reemplazo del Flujo Fragmentado por Modal Unificado
- **Componentes Afectados:**
  - Creado: [`app/modules/cash/components/UnifiedMovementModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/UnifiedMovementModal.vue)
  - Modificados: [`app/modules/cash/views/CashRegisterView.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/views/CashRegisterView.vue) y [`app/modules/cash/composables/useCashRegister.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/composables/useCashRegister.ts)
- **Diagnóstico y Motivación:**
  - El flujo anterior obligaba al cajero o recepcionista a tomar una decisión inicial fragmentada mediante un dropdown ("Venta de productos", "Cobro no miembro", "Registrar gasto"), abriendo tres modales independientes sin posibilidad de registrar transacciones mixtas en una sola operación.
- **Solución Implementada:**
  - **Botón Directo:** Se reemplazó el dropdown de la cabecera por un único botón `+ Nuevo Movimiento`.
  - **Buscador Inteligente / Autocomplete:** Buscador omnibox superior con consulta en paralelo sobre catálogo de productos activos, conceptos canónicos de servicios/cobros no miembros, y motivos frecuentes de gasto.
  - **Clasificación Automática de Signo:** Los ítems del catálogo ya traen su signo predeterminado (`+` verde para productos y servicios; `-` rojo para egresos).
  - **Conceptos Libres Manuales:** Se permite escribir texto libre cuando un ítem no está en el catálogo, activando un selector de polaridad `[ + Entra | - Sale ]` exclusivo para entradas libres.
  - **Chips de Sugerencias Rápidas:** Botones de acceso directo para añadir al instante conceptos frecuentes de servicios y gastos.
  - **Canasta Acumulativa de Partidas:** Permite combinar múltiples productos, servicios y egresos con ajuste inline de cantidades (con validación de stock máximo para productos) e importes.
  - **Balance Neto en Vivo:** Banner inferior que recalcula dinámicamente Total Entradas (+), Total Salidas (-) y Balance Neto resultante.
  - **Procesamiento por Lotes (`recordBatchMovements`):** Enrutamiento inteligente en backend que empaqueta las líneas de producto en una venta de caja única (`/api/cash/sale`), despacha servicios a `/api/cash/sporadic` y egresos a `/api/cash/expense`, refrescando de inmediato el arqueo de caja y la lista de movimientos.

## Sesión: 7 de Septiembre de 2026 (Componentización Universal de AppModal, Resiliencia de Datos de Entrada y Eliminación de Presets Hardcodeados)

### 1. Eliminación Definitiva de Datos Falsos Hardcodeados (Zero Mock Data)
- **Diagnóstico:** Se identificó que conceptos como *"Artículos de Aseo y Limpieza"*, *"Compra de Agua / Hielo"*, y servicios con precios fijos (*Pase Diario $10.000*) se encontraban hardcodeados como constantes estáticas (`expensePresets` y `servicePresets`) en `UnifiedMovementModal.vue`.
- **Solución:**
  - Se eliminaron por completo `servicePresets` y `expensePresets`.
  - El buscador y las sugerencias ahora se nutren **exclusivamente de datos reales de la base de datos** (productos de inventario en SQLite con stock disponible).
  - Los egresos o servicios no catalogados se introducen con total libertad por el usuario con su monto verídico y selector `[+ Entra | - Sale]`.

### 2. Creación del Componente Universal `AppModal.vue` y Resiliencia de Borrador
- **Componente Creado:** [`app/ui/components/AppModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/ui/components/AppModal.vue).
- **Problema Resuelto:** Anteriormente, si un usuario hacía clic por error fuera del modal (backdrop) mientras llenaba campos o partidas, el modal se cerraba destruyendo todos los datos ingresados.
- **Doctrina Implementada:**
  - Clic en el backdrop o tecla `Esc` (`@close`): Cierra visualmente el modal pero **retiene el borrador en memoria**. Al reabrirlo, todo el trabajo en progreso continúa intacto.
  - Clic explícito en la 'X' o botón "Cancelar" (`@dismiss`): Acción intencional de descarte que reinicia a cero el formulario o canasta.
- **Componentes Migrados:**
  - [`UnifiedMovementModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/UnifiedMovementModal.vue)
  - [`OpenRegisterModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/OpenRegisterModal.vue)
  - [`CloseRegisterModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/CloseRegisterModal.vue)
  - [`ProductFormModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/inventory/components/ProductFormModal.vue)
  - [`CategoryManagerModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/inventory/components/CategoryManagerModal.vue)

### 3. Corrección de Animación en Menús Desplegables (`animate-dropdown`)
- En `app/assets/css/main.css` se definió `.animate-dropdown` (`translateY(-8px) -> translateY(0)` con 0.16s ease-out), eliminando el efecto anti-intuitivo de que el menú de autocompletado saliera desde el fondo de la pantalla.

### 4. Simplificación del Estado Vacío en Nuevo Movimiento
- Se reemplazó el contenedor sobredimensionado por una fila mínima compacta (`py-2.5 px-3.5 border-dashed`).
- Se incorporaron los **Productos Recientes en Inventario** (artículos con stock disponibles en la base de datos) como pastillas rápidas de 1 clic debajo del estado vacío.

## Sesión: 7 de Septiembre de 2026 (Divulgación Progresiva Estricta y Refinamiento de Layout en Nuevo Movimiento)

### 1. Eliminación de Secciones Vacías y Divulgación Progresiva Estricta
- **Componente Afectado:** [`app/modules/cash/components/UnifiedMovementModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/UnifiedMovementModal.vue).
- **Problema:** La interfaz anterior mostraba cajas vacías, placeholders ("Sin partidas agregadas...") y controles irrelevantes antes de que el usuario agregara una partida (Método de Pago, "+ Agregar cliente", Balance Neto), recargando innecesariamente la pantalla de inicio del modal.
- **Solución Implementada:**
  - **Estado 1: Modal Vacío (`cart.length === 0`):**
    - Se eliminó totalmente la caja, título y placeholder de "Partidas agregadas".
    - Se ocultaron en su totalidad: "Método de Pago Único", "+ Agregar cliente" y el banner de "Balance Neto".
    - Se muestra únicamente: buscador omnibox superior, lista vertical ligera de "Agregar rápido" y el texto centrado secundario: *"Agrega una partida para continuar"*.
    - Botón "Confirmar" permanentemente visible en el pie del modal, pero en estado atenuado y deshabilitado (`:disabled="cart.length === 0 || submitting || hasInvalidAmounts"`).
  - **Estado 2: Modal con Partidas (`cart.length > 0`):**
    - Se revelan automáticamente las secciones contextuales mediante renderizado condicional simple:
      1. Lista y contador de "Partidas agregadas · N" con controles de cantidad y eliminación.
      2. Selector de Método de Pago (Efectivo / Transferencia) y botón expansible "+ Agregar cliente".
      3. Banner de Balance Neto en vivo (con desglose dinámico si hay mezcla de ingresos y egresos).
    - El botón "Confirmar" se habilita de inmediato para finalizar la transacción.
  - **Transición Fluida Sin Pérdida de Foco:**
    - El contenedor del buscador `<AppInput>` se mantiene en la raíz del modal fuera de los bloques condicionales `v-if/v-else`.
    - La transición ocurre de forma instantánea y reactiva en memoria, sin recargar el modal y garantizando que el cursor y el foco permanezcan activos en el input en todo momento.

### 2. Estilo Liviano para "Agregar Rápido"
- Se reemplazó la grilla de dos columnas con badges pesados por una lista vertical estilizada:
  - Fila horizontal con fondo sutil (`bg-surface-2/40 hover:bg-surface-2`) y borde delgado (`border-border/40`).
  - Extremo izquierdo: Ícono pequeño en contenedor cuadrado (`w-6 h-6 rounded-lg bg-surface`) junto al nombre del producto.
  - Extremo derecho: Precio en texto simple sin badges (`font-display font-semibold font-mono text-muted group-hover:text-text`).
  - Fila adicional punteada para abrir rápidamente el registro de un concepto manual/gasto.

### 3. Autocompletado Estricto al Escribir (Cero Dropdown al Foco Vacío)
- Como los productos rápidos ya están visibles en el cuerpo del modal, se eliminó la lista redundante que aparecía al hacer foco en el buscador vacío (`recentProducts`).
- El menú contextual ahora solo se despliega cuando el usuario escribe activamente (`searchQuery.trim().length > 0`), filtrando productos de inventario en vivo y ofreciendo registrar el término escrito como concepto libre manual.

## Sesión: 7 de Septiembre de 2026 (Edición y Anulación de Movimientos de Caja con Reversión Automática de Inventario)

### 1. Reversión y Eliminación de Movimientos (`deleteCashMovement`)
- **Componentes Afectados:**
  - Backend: [`server/services/cashService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/cashService.ts) y [`server/api/cash/movement/[id].delete.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/api/cash/movement/[id].delete.ts)
  - Composable: [`useCashRegister.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/composables/useCashRegister.ts)
  - UI: [`DeleteMovementConfirmModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/DeleteMovementConfirmModal.vue) y [`CashRegisterView.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/views/CashRegisterView.vue)
- **Comportamiento:**
  - Al anular una venta de productos, el sistema ejecuta una transacción atómica que recupera las líneas en `sale_items`, restituye las cantidades al `stock` físico de cada producto en la tabla `products`, elimina los ítems de venta y remueve el movimiento de `cash_movements`.
  - Si el movimiento es de membresía (`paymentId`), se protege y restringe para ser gestionado desde el módulo de Socios.
  - Las métricas de arqueo de caja y saldo esperado se recalculan de inmediato.

### 2. Edición de Movimientos Registrados (`updateCashMovement`)
- **Componentes Afectados:**
  - Backend: [`server/services/cashService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/cashService.ts) y [`server/api/cash/movement/[id].put.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/api/cash/movement/[id].put.ts)
  - Composable: [`useCashRegister.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/composables/useCashRegister.ts)
  - UI: [`EditMovementModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/EditMovementModal.vue) y [`CashRegisterView.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/views/CashRegisterView.vue)
- **Comportamiento:**
  - Permite corregir el concepto, monto (para egresos o servicios no-producto), método de pago (`[ Efectivo | Transferencia ]`), cliente/tercero y observaciones.
  - Para ventas de productos, el monto y los conceptos están bloqueados para evitar desajustes de stock (deben anularse para restituir stock), pero permite corregir el método de pago y los datos del cliente.

### 3. Edición en Vivo de Conceptos Manuales en la Canasta
- En [`UnifiedMovementModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/UnifiedMovementModal.vue), las partidas no catalogadas permiten editar su texto directamente en la canasta antes de confirmar, facilitando la corrección de erratas sin tener que borrar y volver a crear el ítem.

### 4. Pruebas de Integración y Verificación Empírica
- **Prueba 1 (Edición con PUT):**
  - Se invocó `PUT /api/cash/movement/5` para modificar un egreso de caja existente.
  - Concepto actualizado a *"Compra de Agua / Hielo (Corregido)"* y monto a `$12.000` (`paymentMethod: 'transfer'`).
  - Resultado: `success: true`. Verificado en base de datos SQLite.
- **Prueba 2 (Reversión atómica de stock con DELETE):**
  - Producto `#3` (*Proteína Whey Gold Standard (Scoop)*) se encontraba con `stock = 14`.
  - Se ejecutó `DELETE /api/cash/movement/6` correspondiente a la venta de 1 unidad.
  - Resultado: La transacción eliminó `sale_items`, eliminó `cash_movements` y restituyó el stock en `products` a `15` unidades de forma automática.
  - Las métricas de caja actualizaron en caliente el total vendido (`productTotal: 0`) y el balance de caja sin necesidad de recálculos manuales.

## Sesión: 7 de Septiembre de 2026 (Refinamiento de UI/UX, Renovación de Planes y Modal Universal de Borrado)

### 1. Homologación de Rojo y Consistencia Visual en Caja (`/cash`)
- **Unificación de Tokens:** En `app/assets/css/tokens.css`, se definió explícitamente `--color-danger: #E60000;` para el tema oscuro (`html.dark`), erradicando la discrepancia entre el rojo AGOD (`#E60000`) y el tono coral claro heredado de `:root` (`#EF4444`).
- **SecondarySidebar:** En `SecondarySidebar.vue`, se reemplazaron las clases estáticas de Tailwind (`bg-red-500`, `text-red-400`) por clases semánticas fluidas (`bg-danger`, `text-danger`).
- **Balance Neto Dinámico:** En `CashRegisterView.vue`, se corrigió la tarjeta de Balance Neto: ya no se pinta en rojo incondicionalmente, sino que evalúa dinámicamente `text-success` si es positivo, `text-danger` si es negativo, o `text-text` si es cero.
- **Categoría Productos:** Se asignó una identidad distintiva (`bg-emerald-500/15 text-emerald-400 border-emerald-500/30`) para evitar que las ventas de productos se muestren con insignias rojas que se confundan con egresos.

### 2. Eliminación de Descripciones y Reposicionamiento Vertical de Títulos
- Se removieron los textos descriptivos secundarios debajo de los encabezados `<h1>` en todas las páginas:
  - `CashRegisterView.vue`
  - `InventoryView.vue`
  - `PlansView.vue`
  - `PlanDetailView.vue`
  - `RegisterView.vue`
- Se incorporó un desplazamiento vertical en el contenedor del título (`pt-1.5 md:pt-2`) para que el `<h1>` ocupe de manera holgada y natural el espacio liberado por la descripción, alineándose con los controles de acción derechos.

### 3. Flujo Completo de Renovación de Planes en Socios
- **Backend:**
  - En `server/services/memberService.ts` se implementó `renewMemberSubscription(memberId, payload)`, gestionando la extensión de la vigencia (desde la fecha de vencimiento si el plan sigue activo, o desde hoy si expiró), el registro de pago en `payments`, y la creación automática del movimiento de ingreso en `cash_movements` (categoría `membership`).
  - Nuevo endpoint Nitro: `POST /api/members/[id]/renew`.
- **Frontend:**
  - Componente creado: `app/modules/members/components/RenewPlanModal.vue` (basado en `AppModal.vue`), con selección de catálogo de planes activos, previsualización interactiva de vigencia resultante, tarifas personalizadas opcionales y selector de método de pago (Efectivo / Transferencia con soporte para número de comprobante y subida de imagen de recibo).
  - En `MemberDetailPanel.vue`, se enlazaron los botones "Renovar Plan" y "Nuevo Plan" al modal de renovación con refresco reactivo automático.

### 4. Eliminación del Botón de Configuración
- En `SidebarNav.vue` se eliminó el botón enlace a `/settings` y se removió la importación del icono `Settings` de `lucide-vue-next`.

### 5. Suavizado de Efecto Hover en Tarjeta de Ingresos
- En `RevenueChart.vue`, se atenuó el hover del contenedor a `hover:border-border/90 hover:bg-surface-2/20`, removiendo el tinte rojo intenso `group-hover:text-accent` de la cifra grande de ingresos.

### 6. Componente Universal de Confirmación de Borrado (`AppConfirmDeleteModal`)
- **Componente Creado:** `app/ui/components/AppConfirmDeleteModal.vue` (construido sobre `AppModal.vue`), con badge de advertencia/peligro AGOD, botón de eliminación en `bg-danger` con spinner y soporte para slots personalizados.
- **Sustitución de `confirm()` nativos:**
  - En `PlansView.vue` para desactivación de planes de membresía.
  - En `InventoryView.vue` para eliminación de productos del catálogo.
  - En `CategoryManagerModal.vue` para eliminación de categorías de inventario.
  - En `MemberDetailPanel.vue` (y `useMembers.ts`), integrando la acción de archivar socios mediante el modal estilizado y la API `DELETE /api/members/:id`.

## Sesión: 7 de Septiembre de 2026 (Empaquetado Desktop Nativo, Lanzador Silencioso e Instalador Inno Setup)

### 1. Arquitectura de Empaquetado Desktop (Windows .exe)
- **Diagnóstico y Estrategia:** Se descartó el uso de Tauri / Rust por la complejidad de integrar módulos nativos pesados de Node.js (`better-sqlite3`, `sharp`, `tesseract.js`) y el overhead de sidecars. En su lugar, se implementó una arquitectura ligera y robusta basada en **Node.js Portable + Servidor Nitro embebido + Edge en modo aplicación (`--app`) + Inno Setup**.
- **Script de Compilación Automatizado ([`installer/build.ps1`](file:///d:/Proyectos/inventario-gym/installer/build.ps1)):**
  - Compila la aplicación con `pnpm run build` en Nuxt 4.
  - Empaqueta el servidor Nitro con todos sus módulos nativos precompilados (`.output/server`).
  - Empaqueta el frontend estático (`.output/public`) excluyendo imágenes pesadas de prueba.
  - Integra el runtime portable de Node.js, el modelo OCR offline (`ocrb.traineddata`), el icono corporativo y los scripts lanzadores en `installer/dist/`.
- **Compilador Inno Setup ([`installer/gymos.iss`](file:///d:/Proyectos/inventario-gym/installer/gymos.iss)):**
  - Genera el instalador único **`GymOS-Setup.exe`** (~46.2 MB con compresión Ultra LZMA2).
  - Configurado en español con creación automática de accesos directos en Escritorio y Menú Inicio.

### 2. Persistencia de Datos y Auto-Migración Idempotente
- **Rutas Centralizadas ([`server/utils/paths.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/utils/paths.ts)):**
  - Helper `getDataPath()` que en producción apunta a `%APPDATA%\GymOS\` y en desarrollo a la raíz del proyecto.
- **Base de Datos SQLite ([`server/lib/db.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/lib/db.ts)):**
  - Se configuró la base de datos en `%APPDATA%\GymOS\sqlite.db`, asegurando que las actualizaciones de la aplicación nunca borren los datos existentes.
  - Se incorporaron sentencias `CREATE TABLE IF NOT EXISTS` para todas las tablas del sistema (`plans`, `members`, `subscriptions`, `payments`, `gym_config`, `product_categories`, `products`, `cash_registers`, `cash_movements`, `sale_items`), garantizando inicialización automática limpia en instalaciones nuevas.

### 3. Lanzador 100% Silencioso y Ciclo de Vida por Heartbeat
- **Lanzador VBScript ([`installer/GymOS.vbs`](file:///d:/Proyectos/inventario-gym/installer/GymOS.vbs)):**
  - Ejecuta el proceso mediante `WScript.Shell.Run` con parámetro `0` (modo oculto), erradicando cualquier apertura o parpadeo de ventanas de terminal / CMD.
- **Lanzador Inteligente ([`installer/launcher.mjs`](file:///d:/Proyectos/inventario-gym/installer/launcher.mjs)):**
  - Asignación dinámica de puerto libre a partir del puerto 3100.
  - Inicia el servidor Nitro en segundo plano con enlace `0.0.0.0`.
  - Abre la ventana en modo aplicación (`msedge.exe --app=http://127.0.0.1:PUERTO --window-size=1280,800`) con perfil aislado de usuario en `%APPDATA%\GymOS\browser-profile`.
- **Ciclo de Vida por Heartbeat (Latido Cliente-Servidor):**
  - **Frontend ([`app/plugins/heartbeat.client.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/plugins/heartbeat.client.ts)):** Envía un pulso HTTP ultra liviano cada 3 segundos a `/api/ping` mientras la ventana esté abierta (consumo 0.00% CPU).
  - **Backend ([`server/api/ping.post.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/api/ping.post.ts)):** Si el servidor deja de recibir latidos durante más de 10 segundos (ventana cerrada por el usuario), se apaga automáticamente de forma limpia.

### 4. Servicio Dinámico de Fotos y Archivos Multimedia
- **Manejador de Rutas Nitro ([`server/routes/uploads/[...path].get.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/routes/uploads/[...path].get.ts)):**
  - Resuelve el bug donde las fotos tomadas o comprobantes subidos a `%APPDATA%\GymOS\uploads\` daban error 404 al no estar en la carpeta compilada de Nuxt.
  - Sirve de forma reactiva y segura imágenes de perfil (`/uploads/avatars/*`), productos (`/uploads/products/*`) y comprobantes de transferencia (`/uploads/receipts/*`) con encabezados de caché y tipos MIME correctos.

### 5. Escáner QR Híbrido (Internet / Red Local Offline)
- **Endpoint de Túneles ([`server/api/tunnel.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/api/tunnel.ts)):**
  - **Con Internet:** Utiliza Cloudflare Quick Tunnels (`untun`) generando una URL HTTPS pública para conectar el celular desde cualquier red móvil.
  - **Sin Internet (100% Offline):** Detecta automáticamente la IP local del PC en la red WiFi (`os.networkInterfaces()`) y genera el QR con la dirección local (ej. `http://192.168.1.X:3100`). Como el servidor escucha en `0.0.0.0`, el teléfono se conecta directamente a través de la red local sin salir a internet.

### 6. Identidad de Marca y Favicon Multirresolución
- **Icono Oficial de Gym AGOD ([`installer/assets/icon.ico`](file:///d:/Proyectos/inventario-gym/installer/assets/icon.ico) y [`public/favicon.ico`](file:///d:/Proyectos/inventario-gym/nuxt-app/public/favicon.ico)):**
  - Generado a partir de `logo-agod.png` en resoluciones 16x16, 32x32, 48x48 y 256x256 píxeles.
  - Reemplazó el favicon verde por defecto de Nuxt.
  - Sincronizado en [`public/manifest.json`](file:///d:/Proyectos/inventario-gym/nuxt-app/public/manifest.json) y [`nuxt.config.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/nuxt.config.ts) con control de caché (`/favicon.ico?v=2`), asegurando que la barra de tareas y el marco de la ventana muestren la identidad de Gym AGOD.

### 7. Modo de Captura de Fotos de Producto en Escáner Móvil (`mode=product`)
- **Alineación de Mensajes y Cámara:**
  - En `ProductFormModal.vue`, se actualizó la URL generada en el código QR a `&mode=product`.
  - En `public/cam/index.html`, se adaptaron los encabezados para el celular: *"Foto del Producto"* y *"Encuadra el producto en el centro"*, con pantalla de confirmación *"¡Foto del Producto Lista!"*.
  - Se configuró la cámara trasera por defecto (`facingMode: 'environment'`) sin invertir la imagen (evitando el modo espejo de selfies), permitiendo tomar fotos claras de productos e insumos directamente sobre el mostrador o repisa.

### 8. Corrección de Timeout en OCR (Inclusión de Binarios WebAssembly `.wasm`)
- **Diagnóstico del Error:**
  - Al ejecutar `nuxt build`, Nitro empaqueta únicamente archivos `.js` y `.mjs` en `node_modules/tesseract.js-core/`, omitiendo los archivos binarios compilados de WebAssembly (`tesseract-core-simd.wasm`, `tesseract-core.wasm`, `libheif.wasm`).
  - Cuando el worker de Tesseract intentaba inicializar el motor OCR en el servidor empaquetado, fallaba con `ENOENT: no such file or directory, open '...tesseract-core-simd.wasm'` y provocaba un bloqueo de 25 segundos hasta el timeout.
- **Solución Implementada:**
  - En `installer/build.ps1`, se añadió la copia forzada y recursiva de todos los binarios `.wasm` desde `node_modules/tesseract.js-core` y `node_modules/libheif-js` hacia la carpeta de distribución `dist/server/node_modules/`.
  - Se verificó empíricamente con imagen real de cédula colombiana (`test-mrz.jpg`), completando el reconocimiento OCR de forma instantánea (< 2 segundos) con `ocrSuccess: true` y extracción limpia de campos.

### 9. Permisos de Cámara Móvil y Fallback Nativo (HTTPS y Red Local HTTP)
- **Diagnóstico de Permisos en Navegadores Móviles:**
  - Las políticas de seguridad de iOS Safari y Android Chrome bloquean de inmediato la API `navigator.mediaDevices.getUserMedia` cuando se accede desde orígenes HTTP no seguros (como `http://192.168.x.x` en red local sin HTTPS), lanzando error de permisos sin mostrar el diálogo del sistema.
- **Solución Implementada:**
  - **Resolución de Túnel HTTPS Confiable ([`server/api/tunnel.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/api/tunnel.ts)):** Implementación con promesa compartida para garantizar que el QR siempre entregue el enlace seguro de Cloudflare HTTPS cuando haya internet disponible.
  - **Fallback de Capturador Nativo ([`public/cam/index.html`](file:///d:/Proyectos/inventario-gym/nuxt-app/public/cam/index.html)):** Si el dispositivo está en red local HTTP (sin HTTPS) o el navegador bloquea `getUserMedia`, la página activa automáticamente un disparador nativo `<input type="file" capture="...">`. Al tocar el botón de captura, el celular abre la app nativa de cámara, toma la foto en alta resolución y la transmite al servidor vía WebSocket/polling sin restricciones de seguridad del navegador.

### 10. Pre-calentamiento del Motor OCR al Iniciar el Servidor (`ocr-prewarm.ts`)
- **Plugin de Inicialización Temprana ([`server/plugins/ocr-prewarm.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/plugins/ocr-prewarm.ts)):**
  - Carga el motor Tesseract y el modelo `ocrb.traineddata` (11 MB) en memoria WebAssembly inmediatamente al arrancar el servidor en segundo plano.
  - Elimina el retardo de carga inicial (4-8s) en el primer escaneo de cédula.
  - Se amplió la ventana de protección de timeout en [`server/services/tesseractOcr.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/tesseractOcr.ts) a 60 segundos para evitar cancelaciones prematuras en máquinas con recursos limitados.

### 11. Corrección de Apagado Prematuro del Servidor por Suspensión en Segundo Plano
- **Diagnóstico del Error de Conexión:**
  - Cuando el usuario minimizaba o cambiaba de ventana para tomar el celular y escanear el QR, Chromium suspendía o ralentizaba los timers de JavaScript (`setInterval`) en la pestaña en segundo plano.
  - El servidor local tenía un timeout de latido de 10 segundos, por lo que asumía erróneamente que la app se había cerrado y ejecutaba `process.exit(0)`, dejando al celular sin servidor y arrojando *"Error de conexión con el servidor"*.
- **Solución Implementada:**
  - **Tiempo de Inactividad Seguro ([`server/api/ping.post.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/api/ping.post.ts)):** Se amplió el temporizador de inactividad a 30 minutos, permitiendo que la app permanezca minimizada o en segundo plano sin apagarse.
  - **Manejador de Cierre Explícito ([`app/plugins/heartbeat.client.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/plugins/heartbeat.client.ts)):** Se añadió `navigator.sendBeacon('/api/ping?action=close')` para que el servidor únicamente se apague cuando el usuario realmente cierre la ventana de la aplicación (`beforeunload`), además de enviar latidos inmediatos en eventos de `focus` y `visibilitychange`.

### 13. Limpieza Selectiva de Seed, Popular Plan Fallback y Ventana Nativa WebView2 (GymOS.exe)
- **Diagnóstico de Datos Simulados y Auto-seed:**
  - En `server/services/dashboardService.ts`, la función `seedDatabaseIfEmpty` insertaba 4 miembros ficticios (`1111111111`, `2222222222`, `3333333333`, `4444444444`), suscripciones y pagos cuando el dashboard detectaba 0 socios activos. Asimismo, `punchInService.ts` generaba visitas simuladas con `Math.random()`.
- **Limpieza Quirúrgica en Base de Datos ([`server/lib/db.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/lib/db.ts)):**
  - Se implementó una migración de limpieza idempotente que busca y elimina exclusivamente los registros de esas 4 cédulas ficticias y sus pagos/suscripciones en cascada, garantizando que los planes (incluyendo *"Plan Mensual Pro"*) y cualquier socio, cobro o producto real ingresado por el usuario permanezcan 100% intactos.
  - Se eliminó el archivo `seedService.ts` y se limpiaron los números aleatorios de `punchInService.ts`.
- **Soporte para Planes sin Suscripciones en Home ([`server/services/dashboard/popularPlanService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/dashboard/popularPlanService.ts)):**
  - Al consultar el plan más popular, si la tabla de suscripciones está vacía pero el usuario ya creó planes en la tabla `plans` (ej. *"Plan Mensual Pro"*), el backend selecciona automáticamente el primer plan activo disponible y lo muestra con 0 usuarios, eliminando el estado falso de "Aún no hay planes".
- **Ventana Nativa Standalone con WebView2 ([`installer/GymOS-App/Program.cs`](file:///d:/Proyectos/inventario-gym/installer/GymOS-App/Program.cs) y [`installer/build.ps1`](file:///d:/Proyectos/inventario-gym/installer/build.ps1)):**
  - Se implementó `GymOS.exe` como una aplicación nativa Windows Forms autosuficiente con WebView2 incrustado directamente en el cliente de la ventana.
  - Al ser `GymOS.exe` el propietario del HWND de la ventana (y no un subproceso `msedge.exe`), Windows vincula la ventana, el icono de la barra de tareas y el anclaje exclusivamente a **`GymOS.exe`**.
### 14. Cancelación de Membresías, Reembolsos en Caja y Clarificación del Flujo Financiero
- **Flujo Financiero Automatizado (Caja vs. Dashboard):**
  - Se aclaró el flujo de datos: tanto la inscripción como la renovación de socios impactan de forma 100% automática e inmediata la tabla de movimientos de caja (`cash_movements`), clasificadas como `membership` y vinculadas a la sesión de caja abierta en curso (o al balance del día). No se requiere ningún registro manual duplicado en `/cash`.
  - La pantalla de **Caja** (`/cash`) opera como el libro contable integral (membresías, ventas de productos, ingresos esporádicos y gastos operativos), mientras que el **Home Dashboard** consolida las métricas de negocio.
- **Implementación de Cancelación y Reembolso (Refund):**
  - **Servicio Backend ([`server/services/memberService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/memberService.ts)):** Se implementó `refundMemberSubscription`, ejecutando una transacción atómica que cancela la suscripción activa del socio (`status: 'cancelled'`) y registra un movimiento de egreso (`type: 'expense'`) en `cash_movements` categorizado como `membership`, descontando automáticamente el valor reembolsado de la caja diaria.
  - **Endpoint API ([`server/api/members/[id]/refund.post.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/api/members/[id]/refund.post.ts)):** Recibe `amount`, `paymentMethod` y `reason` con validación de montos positivos y estado de suscripción.
  - **Componente Modal ([`app/modules/members/components/RefundSubscriptionModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/components/RefundSubscriptionModal.vue)):** Modal interactivo con diseño GymOS para especificar el monto a reembolsar (soporta reembolsos totales o parciales), método de egreso (Efectivo / Transferencia) y motivo.
  - **Integración UI ([`app/modules/members/sections/MemberDetailPanel.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/sections/MemberDetailPanel.vue)):** Se integró el botón "Reembolsar" en la tarjeta de suscripción activa del socio.
### 15. Escaneo Inteligente Auto-Detectado de Cédulas Colombianas (Agnóstico al Orden)
- **Problema Solucionado:**
  - El sistema forzaba a comenzar obligatoriamente por el frontal (`scan_front`). En cédulas digitales/blancas nuevas, el frontal no tiene datos legibles (solo foto y chip), lo que generaba errores falsos de lectura. Además, en cédulas amarillas tradicionales, obligaba a escanear siempre el frontal antes del reverso, sin tolerancia si el usuario presentaba el documento al revés.
- **Auto-Detección y Flujo Agnóstico ([`server/api/cam-signal/[session].ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/api/cam-signal/%5Bsession%5D.ts)):**
  - El estado inicial de captura ahora es universal (`step: 'scan_any'`).
  - **Cédula Nueva / Digital:** Si detecta las 3 líneas de la zona MRZ (normalmente al reverso), extrae automáticamente todos los datos y finaliza en 1 solo paso (`step: 'completed'`), sin pedir frontal.
  - **Cédula Amarilla — Frontal primero:** Si detecta número y apellidos, guarda datos parciales y transiciona a `waiting_reverse` / `step: 'scan_reverse'`.
  - **Cédula Amarilla — Reverso primero (Nuevo flujo bidireccional):** Si detecta fecha de nacimiento, grupo sanguíneo (GSRH) o estatura en el reverso, guarda los datos parciales y transiciona a `waiting_front` / `step: 'scan_front'`.
  - El segundo escaneo en cualquiera de las dos direcciones combina (`mergeOcrResult`) los datos de ambas caras y completa la sesión exitosamente.
- **Interfaz Móvil Universal ([`public/cam/index.html`](file:///d:/Proyectos/inventario-gym/nuxt-app/public/cam/index.html)):**
  - Título genérico inicial: *"Escáner de Cédula — Coloca cualquier cara del documento dentro del recuadro"*.
  - Transiciones dinámicas según el paso solicitado por el servidor (*"Escanea el REVERSO"* o *"Escanea el FRONTAL"*).
  - Botón de reinicio universal (*"Reiniciar"*) que resetea la sesión a `scan_any` para permitir reintentar con cualquier cara.
- **Sincronización en PC ([`useOcrScanner.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/register/composables/useOcrScanner.ts) y [`RegisterOcrPanel.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/register/components/RegisterOcrPanel.vue)):**
  - Manejo reactivo de `scan_any`, `waiting_reverse` ("Frontal listo (1/2) — Voltea la cédula") y `waiting_front` ("Reverso listo (1/2) — Escanea el frontal").
### 16. Importación de Miembros desde CSV y Soporte Transversal de Teléfono / WhatsApp / EPS
- **Normalización e Importación CSV ([`server/utils/csvNormalizer.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/utils/csvNormalizer.ts) y [`server/services/memberImportService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/memberImportService.ts)):**
  - Implementación del parser y normalizador de 13 columnas según especificación:
    1. Descarte automático de filas vacías.
    2. Conservación del ID de fila (AGxxx) como referencia para el reporte.
    3. Nombres en Title Case y división inteligente en `firstName` y `lastName`.
    4. Cédula obligatoria de 6 a 10 dígitos. Creación de ID temporal `PENDIENTE-AGxxx` cuando no se suministra cédula. Omisión de cédulas duplicadas en el archivo o ya existentes en la base de datos para revisión manual.
    5. Teléfono colombiano (10 dígitos). Detección y marcado de datos incompletos o inconsistencias (>10 dígitos) sin truncar.
    6. Normalización de fechas flexibles: `D/M/YYYY`, texto en español (`15 ene 1990`, `3 marzo 85`), y tratamiento de `00/00/0000` como nulo.
    7. Catálogo abierto de planes en mayúsculas; auto-creación de planes faltantes en `plans`.
    8. Normalización de valores monetarios enteros en pesos colombianos.
    9. Normalización de estados (`ACTIVO`, `VENCIDO`) y vinculación a suscripciones/pagos históricos sin distorsionar la caja activa diaria.
    10. Normalización de Tipo de Sangre y registro de EPS.
    11. Generación de reporte detallado con descarga en `.txt` desglosado por ID de fila.
- **Interfaz de Importación ([`app/modules/members/components/ImportMembersModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/components/ImportMembersModal.vue) y [`useMemberImport.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/composables/useMemberImport.ts)):**
  - Botón "Importar" en `ListView.vue`. Modal canónico en 3 fases: Carga por arrastre/clic, Previsualización y Auditoría previa con KPIs y tabla filtrable, y Reporte final de ejecución.
- **Soporte Transversal de Teléfono y Enlace a WhatsApp:**
  - **Base de Datos ([`drizzle/schema.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/drizzle/schema.ts) y [`server/lib/db.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/lib/db.ts)):** Columnas `phone` y `eps` agregadas y migradas de forma segura.
  - **Formulario de Registro ([`RegisterPersonalData.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/register/components/RegisterPersonalData.vue) y [`useRegisterForm.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/register/composables/useRegisterForm.ts)):** Inclusión permanente de campos Teléfono (+57) y EPS.
  - **Edición de Miembro ([`EditView.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/views/EditView.vue) y [`memberService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/memberService.ts)):** Habilitación de edición única de Cédula si el socio tiene ID temporal `PENDIENTE-`. Campos de teléfono y EPS editables.
  - **Perfil del Socio ([`MemberDetailPanel.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/sections/MemberDetailPanel.vue)):** Enlace directo a WhatsApp (`https://wa.me/57<número>`) cuando el teléfono está presente, y badge de EPS.
- **Compilación de Distribución e Instalador:** Nuxt compilado y nuevo instalador generado en `installer/output/GymOS-Setup.exe`.
### 17. Normalización de Planes Específicos, EPS en Observaciones y Vinculación Histórica de Fechas
- **Tratamiento de EPS e Información Médica:**
  - Se eliminó el campo y badge independiente de EPS tanto del formulario de registro (`RegisterPersonalData.vue`), edición (`EditView.vue`), como del panel de detalle (`MemberDetailPanel.vue`).
  - La EPS, información sobre migraña, alergias y otras condiciones médicas se consolidan en el campo `notes` ("Notas médicas o información adicional / Observaciones").
  - En el importador de CSV (`memberImportService.ts`), la columna 12 (EPS) se concatena automáticamente en las observaciones del socio (`EPS: <nombre_eps>`).
- **Restricción Estricta de Planes:**
  - Se configuraron y auto-crearon en la base de datos (`server/lib/db.ts` y `server/services/memberImportService.ts`) únicamente los planes autorizados:
    1. **Plan Mensual Pro** (30 días, estándar, $95.000)
    2. **Estudiante** (30 días, estándar, $80.000)
    3. **Quincena** (15 días, estándar, $50.000)
    4. **Pareja** (30 días, grupal hasta 2 miembros, $87.500)
    5. **Promo 2x1** (30 días, promocional hasta 2 miembros, $60.000)
    6. **Tiquetera** (30 días, estándar, $60.000)
  - **Tratamiento de "ESPECIAL":** Las filas con plan `ESPECIAL` en el archivo CSV se asignan al plan base `Plan Mensual Pro`, aplicando el monto correspondiente con descuento especial (`customPriceReason: 'Tarifa especial importada'`).
  - Se previno la creación de planes arbitrarios o duplicados durante la importación.
- **Vinculación Histórica de Fechas (Conforme al Sistema Actual):**
  - **Fecha de Inscripción (`members.createdAt`):** Se asigna a partir de la `FECHA INSCRIPCIÓN` del CSV (o `FECHA ÚLTIMO PAGO` como fallback).
  - **Fecha de Inicio de Suscripción (`subscriptions.startDate`):** Se asigna a partir de la `FECHA ÚLTIMO PAGO` (o `FECHA INSCRIPCIÓN`).
  - **Fecha de Vencimiento (`subscriptions.endDate`):** Se asigna a partir de la `FECHA VENCIMIENTO` (o calculada sumando `durationDays` del plan).
  - **Fecha de Pago (`payments.paidAt` y `payments.createdAt`):** Se asigna a partir de la `FECHA ÚLTIMO PAGO` para preservar fielmente el ciclo contable del socio sin impactar el balance de caja abierta de hoy.
- **Compilación de Distribución e Instalador:**
  - Se ejecutó `build.ps1` y se re-compiló el instalador nativo con Inno Setup en `installer/output/GymOS-Setup.exe`.

## Sesión: 10 de Septiembre de 2026 (Corrección de Layout en Edición, Eliminación de Planes Pre-creados, Filtro de Archivados en Home y Balance Total)

### 1. Ajuste de Layout en Vista de Edición de Miembro
- **Componente Afectado:** [`app/modules/members/views/EditView.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/views/EditView.vue).
- Tras remover el campo EPS, el input de Teléfono / Celular ocupaba únicamente media fila en el grid. Se añadió la clase `col-span-2` a `<AppInput v-model="member.phone" ... />`, garantizando que cubra el ancho completo del formulario en armonía visual.

### 2. Erradicación de Planes Pre-creados y Creación Estricta Bajo Demanda
- **Archivos Afectados:**
  - [`server/lib/db.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/lib/db.ts)
  - [`server/services/memberImportService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/memberImportService.ts)
  - Base de datos activa `%APPDATA%\GymOS\sqlite.db`
- **Diagnóstico:** Los planes (`Estudiante`, `Quincena`, `Pareja`, `Promo 2x1`, `Tiquetera`) se habían pre-sembrado en la base de datos al inicializar la app, cuando en realidad eran directrices de normalización para el importador de CSV.
- **Solución:**
  - Se eliminó el auto-seed prematuro de `predefinedPlans` en `server/lib/db.ts` y se ejecutó la limpieza en la base de datos para retener únicamente `Plan Mensual Pro` (`id: 1`).
  - `memberImportService.ts` fue modificado para consultar e insertar dichos planes en la tabla `plans` **únicamente bajo demanda** cuando una fila del CSV los requiera explícitamente. Las filas con `ESPECIAL` se asocian al plan base aplicando el descuento correspondiente.

### 3. Exclusión de Miembros Archivados en Widget de Plan Popular
- **Servicio Afectado:** [`server/services/dashboard/popularPlanService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/dashboard/popularPlanService.ts).
- **Diagnóstico:** La consulta calculaba las métricas de suscriptores directamente sobre la tabla `subscriptions` sin cruzar con `members`, por lo que archivar a un socio no disminuía el conteo en el Home.
- **Solución:** Se añadió un `innerJoin(members, eq(subscriptions.memberId, members.id))` con la condición `where(eq(members.isArchived, false))` y conteo de miembros distintos (`COUNT(DISTINCT subscriptions.memberId)`). Al archivar o desarchivar un socio, el widget del plan más popular refleja de inmediato la cifra exacta.

### 4. Transición de "Ingresos" a "Balance Total" en Home
- **Archivos Afectados:**
  - [`server/services/dashboard/revenueService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/dashboard/revenueService.ts)
  - [`server/services/dashboard/types.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/dashboard/types.ts)
  - [`app/modules/dashboard/composables/useDashboard.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/dashboard/composables/useDashboard.ts)
  - [`app/modules/dashboard/components/RevenueChart.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/dashboard/components/RevenueChart.vue)
- **Motivación:** El panel del dashboard únicamente mostraba ingresos brutos, sin considerar egresos (reembolsos, gastos operativos, compras de insumos).
- **Solución:**
  - Se implementó el cálculo del `totalBalance` (`totalIncome - totalExpenses`) integrando la totalidad de entradas y salidas de `cash_movements`.
  - El panel superior derecho del Home ahora exhibe el **Balance Total**, el cambio porcentual respecto al mes anterior y el enlace directo al arqueo detallado en `/cash`.

## Sesión: 10 de Septiembre de 2026 (Soporte de Plan Especial Bajo Demanda para Trabajadores y Accesos de Personal sin Cobro)

### 1. Detección Inteligente y Asignación de Plan Especial
- **Archivos Afectados:**
  - [`server/services/memberImportService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/memberImportService.ts)
  - [`server/lib/db.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/lib/db.ts)
  - [`server/services/dashboard/popularPlanService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/dashboard/popularPlanService.ts)
- **Regla de Negocio Implementada:**
  - Cuando una fila entrante del CSV presenta:
    - Monto `$0` (`amount === 0`),
    - Estado `ACTIVO` (`status === 'ACTIVO'`), y
    - Ausencia de fecha de inicio de pago / fechas `00/00/0000` (`!lastPaymentDate`), o tipo de plan `ESPECIAL` con valor `$0`:
  - El sistema clasifica automáticamente el registro como caso de **Trabajador / Personal del Gimnasio**.
  - Si no existe previamente en la tabla `plans`, crea de forma dinámica y bajo demanda el plan **`Especial`** (`price: 0`, `durationDays: 365`, `description: 'Plan especial (Trabajadores / Cortesía)'`).
  - Si una fila tiene `ESPECIAL` con un monto superior a $0 (`amount > 0`), sigue operando como socio regular con tarifa de descuento asociada a `Plan Mensual Pro`.
- **Efectos en Interfaz y Perfil:**
  - Los trabajadores quedan con suscripción activa por 365 días a costo $0, mostrándose en el directorio de miembros con **punto verde brillante (Activo)** y badge verde **`ESPECIAL`**.
  - Suman de forma natural al contador de miembros activos en el directorio y dashboard.
  - En sus observaciones se añade automáticamente la nota `[Personal / Acceso Autorizado]`.
  - En `popularPlanService.ts`, se excluye el plan `Especial` del cálculo de "Plan Más Popular" comercial para preservar la exactitud de las métricas de venta.

## Sesión: 10 de Septiembre de 2026 (Optimización de Directorio con Infinite Scroll, Top 10 Próximos a Vencer, Tipografía Coherente en Preview y Régimen Especial "No Vence")

### 1. Tipografía y Jerarquía Coherente en Preview de Importación
- **Componente Afectado:** [`app/modules/members/components/ImportMembersModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/components/ImportMembersModal.vue).
- **Ajustes:**
  - Dimensiones del modal ampliadas a `max-w-5xl` con contenedor con scroll vertical delimitado (`max-h-80`).
  - Alineación de tipografías conforme a la skill `gymos-design`:
    - Métricas KPI: etiquetas en `text-[11px] font-bold uppercase tracking-wider` y valores destacados en `font-display text-2xl lg:text-3xl`.
    - Pestañas de filtrado (*Todos, Listos, Advertencias, Omitidos*): `text-xs font-bold` con contadores en pills.
    - Cabeceras de tabla: `text-xs font-bold uppercase tracking-wider text-muted`.
    - Celdas y alertas: `text-xs lg:text-sm` con badges adaptativos según el estado de la fila.

### 2. Lazy Loading con Peticiones Encadenadas por Scroll ("Doom Scrolling")
- **Archivos Afectados:**
  - [`server/services/memberService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/memberService.ts)
  - [`server/api/members/index.get.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/api/members/index.get.ts)
  - [`app/modules/members/composables/useMembers.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/composables/useMembers.ts)
  - [`app/modules/members/sections/MemberListSection.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/sections/MemberListSection.vue)
  - [`app/modules/members/views/ListView.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/views/ListView.vue)
- **Diagnóstico:** Tras importar más de 100 socios, el servidor sufría un cuello de botella por 100+ subqueries concurrentes individuales a `subscriptions` y la vista colapsaba al montar todas las tarjetas completas de una sola vez.
- **Solución:**
  - Paginación server-side en lotes de 25 (`limit=25`, `offset`).
  - Optimización SQL de subqueries N+1 mediante consulta por lotes (`inArray(subscriptions.memberId, memberIds)`).
  - Centinela invisible con `IntersectionObserver` en `MemberListSection.vue` que activa `loadMore()` de forma suave cuando el usuario se acerca al fondo de la lista.
  - Indicador inferior de carga con spinner y mensaje de fin de lista.

### 3. Restricción a los 10 Primeros Próximos a Vencer
- **Archivos Afectados:**
  - [`server/services/memberService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/memberService.ts)
  - [`server/api/members/upcoming.get.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/api/members/upcoming.get.ts)
  - [`app/ui/components/SecondarySidebar.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/ui/components/SecondarySidebar.vue)
- **Ajustes:**
  - Creación de `getUpcomingExpiringMembers(10)` y ruta `/api/members/upcoming`.
  - Orden cronológico estricto por fecha de fin con `LIMIT 10` y exclusión de planes especiales.
  - En la barra lateral secundaria, el bloque de "Próximos a Vencer" consume estos 10 registros sin sobrecargar la interfaz.

### 4. Régimen Especial con "No Vence"
- **Archivos Afectados:**
  - [`server/services/memberImportService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/memberImportService.ts)
  - [`app/modules/members/sections/MemberListSection.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/sections/MemberListSection.vue)
  - [`app/modules/members/sections/MemberDetailPanel.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/sections/MemberDetailPanel.vue)
  - [`app/modules/members/components/SubscriptionBadge.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/components/SubscriptionBadge.vue)
  - [`app/modules/members/components/RenewPlanModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/components/RenewPlanModal.vue)
  - [`app/ui/components/SecondarySidebar.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/ui/components/SecondarySidebar.vue)
- **Ajustes:**
  - En base de datos se guarda `subEndDate: '2099-12-31'` para cumplir con la integridad referencial y garantizar que las consultas de estado sigan viéndolos activos.
  - En interfaz de usuario, se detecta el régimen y se muestra explícitamente **"No vence"** con punto verde en listas, badges y panel de detalle.
  - Se excluyen de los listados de vencimientos próximos.
  - En `RenewPlanModal.vue`, si un miembro especial renueva con un plan pago estándar, la fecha de inicio parte desde la fecha actual.

### 5. Compilación y Nuevo Instalador
- Validación completa de Nuxt (`npm run build`).
- Empaquetado con `installer/build.ps1`.
- Compilación final con Inno Setup en `installer/output/GymOS-Setup.exe`.

## Sesión: 10 de Septiembre de 2026 (Homologación Tipográfica en Planes, Corrección de Cancelaciones y Relación de Métricas en Dashboard)

### 1. Homologación de Tipografías y Diseño en Detalle de Plan
- **Componente Afectado:** [`app/modules/plans/views/PlanDetailView.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/plans/views/PlanDetailView.vue).
- **Ajustes:**
  - Se alinearon las fuentes y proporciones de la tabla de miembros según la skill `gymos-design`:
    - Cabeceras: `bg-surface-2 text-muted uppercase font-bold text-xs tracking-wider border-b border-border py-3.5 px-4`.
    - Celdas: `py-3.5 px-4 text-xs lg:text-sm font-body`.
    - Avatares: `w-9 h-9 rounded-xl` con iniciales en `text-xs font-display font-bold`.
    - Cédulas temporales (`PENDIENTE-AGxxx`): Resaltadas con `text-warning font-semibold`.
    - Soporte para régimen especial: Detección con `isNoExpiryPlan` para mostrar "No vence" en `text-success font-medium`.
    - Badges de estado: `px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider`.
    - Botón "Mover de Plan": `px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider`.
    - KPIs superiores y buscador homologados con el resto del sistema.

### 2. Corrección del Indicador de Cancelaciones / No Renovaciones en Dashboard
- **Archivos Afectados:**
  - [`server/services/dashboard/churnService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/dashboard/churnService.ts)
  - [`app/modules/dashboard/components/ExpenseChart.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/dashboard/components/ExpenseChart.vue)
- **Diagnóstico y Corrección:**
  - La condición `eq(subscriptions.status, 'active')` en churn impedía contabilizar socios vencidos o cancelados (cuyo estado en BD es `'expired'` o `'cancelled'`).
  - Ahora se contabilizan todos los miembros no archivados cuya última suscripción está vencida o cancelada sin renovación activa (60 de 119 miembros, tasa del 50%).
  - Se eliminó el uso de `Math.random()` en la gráfica de 7 días, alimentándose de los datos reales de fecha de expiración/cancelación.
  - La tarjeta ahora exhibe `50%` y `60 de 119 miembros` con tipografía `text-2xl lg:text-3xl font-display font-bold`.

### 3. Relación Exacta de Nuevos, Renovaciones y No Renovados en el Plan Más Popular
- **Archivos Afectados:**
  - [`server/services/dashboard/popularPlanService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/dashboard/popularPlanService.ts)
  - [`app/modules/dashboard/components/PopularPlanWidget.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/dashboard/components/PopularPlanWidget.vue)
- **Lógica y Visualización:**
  - Descomposición exacta para los 63 miembros de Plan Mensual Pro: 7 Nuevos usuarios en su primer ciclo + 16 Renovaciones activas + 40 No renovados = 63 Usuarios totales (100%).
  - Se eliminaron las clases `opacity-0` que ocultaban las etiquetas al no estar en hover.
  - Las 3 barras y sus conteos se encuentran ahora permanentemente visibles con etiquetas claras: `7 Nuevos`, `16 Renovaciones`, `40 No renovados`.

### 4. Compilación y Nuevo Instalador
- Verificación completa de Nuxt (`npm run build`).
- Empaquetado con `installer/build.ps1`.
- Compilación final con Inno Setup en `installer/output/GymOS-Setup.exe`.

## Sesión: 11 de Septiembre de 2026 (Microservicio Relay en Vercel, Erradicación de URLs Bloqueadas y Homologación en Editar Miembro)

### 1. Diagnóstico de Bloqueo de Red en iPhone / Operadores Móviles
- **Diagnóstico:** Se analizó el caso donde la conexión por QR en móviles (específicamente iPhone 15 en iOS 17 sobre datos móviles) rechazaba la conexión. Se determinó que los subdominios efímeros de Cloudflare Quick Tunnels (`*.trycloudflare.com`) son filtrados activamente a nivel DNS por operadores celulares en Colombia (Claro/Movistar) y por la Retransmisión Privada de iCloud (*iCloud Private Relay*).

### 2. Creación del Microservicio Relay en Vercel (`relay-vercel/`)
- Se creó una arquitectura desacoplada serverless en `relay-vercel/`:
  - `public/cam/index.html`: Web móvil con diseño Gym AGOD para captura en vivo y disparador nativo `<input type="file" capture>`.
  - `api/cam-signal.ts`: Endpoint serverless que gestiona la carga de imágenes con retención temporal (TTL 5 min en Vercel KV / memoria), consulta de estado y purga por DELETE.
  - Subdominio permanente y reputado (`*.vercel.app`) con SSL confiable, 100% inmune a bloqueos de operadoras y de Apple.

### 3. Integración en GymOS Desktop (`nuxt-app/`)
- **Configuración (`server/utils/config.ts`):** Lectura de `GYMOS_RELAY_URL` desde entorno o SQLite (`gym_config`).
- **Endpoint de Túnel (`server/api/tunnel.ts`):** Generación automática de URLs de Vercel para los códigos QR cuando el relay está activo, manteniendo el selector a WiFi local. Acciones añadidas: `set_relay` y `clear_relay`.
- **Polling y Descarga (`server/api/cam-signal/[session].ts`):** Consulta automática al Relay de Vercel en segundo plano, descarga de foto hacia SQLite local, ejecución de OCR offline y purga automática en Vercel.
- **Homologación de UI:**
  - `ProfilePhotoScanner.vue`: Incorporación de controles de red (`Vercel (HTTPS)` / `WiFi Local`), estado de conexión y botón de reconexión.
  - `RegisterOcrPanel.vue` y `ProductFormModal.vue`: Detección dinámica y visualización de Vercel en las etiquetas de modo de red.
- **Compilación:** Verificación con `pnpm --filter nuxt-app build` completada con 0 errores (código 0).

## Sesión: 15 de Septiembre de 2026 (Corrección Transversal de Validación de Precios, Auto-Actualizador Autónomo y Skill de Release a Google Drive)

### 1. Corrección Transversal de Validación de Precios y Múltiplos
- **Diagnóstico:** Los inputs numéricos en formularios y modales (`ProductFormModal.vue`, `UnifiedMovementModal.vue`, `CloseRegisterModal.vue`, etc.) tenían configurado `step="500"` o `step="1000"`. Al enviarse el formulario HTML5, el navegador disparaba el error de validación nativa `stepMismatch` al ingresar valores enteros válidos que no fueran múltiplos exactos (ej. `$2.100` o `$2.990`), impidiendo agregar o editar productos y movimientos.
- **Solución Implementada:**
  - En [`AppInput.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/ui/components/AppInput.vue), se estableció `:step="step ?? (type === 'number' ? 'any' : undefined)"` para garantizar inmunidad global frente a restricciones de paso.
  - Se removieron los atributos restrictivos `step="500"` y `step="1000"` en:
    - [`ProductFormModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/inventory/components/ProductFormModal.vue) (Precio de Venta y Costo Unitario).
    - [`UnifiedMovementModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/UnifiedMovementModal.vue) (Monto libre y edición inline de partidas en canasta).
    - [`EditMovementModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/EditMovementModal.vue), [`ExpenseModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/ExpenseModal.vue) y [`SporadicIncomeModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/SporadicIncomeModal.vue).
    - [`OpenRegisterModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/OpenRegisterModal.vue) y [`CloseRegisterModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/CloseRegisterModal.vue).
    - [`PlanForm.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/plans/components/PlanForm.vue), [`RefundSubscriptionModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/components/RefundSubscriptionModal.vue) y [`RenewPlanModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/members/components/RenewPlanModal.vue).

### 2. Sistema de Auto-Actualización Autónoma (Auto-Updater)
- **Servicio Backend ([`server/services/updateService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/updateService.ts)):**
  - Detección de versiones remotas mediante comparación SemVer contra el manifiesto/relay.
  - Descargador resiliente de instaladores desde Google Drive con seguimiento en vivo de progreso (bytes y porcentaje).
  - Lanzador de instalación silenciosa en segundo plano (`Inno Setup /VERYSILENT /SUPPRESSMSGBOXES /FORCECLOSEAPPLICATIONS /RESTARTAPPLICATIONS`) con reinicio automático de GymOS.
- **Rutas API Nitro:**
  - `GET /api/update/check`, `POST /api/update/download`, `GET /api/update/progress`, `POST /api/update/apply`.
- **Microservicio Relay ([`relay-vercel/api/version.ts`](file:///d:/Proyectos/inventario-gym/relay-vercel/api/version.ts)):**
  - Endpoint seguro para consultar y registrar la última versión disponible y el enlace directo de Google Drive.
- **Frontend ([`AppUpdateBanner.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/ui/components/AppUpdateBanner.vue) y [`useAutoUpdater.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/composables/useAutoUpdater.ts)):**
  - Notificación visual estilizada con diseño Gym AGOD, barra de progreso reactiva y botón de reinicio automático.

### 3. Skill de Publicación y Distribución en Google Drive
- **Skill Creada ([`.agents/skills/google-drive-release/SKILL.md`](file:///d:/Proyectos/inventario-gym/.agents/skills/google-drive-release/SKILL.md)):**
  - Documentación y flujo automatizado para el versionado, compilación con Inno Setup, subida a Google Drive y publicación de actualización.
- **Script Auxiliar ([`installer/publish-drive.mjs`](file:///d:/Proyectos/inventario-gym/installer/publish-drive.mjs)):**
  - Herramienta CLI para publicar nuevas versiones hacia el microservicio y disparar la auto-actualización en todos los clientes.

## Sesión: 16 de Septiembre de 2026 (Reingeniería de Cierre de Caja con Paneles Separados, KPIs Reactivos a Filtros y Compras de Inventario)

### 1. Cierre de Caja con Paneles Separados (Efectivo y Transferencias) y Corrección de Fórmulas
- **Archivos Afectados:**
  - [`app/modules/cash/components/CloseRegisterModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/CloseRegisterModal.vue)
  - [`app/modules/cash/views/CashRegisterView.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/views/CashRegisterView.vue)
  - [`server/services/cashService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/cashService.ts)
  - [`app/modules/cash/types/index.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/types/index.ts)
- **Problema:** En el modal de cierre solo se mostraba el efectivo y las fórmulas de suma en el frontend calculaban valores indirectos inconsistentes.
- **Solución:**
  - Se rediseñó `CloseRegisterModal.vue` (`max-w-2xl`) con **dos paneles visuales independientes**:
    1. **Panel 1 (Efectivo en Cajón):** Base inicial, ingresos cash, egresos cash, efectivo esperado, input de conteo real y badge en tiempo real de cuadre (cuadrada, sobrante, faltante).
    2. **Panel 2 (Transferencias Bancarias):** Ingresos por banco, egresos por banco y balance neto digital.
  - En `cashService.ts` (`getRegisterSessionDetails` y `closeRegister`), se calculan de manera precisa y directa: `cashIncome`, `cashExpenses`, `expectedCashInDrawer`, `transferIncome`, `transferExpenses` y `netTransfer`.
  - En `CashRegisterView.vue`, se eliminaron fórmulas indirectas y se pasan los props calculados transparentemente desde el backend.

### 2. KPIs y Balances Superiores 100% Dinámicos y Reactivos a Filtros
- **Componente Afectado:** [`app/modules/cash/views/CashRegisterView.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/views/CashRegisterView.vue).
- **Problema:** Al cambiar el filtro de "Método de Pago" (Efectivo / Transferencia) o de "Categoría", los 4 KPIs de balance superior permanecían estáticos con los totales globales.
- **Solución:**
  - Se implementó `filteredSummary` computado en vivo a partir de `filteredMovements`.
### 3. Registro de Compras de Inventario / Reabastecimiento de Stock desde Caja
- **Archivos Afectados:**
  - [`app/modules/cash/components/UnifiedMovementModal.vue`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/components/UnifiedMovementModal.vue)
  - [`server/services/cashService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/cashService.ts)
  - [`server/api/cash/purchase.post.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/api/cash/purchase.post.ts)
  - [`app/modules/cash/composables/useCashRegister.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/app/modules/cash/composables/useCashRegister.ts)
- **Problema:** Los productos de inventario solo podían agregarse como ventas que restaban stock. No era posible registrar una compra o reabastecimiento que sumara stock físico e impactara la caja como egreso.
- **Solución:**
  - En `UnifiedMovementModal.vue`:
    - En el buscador y en el bloque de agregar rápido, cada producto ofrece botones directos para `+ Venta` (si hay stock disponible) y `- Compra Stock` (incluso con stock 0).
    - En las partidas agregadas, los productos cuentan con un toggle directo `[+ Venta | - Compra Stock]`, campo de costo unitario editable y cálculo de subtotal.
  - En `cashService.ts`, se implementó `recordProductPurchase`:
    - Ejecuta una transacción atómica que registra el egreso en `cash_movements` con `saleItems` e **incrementa** el stock del producto (`products.stock + quantity`).
    - En `deleteCashMovement`, se programó la reversión atómica bidireccional (si se anula una compra, descuenta el stock previamente sumado; si se anula una venta, restituye el stock vendido).
  - Nuevo endpoint Nitro `POST /api/cash/purchase`.

### 4. Corrección de Descarga en Auto-Updater (Bypass de Pantalla de Advertencia de Google Drive)
- **Archivos Afectados:**
  - [`server/services/updateService.ts`](file:///d:/Proyectos/inventario-gym/nuxt-app/server/services/updateService.ts)
  - [`installer/drive-uploader.mjs`](file:///d:/Proyectos/inventario-gym/installer/drive-uploader.mjs)
- **Diagnóstico del Fallo:**
  - Al presionar "Actualizar", la descarga se quedaba en 0% infinitamente o finalizaba prematuramente.
  - Al superar los 50-90 MB en ejecutables (`.exe`), Google Drive no entrega el binario de inmediato, sino una página HTML intermedia de advertencia (*"Google Drive has detected issues with your download / cannot perform a virus check"*).
  - El motor de descarga anterior interpretaba el HTML como el archivo final o se bloqueaba al esperar el stream binario sin resolver el formulario.
- **Solución Implementada:**
  - Se reprogramó `downloadUpdate` en `updateService.ts` con manejo de cookies de sesión (`Set-Cookie`) y detección inteligente de formularios de confirmación (`download-form`, `uuid`, `confirm=t`).
  - Si Google Drive presenta la pantalla de advertencia, el descargador extrae automáticamente el token `uuid` y redirige la petición hacia `https://drive.usercontent.google.com/download` con las cookies preservadas, recibiendo el stream binario completo de 92.00 MB con seguimiento reactivo de porcentaje (`downloadedBytes / totalBytes * 100`).
  - Se reempaquetó y publicó la versión **v1.0.7** en Google Drive y Vercel Relay.






