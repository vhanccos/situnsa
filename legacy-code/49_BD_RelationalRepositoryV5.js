/**
 * ==============================================================
 * BD-05 - REPOSITORY RELACIONAL GENERICO (LECTURA SEGURA)
 * ==============================================================
 * Capa de acceso a BD_TITULACION_RELACIONAL_V2.
 * NO reemplaza todavía los repositories productivos.
 * NO escribe datos salvo que una fase posterior lo habilite.
 * ==============================================================
 */

const BD5_CONFIG = Object.freeze({
  version: 'db-5.0-repository-relacional',
  propertyMode: 'BD_PERSISTENCE_MODE',
  modes: Object.freeze({ LEGACY: 'LEGACY', MIRROR_READ: 'MIRROR_READ', RELATIONAL_READ: 'RELATIONAL_READ' }),
  defaultMode: 'MIRROR_READ'
});

/*
 * Caché de ejecución. Una llamada del navegador puede consultar la misma tabla
 * varias veces (expediente, participantes, programa, etapas y subetapas).
 * Antes cada consulta ejecutaba getValues() nuevamente. Este mapa conserva la
 * matriz durante UNA ejecución de Apps Script, sin riesgo de datos obsoletos
 * entre usuarios ni límite de 100 KB de CacheService.
 */
var BD5_MEMORIA_EJECUCION_ = {};

function BD5_invalidarMemoria_(tabla) {
  if (!tabla) {
    BD5_MEMORIA_EJECUCION_ = {};
    return;
  }
  delete BD5_MEMORIA_EJECUCION_[BD5_upper_(tabla)];
}

function BD5_normalizar_(v) { return String(v == null ? '' : v).trim(); }
function BD5_upper_(v) { return BD5_normalizar_(v).toUpperCase(); }
function BD5_lower_(v) { return BD5_normalizar_(v).toLowerCase(); }

function BD5_getMode_() {
  var p = PropertiesService.getScriptProperties();
  var mode = BD5_upper_(p.getProperty(BD5_CONFIG.propertyMode) || BD5_CONFIG.defaultMode);
  var permitidos = Object.keys(BD5_CONFIG.modes).map(function(k){ return BD5_CONFIG.modes[k]; });
  return permitidos.indexOf(mode) >= 0 ? mode : BD5_CONFIG.defaultMode;
}

function BD5_SET_MODE(mode) {
  var m = BD5_upper_(mode);
  var permitidos = Object.keys(BD5_CONFIG.modes).map(function(k){ return BD5_CONFIG.modes[k]; });
  if (permitidos.indexOf(m) < 0) throw new Error('Modo no permitido: ' + mode);
  PropertiesService.getScriptProperties().setProperty(BD5_CONFIG.propertyMode, m);
  var out = {status:true, fase:'BD-05', mode:m, escrituraRelacionalHabilitada:false};
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD5_abrirBase_() {
  if (typeof BD2_abrirBase_ === 'function') return BD2_abrirBase_();
  var id = PropertiesService.getScriptProperties().getProperty('BD_RELACIONAL_SPREADSHEET_ID');
  if (!id) return null;
  try { return SpreadsheetApp.openById(id); } catch(e) { return null; }
}

function BD5_tabla_(tabla) {
  var ss = BD5_abrirBase_();
  if (!ss) throw new Error('No se encontró BD_TITULACION_RELACIONAL_V2.');
  var nombre = (typeof BD2_nombreHoja_ === 'function') ? BD2_nombreHoja_(tabla) : BD5_upper_(tabla);
  var sh = ss.getSheetByName(nombre);
  if (!sh) throw new Error('No existe la tabla relacional: ' + nombre);
  return sh;
}

function BD5_matrix_(tabla) {
  var clave = BD5_upper_(tabla);
  if (BD5_MEMORIA_EJECUCION_[clave]) return BD5_MEMORIA_EJECUCION_[clave];
  var sh = BD5_tabla_(tabla);
  var lastCol = sh.getLastColumn();
  if (!lastCol) return {sheet:sh, headers:[], rows:[], index:{}};
  var lastRow = Math.max(1, sh.getLastRow());
  var values = sh.getRange(1,1,lastRow,lastCol).getValues();
  var headers = (values[0] || []).map(function(x){return BD5_upper_(x);});
  var index = {};
  headers.forEach(function(h,i){ if(h && index[h] == null) index[h]=i; });
  var matriz = {sheet:sh, headers:headers, rows:values.slice(1), index:index};
  BD5_MEMORIA_EJECUCION_[clave] = matriz;
  return matriz;
}

function BD5_rowObject_(headers,row) {
  var obj={};
  headers.forEach(function(h,i){ if(h) obj[h]=row[i]; });
  return obj;
}

function BD5_listar_(tabla) {
  var m=BD5_matrix_(tabla);
  return m.rows.filter(function(r){return r.some(function(v){return v!=='' && v!=null;});})
    .map(function(r){return BD5_rowObject_(m.headers,r);});
}

function BD5_buscarUno_(tabla,campo,valor) {
  var c=BD5_upper_(campo), buscado=BD5_normalizar_(valor);
  var rows=BD5_listar_(tabla);
  for(var i=0;i<rows.length;i++) if(BD5_normalizar_(rows[i][c])===buscado) return rows[i];
  return null;
}

function BD5_filtrar_(tabla,criterios) {
  criterios=criterios||{};
  var keys=Object.keys(criterios);
  return BD5_listar_(tabla).filter(function(obj){
    return keys.every(function(k){
      var kk=BD5_upper_(k);
      return BD5_normalizar_(obj[kk])===BD5_normalizar_(criterios[k]);
    });
  });
}

const REPO_RelacionalV5 = Object.freeze({
  mode: BD5_getMode_,
  listar: BD5_listar_,
  buscarUno: BD5_buscarUno_,
  filtrar: BD5_filtrar_,
  obtenerExpedientePorCodigo: function(codigo){ return BD5_buscarUno_('expedientes','CODIGO_TRAMITE',BD5_upper_(codigo)); },
  obtenerEstudiantePorDni: function(dni){ return BD5_buscarUno_('estudiantes','DNI',String(dni||'').replace(/\D/g,'')); },
  obtenerUsuarioPorCorreo: function(correo){ return BD5_buscarUno_('usuarios','CORREO',BD5_lower_(correo)); },
  obtenerParticipantesExpediente: function(idExpediente){
    var rel=BD5_filtrar_('expediente_estudiantes',{ID_EXPEDIENTE:idExpediente});
    return rel.map(function(x){return BD5_buscarUno_('estudiantes','ID_ESTUDIANTE',x.ID_ESTUDIANTE);}).filter(Boolean);
  },
  obtenerEtapasExpediente: function(idExpediente){ return BD5_filtrar_('expediente_etapas',{ID_EXPEDIENTE:idExpediente}); },
  obtenerSubetapasExpediente: function(idExpediente){ return BD5_filtrar_('expediente_subetapas',{ID_EXPEDIENTE:idExpediente}); },
  obtenerDocumentosExpediente: function(idExpediente){ return BD5_filtrar_('documentos',{ID_EXPEDIENTE:idExpediente}); }
});

function BD5_PROBAR_REPOSITORY_RELACIONAL() {
  var ss=BD5_abrirBase_();
  var tests={};
  var tablas=['usuarios','estudiantes','programas','expedientes','expediente_estudiantes','expediente_etapas','expediente_subetapas','documentos'];
  tablas.forEach(function(t){
    try { tests[t]={status:true,registros:BD5_listar_(t).length}; }
    catch(e){ tests[t]={status:false,error:e.message}; }
  });
  var errores=Object.keys(tests).filter(function(k){return !tests[k].status;});
  var out={status:!!ss && errores.length===0,fase:'BD-05',version:BD5_CONFIG.version,mode:BD5_getMode_(),soloLectura:true,escrituraRelacionalHabilitada:false,tests:tests,errores:errores};
  Logger.log(JSON.stringify(out,null,2));
  return out;
}
