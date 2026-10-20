# Registro de Decisiones de Arquitectura e Implementación (DECISIONS.md)

Este documento registra las decisiones tomadas para resolver aspectos ambiguos o de diseño, priorizando la opción más simple y robusta según la especificación del proyecto.

---

### D1. Estilos: Selección de Tailwind CSS
- **Contexto**: La especificación permitía elegir entre CSS Modules o Tailwind CSS siendo consistente.
- **Decisión**: Se selecciona **Tailwind CSS**.
- **Justificación**: Facilita el cumplimiento de los requisitos no funcionales de móvil primero (zonas táctiles $\ge 44\text{px}$, disposición ergonómica a una mano, clases para `dark:`, transiciones sutiles $\le 200\text{ms}$ y layout responsivo) sin proliferación de archivos CSS fragmentados.

### D2. Normalización de Cadenas
- **Contexto**: `name_normalized` debe ser trim, minúsculas y sin tildes (`normalize('NFD')` + eliminar diacríticos). "Leche", "leche" y "Léche" deben ser iguales.
- **Decisión**: Se implementa la función en `src/lib/normalize.js` usando:
  ```js
  export function normalizeName(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
  ```
- **Justificación**: Es la forma estándar y sin dependencias de descomponer caracteres Unicode y eliminar marcas diacríticas (acentos, diéresis, etc.) conservando el resto del texto.

### D3. Estrategia de Autenticación Compartida
- **Contexto**: Uso personal para 2 personas que comparten una única cuenta de Supabase. Sin pantalla de registro público.
- **Decisión**: La aplicación solo presenta formulario de inicio de sesión (email y contraseña). La sesión persiste automáticamente gracias al cliente de Supabase (`persistSession: true` por defecto en `@supabase/supabase-js`). Se incluye botón accesible para cerrar sesión si se requiere cambiar de cuenta.
- **Justificación**: Respeta estrictamente la premisa de no añadir roles ni pantallas de registro innecesarias.

### D4. Navegación Móvil
- **Contexto**: Dos pantallas principales requeridas: Lista y Catálogo.
- **Decisión**: Barra de navegación inferior fija (*bottom navigation bar*) con dos pestañas amplias con iconos de `lucide-react` (`ShoppingCart` y `Layers`), zonas táctiles holgadas ($\ge 48\text{px}$) y estado activo claramente diferenciado.
- **Justificación**: Proporciona ergonomía óptima para uso con el pulgar en pantallas de $\sim 375\text{px}$.

### D5. Extensión de Archivos con JSX
- **Contexto**: Uso de Vite con React y JavaScript estándar.
- **Decisión**: Todos los módulos y hooks que retornan elementos JSX utilizan extensión `.jsx` (ej. `src/hooks/useAuth.jsx`), mientras que utilidades puras de lógica usan `.js` (ej. `src/lib/normalize.js`).
- **Justificación**: Compatibilidad nativa y rápida con el transformador de Vite sin requerir plugins esbuild adicionales.

### D6. Comprobación y Mensaje de Unicidad Global de Artículos
- **Contexto**: F2 requiere rechazar artículos duplicados indicando en qué categoría existen.
- **Decisión**: Se implementa `checkArticleExistsGlobal` en `articlesService.js` realizando un `select` con join a `categories(name)` por `name_normalized`. Si coincide, se extrae el nombre legible de la categoría y se muestra el mensaje específico: `"El artículo 'X' ya existe en la categoría 'Y'"`.
- **Justificación**: Brinda feedback inmediato al usuario sin ambigüedades sobre dónde está ubicado el artículo.

### D7. Flujo de Eliminación Condicional de Artículos
- **Contexto**: F2 estipula confirmación de eliminación solo si el artículo está en la lista.
- **Decisión**: Al pulsar el icono de papelera de un artículo en el catálogo, se consulta si existe en `list_items`. Si no está en la lista, se borra de inmediato; si está en la lista, se abre un diálogo modal de confirmación con advertencia explícita.
- **Justificación**: Agiliza la gestión de catálogo para artículos no activos, manteniendo la precaución para los que están en la lista actual.

### D8. Captura Rápida en $\le 3$ Toques y Creación sobre la Marcha
- **Contexto**: F3 requiere añadir un artículo existente en $\le 3$ toques desde la pantalla principal, y permitir crear sobre la marcha dentro de una categoría o sugerir existentes si ya existen en otra categoría.
- **Decisión**: El botón de acción flotante (FAB) inferior abre un modal con selector directo de categorías (pills con scroll horizontal), control de cantidad (+ / - con valor inicial 1) y lista de artículos. Tocar FAB (1) $\rightarrow$ Tocar categoría (2) $\rightarrow$ Tocar artículo (3) añade de inmediato a la lista vía RPC `add_to_list`. Además, al escribir en el campo de texto, si no existe se ofrece "Crear y añadir a la lista" en un solo paso; y si coincide con otra categoría, se avisa explícitamente ofreciendo añadir el artículo ya existente.
- **Justificación**: Cumple con la ergonomía móvil y la cota estricta de toques sin saturar la pantalla.

### D9. Agrupación y Orden en Lista Continua
- **Contexto**: F4 requiere mostrar la lista agrupada por categoría, sin mostrar categorías vacías, y con los comprados tachados al final de su grupo.
- **Decisión**: Se procesa la lista agrupando en un Map según `category_id`. Dentro de cada grupo se colocan primero los artículos pendientes y al final los marcados con `purchased = true`, con estilo tachado (`line-through opacity-60`).
- **Justificación**: Claridad visual óptima al hacer la compra en el supermercado pasillo por pasillo.

### D10. Reducción de Cantidad a Cero
- **Contexto**: F5 estipula que si la cantidad baja a 0 mediante los controles `- / +`, se quita el elemento de la lista.
- **Decisión**: Al presionar `-` cuando la cantidad es 1, se llama a la eliminación de `list_items` de forma optimista.
- **Justificación**: Flujo intuitivo sin botones redundantes de confirmación para eliminar un ítem de la lista activa.

### D11. Cierre de Compra (F8)
- **Contexto**: F8 requiere que el botón de cerrar compra esté deshabilitado si no hay comprados, y pedir confirmación con recuento exacto de comprados y pendientes.
- **Decisión**: Se implementa `ClosePurchaseModal` mostrando: *"Se cerrarán N comprados; M siguen pendientes"*, ejecutando la función RPC `close_purchase()`.
- **Justificación**: Garantiza una operación atómica y previene borrados accidentales de artículos que aún no se han comprado.

### D12. Consulta Offline y Caché en `localStorage`
- **Contexto**: La aplicación debe poder consultarse sin conexión (la lista debe verse al abrir la app sin red) y ser una PWA instalable.
- **Decisión**: Se implementa `storage.js` con guardado automático en `localStorage` de la lista de la compra, categorías y artículos tras cada fetch exitoso. En los componentes, el estado inicial se hidrata inmediatamente desde la caché local, permitiendo visualización en frío instantánea sin cobertura. La PWA precachea el app shell con `vite-plugin-pwa` (service worker).
- **Justificación**: Cumple el requisito no funcional de consulta sin conexión sin introducir complejidad de base de datos local pesada.

### D13. Política de Reversión y Aviso en Fallos de Red
- **Contexto**: Sin conexión, las modificaciones NO están soportadas. Si una operación falla por red, debe mostrarse el aviso exacto: *"Sin conexión: el cambio no se guardó"* y revertir cualquier cambio visual.
- **Decisión**: Se valida la conectividad previa (`!navigator.onLine`). Si está online se aplican actualizaciones optimistas guardando el estado previo en `useRef`; ante cualquier fallo de red detectado por `isNetworkError()`, se restaura inmediatamente el estado previo y se despliega un banner flotante con el texto requerido.
- **Justificación**: Se evita que el usuario crea falsamente que una compra o cantidad fue guardada cuando no hubo persistencia en la base de datos remota.

### D14. Sincronización en Tiempo Real (Realtime)
- **Contexto**: Sincronización continua de `list_items` entre los 2 dispositivos sin recarga manual.
- **Decisión**: Suscripción al canal de cambios de Postgres en `list_items` (`supabase.channel('public:list_items_realtime').on('postgres_changes', ...)`). Cada evento dispara un refresco silencioso de los datos y actualiza la caché local. Política de última escritura gana.
- **Justificación**: Garantiza consistencia inmediata entre ambos móviles mientras están en el supermercado o en casa.

### D15. Modo Host de Red Local para Pruebas Multidispositivo
- **Contexto**: El usuario solicitó poder probar la aplicación en red local (desde el móvil conectado al mismo WiFi) y no únicamente en localhost.
- **Decisión**: Se configuró `server: { host: true, port: 5173 }` en `vite.config.js` y `"dev": "vite --host"` en `package.json`.
- **Justificación**: Permite que al ejecutar `npm run dev`, Vite imprima la IP de la red local (ej. `http://192.168.1.X:5173`) para que ambos teléfonos móviles puedan abrir la PWA directamente e instalarla en la pantalla de inicio.

### D16. Modo Local en Supermercado con Cola de Sincronización (Offline Sync Queue)
- **Contexto**: El usuario especificó que en muchos supermercados no hay buena cobertura móvil, por lo que la app debe seguir funcionando en local: permitir tachar/marcar artículos, ajustar cantidades, añadir y quitar elementos, sin bloquear al usuario ni perder sus cambios.
- **Decisión**: Se implementó una cola de operaciones persistente en `localStorage` (`src/lib/offlineQueue.js`).
  - Al realizar cualquier acción en la lista (tachar comprado, alterar cantidad, quitar, añadir, cerrar compra) sin cobertura:
    1. Se muta inmediatamente la interfaz visual y la caché local en `localStorage` (la lista se mantiene actualizada y tachada en el móvil).
    2. Se encola la acción en la cola offline FIFO.
    3. Se muestra un indicador sutil: *"Modo local · N pend."*.
  - En cuanto el dispositivo recupera conexión a internet (evento `online` o reapertura con red):
    1. Se procesan automáticamente las acciones en orden FIFO contra Supabase.
    2. Se refresca la lista remota de forma silenciosa para que el otro dispositivo reciba los cambios mediante Realtime.
    3. Se notifica al usuario: *"Sincronizados N cambios locales con el servidor"*.
- **Justificación**: Proporciona una experiencia de compra 100% fluida dentro de supermercados subterráneos o con mala señal, garantizando que al salir a la calle o conectar a WiFi todo se sincronice de forma transparente.
