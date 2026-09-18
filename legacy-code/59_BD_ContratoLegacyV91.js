/**
 * ==============================================================
 * BD-09.1 - CORRECCION DE CONTRATO LEGACY / DOCUMENTAL
 * ==============================================================
 * Conserva las 54 etiquetas historicas utilizadas por EXPEDIENTES
 * y por las plantillas de documentos, sin volver a duplicar los
 * datos de estudiante dentro de la tabla relacional.
 *
 * Seguridad:
 * - Nunca escribe en el Spreadsheet legacy.
 * - Solo agrega columnas faltantes a EXPEDIENTES relacional.
 * - Migra campos escalares del expediente desde legacy.
 * - Participantes/usuario/programa continúan normalizados.
 * ==============================================================
 */

const BD91_CONFIG = Object.freeze({
  version: 'db-9.1-contrato-legacy-documental',
  legacySpreadsheetIdFallback: '1KyfnlKsbDIA5GpJiW2jVb0eWN8NA3W66I-5qzW3N_O8',
  legacySheetName: 'EXPEDIENTES',
  relationalSheetName: 'EXPEDIENTES'
});

const BD91_LEGACY_COLUMNS = Object.freeze([
  'N° DE TRÁMITE','GRUPO','FECHA DE EXP','HORA DE EXP','ADMIN','CORREO_ADMIN',
  'NOMBRES','NOM_MIN','DNI','PROGRAMAS','PROGR_MIN','CORREO','CORREO_MIN','CUI',
  'TELEFONO','NACIONALIDAD','CIUDAD','DIRECCION','NOMBRES02','NOM_MIN02','DNI02',
  'PROGRAMAS02','PROGR_MIN02','CORREO02','CORREO_MIN02','CUI02','TELEFONO02',
  'NACIONALIDAD02','CIUDAD02','DIRECCION02','FECHA PRESENTACION','FECHA DE APERTURA',
  'MODALIDAD','MODALIDAD02','DECRETO','TESIS','TESIS02','RECOMENDACION','PRESIDENTE',
  'ASESOR','ASE_MINU','SECRETARIO','CO ASESOR','FECHA','OFICIO','INTEGRANTE','PRESIDENTE02',
  'SECRETARIO02','SUPLENTE02','DECANAL','FECHA - ACTAS','HORAS - ACTAS',
  'LUGAR DE SUSTENTACION','MODALIDAD FINAL'
]);

const BD91_EXPEDIENTE_PHYSICAL_MAP = Object.freeze({
  'GRUPO': 'GRUPO',
  'FECHA DE EXP': 'FECHA_EXP',
  'HORA DE EXP': 'HORA_EXP',
  'FECHA PRESENTACION': 'FECHA_PRESENTACION',
  'FECHA DE APERTURA': 'FECHA_APERTURA',
  'MODALIDAD': 'MODALIDAD',
  'MODALIDAD02': 'MODALIDAD_02',
  'DECRETO': 'DECRETO',
  'TESIS': 'TESIS',
  'TESIS02': 'TESIS_02',
  'RECOMENDACION': 'RECOMENDACION',
  'PRESIDENTE': 'PRESIDENTE',
  'ASESOR': 'ASESOR',
  'ASE_MINU': 'ASE_MINU',
  'SECRETARIO': 'SECRETARIO',
  'CO ASESOR': 'CO_ASESOR',
  'FECHA': 'FECHA',
  'OFICIO': 'OFICIO',
  'INTEGRANTE': 'INTEGRANTE',
  'PRESIDENTE02': 'PRESIDENTE_02',
  'SECRETARIO02': 'SECRETARIO_02',
  'SUPLENTE02': 'SUPLENTE_02',
  'DECANAL': 'DECANAL',
  'FECHA - ACTAS': 'FECHA_ACTAS',
  'HORAS - ACTAS': 'HORAS_ACTAS',
  'LUGAR DE SUSTENTACION': 'LUGAR_SUSTENTACION',
  'MODALIDAD FINAL': 'MODALIDAD_FINAL'
});

function BD91_PREVISUALIZAR_CORRECCION() {
  var ctx = BD91_contexto_();
  var legacy = BD91_matrix_(ctx.legacy);
  var rel = BD91_matrix_(ctx.rel);
  var faltantesLegacy = BD91_LEGACY_COLUMNS.filter(function(c){ return !(c in legacy.idx); });
  var requeridasRel = Object.keys(BD91_EXPEDIENTE_PHYSICAL_MAP).map(function(k){ return BD91_EXPEDIENTE_PHYSICAL_MAP[k]; });
  var faltantesRel = requeridasRel.filter(function(c){ return !(c in rel.idx); });
  var result = {
    status: faltantesLegacy.length === 0,
    fase: 'BD-09.1',
    version: BD91_CONFIG.version,
    contratoLegacy: { esperadas: BD91_LEGACY_COLUMNS.length, encontradas: BD91_LEGACY_COLUMNS.length - faltantesLegacy.length, faltantes: faltantesLegacy },
    expedienteRelacional: { columnasFisicasRequeridas: requeridasRel.length, columnasPorAgregar: faltantesRel },
    expedientesLegacy: Math.max(legacy.values.length - 1, 0),
    expedientesRelacional: Math.max(rel.values.length - 1, 0),
    modificaLegacy: false,
    modificaRelacional: false,
    siguientePaso: 'BD91_APLICAR_CORRECCION()'
  };
  Logger.log(JSON.stringify(result,null,2));
  return result;
}

function BD91_APLICAR_CORRECCION() {
  var ctx = BD91_contexto_();
  var legacy = BD91_matrix_(ctx.legacy);
  var rel = BD91_matrix_(ctx.rel);
  var faltantesLegacy = BD91_LEGACY_COLUMNS.filter(function(c){ return !(c in legacy.idx); });
  if (faltantesLegacy.length) throw new Error('Faltan columnas legacy requeridas: ' + faltantesLegacy.join(', '));

  var physical = [];
  Object.keys(BD91_EXPEDIENTE_PHYSICAL_MAP).forEach(function(k){
    var col = BD91_EXPEDIENTE_PHYSICAL_MAP[k];
    if (physical.indexOf(col) < 0) physical.push(col);
  });

  var headersRel = rel.headers.slice();
  var agregadas = [];
  physical.forEach(function(col){
    if (headersRel.indexOf(col) < 0) { headersRel.push(col); agregadas.push(col); }
  });
  if (agregadas.length) {
    ctx.rel.getRange(1,1,1,headersRel.length).setValues([headersRel]);
    ctx.rel.setFrozenRows(1);
    rel = BD91_matrix_(ctx.rel);
  }

  var legacyByCode = {};
  for (var i=1;i<legacy.values.length;i++) {
    var code = BD91_str_(BD91_get_(legacy.values[i], legacy.idx, 'N° DE TRÁMITE'));
    if (code) legacyByCode[code] = legacy.values[i];
  }

  var actualizados = 0;
  var noEncontrados = [];
  for (var r=1;r<rel.values.length;r++) {
    var row = rel.values[r];
    var codeRel = BD91_str_(BD91_get_(row, rel.idx, 'CODIGO_TRAMITE'));
    if (!codeRel) continue;
    var src = legacyByCode[codeRel];
    if (!src) { noEncontrados.push(codeRel); continue; }

    Object.keys(BD91_EXPEDIENTE_PHYSICAL_MAP).forEach(function(tag){
      var dest = BD91_EXPEDIENTE_PHYSICAL_MAP[tag];
      var v = BD91_get_(src, legacy.idx, tag);
      row[rel.idx[dest]] = v;
    });
    // Mantener equivalencias historicas sin eliminar campos normalizados existentes.
    if ('FECHA_CREACION' in rel.idx && 'FECHA DE EXP' in legacy.idx) row[rel.idx.FECHA_CREACION] = BD91_get_(src, legacy.idx, 'FECHA DE EXP');
    actualizados++;
  }

  if (rel.values.length > 1 && rel.headers.length) {
    ctx.rel.getRange(2,1,rel.values.length-1,rel.headers.length).setValues(rel.values.slice(1));
  }

  var result = {
    status: true,
    fase: 'BD-09.1',
    version: BD91_CONFIG.version,
    columnasContrato: BD91_LEGACY_COLUMNS.length,
    columnasAgregadas: agregadas,
    expedientesActualizados: actualizados,
    expedientesSinFuenteLegacy: noEncontrados,
    datosLegacyModificados: false,
    datosRelacionalesModificados: actualizados > 0 || agregadas.length > 0,
    nota: 'Participantes, programas y administrador permanecen normalizados; las etiquetas se reconstruyen con BD91_DOCUMENT_TAGS().'
  };
  Logger.log(JSON.stringify(result,null,2));
  return result;
}

function BD91_contexto_() {
  var relId = PropertiesService.getScriptProperties().getProperty('BD_RELACIONAL_SPREADSHEET_ID');
  if (!relId) throw new Error('No existe BD_RELACIONAL_SPREADSHEET_ID.');
  var relSs = SpreadsheetApp.openById(relId);
  var rel = relSs.getSheetByName(BD91_CONFIG.relationalSheetName);
  if (!rel) throw new Error('No existe hoja relacional EXPEDIENTES.');

  var legacyId = PropertiesService.getScriptProperties().getProperty('BD91_LEGACY_EXPEDIENTES_ID');
  if (!legacyId && typeof REPO_EXPEDIENTE_V10_CONFIG !== 'undefined' && REPO_EXPEDIENTE_V10_CONFIG.spreadsheetId) legacyId = REPO_EXPEDIENTE_V10_CONFIG.spreadsheetId;
  if (!legacyId) legacyId = BD91_CONFIG.legacySpreadsheetIdFallback;
  var legacySs = SpreadsheetApp.openById(legacyId);
  var legacy = legacySs.getSheetByName(BD91_CONFIG.legacySheetName) || legacySs.getSheets()[0];
  if (!legacy) throw new Error('No se encontro la hoja legacy EXPEDIENTES.');
  return { rel: rel, legacy: legacy };
}

function BD91_matrix_(sh) {
  var values = sh.getDataRange().getValues();
  if (!values.length) return {values:[],headers:[],idx:{}};
  var headers = values[0].map(function(x){ return BD91_str_(x); });
  var idx = {};
  headers.forEach(function(h,i){ if (h) idx[h] = i; });
  return {values:values,headers:headers,idx:idx};
}
function BD91_get_(row, idx, key) { return (key in idx) ? row[idx[key]] : ''; }
function BD91_str_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
