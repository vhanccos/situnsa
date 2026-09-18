/**
 * ==============================================================
 * BD-06 - GATEWAY DE REPOSITORIES (LECTURA SELECTIVA)
 * ==============================================================
 * Gateway desacoplado. Aun NO sustituye los repositories productivos.
 * Permite probar la futura conmutacion sin tocar frontend/Services.
 * ==============================================================
 */

function BD6_legacyExpedientePorCodigo_(codigo) {
  var src = (typeof BD3_sources_ === 'function') ? BD3_sources_() : {};
  var sh = src.expedientes;
  if (!sh || sh.getLastRow() < 2) return null;

  var vals = sh.getDataRange().getValues();
  var headers = (vals[0] || []).map(function(x) { return String(x == null ? '' : x).trim().toUpperCase(); });
  var idx = {};
  headers.forEach(function(h, i) { if (h && idx[h] == null) idx[h] = i; });
  var buscado = String(codigo || '').trim().toUpperCase();

  for (var i = 1; i < vals.length; i++) {
    var actual = idx['N° DE TRÁMITE'] == null ? '' : String(vals[i][idx['N° DE TRÁMITE']] || '').trim().toUpperCase();
    if (actual === buscado) {
      return {
        CODIGO_TRAMITE: actual,
        DNI: idx['DNI'] == null ? '' : String(vals[i][idx['DNI']] || '').replace(/\D/g, ''),
        DNI02: idx['DNI02'] == null ? '' : String(vals[i][idx['DNI02']] || '').replace(/\D/g, ''),
        NOMBRES: idx['NOMBRES'] == null ? '' : vals[i][idx['NOMBRES']],
        NOMBRES02: idx['NOMBRES02'] == null ? '' : vals[i][idx['NOMBRES02']]
      };
    }
  }
  return null;
}

function BD6_relExpedientePorCodigo_(codigo) {
  if (typeof REPO_RelacionalV5 === 'undefined') throw new Error('REPO_RelacionalV5 no disponible.');
  return REPO_RelacionalV5.obtenerExpedientePorCodigo(codigo);
}

function BD6_compararExpedienteUnitario_(codigo, legacy, rel) {
  if (!legacy && !rel) return { status: true, diferencias: [] };
  var dif = [];
  if (!!legacy !== !!rel) {
    dif.push({ campo: 'EXISTENCIA', legacy: !!legacy, relacional: !!rel });
    return { status: false, diferencias: dif };
  }

  var idExp = rel ? rel.ID_EXPEDIENTE : '';
  var participantes = rel && typeof REPO_RelacionalV5 !== 'undefined'
    ? REPO_RelacionalV5.obtenerParticipantesExpediente(idExp)
    : [];
  var dnisRel = participantes.map(function(p) { return String(p.DNI || '').replace(/\D/g, ''); }).filter(Boolean).sort();
  var dnisLegacy = [legacy.DNI, legacy.DNI02].filter(Boolean).sort();
  if (JSON.stringify(dnisLegacy) !== JSON.stringify(dnisRel)) {
    dif.push({ campo: 'PARTICIPANTES', legacy: dnisLegacy, relacional: dnisRel });
  }
  return { status: dif.length === 0, diferencias: dif };
}

const REPO_GatewayV6 = Object.freeze({
  config: function() { return BD6_GET_CONFIG(); },

  obtenerExpedientePorCodigo: function(codigo) {
    var r = BD6_resolverLectura_();
    var legacy = null;
    var rel = null;

    if (r.mode === 'RELATIONAL') {
      rel = BD6_relExpedientePorCodigo_(codigo);
      return { fuente: 'RELACIONAL', data: rel, mirror: null };
    }

    legacy = BD6_legacyExpedientePorCodigo_(codigo);
    if (r.compararEnSombra) {
      rel = BD6_relExpedientePorCodigo_(codigo);
      return {
        fuente: 'LEGACY',
        data: legacy,
        mirror: BD6_compararExpedienteUnitario_(codigo, legacy, rel)
      };
    }

    return { fuente: 'LEGACY', data: legacy, mirror: null };
  },

  existeDni: function(dni) {
    var limpio = String(dni || '').replace(/\D/g, '');
    var r = BD6_resolverLectura_();
    var legacy = (typeof REPO_ExpedienteV2 !== 'undefined' && typeof REPO_ExpedienteV2.existeDni === 'function')
      ? !!REPO_ExpedienteV2.existeDni(limpio)
      : false;
    var rel = (typeof REPO_RelacionalV5 !== 'undefined')
      ? !!REPO_RelacionalV5.obtenerEstudiantePorDni(limpio)
      : false;

    if (r.mode === 'RELATIONAL') return { fuente: 'RELACIONAL', value: rel, mirror: null };
    if (r.compararEnSombra) return { fuente: 'LEGACY', value: legacy, mirror: { status: legacy === rel, legacy: legacy, relacional: rel } };
    return { fuente: 'LEGACY', value: legacy, mirror: null };
  },

  assertWrite: function() {
    return BD6_assertWriteLegacy_();
  }
});

function BD6_PROBAR_GATEWAY() {
  var comparacion = (typeof BD5_COMPARAR_EXPEDIENTES === 'function')
    ? BD5_COMPARAR_EXPEDIENTES()
    : { status: false, diferencias: [{ tipo: 'BD5_NO_DISPONIBLE' }] };

  var expedientes = (typeof BD5_listar_ === 'function') ? BD5_listar_('expedientes') : [];
  var muestra = expedientes.length ? expedientes[0].CODIGO_TRAMITE : '';
  var lectura = muestra ? REPO_GatewayV6.obtenerExpedientePorCodigo(muestra) : null;

  return {
    status: comparacion.status,
    muestraCodigo: muestra,
    lectura: lectura,
    comparacionGlobal: comparacion
  };
}

function BD6_PROBAR_DIAGNOSTICO() {
  var cfg = BD6_GET_CONFIG();
  var gateway = BD6_PROBAR_GATEWAY();
  var integrity = null;
  try {
    if (typeof BD4_PROBAR_RESUMEN === 'function') integrity = BD4_PROBAR_RESUMEN();
  } catch (e) {
    integrity = { status: false, error: e.message };
  }

  var errores = [];
  if (!cfg.lecturaRelacionalDisponible) errores.push('REPO_RELACIONAL_NO_DISPONIBLE');
  if (!gateway.status) errores.push('DIFERENCIAS_LECTURA_ESPEJO');
  if (cfg.writeMode !== 'LEGACY') errores.push('WRITE_MODE_INSEGURO');

  var advertencias = [];
  if (integrity && integrity.status === false) {
    advertencias.push('BD-04 mantiene incidencias de calidad; no se habilitan escrituras relacionales.');
  }

  var out = {
    status: errores.length === 0,
    fase: 'BD-06',
    version: BD6_CONFIG.version,
    selector: {
      readMode: cfg.readMode,
      writeMode: cfg.writeMode,
      modosLecturaPermitidos: BD6_valores_(BD6_CONFIG.readModes)
    },
    gateway: {
      status: gateway.status,
      muestraCodigo: gateway.muestraCodigo,
      fuenteDevuelta: gateway.lectura ? gateway.lectura.fuente : null,
      mirrorStatus: gateway.lectura && gateway.lectura.mirror ? gateway.lectura.mirror.status : null
    },
    comparacionExpedientes: gateway.comparacionGlobal,
    integridadBD04: integrity ? { status: integrity.status, resumen: integrity.resumen || null } : null,
    escrituraRelacionalHabilitada: false,
    frontendModificado: false,
    servicesModificados: false,
    repositoriesProductivosReemplazados: false,
    datosLegacyModificados: false,
    datosRelacionalesModificados: false,
    errores: errores,
    advertencias: advertencias
  };

  Logger.log(JSON.stringify(out, null, 2));
  return out;
}
