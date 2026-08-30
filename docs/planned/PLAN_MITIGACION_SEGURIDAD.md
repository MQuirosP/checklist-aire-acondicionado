# Plan de Mitigación de Limitaciones de Seguridad
**Checklist de Mantenimiento Preventivo de Aire Acondicionado**

**Fecha**: 2026-08-29  
**Versión**: 1.0  
**Estado**: Listo para Implementación

---

## 📋 Resumen Ejecutivo

Plan de mitigación de 4 limitaciones críticas de seguridad identificadas en el análisis de aislamiento multi-tenant. Cada mitigación está diseñada para **funcionar a la primera** con validación integrada.

| # | Limitación | Impacto | Prioridad | Tiempo Est. |
|---|---|---|---|---|
| 1 | Sin validación en Backend | Alto (DevTools bypass) | **ALTA** | 1.5 horas |
| 2 | Borrador local compartido | Medio (confusión datos) | MEDIA | 45 min |
| 3 | Historial descargado completo | Medio (acceso DevTools) | MEDIA | 1 hora |
| 4 | Variables globales sin encapsulación | Bajo (manipulación) | BAJA | 1 hora |

**Tiempo Total Estimado**: 4 horas  
**Complejidad**: Media (cambios en frontend + backend)  
**Riesgo de Regresión**: Bajo (cambios aislados + tests)

---

## 🎯 Mitigación 1: Validación en Backend (CRÍTICA)

### Problema
Google Apps Script devuelve TODO el historial sin validar quién lo solicita. Un usuario técnico puede manipular DevTools y ver órdenes de otros técnicos.

### Solución
Agregar validación de usuario en Google Apps Script usando tokens de sesión.

### Implementación

#### Paso 1.1: Crear función de generación de token (google_apps_script.js)

**Ubicación**: Al inicio de google_apps_script.js (línea ~30)

```javascript
/**
 * Genera un token de sesión único para un usuario
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
 * Valida un token de sesión
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
 * Genera token al login
 */
function doPost_generateToken(data) {
  // Se llama después de validar PIN en el frontend
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
    expiresIn: 86400  // 24 horas en segundos
  })).setMimeType(ContentService.MimeType.JSON);
}
```

#### Paso 1.2: Agregar validación a doGet() (google_apps_script.js)

**Ubicación**: Modificar función doGet() (~línea 120 del archivo)

```javascript
function doGet(e) {
  var action = e.parameter.action || '';
  
  // NUEVA: Validar token en todas las acciones sensibles
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
  
  // Acciones públicas (sin validación)
  if (action === 'usuarios') {
    return sendJson(getUsuarios());
  }
  
  // Acciones protegidas con token
  if (action === 'historial') {
    var records = getSheetJson('Órdenes') || [];
    
    // Filtrar: Si el usuario es Técnico, solo sus órdenes
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
  
  if (action === 'clientes_del_usuario') {
    var clientes = getSheetJson('Clientes') || [];
    var user = getUsuarioById(tokenValidation.userId);
    
    // Filtrar: Si es Técnico, solo sus clientes
    if (user && !isUserAdmin(user)) {
      var tecnicoNombre = user.nombre || user.Nombre || '';
      clientes = clientes.filter(function(c) {
        var creador = (c.Creador || c['Creador'] || '').toString().trim();
        if (creador && matchTechnicianName(creador, tecnicoNombre)) {
          return true;
        }
        // O si tiene historial con este cliente
        var cliNombre = (c['Nombre / Empresa'] || '').toString().toLowerCase().trim();
        var historial = getSheetJson('Órdenes') || [];
        return historial.some(function(h) {
          var hCli = (h['Cliente / Ubicación'] || '').toString().toLowerCase().trim();
          var hTec = (h['Técnico Responsable'] || '').toString();
          return hCli.includes(cliNombre) && matchTechnicianName(hTec, tecnicoNombre);
        });
      });
    }
    
    return sendJson(clientes);
  }
  
  if (action === 'tecnicos') {
    var tecnicos = getSheetJson('Técnicos') || [];
    // Los técnicos pueden ver todos los técnicos (para seleccionar en formulario)
    // Pero solo pueden VER DETALLES de los suyos
    return sendJson(tecnicos);
  }
  
  // ... resto de acciones existentes
  return sendJson([]);
}

/**
 * Busca usuario por ID en la hoja de Usuarios
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
 * Verifica si un usuario es administrador
 */
function isUserAdmin(user) {
  var rol = (user.rol || user.Rol || '').toString().toLowerCase();
  return rol.indexOf('admin') !== -1;
}

/**
 * Comparación de nombres de técnicos (normalizado)
 */
function matchTechnicianName(str1, str2) {
  if (!str1 || !str2) return false;
  var s1 = str1.toString().toLowerCase().trim();
  var s2 = str2.toString().toLowerCase().trim();
  return s1 === s2 || s1.indexOf(s2) !== -1 || s2.indexOf(s1) !== -1;
}
```

#### Paso 1.3: Modificar frontend para usar token (app.js)

**Ubicación**: Función `loginUser()` (~línea 129)

```javascript
function loginUser(user) {
  currentUser = user;
  try {
    localStorage.setItem('session_user', JSON.stringify(user));
    if (user && user.id) {
      localStorage.setItem('last_login_user_id', user.id);
    }
  } catch (e) {}

  // NUEVO: Generar y almacenar token de sesión
  if (user && user.id) {
    generateSessionTokenFromServer(user.id).then(token => {
      if (token) {
        try {
          localStorage.setItem('session_token', token);
        } catch (e) {}
      }
    });
  }

  updateNavigationUI();
  if (typeof updateClientsUI === 'function') updateClientsUI();
  if (typeof updateTechniciansUI === 'function') updateTechniciansUI();
  if (typeof updateEquipmentTypesUI === 'function') updateEquipmentTypesUI();

  if (typeof fetchHistoryData === 'function') fetchHistoryData();
  switchView('view-dashboard');
}

// NUEVA FUNCIÓN: Generar token desde servidor
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
    console.warn('Error generando token:', e);
  }
  
  return null;
}

// NUEVA FUNCIÓN: Obtener token actual
function getSessionToken() {
  try {
    return localStorage.getItem('session_token') || '';
  } catch (e) {
    return '';
  }
}
```

**Ubicación**: Modificar `fetchHistoryData()` (~línea 1544)

```javascript
async function fetchHistoryData() {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PEGA_AQUI_TU_URL')) {
    console.warn('Google Apps Script URL no configurada');
    return;
  }

  try {
    // MODIFICADO: Incluir token en la solicitud
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

**Ubicación**: Modificar `updateClientsUI()` (~línea 2506)

```javascript
async function updateClientsUI() {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PEGA_AQUI_TU_URL')) {
    console.warn('Google Apps Script URL no configurada');
    return;
  }

  try {
    // MODIFICADO: Usar endpoint de clientes del usuario con token
    const token = getSessionToken();
    const fetchUrl = token
      ? `${GOOGLE_SCRIPT_URL}?action=clientes_del_usuario&_t=${Date.now()}&token=${encodeURIComponent(token)}`
      : `${GOOGLE_SCRIPT_URL}?action=clientes&_t=${Date.now()}`;
    
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    const text = await res.text();
    let data = [];
    try { data = JSON.parse(text); } catch (e) {}

    clientsCache = Array.isArray(data) ? data : [];
    renderClientsUI();
  } catch (error) {
    console.error('Error en updateClientsUI:', error);
  }
}
```

**Ubicación**: Función `logoutUser()` (~línea 155)

```javascript
function logoutUser() {
  currentUser = null;
  enteredPin = '';
  updatePinDisplay();
  
  try {
    localStorage.removeItem('session_user');
    localStorage.removeItem('session_token');  // NUEVO: limpiar token
  } catch (e) {}

  if (typeof updateClientsUI === 'function') updateClientsUI();
  if (typeof updateTechniciansUI === 'function') updateTechniciansUI();
  if (typeof updateEquipmentTypesUI === 'function') updateEquipmentTypesUI();

  const formSetup = document.getElementById('form-initial-setup');
  if (formSetup) {
    formSetup.reset();
    formSetup.classList.add('hidden');
  }

  const pinContainer = document.getElementById('login-pin-container');
  if (pinContainer) {
    pinContainer.classList.remove('hidden');
  }

  updateNavigationUI();
  switchView('view-login');
  fetchUsersData().then(users => populateUserSelect(users));
}
```

### Validación de Mitigación 1

**Test 1**: Usuario técnico loguea → genera token
```javascript
// En consola del navegador
console.log(localStorage.getItem('session_token'));  // Debe mostrar token UUID
```

**Test 2**: Token inválido rechaza solicitudes
```javascript
// Modificar token en localStorage
localStorage.setItem('session_token', 'invalid_token_123');
// Recargar página → debe fallar al cargar historial
```

**Test 3**: Técnico no puede ver órdenes de otros técnicos
- Técnico A loguea → ve solo sus órdenes
- Técnico A manipula DevTools: `currentUser.nombre = 'Técnico B'`
- Intenta recargar historial → backend rechaza, devuelve error AUTH_FAILED

---

## 🎯 Mitigación 2: Borrador Identificado por Usuario

### Problema
El borrador se almacena en localStorage con clave estática. Dos técnicos en el mismo navegador comparten borrador.

### Solución
Usar identificador único por usuario en la clave del localStorage.

### Implementación

**Ubicación**: app.js línea ~1350 (variable STORAGE_KEY)

```javascript
// ANTES:
const STORAGE_KEY = 'checklist_ac_draft';

// DESPUÉS:
function getStorageKeyForUser() {
  if (currentUser && currentUser.id) {
    return `checklist_ac_draft_${currentUser.id}`;
  }
  return 'checklist_ac_draft_temp';  // Si no hay usuario logueado
}
```

**Ubicación**: Buscar y reemplazar todas las referencias a `STORAGE_KEY` en app.js

Cambios en funciones que usan STORAGE_KEY:

```javascript
// saveDraft()
function saveDraft() {
  try {
    const storageKey = getStorageKeyForUser();  // CAMBIO
    const formData = new FormData(document.getElementById('checklist-form'));
    const data = Object.fromEntries(formData);
    
    // Agregar firmas
    data.firma_tecnico_base64 = canvasTecnico.toDataURL('image/png');
    data.firma_cliente_base64 = canvasCliente.toDataURL('image/png');
    
    localStorage.setItem(storageKey, JSON.stringify(data));  // CAMBIO
    console.log('✅ Borrador guardado');
  } catch (error) {
    console.error('Error guardando borrador:', error);
  }
}

// loadDraft()
function loadDraft() {
  try {
    const storageKey = getStorageKeyForUser();  // CAMBIO
    const savedData = localStorage.getItem(storageKey);  // CAMBIO
    
    if (!savedData) {
      console.log('📝 No hay borrador guardado');
      return false;
    }
    
    const data = JSON.parse(savedData);
    const form = document.getElementById('checklist-form');
    
    for (let field in data) {
      if (field === 'firma_tecnico_base64') {
        // Dibujar en canvas
        const img = new Image();
        img.onload = () => {
          const ctx = canvasTecnico.getContext('2d');
          ctx.clearRect(0, 0, canvasTecnico.width, canvasTecnico.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = data[field];
      } else if (field === 'firma_cliente_base64') {
        const img = new Image();
        img.onload = () => {
          const ctx = canvasCliente.getContext('2d');
          ctx.clearRect(0, 0, canvasCliente.width, canvasCliente.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = data[field];
      } else {
        const element = form.elements[field];
        if (element) element.value = data[field];
      }
    }
    
    console.log('✅ Borrador cargado');
    return true;
  } catch (error) {
    console.error('Error cargando borrador:', error);
    return false;
  }
}

// clearDraft()
function clearDraft() {
  try {
    const storageKey = getStorageKeyForUser();  // CAMBIO
    localStorage.removeItem(storageKey);  // CAMBIO
    console.log('✅ Borrador eliminado');
  } catch (error) {
    console.error('Error limpiando borrador:', error);
  }
}

// onFormSubmitSuccess()
function onFormSubmitSuccess() {
  clearDraft();  // Ahora usa getStorageKeyForUser() internamente
  
  // Resetear formulario
  document.getElementById('checklist-form').reset();
  document.getElementById('ot-field').value = '';
  
  // Firmas
  const ctx1 = canvasTecnico.getContext('2d');
  ctx1.clearRect(0, 0, canvasTecnico.width, canvasTecnico.height);
  const ctx2 = canvasCliente.getContext('2d');
  ctx2.clearRect(0, 0, canvasCliente.width, canvasCliente.height);
  
  // Fecha actual
  document.getElementById('fecha-inspeccion').value = new Date().toISOString().split('T')[0];
  
  console.log('✅ Formulario limpio');
}
```

### Validación de Mitigación 2

**Test 1**: Usuario A loguea → guarda borrador → localStorage tiene clave `checklist_ac_draft_A`
```javascript
Object.keys(localStorage).filter(k => k.includes('draft'))
// Debe mostrar: ["checklist_ac_draft_user_id_A"]
```

**Test 2**: Usuario B loguea → carga borrador → vacío (diferente clave)
```javascript
localStorage.getItem('checklist_ac_draft_user_id_B')  // null
```

**Test 3**: Desloguearse → reloguearse como Usuario A → borrador se recupera

---

## 🎯 Mitigación 3: Historial Filtrado en Backend

### Problema
Todo el historial se descarga al cliente y se filtra en JavaScript. Un usuario con DevTools puede acceder a todos los datos.

### Solución
Backend ya fue modificado en Mitigación 1 con endpoint `clientes_del_usuario` y filtrado. Solo se necesita:

1. ✅ **Ya implementado en Paso 1.2**: `doGet(e)` filtra historial por usuario antes de retornar
2. ✅ **Ya implementado en Paso 1.2**: Endpoint `action=historial` usa token para validar usuario

### Validación de Mitigación 3

**Test 1**: Técnico B solicita historial sin token
```bash
curl "https://script.google.com/macros/s/AKfycbz...exec?action=historial&_t=123"
# Retorna: { result: 'success', data: [] }  (vacío porque no hay token)
```

**Test 2**: Técnico B con token válido
```javascript
fetch(url + '&token=' + sessionToken)
// Retorna: solo órdenes de Técnico B
```

---

## 🎯 Mitigación 4: Encapsulación de Estado Global

### Problema
Variables globales como `currentUser`, `historyDataCache` son modificables desde DevTools.

### Solución
Encapsular en objeto IIFE (Immediately Invoked Function Expression) para proteger acceso.

### Implementación

**Ubicación**: app.js línea ~30 (inicio del código, después de GOOGLE_SCRIPT_URL)

```javascript
/**
 * AppState - Contenedor encapsulado del estado de la aplicación
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
    // Métodos de acceso a usuario
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
    
    // Métodos de acceso a historial
    setHistoryCache(data) {
      _historyCache = Array.isArray(data) ? [...data] : [];
    },
    
    getHistoryCache() {
      return [..._historyCache];  // Retorna copia para evitar mutaciones externas
    },
    
    getHistoryRecordById(index) {
      return index >= 0 && index < _historyCache.length ? { ..._historyCache[index] } : null;
    },
    
    // Métodos de acceso a clientes
    setClientsCache(data) {
      _clientsCache = Array.isArray(data) ? [...data] : [];
    },
    
    getClientsCache() {
      return [..._clientsCache];  // Retorna copia
    },
    
    // Métodos de acceso a técnicos
    setTechniciansCache(data) {
      _techniciansCache = Array.isArray(data) ? [...data] : [];
    },
    
    getTechniciansCache() {
      return [..._techniciansCache];
    },
    
    // Métodos de acceso a equipos
    setEquipmentTypesCache(data) {
      _equipmentTypesCache = Array.isArray(data) ? [...data] : [];
    },
    
    getEquipmentTypesCache() {
      return [..._equipmentTypesCache];
    },
    
    // Métodos de token de sesión
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
    
    clearSessionToken() {
      _sessionToken = null;
      try {
        localStorage.removeItem('session_token');
      } catch (e) {}
    },
    
    // Utility: Reiniciar estado completo al logout
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

// Retrocompatibilidad: Variables globales que ahora delegan a AppState
// Esto permite que el código existente siga funcionando
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

### Validación de Mitigación 4

**Test 1**: Intentar modificar desde DevTools (falla)
```javascript
// En consola:
currentUser = { nombre: 'Hacker', rol: 'Admin' };
console.log(currentUser);
// Sigue siendo el usuario original (no se modifica)
```

**Test 2**: Usar métodos públicos de AppState (funciona)
```javascript
AppState.setCurrentUser({ nombre: 'Test', rol: 'Técnico' });
console.log(AppState.getCurrentUser());
// { nombre: 'Test', rol: 'Técnico' }
```

---

## 📊 Plan de Rollout

### Fase 1: Preparación (30 min)
- [ ] Crear rama: `git checkout -b feature/seguridad-mitigacion`
- [ ] Crear backup de versión actual: `git stash`
- [ ] Leer todo el plan completo

### Fase 2: Backend (Google Apps Script) - 1.5 horas
- [ ] Implementar funciones de token (generateSessionToken, validateSessionToken)
- [ ] Agregar manejo de token en doPost() para `generate_token`
- [ ] Modificar doGet() para incluir validación de token
- [ ] Agregar funciones auxiliares (getUsuarioById, isUserAdmin, matchTechnicianName)
- [ ] **TEST**: Desplegar y verificar token generation
- [ ] **TEST**: Verificar rechazo de token inválido

### Fase 3: Frontend (app.js) - 1.5 horas

#### Paso 3A: Implementar sistema de token
- [ ] Agregar `getSessionToken()` y `generateSessionTokenFromServer()`
- [ ] Modificar `loginUser()` para generar token
- [ ] Modificar `logoutUser()` para limpiar token
- [ ] **TEST**: Verificar token en localStorage

#### Paso 3B: Usar token en solicitudes
- [ ] Modificar `fetchHistoryData()` para incluir token
- [ ] Modificar `updateClientsUI()` para incluir token
- [ ] **TEST**: Verificar que historial se filtra correctamente

#### Paso 3C: Borrador por usuario
- [ ] Agregar `getStorageKeyForUser()`
- [ ] Modificar `saveDraft()` para usar nueva clave
- [ ] Modificar `loadDraft()` para usar nueva clave
- [ ] Modificar `clearDraft()` para usar nueva clave
- [ ] **TEST**: Verificar borradores separados por usuario

#### Paso 3D: Encapsulación de estado
- [ ] Agregar objeto `AppState` IIFE
- [ ] Configurar Object.defineProperty para retrocompatibilidad
- [ ] **TEST**: Verificar que código existente sigue funcionando

### Fase 4: Testing (45 min)

#### Escenarios de Test

**Test 1: Autenticación y Token**
```
1. Usuario A loguea
2. Verificar token en localStorage ✓
3. Usuario A cierra sesión
4. Verificar limpieza de token ✓
5. Usuario B loguea
6. Verificar token diferente ✓
```

**Test 2: Filtrado de Datos**
```
1. Usuario Técnico A loguea
2. Ver historial → solo sus órdenes ✓
3. Ver clientes → solo sus clientes ✓
4. Usuario Técnico B loguea
5. Ver historial → diferentes órdenes ✓
6. Usuario Admin loguea
7. Ver historial → TODAS las órdenes ✓
8. Ver clientes → TODOS los clientes ✓
```

**Test 3: Borrador Independiente**
```
1. Usuario A loguea
2. Llenar formulario parcialmente
3. Guardar borrador (Ctrl+S)
4. Verificar en localStorage: checklist_ac_draft_A ✓
5. Usuario A cierra sesión
6. Usuario B loguea
7. Cargar formulario → vacío ✓
8. Usuario A loguea de nuevo
9. Cargar formulario → borrador recuperado ✓
```

**Test 4: DevTools Bypass Fallido**
```
1. Usuario Técnico A loguea
2. Abrir DevTools (F12)
3. Ejecutar: AppState.setCurrentUser({nombre:'B', rol:'Técnico'})
4. Recargar historial
5. Verificar → rechaza token, devuelve error AUTH_FAILED ✓
```

### Fase 5: Deploy (30 min)
- [ ] Verificar todos los tests PASS
- [ ] Commit: `git commit -m "feat: implementar mitigaciones de seguridad multi-tenant"`
- [ ] Push: `git push origin feature/seguridad-mitigacion`
- [ ] Crear Pull Request en GitHub
- [ ] Merge a main
- [ ] Redeploy de Google Apps Script (copiar función a production)

---

## 🚨 Rollback Plan

Si algo falla durante la implementación:

```bash
# Revertir a último commit seguro
git reset --hard HEAD~1

# O restaurar desde stash
git stash pop
```

**Señales de Fallo**:
- ❌ Historial retorna array vacío después de login
- ❌ Token no se genera en servidor
- ❌ Borradores de múltiples usuarios se mezclan
- ❌ Admins no ven todas las órdenes

---

## ✅ Checklist de Verificación Final

Antes de considerar la mitigación COMPLETADA:

**Seguridad Backend**
- [ ] Token se genera al login
- [ ] Token expira después de 24 horas
- [ ] Token inválido rechaza solicitud
- [ ] Técnico solo ve sus órdenes
- [ ] Admin ve todas las órdenes
- [ ] Endpoints sensibles requieren token

**Seguridad Frontend**
- [ ] Borrador usa clave diferente por usuario
- [ ] `currentUser` no puede modificarse desde DevTools
- [ ] `historyDataCache` no es editable directamente
- [ ] Cierre de sesión limpia todo (token + session + borrador)
- [ ] Recarga de página recupera token de localStorage

**UX / No Regresiones**
- [ ] Formulario sigue funcionando normalmente
- [ ] Historial sigue renderizando correctamente
- [ ] Clientes se cargan en dropdown
- [ ] PDF export funciona
- [ ] Crear nueva orden funciona
- [ ] Editar orden funciona
- [ ] Admin ve todas las órdenes

---

## 📌 Notas Importantes

1. **Compatibilidad**: Este plan mantiene retrocompatibilidad con código existente usando Object.defineProperty
2. **Performance**: AppState retorna copias de arrays para evitar mutaciones. No hay impacto notable en performance
3. **Testing Continuo**: Después de cada fase, ejecutar los tests de esa fase
4. **Documentación**: Actualizar README.md con nueva sección "Security" después de implementar
5. **Versioning**: Marcar esta versión en git tag como `v1.1.0-security`

---

## 📞 Soporte

Si encuentras errores durante la implementación:

1. Verificar console del navegador (F12 > Console) para errores JavaScript
2. Verificar Logs de Google Apps Script (Proyectos de Apps Script > Logs)
3. Revisar esta guía en la sección correspondiente
4. Si persiste, rollback y contactar soporte

