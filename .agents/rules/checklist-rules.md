# Reglas de Desarrollo y Control de Cambios - Checklist Aire Acondicionado

---

## 1. Directiva de Preservación de Código y Confirmación Explícita

- **NO RE-INVENTAR NI CAMBIAR COMPONENTES EXISTENTES**:
  Cualquier solicitud de modificación futura debe implementarse **sin alterar ni romper** las características previamente aprobadas.
- **CONSULTAR ANTES DE MODIFICAR LO EXISTENTE**:
  Si para cumplir una nueva solicitud es estrictamente necesario cambiar o reestructurar una función, diseño, variable o componente preexistente, **DEBES CONSULTAR PRIMERO AL USUARIO, EXPLICAR LA RAZÓN Y ESPERAR SU CONFIRMACIÓN EXPLÍCITA**.

---

## 2. Estándares de Interfaz de Usuario (UI) y Diseño

- **Controles Desplegables (`<select>`)**:
  - Todos los desplegables (`cliente`, `tecnico`, `tipoUnidad`, `refrigerante`, `med_control_remoto`) deben utilizar **exclusivamente la clase estándar de Tailwind**:
    `w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500` (o `w-48` en tablas).
  - Todos los desplegables deben tener como primera opción la etiqueta neutra: `<option value="" disabled selected>Seleccionar...</option>`.

- **Formulario de Mediciones Técnicas (Sección 4)**:
  - Las casillas numéricas usan ancho compacto `w-28` (`112px`).
  - Las unidades (`V AC`, `A`, `PSI`, `°C`) llevan la clase `whitespace-nowrap font-medium` para evitar saltos de línea verticales.

---

## 3. Manejo de Datos y Protocolo de Envío

- **Sin Bloqueos CORS**:
  Los envíos a Google Apps Script deben realizarse mediante el formulario HTML oculto apuntando a `hidden_iframe`. Nunca cambies el mecanismo de envío a `fetch(POST)` sin probar compatibilidad CORS.
- **Sincronización Anti-Caché**:
  Toda consulta GET a Google Apps Script debe incluir `_t=${Date.now()}` y `{ cache: 'no-store' }`.

---

## 4. Alcance Estricto de Cambios y Cero Improvisación

- **ALCANCE ESTRICTO A LO SOLICITADO**:
  Cada solicitud del usuario debe tratarse de forma quirúrgica. Queda estrictamente prohibido refactorizar, modificar, "optimizar" o alterar funciones, archivos, flujos de datos o estilos que no hayan sido pedidos explícitamente.
- **PROHIBIDO REALIZAR MEJORAS UNILATERALES O UNIMPLED IMPROVISACIONES**:
  No agregues funciones de respaldo ("fallback"), limpiadores, reordenamiento de columnas, lógica secundaria ni cambies comportamientos existentes sin solicitud previa y autorización explícita.
- **PROTEGER CÓDIGO FUNCIONAL ("CÓDIGO CONGELADO")**:
  Cualquier componente, script o función que ya esté funcionando correctamente se considera **CONGELADO** y no se debe tocar ni reescribir.
