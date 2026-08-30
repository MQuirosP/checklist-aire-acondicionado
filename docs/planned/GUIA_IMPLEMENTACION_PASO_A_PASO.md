# Guía Paso a Paso: Implementación de Mitigaciones

**Objetivo**: Implementar 4 mitigaciones de seguridad en orden, con validación after each step.

---

## ⚠️ ANTES DE EMPEZAR

1. Haz backup de tu trabajo: `git add . && git commit -m "backup antes de mitigaciones"`
2. Abre dos ventanas: una con el editor de Google Apps Script, otra con VS Code
3. Ten a mano el archivo `PLAN_MITIGACION_SEGURIDAD.md` para referencia

---

## PASO 1: Validación en Backend (Google Apps Script)

### 1.1 Agregar funciones de token (30 min)

**Archivo**: Google Apps Script  
**Ubicación**: Pega este código al INICIO del archivo (línea 1), ANTES de `doPost(e)` y `doGet(e)`

```javascript
/**
 * [NUEVA] Genera un token de sesión único para un usuario
 * Válido por 24 horas
 */
function generateSessionToken(userId) {
  var properties = PropertiesService.getUserProperties();
  var tokenKey = 'session_token_' + userId;
  var existingToken = properties.getProperty(tokenKey);
  var tokenTimestamp = properties.getProperty(tokenKey + '_ts');
  
  // Si existe token válido (< 24h), retornarlo
  if (existingToken && tokenTimestamp) {
    var tokenAge = (new Date().getTime() - parseInt(tokenTimestamp)) / (1000 * 60 * 60);
    if (tokenAge < 24) {
      return existingToken;
    }
  }
  
  // Generar nuevo token
  var timestamp = new Date().getTime();
  var random = Math.random().toString(36).substring(2, 15);
  var newToken = Utilities.getUuid() + '_' + timestamp + '_' + random;
  
  properties.setProperty(tokenKey, newToken);
  properties.setProperty(tokenKey + '_ts', timestamp.toString());
  properties.setProperty(tokenKey + '_user', userId);
  
  return newToken;
}

/**
 * [NUEVA] Valida un token de sesión
 * Retorna {valid: boolean, userId: string}
 */
function validateSessionToken(token) {
  var properties = PropertiesService.getUserProperties();
  var allProperties = properties.getProperties();
  
  for (var key in allProperties) {
    if (key.indexOf('session_token_') === 0 && key.indexOf('_ts') === -1 && key.indexOf('_user') === -1) {
      if (allProperties[key] === token) {
        var userId = allProperties[key + '_user'];
        var timestamp = parseInt(allProperties[key + '_ts']);
        var tokenAge = (new Date().getTime() - timestamp) / (1000 * 60 * 60);
        
        if (tokenAge < 24) {
          return { valid: true, userId: userId };
        } else {
          // Token expirado, limpiar
          properties.deleteProperty(key);
          properties.deleteProperty(key + '_ts');
          properties.deleteProperty(key + '_user');
          return { valid: false, userId: null };
        }
      }
    }
  }
  
  return { valid: false, userId: null };
}

/**
 * [NUEVA] Genera token al login
 */
function doPost_generateToken(data) {
  var userId = data.userId || data.user_id || '';
  if (!userId) {
    return ContentService.createTextOutput(JSON.stringify({
      result: 'error',
      error: 'userId requerido'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var token = generateSessionToken(userId);
  return ContentService.createTextOutput(JSON.stringify({
    result: 'success',
    token: token,
    expiresIn: 86400
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * [NUEVA] Busca usuario por ID
 */
function getUsuarioById(userId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Usuarios');
  if (!sheet) return null;
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if ((data[i][0] || '').toString() === userId) {
      return {
        id: data[i][0],
        nombre: data[i][1],
        rol: data[i][3],
        PIN: data[i][2]
      };
    }
  }
  return null;
}

/**
 * [NUEVA] Verifica si usuario es admin
 */
function isUserAdmin(user) {
  var rol = (user.rol || user.Rol || '').toString().toLowerCase();
  return rol.indexOf('admin') !== -1;
}

/**
 * [NUEVA] Normaliza comparación de nombres
 */
function matchTechnicianName(str1, str2) {
  if (!str1 || !str2) return false;
  var s1 = str1.toString().toLowerCase().trim();
  var s2 = str2.toString().toLowerCase().trim();
  return s1 === s2 || s1.indexOf(s2) !== -1 || s2.indexOf(s1) !== -1;
}
```

✅ **Guardar en Google Apps Script** (Ctrl+S o Cmd+S)

### 1.2 Modificar doPost() (15 min)

**Ubicación**: En tu función `doPost(e)` actual, encuentra la sección:
```javascript
if (data.action === 'add_cliente') {
```

**ANTES** de esa línea, agrega:
```javascript
    // [NUEVO] Manejar generación de token
    if (data.action === 'generate_token') {
      return doPost_generateToken(data);
    }
```

Así que tu código queda:
```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // [NUEVO] Manejar generación de token
    if (data.action === 'generate_token') {
      return doPost_generateToken(data);
    }

    // 1. Guardar nuevo cliente si action === 'add_cliente'
    if (data.action === 'add_cliente') {
      // ... resto del código
```

✅ **Guardar en Google Apps Script**

### 1.3 Modificar doGet() (45 min)

**Ubicación**: Tu función `doGet(e)` actual. Reemplaza TODO el contenido por:

```javascript
function doGet(e) {
  var action = e.parameter.action || '';
  
  // [NUEVO] Validar token en acciones sensibles
  var token = e.parameter.token || '';
  var tokenValidation = { valid: false, userId: null };
  
  if (token && ['historial', 'clientes_del_usuario', 'tecnicos'].indexOf(action) !== -1) {
    tokenValidation = validateSessionToken(token);
    if (!tokenValidation.valid) {
      return ContentService.createTextOutput(JSON.stringify({
        result: 'error',
        error: 'Token inválido o expirado',
        code: 'AUTH_FAILED'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Acción pública (sin validación)
  if (action === 'usuarios') {
    return sendJson(getUsuarios());
  }
  
  // [NUEVO] Historial con token y filtrado
  if (action === 'historial') {
    var records = getSheetJson('Órdenes') || [];
    
    // Si usuario es Técnico, filtrar sus órdenes
    var user = getUsuarioById(tokenValidation.userId);
    if (user && !isUserAdmin(user)) {
      var tecnicoNombre = user.nombre || user.Nombre || '';
      records = records.filter(function(r) {
        var recordTec = (r['Técnico Responsable'] || r['Nombre Técnico'] || '').toString();
        return matchTechnicianName(recordTec, tecnicoNombre);
      });
    }
    
    return sendJson(records);
  }
  
  // [NUEVO] Clientes del usuario con token y filtrado
  if (action === 'clientes_del_usuario') {
    var clientes = getSheetJson('Clientes') || [];
    var user = getUsuarioById(tokenValidation.userId);
    
    if (user && !isUserAdmin(user)) {
      var tecnicoNombre = user.nombre || user.Nombre || '';
      clientes = clientes.filter(function(c) {
        var creador = (c.Creador || c['Creador'] || '').toString().trim();
        
        // Opción 1: Cliente que creó
        if (creador && matchTechnicianName(creador, tecnicoNombre)) {
          return true;
        }
        
        // Opción 2: Cliente con historial
        var cliNombre = (c['Nombre / Empresa'] || '').toString().toLowerCase().trim();
        var historial = getSheetJson('Órdenes') || [];
        var hasHistory = historial.some(function(h) {
          var hCli = (h['Cliente / Ubicación'] || '').toString().toLowerCase().trim();
          var hTec = (h['Técnico Responsable'] || '').toString();
          return hCli.includes(cliNombre) && matchTechnicianName(hTec, tecnicoNombre);
        });
        
        return hasHistory;
      });
    }
    
    return sendJson(clientes);
  }
  
  // Técnicos - todos pueden verlos (para dropdown)
  if (action === 'tecnicos') {
    var tecnicos = getSheetJson('Técnicos') || [];
    return sendJson(tecnicos);
  }
  
  // [RESTO DE TUS ACCIONES EXISTENTES]
  // ... agrega aquí tus otras acciones (clientes, equipos, etc.)
  // Sin cambios
  
  return sendJson([]);
}
```

✅ **Guardar en Google Apps Script**

### 1.4 Test de Backend (10 min)

**En Google Apps Script**:
1. Menú superior → Ejecutar → Selecciona `generateSessionToken`
2. Parámetro: `"USER_123"`
3. Debe retornar un UUID en los logs

**Verificar en Logs** (Menú superior → Execuciones o Logs):
```
✅ Token generado exitosamente
```

---

## PASO 2: Frontend - Sistema de Token (1 hora)

### 2.1 Agregar funciones de token en app.js (30 min)

**Archivo**: app.js  
**Ubicación**: Busca la función `loginUser()` (alrededor de línea 129)

**ANTES** de `loginUser()`, agrega estas funciones nuevas:

```javascript
/**
 * [NUEVA] Genera token desde servidor
 */
async function generateSessionTokenFromServer(userId) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PEGA_AQUI_TU_URL')) return null;
  
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      payload: JSON.stringify({
        action: 'generate_token',
        userId: userId
      })
    });
    
    const text = await res.text();
    const data = JSON.parse(text);
    
    if (data.result === 'success' && data.token) {
      return data.token;
    }
  } catch (e) {
    console.warn('⚠️ Error generando token:', e);
  }
  
  return null;
}

/**
 * [NUEVA] Obtiene token actual
 */
function getSessionToken() {
  try {
    return localStorage.getItem('session_token') || '';
  } catch (e) {
    return '';
  }
}
```

### 2.2 Modificar loginUser() (15 min)

**Ubicación**: Función `loginUser()` (línea ~129)

**ORIGINAL**:
```javascript
function loginUser(user) {
  currentUser = user;
  try {
    localStorage.setItem('session_user', JSON.stringify(user));
    if (user && user.id) {
      localStorage.setItem('last_login_user_id', user.id);
    }
  } catch (e) {}

  updateNavigationUI();
  // ...
}
```

**MODIFICADO** (agrega después del try-catch):
```javascript
function loginUser(user) {
  currentUser = user;
  try {
    localStorage.setItem('session_user', JSON.stringify(user));
    if (user && user.id) {
      localStorage.setItem('last_login_user_id', user.id);
    }
  } catch (e) {}

  // [NUEVO] Generar y almacenar token
  if (user && user.id) {
    generateSessionTokenFromServer(user.id).then(token => {
      if (token) {
        try {
          localStorage.setItem('session_token', token);
          console.log('✅ Token generado:', token.substring(0, 20) + '...');
        } catch (e) {}
      }
    });
  }

  updateNavigationUI();
  // ... resto sin cambios
}
```

### 2.3 Modificar logoutUser() (15 min)

**Ubicación**: Función `logoutUser()` (línea ~155)

**AGREGA** después de `localStorage.removeItem('session_user');`:
```javascript
    localStorage.removeItem('session_token');  // [NUEVO]
```

Así queda:
```javascript
function logoutUser() {
  currentUser = null;
  enteredPin = '';
  updatePinDisplay();
  try {
    localStorage.removeItem('session_user');
    localStorage.removeItem('session_token');  // [NUEVO]
  } catch (e) {}

  if (typeof updateClientsUI === 'function') updateClientsUI();
  // ... resto sin cambios
}
```

✅ **Guardar app.js**

### 2.4 Test Frontend - Token (15 min)

1. **Abre el navegador** en la aplicación
2. **Loguea con un usuario**
3. **Abre DevTools** (F12)
4. **Consola → Ejecuta:**
```javascript
console.log(localStorage.getItem('session_token'))
```

✅ **Debe mostrar un UUID largo** como:
```
8a9c1234-5678-9abc-def0-1234567890ab_1693401234567_a8f9g2h3
```

5. **Cierra sesión**
6. **Verifica que el token fue eliminado:**
```javascript
console.log(localStorage.getItem('session_token'))
```

✅ **Debe mostrar `null`**

---

## PASO 3: Frontend - Usar Token en Solicitudes (1 hora)

### 3.1 Modificar fetchHistoryData() (30 min)

**Ubicación**: Busca `fetchHistoryData()` (alrededor de línea 1544)

**ORIGINAL**:
```javascript
async function fetchHistoryData() {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PEGA_AQUI_TU_URL')) {
    console.warn('Google Apps Script URL no configurada');
    return;
  }

  try {
    const fetchUrl = `${GOOGLE_SCRIPT_URL}?action=historial&_t=${Date.now()}`;
    
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    const text = await res.text();
    let data = [];
    try { data = JSON.parse(text); } catch (e) {}

    if (Array.isArray(data)) {
      historyDataCache = data;
      renderHistoryTable();
    }
  } catch (error) {
    console.error('Error en fetchHistoryData:', error);
  }
}
```

**MODIFICADO**:
```javascript
async function fetchHistoryData() {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PEGA_AQUI_TU_URL')) {
    console.warn('Google Apps Script URL no configurada');
    return;
  }

  try {
    // [NUEVO] Incluir token en URL
    const token = getSessionToken();
    const fetchUrl = token 
      ? `${GOOGLE_SCRIPT_URL}?action=historial&_t=${Date.now()}&token=${encodeURIComponent(token)}`
      : `${GOOGLE_SCRIPT_URL}?action=historial&_t=${Date.now()}`;
    
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    const text = await res.text();
    let data = [];
    try { data = JSON.parse(text); } catch (e) {}

    if (Array.isArray(data)) {
      historyDataCache = data;
      renderHistoryTable();
    }
  } catch (error) {
    console.error('Error en fetchHistoryData:', error);
  }
}
```

### 3.2 Modificar updateClientsUI() (30 min)

**Ubicación**: Busca `updateClientsUI()` (alrededor de línea 2506)

**ORIGINAL**:
```javascript
function updateClientsUI() {
  const select = document.getElementById('cliente');
  const tbody = document.getElementById('clients-table-body');
  const showInactive = document.getElementById('show-inactive-clients')?.checked;

  try {
    const fetchUrl = `${GOOGLE_SCRIPT_URL}?action=clientes&_t=${Date.now()}`;
    
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    const text = await res.text();
    let data = [];
    try { data = JSON.parse(text); } catch (e) {}

    clientsCache = Array.isArray(data) ? data : [];
    // ... resto
```

**MODIFICADO**:
```javascript
async function updateClientsUI() {
  const select = document.getElementById('cliente');
  const tbody = document.getElementById('clients-table-body');
  const showInactive = document.getElementById('show-inactive-clients')?.checked;

  try {
    // [NUEVO] Usar endpoint con token
    const token = getSessionToken();
    const fetchUrl = token
      ? `${GOOGLE_SCRIPT_URL}?action=clientes_del_usuario&_t=${Date.now()}&token=${encodeURIComponent(token)}`
      : `${GOOGLE_SCRIPT_URL}?action=clientes&_t=${Date.now()}`;
    
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    const text = await res.text();
    let data = [];
    try { data = JSON.parse(text); } catch (e) {}

    clientsCache = Array.isArray(data) ? data : [];
    // ... resto sin cambios
```

✅ **Guardar app.js**

### 3.3 Test - Filtrado de Datos (20 min)

**Escenario 1: Usuario Técnico A**
1. Loguea como Técnico A
2. Abre DevTools → Consola
3. Ejecuta:
```javascript
console.log(AppState.getHistoryCache().length)  // Debe ser número
```

4. Verifica que solo ve sus órdenes en la tabla

**Escenario 2: Usuario Técnico B**
1. Loguea como Técnico B
2. Ejecuta mismo comando
3. Debe retornar NÚMERO DIFERENTE o menos órdenes

**Escenario 3: Usuario Admin**
1. Loguea como Admin
2. Ejecuta mismo comando
3. Debe retornar TODAS las órdenes (número más alto)

---

## PASO 4: Borrador por Usuario (45 min)

### 4.1 Agregar función getStorageKeyForUser() (10 min)

**Archivo**: app.js  
**Ubicación**: Busca `const STORAGE_KEY = 'checklist_ac_draft'` (alrededor de línea 1350)

**REEMPLAZA** esa línea con:
```javascript
// [MODIFICADO] Clave de almacenamiento dinámica por usuario
function getStorageKeyForUser() {
  if (currentUser && currentUser.id) {
    return `checklist_ac_draft_${currentUser.id}`;
  }
  return 'checklist_ac_draft_temp';
}
```

### 4.2 Modificar saveDraft() (10 min)

**Ubicación**: Busca `function saveDraft()`

**ORIGINAL**:
```javascript
function saveDraft() {
  try {
    const formData = new FormData(document.getElementById('checklist-form'));
    const data = Object.fromEntries(formData);
    
    data.firma_tecnico_base64 = canvasTecnico.toDataURL('image/png');
    data.firma_cliente_base64 = canvasCliente.toDataURL('image/png');
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('✅ Borrador guardado');
  } catch (error) {
    console.error('Error guardando borrador:', error);
  }
}
```

**MODIFICADO**:
```javascript
function saveDraft() {
  try {
    const storageKey = getStorageKeyForUser();  // [NUEVO]
    const formData = new FormData(document.getElementById('checklist-form'));
    const data = Object.fromEntries(formData);
    
    data.firma_tecnico_base64 = canvasTecnico.toDataURL('image/png');
    data.firma_cliente_base64 = canvasCliente.toDataURL('image/png');
    
    localStorage.setItem(storageKey, JSON.stringify(data));  // [MODIFICADO]
    console.log('✅ Borrador guardado');
  } catch (error) {
    console.error('Error guardando borrador:', error);
  }
}
```

### 4.3 Modificar loadDraft() (15 min)

**Ubicación**: Busca `function loadDraft()`

**REEMPLAZA** la primera línea de:
```javascript
    const savedData = localStorage.getItem(STORAGE_KEY);
```

Por:
```javascript
    const storageKey = getStorageKeyForUser();  // [NUEVO]
    const savedData = localStorage.getItem(storageKey);  // [MODIFICADO]
```

### 4.4 Modificar clearDraft() (5 min)

**Ubicación**: Busca `function clearDraft()`

**REEMPLAZA**:
```javascript
    localStorage.removeItem(STORAGE_KEY);
```

Por:
```javascript
    const storageKey = getStorageKeyForUser();  // [NUEVO]
    localStorage.removeItem(storageKey);  // [MODIFICADO]
```

✅ **Guardar app.js**

### 4.5 Test - Borradores Independientes (15 min)

**Escenario: Dos usuarios**

1. **Usuario A loguea**
2. **Llena parcialmente el formulario** (OT, Cliente, Técnico)
3. **Guarda borrador** (Ctrl+S o botón)
4. **DevTools → Consola:**
```javascript
Object.keys(localStorage).filter(k => k.includes('draft'))
// Debe mostrar: ['checklist_ac_draft_USER_A_ID']
```

5. **Cierra sesión**
6. **Usuario B loguea**
7. **DevTools → Consola:**
```javascript
Object.keys(localStorage).filter(k => k.includes('draft'))
// Debe mostrar: ['checklist_ac_draft_USER_B_ID', 'checklist_ac_draft_USER_A_ID']
```

8. **Intenta cargar formulario → VACÍO** (Usuario B no tiene borrador)
9. **Cierra sesión**
10. **Usuario A loguea de nuevo**
11. **Intenta cargar formulario → SUS DATOS RECUPERADOS** ✅

---

## PASO 5: Encapsulación de Estado (1 hora)

### 5.1 Crear objeto AppState (30 min)

**Archivo**: app.js  
**Ubicación**: AL INICIO del archivo (línea ~30, después de `const GOOGLE_SCRIPT_URL = '...'`)

**AGREGA** este código:

```javascript
/**
 * [NUEVA] AppState - Contenedor encapsulado del estado
 * Evita acceso directo desde DevTools
 */
const AppState = (() => {
  let _currentUser = null;
  let _historyCache = [];
  let _clientsCache = [];
  let _techniciansCache = [];
  let _equipmentTypesCache = [];
  let _sessionToken = null;

  return {
    // Usuario
    setCurrentUser(user) {
      _currentUser = user;
      if (user && user.id) {
        try {
          localStorage.setItem('session_user', JSON.stringify(user));
        } catch (e) {}
      }
    },
    getCurrentUser() {
      return _currentUser;
    },
    clearCurrentUser() {
      _currentUser = null;
      try {
        localStorage.removeItem('session_user');
      } catch (e) {}
    },
    
    // Historial
    setHistoryCache(data) {
      _historyCache = Array.isArray(data) ? [...data] : [];
    },
    getHistoryCache() {
      return [..._historyCache];
    },
    
    // Clientes
    setClientsCache(data) {
      _clientsCache = Array.isArray(data) ? [...data] : [];
    },
    getClientsCache() {
      return [..._clientsCache];
    },
    
    // Técnicos
    setTechniciansCache(data) {
      _techniciansCache = Array.isArray(data) ? [...data] : [];
    },
    getTechniciansCache() {
      return [..._techniciansCache];
    },
    
    // Equipos
    setEquipmentTypesCache(data) {
      _equipmentTypesCache = Array.isArray(data) ? [...data] : [];
    },
    getEquipmentTypesCache() {
      return [..._equipmentTypesCache];
    },
    
    // Token
    setSessionToken(token) {
      _sessionToken = token;
      if (token) {
        try {
          localStorage.setItem('session_token', token);
        } catch (e) {}
      }
    },
    getSessionToken() {
      return _sessionToken;
    },
    
    // Reset
    reset() {
      _currentUser = null;
      _historyCache = [];
      _clientsCache = [];
      _techniciansCache = [];
      _equipmentTypesCache = [];
      _sessionToken = null;
      try {
        localStorage.removeItem('session_user');
        localStorage.removeItem('session_token');
      } catch (e) {}
    }
  };
})();

// [NUEVA] Retrocompatibilidad: delegar variables globales a AppState
Object.defineProperty(window, 'currentUser', {
  get() { return AppState.getCurrentUser(); },
  set(value) { AppState.setCurrentUser(value); },
  configurable: false
});

Object.defineProperty(window, 'historyDataCache', {
  get() { return AppState.getHistoryCache(); },
  set(value) { AppState.setHistoryCache(value); },
  configurable: false
});

Object.defineProperty(window, 'clientsCache', {
  get() { return AppState.getClientsCache(); },
  set(value) { AppState.setClientsCache(value); },
  configurable: false
});

Object.defineProperty(window, 'techniciansCache', {
  get() { return AppState.getTechniciansCache(); },
  set(value) { AppState.setTechniciansCache(value); },
  configurable: false
});

Object.defineProperty(window, 'equipmentTypesCache', {
  get() { return AppState.getEquipmentTypesCache(); },
  set(value) { AppState.setEquipmentTypesCache(value); },
  configurable: false
});
```

✅ **Guardar app.js**

### 5.2 Test - Protección de Estado (15 min)

**Test 1: Modificación fallida**

1. Loguea como cualquier usuario
2. DevTools → Consola
3. Intenta modificar:
```javascript
currentUser = { nombre: 'Hacker', rol: 'Admin' };
console.log(currentUser);
```

✅ **Debe mostrar el usuario ORIGINAL** (no cambia)

**Test 2: Métodos públicos funcionan**

```javascript
AppState.setCurrentUser({ nombre: 'Test', id: 'test_123', rol: 'Técnico' });
console.log(AppState.getCurrentUser());
```

✅ **Debe mostrar el usuario TEST**

**Test 3: Reset completo**

```javascript
AppState.reset();
console.log(AppState.getCurrentUser());  // null
console.log(localStorage.getItem('session_token'));  // null
```

✅ **Debe estar vacío**

---

## PASO 6: Testing Final (30 min)

### Test Completo: Multi-Tenant

Ejecuta esta secuencia:

**Setup**:
```
- Usuarios en Google Sheets:
  Técnico A (id=A, PIN=1111)
  Técnico B (id=B, PIN=2222)
  Admin (id=admin, PIN=9999)
  
- Órdenes de ejemplo:
  OT-2026-0001 → Técnico A
  OT-2026-0002 → Técnico A
  OT-2026-0003 → Técnico B
```

**Test 1: Técnico A**
```
1. Loguea con PIN 1111
2. Ver historial → debe ver OT-0001 y OT-0002
3. Guardar borrador
4. DevTools: localStorage muestra 'checklist_ac_draft_A'
5. Cierra sesión
```

**Test 2: Técnico B**
```
1. Loguea con PIN 2222
2. Ver historial → debe ver SOLO OT-0003
3. Guardar borrador
4. DevTools: localStorage muestra 'checklist_ac_draft_B'
5. Intenta cargar formulario → VACÍO
6. Cierra sesión
```

**Test 3: Admin**
```
1. Loguea como Admin (PIN 9999)
2. Ver historial → debe ver OT-0001, OT-0002, OT-0003
3. Cierra sesión
```

**Test 4: DevTools Bypass Attempt**
```
1. Técnico A loguea
2. DevTools → Consola:
   - Intenta: AppState.setCurrentUser({nombre:'B'})
   - Recarga historial
   - Verifica: sigue viendo sus órdenes
3. ✅ Token válida y rechaza acceso cruzado
```

---

## 🎯 Checklist de Completitud

Marca cada item cuando esté 100% completo:

### Backend
- [ ] Funciones de token agregadas a Google Apps Script
- [ ] doPost() maneja 'generate_token'
- [ ] doGet() valida tokens
- [ ] Filtrado de historial por usuario
- [ ] Filtrado de clientes por usuario
- [ ] Test: Token genera exitosamente
- [ ] Test: Token rechaza acceso sin validar

### Frontend - Token
- [ ] Funciones generateSessionTokenFromServer() y getSessionToken() agregadas
- [ ] loginUser() genera token
- [ ] logoutUser() limpia token
- [ ] Token aparece en localStorage
- [ ] Token se limpia al logout

### Frontend - Solicitudes
- [ ] fetchHistoryData() incluye token
- [ ] updateClientsUI() incluye token
- [ ] Historial se filtra correctamente
- [ ] Clientes se filtra correctamente

### Borrador
- [ ] getStorageKeyForUser() agregada
- [ ] saveDraft() usa nueva clave
- [ ] loadDraft() usa nueva clave
- [ ] clearDraft() usa nueva clave
- [ ] Test: Borradores de A y B separados

### Estado
- [ ] AppState IIFE creado
- [ ] Object.defineProperty para retrocompatibilidad
- [ ] Test: Modificación desde DevTools falla
- [ ] Test: Métodos de AppState funcionan

### Testing Final
- [ ] Técnico A ve solo sus órdenes
- [ ] Técnico B ve solo sus órdenes
- [ ] Admin ve todas
- [ ] Borradores no se mezclan
- [ ] Token válida a través de solicitudes

---

## 📞 Si algo falla...

| Error | Solución |
|---|---|
| "Token inválido" al cargar | Vuelve a loguear (regenera token) |
| Historial vacío para Admin | Verifica que Admin loguee correctamente |
| Borradores se mezclan | Verifica getStorageKeyForUser() retorna clave diferente |
| DevTools permite modificar currentUser | Verifica AppState y Object.defineProperty están en app.js línea 30 |
| Error al generar token en backend | Verifica generateSessionToken() en Google Apps Script línea 1 |

---

## ✅ Una vez completado TODO:

1. **Commit tu trabajo**:
```bash
git add .
git commit -m "feat: implementar mitigaciones de seguridad multi-tenant"
```

2. **Verifica que funciona** refrescando la página múltiples veces

3. **Prueba con diferentes usuarios** en sesiones privadas/incógnito

4. **Sube cambios** (si usas git push):
```bash
git push origin main
```

¡Listo! El sistema es ahora mucho más seguro. 🔐

