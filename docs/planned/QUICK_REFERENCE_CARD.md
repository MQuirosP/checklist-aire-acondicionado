# 🚀 Quick Reference Card - Plan de Mitigación

**Guardar este archivo en tu teléfono o imprimir** para referencia rápida durante la implementación.

---

## 📍 UBICACIONES CLAVE EN app.js

```
Línea ~30-50:    Crear AppState IIFE
Línea ~95:       Agregar getSessionToken() función
Línea ~105:      Agregar generateSessionTokenFromServer() función
Línea ~129:      Modificar loginUser() - agregar token
Línea ~155:      Modificar logoutUser() - limpiar token
Línea ~1350:     ANTES: const STORAGE_KEY = 'checklist_ac_draft'
                 DESPUÉS: function getStorageKeyForUser()
Línea ~1544:     Modificar fetchHistoryData() - incluir token
Línea ~1600-1750: saveDraft(), loadDraft(), clearDraft()
Línea ~2506:     Modificar updateClientsUI() - incluir token
```

---

## 🔧 MODIFICACIONES RÁPIDAS (Copy-Paste)

### En google_apps_script.js

**ANTES** de `doPost(e)`, agrega:
```javascript
// [NUEVO] Manejar generación de token
if (data.action === 'generate_token') {
  return doPost_generateToken(data);
}
```

**Función a copiar** (pega en línea 1):
```javascript
function generateSessionToken(userId) {/*...*/}
function validateSessionToken(token) {/*...*/}
function doPost_generateToken(data) {/*...*/}
function getUsuarioById(userId) {/*...*/}
function isUserAdmin(user) {/*...*/}
function matchTechnicianName(str1, str2) {/*...*/}
```

### En app.js

**Cambiar URL en fetchHistoryData()**:
```javascript
// ANTES
const fetchUrl = `${GOOGLE_SCRIPT_URL}?action=historial&_t=${Date.now()}`;

// DESPUÉS
const token = getSessionToken();
const fetchUrl = token 
  ? `${GOOGLE_SCRIPT_URL}?action=historial&_t=${Date.now()}&token=${encodeURIComponent(token)}`
  : `${GOOGLE_SCRIPT_URL}?action=historial&_t=${Date.now()}`;
```

**Cambiar URL en updateClientsUI()**:
```javascript
// ANTES
const fetchUrl = `${GOOGLE_SCRIPT_URL}?action=clientes&_t=${Date.now()}`;

// DESPUÉS
const token = getSessionToken();
const fetchUrl = token
  ? `${GOOGLE_SCRIPT_URL}?action=clientes_del_usuario&_t=${Date.now()}&token=${encodeURIComponent(token)}`
  : `${GOOGLE_SCRIPT_URL}?action=clientes&_t=${Date.now()}`;
```

---

## 🧪 TESTS RÁPIDOS EN CONSOLE (DevTools F12)

### Test: Token genera
```javascript
console.log(localStorage.getItem('session_token'))
// Esperado: UUID largo
```

### Test: Clientes de usuario
```javascript
console.log(AppState.getClientsCache().length)
// Esperado: número > 0
```

### Test: Historial de usuario
```javascript
console.log(AppState.getHistoryCache().length)
// Esperado: número de órdenes de ese usuario
```

### Test: Borradores separados
```javascript
Object.keys(localStorage).filter(k => k.includes('draft'))
// Esperado: ['checklist_ac_draft_USER_ID']
```

### Test: AppState protege
```javascript
currentUser = {nombre:'Hacker'};
console.log(currentUser.nombre)
// Esperado: usuario ORIGINAL (no 'Hacker')
```

---

## ⏰ TIMELINE DE IMPLEMENTACIÓN

| Fase | Tiempo | Archivos | Validación |
|------|--------|----------|-----------|
| Backend | 1.5h | google_apps_script.js | Test server log |
| Token Frontend | 1h | app.js | localStorage token |
| Solicitudes | 1h | app.js | Historial filtrado |
| Borradores | 45min | app.js | Claves únicas |
| Encapsulación | 1h | app.js | DevTools bypass |
| Testing | 30min | Ambos | Matriz ✅ |
| **TOTAL** | **~5.5h** | — | — |

---

## 🚨 ERROR CHECKLIST

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Token no aparece en localStorage | generateSessionTokenFromServer no ejecuta | Recarga, verifica console.log |
| Historial vacío | Backend filtra mal | Verifica token válido, cheq backend logs |
| Borradores se mezclan | getStorageKeyForUser no incluye ID | Busca función, verifica currentUser.id |
| DevTools puede modificar currentUser | AppState no configurado | Busca Object.defineProperty en línea 30 |
| currentUser es undefined | AppState retorna null | Loguea de nuevo |
| Admin no ve todas órdenes | isUserAdmin falla | Verifica rol 'admin' en minúsculas |

---

## 📝 FUNCIONES NUEVAS A AGREGAR

### app.js
```
✅ getSessionToken()
✅ generateSessionTokenFromServer()
✅ getStorageKeyForUser()
✅ AppState (IIFE)
```

### google_apps_script.js
```
✅ generateSessionToken()
✅ validateSessionToken()
✅ doPost_generateToken()
✅ getUsuarioById()
✅ isUserAdmin()
✅ matchTechnicianName()
```

---

## 🔐 SEGURIDAD MEJORADA

**Antes**: ❌ Usuario con DevTools → ve datos de otros técnicos  
**Después**: ✅ Token backend + AppState + borradores únicos = protegido

---

## 📊 MATRIX DE VALIDACIÓN FINAL

Después de TODO, marca estos:

```
❌ Backend - Test 1.1 Token genera
❌ Backend - Test 1.2 Token limpia
❌ Backend - Test 1.3 Técnico A filtrado
❌ Backend - Test 1.4 Admin ve todo
❌ Borrador - Test 2.1 Clave única
❌ Borrador - Test 2.2 No mezcla
❌ Borrador - Test 2.3 Recupera
❌ Estado - Test 4.1 currentUser protegido
❌ Estado - Test 4.2 AppState funciona
❌ Seguridad - Test S1 DevTools bypass falla

CUANDO TODOS SEAN ✅ → LISTO PARA PRODUCCIÓN
```

---

## 📞 EN CASO DE EMERGENCIA

**Rollback rápido**:
```bash
git reset --hard HEAD~1
# O
git stash pop
```

**Verificar logs de Apps Script**: 
Proyectos de Apps Script → Execuciones → Busca errores

**Test de token manualmente**:
```javascript
fetch(GOOGLE_SCRIPT_URL, {
  method: 'POST',
  payload: JSON.stringify({action: 'generate_token', userId: 'test'})
}).then(r => r.text()).then(console.log)
```

---

## 🎯 PUNTOS CRÍTICOS

🔴 **NO OLVIDES**:
1. Generar token al login (generateSessionTokenFromServer)
2. Incluir token en fetchHistoryData & updateClientsUI
3. Validar token en backend doGet()
4. Usar getStorageKeyForUser() en TODAS las funciones de borrador
5. Crear AppState IIFE con Object.defineProperty

---

## ✅ COMPLETACIÓN

**¿Completaste TODO?**

Sí → `git commit -m "feat: seguridad v1.1.0"` → Deploy 🎉

No → Revisa GUIA_IMPLEMENTACION_PASO_A_PASO.md paso a paso

---

## 📱 GUARDAR ESTA TARJETA

**Recomendaciones**:
- Exporta como PDF
- Guarda en teléfono
- Imprime y pega en monitor
- Comparte con equipo

