/**
 * CHECKLIST MANTENIMIENTO PREVENTIVO - AIRE ACONDICIONADO
 * Lógica JavaScript Interactiva, Canvas de Firmas y Persistencia en Google Sheets
 */

// URL configurada de la Aplicación Web de Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyl-APjoxV_numwqMHBIxm2-MKHHPCXSWV9LaL5yTz1j7ozY0Xg4wO6uZR5jvj_h94B/exec';

document.addEventListener('DOMContentLoaded', () => {
  initDate();
  initDeltaTCalculation();
  initBulkActionButtons();
  initSignaturePads();
  initDraftStorage();
  initFormSubmission();
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

  const btnCloseSuccess = document.getElementById('btn-close-success');
  const btnCloseError = document.getElementById('btn-close-error');

  if (btnCloseSuccess) {
    btnCloseSuccess.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  if (btnCloseError) {
    btnCloseError.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validar URL de Google Script
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PEGA_AQUI_TU_URL')) {
      alert('⚠️ ATENCIÓN: Debes configurar la URL de tu Google Apps Script en el archivo app.js (constante GOOGLE_SCRIPT_URL). Consulta el README.md para ver las instrucciones paso a paso.');
      return;
    }

    // Recopilar datos del formulario
    const formData = new FormData(form);
    const payload = {};

    formData.forEach((value, key) => {
      payload[key] = value;
    });

    // Obtener firmas en DataURL Base64 de los canvas
    const canvasTecnico = document.getElementById('canvas-tecnico');
    const canvasCliente = document.getElementById('canvas-cliente');

    if (canvasTecnico && isCanvasBlank(canvasTecnico) === false) {
      payload.firma_tecnico = canvasTecnico.toDataURL('image/png');
    }
    if (canvasCliente && isCanvasBlank(canvasCliente) === false) {
      payload.firma_cliente = canvasCliente.toDataURL('image/png');
    }

    // Mostrar modal en estado de Carga
    modal.classList.remove('hidden');
    modalLoading.classList.remove('hidden');
    modalSuccess.classList.add('hidden');
    modalError.classList.add('hidden');

    try {
      // Enviar como text/plain para evitar bloqueos CORS con Apps Script
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      const resText = await response.text();
      let resJson = {};
      try {
        resJson = JSON.parse(resText);
      } catch (err) {
        // En caso de que Apps Script devuelva texto plano o redirección
        resJson = { result: 'success' };
      }

      if (resJson.result === 'success' || response.ok) {
        modalLoading.classList.add('hidden');
        modalSuccess.classList.remove('hidden');

        // Limpiar borrador tras envío exitoso
        localStorage.removeItem(STORAGE_KEY);
      } else {
        throw new Error(resJson.error || 'Error al procesar la solicitud en Google Sheets');
      }

    } catch (error) {
      console.error('Error enviando formulario:', error);
      modalLoading.classList.add('hidden');
      modalError.classList.remove('hidden');
      if (errorMessageText) {
        errorMessageText.textContent = `Detalle del error: ${error.message || 'Verifica tu conexión y permisos del script.'}`;
      }
    }
  });
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
