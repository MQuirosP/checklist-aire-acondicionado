# ✅ Checklist de Validación Post-Implementación

**Objetivo**: Verificar que todas las mitigaciones funcionan correctamente  
**Tiempo estimado**: 30-45 minutos  
**Prerequisito**: Haber completado todos los 6 pasos de GUIA_IMPLEMENTACION_PASO_A_PASO.md

---

## 📋 Antes de Empezar

- [ ] Cierra DevTools (F12)
- [ ] Recarga la página completamente (Ctrl+Shift+R o Cmd+Shift+R)
- [ ] Limpia caché si es necesario
- [ ] Abre DevTools de nuevo (F12)
- [ ] Ve a Consola

---

## 🔐 MITIGACIÓN 1: Validación en Backend

### Test 1.1: Token genera al login
**Pasos**:
1. Cierra sesión si estás logueado
2. Loguea con un usuario
3. DevTools → Consola → Ejecuta:
```javascript
console.log(localStorage.getItem('session_token'))
```

**Resultado esperado**: ✅ Muestra UUID largo
```
8a9c1234-5678-9abc-def0-1234567890ab_1693401234567_a8f9g2h3
```

**❌ Si falla**:
- Verifica que `generateSessionTokenFromServer()` está en app.js
- Verifica que `doPost()` en Google Apps Script maneja 'generate_token'
- Revisa console.log en DevTools para mensajes de error
- Recarga página

---

### Test 1.2: Token se limpia al logout
**Pasos**:
1. Con sesión activa, ejecuta:
```javascript
console.log(localStorage.getItem('session_token'))  // Debe mostrar token
```

2. Cierra sesión (haz click en logout)
3. Ejecuta de nuevo:
```javascript
console.log(localStorage.getItem('session_token'))  // Debe mostrar null
```

**Resultado esperado**: 
- ANTES logout: ✅ UUID
- DESPUÉS logout: ✅ `null`

**❌ Si falla**:
- Verifica que `logoutUser()` limpia `session_token`
- Verifica que `clearCurrentUser()` en AppState se llama

---

### Test 1.3: Filtrado de historial por usuario (Técnico)
**Pasos**:
1. Loguea como **Técnico A**
2. Abre pestaña **Historial de Mantenimientos**
3. **Nota la cantidad** de órdenes visibles (ej: 5 órdenes)
4. DevTools → Consola:
```javascript
console.log('Órdenes visibles:', AppState.getHistoryCache().length)
```

5. **Cierra sesión**
6. Loguea como **Técnico B** (diferente usuario)
7. Abre **Historial de Mantenimientos**
8. **Nota la cantidad** de órdenes (debe ser diferente)
9. DevTools → Consola:
```javascript
console.log('Órdenes visibles:', AppState.getHistoryCache().length)
```

**Resultado esperado**: 
- Técnico A: ✅ Número X de órdenes
- Técnico B: ✅ Número DIFERENTE (probablemente menos)
- Los nombres en la tabla coinciden con cada técnico

**❌ Si falla**:
- Verifica que `fetchHistoryData()` incluye token en URL
- Verifica que `doGet()` en backend filtra por usuario
- Verifica que `matchTechnicianName()` está en Google Apps Script

---

### Test 1.4: Filtrado de historial (Admin)
**Pasos**:
1. Loguea como **Admin**
2. Abre **Historial de Mantenimientos**
3. DevTools → Consola:
```javascript
console.log('Órdenes visibles:', AppState.getHistoryCache().length)
```

**Resultado esperado**: 
- ✅ Admin ve TODAS las órdenes (número más alto que cualquier técnico)
- ✅ Tabla muestra órdenes de TODOS los técnicos

**❌ Si falla**:
- Verifica que `isUserAdmin()` en backend detecta admin
- Verifica que `doGet()` NO filtra para admin

---

### Test 1.5: Token inválido rechaza solicitud
**Pasos** (⚠️ AVANZADO - solo si entiendes DevTools):
1. Loguea como cualquier usuario
2. DevTools → Consola:
```javascript
// Obtener token actual
const token = localStorage.getItem('session_token');
console.log('Token original:', token.substring(0, 30) + '...');

// Modificar token a algo inválido
localStorage.setItem('session_token', 'INVALID_TOKEN_12345');

// Intentar cargar historial
```

3. Ve a tabla de Historial y recarga (F5)
4. Verifica que **historial está vacío** o muestra **error**

**Resultado esperado**: 
- ✅ Token inválido rechaza acceso
- ✅ Backend retorna error 'AUTH_FAILED'
- ✅ Historial no muestra datos

**Restaurar token**:
```javascript
localStorage.removeItem('session_token');
// Loguea de nuevo para generar token válido
```

---

## 🎨 MITIGACIÓN 2: Borrador por Usuario

### Test 2.1: Borradores tienen clave única
**Pasos**:
1. Loguea como **Usuario A**
2. **Llena parcialmente** el formulario:
   - Número OT: OT-TEST-001
   - Cliente: Test Client
   - Técnico: Usuario A
3. **Guarda borrador** (presiona Ctrl+S o busca botón de guardar)
4. DevTools → Consola:
```javascript
const keys = Object.keys(localStorage).filter(k => k.includes('draft'));
console.log('Claves de borrador:', keys);
console.log('Contenido:', localStorage.getItem(keys[0]));
```

**Resultado esperado**: 
- ✅ Clave contiene ID de usuario: `checklist_ac_draft_USER_A_ID`
- ✅ Contenido muestra datos del formulario (OT, Cliente, etc.)

**❌ Si falla**:
- Verifica que `saveDraft()` usa `getStorageKeyForUser()`
- Verifica que `getStorageKeyForUser()` retorna clave con ID

---

### Test 2.2: Borradores no se mezclan entre usuarios
**Pasos**:
1. **Mantén** el borrador de Usuario A guardado
2. Cierra sesión
3. Loguea como **Usuario B**
4. **No llenes nada en el formulario**
5. Intenta **cargar el borrador** (Ctrl+L o busca botón)
6. DevTools → Consola:
```javascript
const keysB = Object.keys(localStorage).filter(k => k.includes('draft'));
console.log('Claves activas para Usuario B:', keysB);
// Mostrar ambas claves (de A y B)
keysB.forEach(k => {
  console.log(`${k}: ${localStorage.getItem(k).substring(0, 50)}...`);
});
```

**Resultado esperado**: 
- ✅ Hay DUAS claves: `checklist_ac_draft_A` y `checklist_ac_draft_B`
- ✅ Formulario de Usuario B está **VACÍO** (no carga borrador de A)
- ✅ Cada usuario solo ve su propia clave

**❌ Si falla**:
- Verifica que `loadDraft()` usa `getStorageKeyForUser()` (no hardcoded)
- Verifica que ambos usuarios usan `getStorageKeyForUser()`

---

### Test 2.3: Recuperación de borrador después de logout
**Pasos**:
1. Loguea como **Usuario A**
2. **Verifica que el formulario contiene sus datos anteriores** (OT, Cliente, etc.)
3. Cierra sesión
4. Loguea como **Usuario B**
5. Verifica que formulario de B está vacío
6. Cierra sesión
7. Loguea como **Usuario A de nuevo**
8. **Verifica que datos de A se recuperan** automáticamente

**Resultado esperado**: 
- ✅ Usuario A ve sus datos al volver a loguear

**❌ Si falla**:
- Verifica que al login se llama automáticamente a `loadDraft()`
- Verifica que `getStorageKeyForUser()` retorna misma clave para mismo usuario

---

## 📦 MITIGACIÓN 3: Historial Filtrado en Backend

Este ya fue validado en **Test 1.3 y 1.4** (Filtrado de historial).

### Test 3.1: Backend filtra ANTES de enviar datos
**Pasos** (⚠️ AVANZADO):
1. DevTools → Pestaña **Network**
2. Loguea como **Técnico A**
3. Abre **Historial de Mantenimientos**
4. En Network, busca solicitud con:
   - URL contiene: `action=historial`
   - Debe incluir: `&token=...`

5. **Haz click en esa solicitud** → Preview / Response
6. Verifica que respuesta contiene **SOLO órdenes de Técnico A**

**Resultado esperado**: 
- ✅ Response JSON muestra solo órdenes del técnico
- ✅ NO hay órdenes de otros técnicos en la respuesta

**❌ Si falla**:
- Verifica que `doGet()` en backend filtra `historial`
- Verifica que usa `matchTechnicianName()` correctamente

---

## 🛡️ MITIGACIÓN 4: Encapsulación de Estado

### Test 4.1: AppState protege currentUser
**Pasos**:
1. Loguea como cualquier usuario
2. DevTools → Consola:
```javascript
// Ver usuario actual
console.log('Usuario actual:', AppState.getCurrentUser().nombre);

// Intentar modificar directamente (DEBE FALLAR)
currentUser = { nombre: 'Hacker', id: 'hacker', rol: 'Admin' };

// Verificar si cambió
console.log('Usuario después de modificación:', AppState.getCurrentUser().nombre);
```

**Resultado esperado**: 
- ✅ `currentUser = {...}` NO modifica el estado
- ✅ Usuario sigue siendo el original
- ✅ Mensaje en consola: usuario IGUAL antes y después

**❌ Si falla**:
- Verifica que `Object.defineProperty` está configurado para `currentUser`
- Verifica que está en app.js línea ~30-50
- Verifica que configurable es `false`

---

### Test 4.2: Métodos públicos de AppState funcionan
**Pasos**:
1. DevTools → Consola:
```javascript
// Crear usuario de prueba
const testUser = { nombre: 'Test Tech', id: 'test_123', rol: 'Técnico' };

// Usar método público
AppState.setCurrentUser(testUser);

// Verificar
console.log('Usuario TestTech:', AppState.getCurrentUser());
```

**Resultado esperado**: 
- ✅ Retorna usuario TestTech con id 'test_123'
- ✅ Métodos públicos SÍ funcionan

---

### Test 4.3: Reset limpia todo
**Pasos**:
1. DevTools → Consola:
```javascript
// Antes de reset
console.log('Antes:', {
  usuario: AppState.getCurrentUser(),
  historial: AppState.getHistoryCache().length,
  token: localStorage.getItem('session_token')
});

// Reset
AppState.reset();

// Después de reset
console.log('Después:', {
  usuario: AppState.getCurrentUser(),
  historial: AppState.getHistoryCache().length,
  token: localStorage.getItem('session_token')
});
```

**Resultado esperado**: 
- ✅ Antes: usuario, historial, token con datos
- ✅ Después: usuario = null, historial = 0, token = null

---

## 🔒 TEST DE SEGURIDAD INTEGRADO

### Test S1: DevTools Bypass Completo Falla
**Escenario realista de ataque**:

**Paso 1**: Loguea como **Técnico A**
```
- Visualiza 5 órdenes en historial
- Cada orden muestra solo Técnico A
```

**Paso 2**: DevTools → Consola - Intentar bypass
```javascript
// Ataque 1: Modificar usuario
currentUser = { nombre: 'Técnico B', id: 'B', rol: 'Técnico' };
console.log('Intento cambiar a:', currentUser);

// Ataque 2: Modificar cache directamente
historyDataCache = [
  { 'N° Orden / OT': 'OT-HACK-001', 'Técnico Responsable': 'Hacker' }
];
console.log('Cache modificado:', AppState.getHistoryCache());

// Ataque 3: Remover token para bypass
localStorage.removeItem('session_token');
```

**Paso 3**: Recargar página (F5)

**Resultado esperado**: 
- ✅ Página recarga
- ✅ Historial vuelve a mostrar SOLO órdenes reales de Técnico A
- ✅ Token se regenera (si estaba en localStorage)
- ✅ Modificaciones de DevTools SE PERDIERON

**❌ Si falla**:
- ¡Hay una brecha! Revisar cada mitigación
- Probablemente `AppState` no está configurado correctamente

---

## 📊 Matriz de Validación Final

Marca ✅ o ❌ para cada test:

| Test | Mitigación | Estado | Notas |
|------|-----------|--------|-------|
| 1.1 | Backend | ✅ ❌ | Token genera |
| 1.2 | Backend | ✅ ❌ | Token se limpia |
| 1.3 | Backend | ✅ ❌ | Técnico A ve sus órdenes |
| 1.4 | Backend | ✅ ❌ | Técnico B ve diferentes |
| 1.5 | Backend | ✅ ❌ | Admin ve todas |
| 2.1 | Borrador | ✅ ❌ | Clave única por usuario |
| 2.2 | Borrador | ✅ ❌ | No mezcla entre usuarios |
| 2.3 | Borrador | ✅ ❌ | Recuperación de datos |
| 3.1 | Filtrado | ✅ ❌ | Backend filtra antes enviar |
| 4.1 | Estado | ✅ ❌ | currentUser protegido |
| 4.2 | Estado | ✅ ❌ | AppState funciona |
| 4.3 | Estado | ✅ ❌ | Reset limpia |
| S1 | Integrado | ✅ ❌ | DevTools bypass falla |

---

## 🎯 Criterio de Éxito

**Todas las mitigaciones son ACEPTABLES si**:
- ✅ **Todos los tests marcados** con ✅
- ✅ **Ninguno marcado** con ❌
- ✅ **Funcionalidad normal** del app sigue igual (sin regresiones)
- ✅ **Performance** es igual o mejor

**Si hay algún ❌**, antes de considerar "completado":
1. Lee sección "❌ Si falla" de ese test
2. Revisa el código correspondiente
3. Reejcuta el test
4. Si persiste, contacta soporte o revisa la guía paso a paso

---

## 🚀 Después de Validar TODO

1. **Commit tus cambios**:
```bash
git add .
git commit -m "feat: validación exitosa de mitigaciones de seguridad"
```

2. **Crear tag** (opcional pero recomendado):
```bash
git tag -a v1.1.0-security -m "Implementación de mitigaciones de seguridad multi-tenant"
```

3. **Push**:
```bash
git push origin main
git push origin v1.1.0-security
```

4. **Actualizar documentación** en README.md si existe

5. **Notificar al equipo** que seguridad está mejorada

---

## 📞 Resolución de Problemas

### "Token no genera"
```
1. Verifica console.log en Google Apps Script (Menú > Execuciones)
2. Verificar que doPost() maneja 'generate_token'
3. Recarga página completamente (Ctrl+Shift+R)
4. Loguea nuevamente
```

### "Historial está vacío"
```
1. Verifica que usuario tiene órdenes en Google Sheets
2. Verifica que token es válido (localStorage)
3. Verifica que backend filtra correctamente
4. Abre Network tab en DevTools y verifica respuesta del servidor
```

### "Borrador no se recupera"
```
1. Verificar localStorage: Object.keys(localStorage).filter(k => k.includes('draft'))
2. Verifica que getStorageKeyForUser() incluye ID de usuario
3. Verifica que loadDraft() se llama automáticamente al login
```

### "DevTools PUEDE modificar currentUser"
```
❌ CRÍTICO - Mitigación 4 NO funcionó
1. Verifica que AppState está en app.js línea 30-50
2. Verifica que Object.defineProperty está presente
3. Verifica que configurable: false está en cada propiedad
4. Recarga página (Ctrl+Shift+R)
```

---

## ✅ Checklist Pre-Deploy

- [ ] Todos los 13 tests están en ✅
- [ ] Ningún test está en ❌
- [ ] Formulario crea órdenes normalmente
- [ ] Historial renderiza sin errores
- [ ] Clientes se cargan en dropdown
- [ ] PDF export funciona
- [ ] Admin ve todas las órdenes
- [ ] Técnicos ven solo sus órdenes
- [ ] Borradores se guardan y recuperan
- [ ] Logout limpia todo
- [ ] DevTools bypass falla

**¿Todos los ✅?** → ¡LISTO PARA PRODUCCIÓN! 🎉

