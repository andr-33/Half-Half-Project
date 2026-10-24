# Half & Half 🛒 (v1.1)

App personal y minimalista de lista de la compra continua diseñada para miembros que comparten despensa y hogar. Pensada *mobile-first* para capturar rápidamente lo que falta en casa y consultarla/tildarla en el súper, con soporte en tiempo real, identidad visual por miembro, acceso ultrarrápido mediante tag NFC y modo local para supermercados sin cobertura.

---

## 🚀 Novedades de la versión 1.1

- **Identidad propia por miembro**: Cada persona cuenta con su propio usuario, alias (1-10 caracteres) y color exclusivo de autoría (entre 10 tonos predefinidos).
- **Acceso por Tag NFC**: Basta con acercar el móvil a una etiqueta NFC física para iniciar sesión al instante (`#k=<CLAVE>`), sin teclear contraseñas.
- **Autoría visual en la lista**: Cada producto muestra un fondo suave y borde de 2px con el color intenso del miembro que lo añadió, junto a su avatar e inicial.
- **Subtítulo de actividad**: Indicador discreto en tiempo real bajo el título: *"Editado por &lt;alias&gt; · hace X min"*.
- **Prevención y avisos al añadir duplicados**:
  - Si el artículo ya está pendiente, avisa y permite sumar cantidad conservando al autor original.
  - Si ya está comprado en el carrito, avisa y permite reactivarlo como pendiente conservando al autor original.
- **Bloqueo de artículos comprados**: Los artículos tachados protegen su cantidad y no se pueden eliminar por error hasta desmarcarlos o cerrar la compra.
- **Nueva pestaña Perfil**: Navegación inferior con 3 pestañas (Lista, Catálogo y Perfil). Permite editar alias y color con selector desplegable y ver a los miembros del hogar.
- **Diseño neutro siempre en modo día**: Eliminado el modo oscuro (`color-scheme: light`). La interfaz es limpia y neutra (#1B1918), reservando el color exclusivamente a la autoría de cada miembro.

---

## 🛠️ Stack Tecnológico

- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vite.dev/) (JavaScript estándar)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/) (modo día estricto, paleta de autoría neutra y accesible)
- **Iconografía**: [Lucide React](https://lucide.dev/) exclusivamente
- **Backend as a Service**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Edge Functions, Realtime, Auth)
- **PWA & Offline**: `vite-plugin-pwa` + Service Worker (Workbox) + LocalStorage Sync Queue

---

## 📋 Estructura del Proyecto

```text
├── public/                 # Favicon e icono SVG de la PWA
├── src/
│   ├── components/         # Layout principal con 3 pestañas y Modal accesible
│   ├── features/
│   │   ├── auth/           # LoginView (login por email/password y manejo de tag NFC)
│   │   ├── profile/        # CreateProfileModal (onboarding F11), ProfileView (F12), membersService
│   │   ├── categories/     # Gestión de categorías (CRUD, validaciones, recuentos)
│   │   ├── articles/       # Gestión de artículos de catálogo (CRUD, unicidad global)
│   │   └── list/           # Lista de compra (autoría visual F14, avisos F15, cierre, RPCs)
│   ├── hooks/              # useAuth (gestión de sesión, NFC hash y member), useOnlineStatus
│   └── lib/                # supabaseClient, memberColors, formatRelativeTime, storage, offlineQueue
├── supabase/
│   ├── schema.sql          # Esquema base v1.0
│   ├── migrations/
│   │   └── v1_1.sql        # Migración v1.1 (members, member_keys, list_meta, triggers, RPC)
│   └── functions/
│       └── nfc-login/      # Supabase Edge Function para autenticación por hash de tag NFC
├── .env.example            # Plantilla de variables de entorno requeridas
└── README.md
```

---

## ⚙️ Configuración y Migración a v1.1 en Supabase

### 1. Migración de Base de Datos (v1.1)
Si ya tienes la v1.0 funcionando (o si partes de cero habiendo ejecutado primero `schema.sql`):
1. Entra al **SQL Editor** de tu proyecto en Supabase.
2. Copia y pega el contenido del archivo [`supabase/migrations/v1_1.sql`](supabase/migrations/v1_1.sql).
3. Pulsa **Run**.
4. Esta migración no destructiva e idempotente creará:
   - Tabla `members` (vinculada a `auth.users` con validación de alias y colores únicos).
   - Tabla `member_keys` (almacena el hash SHA-256 de las tags NFC, restringida a Service Role).
   - Columna `added_by` en `list_items`.
   - Tabla `list_meta` con trigger `trg_list_items_meta_update` para actualizar "Editado por" en tiempo real.
   - Nueva función RPC `add_to_list` con parámetro `p_force` y avisos F15.
   - Políticas RLS y publicaciones en Supabase Realtime para `members` y `list_meta`.

### 2. Despliegue de la Edge Function `nfc-login`
La Edge Function se encarga de recibir la clave del fragmento URL, calcular su hash SHA-256, buscar en `member_keys` y generar una sesión segura con `auth.admin.generateLink`.

1. Instala el CLI de Supabase si no lo tienes:
   ```bash
   npm install -g supabase
   ```
2. Inicia sesión en tu cuenta de Supabase:
   ```bash
   supabase login
   ```
3. Vincula tu proyecto:
   ```bash
   supabase link --project-ref <tu-project-id>
   ```
4. Despliega la función:
   ```bash
   supabase functions deploy nfc-login --no-verify-jwt
   ```

---

## 🏷️ Acceso por Tag NFC: Generación de Claves y Escritura

El acceso por tag NFC utiliza un fragmento de URL (`https://<app>/#k=<CLAVE>`). Al estar en el fragmento (hash `#`), la clave **nunca viaja al servidor en peticiones HTTP ni queda registrada en logs de red**. El cliente web captura el fragmento, lo borra inmediatamente de la barra de direcciones con `history.replaceState` y solicita la validación a la Edge Function.

### 1. Snippet SQL para asignar/regenerar una clave NFC a un miembro
Para asignar o cambiar la clave de una tag NFC, ejecuta este snippet en el **SQL Editor** de Supabase (reemplaza `'MI_CLAVE_SECRETA_AQUI'` por una cadena secreta aleatoria y `'Alex'` por el alias del miembro):

```sql
-- Asegurar extensión pgcrypto para digest SHA-256
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insertar o actualizar el hash de la clave del miembro
INSERT INTO public.member_keys (member_id, key_hash)
SELECT id, encode(digest('MI_CLAVE_SECRETA_AQUI', 'sha256'), 'hex')
FROM public.members
WHERE alias = 'Alex'
ON CONFLICT (member_id)
DO UPDATE SET key_hash = EXCLUDED.key_hash;
```

### 2. Cómo escribir la URL en la Tag NFC (NDEF)
1. Instala una app de lectura/escritura NFC gratuita en tu smartphone (por ejemplo, **NFC Tools** disponible en App Store y Google Play).
2. Abre la aplicación y pulsa en la pestaña **Escribir** (Write) $\rightarrow$ **Añadir un registro** (Add a record).
3. Selecciona **URL / URI**.
4. Introduce la URL completa con el fragmento de la clave:
   ```text
   https://tu-app-halfandhalf.vercel.app/#k=MI_CLAVE_SECRETA_AQUI
   ```
5. Pulsa en **Escribir** (Write) y acerca la etiqueta NFC física al lector de tu teléfono para grabarla.
6. ¡Listo! Al acercar el móvil a la tag, el navegador abrirá la app, iniciará sesión automáticamente para ese miembro y limpiará la URL al instante.

---

## 💻 Instalación y Desarrollo Local

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Asegúrate de que tu archivo `.env` contiene:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
   ```

3. **Iniciar el servidor de desarrollo en red local (WiFi)**:
   ```bash
   npm run dev
   ```
   Podrás acceder desde cualquier teléfono conectado a la misma red local mediante la dirección `http://192.168.X.X:5173/`.

4. **Compilar para producción**:
   ```bash
   npm run build
   ```

---

## 📱 Instalación PWA
- **iOS Safari**: Botón Compartir $\rightarrow$ *Añadir a la pantalla de inicio*.
- **Android Chrome**: Menú de tres puntos $\rightarrow$ *Instalar aplicación*.

---

## 📄 Licencia
Uso personal privado. Desarrollado con dedicación y enfoque minimalista.
