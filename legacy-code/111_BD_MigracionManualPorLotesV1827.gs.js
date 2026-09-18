/**
 * BD-18.27 - MIGRACIÓN MANUAL POR LOTES
 *
 * Objetivo:
 * - Migrar por partes, bajo control del usuario.
 * - Sin trigger automático.
 * - Máximo 10 filas fuente por ejecución.
 * - Respeta filas individuales reservadas como segundo participante.
 * - Reanudable mediante cursor.
 */

var BD1827_CONFIG = {
  fase: 'BD-18.28',
  version: 'db-18.28-lotes-de-10',
  propertyCursor: 'BD1827_CURSOR_MANUAL',
  batchRows: 10
};

function BD1827_construirReservas_() {
  var sh = BD1821_origen_();
  var hm = BD1821_headers_(sh);
  var indice = BD1822_indiceFuente_(sh, hm);
  var reservas = {};
  var last = sh.getLastRow();

  for (var fila=2; fila<=last; fila++) {
    var row = sh.getRange(fila,1,1,sh.getLastColumn()).getValues()[0];
    var nombres = BD1822_partirNombres_(row,hm);

    if (nombres.length !== 2) continue;

    var r = BD1822_resolverParticipantes_(fila,row,hm,indice);
    (r.consumidas || []).forEach(function(filaConsumida){
      if (filaConsumida && filaConsumida !== fila) {
        reservas[String(filaConsumida)] = fila;
      }
    });
  }

  return reservas;
}

function BD1827_PREPARAR_MIGRACION_MANUAL() {
  var preview = BD1821_PREVISUALIZAR_MIGRACION_HISTORIAL();
  var props = PropertiesService.getScriptProperties();
  var cursor = Number(props.getProperty(BD1827_CONFIG.propertyCursor) || 2);
  if (cursor < 2) cursor = 2;

  var reservas = BD1827_construirReservas_();

  var out = {
    status: true,
    fase: BD1827_CONFIG.fase,
    version: BD1827_CONFIG.version,
    modificaDatos: false,
    totalRegistros: preview.totalRegistros,
    aptos: preview.aptos,
    bloqueados: preview.bloqueados,
    yaMigrados: preview.yaMigrados,
    cursorActual: cursor,
    filasPorLote: BD1827_CONFIG.batchRows,
    filasReservadasSegundoParticipante: Object.keys(reservas).map(function(x){
      return {
        filaIndividual: Number(x),
        expedienteParejaFila: Number(reservas[x])
      };
    }),
    message: 'Preparación correcta. No se modificó ningún dato.'
  };

  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD1827_MIGRAR_SIGUIENTE_LOTE() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var props = PropertiesService.getScriptProperties();
    var sh = BD1821_origen_();
    var last = sh.getLastRow();
    var cursor = Number(props.getProperty(BD1827_CONFIG.propertyCursor) || 2);
    if (cursor < 2) cursor = 2;

    var reservas = BD1827_construirReservas_();

    var procesadas = 0;
    var migradas = [];
    var bloqueadas = [];
    var omitidas = [];
    var errores = [];

    while (cursor <= last && procesadas < BD1827_CONFIG.batchRows) {
      var filaActual = cursor;

      try {
        // Si esta fila individual está reservada para un expediente de dos
        // participantes, no debe crear un expediente separado.
        if (reservas[String(filaActual)]) {
          omitidas.push({
            fila: filaActual,
            motivo: 'Reservada como segundo participante del expediente de la fila ' +
                    reservas[String(filaActual)] + '.'
          });
        } else {
          var r = BD1821_MIGRAR_FILA(filaActual);

          if (r && r.status && !r.omitido) {
            migradas.push({
              fila: filaActual,
              expediente: r.expediente || '',
              participantes: r.participantes || 1
            });
          } else if (r && r.bloqueado) {
            bloqueadas.push({
              fila: filaActual,
              motivo: r.message || 'Fila bloqueada por validación.'
            });
          } else if (r && r.omitido) {
            omitidas.push({
              fila: filaActual,
              motivo: r.message || 'Fila ya procesada.'
            });
          } else {
            errores.push({
              fila: filaActual,
              motivo: (r && r.message) ? r.message : 'Resultado no esperado.'
            });
          }
        }
      } catch (e) {
        errores.push({
          fila: filaActual,
          motivo: e.message || String(e)
        });
        BD1821_log_({
          fila:filaActual,
          estado:'ERROR_LOTE_MANUAL',
          mensaje:e.message || String(e)
        });
      }

      cursor++;
      procesadas++;
      props.setProperty(BD1827_CONFIG.propertyCursor, String(cursor));
    }

    var finalizado = cursor > last;
    var reporte = null;

    if (finalizado) {
      try {
        reporte = BD1822_GENERAR_REPORTE_NO_MIGRADOS();
      } catch(e) {
        errores.push({
          fila:0,
          motivo:'No se pudo generar el reporte final: ' + (e.message || String(e))
        });
      }
    }

    var out = {
      status: errores.length === 0,
      fase: BD1827_CONFIG.fase,
      version: BD1827_CONFIG.version,
      finalizado: finalizado,
      cursorSiguiente: cursor,
      ultimaFilaOrigen: last,
      filasProcesadasEnEsteLote: procesadas,
      migradas: migradas,
      bloqueadas: bloqueadas,
      omitidas: omitidas,
      errores: errores,
      reporteNoMigrados: reporte,
      message: finalizado
        ? 'Migración manual finalizada.'
        : 'Lote terminado. Revise el resultado antes de ejecutar el siguiente lote.'
    };

    Logger.log(JSON.stringify(out,null,2));
    return out;

  } finally {
    lock.releaseLock();
  }
}

function BD1827_ESTADO_MIGRACION_MANUAL() {
  var props = PropertiesService.getScriptProperties();
  var sh = BD1821_origen_();
  var cursor = Number(props.getProperty(BD1827_CONFIG.propertyCursor) || 2);

  var out = {
    status:true,
    fase:BD1827_CONFIG.fase,
    version:BD1827_CONFIG.version,
    cursorActual:cursor,
    ultimaFilaOrigen:sh.getLastRow(),
    filasPorLote:BD1827_CONFIG.batchRows,
    finalizado:cursor > sh.getLastRow()
  };

  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD1827_REINICIAR_CURSOR_MANUAL() {
  PropertiesService.getScriptProperties()
    .setProperty(BD1827_CONFIG.propertyCursor,'2');

  return {
    status:true,
    cursor:2,
    advertencia:'Solo reinicia el cursor. NO borra expedientes ya migrados; el log evita repetirlos.'
  };
}
