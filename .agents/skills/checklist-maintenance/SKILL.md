---
name: checklist-maintenance
description: >-
  Guía operativa y de desarrollo para mantener, auditar y extender la aplicación web
  Checklist de Mantenimiento Preventivo de Aire Acondicionado y su integración con Google Apps Script.
---

# Skill: Operación y Mantenimiento del Checklist de Aire Acondicionado

Esta skill documenta los procedimientos recomendados para mantener, depurar, auditar y extender la aplicación **Checklist de Mantenimiento Preventivo de Aire Acondicionado**.

---

## 🔍 Procedimiento de Auditoría y Verificación

Antes de declarar completada cualquier modificación o extensión en el proyecto, ejecuta este checklist:

1. **Sintaxis de JavaScript**:
   - Ejecuta `node -c app.js` para verificar que no existan errores de sintaxis o variables no declaradas.
2. **Interactividad de Modales**:
   - Verifica que los botones superiores (**`👥 Clientes`**, **`👨‍🔧 Técnicos`**, **`📋 Ver Registros`**) respondan al instante sin errores en consola.
3. **Unicidad de OT**:
   - Comprueba que la validación en tiempo real de OT (`checkOTUniqueness`) alerte si la OT ingresada ya existe en el historial.
   - Prueba el botón `Generar OT` para confirmar la generación de números consecutivos (`OT-YYYY-XXXX`).
4. **Carga Completa al Editar (`loadRecordIntoForm`)**:
   - Abre el modal de historial, selecciona un registro y presiona `✏️ Cargar / Editar en Formulario`.
   - Confirma que se carguen todos los campos generales, todas las mediciones, y los botones de radio (B, R, M, N/A) de las 3 secciones de inspección.
5. **Limpieza del Formulario**:
   - Prueba el botón `Limpiar Formulario` y verifica que aparezca **una única alerta** de confirmación.
   - Confirma que el campo OT y todos los demás campos queden **100% en blanco**.
6. **Exportación e Impresión a PDF**:
   - Presiona `🖨️ Imprimir / Exportar PDF` desde la vista de detalle y confirma que la vista previa de impresión sea limpia, sin menús ni modales duplicados.

---

## 🛠️ Guía de Modificación Segura

- **Conserve el contrato de Google Apps Script**:
  Las columnas principales en Google Sheets corresponden exactamente con las claves devueltas por `doGet` y leídas por `app.js`.
- **Filtro de Filas Vacías**:
  Tanto `google_apps_script.js` en `getSheetJson` como `app.js` en `renderHistoryTable` filtran filas donde la OT o el Cliente estén en blanco para evitar mostrar filas borradas.
