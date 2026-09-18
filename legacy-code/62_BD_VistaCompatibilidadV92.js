/**
 * ==============================================================
 * BD-09.2 - VISTA DE COMPATIBILIDAD LEGACY DE 54 COLUMNAS
 * ==============================================================
 * Google Sheets no posee VIEW SQL. Esta fase crea una hoja derivada
 * (materializada) llamada VISTA_EXPEDIENTES_LEGACY con exactamente
 * las 54 columnas historicas del sistema.
 *
 * La hoja NO es fuente de verdad ni debe editarse manualmente.
 * Se reconstruye desde las tablas relacionales normalizadas.
 * ==============================================================
 */

const BD92_CONFIG = Object.freeze({
  version: 'db-9.3-contrato-documental-normalizado',
  fase: 'BD-09.3',
  sheetName: 'VISTA_EXPEDIENTES_LEGACY'
});

function BD92_PREVISUALIZAR_VISTA() {
  var ss = BD92_abrirBase_();
  var exps = REPO_RelacionalV5.listar('expedientes') || [];
  var actual = ss.getSheetByName(BD92_CONFIG.sheetName);
  var out = {
    status: true,
    fase: BD92_CONFIG.fase,
    version: BD92_CONFIG.version,
    hojaVista: BD92_CONFIG.sheetName,
    columnas: BD91_LEGACY_COLUMNS.length,
    expedientesFuente: exps.length,
    vistaExisteActualmente: !!actual,
    modificaTablasBase: false,
    modificaLegacy: false,
    siguientePaso: 'BD92_CREAR_ACTUALIZAR_VISTA()'
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD92_CREAR_ACTUALIZAR_VISTA() {
  var ss = BD92_abrirBase_();
  var sh = ss.getSheetByName(BD92_CONFIG.sheetName);
  if (!sh) sh = ss.insertSheet(BD92_CONFIG.sheetName);

  var exps = REPO_RelacionalV5.listar('expedientes') || [];
  exps.sort(function(a,b){
    return BD92_str_(a.CODIGO_TRAMITE).localeCompare(BD92_str_(b.CODIGO_TRAMITE));
  });

  var rows = [];
  var errores = [];
  exps.forEach(function(exp){
    var code = BD92_str_(exp.CODIGO_TRAMITE);
    if (!code) return;
    try {
      var tags = BD91_DOCUMENT_TAGS(code);
      rows.push(BD91_LEGACY_COLUMNS.map(function(h){ return (h in tags) ? tags[h] : ''; }));
    } catch(e) {
      errores.push({expediente:code,error:e.message});
    }
  });

  // La vista es completamente regenerable. Solo se limpia esta hoja derivada.
  sh.clearContents();
  sh.clearFormats();
  sh.getRange(1,1,1,BD91_LEGACY_COLUMNS.length).setValues([BD91_LEGACY_COLUMNS]);
  if (rows.length) sh.getRange(2,1,rows.length,BD91_LEGACY_COLUMNS.length).setValues(rows);

  sh.setFrozenRows(1);
  sh.getRange(1,1,1,BD91_LEGACY_COLUMNS.length).setFontWeight('bold');
  sh.getDataRange().setVerticalAlignment('middle');

  // Identificadores/correos/telefonos se visualizan como texto para no perder ceros.
  var textCols = ['N° DE TRÁMITE','DNI','CUI','TELEFONO','DNI02','CUI02','TELEFONO02','CORREO','CORREO_MIN','CORREO02','CORREO_MIN02','CORREO_ADMIN'];
  textCols.forEach(function(h){
    var idx = BD91_LEGACY_COLUMNS.indexOf(h);
    if (idx >= 0) sh.getRange(2,idx+1,Math.max(rows.length,1),1).setNumberFormat('@');
  });

  sh.autoResizeColumns(1, BD91_LEGACY_COLUMNS.length);
  PropertiesService.getScriptProperties().setProperty('BD92_VIEW_LAST_REFRESH', new Date().toISOString());

  var out = {
    status: errores.length === 0,
    fase: BD92_CONFIG.fase,
    version: BD92_CONFIG.version,
    hojaVista: BD92_CONFIG.sheetName,
    columnas: BD91_LEGACY_COLUMNS.length,
    filasGeneradas: rows.length,
    expedientesFuente: exps.length,
    errores: errores,
    datosLegacyModificados: false,
    tablasRelacionalesBaseModificadas: false,
    vistaMaterializadaActualizada: true,
    nota: 'VISTA_EXPEDIENTES_LEGACY es derivada. No editar manualmente; regenerar con BD92_CREAR_ACTUALIZAR_VISTA().'
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD92_ACTUALIZAR_VISTA() {
  return BD92_CREAR_ACTUALIZAR_VISTA();
}

function BD92_OBTENER_FILA(codigoTramite) {
  var code = BD92_str_(codigoTramite);
  if (!code) throw new Error('codigoTramite es obligatorio.');
  return BD91_DOCUMENT_TAGS(code);
}

function BD92_abrirBase_() {
  if (typeof BD5_abrirBase_ === 'function') {
    var ss = BD5_abrirBase_();
    if (ss) return ss;
  }
  var id = PropertiesService.getScriptProperties().getProperty('BD_RELACIONAL_SPREADSHEET_ID');
  if (!id) throw new Error('No existe BD_RELACIONAL_SPREADSHEET_ID.');
  return SpreadsheetApp.openById(id);
}

function BD92_str_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
