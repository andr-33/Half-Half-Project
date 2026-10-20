# Half & Half 🛒

App personal y minimalista de lista de la compra continua diseñada para **2 personas** que comparten una única despensa y hogar. Pensada *mobile-first* para capturar rápidamente lo que falta en casa y consultarla/tildarla en el súper, con soporte en tiempo real y modo local para supermercados sin cobertura.

---

## 🚀 Características Principales

- **Lista continua compartida**: Una sola lista compartida entre 2 dispositivos en tiempo real vía Supabase Realtime (última escritura gana).
- **Captura rápida en $\le 3$ toques**: Botón flotante accesible con el pulgar para añadir cualquier artículo del catálogo en segundos.
- **Creación sobre la marcha**: Escribir un artículo nuevo lo añade a la lista y lo crea en el catálogo en un solo paso.
- **Prevención de duplicados inteligente**: Detección global de artículos entre categorías con advertencia y opción de reutilización.
- **Agrupación por categoría**: La lista se organiza automáticamente por pasillo/categoría, tachando y enviando al final los productos comprados.
- **Modo Supermercado Offline**: Funciona completamente sin cobertura (modo local con caché PWA y `localStorage`). Puedes seguir tachando y editando; las acciones se encolan y se sincronizan automáticamente al recuperar la señal.
- **Cierre de compra atómico**: Vacía los artículos comprados de la lista con un solo toque y confirmación de seguridad, manteniéndolos guardados en el catálogo.
- **PWA instalable**: Funciona como app nativa en iOS y Android.
- **Diseño limpio y accesible**: Tipografía del sistema, áreas táctiles $\ge 44\text{px}$, paleta sobria en tonos esmeralda y soporte de modo oscuro automático (`prefers-color-scheme`).

---

## 🛠️ Stack Tecnológico

- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vite.dev/) (JavaScript estándar)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Iconografía**: [Lucide React](https://lucide.dev/) exclusivamente
- **Backend as a Service**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Realtime, Auth)
- **PWA & Offline**: `vite-plugin-pwa` + Service Worker (Workbox) + LocalStorage Sync Queue

---

## 📋 Estructura del Proyecto

```text
├── public/                 # Favicon e icono SVG de la PWA
├── src/
│   ├── components/         # Layout principal con navegación inferior y modal accesible
│   ├── features/
│   │   ├── auth/           # LoginView (acceso con cuenta compartida)
│   │   ├── categories/     # Gestión de categorías (CRUD, validaciones, recuentos)
│   │   ├── articles/       # Gestión de artículos de catálogo (CRUD, unicidad global)
│   │   └── list/           # Lista de la compra (F3-F8, capturas, RPCs, cierre)
│   ├── hooks/              # useAuth, useOnlineStatus
│   └── lib/                # supabaseClient, normalize, storage, networkUtils, offlineQueue
├── supabase/
│   └── schema.sql          # Tablas, índices, RLS, Realtime y RPCs (add_to_list, close_purchase)
├── DECISIONS.md            # Registro formal de decisiones técnicas de diseño
├── .env.example            # Plantilla de variables de entorno requeridas
└── README.md
```

---

## ⚙️ Configuración Paso a Paso en Supabase

### 1. Crear el proyecto en Supabase
1. Accede a [Supabase Dashboard](https://supabase.com/dashboard) y crea un nuevo proyecto.
2. Anota la **Project URL** y la clave pública **anon public API key** que aparecen en:
   `Project Settings -> Configuration -> API`.

### 2. Ejecutar el esquema de Base de Datos
1. En el menú lateral de tu proyecto de Supabase, entra a **SQL Editor**.
2. Pulsa en **New Query**.
3. Copia el contenido íntegro del archivo [`supabase/schema.sql`](supabase/schema.sql) del repositorio, pégalo en el editor y pulsa **Run**.
4. Este script configurará:
   - Tabla `categories` con unicidad de nombre normalizado.
   - Tabla `articles` con unicidad global de nombre en todo el catálogo y borrado en cascada.
   - Tabla `list_items` con unicidad de artículo y cantidad mínima $\ge 1$.
   - **Row Level Security (RLS)** estricto: deniega todo acceso público anónimo y autoriza únicamente a usuarios autenticados (`authenticated`).
   - Publicación en **Supabase Realtime** para la tabla `list_items`.
   - Funciones SQL atómicas (`add_to_list` y `close_purchase`).

### 3. Crear la cuenta compartida
1. Ve a **Authentication -> Users** en el panel de Supabase.
2. Pulsa en **Add User** $\rightarrow$ **Create user**.
3. Introduce el correo y contraseña que compartirán ambas personas (ej: `casa@halfandhalf.app` y una contraseña segura).
4. Marca la opción *Auto Confirm User* para que no requiera verificación de correo.

### 4. Desactivar el registro público de nuevos usuarios
Para garantizar la máxima seguridad y que nadie más pueda crear cuentas en vuestra base de datos:
1. Dirígete a **Authentication -> Providers -> Email**.
2. Desmarca la casilla **"Enable Email Signup"** (o "Allow new users to sign up").
3. Guarda los cambios. A partir de este momento, solo la cuenta creada manualmente podrá iniciar sesión.

---

## 💻 Instalación y Desarrollo Local

1. **Clonar el repositorio e instalar dependencias**:
   ```bash
   git clone <url-del-repositorio>
   cd half-and-half
   npm install
   ```

2. **Configurar variables de entorno**:
   Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```
   Abre `.env` y asigna tus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
   ```

3. **Iniciar el servidor de desarrollo en red local (WiFi)**:
   ```bash
   npm run dev
   ```
   La terminal mostrará:
   - **Local**: `http://localhost:5173/`
   - **Network**: `http://192.168.X.X:5173/` (para abrir directamente desde los móviles conectados al mismo WiFi).

4. **Compilar para producción**:
   ```bash
   npm run build
   ```

---

## 📱 Instalación como PWA en el Teléfono Móvil

Half & Half está optimizada para comportarse como una aplicación nativa instalada en el dispositivo:

### En iPhone (iOS Safari):
1. Abre la URL de la app en Safari.
2. Inicia sesión con la cuenta compartida.
3. Toca el botón **Compartir** (icono de cuadrado con flecha hacia arriba).
4. Desplázate hacia abajo y selecciona **"Añadir a la pantalla de inicio"**.
5. Pulsa en **Añadir**. Ahora tendrás el icono de Half & Half en tu pantalla de inicio con vista completa a pantalla completa (*standalone*).

### En Android (Google Chrome):
1. Abre la URL de la app en Chrome.
2. Inicia sesión con la cuenta compartida.
3. Toca el menú de tres puntos verticales arriba a la derecha.
4. Pulsa en **"Instalar aplicación"** o **"Añadir a la pantalla de inicio"**.

---

## 🌐 Despliegue en Producción

### Opción A: Despliegue en Vercel
1. Sube tu código a GitHub o GitLab.
2. Ve a [Vercel](https://vercel.com/) e importa el repositorio.
3. Framework Preset: **Vite**.
4. En **Environment Variables**, añade:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Pulsa en **Deploy**.
6. Para que el enrutamiento y el Service Worker funcionen sin problemas, crea si lo deseas un archivo `vercel.json`:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

### Opción B: Despliegue en Netlify
1. Conecta tu repositorio en [Netlify](https://www.netlify.com/).
2. Build command: `npm run build`
3. Publish directory: `dist`
4. En **Site configuration -> Environment variables**, añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. En la carpeta `public/` crea un archivo `_redirects` con el siguiente contenido:
   ```text
   /*    /index.html   200
   ```
6. Despliega el sitio.

---

## 📄 Licencia

Uso personal privado. Desarrollado con dedicación y enfoque minimalista.
