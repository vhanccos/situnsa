/**
 * ==============================================================
 * BD-07 - DIAGNOSTICO DE INTEGRACION PRODUCTIVA CONTROLADA
 * ==============================================================
 */

function BD7_PROBAR_DIAGNOSTICO() {
  var cfg = BD6_GET_CONFIG();
  var repo = REPO_ExpedienteRoutedV7.verificarAcceso();
  var integrity = null;
  try {
    if (typeof BD4_PROBAR_RESUMEN === 'function') integrity = BD4_PROBAR_RESUMEN();
  } catch (e) {
    integrity = {status:false, error:e.message};
  }

  var errores = [];
  var advertencias = [];
  if (!repo.comparacionDnis.status) errores.push('DIFERENCIA_DNIS_EXPEDIENTES');
  if (!repo.comparacionSiguienteCodigo.status) errores.push('DIFERENCIA_SIGUIENTE_CODIGO');
  if (cfg.writeMode !== 'LEGACY') errores.push('WRITE_MODE_INSEGURO');
  if (integrity && integrity.status === false) {
    advertencias.push('BD-04 mantiene incidencias de calidad; RELATIONAL queda bloqueado y se recomienda MIRROR.');
  }

  var out = {
    status: errores.length === 0,
    fase: 'BD-07',
    version: BD7_CONFIG.version,
    integracionProductiva: {
      modulo: 'EXPEDIENTES',
      serviceIntegrado: 'SOA_ExpedienteV2Service',
      repositoryRouted: true,
      readMode: cfg.readMode,
      writeMode: 'LEGACY'
    },
    comparaciones: {
      dnisExpedientes: repo.comparacionDnis,
      siguienteCodigo: repo.comparacionSiguienteCodigo
    },
    integridadBD04: integrity ? {status: integrity.status, resumen: integrity.resumen || null} : null,
    rollback: {
      disponible: true,
      funcion: 'BD7_ROLLBACK_LEGACY',
      destino: 'LEGACY'
    },
    escrituraRelacionalHabilitada: false,
    frontendModificado: false,
    datosLegacyModificadosPorDiagnostico: false,
    datosRelacionalesModificadosPorDiagnostico: false,
    errores: errores,
    advertencias: advertencias
  };
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}
