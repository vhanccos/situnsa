/**
 * ==============================================================
 * BD-07 - ADAPTADOR PRODUCTIVO DE EXPEDIENTES AL ROUTER
 * ==============================================================
 * Integra el Repository de Expedientes con BD-06 sin cambiar el
 * contrato consumido por SOA_ExpedienteV2Service.
 *
 * SEGURIDAD BD-07:
 * - READ puede ser LEGACY / MIRROR / RELATIONAL.
 * - WRITE permanece SIEMPRE en LEGACY.
 * - MIRROR devuelve LEGACY y compara contra la base relacional.
 * - Rollback inmediato: BD7_ROLLBACK_LEGACY().
 * ==============================================================
 */

const BD7_CONFIG = Object.freeze({
  version: 'db-7.0-product-repository-router',
  modulo: 'EXPEDIENTES',
  writeBackend: 'LEGACY'
});

function BD7_relDnisExpedientes_() {
  if (typeof REPO_RelacionalV5 === 'undefined') throw new Error('REPO_RelacionalV5 no disponible.');
  var relaciones = REPO_RelacionalV5.listar('expediente_estudiantes');
  var estudiantes = REPO_RelacionalV5.listar('estudiantes');
  var porId = {};
  estudiantes.forEach(function(e) {
    var id = String(e.ID_ESTUDIANTE || '').trim();
    if (id) porId[id] = e;
  });
  var out = {};
  relaciones.forEach(function(r) {
    var e = porId[String(r.ID_ESTUDIANTE || '').trim()];
    if (!e) return;
    var dni = String(e.DNI || '').replace(/\D/g, '');
    if (dni) out[dni] = true;
  });
  return out;
}

function BD7_relSiguienteCodigo_() {
  if (typeof REPO_RelacionalV5 === 'undefined') throw new Error('REPO_RelacionalV5 no disponible.');
  var expedientes = REPO_RelacionalV5.listar('expedientes');
  var mayor = 0;
  expedientes.forEach(function(e) {
    var codigo = String(e.CODIGO_TRAMITE || '').trim().toUpperCase();
    var m = codigo.match(/\d+/);
    var n = m ? parseInt(m[0], 10) : 0;
    if (n > mayor) mayor = n;
  });
  return 'SET' + String(mayor + 1).padStart(3, '0');
}

function BD7_compararMapaDnis_(legacy, rel) {
  var a = Object.keys(legacy || {}).filter(function(k){ return legacy[k]; }).sort();
  var b = Object.keys(rel || {}).filter(function(k){ return rel[k]; }).sort();
  var soloLegacy = a.filter(function(x){ return b.indexOf(x) < 0; });
  var soloRel = b.filter(function(x){ return a.indexOf(x) < 0; });
  return {
    status: soloLegacy.length === 0 && soloRel.length === 0,
    legacy: a.length,
    relacional: b.length,
    soloLegacy: soloLegacy,
    soloRelacional: soloRel
  };
}

function BD7_logMirror_(tipo, detalle) {
  try {
    if (detalle && detalle.status === false) {
      Logger.log('[BD-07 MIRROR][' + tipo + '] ' + JSON.stringify(detalle));
    }
  } catch (e) {}
}

const REPO_ExpedienteRoutedV7 = Object.freeze({
  arquitectura: function() {
    var cfg = (typeof BD6_GET_CONFIG === 'function') ? BD6_GET_CONFIG() : null;
    return {
      fase: 'BD-07',
      version: BD7_CONFIG.version,
      modulo: BD7_CONFIG.modulo,
      readMode: cfg ? cfg.readMode : 'LEGACY',
      writeMode: 'LEGACY',
      rollbackDisponible: true
    };
  },

  dnisRegistrados: function() {
    var r = BD6_resolverLectura_();
    if (r.mode === 'RELATIONAL') return BD7_relDnisExpedientes_();
    var legacy = REPO_ExpedienteV2.dnisRegistrados();
    if (r.mode === 'LEGACY') return legacy;

    var rel = BD7_relDnisExpedientes_();

    var mirror = BD7_compararMapaDnis_(legacy, rel);
    BD7_logMirror_('DNIS_REGISTRADOS', mirror);
    return legacy;
  },

  existeDni: function(dni) {
    var limpio = String(dni || '').replace(/\D/g, '');
    if (!limpio) return false;
    var r = BD6_resolverLectura_();
    if (r.mode === 'RELATIONAL') return !!BD7_relDnisExpedientes_()[limpio];
    var legacy = !!REPO_ExpedienteV2.existeDni(limpio);
    if (r.mode === 'LEGACY') return legacy;

    var rel = !!BD7_relDnisExpedientes_()[limpio];

    BD7_logMirror_('EXISTE_DNI', {status: legacy === rel, dni: limpio, legacy: legacy, relacional: rel});
    return legacy;
  },

  siguienteCodigo: function() {
    var r = BD6_resolverLectura_();
    if (r.mode === 'RELATIONAL') return BD7_relSiguienteCodigo_();
    var legacy = REPO_ExpedienteV2.siguienteCodigo();
    if (r.mode === 'LEGACY') return legacy;

    var rel = BD7_relSiguienteCodigo_();

    BD7_logMirror_('SIGUIENTE_CODIGO', {status: legacy === rel, legacy: legacy, relacional: rel});
    return legacy;
  },

  insertar: function(solicitud, codigo) {
    if (typeof BD16_activo_ === 'function' && BD16_activo_()) {
      return BD16_INSERTAR_EXPEDIENTE_DIRECTO(solicitud, codigo);
    }
    BD6_assertWriteLegacy_();
    var resultado = REPO_ExpedienteV2.insertar(solicitud, codigo);
    if (typeof BD12_afterLegacySafe_ === 'function') BD12_afterLegacySafe_('EXPEDIENTE','CREAR',codigo,{codigo:codigo});
    return resultado;
  },

  verificarAcceso: function() {
    var cfg = BD6_GET_CONFIG();
    var legacy = REPO_ExpedienteV2.verificarAcceso();
    var dnisLegacy = REPO_ExpedienteV2.dnisRegistrados();
    var dnisRel = BD7_relDnisExpedientes_();
    var codigoLegacy = REPO_ExpedienteV2.siguienteCodigo();
    var codigoRel = BD7_relSiguienteCodigo_();
    return {
      status: true,
      readMode: cfg.readMode,
      writeMode: 'LEGACY',
      legacy: legacy,
      comparacionDnis: BD7_compararMapaDnis_(dnisLegacy, dnisRel),
      comparacionSiguienteCodigo: {
        status: codigoLegacy === codigoRel,
        legacy: codigoLegacy,
        relacional: codigoRel
      }
    };
  }
});

function BD7_ACTIVAR_MIRROR() {
  return BD6_SET_READ_MODE('MIRROR');
}

function BD7_ACTIVAR_RELACIONAL_LECTURA() {
  var integrity = (typeof BD4_PROBAR_RESUMEN === 'function') ? BD4_PROBAR_RESUMEN() : null;
  if (integrity && integrity.status === false) {
    throw new Error('BD-07 bloquea RELATIONAL mientras BD-04 tenga errores de integridad/calidad. Use MIRROR o corrija BD-04.');
  }
  return BD6_SET_READ_MODE('RELATIONAL');
}

function BD7_ROLLBACK_LEGACY() {
  var out = BD6_SET_READ_MODE('LEGACY');
  out.rollback = true;
  out.writeMode = 'LEGACY';
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

