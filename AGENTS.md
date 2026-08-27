# Reglas y Generalidades del Proyecto - Checklist Aire Acondicionado

Este documento define la arquitectura, contratos de datos, principios de interfaz de usuario y reglas estrictas de desarrollo para el proyecto **Checklist de Mantenimiento Preventivo de Aire Acondicionado**.

---

## 🚨 REGLA DE ORO DE DESARROLLO

1. **PROHIBIDO MODIFICAR FUNCIONALIDADES O DISEÑOS EXISTENTES SIN AUTORIZACIÓN**:
   - En futuras modificaciones o adiciones, realiza **únicamente** lo que el usuario pida de forma explícita.
   - **NUNCA alteres, rompas o rediseñes** componentes, estilos, selecciones de dropdowns, campos o flujos de trabajo que ya estén funcionando correctamente.
   - Si una modificación requiere alterar código o comportamiento preexistente, **DEBES PREGUNTAR PRIMERO AL USUARIO Y ESPERAR SU CONFIRMACIÓN EXPLÍCITA** antes de aplicar los cambios.

---

## 🏛️ Arquitectura General y Tecnologías

- **Frontend**: HTML5 Semántico, Tailwind CSS (mediante CDN), Vanilla JavaScript ES6+ modular.
- **Backend / Persistencia**: Google Apps Script (Web App) vinculado a la Hoja de Cálculo oficial de Google Sheets.
- **URL de la Aplicación Web (Apps Script)**: `https://script.google.com/macros/s/AKfycbz0FPAiw8vWelX2AhwoBM0tMdgbFpwcwd0AKXO7Z5b8JzA5_-Pk3VIk66Z1LrBNsDIO/exec`
- **Hoja de Cálculo en Google Sheets**: `https://docs.google.com/spreadsheets/d/1MauAQkSqQRCSvdnc_PjuAcVM8yphmgfKBkUmW8TkzcI/edit`
- **Procesamiento de Envíos**: Formulario HTML con `action="GOOGLE_SCRIPT_URL"`, `method="POST"`, y `target="hidden_iframe"`. Esto **elimina el 100% de los errores de CORS** preflight de navegadores modernos.

---

## 📋 Generalidades y Módulos del Sistema

### 1. Información General de la Orden
- **Campos**: Fecha (auto-hoy), N° de Orden / OT, Cliente / Ubicación, Técnico Responsable, Tipo de Unidad, Marca / Modelo, ID / Tag Equipo, Refrigerante.
- **Unicidad de OT**: Validación en tiempo real (`#ot-validation-badge`) que impide registrar una OT duplicada y botón `Generar OT` que calcula la siguiente OT consecutiva (ej. `OT-2026-0003`).
- **Desplegables Selects**: Todos los `<select>` (`Cliente`, `Técnico`, `Tipo de Unidad`, `Refrigerante`, `Control Remoto`) usan la misma clase Tailwind limpia (`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500`) y placeholders neutros (`Seleccionar...`).

### 2. Gestión de Clientes y Técnicos (Local First + Historial)
- **Almacenamiento**: Memoria local (`app_clientes_custom_v1` y `app_tecnicos_custom_v1`) combinada con auto-extracción desde el historial de mantenimientos pasados.
- **Desplegables dinámicos**: Los controles `<select id="cliente">` y `<select id="tecnico">` se pueblan automáticamente y cuentan con la opción rápida `➕ Registrar Nuevo Cliente...` / `➕ Registrar Nuevo Técnico...` para abrir sus modales de gestión.

### 3. Secciones de Inspección (Radios & Observaciones)
- **Componentes**: 
  - Section 1: Unidad Evaporadora (9 ítems)
  - Section 2: Unidad Condensadora (8 ítems)
  - Section 3: Sistema Eléctrico y Electrónico (6 ítems)
- **Radio Buttons**: Opciones Bueno (B), Regular (R), Malo (M), N/A.

### 4. Pruebas Operativas y Mediciones Técnicas
- **Inputs Compactos**: Casillas de mediciones con ancho `w-28` o `w-48`.
- **No Salto de Línea en Unidades**: Las unidades (`V AC`, `A`, `PSI`, `°C`) incluyen la clase `whitespace-nowrap` para evitar que se dividan verticalmente.
- **Cálculo Automático de $\Delta T$**: Cálculo dinámico de $\Delta T = T_{\text{retorno}} - T_{\text{inyección}}$ con rango ideal de $8^\circ\text{C}$ a $12^\circ\text{C}$.

### 5. Historial, Detalle y Exportación a PDF
- **Sincronización Anti-Caché**: `fetchHistoryData()` consulta con `_t=Date.now()` y `cache: no-store` para ignorar la caché HTTP del navegador.
- **Filtro de Filas Vacías**: Descarta automáticamente cualquier fila en blanco o cuya información haya sido borrada en la hoja de Google Sheets.
- **Modal de Detalle (`#modal-record-detail`)**: Muestra la ficha completa con mediciones, firmas base64 y opción de edición (`✏️ Cargar / Editar en Formulario`).
- **Impresión / Exportar PDF**: Reglas `@media print` diseñadas para imprimir un documento limpio de 1 o 2 páginas sin mostrar menús, modales de fondo ni botones de acción.

### 6. Limpieza y Reseteo del Formulario
- **Al Guardar**: Limpia automáticamente el formulario tras un envío exitoso, restablece la fecha actual y borra firmas y borrador.
- **Limpiar Formulario (Manual)**: Botón con alerta de confirmación única que deja el campo OT y todos los demás campos 100% en blanco.
