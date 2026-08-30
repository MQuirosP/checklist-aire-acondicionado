const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz0FPAiw8vWelX2AhwoBM0tMdgbFpwcwd0AKXO7Z5b8JzA5_-Pk3VIk66Z1LrBNsDIO/exec';

let usersDataCache = [];
let currentUser = null;
let enteredPin = '';

document.addEventListener('DOMContentLoaded', () => {
  initAuthSystem();
  initDashboardNavigation();
  initUserManagement();
  initDate();
  initDeltaTCalculation();
  initBulkActionButtons();
  initSignaturePads();
  initDraftStorage();
  initFormSubmission();
  initHistoryModal();
  initOTValidation();
  initRecordDetailModal();
  initClientsAndTechniciansManagement();
  initEquipmentManagement();
  initMobileMenu();
  initChangeOwnPinModal();
});

function isUserAdmin(user) {
  if (!user) return false;
  const role = (user.rol || user.Rol || user.role || user.Role || '').toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return role.includes('admin');
}

function isUserTech(user) {
  if (!user) return false;
  return !isUserAdmin(user);
}

function matchTechnicianName(strA, strB) {
  if (!strA || !strB) return false;
  const normA = String(strA).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const normB = String(strB).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const tokensA = normA.split(/\s+/).filter(t => t.length > 2);
  const tokensB = normB.split(/\s+/).filter(t => t.length > 2);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const matches = tokensB.filter(t => tokensA.includes(t));
  return matches.length >= 1;
}

function showConfirmModal({ title = '¿Confirmar Acción?', message = '¿Estás seguro de realizar esta operación?', icon = '❓', acceptText = 'Aceptar', btnClass = 'bg-blue-600 hover:bg-blue-700', onAccept }) {
  const modal = document.getElementById('modal-universal-confirm');
  const titleEl = document.getElementById('confirm-modal-title');
  const msgEl = document.getElementById('confirm-modal-message');
  const iconEl = document.getElementById('confirm-modal-icon');
  const btnCancel = document.getElementById('btn-confirm-cancel');
  const btnAccept = document.getElementById('btn-confirm-accept');

  if (!modal || !titleEl || !msgEl || !btnAccept || !btnCancel) {
    if (confirm(message)) {
      if (typeof onAccept === 'function') onAccept();
    }
    return;
  }

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (iconEl) iconEl.textContent = icon;
  if (btnAccept) {
    btnAccept.textContent = acceptText;
    btnAccept.className = `flex-1 py-2.5 text-white font-semibold rounded-xl text-xs transition shadow-md ${btnClass}`;
  }

  const handleClose = () => {
    modal.classList.add('hidden');
    btnCancel.onclick = null;
    btnAccept.onclick = null;
  };

  btnCancel.onclick = () => handleClose();
  btnAccept.onclick = () => {
    handleClose();
    if (typeof onAccept === 'function') onAccept();
  };

  modal.classList.remove('hidden');
}

function showAlertModal(message, title = 'Aviso del Sistema', icon = 'ℹ️') {
  const modal = document.getElementById('modal-universal-alert');
  const titleEl = document.getElementById('alert-modal-title');
  const msgEl = document.getElementById('alert-modal-message');
  const iconEl = document.getElementById('alert-modal-icon');
  const btnAccept = document.getElementById('btn-alert-accept');

  if (!modal || !msgEl || !btnAccept) {
    alert(message);
    return;
  }

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (iconEl) iconEl.textContent = icon;

  const handleClose = () => {
    modal.classList.add('hidden');
    btnAccept.onclick = null;
  };

  btnAccept.onclick = () => handleClose();
  modal.classList.remove('hidden');
}

function setSelectVal(id, val) {
  const el = document.getElementById(id);
  if (!el || !val) return;
  let opt = Array.from(el.options).find(o => o.value === val);
  if (!opt) {
    opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    el.insertBefore(opt, el.lastElementChild);
  }
  el.value = val;
}

function switchView(viewId) {
  const views = ['view-login', 'view-dashboard', 'view-form'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === viewId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });
  if (viewId === 'view-form') {
    if (typeof updateClientsUI === 'function') updateClientsUI();
    if (typeof updateTechniciansUI === 'function') updateTechniciansUI();
    if (typeof updateEquipmentTypesUI === 'function') updateEquipmentTypesUI();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNavigationUI() {
  const btnHome = document.getElementById('btn-nav-home');
  const desktopActions = document.getElementById('desktop-header-actions');
  const mobileMenuBtn = document.getElementById('btn-mobile-menu');

  const btnViewTechs = document.getElementById('btn-view-technicians');
  const btnMobileTechs = document.getElementById('btn-mobile-technicians');
  const cardTechs = document.getElementById('card-manage-techs');

  const btnViewUsers = document.getElementById('btn-view-users');
  const btnMobileUsers = document.getElementById('btn-mobile-users');
  const cardUsers = document.getElementById('card-manage-users');

  if (currentUser) {
    if (btnHome) btnHome.classList.remove('hidden');
    if (desktopActions) {
      desktopActions.classList.add('hidden', 'md:flex');
      desktopActions.classList.remove('flex');
    }
    if (mobileMenuBtn) mobileMenuBtn.classList.remove('hidden');

    const welcomeName = document.getElementById('dashboard-welcome-name');
    const welcomeRolePill = document.getElementById('dashboard-user-role-pill');

    const uName = currentUser.nombre || currentUser.Nombre || currentUser['Nombre Usuario'] || currentUser.id || 'Usuario';
    const isAdmin = isUserAdmin(currentUser);

    if (welcomeName) welcomeName.textContent = `¡Bienvenido, ${uName}! 👋`;
    if (welcomeRolePill) welcomeRolePill.textContent = isAdmin ? 'Administrador' : 'Técnico';

    if (isAdmin) {
      if (btnViewTechs) btnViewTechs.classList.remove('hidden');
      if (btnMobileTechs) btnMobileTechs.classList.remove('hidden');
      if (cardTechs) cardTechs.classList.remove('hidden');

      if (btnViewUsers) btnViewUsers.classList.remove('hidden');
      if (btnMobileUsers) btnMobileUsers.classList.remove('hidden');
      if (cardUsers) cardUsers.classList.remove('hidden');
    } else {
      if (btnViewTechs) btnViewTechs.classList.add('hidden');
      if (btnMobileTechs) btnMobileTechs.classList.add('hidden');
      if (cardTechs) cardTechs.classList.add('hidden');

      if (btnViewUsers) btnViewUsers.classList.add('hidden');
      if (btnMobileUsers) btnMobileUsers.classList.add('hidden');
      if (cardUsers) cardUsers.classList.add('hidden');
    }
  } else {
    if (btnHome) btnHome.classList.add('hidden');
    if (desktopActions) {
      desktopActions.classList.add('hidden');
      desktopActions.classList.remove('md:flex', 'flex');
    }
    if (mobileMenuBtn) mobileMenuBtn.classList.add('hidden');

    if (btnViewTechs) btnViewTechs.classList.add('hidden');
    if (btnMobileTechs) btnMobileTechs.classList.add('hidden');
    if (cardTechs) cardTechs.classList.add('hidden');

    if (btnViewUsers) btnViewUsers.classList.add('hidden');
    if (btnMobileUsers) btnMobileUsers.classList.add('hidden');
    if (cardUsers) cardUsers.classList.add('hidden');
  }
}

async function generateSessionTokenFromServer(userId) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PEGA_AQUI_TU_URL')) return null;
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'generate_token',
        userId: userId
      })
    });
    const newToken = `ST-${userId}-${Date.now()}`;
    try { localStorage.setItem('session_token', newToken); } catch (e) {}
    return newToken;
  } catch (e) {
    console.warn('Error generando token:', e);
  }
  return null;
}

function getSessionToken() {
  try {
    return localStorage.getItem('session_token') || '';
  } catch (e) {
    return '';
  }
}

function loginUser(user) {
  currentUser = user;
  try {
    localStorage.setItem('session_user', JSON.stringify(user));
    if (user && user.id) {
      localStorage.setItem('last_login_user_id', user.id);
    }
  } catch (e) {}

  if (user && user.id) {
    generateSessionTokenFromServer(user.id);
  }

  updateNavigationUI();
  if (typeof updateClientsUI === 'function') updateClientsUI();
  if (typeof updateTechniciansUI === 'function') updateTechniciansUI();
  if (typeof updateEquipmentTypesUI === 'function') updateEquipmentTypesUI();

  if (typeof fetchHistoryData === 'function') fetchHistoryData();
  switchView('view-dashboard');
}

function logoutUser() {
  currentUser = null;
  enteredPin = '';
  isValidatingPin = false;
  updatePinDisplay();
  try {
    localStorage.removeItem('session_user');
    localStorage.removeItem('session_token');
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

async function fetchUsersData() {
  try {
    const cachedUsers = localStorage.getItem('app_users_custom_v1');
    if (cachedUsers) {
      const parsed = JSON.parse(cachedUsers);
      if (Array.isArray(parsed) && parsed.length > 0) {
        usersDataCache = parsed;
      }
    }
  } catch (e) {}

  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PEGA_AQUI_TU_URL')) return usersDataCache || [];
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=usuarios&_t=${Date.now()}`, { cache: 'no-store' });
    const text = await res.text();
    let data = [];
    try { data = JSON.parse(text); } catch (e) {}
    if (Array.isArray(data) && data.length > 0) {
      usersDataCache = data;
      try {
        localStorage.setItem('app_users_custom_v1', JSON.stringify(data));
      } catch (e) {}
      return data;
    }
  } catch (err) {
    console.error('Error cargando usuarios:', err);
  }
  return usersDataCache || [];
}

async function initAuthSystem() {
  const storedSession = localStorage.getItem('session_user');
  if (storedSession) {
    try {
      const parsed = JSON.parse(storedSession);
      if (parsed && parsed.nombre) {
        currentUser = parsed;
        updateNavigationUI();
        switchView('view-dashboard');
        fetchUsersData();
        return;
      }
    } catch (e) {}
  }

  // Si no hay sesión válida activa, forzar pantalla de login y ocultar nav UI
  currentUser = null;
  updateNavigationUI();
  switchView('view-login');

  const users = await fetchUsersData();
  const formSetup = document.getElementById('form-initial-setup');
  const pinContainer = document.getElementById('login-pin-container');
  const loginTitle = document.getElementById('login-title');
  const loginSubtitle = document.getElementById('login-subtitle');

  const roleInput = document.getElementById('setup-role');
  const roleDisplay = document.getElementById('setup-role-display');

  const hasAdmin = Array.isArray(users) && users.some(u => (u.Rol || '').toLowerCase().includes('admin'));

  if (!users || users.length === 0 || !hasAdmin) {
    if (roleInput) roleInput.value = 'Administrador';
    if (roleDisplay) roleDisplay.value = 'Administrador (Primer Administrador)';
    
    if (!users || users.length === 0) {
      if (formSetup) formSetup.classList.remove('hidden');
      if (pinContainer) pinContainer.classList.add('hidden');
      if (loginTitle) loginTitle.textContent = 'Configuración Inicial';
      if (loginSubtitle) loginSubtitle.textContent = 'Crea la cuenta de Administrador para comenzar';
    } else {
      if (pinContainer) pinContainer.classList.remove('hidden');
      populateUserSelect(users);
    }
  } else {
    if (roleInput) roleInput.value = 'Técnico';
    if (roleDisplay) roleDisplay.value = 'Técnico (Estándar)';
    if (formSetup) formSetup.classList.add('hidden');
    if (pinContainer) pinContainer.classList.remove('hidden');
    if (loginTitle) loginTitle.textContent = 'Acceso al Sistema';
    if (loginSubtitle) loginSubtitle.textContent = 'Ingresa tu PIN de 4 dígitos para continuar';
    populateUserSelect(users);
  }

  setupPinKeypad();
  setupInitialForm();
  setupBiometrics();
}

let isPinKeypadInitialized = false;
let isInitialFormInitialized = false;
let isBiometricsInitialized = false;
let isValidatingPin = false;

function populateUserSelect(users) {
  const select = document.getElementById('login-user-select');
  if (!select) return;
  select.innerHTML = '<option value="" disabled selected>Seleccionar Usuario...</option>';
  users.forEach(u => {
    if (u.Estado !== 'Inactivo') {
      const uName = u['Nombre Usuario'] || u['Nombre'] || u['Nombre del Técnico'] || u['Usuario'] || u.nombre || u.ID || 'Usuario';
      const uRole = u.Rol || u['Rol'] || 'Técnico';
      const uPin = String(u.PIN || u['PIN'] || '1234').trim().padStart(4, '0');
      const uId = u.ID || u['ID'] || uName;

      const opt = document.createElement('option');
      opt.value = uId;
      opt.textContent = `${uName} (${uRole})`;
      opt.dataset.pin = uPin;
      opt.dataset.name = uName;
      opt.dataset.role = uRole;
      opt.dataset.bio = u.Biometria_CredID || '';
      select.appendChild(opt);
    }
  });

  const lastUserId = localStorage.getItem('last_login_user_id');
  if (lastUserId) {
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === lastUserId) {
        select.selectedIndex = i;
        break;
      }
    }
  } else if (select.options.length > 1) {
    select.selectedIndex = 1;
  }

  // Escuchar cambio de usuario para resetear PIN y guardar preferencia
  if (!select.dataset.hasChangeListener) {
    select.dataset.hasChangeListener = 'true';
    select.addEventListener('change', () => {
      enteredPin = '';
      isValidatingPin = false;
      updatePinDisplay();
      if (select.value) {
        try { localStorage.setItem('last_login_user_id', select.value); } catch (e) {}
        checkAutoBiometrics(select.value);
      }
    });
  }

  enteredPin = '';
  isValidatingPin = false;
  updatePinDisplay();

  if (select.value) {
    checkAutoBiometrics(select.value);
  }
}

async function checkAutoBiometrics(userId) {
  if (!window.PublicKeyCredential || !userId) return;
  const userBioKey = `bio_credential_${userId}`;
  const select = document.getElementById('login-user-select');
  const opt = select ? Array.from(select.options).find(o => o.value === userId) : null;
  const storedCredIdBase64 = localStorage.getItem(userBioKey) || (opt ? opt.dataset.bio : '');

  if (!storedCredIdBase64) return;

  setTimeout(async () => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          allowCredentials: [{
            id: base64UrlToArrayBuffer(storedCredIdBase64),
            type: 'public-key'
          }],
          timeout: 30000,
          userVerification: 'preferred'
        }
      });

      if (credential && select) {
        const currentSelectedOpt = select.options[select.selectedIndex];
        if (currentSelectedOpt && currentSelectedOpt.value === userId) {
          loginUser({
            id: userId,
            nombre: currentSelectedOpt.dataset.name,
            rol: currentSelectedOpt.dataset.role
          });
        }
      }
    } catch (err) {
      console.log('Autenticación biométrica automática no completada, usando PIN.');
    }
  }, 400);
}

function updatePinDisplay() {
  const display = document.getElementById('pin-display');
  if (!display) return;
  if (!enteredPin) {
    display.textContent = '••••';
    display.className = 'text-3xl font-mono tracking-widest font-bold h-8 flex items-center justify-center text-slate-500';
  } else {
    display.textContent = '•'.repeat(enteredPin.length);
    display.className = 'text-3xl font-mono tracking-widest font-bold h-8 flex items-center justify-center text-blue-400';
  }
}

function setupPinKeypad() {
  if (isPinKeypadInitialized) return;
  isPinKeypadInitialized = true;

  document.querySelectorAll('.btn-pin').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isValidatingPin) return;
      const num = btn.getAttribute('data-num');
      if (enteredPin.length < 4) {
        enteredPin += num;
        updatePinDisplay();
        if (enteredPin.length === 4) {
          validateEnteredPin();
        }
      }
    });
  });

  const btnClear = document.getElementById('btn-pin-clear');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      enteredPin = '';
      isValidatingPin = false;
      updatePinDisplay();
    });
  }

  const btnBack = document.getElementById('btn-pin-backspace');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      isValidatingPin = false;
      if (enteredPin.length > 0) {
        enteredPin = enteredPin.slice(0, -1);
        updatePinDisplay();
      }
    });
  }
}

function validateEnteredPin() {
  if (isValidatingPin) return;
  isValidatingPin = true;

  const select = document.getElementById('login-user-select');
  if (!select || !select.value) {
    alert('Por favor selecciona tu usuario en el desplegable.');
    enteredPin = '';
    updatePinDisplay();
    isValidatingPin = false;
    return;
  }

  const opt = select.options[select.selectedIndex];
  const expectedPin = String(opt.dataset.pin || '1234').trim().padStart(4, '0');

  if (enteredPin === expectedPin) {
    const user = {
      id: select.value,
      nombre: opt.dataset.name,
      rol: opt.dataset.role
    };
    enteredPin = '';
    updatePinDisplay();
    isValidatingPin = false;
    loginUser(user);
  } else {
    const display = document.getElementById('pin-display');
    if (display) {
      display.textContent = 'INCORRECTO';
      display.className = 'text-xl font-bold h-8 flex items-center justify-center text-rose-500 animate-bounce';
    }
    setTimeout(() => {
      enteredPin = '';
      updatePinDisplay();
      isValidatingPin = false;
    }, 1000);
  }
}

function setupInitialForm() {
  if (isInitialFormInitialized) return;
  isInitialFormInitialized = true;

  const form = document.getElementById('form-initial-setup');
  const btnShowRegister = document.getElementById('btn-show-register');
  const btnCancelRegister = document.getElementById('btn-cancel-register');
  const pinContainer = document.getElementById('login-pin-container');

  if (btnShowRegister) {
    btnShowRegister.addEventListener('click', () => {
      const hasAdmin = Array.isArray(usersDataCache) && usersDataCache.some(u => (u.Rol || '').toLowerCase().includes('admin'));
      const roleInput = document.getElementById('setup-role');
      const roleDisplay = document.getElementById('setup-role-display');

      if (!hasAdmin) {
        if (roleInput) roleInput.value = 'Administrador';
        if (roleDisplay) roleDisplay.value = 'Administrador (Primer Administrador)';
      } else {
        if (roleInput) roleInput.value = 'Técnico';
        if (roleDisplay) roleDisplay.value = 'Técnico (Estándar)';
      }

      if (form) form.classList.remove('hidden');
      if (pinContainer) pinContainer.classList.add('hidden');
    });
  }

  if (btnCancelRegister) {
    btnCancelRegister.addEventListener('click', () => {
      if (form) form.classList.add('hidden');
      if (pinContainer) pinContainer.classList.remove('hidden');
    });
  }

  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('setup-name').value.trim();
    const pin = document.getElementById('setup-pin').value.trim();
    const role = document.getElementById('setup-role') ? document.getElementById('setup-role').value : 'Administrador';

    if (!name || pin.length !== 4) {
      alert('Por favor ingresa tu nombre y un PIN de 4 dígitos.');
      return;
    }

    const userId = "USR-" + Date.now().toString().slice(-4);

    const payload = {
      action: 'add_user',
      id: userId,
      nombre: name,
      pin: pin,
      rol: role,
      estado: 'Activo'
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
    } catch (err) {}

    form.reset();
    const newUser = { id: userId, nombre: name, rol: role };
    usersDataCache.push({ ID: userId, 'Nombre Usuario': name, PIN: pin, Rol: role, Estado: 'Activo' });
    loginUser(newUser);
  });
}

function arrayBufferToBase64Url(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlToArrayBuffer(base64url) {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function setupBiometrics() {
  if (isBiometricsInitialized) return;
  isBiometricsInitialized = true;

  const btnBio = document.getElementById('btn-biometrics-login') || document.getElementById('btn-login-biometric');
  const userSelect = document.getElementById('login-user-select');

  if (btnBio) {
    btnBio.addEventListener('click', async () => {
      const userId = userSelect ? userSelect.value : null;
      const opt = userSelect ? userSelect.options[userSelect.selectedIndex] : null;

      if (!userId || !opt) {
        alert('Por favor selecciona un usuario primero para autenticar con Huella / Face ID.');
        return;
      }

      const userBioKey = `bio_credential_${userId}`;
      const storedCredIdBase64 = localStorage.getItem(userBioKey) || opt.dataset.bio;

      if (!window.PublicKeyCredential) {
        alert('La autenticación biométrica (Huella/Face ID) no está disponible en este navegador o requiere conexión segura HTTPS.');
        return;
      }

      if (!storedCredIdBase64) {
        alert('👆 Tu Huella / Face ID aún no está vinculada a este dispositivo.\n\nIngresa primero con tu PIN de 4 dígitos y toca "👆 Vincular Biometría" en el menú para activarla.');
        return;
      }

      // Ejecutar verificación biométrica real con WebAuthn API nativa del sistema/dispositivo
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const getPublicKeyOptions = {
          challenge: challenge,
          timeout: 60000,
          userVerification: 'preferred'
        };

        if (storedCredIdBase64 && storedCredIdBase64.length > 5) {
          try {
            const rawIdBuffer = base64UrlToArrayBuffer(storedCredIdBase64);
            getPublicKeyOptions.allowCredentials = [{
              type: 'public-key',
              id: rawIdBuffer
            }];
          } catch (e) {
            console.warn('Error convirtiendo credencial local:', e);
          }
        }

        const credential = await navigator.credentials.get({ publicKey: getPublicKeyOptions });

        if (credential) {
          const user = { id: userId, nombre: opt.dataset.name, rol: opt.dataset.role };
          loginUser(user);
        }
      } catch (err) {
        console.warn('Biometría cancelada o no verificada:', err);
        alert('⚠️ No se pudo verificar la huella en este dispositivo.\n\nSi vinculaste la biometría desde otro dispositivo (ej. laptop), ingresa aquí con tu PIN de 4 dígitos y toca "👆 Vincular Biometría" en el menú para registrar el sensor de este teléfono.');
      }
    });
  }

  // Vincular Biometría en la sesión activa
  const btnRegBio = document.getElementById('btn-register-biometric');
  const btnMobileRegBio = document.getElementById('btn-mobile-biometric');

  const handleRegisterBio = async (e) => {
    if (e) e.stopPropagation();
    const secMenu = document.getElementById('security-menu');
    if (secMenu) secMenu.classList.add('hidden');

    if (!currentUser) return;
    if (!window.PublicKeyCredential) {
      showAlertModal('La autenticación biométrica no está disponible en este navegador o requiere conexión HTTPS.', 'Biometría No Disponible', '⚠️');
      return;
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userIdBytes = new TextEncoder().encode(currentUser.id || 'usr');

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: { name: "Tecnicheck Pro" },
          user: {
            id: userIdBytes,
            name: currentUser.nombre || 'Usuario',
            displayName: currentUser.nombre || 'Usuario'
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
          timeout: 60000,
          attestation: "none",
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "preferred",
            residentKey: "required",
            requireResidentKey: true
          }
        }
      });

      if (credential) {
        const rawIdBase64 = arrayBufferToBase64Url(credential.rawId);
        const userBioKey = `bio_credential_${currentUser.id}`;
        localStorage.setItem(userBioKey, rawIdBase64);

        try {
          await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'register_biometric', id: currentUser.id, biometria: rawIdBase64 })
          });
        } catch (e) {}

        showAlertModal('✅ ¡Huella / Face ID / Windows Hello vinculada exitosamente a este dispositivo! En tus próximas visitas podrás ingresar con 1 toque.', 'Biometría Vinculada', '👆');
      }
    } catch (err) {
      console.warn('Error registrando biometría:', err);
      showAlertModal('La vinculación biométrica fue cancelada, rechazada por el sistema o requiere activar Windows Hello / Huella dactilar en este equipo.', 'Vinculación Biométrica', 'ℹ️');
    }
  };

  if (btnRegBio) btnRegBio.addEventListener('click', handleRegisterBio);
  if (btnMobileRegBio) btnMobileRegBio.addEventListener('click', handleRegisterBio);
}

function initDashboardNavigation() {
  const btnHome = document.getElementById('btn-nav-home');
  const btnMobileHome = document.getElementById('btn-mobile-nav-home');
  if (btnHome) btnHome.addEventListener('click', () => switchView('view-dashboard'));
  if (btnMobileHome) btnMobileHome.addEventListener('click', () => switchView('view-dashboard'));

  const btnLogout = document.getElementById('btn-nav-logout');
  const btnMobileLogout = document.getElementById('btn-mobile-logout');
  if (btnLogout) btnLogout.addEventListener('click', logoutUser);
  if (btnMobileLogout) btnMobileLogout.addEventListener('click', logoutUser);

  const cardCreateOrder = document.getElementById('card-create-order');
  if (cardCreateOrder) {
    cardCreateOrder.addEventListener('click', () => {
      switchView('view-form');
      const otInput = document.getElementById('ot');
      if (otInput && !otInput.value) {
        const btnAutoOt = document.getElementById('btn-auto-ot');
        if (btnAutoOt) btnAutoOt.click();
      }
      if (currentUser) {
        setSelectVal('tecnico', currentUser.nombre);
      }
    });
  }

  const cardViewOrders = document.getElementById('card-view-orders');
  if (cardViewOrders) {
    cardViewOrders.addEventListener('click', () => {
      const modal = document.getElementById('modal-history');
      if (modal) {
        modal.classList.remove('hidden');
        fetchHistoryData();
      }
    });
  }

  const cardClients = document.getElementById('card-manage-clients');
  if (cardClients) {
    cardClients.addEventListener('click', () => {
      const modal = document.getElementById('modal-clients');
      if (modal) {
        modal.classList.remove('hidden');
        if (typeof fetchClients === 'function') fetchClients(false);
      }
    });
  }

  const cardTechs = document.getElementById('card-manage-techs');
  if (cardTechs) {
    cardTechs.addEventListener('click', () => {
      const modal = document.getElementById('modal-technicians');
      if (modal) {
        modal.classList.remove('hidden');
        if (typeof fetchTechnicians === 'function') fetchTechnicians(false);
      }
    });
  }

  const cardEquip = document.getElementById('card-manage-equipment');
  if (cardEquip) {
    cardEquip.addEventListener('click', () => {
      const modal = document.getElementById('modal-equipment-types');
      if (modal) {
        modal.classList.remove('hidden');
        if (typeof updateEquipmentTypesUI === 'function') updateEquipmentTypesUI();
        if (typeof fetchEquipmentTypes === 'function') fetchEquipmentTypes(false);
      }
    });
  }

  const cardUsers = document.getElementById('card-manage-users');
  if (cardUsers) {
    cardUsers.addEventListener('click', () => {
      const modal = document.getElementById('modal-users');
      if (modal) {
        modal.classList.remove('hidden');
        fetchUsersData().then(() => renderUsersTable());
      }
    });
  }
}

function initUserManagement() {
  const btnUsers = document.getElementById('btn-view-users');
  const btnMobileUsers = document.getElementById('btn-mobile-users');
  const modalUsers = document.getElementById('modal-users');
  const btnCloseUsers = document.getElementById('btn-close-users');
  const formUser = document.getElementById('form-user');

  const openUsersModal = async () => {
    if (modalUsers) modalUsers.classList.remove('hidden');
    await fetchUsersData();
    renderUsersTable();
  };

  if (btnUsers) btnUsers.addEventListener('click', openUsersModal);
  if (btnMobileUsers) btnMobileUsers.addEventListener('click', openUsersModal);
  if (btnCloseUsers) btnCloseUsers.addEventListener('click', () => {
    if (modalUsers) modalUsers.classList.add('hidden');
  });

  if (formUser) {
    formUser.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('user-edit-id').value;
      const name = document.getElementById('user-name').value.trim();
      const pin = document.getElementById('user-pin').value.trim();
      const role = document.getElementById('user-role').value;

      if (!name || pin.length !== 4) {
        alert('Ingresa un nombre válido y un PIN de 4 dígitos.');
        return;
      }

      const payload = {
        action: 'add_user',
        id: editId || '',
        nombre: name,
        pin: pin,
        rol: role,
        estado: 'Activo'
      };

      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
      } catch (err) {}

      formUser.reset();
      document.getElementById('user-edit-id').value = '';
      alert('✅ Usuario guardado exitosamente.');
      await fetchUsersData();
      renderUsersTable();
      populateUserSelect(usersDataCache);
    });
  }
}

window.startEditUser = function(id, nombre, pin, rol) {
  const inputEditId = document.getElementById('user-edit-id');
  const inputName = document.getElementById('user-name');
  const inputPin = document.getElementById('user-pin');
  const selectRole = document.getElementById('user-role');
  const submitBtn = document.getElementById('btn-save-user');

  if (inputEditId) inputEditId.value = id;
  if (inputName) inputName.value = nombre;
  if (inputPin) inputPin.value = pin;
  if (selectRole) selectRole.value = rol || 'Técnico';
  if (submitBtn) submitBtn.textContent = '✏️ Actualizar Usuario';

  const form = document.getElementById('form-user');
  if (form) form.scrollIntoView({ behavior: 'smooth' });
};

let visibleUserPins = new Set();

function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  usersDataCache.forEach((u, index) => {
    const uId = String(u.ID || u.id || '');
    const uName = u['Nombre Usuario'] || u['Nombre'] || u['Nombre del Técnico'] || u['Usuario'] || u.nombre || u.ID || 'Usuario';
    const uPin = String(u.PIN || u.pin || '1234');
    const uRol = String(u.Rol || u.rol || 'Técnico');
    const isPinVisible = visibleUserPins.has(index);
    const pinDisplayStr = isPinVisible ? uPin : '••••';

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';
    tr.innerHTML = `
      <!-- Desktop Cells -->
      <td class="hidden sm:table-cell py-2 px-3 font-semibold text-slate-800">${uName}</td>
      <td class="hidden sm:table-cell py-2 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${uRol === 'Administrador' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}">${uRol}</span></td>
      <td class="hidden sm:table-cell py-2 px-3 font-mono">
        <span class="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          <span>${pinDisplayStr}</span>
          <button type="button" class="btn-toggle-pin text-xs hover:scale-110 transition p-0.5 cursor-pointer" data-index="${index}" title="${isPinVisible ? 'Ocultar PIN' : 'Ver PIN'}">${isPinVisible ? '🙈' : '👁️'}</button>
        </span>
      </td>
      <td class="hidden sm:table-cell py-2 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${u.Estado === 'Inactivo' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">${u.Estado || 'Activo'}</span></td>
      <td class="hidden sm:table-cell py-2 px-3 text-center space-x-1">
        <button type="button" onclick="startEditUser('${uId.replace(/'/g, "\\'")}', '${uName.replace(/'/g, "\\'")}', '${uPin.replace(/'/g, "\\'")}', '${uRol.replace(/'/g, "\\'")}')" class="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-semibold text-[10px] transition">✏️ Editar</button>
        <button type="button" class="btn-toggle-user px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-medium text-[10px]" data-index="${index}">${u.Estado === 'Inactivo' ? 'Activar' : 'Desactivar'}</button>
      </td>

      <!-- Mobile Card Row -->
      <td colspan="5" class="sm:hidden p-3">
        <details class="group">
          <summary class="flex items-center justify-between font-bold text-slate-800 cursor-pointer list-none select-none">
            <div class="flex items-center gap-1.5 text-xs">
              <span>👤 ${uName}</span>
              <span class="px-1.5 py-0.5 rounded text-[9.5px] font-bold ${uRol === 'Administrador' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}">${uRol}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold ${u.Estado === 'Inactivo' ? 'text-rose-600' : 'text-emerald-600'}">${u.Estado || 'Activo'}</span>
              <span class="text-slate-400 group-open:rotate-180 transition-transform text-xs">▼</span>
            </div>
          </summary>
          <div class="mt-2.5 pt-2 border-t border-slate-100 text-xs space-y-2 text-slate-600">
            <p><strong>PIN Actual:</strong> 
              <span class="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1.5">
                <span>${pinDisplayStr}</span>
                <button type="button" class="btn-toggle-pin text-xs hover:scale-110 transition p-0.5 cursor-pointer" data-index="${index}" title="${isPinVisible ? 'Ocultar PIN' : 'Ver PIN'}">${isPinVisible ? '🙈' : '👁️'}</button>
              </span>
            </p>
            <div class="pt-1 flex items-center justify-end gap-2">
              <button type="button" onclick="startEditUser('${uId.replace(/'/g, "\\'")}', '${uName.replace(/'/g, "\\'")}', '${uPin.replace(/'/g, "\\'")}', '${uRol.replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-semibold text-xs transition">✏️ Editar</button>
              <button type="button" class="btn-toggle-user px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-semibold text-xs transition" data-index="${index}">${u.Estado === 'Inactivo' ? '🔄 Activar Usuario' : '🚫 Desactivar Usuario'}</button>
            </div>
          </div>
        </details>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-toggle-pin').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.getAttribute('data-index'));
      if (visibleUserPins.has(idx)) {
        visibleUserPins.delete(idx);
      } else {
        visibleUserPins.add(idx);
      }
      renderUsersTable();
    });
  });

  tbody.querySelectorAll('.btn-toggle-user').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'));
      const targetUser = usersDataCache[idx];
      if (!targetUser) return;
      const isInactive = targetUser.Estado === 'Inactivo';
      const uName = targetUser['Nombre Usuario'] || targetUser['Nombre'] || targetUser.ID || 'Usuario';

      showConfirmModal({
        title: isInactive ? '¿Activar Usuario?' : '¿Desactivar Usuario?',
        message: `¿Estás seguro de que deseas ${isInactive ? 'activar' : 'desactivar'} la cuenta de "${uName}"?`,
        icon: isInactive ? '🔄' : '🚫',
        acceptText: isInactive ? 'Sí, activar' : 'Sí, desactivar',
        btnClass: isInactive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700',
        onAccept: async () => {
          const payload = { action: 'toggle_user', id: targetUser.ID || targetUser['Nombre Usuario'] };
          try {
            await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify(payload)
            });
          } catch (err) {}
          await fetchUsersData();
          renderUsersTable();
        }
      });
    });
  });
}

/**
 * 1. Inicializa la fecha actual si está vacía
 */
function initDate() {
  const fechaInput = document.getElementById('fecha');
  const btnToday = document.getElementById('btn-fill-today');

  const setToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    fechaInput.value = `${year}-${month}-${day}`;
  };

  if (!fechaInput.value) setToday();
  if (btnToday) btnToday.addEventListener('click', setToday);
}

function formatDateForInput(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  if (str.includes('T')) {
    return str.split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

/**
 * 2. Cálculo dinámico de Delta T (Temperatura Retorno - Temperatura Inyección)
 */
function initDeltaTCalculation() {
  const tempInjInput = document.getElementById('med_temp_inyeccion');
  const tempRetInput = document.getElementById('med_temp_retorno');
  const deltaBadge = document.getElementById('delta-t-badge');
  const deltaHidden = document.getElementById('med_delta_t');

  function calculateDeltaT() {
    const inj = parseFloat(tempInjInput.value);
    const ret = parseFloat(tempRetInput.value);

    if (!isNaN(inj) && !isNaN(ret)) {
      const delta = (ret - inj).toFixed(1);
      deltaHidden.value = delta;
      
      let statusText = `Diferencial ΔT: ${delta} °C`;
      if (delta >= 8 && delta <= 12) {
        deltaBadge.className = 'text-[11px] text-emerald-600 font-bold mt-0.5';
        statusText += ' (Ideal ✓)';
      } else if (delta < 8) {
        deltaBadge.className = 'text-[11px] text-amber-600 font-bold mt-0.5';
        statusText += ' (Bajo)';
      } else {
        deltaBadge.className = 'text-[11px] text-blue-600 font-bold mt-0.5';
        statusText += ' (Alto)';
      }
      deltaBadge.textContent = statusText;
    } else {
      deltaHidden.value = '';
      deltaBadge.className = 'text-[11px] text-blue-600 font-bold mt-0.5';
      deltaBadge.textContent = 'Diferencial ΔT: -- °C';
    }
  }

  if (tempInjInput && tempRetInput) {
    tempInjInput.addEventListener('input', calculateDeltaT);
    tempRetInput.addEventListener('input', calculateDeltaT);
  }
}

/**
 * 3. Botones de acción masiva: "Marcar Todos Bueno (B)"
 */
function initBulkActionButtons() {
  document.querySelectorAll('.btn-bulk-good').forEach(button => {
    button.addEventListener('click', () => {
      const sectionPrefix = button.getAttribute('data-section');
      const radioGroups = document.querySelectorAll(`input[name^="${sectionPrefix}_"][value="B"]`);
      
      radioGroups.forEach(radio => {
        // Excluir campos especiales como capacitores u otros si aplica
        if (!radio.name.includes('_obs') && !radio.name.includes('_cap_')) {
          radio.checked = true;
        }
      });

      triggerDraftSave();
    });
  });
}

/**
 * 4. Control de Lienzos de Firma Digital (HTML5 Canvas)
 */
function initSignaturePads() {
  const canvases = ['canvas-tecnico', 'canvas-cliente'];

  canvases.forEach(canvasId => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let isDrawing = false;

    // Configurar pincel
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b'; // slate-800

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = rect.width ? canvas.width / rect.width : 1;
      const scaleY = rect.height ? canvas.height / rect.height : 1;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    function startDrawing(e) {
      isDrawing = true;
      canvas.dataset.isDrawn = 'true';
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      e.preventDefault();
    }

    function draw(e) {
      if (!isDrawing) return;
      canvas.dataset.isDrawn = 'true';
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      e.preventDefault();
    }

    function stopDrawing() {
      if (isDrawing) {
        isDrawing = false;
        ctx.closePath();
        triggerDraftSave();
      }
    }

    // Eventos Mouse y Touch
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
  });

  // Botones para limpiar firma
  document.querySelectorAll('.btn-clear-canvas').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const canvas = document.getElementById(targetId);
      if (canvas) {
        delete canvas.dataset.existingDataUrl;
        delete canvas.dataset.isDrawn;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        triggerDraftSave();
      }
    });
  });
}

/**
 * 5. Guardado de borrador en LocalStorage por Usuario
 */
function getStorageKeyForUser() {
  if (currentUser && (currentUser.id || currentUser.nombre)) {
    const idClean = (currentUser.id || currentUser.nombre).toString().replace(/[^a-zA-Z0-9_-]/g, '_');
    return `checklist_ac_draft_${idClean}`;
  }
  return 'checklist_ac_draft_temp';
}

function updateDraftButtonState() {
  const btnText = document.getElementById('btn-draft-text');
  const btnMobileText = document.getElementById('btn-mobile-draft-text');
  const saved = localStorage.getItem(getStorageKeyForUser());
  const labelText = saved ? '✓ Borrador guardado' : 'Guardar borrador';
  
  if (btnText) btnText.innerHTML = labelText;
  if (btnMobileText) btnMobileText.innerHTML = labelText;
}

function initDraftStorage() {
  const form = document.getElementById('checklist-form');
  const btnSaveDraft = document.getElementById('btn-save-draft');

  // Cargar borrador previo si existe
  loadDraft();
  updateDraftButtonState();

  // Escuchar cambios en cualquier input para auto-guardar
  if (form) {
    form.addEventListener('input', triggerDraftSave);
    form.addEventListener('change', triggerDraftSave);
  }

  if (btnSaveDraft) {
    btnSaveDraft.addEventListener('click', () => {
      saveDraft();
      updateDraftButtonState();
    });
  }
}

function initMobileMenu() {
  const btnMenu = document.getElementById('btn-mobile-menu');
  const dropdown = document.getElementById('mobile-dropdown-menu');
  const btnClients = document.getElementById('btn-mobile-clients');
  const btnTechs = document.getElementById('btn-mobile-technicians');
  const btnEquipments = document.getElementById('btn-mobile-equipments');
  const btnHistory = document.getElementById('btn-mobile-history');
  const btnDraft = document.getElementById('btn-mobile-draft');

  if (!btnMenu || !dropdown) return;

  const closeDropdown = () => dropdown.classList.add('hidden');

  btnMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  if (btnClients) {
    btnClients.addEventListener('click', () => {
      closeDropdown();
      const desktopBtn = document.getElementById('btn-view-clients');
      if (desktopBtn) desktopBtn.click();
    });
  }

  if (btnTechs) {
    btnTechs.addEventListener('click', () => {
      closeDropdown();
      const desktopBtn = document.getElementById('btn-view-technicians');
      if (desktopBtn) desktopBtn.click();
    });
  }

  if (btnEquipments) {
    btnEquipments.addEventListener('click', () => {
      closeDropdown();
      const desktopBtn = document.getElementById('btn-view-equipments');
      if (desktopBtn) desktopBtn.click();
    });
  }

  if (btnHistory) {
    btnHistory.addEventListener('click', () => {
      closeDropdown();
      const desktopBtn = document.getElementById('btn-view-history');
      if (desktopBtn) desktopBtn.click();
    });
  }

  if (btnDraft) {
    btnDraft.addEventListener('click', () => {
      closeDropdown();
      saveDraft();
    });
  }

  // Cerrar menu al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !btnMenu.contains(e.target)) {
      closeDropdown();
    }
  });
}

let saveTimeout = null;
function triggerDraftSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDraft();
  }, 800);
}

function saveDraft() {
  const form = document.getElementById('checklist-form');
  if (!form) return false;
  try {
    const formData = new FormData(form);
    const draftData = {};
    formData.forEach((val, key) => {
      draftData[key] = val;
    });
    localStorage.setItem(getStorageKeyForUser(), JSON.stringify(draftData));
    updateDraftButtonState();
    return true;
  } catch (err) {
    console.error('Error al guardar borrador:', err);
    return false;
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(getStorageKeyForUser());
    if (!raw) return;
    const data = JSON.parse(raw);
    const form = document.getElementById('checklist-form');
    if (!form || !form.elements) return;

    Object.keys(data).forEach(key => {
      const field = form.elements[key];
      if (field) {
        if (field.type === 'radio' || field instanceof NodeList) {
          const radio = form.querySelector(`input[name="${key}"][value="${data[key]}"]`);
          if (radio) radio.checked = true;
        } else {
          field.value = data[key];
        }
      }
    });

    // Recalcular Delta T si se recuperó
    const tempInjInput = document.getElementById('med_temp_inyeccion');
    if (tempInjInput) tempInjInput.dispatchEvent(new Event('input'));

  } catch (e) {
    console.error('Error al cargar borrador:', e);
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(getStorageKeyForUser());
    updateDraftButtonState();
  } catch (err) {}
}

function resetFormComplete() {
  const form = document.getElementById('checklist-form');
  if (form) form.reset();
  clearDraft();

  const banner = document.getElementById('edit-mode-banner');
  if (banner) banner.classList.add('hidden');

  // Desmarcar explicitamente radios de inspeccion
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.checked = false;
  });

  // Limpiar badges de Delta T y validacion de OT
  const deltaBadge = document.getElementById('delta-t-badge');
  if (deltaBadge) {
    deltaBadge.textContent = '-- °C';
    deltaBadge.className = 'text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500';
  }

  isOtDuplicate = false;
  const otBadge = document.getElementById('ot-validation-badge');
  if (otBadge) {
    otBadge.className = 'block text-[11px] font-medium mt-1 hidden';
    otBadge.textContent = '';
  }

  const otInput = document.getElementById('ot');
  if (otInput) {
    otInput.value = '';
    otInput.classList.remove('border-rose-500', 'border-emerald-500');
  }

  toggleEquipmentTypeSections('');

  const containerSubtipo = document.getElementById('container-subtipo-equipo');
  if (containerSubtipo) containerSubtipo.classList.add('hidden');
  const subtipoSelect = document.getElementById('subtipoEquipo');
  if (subtipoSelect) subtipoSelect.value = '';

  // Limpiar lienzos de firmas
  ['canvas-tecnico', 'canvas-cliente'].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) {
      delete canvas.dataset.existingDataUrl;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });

  // Re-inicializar fecha actual
  initDate();
}

/**
 * 6. Envío del Formulario a Google Sheets
 */
function initFormSubmission() {
  const form = document.getElementById('checklist-form');
  if (!form) return;
  const modal = document.getElementById('modal-status');
  const modalLoading = document.getElementById('modal-loading');
  const modalSuccess = document.getElementById('modal-success');
  const modalError = document.getElementById('modal-error');
  const errorMessageText = document.getElementById('error-message-text');

  const btnReset = document.getElementById('btn-reset');
  const btnCloseSuccess = document.getElementById('btn-close-success');
  const btnSuccessViewHistory = document.getElementById('btn-success-view-history');
  const btnCloseError = document.getElementById('btn-close-error');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      showConfirmModal({
        title: '¿Limpiar todo el formulario?',
        message: 'Se borrarán la N° de Orden, todas las mediciones, firmas y el borrador guardado.',
        icon: '🧹',
        acceptText: 'Sí, limpiar todo',
        btnClass: 'bg-rose-600 hover:bg-rose-700',
        onAccept: () => {
          resetFormComplete();
        }
      });
    });
  }

  if (btnCloseSuccess) {
    btnCloseSuccess.addEventListener('click', () => {
      modal.classList.add('hidden');
      resetFormComplete();
    });
  }

  if (btnSuccessViewHistory) {
    btnSuccessViewHistory.addEventListener('click', async () => {
      modal.classList.add('hidden');
      const otInput = document.getElementById('ot');
      const modalHistory = document.getElementById('modal-history');
      if (modalHistory) {
        modalHistory.classList.remove('hidden');
        const searchInput = document.getElementById('history-search');
        if (searchInput && otInput) {
          searchInput.value = otInput.value;
        }
        await fetchHistoryData(false);
        if (searchInput && otInput) {
          renderHistoryTable(otInput.value);
        }
      }
    });
  }

  if (btnCloseError) {
    btnCloseError.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const otInput = document.getElementById('ot');
    const clienteInput = document.getElementById('cliente');

    // Validar Unicidad de OT antes de enviar
    if (isOtDuplicate) {
      alert(`⚠️ ERROR DE UNICIDAD: La Orden "${otInput.value}" ya existe en el sistema. Por favor genera o ingresa un número de Orden único.`);
      otInput.focus();
      return;
    }

    // Validar URL de Google Script
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PEGA_AQUI_TU_URL')) {
      alert('⚠️ ATENCIÓN: Debes configurar la URL de tu Google Apps Script en el archivo app.js (constante GOOGLE_SCRIPT_URL). Consulta el README.md para ver las instrucciones paso a paso.');
      return;
    }

    // Inyectar o actualizar firmas en campos ocultos del formulario antes del submit
    const canvasTecnico = document.getElementById('canvas-tecnico');
    const canvasCliente = document.getElementById('canvas-cliente');

    const getFirmaValue = (canvas) => {
      if (!canvas) return '';
      if (canvas.dataset.isDrawn === 'true' || !isCanvasBlank(canvas)) {
        try {
          return canvas.toDataURL('image/png');
        } catch (err) {
          console.error('Error exportando canvas:', err);
        }
      }
      return canvas.dataset.existingDataUrl || '';
    };

    const firmaTechVal = getFirmaValue(canvasTecnico);
    const firmaClientVal = getFirmaValue(canvasCliente);

    setHiddenInput(form, 'firma_tecnico', firmaTechVal);
    setHiddenInput(form, 'firma_cliente', firmaClientVal);

    // Recopilar todos los datos en un objeto JSON limpio
    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });

    payload['firma_tecnico'] = firmaTechVal;
    payload['firma_cliente'] = firmaClientVal;

    form.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
      payload[radio.name] = radio.value;
    });

    // Auto-registrar equipo personalizado en el Catálogo de Equipos si no existía previamente
    if (payload.tipoUnidad === 'Otro' && payload.subtipoEquipo && payload.subtipoEquipo !== '__MANAGE_EQUIPMENT__') {
      const exists = (equipmentTypesCache || []).some(eq => (eq['Nombre Categoría'] || eq.nombre || '').toLowerCase() === payload.subtipoEquipo.toLowerCase());
      if (!exists) {
        try {
          await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
              action: 'add_equipo',
              nombre: payload.subtipoEquipo,
              descripcion: 'Categoría registrada desde Orden ' + (payload.ot || ''),
              creador: currentUser ? currentUser.nombre : 'Sistema'
            })
          });
          setTimeout(() => fetchEquipmentTypes(true), 1000);
        } catch (e) {}
      }
    }

    // Mostrar modal en estado de Carga
    modal.classList.remove('hidden');
    modalLoading.classList.remove('hidden');
    modalSuccess.classList.add('hidden');
    modalError.classList.add('hidden');

    try {
      // 1. Enviar payload como JSON via fetch (evita truncamiento de firmas base64 de 50KB)
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      // 2. También enviar el formulario al iframe oculto como respaldo
      form.action = GOOGLE_SCRIPT_URL;
      form.method = 'POST';
      form.target = 'hidden_iframe';
      form.submit();

      // Esperar brevemente para confirmación en Google Sheets y refrescar datos
      setTimeout(async () => {
        modalLoading.classList.add('hidden');
        modalSuccess.classList.remove('hidden');

        const summaryOt = document.getElementById('summary-ot');
        const summaryCliente = document.getElementById('summary-cliente');
        if (summaryOt) summaryOt.textContent = otInput ? (otInput.value || '--') : '--';
        if (summaryCliente) summaryCliente.textContent = clienteInput ? (clienteInput.value || '--') : '--';

        resetFormComplete();
        await fetchHistoryData(true);
      }, 1500);

    } catch (err) {
      console.error('Error al enviar registro:', err);
      modalLoading.classList.add('hidden');
      modalError.classList.remove('hidden');
      if (errorMessageText) errorMessageText.textContent = err.message || 'Error al conectar con Google Sheets.';
    }
  });
}

function setHiddenInput(form, name, value) {
  let input = form.querySelector(`input[name="${name}"]`);
  if (!input) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    form.appendChild(input);
  }
  input.value = value;
}

/**
 * Función auxiliar para verificar si un Canvas está en blanco
 */
function isCanvasBlank(canvas) {
  const context = canvas.getContext('2d');
  const pixelBuffer = new Uint32Array(
    context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
  );
  return !pixelBuffer.some(color => color !== 0);
}

/**
 * 7. Modal de Historial de Registros
 */
let historyDataCache = [];

function initHistoryModal() {
  const btnViewHistory = document.getElementById('btn-view-history');
  const modalHistory = document.getElementById('modal-history');
  const btnCloseHistory = document.getElementById('btn-close-history');
  const btnRefreshHistory = document.getElementById('btn-refresh-history');
  const searchInput = document.getElementById('history-search');

  if (!btnViewHistory || !modalHistory) return;

  btnViewHistory.addEventListener('click', () => {
    modalHistory.classList.remove('hidden');
    fetchHistoryData();
  });

  if (btnCloseHistory) {
    btnCloseHistory.addEventListener('click', () => {
      modalHistory.classList.add('hidden');
    });
  }

  if (btnRefreshHistory) {
    btnRefreshHistory.addEventListener('click', fetchHistoryData);
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderHistoryTable(e.target.value);
    });
  }
}

async function fetchHistoryData(silent = false) {
  const loading = document.getElementById('history-loading');
  const empty = document.getElementById('history-empty');
  const container = document.getElementById('history-table-container');

  if (!silent && loading) {
    loading.classList.remove('hidden');
    empty.classList.add('hidden');
    container.classList.add('hidden');
  }

  try {
    // Parametro de fecha unico para ignorar cualquier cache del navegador/servidor
    const fetchUrl = GOOGLE_SCRIPT_URL + (GOOGLE_SCRIPT_URL.includes('?') ? '&' : '?') + '_t=' + Date.now();
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('La respuesta de Google Apps Script no es un JSON válido:', text);
      if (!silent && loading) {
        loading.classList.add('hidden');
        if (container && historyDataCache.length > 0) container.classList.remove('hidden');
      }
      return;
    }

    if (Array.isArray(data)) {
      historyDataCache = data;
    }

    if (typeof updateClientsUI === 'function') updateClientsUI();
    if (typeof updateTechniciansUI === 'function') updateTechniciansUI();

    if (historyDataCache.length > 0) {
      if (!silent && loading) {
        loading.classList.add('hidden');
        if (empty) empty.classList.add('hidden');
        if (container) container.classList.remove('hidden');
        const searchInput = document.getElementById('history-search');
        renderHistoryTable(searchInput ? searchInput.value : '');
      }
      checkOTUniqueness();
    } else {
      if (!silent && loading) {
        loading.classList.add('hidden');
        if (container) container.classList.add('hidden');
        if (empty) empty.classList.remove('hidden');
      }
      checkOTUniqueness();
    }
  } catch (err) {
    console.error('Error al cargar historial:', err);
    if (!silent && loading) {
      loading.classList.add('hidden');
      if (container && historyDataCache.length > 0) {
        container.classList.remove('hidden');
      } else if (empty) {
        empty.classList.remove('hidden');
      }
    }
  }
}

/**
 * 8. Generador y Validador de Unicidad de OT
 */
let isOtDuplicate = false;

function initOTValidation() {
  const otInput = document.getElementById('ot');
  const btnAutoOt = document.getElementById('btn-auto-ot');

  if (btnAutoOt) {
    btnAutoOt.addEventListener('click', generateUniqueOT);
  }

  if (otInput) {
    otInput.addEventListener('input', checkOTUniqueness);
    otInput.addEventListener('change', checkOTUniqueness);
  }

  fetchHistoryData(true);
}

function generateUniqueOT() {
  const otInput = document.getElementById('ot');
  if (!otInput) return;

  const currentYear = new Date().getFullYear();
  let maxNumber = 0;

  if (Array.isArray(historyDataCache)) {
    historyDataCache.forEach(item => {
      const otVal = (item['N° Orden / OT'] || '').toString();
      const match = otVal.match(/OT-\d{4}-(\d+)/i) || otVal.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
  }

  const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
  otInput.value = `OT-${currentYear}-${nextNumber}`;
  checkOTUniqueness();
  triggerDraftSave();
}

function checkOTUniqueness() {
  const otInput = document.getElementById('ot');
  const badge = document.getElementById('ot-validation-badge');
  if (!otInput || !badge) return;

  const val = otInput.value.trim().toLowerCase();
  if (!val) {
    badge.className = 'block text-[11px] font-medium mt-1 hidden';
    isOtDuplicate = false;
    otInput.classList.remove('border-rose-500', 'border-emerald-500');
    return;
  }

  const found = historyDataCache.some(item => {
    const ot = (item['N° Orden / OT'] || '').toString().trim().toLowerCase();
    return ot === val;
  });

  if (found) {
    isOtDuplicate = true;
    badge.className = 'block text-[11px] font-medium mt-1 text-rose-600 font-semibold';
    badge.textContent = '⚠️ Esta Orden ya fue registrada previamente';
    otInput.classList.add('border-rose-500');
    otInput.classList.remove('border-emerald-500');
  } else {
    isOtDuplicate = false;
    badge.className = 'block text-[11px] font-medium mt-1 text-emerald-600 font-semibold';
    badge.textContent = '✓ N° de Orden disponible';
    otInput.classList.add('border-emerald-500');
    otInput.classList.remove('border-rose-500');
  }
}

function formatLocalDate(val) {
  if (!val) return '--';
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (str.includes('T')) {
    const part = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
  }
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch (e) {
    return str;
  }
}

let selectedRecordCache = null;

function renderHistoryTable(query) {
  const tbody = document.getElementById('history-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  const q = (query || '').toLowerCase().trim();

  const filtered = historyDataCache.filter(item => {
    const ot = (item['N° Orden / OT'] || '').toString().trim();
    const cliente = (item['Cliente / Ubicación'] || '').toString().trim();
    const tecResp = (item['Técnico Responsable'] || item['Nombre Técnico'] || '').toString().toLowerCase();

    // Descartar filas vacías o cuyas celdas fueron borradas en Google Sheets
    if (!ot && !cliente) return false;

    // Aislamiento por usuario: si el usuario es Técnico, solo ve sus propias órdenes
    if (currentUser && isUserTech(currentUser)) {
      const uTechName = currentUser.nombre || currentUser.Nombre || currentUser['Nombre Usuario'] || currentUser.id || '';
      if (!matchTechnicianName(tecResp, uTechName)) {
        return false;
      }
    }

    if (!q) return true;
    const fecha = (item['Fecha Inspección'] || '').toString().toLowerCase();
    return ot.toLowerCase().includes(q) || cliente.toLowerCase().includes(q) || tecResp.includes(q) || fecha.includes(q);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-slate-400">No hay coincidencias con la búsqueda "${query}".</td></tr>`;
    return;
  }

  filtered.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';

    const fechaFormatted = formatLocalDate(item['Fecha Inspección'] || item['Fecha / Hora Registro']);

    tr.innerHTML = `
      <!-- Desktop Cells -->
      <td class="hidden sm:table-cell py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">${fechaFormatted}</td>
      <td class="hidden sm:table-cell py-2.5 px-3 font-bold text-blue-600 whitespace-nowrap">${item['N° Orden / OT'] || '--'}</td>
      <td class="hidden sm:table-cell py-2.5 px-3 text-slate-800">${item['Cliente / Ubicación'] || '--'}</td>
      <td class="hidden sm:table-cell py-2.5 px-3 text-slate-600">${item['Técnico Responsable'] || '--'}</td>
      <td class="hidden sm:table-cell py-2.5 px-3 text-slate-600">${item['Tipo de Unidad'] || ''} ${item['Marca / Modelo'] || ''}</td>
      <td class="hidden sm:table-cell py-2.5 px-3 text-slate-600">${item['Refrigerante'] || '--'}</td>
      <td class="hidden sm:table-cell py-2.5 px-3 font-semibold text-emerald-600 whitespace-nowrap">${item['Med: Delta T (°C)'] ? item['Med: Delta T (°C)'] + ' °C' : '--'}</td>
      <td class="hidden sm:table-cell py-2.5 px-3 text-center whitespace-nowrap">
        <button type="button" class="btn-view-detail-row px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-medium text-[11px] transition inline-flex items-center gap-1 shadow-sm" data-index="${index}">
          👁️ Ver / Editar
        </button>
      </td>

      <!-- Mobile Card View -->
      <td colspan="8" class="sm:hidden p-3">
        <details class="group">
          <summary class="flex items-center justify-between font-bold text-slate-800 cursor-pointer list-none select-none">
            <div>
              <span class="text-blue-600 font-bold text-xs">${item['N° Orden / OT'] || '--'}</span>
              <span class="text-slate-500 font-normal text-[11px] block">${item['Cliente / Ubicación'] || '--'}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-slate-500 font-medium">${fechaFormatted}</span>
              <span class="text-slate-400 group-open:rotate-180 transition-transform text-xs">▼</span>
            </div>
          </summary>
          <div class="mt-2.5 pt-2 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
            <p><strong>Técnico:</strong> ${item['Técnico Responsable'] || '--'}</p>
            <p><strong>Equipo:</strong> ${item['Tipo de Unidad'] || ''} ${item['Marca / Modelo'] || ''}</p>
            <p><strong>Refrigerante:</strong> ${item['Refrigerante'] || '--'} | <strong>Delta T:</strong> ${item['Med: Delta T (°C)'] ? item['Med: Delta T (°C)'] + ' °C' : '--'}</p>
            <div class="pt-2 flex justify-end">
              <button type="button" class="btn-view-detail-row w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm" data-index="${index}">
                👁️ Ver / Editar Orden
              </button>
            </div>
          </div>
        </details>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Event listeners para botones de ver detalle en tabla
  tbody.querySelectorAll('.btn-view-detail-row').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'));
      if (!isNaN(idx) && filtered[idx]) {
        openRecordDetail(filtered[idx]);
      }
    });
  });
}

function openRecordDetail(record) {
  selectedRecordCache = record;
  const modalDetail = document.getElementById('modal-record-detail');
  const container = document.getElementById('detail-modal-body');
  if (!modalDetail || !container) return;

  const getVal = (key) => record[key] || '--';

  const allChecklistItems = [
    { label: 'Evap: Gabinete Externo', key: 'Evap: Gabinete Externo', obsKey: 'Evap: Gabinete Obs' },
    { label: 'Evap: Filtros de Aire', key: 'Evap: Filtros Aire', obsKey: 'Evap: Filtros Obs' },
    { label: 'Evap: Serpentín Evap.', key: 'Evap: Serpentín Evaporador', obsKey: 'Evap: Serpentín Obs' },
    { label: 'Evap: Bandeja / Biocidas', key: 'Evap: Bandeja Condensados / Biocidas', obsKey: 'Evap: Bandeja Obs' },
    { label: 'Evap: Limpieza Drenaje', key: 'Evap: Drenaje Obstrucciones', obsKey: 'Evap: Drenaje Obs' },
    { label: 'Evap: Turbina / Fan', key: 'Evap: Turbina / Fan Tangencial', obsKey: 'Evap: Turbina Obs' },
    { label: 'Evap: Motor / Rodajes', key: 'Evap: Motor Vent / Rodajes', obsKey: 'Evap: Motor Vent Obs' },
    { label: 'Evap: Persianas Swing', key: 'Evap: Persianas Swing / Motor paso', obsKey: 'Evap: Persianas Obs' },
    { label: 'Evap: Conexiones Elec.', key: 'Evap: Conexiones Eléctricas / Termistores', obsKey: 'Evap: Conexiones Obs' },
    { label: 'Cond: Serpentín Cond.', key: 'Cond: Serpentín Condensador', obsKey: 'Cond: Serpentín Obs' },
    { label: 'Cond: Aletas Aluminio', key: 'Cond: Aletas Aluminio', obsKey: 'Cond: Aletas Obs' },
    { label: 'Cond: Aspas Ventilador', key: 'Cond: Aspas Ventilador', obsKey: 'Cond: Aspas Obs' },
    { label: 'Cond: Motor / Rodamientos', key: 'Cond: Motor Vent / Rodamientos', obsKey: 'Cond: Motor Vent Obs' },
    { label: 'Cond: Compresor (Ruido)', key: 'Cond: Compresor (Ruido/Amortiguadores)', obsKey: 'Cond: Compresor Obs' },
    { label: 'Cond: Aislamiento Térmico', key: 'Cond: Aislamiento Térmico Tuberías', obsKey: 'Cond: Aislamiento Obs' },
    { label: 'Cond: Fugas Ref./Aceite', key: 'Cond: Fugas Refrigerante / Aceite', obsKey: 'Cond: Fugas Obs' },
    { label: 'Cond: Soportes y Anclajes', key: 'Cond: Soportes y Anclajes', obsKey: 'Cond: Soportes Obs' },
    { label: 'Elec: Reajuste Bornes', key: 'Elec: Reajuste Bornes', obsKey: 'Elec: Bornes Obs' },
    { label: 'Elec: Capacitores', key: 'Elec: Capacitores Medición', obsKey: 'Elec: Capacitores Obs' },
    { label: 'Elec: Tarjetas PCB / Err', key: 'Elec: Tarjetas PCB / Errores', obsKey: 'Elec: Tarjetas Obs' },
    { label: 'Elec: Protecciones Elec.', key: 'Elec: Protecciones Eléctricas', obsKey: 'Elec: Protecciones Obs' },
    { label: 'Elec: Tierra Física', key: 'Elec: Conexión Tierra Física', obsKey: 'Elec: Tierra Obs' }
  ];

  const getItemValue = (item) => {
    if (record[item.key] !== undefined && record[item.key] !== '') return record[item.key];
    if (record[item.label] !== undefined && record[item.label] !== '') return record[item.label];
    if (item.altKey && record[item.altKey] !== undefined && record[item.altKey] !== '') return record[item.altKey];

    const clean = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetKey = clean(item.key);
    const targetLabel = clean(item.label);

    for (const k in record) {
      const normK = clean(k);
      if (normK === targetKey || normK === targetLabel || (normK.length > 4 && targetKey.includes(normK)) || (normK.length > 4 && normK.includes(targetKey))) {
        const v = (record[k] || '').toString().trim();
        if (v === 'B' || v === 'R' || v === 'M' || v === 'N/A') {
          return v;
        }
      }
    }
    return '--';
  };

  const getItemObs = (item) => {
    if (!item.obsKey) return '';
    const val = (record[item.obsKey] || '').toString().trim();
    if (!val || val === 'B' || val === 'R' || val === 'M' || val === 'N/A') return '';
    return val;
  };

  // Helper para renderizar pill de inspección compacto de 1 sola línea (4 columnas)
  const renderItemPill = (item) => {
    const val = getItemValue(item);
    const obs = getItemObs(item);
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-300';
    if (val === 'B') colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (val === 'R') colorClass = 'bg-amber-100 text-amber-800 border-amber-300';
    if (val === 'M') colorClass = 'bg-rose-100 text-rose-800 border-rose-300';
    if (val === 'N/A') colorClass = 'bg-slate-100 text-slate-500 border-slate-200';
    return `<div class="p-1 px-1.5 bg-slate-50 border border-slate-200 rounded text-[9.5px] flex flex-col justify-between leading-none gap-0.5">
      <div class="flex items-center justify-between gap-1 w-full">
        <span class="text-slate-700 font-semibold truncate mr-0.5">${item.label}</span>
        <span class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border shrink-0 ${colorClass}">${val}</span>
      </div>
      ${obs ? `<div class="text-[8.5px] text-slate-600 font-normal italic truncate border-t border-slate-200/60 pt-0.5 mt-0.5">💬 ${obs}</div>` : ''}
    </div>`;
  };

  const fechaVal = formatLocalDate(record['Fecha Inspección'] || record['Fecha / Hora Registro']);
  const tipoMant = getVal('Tipo de Mantenimiento') !== '--' ? getVal('Tipo de Mantenimiento') : 'Preventivo';

  // Saneamiento de firmas en caso de registros con desplazamiento previo de columnas
  let rawTecNombre = record['Nombre Técnico'] || getVal('Técnico Responsable');
  let rawTecFirma = record['Firma Técnico (DataURL)'] || record['Firma Técnico'] || '';
  if (rawTecNombre && rawTecNombre.startsWith('data:image')) {
    rawTecFirma = rawTecNombre;
    rawTecNombre = getVal('Técnico Responsable');
  }

  let rawCliNombre = record['Nombre Cliente'] || getVal('Cliente / Ubicación');
  let rawCliFirma = record['Firma Cliente (DataURL)'] || record['Firma Cliente'] || '';
  if (rawCliNombre && rawCliNombre.startsWith('data:image')) {
    rawCliFirma = rawCliNombre;
    rawCliNombre = getVal('Cliente / Ubicación');
  }

  // Escaneo inteligente de cualquier DataURL desplazada en el registro
  const dataUrls = [];
  for (const k in record) {
    const val = (record[k] || '').toString();
    if (val.startsWith('data:image')) {
      dataUrls.push({ key: k, val: val });
    }
  }

  if (dataUrls.length > 0) {
    if (!rawTecFirma && dataUrls[0]) rawTecFirma = dataUrls[0].val;
    if (!rawCliFirma && dataUrls[1]) rawCliFirma = dataUrls[1].val;
    if (!rawCliFirma && dataUrls[0] && dataUrls[0].key.toLowerCase().includes('cliente')) rawCliFirma = dataUrls[0].val;
  }

  const isEquipoOtro = (record['Tipo de Unidad'] || '').toString().trim() === 'Otro';

  const checklistBlockHTML = isEquipoOtro ? '' : `
    <!-- Puntos Revisados / Inspeccionados (4 Columnas - 1 Sola Línea) -->
    <div class="border border-slate-200 rounded-xl p-1.5 px-2 bg-white shadow-sm">
      <h4 class="font-bold text-slate-800 text-[10px] mb-1 border-b border-slate-100 pb-0.5 flex items-center justify-between">
        <span>✅ Checklist de Inspección y Mantenimiento (22 Puntos Evaluados)</span>
        <span class="text-[8.5px] text-slate-500 font-normal"><strong>B</strong>: Bueno | <strong>R</strong>: Regular | <strong>M</strong>: Malo | <strong>N/A</strong>: No Aplica</span>
      </h4>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-1">
        ${allChecklistItems.map(item => renderItemPill(item)).join('')}
      </div>
    </div>
  `;

  container.innerHTML = `
    <!-- Header Summary Card -->
    <div class="bg-slate-50 border border-slate-200 p-2 rounded-xl space-y-1">
      <div class="flex flex-wrap justify-between items-center border-b border-slate-200 pb-1 gap-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-blue-600">Orden: ${getVal('N° Orden / OT')}</span>
          <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${tipoMant === 'Correctivo' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-100 text-blue-800 border border-blue-300'}">${tipoMant}</span>
        </div>
        <span class="text-xs text-slate-500 font-medium">Fecha: ${fechaVal}</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5 text-xs">
        <div><span class="text-slate-400 block text-[9.5px]">Cliente / Ubicación:</span> <strong class="text-slate-800 font-semibold truncate block">${getVal('Cliente / Ubicación')}</strong></div>
        <div><span class="text-slate-400 block text-[9.5px]">Técnico Responsable:</span> <strong class="text-slate-800 font-semibold truncate block">${getVal('Técnico Responsable')}</strong></div>
        <div><span class="text-slate-400 block text-[9.5px]">Equipo / Marca:</span> <strong class="text-slate-800 font-semibold truncate block">${getVal('Tipo de Unidad')} ${getVal('Subtipo / Categoría Equipo') ? '(' + getVal('Subtipo / Categoría Equipo') + ')' : ''} ${getVal('Marca / Modelo')}</strong></div>
        <div><span class="text-slate-400 block text-[9.5px]">Tag / Refrigerante:</span> <strong class="text-slate-800 font-semibold truncate block">${getVal('ID / Tag Equipo')} (${getVal('Refrigerante')})</strong></div>
      </div>
    </div>

    ${checklistBlockHTML}

    <!-- Section 4: Operational Measurements Summary -->
    <div class="border border-slate-200 rounded-xl p-2 bg-white shadow-sm">
      <h4 class="font-bold text-slate-800 text-[11px] mb-1 border-b border-slate-100 pb-0.5 flex items-center gap-1.5">
        📊 Mediciones Técnicas
      </h4>
      <div class="grid grid-cols-3 sm:grid-cols-6 gap-1 text-xs text-center">
        <div class="bg-slate-50 p-1 rounded border border-slate-100"><span class="text-slate-400 block text-[8.5px]">Voltaje:</span> <strong class="text-slate-800 text-[10px]">${getVal('Med: Voltaje (V AC)')} V</strong></div>
        <div class="bg-slate-50 p-1 rounded border border-slate-100"><span class="text-slate-400 block text-[8.5px]">Corr. Compr:</span> <strong class="text-slate-800 text-[10px]">${getVal('Med: Corriente Compresor (A)')} A</strong></div>
        <div class="bg-slate-50 p-1 rounded border border-slate-100"><span class="text-slate-400 block text-[8.5px]">Corr. Vent:</span> <strong class="text-slate-800 text-[10px]">${getVal('Med: Corriente Motor Ext (A)')} A</strong></div>
        <div class="bg-slate-50 p-1 rounded border border-slate-100"><span class="text-slate-400 block text-[8.5px]">Presión Baja:</span> <strong class="text-slate-800 text-[10px]">${getVal('Med: Presión Baja (PSI)')} PSI</strong></div>
        <div class="bg-slate-50 p-1 rounded border border-slate-100"><span class="text-slate-400 block text-[8.5px]">Presión Alta:</span> <strong class="text-slate-800 text-[10px]">${getVal('Med: Presión Alta (PSI)')} PSI</strong></div>
        <div class="bg-emerald-50 p-1 rounded border border-emerald-200"><span class="text-emerald-700 block text-[8.5px] font-semibold">ΔT:</span> <strong class="text-emerald-800 text-[10px]">${getVal('Med: Delta T (°C)')} °C</strong></div>
      </div>
    </div>

    <!-- Section 5: Observaciones Finales (Espacio Maximizado) -->
    <div class="border border-slate-200 rounded-xl p-2.5 bg-white shadow-sm flex-1">
      <h4 class="font-bold text-slate-800 text-xs mb-1 flex items-center gap-1">📝 Observaciones y Trabajo Realizado</h4>
      <p class="bg-slate-50 p-2.5 rounded text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-200 ${isEquipoOtro ? 'min-h-[160px]' : 'min-h-[90px]'}">${getVal('Diagnóstico y Observaciones Finales')}</p>
    </div>

    <!-- Signatures Preview -->
    <div class="grid grid-cols-2 gap-3 pt-0.5">
      <div class="border border-slate-200 rounded-xl p-2 bg-slate-50 text-center">
        <span class="text-[10px] font-semibold text-slate-600 block mb-1">Firma Técnico: ${rawTecNombre}</span>
        ${rawTecFirma && rawTecFirma.startsWith('data:image') ? `<img src="${rawTecFirma}" class="h-12 mx-auto object-contain bg-white rounded border border-slate-300 p-0.5" alt="Firma Técnico">` : '<span class="text-slate-400 italic text-[10px]">Sin firma</span>'}
      </div>
      <div class="border border-slate-200 rounded-xl p-2 bg-slate-50 text-center">
        <span class="text-[10px] font-semibold text-slate-600 block mb-1">Firma Cliente: ${rawCliNombre}</span>
        ${rawCliFirma && rawCliFirma.startsWith('data:image') ? `<img src="${rawCliFirma}" class="h-12 mx-auto object-contain bg-white rounded border border-slate-300 p-0.5" alt="Firma Cliente">` : '<span class="text-slate-400 italic text-[10px]">Sin firma</span>'}
      </div>
    </div>
  `;

  modalDetail.classList.remove('hidden');
}

function initRecordDetailModal() {
  const modalDetail = document.getElementById('modal-record-detail');
  const btnCloseDetail = document.getElementById('btn-close-detail');
  const btnLoadForEdit = document.getElementById('btn-load-for-edit');
  const btnPrintDetail = document.getElementById('btn-print-detail');

  if (btnCloseDetail) {
    btnCloseDetail.addEventListener('click', () => {
      if (modalDetail) modalDetail.classList.add('hidden');
    });
  }

  if (btnPrintDetail) {
    btnPrintDetail.addEventListener('click', () => {
      document.body.classList.add('printing-detail');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-detail');
      }, 1000);
    });
  }

  if (btnLoadForEdit) {
    btnLoadForEdit.addEventListener('click', () => {
      if (!selectedRecordCache) return;
      loadRecordIntoForm(selectedRecordCache);
      if (modalDetail) modalDetail.classList.add('hidden');
      const modalHistory = document.getElementById('modal-history');
      if (modalHistory) modalHistory.classList.add('hidden');
    });
  }

  const btnCancelEditMode = document.getElementById('btn-cancel-edit-mode');
  if (btnCancelEditMode) {
    btnCancelEditMode.addEventListener('click', window.exitEditMode);
  }
}

window.exitEditMode = function() {
  const banner = document.getElementById('edit-mode-banner');
  if (banner) banner.classList.add('hidden');
  const form = document.getElementById('checklist-form');
  if (form) form.reset();
  if (typeof clearDraft === 'function') clearDraft();
  if (typeof generateUniqueOT === 'function') generateUniqueOT();
  const badge = document.getElementById('ot-validation-badge');
  if (badge) badge.className = 'block text-[11px] font-medium mt-1 hidden';
};

function loadRecordIntoForm(record) {
  const form = document.getElementById('checklist-form');
  if (!form || !record) return;

  // Saneamiento inteligente de campos si la fila histórica en Google Sheets tiene desfasaje de 1 columna
  let rec = Object.assign({}, record);
  const rawTipoMant = (rec['Tipo de Mantenimiento'] || '').toString();
  if (rawTipoMant.includes('Mario') || rawTipoMant.includes('Santa') || rawTipoMant.length > 18) {
    rec['Refrigerante'] = rec['ID / Tag Equipo'] || rec['Refrigerante'] || '';
    rec['ID / Tag Equipo'] = rec['Marca / Modelo'] || rec['ID / Tag Equipo'] || '';
    rec['Marca / Modelo'] = rec['Subtipo / Categoría Equipo'] || rec['Marca / Modelo'] || '';
    rec['Subtipo / Categoría Equipo'] = rec['Tipo de Unidad'] || rec['Subtipo / Categoría Equipo'] || '';
    rec['Tipo de Unidad'] = rec['Técnico Responsable'] || rec['Tipo de Unidad'] || '';
    rec['Técnico Responsable'] = rec['Cliente / Ubicación'] || rec['Técnico Responsable'] || '';
    rec['Cliente / Ubicación'] = rec['Tipo de Mantenimiento'] || rec['Cliente / Ubicación'] || '';
    rec['Tipo de Mantenimiento'] = 'Preventivo';
  }

  const setSelectVal = (id, val) => {
    const el = document.getElementById(id);
    if (!el || !val) return;
    let opt = Array.from(el.options).find(o => o.value === val);
    if (!opt) {
      opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      el.insertBefore(opt, el.lastElementChild);
    }
    el.value = val;
  };

  const setVal = (id, val) => {
    const el = document.getElementById(id) || form.elements[id];
    if (el) el.value = val || '';
  };

  const setRadio = (name, val) => {
    if (!val) return;
    const radio = form.querySelector(`input[name="${name}"][value="${val}"]`);
    if (radio) radio.checked = true;
  };

  const setObsVal = (id, val) => {
    if (!val || val === 'B' || val === 'R' || val === 'M' || val === 'N/A') {
      setVal(id, '');
    } else {
      setVal(id, val);
    }
  };

  const rawFecha = rec['Fecha Inspección'] || rec['Fecha / Hora Registro'];
  setVal('fecha', formatDateForInput(rawFecha));
  setVal('ot', rec['N° Orden / OT']);
  setSelectVal('tipoMantenimiento', rec['Tipo de Mantenimiento'] || 'Preventivo');
  setSelectVal('cliente', rec['Cliente / Ubicación']);
  setSelectVal('tecnico', rec['Técnico Responsable']);
  setSelectVal('tipoUnidad', rec['Tipo de Unidad']);

  // Asignación explícita de Marca/Modelo e ID/Tag de Equipo (Garantiza restauración completa)
  setVal('marcaModelo', rec['Marca / Modelo'] || record['Marca / Modelo'] || '');
  setVal('idTag', rec['ID / Tag Equipo'] || record['ID / Tag Equipo'] || '');

  const tipoUnidadVal = rec['Tipo de Unidad'] || record['Tipo de Unidad'] || '';
  toggleEquipmentTypeSections(tipoUnidadVal);
  if (tipoUnidadVal === 'Otro') {
    setSelectVal('subtipoEquipo', rec['Subtipo / Categoría Equipo']);
  } else {
    setSelectVal('refrigerante', rec['Refrigerante']);
  }

  // Sección 1: Evaporadora
  setRadio('evap_gabinete', record['Evap: Gabinete Externo']);
  setObsVal('evap_gabinete_obs', record['Evap: Gabinete Obs']);
  setRadio('evap_filtros', record['Evap: Filtros Aire']);
  setObsVal('evap_filtros_obs', record['Evap: Filtros Obs']);
  setRadio('evap_serpentin', record['Evap: Serpentín Evaporador']);
  setObsVal('evap_serpentin_obs', record['Evap: Serpentín Obs']);
  setRadio('evap_bandeja', record['Evap: Bandeja Condensados / Biocidas']);
  setObsVal('evap_bandeja_obs', record['Evap: Bandeja Obs']);
  setRadio('evap_drenaje', record['Evap: Drenaje Obstrucciones']);
  setObsVal('evap_drenaje_obs', record['Evap: Drenaje Obs']);
  setRadio('evap_turbina', record['Evap: Turbina / Fan Tangencial']);
  setObsVal('evap_turbina_obs', record['Evap: Turbina Obs']);
  setRadio('evap_motor', record['Evap: Motor Vent / Rodajes']);
  setObsVal('evap_motor_obs', record['Evap: Motor Vent Obs']);
  setRadio('evap_persianas', record['Evap: Persianas Swing / Motor paso']);
  setObsVal('evap_persianas_obs', record['Evap: Persianas Obs']);
  setRadio('evap_conexiones', record['Evap: Conexiones Eléctricas / Termistores']);
  setObsVal('evap_conexiones_obs', record['Evap: Conexiones Obs']);

  // Sección 2: Condensadora
  setRadio('cond_serpentin', record['Cond: Serpentín Condensador']);
  setObsVal('cond_serpentin_obs', record['Cond: Serpentín Obs']);
  setRadio('cond_aletas', record['Cond: Aletas Aluminio']);
  setObsVal('cond_aletas_obs', record['Cond: Aletas Obs']);
  setRadio('cond_aspas', record['Cond: Aspas Ventilador']);
  setObsVal('cond_aspas_obs', record['Cond: Aspas Obs']);
  setRadio('cond_motor', record['Cond: Motor Vent / Rodamientos']);
  setObsVal('cond_motor_obs', record['Cond: Motor Vent Obs']);
  setRadio('cond_compresor', record['Cond: Compresor (Ruido/Amortiguadores)']);
  setObsVal('cond_compresor_obs', record['Cond: Compresor Obs']);
  setRadio('cond_aislamiento', record['Cond: Aislamiento Térmico Tuberías']);
  setObsVal('cond_aislamiento_obs', record['Cond: Aislamiento Obs']);
  setRadio('cond_fugas', record['Cond: Fugas Refrigerante / Aceite']);
  setObsVal('cond_fugas_obs', record['Cond: Fugas Obs']);
  setRadio('cond_soportes', record['Cond: Soportes y Anclajes']);
  setObsVal('cond_soportes_obs', record['Cond: Soportes Obs']);

  // Sección 3: Sistema Eléctrico
  setRadio('elec_bornes', record['Elec: Reajuste Bornes']);
  setObsVal('elec_bornes_obs', record['Elec: Bornes Obs']);
  setRadio('elec_capacitores', record['Elec: Capacitores Medición']);
  setObsVal('elec_cap_comp', record['Elec: Capacitor Comp (µF)']);
  setObsVal('elec_cap_vent', record['Elec: Capacitor Vent (µF)']);
  setObsVal('elec_capacitores_obs', record['Elec: Capacitores Obs']);
  setRadio('elec_tarjetas', record['Elec: Tarjetas PCB / Errores']);
  setObsVal('elec_tarjetas_obs', record['Elec: Tarjetas Obs']);
  setRadio('elec_protecciones', record['Elec: Protecciones Eléctricas']);
  setObsVal('elec_protecciones_obs', record['Elec: Protecciones Obs']);
  setRadio('elec_tierra', record['Elec: Conexión Tierra Física']);
  setObsVal('elec_tierra_obs', record['Elec: Tierra Obs']);

  // Cargar mediciones
  setVal('med_voltaje', record['Med: Voltaje (V AC)']);
  setVal('med_corriente_comp', record['Med: Corriente Compresor (A)']);
  setVal('med_corriente_vent', record['Med: Corriente Motor Ext (A)']);
  setVal('med_presion_baja', record['Med: Presión Baja (PSI)']);
  setVal('med_presion_alta', record['Med: Presión Alta (PSI)']);
  setVal('med_temp_inyeccion', record['Med: Temp Inyección (°C)']);
  setVal('med_temp_retorno', record['Med: Temp Retorno (°C)']);
  setVal('med_superheat', record['Med: Superheat / Subcooling']);
  setVal('med_control_remoto', record['Med: Control Remoto Estado']);
  setVal('observaciones_finales', record['Diagnóstico y Observaciones Finales']);

  setVal('nombre_tecnico_firma', record['Nombre Técnico']);
  setVal('nombre_cliente_firma', record['Nombre Cliente']);

  // Cargar firmas existentes en el lienzo si están presentes
  const drawSignatureToCanvas = (canvasId, dataUrl) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    canvas.dataset.existingDataUrl = dataUrl;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  };

  const firmaTechData = record['Firma Técnico (DataURL)'] || record['Firma Técnico'];
  const firmaClientData = record['Firma Cliente (DataURL)'] || record['Firma Cliente'];
  if (firmaTechData) drawSignatureToCanvas('canvas-tecnico', firmaTechData);
  if (firmaClientData) drawSignatureToCanvas('canvas-cliente', firmaClientData);

  // Recalcular Delta T
  const tempInjInput = document.getElementById('med_temp_inyeccion');
  if (tempInjInput) tempInjInput.dispatchEvent(new Event('input'));

  // Desactivar temporalmente la alerta de duplicado para permitir edición de la misma OT
  isOtDuplicate = false;
  const badge = document.getElementById('ot-validation-badge');
  if (badge) {
    badge.className = 'block text-[11px] font-medium mt-1 text-blue-600 font-semibold';
    badge.textContent = '✏️ Modo Edición / Revisión activo';
  }

  // Activar vista de formulario e indicador visual
  switchView('view-form');
  const banner = document.getElementById('edit-mode-banner');
  const otNameSpan = document.getElementById('edit-mode-ot-name');
  if (banner) banner.classList.remove('hidden');
  if (otNameSpan) otNameSpan.textContent = record['N° Orden / OT'] || 'OT Desconocida';

  // Scroll suave al inicio de la vista
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 9. Gestión de Clientes, Técnicos y Catálogo de Equipos (Google Sheets 100% Cloud + Soft-Delete)
 */
let clientsCache = [];
let techniciansCache = [];
let equipmentTypesCache = [];

async function fetchClients(silent = false) {
  try {
    const fetchUrl = GOOGLE_SCRIPT_URL + (GOOGLE_SCRIPT_URL.includes('?') ? '&' : '?') + 'action=clientes&_t=' + Date.now();
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      console.warn('Google Apps Script no devolvió un JSON de clientes válido (Página en redirección o actualización).');
      return;
    }
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      clientsCache = data;
      updateClientsUI();
    }
  } catch (err) {
    console.error('Error al cargar clientes desde Google Sheets:', err);
    const tbody = document.getElementById('clients-table-body');
    if (tbody && clientsCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-600 font-semibold bg-rose-50 border border-rose-100 rounded-lg">⚠️ Error al consultar los clientes desde Google Sheets. Por favor intente de nuevo.</td></tr>`;
    }
  }
}

async function fetchTechnicians(silent = false) {
  try {
    const fetchUrl = GOOGLE_SCRIPT_URL + (GOOGLE_SCRIPT_URL.includes('?') ? '&' : '?') + 'action=tecnicos&_t=' + Date.now();
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      console.warn('Google Apps Script no devolvió un JSON de técnicos válido (Página en redirección o actualización).');
      return;
    }
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      techniciansCache = data;
      updateTechniciansUI();
    }
  } catch (err) {
    console.error('Error al cargar técnicos desde Google Sheets:', err);
    const tbody = document.getElementById('technicians-table-body');
    if (tbody && techniciansCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-rose-600 font-semibold bg-rose-50 border border-rose-100 rounded-lg">⚠️ Error al consultar los técnicos desde Google Sheets. Por favor intente de nuevo.</td></tr>`;
    }
  }
}

async function fetchEquipmentTypes(silent = false) {
  try {
    const fetchUrl = GOOGLE_SCRIPT_URL + (GOOGLE_SCRIPT_URL.includes('?') ? '&' : '?') + 'action=equipos&_t=' + Date.now();
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      console.warn('Google Apps Script no devolvió un JSON de equipos válido (Página en redirección o actualización).');
      return;
    }
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      equipmentTypesCache = data;
      updateEquipmentTypesUI();
    }
  } catch (err) {
    console.error('Error al cargar catálogo de equipos desde Google Sheets:', err);
    const tbody = document.getElementById('equipments-table-body');
    if (tbody && equipmentTypesCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-rose-600 font-semibold bg-rose-50 border border-rose-100 rounded-lg">⚠️ Error al consultar el catálogo de equipos desde Google Sheets. Por favor intente de nuevo.</td></tr>`;
    }
  }
}

function initClientsAndTechniciansManagement() {
  const btnViewClients = document.getElementById('btn-view-clients');
  const modalClients = document.getElementById('modal-clients');
  const btnCloseClients = document.getElementById('btn-close-clients');
  const formAddClient = document.getElementById('form-add-client');
  const showInactiveClients = document.getElementById('show-inactive-clients');

  const btnViewTechnicians = document.getElementById('btn-view-technicians');
  const modalTechnicians = document.getElementById('modal-technicians');
  const btnCloseTechnicians = document.getElementById('btn-close-technicians');
  const formAddTechnician = document.getElementById('form-add-technician');
  const showInactiveTechnicians = document.getElementById('show-inactive-technicians');

  if (btnViewClients && modalClients) {
    btnViewClients.addEventListener('click', () => {
      modalClients.classList.remove('hidden');
      updateClientsUI();
      fetchClients(false);
    });
  }

  if (btnCloseClients) {
    btnCloseClients.addEventListener('click', () => modalClients.classList.add('hidden'));
  }

  if (showInactiveClients) {
    showInactiveClients.addEventListener('change', () => updateClientsUI());
  }

  const btnCancelClient = document.getElementById('btn-cancel-edit-client');
  if (btnCancelClient) btnCancelClient.addEventListener('click', window.resetClientEditForm);

  if (formAddClient) {
    formAddClient.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('edit-client-id').value;
      const name = document.getElementById('new-client-name').value.trim();
      const location = document.getElementById('new-client-location').value.trim();
      const phone = document.getElementById('new-client-phone').value.trim();
      const email = document.getElementById('new-client-email').value.trim();

      if (!name || !location) return;

      const isEdit = Boolean(editId);
      const payload = {
        action: isEdit ? 'edit_cliente' : 'add_cliente',
        id: editId,
        nombre: name,
        ubicacion: location,
        telefono: phone,
        correo: email,
        creador: currentUser ? currentUser.nombre : 'Sistema'
      };

      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify(payload)
        });
        window.resetClientEditForm();
        setTimeout(() => fetchClients(false), 1200);
      } catch (err) {
        console.error('Error al guardar cliente:', err);
      }
    });
  }

  if (btnViewTechnicians && modalTechnicians) {
    btnViewTechnicians.addEventListener('click', () => {
      modalTechnicians.classList.remove('hidden');
      updateTechniciansUI();
      fetchTechnicians(false);
    });
  }

  if (btnCloseTechnicians) {
    btnCloseTechnicians.addEventListener('click', () => modalTechnicians.classList.add('hidden'));
  }

  if (showInactiveTechnicians) {
    showInactiveTechnicians.addEventListener('change', () => updateTechniciansUI(false));
  }

  const btnCancelTech = document.getElementById('btn-cancel-edit-tech');
  if (btnCancelTech) btnCancelTech.addEventListener('click', window.resetTechnicianEditForm);

  if (formAddTechnician) {
    formAddTechnician.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('edit-tech-id').value;
      const name = document.getElementById('new-tech-name').value.trim();
      const cedula = document.getElementById('new-tech-cedula').value.trim();
      const phone = document.getElementById('new-tech-phone').value.trim();

      if (!name || !cedula) return;

      const isEdit = Boolean(editId);
      const payload = {
        action: isEdit ? 'edit_tecnico' : 'add_tecnico',
        id: editId,
        nombre: name,
        cedula: cedula,
        telefono: phone
      };

      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify(payload)
        });
        window.resetTechnicianEditForm();
        setTimeout(() => fetchTechnicians(false), 1200);
      } catch (err) {
        console.error('Error al guardar técnico:', err);
      }
    });
  }

  const clienteSelect = document.getElementById('cliente');
  if (clienteSelect) {
    clienteSelect.addEventListener('change', (e) => {
      if (e.target.value === '__NEW_CLIENT__') {
        e.target.value = '';
        if (modalClients) modalClients.classList.remove('hidden');
      }
    });
  }

  const tecnicoSelect = document.getElementById('tecnico');
  if (tecnicoSelect) {
    tecnicoSelect.addEventListener('change', (e) => {
      if (e.target.value === '__NEW_TECH__') {
        e.target.value = '';
        if (modalTechnicians) modalTechnicians.classList.remove('hidden');
      }
    });
  }

  fetchClients(true);
  fetchTechnicians(true);
}

window.startEditClient = function(id, nombre, ubicacion, telefono, correo) {
  document.getElementById('edit-client-id').value = id;
  document.getElementById('new-client-name').value = nombre === '--' ? '' : nombre;
  document.getElementById('new-client-location').value = ubicacion === '--' ? '' : ubicacion;
  document.getElementById('new-client-phone').value = telefono === '--' ? '' : telefono;
  document.getElementById('new-client-email').value = correo === '--' ? '' : correo;
  
  const submitBtn = document.getElementById('btn-submit-client');
  const cancelBtn = document.getElementById('btn-cancel-edit-client');
  if (submitBtn) submitBtn.textContent = '💾 Guardar Cambios';
  if (cancelBtn) cancelBtn.classList.remove('hidden');
};

window.resetClientEditForm = function() {
  document.getElementById('edit-client-id').value = '';
  document.getElementById('form-add-client').reset();
  const submitBtn = document.getElementById('btn-submit-client');
  const cancelBtn = document.getElementById('btn-cancel-edit-client');
  if (submitBtn) submitBtn.textContent = '➕ Registrar Cliente';
  if (cancelBtn) cancelBtn.classList.add('hidden');
};

window.startEditTechnician = function(id, nombre, cedula, telefono) {
  document.getElementById('edit-tech-id').value = id;
  document.getElementById('new-tech-name').value = nombre === '--' ? '' : nombre;
  document.getElementById('new-tech-cedula').value = cedula === '--' ? '' : cedula;
  document.getElementById('new-tech-phone').value = telefono === '--' ? '' : telefono;

  const submitBtn = document.getElementById('btn-submit-tech');
  const cancelBtn = document.getElementById('btn-cancel-edit-tech');
  if (submitBtn) submitBtn.textContent = '💾 Guardar Cambios';
  if (cancelBtn) cancelBtn.classList.remove('hidden');
};

window.resetTechnicianEditForm = function() {
  document.getElementById('edit-tech-id').value = '';
  document.getElementById('form-add-technician').reset();
  const submitBtn = document.getElementById('btn-submit-tech');
  const cancelBtn = document.getElementById('btn-cancel-edit-tech');
  if (submitBtn) submitBtn.textContent = '➕ Registrar Técnico';
  if (cancelBtn) cancelBtn.classList.add('hidden');
};

function isClientVisibleForUser(c, user) {
  if (!user || isUserAdmin(user)) return true;

  const creador = (c.Creador || c['Creador'] || c.creador || '').toString().trim();
  const uName = user.nombre;

  // 1. Si tiene creador explícito registrado
  if (creador) {
    if (matchTechnicianName(creador, 'Sistema') || matchTechnicianName(creador, 'Base') || matchTechnicianName(creador, 'Empresa')) {
      return true;
    }
    return matchTechnicianName(creador, uName);
  }

  // 2. Si no tiene creador explícito (registro antiguo o sin columna G):
  // ÚNICAMENTE mostrar si el técnico activo tiene historial registrado con este cliente
  const cliNombre = (c['Nombre / Empresa'] || c.nombre || '').toString().toLowerCase().trim();
  if (!cliNombre) return false;

  if (Array.isArray(historyDataCache) && historyDataCache.length > 0) {
    const hasUserHistory = historyDataCache.some(item => {
      const itemCli = (item['Cliente / Ubicación'] || '').toString().toLowerCase().trim();
      const itemTec = (item['Técnico Responsable'] || item['Nombre Técnico'] || '').toString();
      return itemCli.includes(cliNombre) && matchTechnicianName(itemTec, uName);
    });
    return hasUserHistory;
  }

  // Si no tiene creador del técnico actual y no hay historial verificado de él, ocultar por aislamiento de tenant
  return false;
}

function updateClientsUI() {
  const select = document.getElementById('cliente');
  const tbody = document.getElementById('clients-table-body');
  const showInactive = document.getElementById('show-inactive-clients')?.checked;

  const visibleClients = clientsCache.filter(c => isClientVisibleForUser(c, currentUser));

  if (select) {
    const currentVal = select.value;
    const activeClients = visibleClients.filter(c => (c.Estado || c['Estado'] || 'Activo') !== 'Inactivo');
    select.innerHTML = `<option value="" disabled ${!currentVal ? 'selected' : ''}>Seleccionar...</option>` +
      activeClients.map(c => {
        const nombre = c['Nombre / Empresa'] || c.nombre || '';
        const ubicacion = c['Ubicación / Dirección'] || c.ubicacion || '';
        const val = ubicacion && ubicacion !== 'Extraído de Historial' ? `${nombre} - ${ubicacion}` : nombre;
        return `<option value="${val}" ${currentVal === val ? 'selected' : ''}>${val}</option>`;
      }).join('') +
      `<option value="__NEW_CLIENT__" style="font-weight: bold; color: #2563eb;">➕ Registrar Nuevo Cliente...</option>`;
  }

  if (tbody) {
    const listToRender = showInactive ? visibleClients : visibleClients.filter(c => (c.Estado || c['Estado'] || 'Activo') !== 'Inactivo');
    if (listToRender.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400">No hay clientes registrados ${showInactive ? '' : 'activos'}.</td></tr>`;
      return;
    }
    tbody.innerHTML = listToRender.map(c => {
      const id = String(c.ID || c.id || '--');
      const nombre = String(c['Nombre / Empresa'] || c.nombre || '--');
      const ubicacion = String(c['Ubicación / Dirección'] || c.ubicacion || '--');
      const telefono = String(c['Teléfono'] || c.telefono || '--');
      const correo = String(c['Correo'] || c.correo || '--');
      const estado = String(c.Estado || c['Estado'] || 'Activo');
      const isInactive = estado === 'Inactivo';

      return `
        <!-- Desktop Row -->
        <tr class="hidden sm:table-row hover:bg-slate-50 border-b border-slate-100 ${isInactive ? 'bg-slate-50 opacity-60' : ''}">
          <td class="py-2 px-3 font-semibold text-slate-800">${nombre}</td>
          <td class="py-2 px-3 text-slate-600">${ubicacion}</td>
          <td class="py-2 px-3 text-slate-600">${telefono}</td>
          <td class="py-2 px-3 font-semibold ${isInactive ? 'text-rose-600' : 'text-emerald-600'}">${estado}</td>
          <td class="py-2 px-3 text-center">
            <div class="flex items-center justify-center gap-1">
              <button type="button" onclick="startEditClient('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${ubicacion.replace(/'/g, "\\'")}', '${telefono.replace(/'/g, "\\'")}', '${correo.replace(/'/g, "\\'")}')" class="px-2 py-1 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition">✏️ Editar</button>
              <button type="button" onclick="toggleClientSoftDelete('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${estado}')" class="px-2 py-1 text-[11px] font-semibold rounded ${isInactive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'} transition">${isInactive ? '🔄 Reactivar' : '🗑️ Desactivar'}</button>
            </div>
          </td>
        </tr>

        <!-- Mobile Card Row -->
        <tr class="sm:hidden border-b border-slate-200 ${isInactive ? 'bg-slate-50 opacity-60' : ''}">
          <td colspan="5" class="p-3">
            <details class="group">
              <summary class="flex items-center justify-between font-bold text-slate-800 cursor-pointer list-none select-none">
                <span class="text-xs">👥 ${nombre}</span>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold ${isInactive ? 'text-rose-600' : 'text-emerald-600'}">${estado}</span>
                  <span class="text-slate-400 group-open:rotate-180 transition-transform text-xs">▼</span>
                </div>
              </summary>
              <div class="mt-2.5 pt-2 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
                <p><strong>Ubicación:</strong> ${ubicacion}</p>
                <p><strong>Teléfono:</strong> ${telefono}</p>
                ${correo && correo !== '--' ? `<p><strong>Correo:</strong> ${correo}</p>` : ''}
                <div class="pt-2 flex items-center justify-end gap-2">
                  <button type="button" onclick="startEditClient('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${ubicacion.replace(/'/g, "\\'")}', '${telefono.replace(/'/g, "\\'")}', '${correo.replace(/'/g, "\\'")}')" class="px-3 py-1.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition">✏️ Editar</button>
                  <button type="button" onclick="toggleClientSoftDelete('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${estado}')" class="px-3 py-1.5 text-xs font-semibold rounded ${isInactive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'} transition">${isInactive ? '🔄 Reactivar' : '🗑️ Desactivar'}</button>
                </div>
              </div>
            </details>
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function toggleClientSoftDelete(id, nombre, currentStatus) {
  const isInactive = currentStatus === 'Inactivo';
  const actionText = isInactive ? 'activar' : 'desactivar';

  showConfirmModal({
    title: isInactive ? '¿Activar Cliente?' : '¿Desactivar Cliente?',
    message: `¿Estás seguro de que deseas ${actionText} al cliente "${nombre}"?`,
    icon: isInactive ? '🔄' : '🚫',
    acceptText: isInactive ? 'Sí, activar' : 'Sí, desactivar',
    btnClass: isInactive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700',
    onAccept: async () => {
      const payload = {
        action: 'toggle_cliente',
        id: id,
        nombre: nombre,
        estado: isInactive ? 'Activo' : 'Inactivo'
      };

      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify(payload)
        });
        setTimeout(() => fetchClients(false), 1200);
      } catch (err) {
        console.error('Error al cambiar estado de cliente:', err);
      }
    }
  });
}

function updateTechniciansUI() {
  const select = document.getElementById('tecnico');
  const tbody = document.getElementById('technicians-table-body');
  const showInactive = document.getElementById('show-inactive-technicians')?.checked;

  // Unificar técnicos de la pestaña 'Técnicos' y usuarios registrados con rol 'Técnico'
  let allTechsMap = new Map();

  (techniciansCache || []).forEach(t => {
    const name = (t['Nombre del Técnico'] || t.nombre || t.ID || '').toString().trim();
    if (name) {
      allTechsMap.set(name.toLowerCase(), {
        ID: t.ID || t.id || 'TEC-' + (allTechsMap.size + 1),
        'Nombre del Técnico': name,
        'Cédula / ID': t['Cédula / ID'] || t.cedula || '--',
        'Teléfono': t['Teléfono'] || t.telefono || '--',
        Estado: t.Estado || t['Estado'] || 'Activo'
      });
    }
  });

  (usersDataCache || []).forEach(u => {
    const role = (u.Rol || u.rol || 'Técnico').toString().trim();
    if (role === 'Técnico') {
      const name = (u['Nombre Usuario'] || u['Nombre del Técnico'] || u.nombre || '').toString().trim();
      if (name && !allTechsMap.has(name.toLowerCase())) {
        allTechsMap.set(name.toLowerCase(), {
          ID: u.ID || u.id || 'USR-TEC-' + (allTechsMap.size + 1),
          'Nombre del Técnico': name,
          'Cédula / ID': '--',
          'Teléfono': '--',
          Estado: u.Estado || u.estado || 'Activo'
        });
      }
    }
  });

  const mergedTechs = Array.from(allTechsMap.values());

  if (select) {
    if (currentUser && isUserTech(currentUser)) {
      // Si el usuario activo es Técnico, mostrar ÚNICAMENTE su propio nombre
      select.innerHTML = `<option value="${currentUser.nombre}" selected>${currentUser.nombre}</option>`;
      select.value = currentUser.nombre;
    } else {
      // Si es Administrador, mostrar todos los técnicos activos y la opción de registrar nuevo
      const activeTechs = mergedTechs.filter(t => (t.Estado || t['Estado'] || 'Activo') !== 'Inactivo');
      const currentVal = select.value;
      select.innerHTML = `<option value="" disabled ${!currentVal ? 'selected' : ''}>Seleccionar...</option>` +
        activeTechs.map(t => {
          const nombre = t['Nombre del Técnico'] || t.nombre || '';
          return `<option value="${nombre}" ${currentVal === nombre ? 'selected' : ''}>${nombre}</option>`;
        }).join('') +
        `<option value="__NEW_TECH__" style="font-weight: bold; color: #2563eb;">➕ Registrar Nuevo Técnico...</option>`;
    }
  }

  if (tbody) {
    const listToRender = showInactive ? mergedTechs : mergedTechs.filter(t => (t.Estado || t['Estado'] || 'Activo') !== 'Inactivo');
    if (listToRender.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400">No hay técnicos registrados ${showInactive ? '' : 'activos'}.</td></tr>`;
      return;
    }
    tbody.innerHTML = listToRender.map(t => {
      const id = String(t.ID || t.id || '--');
      const nombre = String(t['Nombre del Técnico'] || t.nombre || '--');
      const cedula = String(t['Cédula / ID'] || t.cedula || '--');
      const telefono = String(t['Teléfono'] || t.telefono || '--');
      const estado = String(t.Estado || t['Estado'] || 'Activo');
      const isInactive = estado === 'Inactivo';

      return `
        <!-- Desktop Row -->
        <tr class="hidden sm:table-row hover:bg-slate-50 border-b border-slate-100 ${isInactive ? 'bg-slate-50 opacity-60' : ''}">
          <td class="py-2 px-3 font-semibold text-slate-800">${nombre}</td>
          <td class="py-2 px-3 text-slate-600">${cedula}</td>
          <td class="py-2 px-3 text-slate-600">${telefono}</td>
          <td class="py-2 px-3 font-semibold ${isInactive ? 'text-rose-600' : 'text-emerald-600'}">${estado}</td>
          <td class="py-2 px-3 text-center">
            <div class="flex items-center justify-center gap-1">
              <button type="button" onclick="startEditTechnician('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${cedula.replace(/'/g, "\\'")}', '${telefono.replace(/'/g, "\\'")}')" class="px-2 py-1 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition">✏️ Editar</button>
              <button type="button" onclick="toggleTechnicianSoftDelete('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${estado}')" class="px-2 py-1 text-[11px] font-semibold rounded ${isInactive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'} transition">${isInactive ? '🔄 Reactivar' : '🗑️ Desactivar'}</button>
            </div>
          </td>
        </tr>

        <!-- Mobile Card Row -->
        <tr class="sm:hidden border-b border-slate-200 ${isInactive ? 'bg-slate-50 opacity-60' : ''}">
          <td colspan="5" class="p-3">
            <details class="group">
              <summary class="flex items-center justify-between font-bold text-slate-800 cursor-pointer list-none select-none">
                <span class="text-xs">👨‍🔧 ${nombre}</span>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold ${isInactive ? 'text-rose-600' : 'text-emerald-600'}">${estado}</span>
                  <span class="text-slate-400 group-open:rotate-180 transition-transform text-xs">▼</span>
                </div>
              </summary>
              <div class="mt-2.5 pt-2 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
                <p><strong>Cédula / ID:</strong> ${cedula}</p>
                <p><strong>Teléfono:</strong> ${telefono}</p>
                <div class="pt-2 flex items-center justify-end gap-2">
                  <button type="button" onclick="startEditTechnician('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${cedula.replace(/'/g, "\\'")}', '${telefono.replace(/'/g, "\\'")}')" class="px-3 py-1.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition">✏️ Editar</button>
                  <button type="button" onclick="toggleTechnicianSoftDelete('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${estado}')" class="px-3 py-1.5 text-xs font-semibold rounded ${isInactive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'} transition">${isInactive ? '🔄 Reactivar' : '🗑️ Desactivar'}</button>
                </div>
              </div>
            </details>
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function toggleTechnicianSoftDelete(id, nombre, currentStatus) {
  const isInactive = currentStatus === 'Inactivo';
  const actionText = isInactive ? 'activar' : 'desactivar';

  showConfirmModal({
    title: isInactive ? '¿Activar Técnico?' : '¿Desactivar Técnico?',
    message: `¿Estás seguro de que deseas ${actionText} al técnico "${nombre}"?`,
    icon: isInactive ? '🔄' : '🚫',
    acceptText: isInactive ? 'Sí, activar' : 'Sí, desactivar',
    btnClass: isInactive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700',
    onAccept: async () => {
      const payload = {
        action: 'toggle_tecnico',
        id: id,
        nombre: nombre,
        estado: isInactive ? 'Activo' : 'Inactivo'
      };

      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify(payload)
        });
        setTimeout(() => fetchTechnicians(false), 1200);
      } catch (err) {
        console.error('Error al cambiar estado de técnico:', err);
      }
    }
  });
}

/**
 * 10. Gestión del Catálogo de Equipos "Otros" (Soft-Delete + Google Sheets)
 */
function toggleEquipmentTypeSections(val) {
  const containerSubtipo = document.getElementById('container-subtipo-equipo');
  const containerRefrigerante = document.getElementById('container-refrigerante');
  const subtipoSelect = document.getElementById('subtipoEquipo');
  const refrigeranteSelect = document.getElementById('refrigerante');
  const sEvap = document.getElementById('section-evaporadora');
  const sCond = document.getElementById('section-condensadora');
  const sElec = document.getElementById('section-electrico');
  const sMed = document.getElementById('section-mediciones');

  const isOtro = (val || '').toString().trim() === 'Otro';

  if (isOtro) {
    if (containerSubtipo) containerSubtipo.classList.remove('hidden');
    if (containerRefrigerante) containerRefrigerante.classList.add('hidden');
    if (refrigeranteSelect) refrigeranteSelect.value = '';
    if (sEvap) sEvap.classList.add('hidden');
    if (sCond) sCond.classList.add('hidden');
    if (sElec) sElec.classList.add('hidden');
    if (sMed) sMed.classList.add('hidden');
    if (typeof fetchEquipmentTypes === 'function') fetchEquipmentTypes(true);
  } else {
    if (containerSubtipo) containerSubtipo.classList.add('hidden');
    if (subtipoSelect) subtipoSelect.value = '';
    if (containerRefrigerante) containerRefrigerante.classList.remove('hidden');
    if (sEvap) sEvap.classList.remove('hidden');
    if (sCond) sCond.classList.remove('hidden');
    if (sElec) sElec.classList.remove('hidden');
    if (sMed) sMed.classList.remove('hidden');
  }
}

function initEquipmentManagement() {
  const tipoUnidadSelect = document.getElementById('tipoUnidad');
  const containerSubtipo = document.getElementById('container-subtipo-equipo');
  const containerRefrigerante = document.getElementById('container-refrigerante');
  const subtipoSelect = document.getElementById('subtipoEquipo');
  const refrigeranteSelect = document.getElementById('refrigerante');
  const btnManage = document.getElementById('btn-manage-equipment-types');
  const modalEquipments = document.getElementById('modal-equipment-types');
  const btnCloseEquipments = document.getElementById('btn-close-equipment-types');
  const formAddEquipment = document.getElementById('form-add-equipment-type');
  const showInactiveEquipments = document.getElementById('show-inactive-equipments');

  if (tipoUnidadSelect) {
    tipoUnidadSelect.addEventListener('change', (e) => {
      toggleEquipmentTypeSections(e.target.value);
    });
  }

  if (subtipoSelect) {
    subtipoSelect.addEventListener('change', (e) => {
      if (e.target.value === '__MANAGE_EQUIPMENT__') {
        e.target.value = '';
        if (modalEquipments) {
          modalEquipments.classList.remove('hidden');
          updateEquipmentTypesUI();
          fetchEquipmentTypes(false);
        }
      }
    });
  }

  const btnViewEquipments = document.getElementById('btn-view-equipments');
  if (btnViewEquipments && modalEquipments) {
    btnViewEquipments.addEventListener('click', () => {
      modalEquipments.classList.remove('hidden');
      updateEquipmentTypesUI();
      fetchEquipmentTypes(false);
    });
  }

  if (btnManage && modalEquipments) {
    btnManage.addEventListener('click', () => {
      modalEquipments.classList.remove('hidden');
      updateEquipmentTypesUI();
      fetchEquipmentTypes(false);
    });
  }

  if (btnCloseEquipments) {
    btnCloseEquipments.addEventListener('click', () => modalEquipments.classList.add('hidden'));
  }

  if (showInactiveEquipments) {
    showInactiveEquipments.addEventListener('change', () => updateEquipmentTypesUI());
  }

  const btnCancelEquip = document.getElementById('btn-cancel-edit-equipment');
  if (btnCancelEquip) btnCancelEquip.addEventListener('click', window.resetEquipmentEditForm);

  if (formAddEquipment) {
    formAddEquipment.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('edit-equipment-id').value;
      const name = document.getElementById('new-equipment-name').value.trim();
      const desc = document.getElementById('new-equipment-desc').value.trim();

      if (!name) return;

      const isEdit = Boolean(editId);
      const payload = {
        action: isEdit ? 'edit_equipo' : 'add_equipo',
        id: editId,
        nombre: name,
        descripcion: desc,
        creador: currentUser ? currentUser.nombre : 'Sistema'
      };

      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify(payload)
        });
        window.resetEquipmentEditForm();
        setTimeout(() => fetchEquipmentTypes(false), 1200);
      } catch (err) {
        console.error('Error al guardar tipo de equipo:', err);
      }
    });
  }

  fetchEquipmentTypes(true);
}

window.startEditEquipment = function(id, nombre, desc) {
  document.getElementById('edit-equipment-id').value = id;
  document.getElementById('new-equipment-name').value = nombre === '--' ? '' : nombre;
  document.getElementById('new-equipment-desc').value = desc === '--' ? '' : desc;

  const submitBtn = document.getElementById('btn-submit-equipment');
  const cancelBtn = document.getElementById('btn-cancel-edit-equipment');
  if (submitBtn) submitBtn.textContent = '💾 Guardar Cambios';
  if (cancelBtn) cancelBtn.classList.remove('hidden');
};

window.resetEquipmentEditForm = function() {
  document.getElementById('edit-equipment-id').value = '';
  document.getElementById('form-add-equipment-type').reset();
  const submitBtn = document.getElementById('btn-submit-equipment');
  const cancelBtn = document.getElementById('btn-cancel-edit-equipment');
  if (submitBtn) submitBtn.textContent = '➕ Agregar al Catálogo';
  if (cancelBtn) cancelBtn.classList.add('hidden');
};

function updateEquipmentTypesUI() {
  const select = document.getElementById('subtipoEquipo');
  const tbody = document.getElementById('equipments-table-body');
  const showInactive = document.getElementById('show-inactive-equipments')?.checked;

  const isTech = currentUser && currentUser.rol === 'Técnico';
  const uName = currentUser ? (currentUser.nombre || '').toLowerCase().trim() : '';

  // Filtrar equipos visibles según aislamiento por usuario:
  // - Base / Sistema: Visibles para todos los usuarios.
  // - Creados por Técnico: Visibles sólo para el Técnico creador (y Administrador).
  const visibleEquipments = equipmentTypesCache.filter(eq => {
    const creador = (eq.Creador || eq['Creador'] || eq.creador || eq[''] || 'Sistema').toString().toLowerCase().trim();
    const isBase = !creador || creador === 'sistema' || creador === 'base';

    if (!currentUser || currentUser.rol === 'Administrador') {
      return true; // Administrador ve todo el catálogo
    }

    return isBase || creador === uName;
  });

  if (select) {
    const currentVal = select.value;
    const activeEquipments = visibleEquipments.filter(eq => (eq.Estado || eq['Estado'] || 'Activo') !== 'Inactivo');
    select.innerHTML = `<option value="" disabled ${!currentVal ? 'selected' : ''}>Seleccionar Subtipo...</option>` +
      activeEquipments.map(eq => {
        const nombre = eq['Nombre Categoría'] || eq.nombre || '';
        return `<option value="${nombre}" ${currentVal === nombre ? 'selected' : ''}>${nombre}</option>`;
      }).join('') +
      `<option value="__MANAGE_EQUIPMENT__" style="font-weight: bold; color: #2563eb;">➕ Agregar / Gestionar Catálogo...</option>`;
  }

  if (tbody) {
    const listToRender = showInactive ? visibleEquipments : visibleEquipments.filter(eq => (eq.Estado || eq['Estado'] || 'Activo') !== 'Inactivo');
    if (listToRender.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-400">No hay categorías registradas ${showInactive ? '' : 'activas'}.</td></tr>`;
      return;
    }
    tbody.innerHTML = listToRender.map(eq => {
      const id = String(eq.ID || eq.id || '--');
      const nombre = String(eq['Nombre Categoría'] || eq.nombre || '--');
      const desc = String(eq['Descripción / Ejemplo'] || eq.descripcion || '--');
      const estado = String(eq.Estado || eq['Estado'] || 'Activo');
      const creador = String(eq.Creador || eq['Creador'] || eq.creador || eq[''] || 'Sistema');
      const isBase = !creador || creador.toLowerCase().trim() === 'sistema' || creador.toLowerCase().trim() === 'base';
      const isInactive = estado === 'Inactivo';

      // Inmutabilidad: Si es equipo Base y el usuario es Técnico, NO puede editar ni desactivar.
      const canEdit = !isTech || (!isBase && creador.toLowerCase().trim() === uName);

      let actionButtons = '';
      if (canEdit) {
        actionButtons = `
          <button type="button" onclick="startEditEquipment('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${desc.replace(/'/g, "\\'")}')" class="px-2 py-1 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition">
            ✏️ Editar
          </button>
          <button type="button" onclick="toggleEquipmentSoftDelete('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${estado}')" class="px-2 py-1 text-[11px] font-semibold rounded ${isInactive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'} transition">
            ${isInactive ? '🔄 Reactivar' : '🗑️ Desactivar'}
          </button>
        `;
      } else {
        actionButtons = `<span class="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Los equipos base solo los puede editar el Administrador">🔒 Base Inmutable</span>`;
      }

      return `
        <!-- Desktop Row -->
        <tr class="hidden sm:table-row hover:bg-slate-50 border-b border-slate-100 ${isInactive ? 'bg-slate-50 opacity-60' : ''}">
          <td class="py-2 px-3 font-semibold text-slate-800 flex items-center gap-1.5">${nombre} ${isBase ? '<span class="text-[9.5px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">Base</span>' : '<span class="text-[9.5px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">Personalizado</span>'}</td>
          <td class="py-2 px-3 text-slate-600">${desc}</td>
          <td class="py-2 px-3 font-semibold ${isInactive ? 'text-rose-600' : 'text-emerald-600'}">${estado}</td>
          <td class="py-2 px-3 text-center">
            <div class="flex items-center justify-center gap-1">
              ${actionButtons}
            </div>
          </td>
        </tr>

        <!-- Mobile Card Row -->
        <tr class="sm:hidden border-b border-slate-200 ${isInactive ? 'bg-slate-50 opacity-60' : ''}">
          <td colspan="4" class="p-3">
            <details class="group">
              <summary class="flex items-center justify-between font-bold text-slate-800 cursor-pointer list-none select-none">
                <div class="flex items-center gap-1.5 text-xs">
                  <span>⚙️ ${nombre}</span>
                  ${isBase ? '<span class="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">Base</span>' : '<span class="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">Personalizado</span>'}
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold ${isInactive ? 'text-rose-600' : 'text-emerald-600'}">${estado}</span>
                  <span class="text-slate-400 group-open:rotate-180 transition-transform text-xs">▼</span>
                </div>
              </summary>
              <div class="mt-2.5 pt-2 border-t border-slate-100 text-xs space-y-2 text-slate-600">
                <p><strong>Descripción:</strong> ${desc}</p>
                <div class="pt-1 flex items-center justify-end gap-2">
                  ${actionButtons}
                </div>
              </div>
            </details>
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function toggleEquipmentSoftDelete(id, nombre, currentStatus) {
  const isInactive = currentStatus === 'Inactivo';
  const actionText = isInactive ? 'activar' : 'desactivar';

  showConfirmModal({
    title: isInactive ? '¿Activar Tipo de Equipo?' : '¿Desactivar Tipo de Equipo?',
    message: `¿Estás seguro de que deseas ${actionText} la categoría "${nombre}"?`,
    icon: isInactive ? '🔄' : '🚫',
    acceptText: isInactive ? 'Sí, activar' : 'Sí, desactivar',
    btnClass: isInactive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700',
    onAccept: async () => {
      const payload = {
        action: 'toggle_equipo',
        id: id,
        estado: isInactive ? 'Activo' : 'Inactivo'
      };

      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify(payload)
        });
        setTimeout(() => fetchEquipmentTypes(false), 1200);
      } catch (err) {
        console.error('Error al cambiar estado de categoría de equipo:', err);
      }
    }
  });
}

function initMobileMenu() {
  const btnMobileMenu = document.getElementById('btn-mobile-menu');
  const mobileMenu = document.getElementById('mobile-dropdown-menu');

  if (btnMobileMenu && mobileMenu) {
    btnMobileMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && !btnMobileMenu.contains(e.target)) {
        mobileMenu.classList.add('hidden');
      }
    });
  }

  const btnCatalogues = document.getElementById('btn-catalogues-dropdown');
  const cataloguesMenu = document.getElementById('catalogues-menu');
  if (btnCatalogues && cataloguesMenu) {
    btnCatalogues.addEventListener('click', (e) => {
      e.stopPropagation();
      cataloguesMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!cataloguesMenu.contains(e.target) && !btnCatalogues.contains(e.target)) {
        cataloguesMenu.classList.add('hidden');
      }
    });

    cataloguesMenu.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => cataloguesMenu.classList.add('hidden'));
    });
  }

  const btnSecurity = document.getElementById('btn-security-dropdown');
  const securityMenu = document.getElementById('security-menu');
  if (btnSecurity && securityMenu) {
    btnSecurity.addEventListener('click', (e) => {
      e.stopPropagation();
      securityMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!securityMenu.contains(e.target) && !btnSecurity.contains(e.target)) {
        securityMenu.classList.add('hidden');
      }
    });

    securityMenu.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => securityMenu.classList.add('hidden'));
    });
  }

  // Vincular botones del menú desplegable móvil
  const mobileNavHome = document.getElementById('btn-mobile-nav-home');
  const mobileClients = document.getElementById('btn-mobile-clients');
  const mobileTechs = document.getElementById('btn-mobile-technicians');
  const mobileEquip = document.getElementById('btn-mobile-equipments');
  const mobileBiometric = document.getElementById('btn-mobile-biometric');
  const mobileHistory = document.getElementById('btn-mobile-history');
  const mobileLogout = document.getElementById('btn-mobile-logout');

  if (mobileNavHome) {
    mobileNavHome.addEventListener('click', () => {
      if (mobileMenu) mobileMenu.classList.add('hidden');
      switchView('view-dashboard');
    });
  }

  if (mobileClients) {
    mobileClients.addEventListener('click', () => {
      if (mobileMenu) mobileMenu.classList.add('hidden');
      openModal('modal-clients');
      if (typeof fetchClients === 'function') fetchClients(false);
    });
  }

  if (mobileTechs) {
    mobileTechs.addEventListener('click', () => {
      if (mobileMenu) mobileMenu.classList.add('hidden');
      openModal('modal-technicians');
      if (typeof fetchTechnicians === 'function') fetchTechnicians(false);
    });
  }

  if (mobileEquip) {
    mobileEquip.addEventListener('click', () => {
      if (mobileMenu) mobileMenu.classList.add('hidden');
      openModal('modal-equipment-types');
      if (typeof updateEquipmentTypesUI === 'function') updateEquipmentTypesUI();
      if (typeof fetchEquipmentTypes === 'function') fetchEquipmentTypes(false);
    });
  }

  if (mobileBiometric) {
    mobileBiometric.addEventListener('click', () => {
      if (mobileMenu) mobileMenu.classList.add('hidden');
      const btnReg = document.getElementById('btn-register-biometric');
      if (btnReg) btnReg.click();
    });
  }

  if (mobileHistory) {
    mobileHistory.addEventListener('click', () => {
      if (mobileMenu) mobileMenu.classList.add('hidden');
      openModal('modal-history');
      fetchHistoryData();
    });
  }

  if (mobileLogout) {
    mobileLogout.addEventListener('click', () => {
      if (mobileMenu) mobileMenu.classList.add('hidden');
      logoutUser();
    });
  }
}

function initChangeOwnPinModal() {
  const btnOpenDesktop = document.getElementById('btn-open-change-pin');
  const btnOpenMobile = document.getElementById('btn-mobile-change-pin');
  const modal = document.getElementById('modal-change-pin');
  const btnCloseX = document.getElementById('btn-close-change-pin-x');
  const btnCancel = document.getElementById('btn-cancel-change-pin');
  const form = document.getElementById('form-change-own-pin');
  const errorText = document.getElementById('change-pin-error-text');

  const openModalHandler = (e) => {
    if (e) e.stopPropagation();
    const modalEl = document.getElementById('modal-change-pin');
    if (modalEl) {
      if (form) form.reset();
      if (errorText) {
        errorText.textContent = '';
        errorText.classList.add('hidden');
      }
      modalEl.classList.remove('hidden');
    }
  };

  const closeModalHandler = () => {
    const modalEl = document.getElementById('modal-change-pin');
    if (modalEl) modalEl.classList.add('hidden');
  };

  if (btnOpenDesktop) btnOpenDesktop.addEventListener('click', openModalHandler);
  if (btnOpenMobile) btnOpenMobile.addEventListener('click', openModalHandler);
  if (btnCloseX) btnCloseX.addEventListener('click', closeModalHandler);
  if (btnCancel) btnCancel.addEventListener('click', closeModalHandler);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentUser) return;
      const currentPin = (document.getElementById('change-pin-current')?.value || '').trim();
      const newPin = (document.getElementById('change-pin-new')?.value || '').trim();
      const confirmPin = (document.getElementById('change-pin-confirm')?.value || '').trim();

      const showError = (msg) => {
        if (errorText) {
          errorText.textContent = msg;
          errorText.classList.remove('hidden');
        }
      };

      if (!currentPin || !newPin || !confirmPin) {
        showError('Por favor completa todos los campos.');
        return;
      }

      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        showError('El nuevo PIN debe contener exactamente 4 dígitos numéricos.');
        return;
      }

      if (newPin !== confirmPin) {
        showError('El nuevo PIN y su confirmación no coinciden.');
        return;
      }

      const select = document.getElementById('login-user-select');
      const opt = select ? Array.from(select.options).find(o => o.value === currentUser.id) : null;
      const expectedPin = opt ? String(opt.dataset.pin || '1234').trim() : '';

      if (expectedPin && currentPin !== expectedPin) {
        showError('El PIN actual es incorrecto.');
        return;
      }

      const submitBtn = document.getElementById('btn-submit-change-pin');
      if (submitBtn) submitBtn.disabled = true;

      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'change_own_pin',
            userId: currentUser.id,
            id: currentUser.id,
            newPin: newPin
          })
        });

        if (opt) opt.dataset.pin = newPin;

        // Actualizar en el estado global y caché local
        if (Array.isArray(usersDataCache)) {
          usersDataCache.forEach(u => {
            const uId = String(u.ID || u.id || '');
            if (uId === currentUser.id || u.nombre === currentUser.nombre) {
              u.PIN = newPin;
              u.pin = newPin;
            }
          });
          try {
            localStorage.setItem('app_users_custom_v1', JSON.stringify(usersDataCache));
          } catch (e) {}
        }

        if (currentUser) {
          currentUser.pin = newPin;
          currentUser.PIN = newPin;
          try {
            localStorage.setItem('session_user', JSON.stringify(currentUser));
          } catch (e) {}
        }

        populateUserSelect(usersDataCache);
        closeModalHandler();
        showAlertModal('✅ ¡Tu PIN de acceso ha sido actualizado exitosamente!', 'PIN Actualizado', '🔑');
      } catch (err) {
        showError('Ocurrió un error al actualizar el PIN. Intenta nuevamente.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}
