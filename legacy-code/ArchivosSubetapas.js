/* =========================================================
   ARCHIVOS DE SUBETAPAS - SISTEMA DE TITULACIÓN
   VERSIÓN CONSOLIDADA / AUDITADA
   LÓGICA POR EXPEDIENTE
========================================================= */


/* =========================================================
   CARPETAS RAÍZ
========================================================= */

// ETAPA 01:
// Presentación del Plan de Tesis / Trabajo Académico
const ARCHSUB_CARPETA_ETAPA_01 =
  '17ZrBwCaswNkpgW7wKgqeCdP2h2a7MnFk';

// ETAPA 02:
// Carga de documentos / Borrador de Tesis
const ARCHSUB_CARPETA_ETAPA_02 =
  '16nU2lG6_oIKOZyWsyPGzU7RetgWLFcKn';


/* =========================================================
   OBTENER CARPETA RAÍZ SEGÚN ETAPA
========================================================= */

function obtenerCarpetaRaizSubida(
  etapa,
  subetapa
){

  etapa =
    Number(etapa);

  subetapa =
    Number(subetapa);

  if(
    etapa === 1 &&
    subetapa === 1
  ){

    return DriveApp.getFolderById(
      ARCHSUB_CARPETA_ETAPA_01
    );

  }

  if(
    etapa === 2 &&
    subetapa === 1
  ){

    return DriveApp.getFolderById(
      ARCHSUB_CARPETA_ETAPA_02
    );

  }

  throw new Error(
    'Esta subetapa no admite carga de documentos.'
  );

}


/* =========================================================
   OBTENER O CREAR CARPETA DEL EXPEDIENTE
========================================================= */

function ARCHSUB_obtenerOCrearCarpetaExpediente(
  carpetaRaiz,
  expediente
){

  expediente =
    String(expediente || '')
      .trim()
      .toUpperCase();

  if(!expediente){

    throw new Error(
      'No se recibió el número de expediente.'
    );

  }

  const existentes =
    carpetaRaiz.getFoldersByName(
      expediente
    );

  if(
    existentes.hasNext()
  ){

    return existentes.next();

  }

  return carpetaRaiz.createFolder(
    expediente
  );

}


/* =========================================================
   BUSCAR SUBETAPA POR ID
========================================================= */

function obtenerRegistroSubetapaPorId(
  id
){

  const sheet =
    obtenerSheetSubetapas();

  const col =
    obtenerColumnasSubetapas();

  validarColumnasSubetapas(
    col
  );

  const data =
    sheet.getDataRange()
      .getValues();

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    if(
      String(
        data[i][
          col['ID'] - 1
        ]
      )
      ===
      String(id)
    ){

      return {

        fila:
          i + 1,

        indice:
          i,

        valores:
          data[i],

        columnas:
          col

      };

    }

  }

  return null;

}


/* =========================================================
   VALIDAR TIPO DE ARCHIVO
========================================================= */

function validarArchivoSubetapa(
  nombreArchivo,
  mimeType
){

  const nombre =
    String(
      nombreArchivo || ''
    )
    .trim()
    .toLowerCase();

  const extensionValida =
    /\.(pdf|doc|docx)$/i
      .test(nombre);

  if(
    !extensionValida
  ){

    throw new Error(
      'Solo se permiten archivos PDF, DOC o DOCX.'
    );

  }

  const mime =
    String(
      mimeType || ''
    )
    .toLowerCase();

  const permitidos = [

    'application/pdf',

    'application/msword',

    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    'application/octet-stream'

  ];

  if(
    mime &&
    !permitidos.includes(
      mime
    )
  ){

    throw new Error(
      'El tipo de archivo no está permitido.'
    );

  }

}


/* =========================================================
   SUBIR ARCHIVO
========================================================= */

function subirArchivoSubetapa(
  datos
){

  /*
    Evita que dos invitados del mismo expediente
    suban simultáneamente antes de que la primera
    carga termine de registrarse.
  */

  const lock =
    LockService.getScriptLock();

  try{

    lock.waitLock(
      30000
    );

    if(
      !datos ||
      !datos.subetapaId ||
      !datos.base64 ||
      !datos.nombreArchivo
    ){

      return {

        status:false,

        message:
          'No se recibieron los datos completos del archivo.'

      };

    }

    validarArchivoSubetapa(
      datos.nombreArchivo,
      datos.mimeType
    );

    /* =============================================
       BUSCAR SUBETAPA
    ============================================= */

    const registro =
      obtenerRegistroSubetapaPorId(
        datos.subetapaId
      );

    if(!registro){

      return {

        status:false,

        message:
          'No se encontró la subetapa.'

      };

    }

    const fila =
      registro.valores;

    const col =
      registro.columnas;

    const expediente =
      String(
        fila[
          col['EXPEDIENTE'] - 1
        ] || ''
      )
      .trim()
      .toUpperCase();

    const etapa =
      Number(
        fila[
          col['ETAPA'] - 1
        ]
      );

    const subetapa =
      Number(
        fila[
          col['SUBETAPA'] - 1
        ]
      );

    /*
      Seguridad:
      el expediente real siempre se toma
      de SEGUIMIENTO_SUBETAPAS.
    */

    if(
      datos.expediente &&
      String(
        datos.expediente
      )
      .trim()
      .toUpperCase()
      !==
      expediente
    ){

      return {

        status:false,

        message:
          'El expediente recibido no coincide con la subetapa.'

      };

    }

    /* =============================================
       SOLO ETAPA 01/SUB 01 Y ETAPA 02/SUB 01
    ============================================= */

    if(
      !(
        (
          etapa === 1 &&
          subetapa === 1
        )
        ||
        (
          etapa === 2 &&
          subetapa === 1
        )
      )
    ){

      return {

        status:false,

        message:
          'Esta subetapa no permite carga de documentos.'

      };

    }

    const archivoActualId =
      fila[
        col[
          'ARCHIVO_OFICIAL_ID'
        ] - 1
      ]
      ? String(
          fila[
            col[
              'ARCHIVO_OFICIAL_ID'
            ] - 1
          ]
        ).trim()
      : '';

    const permiteNuevaCarga =
      String(
        fila[
          col[
            'PERMITE_NUEVA_CARGA'
          ] - 1
        ] || 'NO'
      )
      .trim()
      .toUpperCase();

    /*
      Si ya existe archivo oficial,
      solo se permite una nueva versión
      cuando el área administrativa
      habilitó PERMITE_NUEVA_CARGA = SI.
    */

    if(
      archivoActualId &&
      permiteNuevaCarga !== 'SI'
    ){

      return {

        status:false,

        message:
          'Este expediente ya tiene un documento presentado. El área responsable debe autorizar una nueva carga.'

      };

    }

    /* =============================================
       CARPETA POR EXPEDIENTE
    ============================================= */

    const carpetaRaiz =
      obtenerCarpetaRaizSubida(
        etapa,
        subetapa
      );

    const carpetaExpediente =
      ARCHSUB_obtenerOCrearCarpetaExpediente(
        carpetaRaiz,
        expediente
      );

    /* =============================================
       VERSIÓN
    ============================================= */

    const versionActual =
      Number(
        fila[
          col[
            'VERSION_ARCHIVO'
          ] - 1
        ] || 0
      );

    const nuevaVersion =
      versionActual + 1;

    /* =============================================
       CREAR ARCHIVO
    ============================================= */

    const bytes =
      Utilities.base64Decode(
        datos.base64
      );

    const mimeType =
      datos.mimeType ||
      'application/octet-stream';

    const nombreFinal =
      construirNombreArchivoSubetapa(
        expediente,
        etapa,
        nuevaVersion,
        datos.nombreArchivo
      );

    const blob =
      Utilities.newBlob(
        bytes,
        mimeType,
        nombreFinal
      );

    const archivo =
      carpetaExpediente.createFile(
        blob
      );

    /* =============================================
       HISTORIAL
    ============================================= */

    marcarArchivosAnterioresNoOficiales(
      expediente,
      etapa,
      subetapa
    );

    registrarHistorialArchivoSubetapa({

      expediente:
        expediente,

      etapa:
        etapa,

      subetapa:
        subetapa,

      version:
        nuevaVersion,

      archivoId:
        archivo.getId(),

      archivoNombre:
        archivo.getName(),

      archivoUrl:
        archivo.getUrl(),

      subidoPor:
        datos.nombreInvitado || '',

      correoInvitado:
        datos.correoInvitado || ''

    });

    /* =============================================
       ACTUALIZAR ARCHIVO OFICIAL
       UNA SOLA ESCRITURA DE FILA
    ============================================= */

    const sheet =
      obtenerSheetSubetapas();

    const ahora =
      new Date();

    fila[
      col[
        'ARCHIVO_OFICIAL_ID'
      ] - 1
    ] =
      archivo.getId();

    fila[
      col[
        'ARCHIVO_OFICIAL_NOMBRE'
      ] - 1
    ] =
      archivo.getName();

    fila[
      col[
        'ARCHIVO_OFICIAL_URL'
      ] - 1
    ] =
      archivo.getUrl();

    fila[
      col[
        'VERSION_ARCHIVO'
      ] - 1
    ] =
      nuevaVersion;

    /*
      Bloquear nuevamente la carga
      inmediatamente después de subir.
    */

    fila[
      col[
        'PERMITE_NUEVA_CARGA'
      ] - 1
    ] =
      'NO';

    fila[
      col[
        'ULTIMA_ACTUALIZACION'
      ] - 1
    ] =
      ahora;

    sheet.getRange(
      registro.fila,
      1,
      1,
      sheet.getLastColumn()
    ).setValues([
      fila
    ]);

    SpreadsheetApp.flush();

    /* =============================================
       CORREOS
    ============================================= */

    const correosInvitados =
      obtenerCorreosInvitadosExpediente(
        expediente
      );

    enviarCorreoDocumentoPresentado({

      expediente:
        expediente,

      etapa:
        etapa,

      subetapa:
        subetapa,

      descripcion:
        fila[
          col[
            'DESCRIPCION'
          ] - 1
        ] || '',

      nombreInvitado:
        datos.nombreInvitado || '',

      correoInvitado:
        datos.correoInvitado || '',

      correosInvitados:
        correosInvitados,

      correoResponsable:
        fila[
          col[
            'CORREO_RESPONSABLE'
          ] - 1
        ] || '',

      archivo:
        archivo,

      version:
        nuevaVersion

    });

    return {

      status:true,

      expediente:
        expediente,

      version:
        nuevaVersion,

      nombre:
        archivo.getName(),

      id:
        archivo.getId(),

      url:
        archivo.getUrl(),

      carpetaUrl:
        carpetaExpediente.getUrl(),

      permiteNuevaCarga:
        'NO',

      message:
        'Documento cargado correctamente.'

    };

  }catch(error){

    Logger.log(
      'ERROR subirArchivoSubetapa: ' +
      (
        error.stack ||
        error.message ||
        error
      )
    );

    return {

      status:false,

      message:
        error.message ||
        'No se pudo guardar el documento.'

    };

  }finally{

    try{

      lock.releaseLock();

    }catch(e){}

  }

}


/* =========================================================
   NOMBRE DEL ARCHIVO
========================================================= */

function construirNombreArchivoSubetapa(
  expediente,
  etapa,
  version,
  nombreOriginal
){

  const nombre =
    String(
      nombreOriginal || ''
    )
    .trim();

  const extension =
    nombre.includes('.')
    ? '.' +
      nombre
        .split('.')
        .pop()
        .toLowerCase()
    : '';

  let tipo =
    'DOCUMENTO';

  if(
    Number(etapa) === 1
  ){

    tipo =
      'PLAN_TESIS';

  }

  if(
    Number(etapa) === 2
  ){

    tipo =
      'BORRADOR_TESIS';

  }

  return (
    expediente +
    '_' +
    tipo +
    '_V' +
    version +
    extension
  );

}




/* =========================================================
   ESTRUCTURA OFICIAL DE ARCHIVOS_SUBETAPAS
   Se mantiene la estructura de 12 columnas utilizada por
   el flujo actual del Dashboard, Portal Alumno y Asesor.

   ID | EXPEDIENTE | ETAPA | SUBETAPA | VERSION |
   ARCHIVO_ID | ARCHIVO_NOMBRE | ARCHIVO_URL |
   FECHA_HORA | SUBIDO_POR | CORREO_INVITADO | OFICIAL
========================================================= */

function asegurarEstructuraArchivosSubetapas(){

  const sheet =
    obtenerSheetArchivosSubetapas();

  if(!sheet){
    throw new Error(
      'No existe la hoja ARCHIVOS_SUBETAPAS.'
    );
  }

  const headersOficiales = [
    'ID',
    'EXPEDIENTE',
    'ETAPA',
    'SUBETAPA',
    'VERSION',
    'ARCHIVO_ID',
    'ARCHIVO_NOMBRE',
    'ARCHIVO_URL',
    'FECHA_HORA',
    'SUBIDO_POR',
    'CORREO_INVITADO',
    'OFICIAL'
  ];

  if(sheet.getMaxColumns() < headersOficiales.length){
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      headersOficiales.length - sheet.getMaxColumns()
    );
  }

  const actuales =
    sheet.getRange(
      1,
      1,
      1,
      headersOficiales.length
    ).getDisplayValues()[0];

  let requiereAjuste = false;

  for(let i = 0; i < headersOficiales.length; i++){
    if(
      String(actuales[i] || '').trim().toUpperCase() !==
      headersOficiales[i]
    ){
      requiereAjuste = true;
      break;
    }
  }

  /*
    Solo escribimos los encabezados cuando la hoja está
    vacía. Si ya existen datos con otra estructura, no los
    desplazamos silenciosamente: se detiene para evitar
    corrupción del historial.
  */
  if(requiereAjuste){

    if(sheet.getLastRow() <= 1){

      sheet.getRange(
        1,
        1,
        1,
        headersOficiales.length
      ).setValues([
        headersOficiales
      ]);

      sheet.setFrozenRows(1);

    }else{

      throw new Error(
        'La hoja ARCHIVOS_SUBETAPAS tiene una estructura distinta. ' +
        'No se modificó automáticamente para proteger el historial existente.'
      );
    }
  }

  return {
    sheet:sheet,
    headers:headersOficiales
  };
}


/* =========================================================
   HISTORIAL DE ARCHIVOS
========================================================= */

function registrarHistorialArchivoSubetapa(
  datos
){

  const estructura =
    asegurarEstructuraArchivosSubetapas();

  const sheet =
    estructura.sheet;

  /*
    Espera exactamente:
    ID
    EXPEDIENTE
    ETAPA
    SUBETAPA
    VERSION
    ARCHIVO_ID
    ARCHIVO_NOMBRE
    ARCHIVO_URL
    FECHA_HORA
    SUBIDO_POR
    CORREO_INVITADO
    OFICIAL
  */

  const ultimaFila =
    sheet.getLastRow();

  let nuevoId = 1;

  if(
    ultimaFila > 1
  ){

    const ids =
      sheet.getRange(
        2,
        1,
        ultimaFila - 1,
        1
      )
      .getValues()
      .flat()
      .map(
        function(id){

          return Number(id) || 0;

        }
      );

    nuevoId =
      Math.max.apply(
        null,
        ids
      ) + 1;

  }

  sheet.appendRow([

    nuevoId,

    datos.expediente,

    datos.etapa,

    datos.subetapa,

    datos.version,

    datos.archivoId,

    datos.archivoNombre,

    datos.archivoUrl,

    new Date(),

    datos.subidoPor || '',

    datos.correoInvitado || '',

    'SI'

  ]);

}


/* =========================================================
   DESMARCAR VERSIONES ANTERIORES
========================================================= */

function marcarArchivosAnterioresNoOficiales(
  expediente,
  etapa,
  subetapa
){

  const estructura =
    asegurarEstructuraArchivosSubetapas();

  const sheet =
    estructura.sheet;

  if(
    !sheet ||
    sheet.getLastRow() <= 1
  ){

    return;

  }

  const data =
    sheet.getDataRange()
      .getValues();

  let huboCambios =
    false;

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    const mismoExpediente =
      String(
        data[i][1] || ''
      )
      .trim()
      .toUpperCase()
      ===
      String(expediente)
        .trim()
        .toUpperCase();

    const mismaEtapa =
      Number(
        data[i][2]
      )
      ===
      Number(etapa);

    const mismaSubetapa =
      Number(
        data[i][3]
      )
      ===
      Number(subetapa);

    if(
      mismoExpediente &&
      mismaEtapa &&
      mismaSubetapa &&
      String(
        data[i][11] || ''
      ).toUpperCase()
      !==
      'NO'
    ){

      data[i][11] =
        'NO';

      huboCambios =
        true;

    }

  }

  if(huboCambios){

    sheet.getRange(
      2,
      1,
      data.length - 1,
      data[0].length
    ).setValues(
      data.slice(1)
    );

  }

}


/* =========================================================
   CORREOS DE LOS INVITADOS DEL EXPEDIENTE
========================================================= */

function obtenerCorreosInvitadosExpediente(
  expediente
){

  expediente =
    String(
      expediente || ''
    )
    .trim()
    .toUpperCase();

  if(!expediente){
    return [];
  }

  try{

    const sheet =
      obtenerSheetExpedientes();

    const columnas =
      obtenerColumnas(
        sheet
      );

    const data =
      sheet.getDataRange()
        .getValues();

    const correos = [];

    for(
      let i = 1;
      i < data.length;
      i++
    ){

      const expFila =
        columnas[
          'N° DE TRÁMITE'
        ]
        ? String(
            data[i][
              columnas[
                'N° DE TRÁMITE'
              ] - 1
            ] || ''
          )
          .trim()
          .toUpperCase()
        : '';

      if(
        expFila !==
        expediente
      ){
        continue;
      }

      if(
        columnas['CORREO']
      ){

        const correo1 =
          String(
            data[i][
              columnas['CORREO'] - 1
            ] || ''
          )
          .trim()
          .toLowerCase();

        if(correo1){

          correos.push(
            correo1
          );

        }

      }

      if(
        columnas['CORREO02']
      ){

        const correo2 =
          String(
            data[i][
              columnas['CORREO02'] - 1
            ] || ''
          )
          .trim()
          .toLowerCase();

        if(correo2){

          correos.push(
            correo2
          );

        }

      }

      break;

    }

    return [
      ...new Set(
        correos
      )
    ];

  }catch(error){

    Logger.log(
      'ERROR obtenerCorreosInvitadosExpediente: ' +
      error.message
    );

    return [];

  }

}


/* =========================================================
   ENVIAR CORREO
========================================================= */

function enviarCorreoDocumentoPresentado(
  datos
){

  const ahora =
    new Date();

  const fechaHora =
    Utilities.formatDate(
      ahora,
      Session.getScriptTimeZone() ||
      'America/Lima',
      'dd/MM/yyyy HH:mm:ss'
    );

  let asunto =
    'Sistema de Titulación USE FIPS - Documento presentado';

  if(
    Number(datos.etapa) === 1
  ){

    asunto =
      'Sistema de Titulación USE FIPS - Presentación del Plan de Tesis';

  }

  if(
    Number(datos.etapa) === 2
  ){

    asunto =
      'Sistema de Titulación USE FIPS - Presentación del Borrador de Tesis';

  }

  const cuerpo =

    'Se ha registrado un documento mediante el Sistema de Titulación USE FIPS.\n\n' +

    'Invitado que realizó la carga: ' +
    (datos.nombreInvitado || '-') +
    '\n' +

    'Expediente: ' +
    datos.expediente +
    '\n' +

    'Etapa: ' +
    datos.etapa +
    '\n' +

    'Subetapa: ' +
    (datos.descripcion || '-') +
    '\n' +

    'Versión: ' +
    (datos.version || 1) +
    '\n' +

    'Fecha y hora: ' +
    fechaHora +
    '\n\n' +

    'Documento: ' +
    datos.archivo.getName() +
    '\n\n' +

    'El documento oficial se encuentra adjunto a este correo.';

  let correos =
    [];

  /*
    En expedientes de 2 invitados,
    ambos reciben la notificación.
  */

  if(
    Array.isArray(
      datos.correosInvitados
    )
  ){

    correos =
      correos.concat(
        datos.correosInvitados
      );

  }

  if(
    datos.correoInvitado
  ){

    correos.push(
      datos.correoInvitado
    );

  }

  if(
    datos.correoResponsable
  ){

    correos.push(
      datos.correoResponsable
    );

  }

  correos =
    [
      ...new Set(
        correos
          .map(
            function(correo){

              return String(
                correo || ''
              )
              .trim()
              .toLowerCase();

            }
          )
          .filter(Boolean)
      )
    ];

  correos.forEach(
    function(correo){

      try{

        GmailApp.sendEmail(

          correo,

          asunto,

          cuerpo,

          {

            attachments:[
              datos.archivo.getBlob()
            ]

          }

        );

      }catch(error){

        /*
          Un fallo de correo no invalida
          una carga ya guardada en Drive.
        */

        Logger.log(
          'ERROR CORREO ' +
          correo +
          ': ' +
          error.message
        );

      }

    }
  );

}


/* =========================================================
   AUTORIZAR NUEVA CARGA
========================================================= */

function permitirNuevaCargaDocumento(
  id,
  usuario
){

  const registro =
    obtenerRegistroSubetapaPorId(
      id
    );

  if(!registro){

    return {

      status:false,

      message:
        'No se encontró la subetapa.'

    };

  }

  const col =
    registro.columnas;

  const fila =
    registro.valores;

  const etapa =
    Number(
      fila[
        col['ETAPA'] - 1
      ]
    );

  const subetapa =
    Number(
      fila[
        col['SUBETAPA'] - 1
      ]
    );

  if(
    !(
      (
        etapa === 1 &&
        subetapa === 1
      )
      ||
      (
        etapa === 2 &&
        subetapa === 1
      )
    )
  ){

    return {

      status:false,

      message:
        'Esta subetapa no admite documentos.'

    };

  }

  /*
    Solo tiene sentido autorizar una nueva
    carga si ya existe un archivo oficial.
  */

  const archivoActual =
    String(
      fila[
        col[
          'ARCHIVO_OFICIAL_ID'
        ] - 1
      ] || ''
    ).trim();

  if(!archivoActual){

    return {

      status:false,

      message:
        'Todavía no existe un documento presentado. No es necesario autorizar una nueva carga.'

    };

  }

  const ahora =
    new Date();

  fila[
    col[
      'PERMITE_NUEVA_CARGA'
    ] - 1
  ] =
    'SI';

  fila[
    col[
      'ULTIMA_ACTUALIZACION'
    ] - 1
  ] =
    ahora;

  const sheet =
    obtenerSheetSubetapas();

  sheet.getRange(
    registro.fila,
    1,
    1,
    sheet.getLastColumn()
  ).setValues([
    fila
  ]);

  return {

    status:true,

    usuario:
      usuario || '',

    message:
      'Se autorizó una nueva carga.'

  };

}


/* =========================================================
   COMPATIBILIDAD CONSOLIDADA - HISTORIAL / NUEVA CARGA
   Mantiene contratos utilizados por Dashboard.html.
========================================================= */

function autorizarNuevaCargaConMensajeV4(id, usuario, correoUsuario, mensaje){
  const lock = LockService.getScriptLock();
  try{
    lock.waitLock(30000);
    const sheet = obtenerSheetSubetapas();
    const col = obtenerColumnasSubetapas();
    validarColumnasSubetapas(col);
    const data = sheet.getDataRange().getValues();
    let fila = -1;
    for(let i=1;i<data.length;i++){
      if(String(data[i][col['ID']-1]) === String(id)){ fila=i; break; }
    }
    if(fila === -1) return {status:false,message:'No se encontró la subetapa.'};
    const ahora = new Date();
    data[fila][col['PERMITE_NUEVA_CARGA']-1] = 'SI';
    data[fila][col['ULTIMA_ACTUALIZACION']-1] = ahora;
    sheet.getRange(fila+1,1,1,sheet.getLastColumn()).setValues([data[fila]]);
    SpreadsheetApp.flush();
    mensaje = String(mensaje||'').trim();
    if(mensaje && typeof guardarMensajeSubetapa === 'function'){
      guardarMensajeSubetapa(id,mensaje,usuario||'',correoUsuario||'');
    }
    return {status:true,permiteNuevaCarga:'SI',message:mensaje?'Nueva carga habilitada y mensaje registrado.':'Nueva carga habilitada correctamente.'};
  }catch(error){
    return {status:false,message:error.message||'No se pudo habilitar la nueva carga.'};
  }finally{ try{lock.releaseLock();}catch(e){} }
}

function obtenerHistorialArchivosSubetapaV6(expediente, etapa, subetapa){
  expediente = String(expediente||'').trim().toUpperCase();
  etapa = Number(etapa); subetapa = Number(subetapa);
  if(!expediente || !etapa || !subetapa) return [];
  const ss = obtenerSSSeguimientoSubetapas();
  const sheet = ss.getSheetByName('ARCHIVOS_SUBETAPAS');
  if(!sheet || sheet.getLastRow()<2) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(v=>String(v||'').trim());
  const c={}; headers.forEach((h,i)=>{if(h)c[h]=i;});
  const lista=[];
  for(let i=1;i<data.length;i++){
    const exp = c.EXPEDIENTE!==undefined?String(data[i][c.EXPEDIENTE]||'').trim().toUpperCase():'';
    const et = c.ETAPA!==undefined?Number(data[i][c.ETAPA]):0;
    const sub = c.SUBETAPA!==undefined?Number(data[i][c.SUBETAPA]):0;
    if(exp!==expediente || et!==etapa || sub!==subetapa) continue;
    const fecha = c.FECHA_HORA!==undefined?data[i][c.FECHA_HORA]:'';
    lista.push({
      version:c.VERSION!==undefined?Number(data[i][c.VERSION]||0):0,
      archivoId:c.ARCHIVO_ID!==undefined?String(data[i][c.ARCHIVO_ID]||''):'',
      archivoNombre:c.ARCHIVO_NOMBRE!==undefined?String(data[i][c.ARCHIVO_NOMBRE]||''):'',
      archivoUrl:c.ARCHIVO_URL!==undefined?String(data[i][c.ARCHIVO_URL]||''):'',
      fecha:fecha?(typeof formatearFechaSubetapa==='function'?formatearFechaSubetapa(fecha):String(fecha)):'',
      nombre:c.SUBIDO_POR!==undefined?String(data[i][c.SUBIDO_POR]||''):'',
      correo:c.CORREO_INVITADO!==undefined?String(data[i][c.CORREO_INVITADO]||''):'',
      oficial:c.OFICIAL!==undefined?String(data[i][c.OFICIAL]||'').toUpperCase()==='SI':false
    });
  }
  lista.sort((a,b)=>Number(a.version||0)-Number(b.version||0));
  if(lista.length && !lista.some(x=>x.oficial)){
    const max=Math.max.apply(null,lista.map(x=>Number(x.version||0)));
    lista.forEach(x=>x.oficial=Number(x.version||0)===max);
  }
  return lista;
}
