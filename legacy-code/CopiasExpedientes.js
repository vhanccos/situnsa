/* =====================================================
   COPIAS DE EXPEDIENTE
   SISTEMA DE TITULACIÓN USE FIPS

   LÓGICA:
   - Se crea UNA sola carpeta por EXPEDIENTE.
   - Si existen 1 o 2 participantes, ambos comparten
     la misma carpeta del expediente.
   - La plantilla se copia UNA sola vez.
===================================================== */

const CARPETA_RAIZ_EXPEDIENTES =
  '1E8--FuQQHPLTwv5v2Wmp7NR5nNKb3CGR';

const CARPETA_PLANTILLA_EXPEDIENTE =
  '1_dGNq_CVAb_VkLOfHJ0VYndCteDmLY3T';


function obtenerClaveProgreso(expediente){
  return (
    'COPIA_EXP_' +
    String(expediente || '')
      .trim()
      .toUpperCase()
  );
}


function guardarProgresoCopia(expediente, progreso, estado){
  const propiedades =
    PropertiesService.getScriptProperties();

  propiedades.setProperty(
    obtenerClaveProgreso(expediente),
    JSON.stringify({
      expediente:
        String(expediente || '')
          .trim()
          .toUpperCase(),
      progreso:Number(progreso || 0),
      estado:estado || '',
      fecha:new Date().getTime()
    })
  );
}


function obtenerProgresoCopias(){
  const propiedades =
    PropertiesService.getScriptProperties();

  const todas =
    propiedades.getProperties();

  const lista = [];

  Object.keys(todas).forEach(function(clave){
    if(!clave.startsWith('COPIA_EXP_')){
      return;
    }

    try{
      lista.push(JSON.parse(todas[clave]));
    }catch(error){
      Logger.log('ERROR PROGRESO: ' + error);
    }
  });

  lista.sort(function(a,b){
    return (b.fecha || 0) - (a.fecha || 0);
  });

  const ahora = new Date().getTime();
  const LIMITE = 10 * 60 * 1000;

  lista.forEach(function(item){
    if(
      Number(item.progreso || 0) >= 100 &&
      ahora - Number(item.fecha || 0) > LIMITE
    ){
      propiedades.deleteProperty(
        obtenerClaveProgreso(item.expediente)
      );
    }
  });

  return lista;
}


function iniciarCopias(datos){
  if(!datos || !datos.expediente){
    return {
      status:false,
      message:'No se recibió el expediente.'
    };
  }

  if(
    !Array.isArray(datos.participantes) ||
    datos.participantes.length === 0
  ){
    return {
      status:false,
      message:'No se recibieron participantes.'
    };
  }

  const expediente =
    String(datos.expediente)
      .trim()
      .toUpperCase();

  guardarProgresoCopia(
    expediente,
    5,
    'Preparando documentación'
  );

  try{
    const carpetaRaiz =
      DriveApp.getFolderById(
        CARPETA_RAIZ_EXPEDIENTES
      );

    const carpetaPlantilla =
      DriveApp.getFolderById(
        CARPETA_PLANTILLA_EXPEDIENTE
      );

    guardarProgresoCopia(
      expediente,
      15,
      'Validando expediente'
    );

    const carpetaExpediente =
      obtenerOCrearCarpetaExpediente(
        carpetaRaiz,
        expediente
      );

    guardarProgresoCopia(
      expediente,
      30,
      'Carpeta ' + expediente + ' preparada'
    );

    guardarProgresoCopia(
      expediente,
      45,
      'Copiando estructura del expediente'
    );

    if(typeof BD173_copiarPlantillaInicialRapida_ === 'function'){
      BD173_copiarPlantillaInicialRapida_(carpetaPlantilla, carpetaExpediente);
    }else{
      copiarContenidoCarpeta(
        carpetaPlantilla,
        carpetaExpediente
      );
    }

    guardarProgresoCopia(
      expediente,
      85,
      'Documentación copiada'
    );

    crearResumenParticipantesExpediente(
      carpetaExpediente,
      expediente,
      datos.participantes
    );

    guardarProgresoCopia(
      expediente,
      95,
      'Finalizando generación'
    );


    guardarProgresoCopia(
      expediente,
      100,
      'Documentación generada correctamente'
    );

    return {
      status:true,
      expediente:expediente,
      carpetaId:carpetaExpediente.getId(),
      carpetaUrl:carpetaExpediente.getUrl(),
      participantes:datos.participantes.length,
      message:
        'Carpeta y documentos del expediente generados correctamente.'
    };

  }catch(error){
    guardarProgresoCopia(
      expediente,
      100,
      'ERROR: ' + error.message
    );

    Logger.log(
      'ERROR iniciarCopias: ' +
      (error.stack || error.message || error)
    );

    return {
      status:false,
      expediente:expediente,
      message:
        error.message ||
        'No se pudo generar la carpeta del expediente.'
    };
  }
}


function obtenerOCrearCarpetaExpediente(
  carpetaRaiz,
  expediente
){
  expediente =
    String(expediente || '')
      .trim()
      .toUpperCase();

  if(!expediente){
    throw new Error(
      'El número de expediente está vacío.'
    );
  }

  const carpetas =
    carpetaRaiz.getFoldersByName(expediente);

  if(carpetas.hasNext()){
    return carpetas.next();
  }

  return carpetaRaiz.createFolder(expediente);
}


/* Compatibilidad temporal con código antiguo.
   IMPORTANTE: la referencia debe ser ya el expediente SETxxx. */
function obtenerOCrearCarpetaAlumno(
  carpetaRaiz,
  referencia
){
  return obtenerOCrearCarpetaExpediente(
    carpetaRaiz,
    referencia
  );
}


function copiarContenidoCarpeta(origen, destino){
  const archivos = origen.getFiles();

  while(archivos.hasNext()){
    const archivo = archivos.next();

    const existentes =
      destino.getFilesByName(
        archivo.getName()
      );

    if(existentes.hasNext()){
      continue;
    }

    archivo.makeCopy(
      archivo.getName(),
      destino
    );
  }

  const subcarpetas =
    origen.getFolders();

  while(subcarpetas.hasNext()){
    const subOrigen =
      subcarpetas.next();

    const nombre =
      subOrigen.getName();

    let subDestino;

    const existentes =
      destino.getFoldersByName(nombre);

    if(existentes.hasNext()){
      subDestino = existentes.next();
    }else{
      subDestino =
        destino.createFolder(nombre);
    }

    copiarContenidoCarpeta(
      subOrigen,
      subDestino
    );
  }
}


function crearResumenParticipantesExpediente(
  carpetaExpediente,
  expediente,
  participantes
){
  try{
    const nombreArchivo =
      'DATOS_PARTICIPANTES_' +
      expediente +
      '.txt';

    const existentes =
      carpetaExpediente.getFilesByName(
        nombreArchivo
      );

    if(existentes.hasNext()){
      return;
    }

    let contenido =
      'SISTEMA DE TITULACIÓN USE FIPS\n' +
      'EXPEDIENTE: ' +
      expediente +
      '\n\n';

    participantes.forEach(function(participante,index){
      contenido +=
        'PARTICIPANTE ' +
        (index + 1) +
        '\n' +
        'DNI: ' +
        (participante.dni || '') +
        '\n' +
        'NOMBRE: ' +
        (
          participante.nombres ||
          participante.nombre ||
          ''
        ) +
        '\n\n';
    });

    carpetaExpediente.createFile(
      nombreArchivo,
      contenido,
      MimeType.PLAIN_TEXT
    );

  }catch(error){
    Logger.log(
      'ERROR crearResumenParticipantesExpediente: ' +
      error.message
    );
  }
}


function obtenerCarpetaExpediente(expediente){
  expediente =
    String(expediente || '')
      .trim()
      .toUpperCase();

  if(!expediente){
    return null;
  }

  const carpetaRaiz =
    DriveApp.getFolderById(
      CARPETA_RAIZ_EXPEDIENTES
    );

  const carpetas =
    carpetaRaiz.getFoldersByName(
      expediente
    );

  if(carpetas.hasNext()){
    return carpetas.next();
  }

  return null;
}


function obtenerUrlCarpetaExpediente(expediente){
  const carpeta =
    obtenerCarpetaExpediente(
      expediente
    );

  if(!carpeta){
    return {
      status:false,
      message:
        'No se encontró la carpeta del expediente.'
    };
  }

  return {
    status:true,
    expediente:
      String(expediente || '')
        .trim()
        .toUpperCase(),
    id:carpeta.getId(),
    url:carpeta.getUrl()
  };
}