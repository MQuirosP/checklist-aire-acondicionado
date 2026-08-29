/**
 * GOOGLE APPS SCRIPT - PERSISTENCIA DE CHECKLIST DE AIRE ACONDICIONADO, CLIENTES, TÉCNICOS Y CATÁLOGO DE EQUIPOS
 */

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

    // 1. Guardar nuevo cliente si action === 'add_cliente'
    if (data.action === 'add_cliente') {
      var clientSheet = ss.getSheetByName('Clientes') || ss.insertSheet('Clientes');
      if (clientSheet.getLastRow() === 0) {
        clientSheet.appendRow(["ID", "Nombre / Empresa", "Ubicación / Dirección", "Teléfono", "Correo", "Estado", "Fecha Registro"]);
        clientSheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#e2e8f0");
        clientSheet.setFrozenRows(1);
      }
      var clientId = "CLI-" + (clientSheet.getLastRow() > 0 ? clientSheet.getLastRow() : 1);
      clientSheet.appendRow([clientId, data.nombre || "", data.ubicacion || "", data.telefono || "", data.correo || "", "Activo", new Date()]);
      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "id": clientId })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Soft-delete / Toggle estado de cliente (Activo <-> Inactivo)
    if (data.action === 'toggle_cliente') {
      var clientSheet = ss.getSheetByName('Clientes');
      if (clientSheet) {
        var rows = clientSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          var rowId = (rows[i][0] || "").toString().trim();
          var rowName = (rows[i][1] || "").toString().trim();
          if (rowId === data.id || rowName === data.nombre || rowName === data.id) {
            var newStatus = data.estado || (rows[i][5] === "Inactivo" ? "Activo" : "Inactivo");
            clientSheet.getRange(i + 1, 6).setValue(newStatus);
            return ContentService.createTextOutput(JSON.stringify({ "result": "success", "id": rowId, "estado": newStatus })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": "Cliente no encontrado" })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2.1 Editar datos de cliente
    if (data.action === 'edit_cliente') {
      var clientSheet = ss.getSheetByName('Clientes');
      if (clientSheet) {
        var rows = clientSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          var rowId = (rows[i][0] || "").toString().trim();
          var rowName = (rows[i][1] || "").toString().trim();
          if (rowId === data.id || rowName === data.id || rowName === data.nombreOld) {
            if (data.nombre) clientSheet.getRange(i + 1, 2).setValue(data.nombre);
            if (data.ubicacion !== undefined) clientSheet.getRange(i + 1, 3).setValue(data.ubicacion);
            if (data.telefono !== undefined) clientSheet.getRange(i + 1, 4).setValue(data.telefono);
            if (data.correo !== undefined) clientSheet.getRange(i + 1, 5).setValue(data.correo);
            return ContentService.createTextOutput(JSON.stringify({ "result": "success", "id": rowId })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": "Cliente no encontrado" })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Guardar nuevo técnico si action === 'add_tecnico'
    if (data.action === 'add_tecnico') {
      var tecSheet = ss.getSheetByName('Técnicos') || ss.insertSheet('Técnicos');
      if (tecSheet.getLastRow() === 0) {
        tecSheet.appendRow(["ID", "Nombre del Técnico", "Cédula / ID", "Teléfono", "Estado", "Fecha Registro"]);
        tecSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#e2e8f0");
        tecSheet.setFrozenRows(1);
      }
      var tecId = "TEC-" + (tecSheet.getLastRow() > 0 ? tecSheet.getLastRow() : 1);
      tecSheet.appendRow([tecId, data.nombre || "", data.cedula || "", data.telefono || "", "Activo", new Date()]);
      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "id": tecId })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Soft-delete / Toggle estado de técnico (Activo <-> Inactivo)
    if (data.action === 'toggle_tecnico') {
      var tecSheet = ss.getSheetByName('Técnicos');
      if (tecSheet) {
        var rows = tecSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          var rowId = (rows[i][0] || "").toString().trim();
          var rowName = (rows[i][1] || "").toString().trim();
          if (rowId === data.id || rowName === data.nombre || rowName === data.id) {
            var newStatus = data.estado || (rows[i][4] === "Inactivo" ? "Activo" : "Inactivo");
            tecSheet.getRange(i + 1, 5).setValue(newStatus);
            return ContentService.createTextOutput(JSON.stringify({ "result": "success", "id": rowId, "estado": newStatus })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": "Técnico no encontrado" })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4.1 Editar datos de técnico
    if (data.action === 'edit_tecnico') {
      var tecSheet = ss.getSheetByName('Técnicos');
      if (tecSheet) {
        var rows = tecSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          var rowId = (rows[i][0] || "").toString().trim();
          var rowName = (rows[i][1] || "").toString().trim();
          if (rowId === data.id || rowName === data.id || rowName === data.nombreOld) {
            if (data.nombre) tecSheet.getRange(i + 1, 2).setValue(data.nombre);
            if (data.cedula !== undefined) tecSheet.getRange(i + 1, 3).setValue(data.cedula);
            if (data.telefono !== undefined) tecSheet.getRange(i + 1, 4).setValue(data.telefono);
            return ContentService.createTextOutput(JSON.stringify({ "result": "success", "id": rowId })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": "Técnico no encontrado" })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Guardar nuevo tipo de equipo en Catálogo de Equipos
    if (data.action === 'add_equipo') {
      var eqSheet = ss.getSheetByName('Catálogo de Equipos') || ss.insertSheet('Catálogo de Equipos');
      initEquipmentSheetIfNeeded(eqSheet);
      var eqId = "EQ-" + (eqSheet.getLastRow() > 0 ? eqSheet.getLastRow() : 1);
      eqSheet.appendRow([eqId, data.nombre || "", data.descripcion || "", "Activo", new Date()]);
      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "id": eqId })).setMimeType(ContentService.MimeType.JSON);
    }

    // 6. Editar tipo de equipo
    if (data.action === 'edit_equipo') {
      var eqSheet = ss.getSheetByName('Catálogo de Equipos');
      if (eqSheet) {
        var rows = eqSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          var rowId = (rows[i][0] || "").toString().trim();
          var rowName = (rows[i][1] || "").toString().trim();
          if (rowId === data.id || rowName === data.id || rowName === data.nombreOld) {
            if (data.nombre) eqSheet.getRange(i + 1, 2).setValue(data.nombre);
            if (data.descripcion !== undefined) eqSheet.getRange(i + 1, 3).setValue(data.descripcion);
            return ContentService.createTextOutput(JSON.stringify({ "result": "success", "id": rowId })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": "Equipo no encontrado" })).setMimeType(ContentService.MimeType.JSON);
    }

    // 7. Soft-delete / Toggle estado de equipo (Activo <-> Inactivo)
    if (data.action === 'toggle_equipo') {
      var eqSheet = ss.getSheetByName('Catálogo de Equipos');
      if (eqSheet) {
        var rows = eqSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          var rowId = (rows[i][0] || "").toString().trim();
          if (rowId === data.id) {
            var newStatus = data.estado || (rows[i][3] === "Inactivo" ? "Activo" : "Inactivo");
            eqSheet.getRange(i + 1, 4).setValue(newStatus);
            return ContentService.createTextOutput(JSON.stringify({ "result": "success", "id": rowId, "estado": newStatus })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": "Equipo no encontrado" })).setMimeType(ContentService.MimeType.JSON);
    }

    // 8. Por defecto: Guardar Mantenimiento en la pestaña Mantenimientos
    var sheet = ss.getSheetByName('Mantenimientos') || ss.getSheets()[0];

    var sheetHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];

    if (sheet.getLastRow() === 0 || !sheetHeaders[0]) {
      sheetHeaders = [
        "Fecha / Hora Registro", "Fecha Inspección", "N° Orden / OT", "Tipo de Mantenimiento", "Cliente / Ubicación", "Técnico Responsable",
        "Tipo de Unidad", "Subtipo / Categoría Equipo", "Marca / Modelo", "ID / Tag Equipo", "Refrigerante",
        "Evap: Gabinete Externo", "Evap: Gabinete Obs", "Evap: Filtros Aire", "Evap: Filtros Obs",
        "Evap: Serpentín Evaporador", "Evap: Serpentín Obs", "Evap: Bandeja Condensados / Biocidas", "Evap: Bandeja Obs",
        "Evap: Drenaje Obstrucciones", "Evap: Drenaje Obs", "Evap: Turbina / Fan Tangencial", "Evap: Turbina Obs",
        "Evap: Motor Vent / Rodajes", "Evap: Motor Vent Obs", "Evap: Persianas Swing / Motor paso", "Evap: Persianas Obs",
        "Evap: Conexiones Eléctricas / Termistores", "Evap: Conexiones Obs",
        "Cond: Serpentín Condensador", "Cond: Serpentín Obs", "Cond: Aletas Aluminio", "Cond: Aletas Obs",
        "Cond: Aspas Ventilador", "Cond: Aspas Obs", "Cond: Motor Vent / Rodamientos", "Cond: Motor Vent Obs",
        "Cond: Compresor (Ruido/Amortiguadores)", "Cond: Compresor Obs", "Cond: Aislamiento Térmico Tuberías", "Cond: Aislamiento Obs",
        "Cond: Fugas Refrigerante / Aceite", "Cond: Fugas Obs", "Cond: Soportes y Anclajes", "Cond: Soportes Obs",
        "Elec: Reajuste Bornes", "Elec: Bornes Obs", "Elec: Capacitores Medición", "Elec: Capacitor Comp (µF)",
        "Elec: Capacitor Vent (µF)", "Elec: Capacitores Obs", "Elec: Tarjetas PCB / Errores", "Elec: Tarjetas Obs",
        "Elec: Protecciones Eléctricas", "Elec: Protecciones Obs", "Elec: Conexión Tierra Física", "Elec: Tierra Obs",
        "Med: Voltaje (V AC)", "Med: Corriente Compresor (A)", "Med: Corriente Motor Ext (A)", "Med: Presión Baja (PSI)",
        "Med: Presión Alta (PSI)", "Med: Control Remoto Estado", "Diagnóstico y Observaciones Finales",
        "Nombre Técnico", "Firma Técnico (DataURL)", "Nombre Cliente", "Firma Cliente (DataURL)"
      ];
      sheet.appendRow(sheetHeaders);
      sheet.getRange(1, 1, 1, sheetHeaders.length).setFontWeight("bold").setBackground("#e2e8f0");
      sheet.setFrozenRows(1);
    }

    var timestamp = new Date();

    var targetRowIndex = -1;
    if (data.ot && data.ot.toString().trim() !== "") {
      var otClean = data.ot.toString().trim().toLowerCase();
      var rows = sheet.getDataRange().getValues();
      var otColIdx = sheetHeaders.indexOf("N° Orden / OT");
      if (otColIdx === -1) otColIdx = 2;
      for (var i = 1; i < rows.length; i++) {
        var existingOt = (rows[i][otColIdx] || "").toString().trim().toLowerCase();
        if (existingOt === otClean) {
          targetRowIndex = i + 1;
          break;
        }
      }
    }

    var dataMap = {
      "Fecha / Hora Registro": timestamp,
      "Fecha Inspección": data.fecha || "",
      "N° Orden / OT": data.ot || "",
      "Tipo de Mantenimiento": data.tipoMantenimiento || "Preventivo",
      "Cliente / Ubicación": data.cliente || "",
      "Técnico Responsable": data.tecnico || "",
      "Tipo de Unidad": data.tipoUnidad || "",
      "Subtipo / Categoría Equipo": data.subtipoEquipo || "",
      "Marca / Modelo": data.marcaModelo || "",
      "ID / Tag Equipo": data.idTag || "",
      "Refrigerante": data.refrigerante || "",
      "Evap: Gabinete Externo": data.evap_gabinete || "",
      "Evap: Gabinete Obs": data.evap_gabinete_obs || "",
      "Evap: Filtros Aire": data.evap_filtros || "",
      "Evap: Filtros Obs": data.evap_filtros_obs || "",
      "Evap: Serpentín Evaporador": data.evap_serpentin || "",
      "Evap: Serpentín Obs": data.evap_serpentin_obs || "",
      "Evap: Bandeja Condensados / Biocidas": data.evap_bandeja || "",
      "Evap: Bandeja Obs": data.evap_bandeja_obs || "",
      "Evap: Drenaje Obstrucciones": data.evap_drenaje || "",
      "Evap: Drenaje Obs": data.evap_drenaje_obs || "",
      "Evap: Turbina / Fan Tangencial": data.evap_turbina || "",
      "Evap: Turbina Obs": data.evap_turbina_obs || "",
      "Evap: Motor Vent / Rodajes": data.evap_motor || "",
      "Evap: Motor Vent Obs": data.evap_motor_obs || "",
      "Evap: Persianas Swing / Motor paso": data.evap_persianas || "",
      "Evap: Persianas Obs": data.evap_persianas_obs || "",
      "Evap: Conexiones Eléctricas / Termistores": data.evap_conexiones || "",
      "Evap: Conexiones Obs": data.evap_conexiones_obs || "",
      "Cond: Serpentín Condensador": data.cond_serpentin || "",
      "Cond: Serpentín Obs": data.cond_serpentin_obs || "",
      "Cond: Aletas Aluminio": data.cond_aletas || "",
      "Cond: Aletas Obs": data.cond_aletas_obs || "",
      "Cond: Aspas Ventilador": data.cond_aspas || "",
      "Cond: Aspas Obs": data.cond_aspas_obs || "",
      "Cond: Motor Vent / Rodamientos": data.cond_motor || "",
      "Cond: Motor Vent Obs": data.cond_motor_obs || "",
      "Cond: Compresor (Ruido/Amortiguadores)": data.cond_compresor || "",
      "Cond: Compresor Obs": data.cond_compresor_obs || "",
      "Cond: Aislamiento Térmico Tuberías": data.cond_aislamiento || "",
      "Cond: Aislamiento Obs": data.cond_aislamiento_obs || "",
      "Cond: Fugas Refrigerante / Aceite": data.cond_fugas || "",
      "Cond: Fugas Obs": data.cond_fugas_obs || "",
      "Cond: Soportes y Anclajes": data.cond_soportes || "",
      "Cond: Soportes Obs": data.cond_soportes_obs || "",
      "Elec: Reajuste Bornes": data.elec_bornes || "",
      "Elec: Bornes Obs": data.elec_bornes_obs || "",
      "Elec: Capacitores Medición": data.elec_capacitores || "",
      "Elec: Capacitor Comp (µF)": data.elec_cap_comp || "",
      "Elec: Capacitor Vent (µF)": data.elec_cap_vent || "",
      "Elec: Capacitores Obs": data.elec_capacitores_obs || "",
      "Elec: Tarjetas PCB / Errores": data.elec_tarjetas || "",
      "Elec: Tarjetas Obs": data.elec_tarjetas_obs || "",
      "Elec: Protecciones Eléctricas": data.elec_protecciones || "",
      "Elec: Protecciones Obs": data.elec_protecciones_obs || "",
      "Elec: Conexión Tierra Física": data.elec_tierra || "",
      "Elec: Tierra Obs": data.elec_tierra_obs || "",
      "Med: Voltaje (V AC)": data.med_voltaje || "",
      "Med: Corriente Compresor (A)": data.med_corriente_comp || "",
      "Med: Corriente Motor Ext (A)": data.med_corriente_vent || "",
      "Med: Presión Baja (PSI)": data.med_presion_baja || "",
      "Med: Presión Alta (PSI)": data.med_presion_alta || "",
      "Med: Control Remoto Estado": data.med_control_remoto || "",
      "Diagnóstico y Observaciones Finales": data.observaciones_finales || "",
      "Nombre Técnico": data.nombre_tecnico_firma || "",
      "Firma Técnico (DataURL)": data.firma_tecnico || "",
      "Nombre Cliente": data.nombre_cliente_firma || "",
      "Firma Cliente (DataURL)": data.firma_cliente || ""
    };

    var row = sheetHeaders.map(function(h) {
      return dataMap[h] !== undefined ? dataMap[h] : "";
    });

    if (targetRowIndex !== -1) {
      sheet.getRange(targetRowIndex, 1, 1, row.length).setValues([row]);
      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "updatedRow": targetRowIndex })).setMimeType(ContentService.MimeType.JSON);
    } else {
      sheet.appendRow(row);
      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "row": sheet.getLastRow() })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'mantenimientos';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'clientes') {
      var sheet = ss.getSheetByName('Clientes') || ss.insertSheet('Clientes');
      return getSheetJson(sheet);
    }
    if (action === 'tecnicos') {
      var sheet = ss.getSheetByName('Técnicos') || ss.insertSheet('Técnicos');
      return getSheetJson(sheet);
    }
    if (action === 'equipos') {
      var sheet = ss.getSheetByName('Catálogo de Equipos') || ss.insertSheet('Catálogo de Equipos');
      initEquipmentSheetIfNeeded(sheet);
      return getSheetJson(sheet);
    }

    // Por defecto: mantenimientos
    var sheet = ss.getSheetByName('Mantenimientos') || ss.getSheets()[0];
    return getSheetJson(sheet);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function initEquipmentSheetIfNeeded(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["ID", "Nombre Categoría", "Descripción / Ejemplo", "Estado", "Fecha Registro"]);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#e2e8f0");
    sheet.setFrozenRows(1);
    
    // Categorías iniciales por defecto
    var defaults = [
      ["EQ-01", "Electrodoméstico Doméstico", "Refrigeradora, Nevera, Lavadora", "Activo", new Date()],
      ["EQ-02", "Vitrina Comercial", "Exhibidor comercial refrigerado", "Activo", new Date()],
      ["EQ-03", "Cámara de Congelación", "Cámara fría / Walk-in freezer", "Activo", new Date()],
      ["EQ-04", "Máquina de Hielo", "Fabricador de hielo industrial", "Activo", new Date()],
      ["EQ-05", "Enfriador de Botellas", "Beverage cooler", "Activo", new Date()],
      ["EQ-06", "Chiller Especial / Industrial", "Chiller de proceso industrial", "Activo", new Date()]
    ];
    defaults.forEach(function(r) { sheet.appendRow(r); });
  }
}

function getSheetJson(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  var headers = rows[0];
  var data = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var hasContent = false;
    for (var k = 0; k < row.length; k++) {
      if ((row[k] || "").toString().trim() !== "") {
        hasContent = true;
        break;
      }
    }
    if (!hasContent) continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    data.push(obj);
  }
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Función de 1-Clic para normalizar encabezados de Fila 1 en la hoja Mantenimientos
 * y corregir cualquier desfasaje de columnas histórico.
 */
function realignHeadersAndFixRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Mantenimientos') || ss.getSheets()[0];
  var STANDARD_HEADERS = [
    "Fecha / Hora Registro", "Fecha Inspección", "N° Orden / OT", "Tipo de Mantenimiento", "Cliente / Ubicación", "Técnico Responsable",
    "Tipo de Unidad", "Subtipo / Categoría Equipo", "Marca / Modelo", "ID / Tag Equipo", "Refrigerante",
    "Evap: Gabinete Externo", "Evap: Gabinete Obs", "Evap: Filtros Aire", "Evap: Filtros Obs",
    "Evap: Serpentín Evaporador", "Evap: Serpentín Obs", "Evap: Bandeja Condensados / Biocidas", "Evap: Bandeja Obs",
    "Evap: Drenaje Obstrucciones", "Evap: Drenaje Obs", "Evap: Turbina / Fan Tangencial", "Evap: Turbina Obs",
    "Evap: Motor Vent / Rodajes", "Evap: Motor Vent Obs", "Evap: Persianas Swing / Motor paso", "Evap: Persianas Obs",
    "Evap: Conexiones Eléctricas / Termistores", "Evap: Conexiones Obs",
    "Cond: Serpentín Condensador", "Cond: Serpentín Obs", "Cond: Aletas Aluminio", "Cond: Aletas Obs",
    "Cond: Aspas Ventilador", "Cond: Aspas Obs", "Cond: Motor Vent / Rodamientos", "Cond: Motor Vent Obs",
    "Cond: Compresor (Ruido/Amortiguadores)", "Cond: Compresor Obs", "Cond: Aislamiento Térmico Tuberías", "Cond: Aislamiento Obs",
    "Cond: Fugas Refrigerante / Aceite", "Cond: Fugas Obs", "Cond: Soportes y Anclajes", "Cond: Soportes Obs",
    "Elec: Reajuste Bornes", "Elec: Bornes Obs", "Elec: Capacitores Medición", "Elec: Capacitor Comp (µF)",
    "Elec: Capacitor Vent (µF)", "Elec: Capacitores Obs", "Elec: Tarjetas PCB / Errores", "Elec: Tarjetas Obs",
    "Elec: Protecciones Eléctricas", "Elec: Protecciones Obs", "Elec: Conexión Tierra Física", "Elec: Tierra Obs",
    "Med: Voltaje (V AC)", "Med: Corriente Compresor (A)", "Med: Corriente Motor Ext (A)", "Med: Presión Baja (PSI)",
    "Med: Presión Alta (PSI)", "Med: Control Remoto Estado", "Diagnóstico y Observaciones Finales",
    "Nombre Técnico", "Firma Técnico (DataURL)", "Nombre Cliente", "Firma Cliente (DataURL)"
  ];

  sheet.getRange(1, 1, 1, STANDARD_HEADERS.length).setValues([STANDARD_HEADERS]).setFontWeight("bold").setBackground("#e2e8f0");
  sheet.setFrozenRows(1);
}
