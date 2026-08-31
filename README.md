# ❄️ Checklist de Mantenimiento Preventivo - Aire Acondicionado

Formulario web interactivo (Checklist dinámico) para técnicos de climatización y aire acondicionado. Permite registrar las inspecciones preventivas en campo desde teléfonos, tablets o computadoras, capturar firmas digitales de conformidad y guardar automáticamente la información en una hoja de cálculo de **Google Sheets**.

---

## 🚀 Características Clave

- **📱 Diseño Responsivo / Mobile-First**: Interfaz optimizada para el uso rápido en dispositivos móviles durante trabajos en campo.
- **⚡ Botones de Selección Rápida**: Opción para *"Marcar Todos Bueno (B)"* por sección con 1 solo clic.
- **🌡️ Cálculo Automático de $\Delta T$**: Calcula el diferencial de temperatura ($\text{Retorno} - \text{Inyección}$) e indica si está en el rango ideal de $8^\circ\text{C}$ a $12^\circ\text{C}$.
- **✍️ Firmas Digitales en Pantalla (Canvas)**: Captura la firma del técnico responsable y del cliente con el dedo o mouse.
- **💾 Borrador Local (LocalStorage)**: Previene la pérdida de información si la conexión a internet falla. Auto-guardado en segundo plano.
- **📊 Persistencia Gratuita en Google Sheets**: Backend sin servidor mediante Google Apps Script.
- **🌐 Despliegue 100% Gratuito**: Compatible con **GitHub Pages** y **Cloudflare Pages**.

---

## 📂 Estructura del Proyecto

```
checklist-aire-acondicionado/
├── index.html               # Formulario semántico HTML5 y modales
├── styles.css               # Estilos personalizados (Pills de radios, Canvas)
├── app.js                   # Lógica JavaScript, firmas, Delta T, fetch API
├── google_apps_script.js    # Código backend para copiar en Google Sheets
└── README.md                # Instrucciones de configuración y despliegue
```

---

## 🛠️ Paso 1: Configurar la Hoja de Google Sheets

1. Abre [Google Sheets](https://sheets.google.com) y crea una nueva Hoja de Cálculo (ejemplo: `Mantenimientos_Aire_Acondicionado`).
2. En el menú superior, ve a **Extensiones** ➔ **Apps Script**.
3. Elimina cualquier código por defecto y copia/pega todo el contenido del archivo [`google_apps_script.js`](./google_apps_script.js).
4. Guarda los cambios haciendo clic en el icono de disco 💾.
5. Haz clic en el botón azul **Desplegar** ➔ **Nuevo despliegue**.
6. En el icono de engranaje ⚙️ (Seleccionar tipo), elige **Aplicación web**.
7. Configura los siguientes parámetros:
   - **Descripción**: Endpoint Checklist Aire Acondicionado.
   - **Ejecutar como**: `Yo (tu cuenta de correo)`.
   - **Quién tiene acceso**: `Cualquier persona` (*Anyone*).
8. Haz clic en **Desplegar**, otorga los permisos requeridos cuando Google los pida (Autorizar acceso).
9. Copia la **URL de la aplicación web** generada (se ve como `https://script.google.com/macros/s/.../exec`).

---

## 🔗 Paso 2: Vincular la URL en el Proyecto

1. Abre el archivo [`app.js`](./app.js) en tu editor de código.
2. En la línea 7, reemplaza el valor de `GOOGLE_SCRIPT_URL` con la URL que copiaste de Google Apps Script:

```javascript
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/TU_SCRIPT_ID/exec';
```

3. Guarda los cambios.

---

## 🌐 Paso 3: Opciones de Despliegue Gratuito

### Opción A: Despliegue en GitHub Pages (Recomendado)

1. En tu terminal o línea de comandos dentro de la carpeta del proyecto (`C:\Users\mquir\proyectos\checklist-aire-acondicionado`):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Checklist Aire Acondicionado"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/checklist-aire-acondicionado.git
   git push -u origin main
   ```
2. Entra a tu repositorio en GitHub ➔ **Settings** (Configuración) ➔ **Pages** (en el menú lateral izquierdo).
3. En **Build and deployment** ➔ **Source**, selecciona `Deploy from a branch`.
4. En **Branch**, selecciona `main` / `/(root)` y haz clic en **Save**.
5. En un par de minutos, tu sitio estará en línea en `https://TU_USUARIO.github.io/checklist-aire-acondicionado/`.

---

### Opción B: Despliegue en Cloudflare Pages

1. Inicia sesión en [Cloudflare Dashboard](https://dash.cloudflare.com/) e ingresa a **Workers & Pages**.
2. Haz clic en **Create Application** ➔ Pestaña **Pages**.
3. Puedes conectar tu cuenta de **GitHub** y seleccionar el repositorio `checklist-aire-acondicionado`, o subir la carpeta directamente:
   - Presiona **Upload Assets**.
   - Asigna un nombre al proyecto (ej. `checklist-ac`).
   - Arrastra y suelta la carpeta `checklist-aire-acondicionado` (con `index.html`, `styles.css` y `app.js`).
4. Haz clic en **Deploy site**.
5. ¡Listo! Cloudflare te otorgará una URL gratuita como `https://checklist-ac.pages.dev`.

---

## 🎨 Estilo estándar de modales

Todos los modales del sistema deben seguir la misma estructura visual para mantener consistencia UX y facilitar mantenimiento:

- Contenedor base: `fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center hidden p-4`
- Ventana principal: `bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden`
- Encabezado: `bg-slate-900 text-white px-6 py-4 flex items-center justify-between`
- Título: `text-base font-semibold` con icono y color blanco
- Cierre: botón con `text-slate-400 hover:text-white text-xl font-bold p-1`
- Cuerpo: `p-4 bg-slate-50 border-b border-slate-200` para formularios y contenido principal
- Botones de acción: `flex gap-2` con primario `bg-blue-600 hover:bg-blue-700 text-white` y secundario `bg-slate-100 text-slate-700 hover:bg-slate-200`
- Inputs: `border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500`
- Etiquetas: `text-[11px] font-semibold text-slate-700`

Esta convención aplica a los modales de usuarios, historial, seguridad y cambio de PIN para mantener la misma apariencia visual en desktop y mobile.

---

## � Permisos por Rol y Aislamiento por Técnico

La aplicación define dos perfiles principales con visibilidad diferenciada en el menú y en los accesos funcionales:

| Rol | Puede acceder | No puede acceder |
| --- | --- | --- |
| Administrador | Usuarios, técnicos, clientes, catálogo de equipos, historial, seguridad y configuración global | Nada relevante del ámbito administrativo (salvo lo que corresponda a su rol) |
| Técnico | Clientes, catálogo de equipos, historial de sus órdenes, creación de checklist, seguridad personal (PIN/biometría) | Usuarios, gestión de otros técnicos, administración global |

### Regla de negocio aplicada

- El técnico vive dentro de su propio dominio operativo: clientes y equipo que él gestiona.
- El técnico no puede ver ni administrar usuarios ni otros técnicos.
- La administración global continúa reservada para el rol Administrador.
- La seguridad personal del técnico (cambio de PIN, biometría y cierre de sesión) permanece disponible sin exponer funciones de administración.

Esto evita el problema de permisos cruzados y mantiene el aislamiento por técnico o tenant funcional, tal como se requiere para equipos de trabajo distribuidos o varios técnicos con sus propios clientes y catálogos.

---

## �📝 Secciones Incluidas en el Checklist

1. **Información General**: Fecha, N° de Orden/OT, Cliente, Técnico, Tipo de Unidad, Marca/Modelo, Tag/ID, Refrigerante.
2. **Unidad Evaporadora (Interior)**: 9 puntos de inspección (B/R/M/N/A) + observaciones por punto.
3. **Unidad Condensadora (Exterior)**: 8 puntos de inspección (B/R/M/N/A) + observaciones por punto.
4. **Sistema Eléctrico y Electrónico**: Bornes, Capacitores (con medición explícita de $\mu\text{F}$ para Compresor y Ventilador), Tarjetas PCB, Protecciones, Tierra física.
5. **Pruebas Operativas y Mediciones**: Voltaje (VAC), Corriente Compresor (A), Corriente Ventilador (A), Presión Baja (PSI), Presión Alta (PSI), Temp Inyección, Temp Retorno, Cálculo $\Delta T$, Superheat/Subcooling, Estado del Control Remoto.
6. **Diagnóstico y Observaciones Finales**: Campo de texto libre para recomendaciones de repuestos y trabajos correctivos.
7. **Firmas de Conformidad**: Canvas táctil para firma del Técnico y del Cliente.
