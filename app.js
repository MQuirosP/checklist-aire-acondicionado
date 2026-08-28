/**
 * CHECKLIST MANTENIMIENTO PREVENTIVO - AIRE ACONDICIONADO
 * Lógica JavaScript Interactiva, Canvas de Firmas y Persistencia en Google Sheets
 */

// URL configurada de la Aplicación Web de Google Apps Script vinculada a la Hoja
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz0FPAiw8vWelX2AhwoBM0tMdgbFpwcwd0AKXO7Z5b8JzA5_-Pk3VIk66Z1LrBNsDIO/exec';

document.addEventListener('DOMContentLoaded', () => {
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
});

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
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    function startDrawing(e) {
      isDrawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      e.preventDefault();
    }

    function draw(e) {
      if (!isDrawing) return;
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
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        triggerDraftSave();
      }
    });
  });
}

/**
 * 5. Guardado de borrador en LocalStorage
 */
const STORAGE_KEY = 'checklist_ac_draft';

function updateDraftButtonState() {
  const btnText = document.getElementById('btn-draft-text');
  const btnMobileText = document.getElementById('btn-mobile-draft-text');
  const saved = localStorage.getItem(STORAGE_KEY);
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
  if (!form) return;
  const formData = new FormData(form);
  const data = {};

  formData.forEach((val, key) => {
    data[key] = val;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  updateDraftButtonState();
}

function loadDraft() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    const form = document.getElementById('checklist-form');

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

function resetFormComplete() {
  const form = document.getElementById('checklist-form');
  if (form) form.reset();
  localStorage.removeItem(STORAGE_KEY);
  updateDraftButtonState();

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

  const containerSubtipo = document.getElementById('container-subtipo-equipo');
  if (containerSubtipo) containerSubtipo.classList.add('hidden');
  const subtipoSelect = document.getElementById('subtipoEquipo');
  if (subtipoSelect) subtipoSelect.value = '';

  // Limpiar lienzos de firmas
  ['canvas-tecnico', 'canvas-cliente'].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) {
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
      if (confirm('🧹 ¿Estás seguro de que deseas limpiar todo el formulario y las firmas?')) {
        resetFormComplete();
      }
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

  form.addEventListener('submit', (e) => {
    const otInput = document.getElementById('ot');
    const clienteInput = document.getElementById('cliente');

    // Validar Unicidad de OT antes de enviar
    if (isOtDuplicate) {
      e.preventDefault();
      alert(`⚠️ ERROR DE UNICIDAD: La Orden de Trabajo / OT "${otInput.value}" ya existe en el sistema. Por favor genera o ingresa un número de OT único.`);
      otInput.focus();
      return;
    }

    // Validar URL de Google Script
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PEGA_AQUI_TU_URL')) {
      e.preventDefault();
      alert('⚠️ ATENCIÓN: Debes configurar la URL de tu Google Apps Script en el archivo app.js (constante GOOGLE_SCRIPT_URL). Consulta el README.md para ver las instrucciones paso a paso.');
      return;
    }

    // Inyectar o actualizar firmas en campos ocultos del formulario antes del submit
    const canvasTecnico = document.getElementById('canvas-tecnico');
    const canvasCliente = document.getElementById('canvas-cliente');

    setHiddenInput(form, 'firma_tecnico', (canvasTecnico && !isCanvasBlank(canvasTecnico)) ? canvasTecnico.toDataURL('image/png') : '');
    setHiddenInput(form, 'firma_cliente', (canvasCliente && !isCanvasBlank(canvasCliente)) ? canvasCliente.toDataURL('image/png') : '');

    // Configurar el formulario para enviar al iframe oculto (Garantiza 0 bloqueos de CORS)
    form.action = GOOGLE_SCRIPT_URL;
    form.method = 'POST';
    form.target = 'hidden_iframe';

    // Mostrar modal en estado de Carga
    modal.classList.remove('hidden');
    modalLoading.classList.remove('hidden');
    modalSuccess.classList.add('hidden');
    modalError.classList.add('hidden');

    let submitted = false;
    const iframe = document.getElementById('hidden_iframe');

    const handleSuccess = () => {
      if (submitted) return;
      submitted = true;
      modalLoading.classList.add('hidden');
      modalSuccess.classList.remove('hidden');

      // Actualizar resumen en el modal
      const summaryOt = document.getElementById('summary-ot');
      const summaryCliente = document.getElementById('summary-cliente');
      if (summaryOt) summaryOt.textContent = otInput ? (otInput.value || '--') : '--';
      if (summaryCliente) summaryCliente.textContent = clienteInput ? (clienteInput.value || '--') : '--';

      // Limpiar formulario y borrador tras envío exitoso
      resetFormComplete();

      // Refrescar datos de historial en segundo plano
      fetchHistoryData(true);
    };

    if (iframe) {
      iframe.onload = handleSuccess;
    }

    // Timer de seguridad para mostrar éxito tras el procesamiento
    setTimeout(handleSuccess, 3000);
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
    const data = await res.json();

    historyDataCache = Array.isArray(data) ? data : [];

    if (typeof updateClientsUI === 'function') updateClientsUI(true);
    if (typeof updateTechniciansUI === 'function') updateTechniciansUI(true);

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
    historyDataCache = [];
    if (!silent && loading) {
      loading.classList.add('hidden');
      if (container) container.classList.add('hidden');
      if (empty) empty.classList.remove('hidden');
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
    badge.textContent = '⚠️ Esta OT ya fue registrada previamente';
    otInput.classList.add('border-rose-500');
    otInput.classList.remove('border-emerald-500');
  } else {
    isOtDuplicate = false;
    badge.className = 'block text-[11px] font-medium mt-1 text-emerald-600 font-semibold';
    badge.textContent = '✓ N° de Orden / OT disponible';
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

    // Descartar filas vacías o cuyas celdas fueron borradas en Google Sheets
    if (!ot && !cliente) return false;

    if (!q) return true;
    const tecnico = (item['Técnico Responsable'] || '').toString().toLowerCase();
    const fecha = (item['Fecha Inspección'] || '').toString().toLowerCase();
    return ot.toLowerCase().includes(q) || cliente.toLowerCase().includes(q) || tecnico.includes(q) || fecha.includes(q);
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
      <td class="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">${fechaFormatted}</td>
      <td class="py-2.5 px-3 font-bold text-blue-600 whitespace-nowrap">${item['N° Orden / OT'] || '--'}</td>
      <td class="py-2.5 px-3 text-slate-800">${item['Cliente / Ubicación'] || '--'}</td>
      <td class="py-2.5 px-3 text-slate-600">${item['Técnico Responsable'] || '--'}</td>
      <td class="py-2.5 px-3 text-slate-600">${item['Tipo de Unidad'] || ''} ${item['Marca / Modelo'] || ''}</td>
      <td class="py-2.5 px-3 text-slate-600">${item['Refrigerante'] || '--'}</td>
      <td class="py-2.5 px-3 font-semibold text-emerald-600 whitespace-nowrap">${item['Med: Delta T (°C)'] ? item['Med: Delta T (°C)'] + ' °C' : '--'}</td>
      <td class="py-2.5 px-3 text-center whitespace-nowrap">
        <button type="button" class="btn-view-detail-row px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-medium text-[11px] transition inline-flex items-center gap-1 shadow-sm" data-index="${index}">
          👁️ Ver / Editar
        </button>
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
    { label: 'Evap: Gabinete Externo', key: 'Evap: Gabinete Externo' },
    { label: 'Evap: Filtros de Aire', key: 'Evap: Filtros Aire' },
    { label: 'Evap: Serpentín Evap.', key: 'Evap: Serpentín Evaporador' },
    { label: 'Evap: Bandeja / Biocidas', key: 'Evap: Bandeja Condensados / Biocidas' },
    { label: 'Evap: Limpieza Drenaje', key: 'Evap: Drenaje Obstrucciones' },
    { label: 'Evap: Turbina / Fan', key: 'Evap: Turbina / Fan Tangencial' },
    { label: 'Evap: Motor / Rodajes', key: 'Evap: Motor Vent / Rodajes' },
    { label: 'Evap: Persianas Swing', key: 'Evap: Persianas Swing / Motor paso' },
    { label: 'Evap: Conexiones Elec.', key: 'Evap: Conexiones Eléctricas / Termistores' },
    { label: 'Cond: Serpentín Cond.', key: 'Cond: Serpentín Condensador' },
    { label: 'Cond: Aletas Aluminio', key: 'Cond: Aletas Aluminio' },
    { label: 'Cond: Aspas Ventilador', key: 'Cond: Aspas Ventilador' },
    { label: 'Cond: Motor / Rodamientos', key: 'Cond: Motor Vent / Rodamientos' },
    { label: 'Cond: Compresor (Ruido)', key: 'Cond: Compresor (Ruido/Amortiguadores)' },
    { label: 'Cond: Aislamiento Térmico', key: 'Cond: Aislamiento Térmico Tuberías' },
    { label: 'Cond: Fugas Ref./Aceite', key: 'Cond: Fugas Refrigerante / Aceite' },
    { label: 'Cond: Soportes y Anclajes', key: 'Cond: Soportes y Anclajes' },
    { label: 'Elec: Reajuste Bornes', key: 'Elec: Reajuste Bornes' },
    { label: 'Elec: Capacitores', key: 'Elec: Capacitores Medición' },
    { label: 'Elec: Tarjetas PCB / Err', key: 'Elec: Tarjetas PCB / Errores' },
    { label: 'Elec: Protecciones Elec.', key: 'Elec: Protecciones Eléctricas' },
    { label: 'Elec: Tierra Física', key: 'Elec: Conexión Tierra Física' }
  ];

  // Helper para renderizar pill de inspección compacto de 1 sola línea (4 columnas)
  const renderItemPill = (item) => {
    const val = record[item.key] || '--';
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-300';
    if (val === 'B') colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (val === 'R') colorClass = 'bg-amber-100 text-amber-800 border-amber-300';
    if (val === 'M') colorClass = 'bg-rose-100 text-rose-800 border-rose-300';
    if (val === 'N/A') colorClass = 'bg-slate-100 text-slate-500 border-slate-200';
    return `<div class="p-1 px-1.5 bg-slate-50 border border-slate-200 rounded text-[9.5px] flex items-center justify-between gap-1 leading-none">
      <span class="text-slate-700 font-semibold truncate mr-0.5">${item.label}</span>
      <span class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border shrink-0 ${colorClass}">${val}</span>
    </div>`;
  };

  const fechaVal = formatLocalDate(record['Fecha Inspección'] || record['Fecha / Hora Registro']);
  const tipoMant = getVal('Tipo de Mantenimiento') !== '--' ? getVal('Tipo de Mantenimiento') : 'Preventivo';

  // Saneamiento de firmas en caso de registros con desplazamiento previo de columnas
  let rawTecNombre = record['Nombre Técnico'] || getVal('Técnico Responsable');
  let rawTecFirma = record['Firma Técnico (DataURL)'] || '';
  if (rawTecNombre && rawTecNombre.startsWith('data:image')) {
    rawTecFirma = rawTecNombre;
    rawTecNombre = getVal('Técnico Responsable');
  }

  let rawCliNombre = record['Nombre Cliente'] || getVal('Cliente / Ubicación');
  let rawCliFirma = record['Firma Cliente (DataURL)'] || '';
  if (rawCliNombre && rawCliNombre.startsWith('data:image')) {
    rawCliFirma = rawCliNombre;
    rawCliNombre = getVal('Cliente / Ubicación');
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
          <span class="text-xs font-bold text-blue-600">Orden / OT: ${getVal('N° Orden / OT')}</span>
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
}

function loadRecordIntoForm(record) {
  const form = document.getElementById('checklist-form');
  if (!form || !record) return;

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

  setVal('fecha', record['Fecha Inspección']);
  setVal('ot', record['N° Orden / OT']);
  setSelectVal('tipoMantenimiento', record['Tipo de Mantenimiento'] || 'Preventivo');
  setSelectVal('cliente', record['Cliente / Ubicación']);
  setSelectVal('tecnico', record['Técnico Responsable']);
  setSelectVal('tipoUnidad', record['Tipo de Unidad']);
  const containerSubtipo = document.getElementById('container-subtipo-equipo');
  const containerRefrigerante = document.getElementById('container-refrigerante');
  if (record['Tipo de Unidad'] === 'Otro') {
    if (containerSubtipo) containerSubtipo.classList.remove('hidden');
    if (containerRefrigerante) containerRefrigerante.classList.add('hidden');
    setSelectVal('subtipoEquipo', record['Subtipo / Categoría Equipo']);
  } else {
    if (containerSubtipo) containerSubtipo.classList.add('hidden');
    if (containerRefrigerante) containerRefrigerante.classList.remove('hidden');
    setSelectVal('refrigerante', record['Refrigerante']);
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

  // Scroll suave al formulario
  form.scrollIntoView({ behavior: 'smooth' });

  alert(`✏️ Se cargaron absolutamente todos los datos detallados de la Orden "${record['N° Orden / OT']}" en el formulario.`);
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
    const data = await res.json();
    clientsCache = Array.isArray(data) ? data : [];
    updateClientsUI();
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
    const data = await res.json();
    techniciansCache = Array.isArray(data) ? data : [];
    updateTechniciansUI();
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
    const data = await res.json();
    equipmentTypesCache = Array.isArray(data) ? data : [];
    updateEquipmentTypesUI();
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
        correo: email
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

function updateClientsUI() {
  const select = document.getElementById('cliente');
  const tbody = document.getElementById('clients-table-body');
  const showInactive = document.getElementById('show-inactive-clients')?.checked;

  if (select) {
    const currentVal = select.value;
    const activeClients = clientsCache.filter(c => (c.Estado || c['Estado'] || 'Activo') !== 'Inactivo');
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
    const listToRender = showInactive ? clientsCache : clientsCache.filter(c => (c.Estado || c['Estado'] || 'Activo') !== 'Inactivo');
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
        <tr class="hover:bg-slate-50 border-b border-slate-100 ${isInactive ? 'bg-slate-50 opacity-60' : ''}">
          <td class="py-2 px-3 font-semibold text-slate-800">${nombre}</td>
          <td class="py-2 px-3 text-slate-600">${ubicacion}</td>
          <td class="py-2 px-3 text-slate-600">${telefono}</td>
          <td class="py-2 px-3 font-semibold ${isInactive ? 'text-rose-600' : 'text-emerald-600'}">${estado}</td>
          <td class="py-2 px-3 text-center">
            <div class="flex items-center justify-center gap-1">
              <button type="button" onclick="startEditClient('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${ubicacion.replace(/'/g, "\\'")}', '${telefono.replace(/'/g, "\\'")}', '${correo.replace(/'/g, "\\'")}')" class="px-2 py-1 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition">
                ✏️ Editar
              </button>
              <button type="button" onclick="toggleClientSoftDelete('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${estado}')" class="px-2 py-1 text-[11px] font-semibold rounded ${isInactive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'} transition">
                ${isInactive ? '🔄 Reactivar' : '🗑️ Desactivar'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function toggleClientSoftDelete(id, nombre, currentStatus) {
  const newStatus = currentStatus === 'Inactivo' ? 'Activo' : 'Inactivo';
  const actionText = newStatus === 'Inactivo' ? 'desactivar' : 'reactivar';
  if (!confirm(`¿Estás seguro de que deseas ${actionText} al cliente "${nombre}"?`)) return;

  const payload = {
    action: 'toggle_cliente',
    id: id,
    nombre: nombre,
    estado: newStatus
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

function updateTechniciansUI() {
  const select = document.getElementById('tecnico');
  const tbody = document.getElementById('technicians-table-body');
  const showInactive = document.getElementById('show-inactive-technicians')?.checked;

  if (select) {
    const currentVal = select.value;
    const activeTechs = techniciansCache.filter(t => (t.Estado || t['Estado'] || 'Activo') !== 'Inactivo');
    select.innerHTML = `<option value="" disabled ${!currentVal ? 'selected' : ''}>Seleccionar...</option>` +
      activeTechs.map(t => {
        const nombre = t['Nombre del Técnico'] || t.nombre || '';
        return `<option value="${nombre}" ${currentVal === nombre ? 'selected' : ''}>${nombre}</option>`;
      }).join('') +
      `<option value="__NEW_TECH__" style="font-weight: bold; color: #2563eb;">➕ Registrar Nuevo Técnico...</option>`;
  }

  if (tbody) {
    const listToRender = showInactive ? techniciansCache : techniciansCache.filter(t => (t.Estado || t['Estado'] || 'Activo') !== 'Inactivo');
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
        <tr class="hover:bg-slate-50 border-b border-slate-100 ${isInactive ? 'bg-slate-50 opacity-60' : ''}">
          <td class="py-2 px-3 font-semibold text-slate-800">${nombre}</td>
          <td class="py-2 px-3 text-slate-600">${cedula}</td>
          <td class="py-2 px-3 text-slate-600">${telefono}</td>
          <td class="py-2 px-3 font-semibold ${isInactive ? 'text-rose-600' : 'text-emerald-600'}">${estado}</td>
          <td class="py-2 px-3 text-center">
            <div class="flex items-center justify-center gap-1">
              <button type="button" onclick="startEditTechnician('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${cedula.replace(/'/g, "\\'")}', '${telefono.replace(/'/g, "\\'")}')" class="px-2 py-1 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition">
                ✏️ Editar
              </button>
              <button type="button" onclick="toggleTechnicianSoftDelete('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${estado}')" class="px-2 py-1 text-[11px] font-semibold rounded ${isInactive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'} transition">
                ${isInactive ? '🔄 Reactivar' : '🗑️ Desactivar'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function toggleTechnicianSoftDelete(id, nombre, currentStatus) {
  const newStatus = currentStatus === 'Inactivo' ? 'Activo' : 'Inactivo';
  const actionText = newStatus === 'Inactivo' ? 'desactivar' : 'reactivar';
  if (!confirm(`¿Estás seguro de que deseas ${actionText} al técnico "${nombre}"?`)) return;

  const payload = {
    action: 'toggle_tecnico',
    id: id,
    nombre: nombre,
    estado: newStatus
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

/**
 * 10. Gestión del Catálogo de Equipos "Otros" (Soft-Delete + Google Sheets)
 */
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
      if (e.target.value === 'Otro') {
        if (containerSubtipo) containerSubtipo.classList.remove('hidden');
        if (containerRefrigerante) containerRefrigerante.classList.add('hidden');
        if (refrigeranteSelect) refrigeranteSelect.value = '';
        fetchEquipmentTypes(true);
      } else {
        if (containerSubtipo) containerSubtipo.classList.add('hidden');
        if (subtipoSelect) subtipoSelect.value = '';
        if (containerRefrigerante) containerRefrigerante.classList.remove('hidden');
      }
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
        descripcion: desc
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

  if (select) {
    const currentVal = select.value;
    const activeEquipments = equipmentTypesCache.filter(eq => (eq.Estado || eq['Estado'] || 'Activo') !== 'Inactivo');
    select.innerHTML = `<option value="" disabled ${!currentVal ? 'selected' : ''}>Seleccionar Subtipo...</option>` +
      activeEquipments.map(eq => {
        const nombre = eq['Nombre Categoría'] || eq.nombre || '';
        return `<option value="${nombre}" ${currentVal === nombre ? 'selected' : ''}>${nombre}</option>`;
      }).join('') +
      `<option value="__MANAGE_EQUIPMENT__" style="font-weight: bold; color: #2563eb;">➕ Gestionar Catálogo...</option>`;
  }

  if (tbody) {
    const listToRender = showInactive ? equipmentTypesCache : equipmentTypesCache.filter(eq => (eq.Estado || eq['Estado'] || 'Activo') !== 'Inactivo');
    if (listToRender.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-400">No hay categorías registradas ${showInactive ? '' : 'activas'}.</td></tr>`;
      return;
    }
    tbody.innerHTML = listToRender.map(eq => {
      const id = String(eq.ID || eq.id || '--');
      const nombre = String(eq['Nombre Categoría'] || eq.nombre || '--');
      const desc = String(eq['Descripción / Ejemplo'] || eq.descripcion || '--');
      const estado = String(eq.Estado || eq['Estado'] || 'Activo');
      const isInactive = estado === 'Inactivo';

      return `
        <tr class="hover:bg-slate-50 border-b border-slate-100 ${isInactive ? 'bg-slate-50 opacity-60' : ''}">
          <td class="py-2 px-3 font-semibold text-slate-800">${nombre}</td>
          <td class="py-2 px-3 text-slate-600">${desc}</td>
          <td class="py-2 px-3 font-semibold ${isInactive ? 'text-rose-600' : 'text-emerald-600'}">${estado}</td>
          <td class="py-2 px-3 text-center">
            <div class="flex items-center justify-center gap-1">
              <button type="button" onclick="startEditEquipment('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${desc.replace(/'/g, "\\'")}')" class="px-2 py-1 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition">
                ✏️ Editar
              </button>
              <button type="button" onclick="toggleEquipmentSoftDelete('${id.replace(/'/g, "\\'")}', '${nombre.replace(/'/g, "\\'")}', '${estado}')" class="px-2 py-1 text-[11px] font-semibold rounded ${isInactive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'} transition">
                ${isInactive ? '🔄 Reactivar' : '🗑️ Desactivar'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function toggleEquipmentSoftDelete(id, nombre, currentStatus) {
  const newStatus = currentStatus === 'Inactivo' ? 'Activo' : 'Inactivo';
  const actionText = newStatus === 'Inactivo' ? 'desactivar' : 'reactivar';
  if (!confirm(`¿Estás seguro de que deseas ${actionText} la categoría "${nombre}"?`)) return;

  const payload = {
    action: 'toggle_equipo',
    id: id,
    estado: newStatus
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
