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
});

/**
 * 1. Inicializa la fecha actual si está vacía
 */
function initDate() {
  const fechaInput = document.getElementById('fecha');
  const btnToday = document.getElementById('btn-fill-today');

  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    fechaInput.value = today;
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

function initDraftStorage() {
  const form = document.getElementById('checklist-form');
  const btnSaveDraft = document.getElementById('btn-save-draft');
  const statusText = document.getElementById('draft-status');

  // Cargar borrador previo si existe
  loadDraft();

  // Escuchar cambios en cualquier input para auto-guardar
  form.addEventListener('input', triggerDraftSave);
  form.addEventListener('change', triggerDraftSave);

  if (btnSaveDraft) {
    btnSaveDraft.addEventListener('click', () => {
      saveDraft();
      if (statusText) {
        statusText.textContent = '¡Borrador guardado!';
        statusText.classList.remove('hidden');
        setTimeout(() => { statusText.textContent = 'Guardado automáticamente'; }, 2000);
      }
    });
  }

  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('¿Está seguro de limpiar todo el formulario y borrar el borrador guardado?')) {
        form.reset();
        localStorage.removeItem(STORAGE_KEY);
        // Limpiar canvas
        ['canvas-tecnico', 'canvas-cliente'].forEach(id => {
          const canvas = document.getElementById(id);
          if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        });
        initDate();
      }
    });
  }
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
  const formData = new FormData(form);
  const data = {};

  formData.forEach((val, key) => {
    data[key] = val;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    otInput.classList.remove('border-rose-500', 'border-emerald-500');
  }

  // Limpiar lienzos de firmas
  ['canvas-tecnico', 'canvas-cliente'].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });

  // Re-inicializar fecha actual y generar nueva OT única
  initDate();
  if (typeof generateUniqueOT === 'function') generateUniqueOT();
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

    const fechaRaw = item['Fecha Inspección'] || item['Fecha / Hora Registro'] || '--';
    const fechaFormatted = typeof fechaRaw === 'string' && fechaRaw.includes('T') ? fechaRaw.split('T')[0] : fechaRaw;

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

  document.querySelectorAll('.btn-view-detail-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      openRecordDetail(filtered[idx]);
    });
  });
}

function openRecordDetail(record) {
  selectedRecordCache = record;
  const modalDetail = document.getElementById('modal-record-detail');
  const container = document.getElementById('detail-modal-body');
  if (!modalDetail || !container) return;

  const getVal = (key) => record[key] || '--';

  container.innerHTML = `
    <!-- Header Summary Card -->
    <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
      <div class="flex flex-wrap justify-between items-center border-b border-slate-200 pb-2 gap-2">
        <span class="text-sm font-bold text-blue-600">Orden / OT: ${getVal('N° Orden / OT')}</span>
        <span class="text-xs text-slate-500">Fecha Inspección: ${getVal('Fecha Inspección')}</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-xs">
        <div><span class="text-slate-400">Cliente / Ubicación:</span> <strong class="text-slate-700 block font-semibold">${getVal('Cliente / Ubicación')}</strong></div>
        <div><span class="text-slate-400">Técnico Responsable:</span> <strong class="text-slate-700 block font-semibold">${getVal('Técnico Responsable')}</strong></div>
        <div><span class="text-slate-400">Equipo:</span> <strong class="text-slate-700 block font-semibold">${getVal('Tipo de Unidad')} ${getVal('Marca / Modelo')}</strong></div>
        <div><span class="text-slate-400">ID / Tag:</span> <strong class="text-slate-700 block font-semibold">${getVal('ID / Tag Equipo')}</strong></div>
        <div><span class="text-slate-400">Refrigerante:</span> <strong class="text-slate-700 block font-semibold">${getVal('Refrigerante')}</strong></div>
      </div>
    </div>

    <!-- Section 4: Operational Measurements Summary -->
    <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
      <h4 class="font-bold text-slate-800 text-xs mb-3 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
        📊 Mediciones Técnicas y Operativas
      </h4>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100"><span class="text-slate-400 block text-[10px]">Voltaje VAC:</span> <strong class="text-slate-800">${getVal('Med: Voltaje (V AC)')} V</strong></div>
        <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100"><span class="text-slate-400 block text-[10px]">Corriente Compresor:</span> <strong class="text-slate-800">${getVal('Med: Corriente Compresor (A)')} A</strong></div>
        <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100"><span class="text-slate-400 block text-[10px]">Corriente Ventilador:</span> <strong class="text-slate-800">${getVal('Med: Corriente Motor Ext (A)')} A</strong></div>
        <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100"><span class="text-slate-400 block text-[10px]">Presión Baja:</span> <strong class="text-slate-800">${getVal('Med: Presión Baja (PSI)')} PSI</strong></div>
        <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100"><span class="text-slate-400 block text-[10px]">Presión Alta:</span> <strong class="text-slate-800">${getVal('Med: Presión Alta (PSI)')} PSI</strong></div>
        <div class="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200"><span class="text-emerald-700 block text-[10px] font-semibold">Diferencial ΔT:</span> <strong class="text-emerald-800 text-sm">${getVal('Med: Delta T (°C)')} °C</strong></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100 text-xs">
        <div><span class="text-slate-400">Superheat / Subcooling:</span> <span class="font-medium text-slate-700">${getVal('Med: Superheat / Subcooling')}</span></div>
        <div><span class="text-slate-400">Control Remoto:</span> <span class="font-medium text-slate-700">${getVal('Med: Control Remoto Estado')}</span></div>
      </div>
    </div>

    <!-- Section 5: Observaciones Finales -->
    <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
      <h4 class="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1">📝 Diagnóstico y Observaciones Finales</h4>
      <p class="bg-slate-50 p-3 rounded-lg text-xs text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-200">${getVal('Diagnóstico y Observaciones Finales')}</p>
    </div>

    <!-- Signatures Preview -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
      <div class="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center">
        <span class="text-[11px] font-semibold text-slate-600 block mb-1.5">Firma Técnico: ${getVal('Nombre Técnico')}</span>
        ${record['Firma Técnico (DataURL)'] ? `<img src="${record['Firma Técnico (DataURL)']}" class="h-20 mx-auto object-contain bg-white rounded-lg border border-slate-300 p-1" alt="Firma Técnico">` : '<span class="text-slate-400 italic text-[11px]">Sin firma registrada</span>'}
      </div>
      <div class="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center">
        <span class="text-[11px] font-semibold text-slate-600 block mb-1.5">Firma Cliente: ${getVal('Nombre Cliente')}</span>
        ${record['Firma Cliente (DataURL)'] ? `<img src="${record['Firma Cliente (DataURL)']}" class="h-20 mx-auto object-contain bg-white rounded-lg border border-slate-300 p-1" alt="Firma Cliente">` : '<span class="text-slate-400 italic text-[11px]">Sin firma registrada</span>'}
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
      window.print();
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

  const setVal = (id, val) => {
    const el = document.getElementById(id) || form.elements[id];
    if (el) el.value = val || '';
  };

  setVal('fecha', record['Fecha Inspección']);
  setVal('ot', record['N° Orden / OT']);
  setVal('cliente', record['Cliente / Ubicación']);
  setVal('tecnico', record['Técnico Responsable']);
  setVal('tipoUnidad', record['Tipo de Unidad']);
  setVal('marcaModelo', record['Marca / Modelo']);
  setVal('idTag', record['ID / Tag Equipo']);
  setVal('refrigerante', record['Refrigerante']);

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

  // Recalcular Delta T
  const tempInjInput = document.getElementById('med_temp_inyeccion');
  if (tempInjInput) tempInjInput.dispatchEvent(new Event('input'));

  // Desactivar temporalmente la alerta de duplicado para permitir edicion de la misma OT
  isOtDuplicate = false;
  const badge = document.getElementById('ot-validation-badge');
  if (badge) {
    badge.className = 'block text-[11px] font-medium mt-1 text-blue-600 font-semibold';
    badge.textContent = '✏️ Modo Edición / Revisión activo';
  }

  // Scroll suave al formulario
  form.scrollIntoView({ behavior: 'smooth' });

  alert(`✏️ Se cargaron los datos completos de la Orden "${record['N° Orden / OT']}" en el formulario para su revisión/edición.`);
}

/**
 * 9. Gestión de Clientes y Técnicos (Almacenamiento Local + Extracción Automática)
 */
const CLIENTS_STORAGE_KEY = 'app_clientes_custom_v1';
const TECHS_STORAGE_KEY = 'app_tecnicos_custom_v1';

function getCustomClients() {
  try {
    return JSON.parse(localStorage.getItem(CLIENTS_STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function getCustomTechnicians() {
  try {
    return JSON.parse(localStorage.getItem(TECHS_STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function getAllClients() {
  const custom = getCustomClients();
  const list = [...custom];

  // Extraer clientes únicos de los mantenimientos guardados en el historial
  if (Array.isArray(historyDataCache)) {
    historyDataCache.forEach(item => {
      const raw = (item['Cliente / Ubicación'] || '').toString().trim();
      if (raw && !list.some(c => (c.nombre || '').toLowerCase() === raw.toLowerCase() || (`${c.nombre} - ${c.ubicacion}`).toLowerCase() === raw.toLowerCase())) {
        list.push({ id: 'AUTO-' + (list.length + 1), nombre: raw, ubicacion: 'Extraído de Historial', telefono: '--', auto: true });
      }
    });
  }
  return list;
}

function getAllTechnicians() {
  const custom = getCustomTechnicians();
  const list = [...custom];

  // Extraer técnicos únicos de los mantenimientos guardados en el historial
  if (Array.isArray(historyDataCache)) {
    historyDataCache.forEach(item => {
      const raw = (item['Técnico Responsable'] || '').toString().trim();
      if (raw && !list.some(t => (t.nombre || '').toLowerCase() === raw.toLowerCase())) {
        list.push({ id: 'AUTO-' + (list.length + 1), nombre: raw, cedula: 'Extraído de Historial', telefono: '--', auto: true });
      }
    });
  }
  return list;
}

function initClientsAndTechniciansManagement() {
  const btnViewClients = document.getElementById('btn-view-clients');
  const modalClients = document.getElementById('modal-clients');
  const btnCloseClients = document.getElementById('btn-close-clients');
  const formAddClient = document.getElementById('form-add-client');

  const btnViewTechnicians = document.getElementById('btn-view-technicians');
  const modalTechnicians = document.getElementById('modal-technicians');
  const btnCloseTechnicians = document.getElementById('btn-close-technicians');
  const formAddTechnician = document.getElementById('form-add-technician');

  if (btnViewClients && modalClients) {
    btnViewClients.addEventListener('click', () => {
      modalClients.classList.remove('hidden');
      updateClientsUI(false);
    });
  }

  if (btnCloseClients) {
    btnCloseClients.addEventListener('click', () => modalClients.classList.add('hidden'));
  }

  if (formAddClient) {
    formAddClient.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('new-client-name').value.trim();
      const location = document.getElementById('new-client-location').value.trim();
      const phone = document.getElementById('new-client-phone').value.trim();
      const email = document.getElementById('new-client-email').value.trim();

      if (!name || !location) return;

      const custom = getCustomClients();
      const newClient = {
        id: 'CLI-' + (custom.length + 1).toString().padStart(2, '0'),
        nombre: name,
        ubicacion: location,
        telefono: phone || '--',
        correo: email || '--'
      };

      custom.push(newClient);
      localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(custom));
      formAddClient.reset();
      updateClientsUI(false);
    });
  }

  if (btnViewTechnicians && modalTechnicians) {
    btnViewTechnicians.addEventListener('click', () => {
      modalTechnicians.classList.remove('hidden');
      updateTechniciansUI(false);
    });
  }

  if (btnCloseTechnicians) {
    btnCloseTechnicians.addEventListener('click', () => modalTechnicians.classList.add('hidden'));
  }

  if (formAddTechnician) {
    formAddTechnician.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('new-tech-name').value.trim();
      const cedula = document.getElementById('new-tech-cedula').value.trim();
      const phone = document.getElementById('new-tech-phone').value.trim();

      if (!name || !cedula) return;

      const custom = getCustomTechnicians();
      const newTech = {
        id: 'TEC-' + (custom.length + 1).toString().padStart(2, '0'),
        nombre: name,
        cedula: cedula,
        telefono: phone || '--'
      };

      custom.push(newTech);
      localStorage.setItem(TECHS_STORAGE_KEY, JSON.stringify(custom));
      formAddTechnician.reset();
      updateTechniciansUI(false);
    });
  }

  updateClientsUI(true);
  updateTechniciansUI(true);
}

function updateClientsUI(silent = false) {
  const list = getAllClients();
  const datalist = document.getElementById('datalist-clientes');
  const tbody = document.getElementById('clients-table-body');

  if (datalist) {
    datalist.innerHTML = list.map(c => {
      const val = c.ubicacion && c.ubicacion !== 'Extraído de Historial' ? `${c.nombre} - ${c.ubicacion}` : c.nombre;
      return `<option value="${val}">`;
    }).join('');
  }

  if (!silent && tbody) {
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-400">No hay clientes registrados aún.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(c => `
      <tr class="hover:bg-slate-50 border-b border-slate-100">
        <td class="py-2 px-3 font-bold ${c.auto ? 'text-slate-400' : 'text-blue-600'}">${c.id}</td>
        <td class="py-2 px-3 font-semibold text-slate-800">${c.nombre}</td>
        <td class="py-2 px-3 text-slate-600">${c.ubicacion}</td>
        <td class="py-2 px-3 text-slate-600">${c.telefono}</td>
      </tr>
    `).join('');
  }
}

function updateTechniciansUI(silent = false) {
  const list = getAllTechnicians();
  const datalist = document.getElementById('datalist-tecnicos');
  const tbody = document.getElementById('technicians-table-body');

  if (datalist) {
    datalist.innerHTML = list.map(t => `<option value="${t.nombre}">`).join('');
  }

  if (!silent && tbody) {
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-400">No hay técnicos registrados aún.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(t => `
      <tr class="hover:bg-slate-50 border-b border-slate-100">
        <td class="py-2 px-3 font-bold ${t.auto ? 'text-slate-400' : 'text-blue-600'}">${t.id}</td>
        <td class="py-2 px-3 font-semibold text-slate-800">${t.nombre}</td>
        <td class="py-2 px-3 text-slate-600">${t.cedula}</td>
        <td class="py-2 px-3 text-slate-600">${t.telefono}</td>
      </tr>
    `).join('');
  }
}
