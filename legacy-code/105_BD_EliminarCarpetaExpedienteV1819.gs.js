/**
 * BD-18.19 · Eliminación de carpeta Drive del expediente
 *
 * La carpeta del expediente se mueve a la papelera.
 * Google Drive no permite un borrado físico irreversible mediante
 * DocumentApp/DriveApp; setTrashed(true) es la operación segura.
 */

const BD1819_CONFIG = Object.freeze({
  fase: 'BD-18.19',
  version: 'db-18.19-eliminar-carpeta-expediente'
});

function BD1819_ELIMINAR_CARPETA_EXPEDIENTE(expediente) {
  expediente = String(expediente || '').trim().toUpperCase();

  if (!expediente) {
    return {
      status: false,
      eliminada: false,
      message: 'No se recibió el código del expediente.'
    };
  }

  try {
    var carpeta = null;

    /*
     * Preferimos la función ya existente del proyecto, porque conoce
     * la estructura real de CARPETA_RAIZ_EXPEDIENTES.
     */
    if (typeof obtenerCarpetaExpediente === 'function') {
      carpeta = obtenerCarpetaExpediente(expediente);
    }

    /*
     * Respaldo: búsqueda directa dentro de la carpeta raíz.
     * No busca globalmente en Drive para evitar eliminar una carpeta
     * homónima ubicada fuera del repositorio oficial de expedientes.
     */
    if (!carpeta) {
      var raiz = DriveApp.getFolderById(CARPETA_RAIZ_EXPEDIENTES);
      var carpetas = raiz.getFoldersByName(expediente);

      if (carpetas.hasNext()) {
        carpeta = carpetas.next();
      }
    }

    if (!carpeta) {
      return {
        status: true,
        eliminada: false,
        expediente: expediente,
        message: 'El expediente fue eliminado, pero no se encontró su carpeta en Drive.'
      };
    }

    var carpetaId = carpeta.getId();
    var carpetaNombre = carpeta.getName();

    carpeta.setTrashed(true);

    return {
      status: true,
      eliminada: true,
      expediente: expediente,
      carpetaId: carpetaId,
      carpetaNombre: carpetaNombre,
      message: 'Carpeta del expediente enviada a la papelera de Drive.'
    };

  } catch (error) {
    return {
      status: false,
      eliminada: false,
      expediente: expediente,
      message: error && error.message ? error.message : String(error)
    };
  }
}


function BD1819_PROBAR_DIAGNOSTICO() {
  var resultado = {
    status: true,
    fase: BD1819_CONFIG.fase,
    version: BD1819_CONFIG.version,
    eliminaDatosRelacionales: true,
    eliminaCarpetaDrive: true,
    accionDrive: 'MOVER_A_PAPELERA',
    carpetaRaizConfigurada:
      typeof CARPETA_RAIZ_EXPEDIENTES !== 'undefined' &&
      String(CARPETA_RAIZ_EXPEDIENTES || '').trim() !== ''
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
