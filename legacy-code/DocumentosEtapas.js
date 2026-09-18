/* =========================================================
   DOCUMENTOS ETAPAS
   SISTEMA DE TITULACIÓN USE FIPS
   ARCHIVO CONSOLIDADO

   OBJETIVO
   - Trabajar internamente por EXPEDIENTE (SETxxx).
   - Listar documentos de ETAPA 01 y ETAPA 02.
   - Detectar etiquetas pendientes <<CAMPO>>.
   - Permitir ABRIR / RESETEAR desde Dashboard.
   - Mantener compatibilidad con listarDocumentosEtapaV21().
========================================================= */


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const DE_CARPETA_RAIZ_EXPEDIENTES =
  '1E8--FuQQHPLTwv5v2Wmp7NR5nNKb3CGR';

const DE_CARPETA_PLANTILLA_EXPEDIENTE =
  '1_dGNq_CVAb_VkLOfHJ0VYndCteDmLY3T';


/* =========================================================
   NORMALIZAR ETAPA
========================================================= */

function DE_normalizarEtapa_(etapa) {

  const texto =
    String(etapa || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');

  if (
    texto === '1' ||
    texto === '01' ||
    texto === 'ETAPA1' ||
    texto === 'ETAPA01'
  ) {
    return 1;
  }

  if (
    texto === '2' ||
    texto === '02' ||
    texto === 'ETAPA2' ||
    texto === 'ETAPA02'
  ) {
    return 2;
  }

  return 0;
}


/* =========================================================
   RESOLVER EXPEDIENTE
========================================================= */

function DE_resolverExpediente_(identificador) {

  identificador =
    String(identificador || '').trim();

  if (!identificador) {
    return '';
  }

  if (/^SET\d+$/i.test(identificador)) {
    return identificador.toUpperCase();
  }

  /*
    Primero reutiliza la función oficial del módulo
    SeguimientoSubetapas.gs.
  */
  try {

    const expediente =
      resolverExpediente(identificador);

    if (expediente) {
      return String(expediente)
        .trim()
        .toUpperCase();
    }

  } catch (error) {
    Logger.log(
      'DE_resolverExpediente_ / resolverExpediente: ' +
      error.message
    );
  }

  /*
    Compatibilidad adicional con el módulo administrativo.
  */
  try {

    const datos =
      obtenerDatosAlumnoAdmin(identificador);

    if (datos && datos.expediente) {
      return String(datos.expediente)
        .trim()
        .toUpperCase();
    }

  } catch (error) {
    Logger.log(
      'DE_resolverExpediente_ / obtenerDatosAlumnoAdmin: ' +
      error.message
    );
  }

  return '';
}


/* =========================================================
   OBTENER CARPETA DEL EXPEDIENTE
========================================================= */

function DE_obtenerCarpetaExpediente_(expediente) {

  expediente =
    String(expediente || '')
      .trim()
      .toUpperCase();

  if (!expediente) {
    return null;
  }

  /* V20: acceso directo por ID después de la primera búsqueda. */
  const cache = CacheService.getScriptCache();
  const clave = 'DE20_EXP_' + expediente.replace(/[^A-Z0-9_-]/g,'_');
  try {
    const idGuardado = cache.get(clave);
    if (idGuardado) return DriveApp.getFolderById(idGuardado);
  } catch (_cacheError) {}

  const raiz =
    DriveApp.getFolderById(
      DE_CARPETA_RAIZ_EXPEDIENTES
    );

  const carpetas =
    raiz.getFoldersByName(expediente);

  if (carpetas.hasNext()) {
    const encontrada = carpetas.next();
    try { cache.put(clave,encontrada.getId(),21600); } catch (_cacheError) {}
    return encontrada;
  }

  return null;
}


/* =========================================================
   BUSCAR CARPETA DE ETAPA
========================================================= */

function DE_obtenerCarpetaEtapa_(carpetaExpediente, etapa) {

  if (!carpetaExpediente) {
    return null;
  }

  etapa =
    DE_normalizarEtapa_(etapa);

  if (!etapa) {
    return null;
  }

  const cache = CacheService.getScriptCache();
  const clave = 'DE20_ET_' + carpetaExpediente.getId() + '_' + etapa;
  try {
    const idGuardado = cache.get(clave);
    if (idGuardado) return DriveApp.getFolderById(idGuardado);
  } catch (_cacheError) {}

  const aliases =
    etapa === 1
      ? [
          'ETAPA01',
          'ETAPA 01',
          'ETAPA1',
          'ETAPA 1',
          'ETAPA 01 - DOCUMENTOS',
          'DOCUMENTOS ETAPA 01',
          'DOCUMENTOS ETAPA01'
        ]
      : [
          'ETAPA02',
          'ETAPA 02',
          'ETAPA2',
          'ETAPA 2',
          'ETAPA 02 - DOCUMENTOS',
          'DOCUMENTOS ETAPA 02',
          'DOCUMENTOS ETAPA02'
        ];

  /*
    1) Buscar coincidencia exacta.
  */
  for (let i = 0; i < aliases.length; i++) {

    const folders =
      carpetaExpediente.getFoldersByName(
        aliases[i]
      );

    if (folders.hasNext()) {
      const encontrada = folders.next();
      try { cache.put(clave,encontrada.getId(),21600); } catch (_cacheError) {}
      return encontrada;
    }
  }

  /*
    2) Buscar por nombre normalizado.
  */
  const objetivo =
    'ETAPA' +
    String(etapa).padStart(2, '0');

  const subcarpetas =
    carpetaExpediente.getFolders();

  while (subcarpetas.hasNext()) {

    const carpeta =
      subcarpetas.next();

    const nombre =
      String(carpeta.getName() || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

    if (
      nombre === objetivo ||
      nombre.indexOf(objetivo) !== -1
    ) {
      try { cache.put(clave,carpeta.getId(),21600); } catch (_cacheError) {}
      return carpeta;
    }
  }

  return null;
}


/* =========================================================
   EXTRAER ETIQUETAS <<CAMPO>>
========================================================= */

function DE_obtenerCamposFaltantesDocumento_(archivoId) {

  const encontrados = [];
  const vistos = {};

  try {

    const texto =
      DocumentApp
        .openById(archivoId)
        .getBody()
        .getText();

    const regex =
      /<<\s*([^<>]+?)\s*>>/g;

    let match;

    while (
      (match = regex.exec(texto)) !== null
    ) {

      const campo =
        String(match[1] || '')
          .trim();

      const clave =
        campo.toUpperCase();

      if (
        campo &&
        !vistos[clave]
      ) {

        vistos[clave] = true;
        encontrados.push(campo);
      }
    }

  } catch (error) {

    /*
      Si no puede abrirse como Google Doc,
      no se interrumpe el listado.
    */
    Logger.log(
      'DE_obtenerCamposFaltantesDocumento_: ' +
      error.message
    );
  }

  return encontrados;
}


/* =========================================================
   RECORRER CARPETA Y OBTENER DOCUMENTOS
========================================================= */

function DE_listarDocumentosCarpeta_(carpeta) {

  const documentos = [];

  if (!carpeta) {
    return documentos;
  }

  DE_recorrerCarpetaDocumentos_(
    carpeta,
    documentos
  );

  documentos.sort(
    function(a, b) {

      return String(a.nombre || '')
        .localeCompare(
          String(b.nombre || ''),
          'es',
          {
            sensitivity: 'base'
          }
        );
    }
  );

  return documentos;
}


function DE_recorrerCarpetaDocumentos_(
  carpeta,
  documentos
) {

  const archivos =
    carpeta.getFiles();

  while (archivos.hasNext()) {

    const archivo =
      archivos.next();

    if (
      archivo.isTrashed &&
      archivo.isTrashed()
    ) {
      continue;
    }

    const mimeType =
      archivo.getMimeType();

    /*
      Los documentos de las etapas son principalmente
      Google Docs. También devolvemos PDF/Word para
      que el panel pueda mostrarlos si existen.
    */
    const permitido =
      mimeType === MimeType.GOOGLE_DOCS ||
      mimeType === MimeType.PDF ||
      mimeType === MimeType.MICROSOFT_WORD ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!permitido) {
      continue;
    }

    /* V20.3: no abrir cada Google Doc durante el listado. DocumentApp.openById
       era el principal cuello de botella y hacía que ETAPA 02 esperara a que
       terminara ETAPA 01. La validación profunda se realiza solo cuando una
       acción documental la necesita. */
    let camposFaltantes = [];

    documentos.push({

      id:
        archivo.getId(),

      nombre:
        archivo.getName(),

      url:
        archivo.getUrl(),

      mimeType:
        mimeType,

      incompleto:
        false,

      verificacionEtiquetasPendiente:
        mimeType === MimeType.GOOGLE_DOCS,

      camposFaltantes:
        camposFaltantes

    });
  }

  const subcarpetas =
    carpeta.getFolders();

  while (subcarpetas.hasNext()) {

    DE_recorrerCarpetaDocumentos_(
      subcarpetas.next(),
      documentos
    );
  }
}


/* =========================================================
   LISTAR DOCUMENTOS DE UNA ETAPA
   FUNCIÓN PRINCIPAL QUE PUEDE USAR EL DASHBOARD
========================================================= */

function listarDocumentosEtapa(
  identificador,
  etapa
) {

  try {

    const expediente =
      DE_resolverExpediente_(
        identificador
      );

    if (!expediente) {

      return {

        status: false,

        expediente: '',

        documentos: [],

        message:
          'No se pudo identificar el expediente.'
      };
    }

    const numeroEtapa =
      DE_normalizarEtapa_(etapa);

    if (
      numeroEtapa !== 1 &&
      numeroEtapa !== 2
    ) {

      return {

        status: false,

        expediente:
          expediente,

        documentos: [],

        message:
          'Solo se pueden visualizar los documentos de ETAPA 01 o ETAPA 02.'
      };
    }

    const carpetaExpediente =
      DE_obtenerCarpetaExpediente_(
        expediente
      );

    if (!carpetaExpediente) {

      return {

        status: false,

        expediente:
          expediente,

        documentos: [],

        message:
          'No se encontró la carpeta del expediente ' +
          expediente +
          '.'
      };
    }

    const carpetaEtapa =
      DE_obtenerCarpetaEtapa_(
        carpetaExpediente,
        numeroEtapa
      );

    if (!carpetaEtapa) {

      return {

        status: false,

        expediente:
          expediente,

        etapa:
          numeroEtapa,

        documentos: [],

        message:
          'No se encontró la carpeta ETAPA ' +
          String(numeroEtapa).padStart(2, '0') +
          ' dentro del expediente ' +
          expediente +
          '.'
      };
    }

    let documentos =
      DE_listarDocumentosCarpeta_(
        carpetaEtapa
      );

    // BD-17.3: generación diferida. Si una etapa quedó vacía, hidratarla desde la plantilla
    // al primer acceso. Esto reduce el tiempo de alta y evita "No se encontraron documentos".
    if(!documentos.length && typeof BD173_hidratarDocumentosEtapa_ === 'function'){
      try{
        const hidr = BD173_hidratarDocumentosEtapa_(expediente, numeroEtapa, carpetaExpediente, carpetaEtapa);
        if(hidr && hidr.status){
          documentos = DE_listarDocumentosCarpeta_(carpetaEtapa);
        }
      }catch(_e){
        Logger.log('BD-17.3 hidratación documental: ' + (_e.message || _e));
      }
    }

    return {

      status: true,

      expediente:
        expediente,

      etapa:
        numeroEtapa,

      carpetaId:
        carpetaEtapa.getId(),

      carpetaUrl:
        carpetaEtapa.getUrl(),

      documentos:
        documentos,

      total:
        documentos.length,

      incompletos:
        documentos.filter(
          function(documento) {
            return Boolean(
              documento.incompleto
            );
          }
        ).length
    };

  } catch (error) {

    Logger.log(
      'ERROR listarDocumentosEtapa: ' +
      (
        error.stack ||
        error.message ||
        error
      )
    );

    return {

      status: false,

      documentos: [],

      message:
        error.message ||
        'No se pudieron cargar los documentos.'
    };
  }
}


/* =========================================================
   COMPATIBILIDAD V21
   El Dashboard actual puede seguir llamando esta función.
========================================================= */

function listarDocumentosEtapaV21(
  identificador,
  etapa
) {

  /*
    La nueva listarDocumentosEtapa() ya devuelve
    camposFaltantes e incompleto, por lo que V21
    simplemente conserva la interfaz existente.
  */
  return listarDocumentosEtapa(
    identificador,
    etapa
  );
}


/* =========================================================
   RESET DE DOCUMENTO
========================================================= */

function resetearDocumentoExpedienteV4(
  documentoId
) {

  try {

    documentoId =
      String(documentoId || '').trim();

    if (!documentoId) {

      return {

        status: false,

        message:
          'No se recibió el documento a restaurar.'
      };
    }

    const archivoActual =
      DriveApp.getFileById(
        documentoId
      );

    const nombre =
      archivoActual.getName();

    const padres =
      archivoActual.getParents();

    if (!padres.hasNext()) {

      return {

        status: false,

        message:
          'No se encontró la carpeta del documento.'
      };
    }

    const carpetaDestino =
      padres.next();

    const carpetaPlantilla =
      DriveApp.getFolderById(
        DE_CARPETA_PLANTILLA_EXPEDIENTE
      );

    const plantilla =
      buscarArchivoPlantillaPorNombreV4(
        carpetaPlantilla,
        nombre
      );

    if (!plantilla) {

      return {

        status: false,

        message:
          'No se encontró "' +
          nombre +
          '" en la plantilla original.'
      };
    }

    /*
      Primero se crea la copia.
      Solo después se envía la versión actual a la papelera.
    */
    const copia =
      plantilla.makeCopy(
        nombre,
        carpetaDestino
      );

    archivoActual.setTrashed(true);

    return {

      status: true,

      id:
        copia.getId(),

      nombre:
        copia.getName(),

      url:
        copia.getUrl(),

      message:
        'Documento restaurado correctamente.'
    };

  } catch (error) {

    Logger.log(
      'ERROR resetearDocumentoExpedienteV4: ' +
      (
        error.stack ||
        error.message ||
        error
      )
    );

    return {

      status: false,

      message:
        error.message ||
        'No se pudo resetear el documento.'
    };
  }
}


/* =========================================================
   BUSCAR ARCHIVO EN LA PLANTILLA ORIGINAL
========================================================= */

function buscarArchivoPlantillaPorNombreV4(
  carpeta,
  nombre
) {

  const archivos =
    carpeta.getFilesByName(
      nombre
    );

  if (archivos.hasNext()) {
    return archivos.next();
  }

  const subcarpetas =
    carpeta.getFolders();

  while (subcarpetas.hasNext()) {

    const resultado =
      buscarArchivoPlantillaPorNombreV4(
        subcarpetas.next(),
        nombre
      );

    if (resultado) {
      return resultado;
    }
  }

  return null;
}


/* =========================================================
   PRUEBA MANUAL
========================================================= */

function pruebaDocumentosEtapas() {

  const expediente =
    'SET001';

  Logger.log(
    JSON.stringify(
      listarDocumentosEtapaV21(
        expediente,
        'ETAPA01'
      )
    )
  );
}
