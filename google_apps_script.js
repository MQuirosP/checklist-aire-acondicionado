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
          if (rowId === data.id || rowName === data.nombre) {
            var newStatus = data.estado || (rows[i][5] === "Inactivo" ? "Activo" : "Inactivo");
            clientSheet.getRange(i + 1, 6).setValue(newStatus);
            return ContentService.createTextOutput(JSON.stringify({ "result": "success", "id": rowId, "estado": newStatus })).setMimeType(ContentService.MimeType.JSON);
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
          if (rowId === data.id || rowName === data.nombre) {
            var newStatus = data.estado || (rows[i][4] === "Inactivo" ? "Activo" : "Inactivo");
            tecSheet.getRange(i + 1, 5).setValue(newStatus);
            return ContentService.createTextOutput(JSON.stringify({ "result": "success", "id": rowId, "estado": newStatus })).setMimeType(ContentService.MimeType.JSON);
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
          if (rowId === data.id) {
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

    if (sheet.getLastRow() === 0) {
      var headers = [
        "Fecha / Hora Registro", "Fecha Inspección", "N° Orden / OT", "Cliente / Ubicación", "Técnico Responsable",
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
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
      sheet.setFrozenRows(1);
    }

    var timestamp = new Date();

    // Verificación de unicidad por N° Orden / OT
    if (data.ot && data.ot.toString().trim() !== "") {
      var otClean = data.ot.toString().trim().toLowerCase();
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        var existingOt = (rows[i][2] || "").toString().trim().toLowerCase();
        if (existingOt === otClean) {
          return ContentService
            .createTextOutput(JSON.stringify({ 
              "result": "error", 
              "error": "La Orden de Trabajo / OT '" + data.ot + "' ya fue registrada previamente." 
            }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    var row = [
      timestamp, data.fecha || "", data.ot || "", data.cliente || "", data.tecnico || "",
      data.tipoUnidad || "", data.subtipoEquipo || "", data.marcaModelo || "", data.idTag || "", data.refrigerante || "",
      data.evap_gabinete || "", data.evap_gabinete_obs || "", data.evap_filtros || "", data.evap_filtros_obs || "",
      data.evap_serpentin || "", data.evap_serpentin_obs || "", data.evap_bandeja || "", data.evap_bandeja_obs || "",
      data.evap_drenaje || "", data.evap_drenaje_obs || "", data.evap_turbina || "", data.evap_turbina_obs || "",
      data.evap_motor || "", data.evap_motor_obs || "", data.evap_persianas || "", data.evap_persianas_obs || "",
      data.evap_conexiones || "", data.evap_conexiones_obs || "",
      data.cond_serpentin || "", data.cond_serpentin_obs || "", data.cond_aletas || "", data.cond_aletas_obs || "",
      data.cond_aspas || "", data.cond_aspas_obs || "", data.cond_motor || "", data.cond_motor_obs || "",
      data.cond_compresor || "", data.cond_compresor_obs || "", data.cond_aislamiento || "", data.cond_aislamiento_obs || "",
      data.cond_fugas || "", data.cond_fugas_obs || "", data.cond_soportes || "", data.cond_soportes_obs || "",
      data.elec_bornes || "", data.elec_bornes_obs || "", data.elec_capacitores || "", data.elec_cap_comp || "",
      data.elec_cap_vent || "", data.elec_capacitores_obs || "", data.elec_tarjetas || "", data.elec_tarjetas_obs || "",
      data.elec_protecciones || "", data.elec_protecciones_obs || "", data.elec_tierra || "", data.elec_tierra_obs || "",
      data.med_voltaje || "", data.med_corriente_comp || "", data.med_corriente_vent || "", data.med_presion_baja || "",
      data.med_presion_alta || "", data.med_control_remoto || "", data.observaciones_finales || "",
      data.nombre_tecnico_firma || "", data.firma_tecnico || "", data.nombre_cliente_firma || "", data.firma_cliente || ""
    ];

    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ "result": "success", "row": sheet.getLastRow() })).setMimeType(ContentService.MimeType.JSON);
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
