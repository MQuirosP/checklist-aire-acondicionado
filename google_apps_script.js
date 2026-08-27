/**
 * GOOGLE APPS SCRIPT - PERSISTENCIA DE CHECKLIST DE AIRE ACONDICIONADO
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Crea una nueva Hoja de Cálculo en Google Sheets (ej. "Mantenimientos Aire Acondicionado").
 * 2. Ve a Extensiones -> Apps Script.
 * 3. Borra el código existente y pega todo este contenido.
 * 4. Haz clic en "Desplegar" -> "Nuevo despliegue".
 * 5. Selecciona el tipo "Aplicación web".
 * 6. En "Ejecutar como": Selecciona "Yo (tu email)".
 * 7. En "Quién tiene acceso": Selecciona "Cualquier persona" (Anyone).
 * 8. Haz clic en "Desplegar", otorga los permisos necesarios y copia la "URL de la aplicación web".
 * 9. Pega esa URL en el archivo `app.js` en la constante `GOOGLE_SCRIPT_URL`.
 */

// Si usaste script.google.com (Opción 2), pega el ID de tu Hoja de Cálculo entre las comillas.
// Ejemplo: var SPREADSHEET_ID = "1ABC123xyz456...";
var SPREADSHEET_ID = "";

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

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
    
    var ss = getSpreadsheet();
    if (!ss) {
      throw new Error("No se encontró la Hoja de Cálculo. Configura el SPREADSHEET_ID en el script.");
    }
    var sheet = ss.getActiveSheet();
      var headers = [
        "Fecha / Hora Registro",
        "Fecha Inspección",
        "N° Orden / OT",
        "Cliente / Ubicación",
        "Técnico Responsable",
        "Tipo de Unidad",
        "Marca / Modelo",
        "ID / Tag Equipo",
        "Refrigerante",
        
        // 1. Evaporadora
        "Evap: Gabinete Externo",
        "Evap: Gabinete Obs",
        "Evap: Filtros Aire",
        "Evap: Filtros Obs",
        "Evap: Serpentín Evaporador",
        "Evap: Serpentín Obs",
        "Evap: Bandeja Condensados / Biocidas",
        "Evap: Bandeja Obs",
        "Evap: Drenaje Obstrucciones",
        "Evap: Drenaje Obs",
        "Evap: Turbina / Fan Tangencial",
        "Evap: Turbina Obs",
        "Evap: Motor Vent / Rodajes",
        "Evap: Motor Vent Obs",
        "Evap: Persianas Swing / Motor paso",
        "Evap: Persianas Obs",
        "Evap: Conexiones Eléctricas / Termistores",
        "Evap: Conexiones Obs",
        
        // 2. Condensadora
        "Cond: Serpentín Condensador",
        "Cond: Serpentín Obs",
        "Cond: Aletas Aluminio",
        "Cond: Aletas Obs",
        "Cond: Aspas Ventilador",
        "Cond: Aspas Obs",
        "Cond: Motor Vent / Rodamientos",
        "Cond: Motor Vent Obs",
        "Cond: Compresor (Ruido/Amortiguadores)",
        "Cond: Compresor Obs",
        "Cond: Aislamiento Térmico Tuberías",
        "Cond: Aislamiento Obs",
        "Cond: Fugas Refrigerante / Aceite",
        "Cond: Fugas Obs",
        "Cond: Soportes y Anclajes",
        "Cond: Soportes Obs",
        
        // 3. Eléctrico y Electrónico
        "Elec: Reajuste Bornes",
        "Elec: Bornes Obs",
        "Elec: Capacitores Medición",
        "Elec: Capacitor Comp (µF)",
        "Elec: Capacitor Vent (µF)",
        "Elec: Capacitores Obs",
        "Elec: Tarjetas PCB / Errores",
        "Elec: Tarjetas Obs",
        "Elec: Protecciones Eléctricas",
        "Elec: Protecciones Obs",
        "Elec: Conexión Tierra Física",
        "Elec: Tierra Obs",
        
        // 4. Pruebas Operativas
        "Med: Voltaje (V AC)",
        "Med: Corriente Compresor (A)",
        "Med: Corriente Motor Ext (A)",
        "Med: Presión Baja (PSI)",
        "Med: Presión Alta (PSI)",
        "Med: Temp Inyección (°C)",
        "Med: Temp Retorno (°C)",
        "Med: Delta T (°C)",
        "Med: Superheat / Subcooling",
        "Med: Control Remoto Estado",
        
        // 5. Diagnóstico & Observaciones Finales
        "Diagnóstico y Observaciones Finales",
        
        // Firmas / Nombres
        "Nombre Técnico",
        "Firma Técnico (DataURL)",
        "Nombre Cliente",
        "Firma Cliente (DataURL)"
      ];
      
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
      sheet.setFrozenRows(1);
    }

    var timestamp = new Date();

    var row = [
      timestamp,
      data.fecha || "",
      data.ot || "",
      data.cliente || "",
      data.tecnico || "",
      data.tipoUnidad || "",
      data.marcaModelo || "",
      data.idTag || "",
      data.refrigerante || "",
      
      // Section 1
      data.evap_gabinete || "",
      data.evap_gabinete_obs || "",
      data.evap_filtros || "",
      data.evap_filtros_obs || "",
      data.evap_serpentin || "",
      data.evap_serpentin_obs || "",
      data.evap_bandeja || "",
      data.evap_bandeja_obs || "",
      data.evap_drenaje || "",
      data.evap_drenaje_obs || "",
      data.evap_turbina || "",
      data.evap_turbina_obs || "",
      data.evap_motor || "",
      data.evap_motor_obs || "",
      data.evap_persianas || "",
      data.evap_persianas_obs || "",
      data.evap_conexiones || "",
      data.evap_conexiones_obs || "",
      
      // Section 2
      data.cond_serpentin || "",
      data.cond_serpentin_obs || "",
      data.cond_aletas || "",
      data.cond_aletas_obs || "",
      data.cond_aspas || "",
      data.cond_aspas_obs || "",
      data.cond_motor || "",
      data.cond_motor_obs || "",
      data.cond_compresor || "",
      data.cond_compresor_obs || "",
      data.cond_aislamiento || "",
      data.cond_aislamiento_obs || "",
      data.cond_fugas || "",
      data.cond_fugas_obs || "",
      data.cond_soportes || "",
      data.cond_soportes_obs || "",
      
      // Section 3
      data.elec_bornes || "",
      data.elec_bornes_obs || "",
      data.elec_capacitores || "",
      data.elec_cap_comp || "",
      data.elec_cap_vent || "",
      data.elec_capacitores_obs || "",
      data.elec_tarjetas || "",
      data.elec_tarjetas_obs || "",
      data.elec_protecciones || "",
      data.elec_protecciones_obs || "",
      data.elec_tierra || "",
      data.elec_tierra_obs || "",
      
      // Section 4
      data.med_voltaje || "",
      data.med_corriente_comp || "",
      data.med_corriente_vent || "",
      data.med_presion_baja || "",
      data.med_presion_alta || "",
      data.med_temp_inyeccion || "",
      data.med_temp_retorno || "",
      data.med_delta_t || "",
      data.med_superheat || "",
      data.med_control_remoto || "",
      
      // Section 5
      data.observaciones_finales || "",
      
      // Signatures
      data.nombre_tecnico_firma || "",
      data.firma_tecnico || "",
      data.nombre_cliente_firma || "",
      data.firma_cliente || ""
    ];

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ "result": "success", "row": sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "error", "error": e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var ss = getSpreadsheet();
    if (!ss) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    var sheet = ss.getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    if (rows.length < 2) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    var headers = rows[0];
    var data = [];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = row[j];
      }
      data.push(obj);
    }
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
