/**
 * ==============================================================
 * BD-06 - SELECTOR DE PERSISTENCIA / ROUTER SEGURO
 * ==============================================================
 * Objetivo:
 * - Centralizar la seleccion de backend para LECTURAS.
 * - Mantener TODAS las escrituras en LEGACY durante BD-06.
 * - No modifica frontend ni Services existentes.
 * - Preparado para ser consumido por adapters/repositories en BD-07.
 * ==============================================================
 */

const BD6_CONFIG = Object.freeze({
  version: 'db-6.0-persistence-router',
  propertyReadMode: 'BD6_READ_MODE',
  propertyWriteMode: 'BD6_WRITE_MODE',
  readModes: Object.freeze({
    LEGACY: 'LEGACY',
    MIRROR: 'MIRROR',
    RELATIONAL: 'RELATIONAL'
  }),
  writeModes: Object.freeze({
    LEGACY: 'LEGACY'
  }),
  defaultReadMode: 'MIRROR',
  defaultWriteMode: 'LEGACY'
});

function BD6_norm_(v) {
  return String(v == null ? '' : v).trim().toUpperCase();
}

function BD6_valores_(obj) {
  return Object.keys(obj).map(function(k) { return obj[k]; });
}

function BD6_getReadMode_() {
  var p = PropertiesService.getScriptProperties();
  var mode = BD6_norm_(p.getProperty(BD6_CONFIG.propertyReadMode) || BD6_CONFIG.defaultReadMode);
  return BD6_valores_(BD6_CONFIG.readModes).indexOf(mode) >= 0 ? mode : BD6_CONFIG.defaultReadMode;
}

function BD6_getWriteMode_() {
  // En BD-06 la escritura queda deliberadamente bloqueada a LEGACY.
  return BD6_CONFIG.defaultWriteMode;
}

function BD6_GET_CONFIG() {
  return {
    status: true,
    fase: 'BD-06',
    version: BD6_CONFIG.version,
    readMode: BD6_getReadMode_(),
    writeMode: BD6_getWriteMode_(),
    lecturaRelacionalDisponible: typeof REPO_RelacionalV5 !== 'undefined',
    escrituraRelacionalHabilitada: false,
    frontendModificado: false,
    servicesModificados: false,
    repositoriesProductivosReemplazados: false
  };
}

function BD6_SET_READ_MODE(mode) {
  var m = BD6_norm_(mode);
  var permitidos = BD6_valores_(BD6_CONFIG.readModes);
  if (permitidos.indexOf(m) < 0) {
    throw new Error('Modo de lectura no permitido: ' + mode + '. Permitidos: ' + permitidos.join(', '));
  }
  PropertiesService.getScriptProperties().setProperty(BD6_CONFIG.propertyReadMode, m);
  var out = BD6_GET_CONFIG();
  out.cambioAplicado = true;
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

function BD6_SET_WRITE_MODE(mode) {
  var m = BD6_norm_(mode);
  if (m !== 'LEGACY') {
    throw new Error('BD-06 bloquea escrituras relacionales. WRITE solo puede ser LEGACY.');
  }
  PropertiesService.getScriptProperties().setProperty(BD6_CONFIG.propertyWriteMode, 'LEGACY');
  var out = BD6_GET_CONFIG();
  out.cambioAplicado = true;
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

function BD6_RESET_SAFE_MODE() {
  var p = PropertiesService.getScriptProperties();
  p.setProperty(BD6_CONFIG.propertyReadMode, 'MIRROR');
  p.setProperty(BD6_CONFIG.propertyWriteMode, 'LEGACY');
  var out = BD6_GET_CONFIG();
  out.resetSeguro = true;
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

/**
 * Devuelve de donde debe salir una lectura.
 * LEGACY      -> el caller usa backend legacy.
 * RELATIONAL  -> el caller usa REPO_RelacionalV5.
 * MIRROR      -> el caller devuelve legacy y puede comparar relacional en sombra.
 */
function BD6_resolverLectura_() {
  var mode = BD6_getReadMode_();
  return {
    mode: mode,
    fuentePrincipal: mode === 'RELATIONAL' ? 'RELACIONAL' : 'LEGACY',
    compararEnSombra: mode === 'MIRROR',
    escritura: 'LEGACY'
  };
}

function BD6_assertWriteLegacy_() {
  if (BD6_getWriteMode_() !== 'LEGACY') {
    throw new Error('Bloqueo de seguridad BD-06: escritura distinta de LEGACY.');
  }
  return true;
}
