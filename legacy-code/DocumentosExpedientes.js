/* =========================================================
   DOCUMENTOS DEL EXPEDIENTE
   SISTEMA DE TITULACIÓN USE FIPS

   LÓGICA:
   - El buscador administrativo puede seguir seleccionando
     al alumno por NOMBRE.
   - Una vez seleccionado, el sistema puede recibir DNI,
     DNI02 o N° DE TRÁMITE.
   - Internamente SIEMPRE resuelve el EXPEDIENTE.
   - La carpeta principal se busca por SETxxx, nunca por DNI.
   - Si el expediente tiene 2 invitados, ambos apuntan a la
     misma carpeta y a los mismos documentos.
========================================================= */


/* =========================================================
   CARPETA RAÍZ DE EXPEDIENTES
========================================================= */

const CARPETA_EXPEDIENTES =
  '1E8--FuQQHPLTwv5v2Wmp7NR5nNKb3CGR';


/* =========================================================
   RESOLVER EXPEDIENTE
   ACEPTA:
   - SET001
   - DNI
   - DNI02
========================================================= */

function resolverExpedienteDocumentos(
  identificador
){

  identificador =
    String(
      identificador || ''
    ).trim();

  if(!identificador){
    return '';
  }

  /*
    Si ya viene SETxxx,
    no es necesario buscar nada más.
  */

  if(
    /^SET\d+$/i.test(
      identificador
    )
  ){

    return identificador.toUpperCase();

  }

  /*
    Primero usamos resolverExpediente()
    si ya existe en SeguimientoSubetapas.gs.
  */

  try{

    const expediente =
      resolverExpediente(
        identificador
      );

    if(expediente){

      return String(
        expediente
      )
      .trim()
      .toUpperCase();

    }

  }catch(error){}


  /*
    Compatibilidad adicional:
    buscar mediante obtenerDatosAlumnoAdmin().
  */

  try{

    const datos =
      obtenerDatosAlumnoAdmin(
        identificador
      );

    if(
      datos &&
      datos.expediente
    ){

      return String(
        datos.expediente
      )
      .trim()
      .toUpperCase();

    }

  }catch(error){}


  return '';

}


/* =========================================================
   BUSCAR CARPETA DEL EXPEDIENTE
========================================================= */

function buscarCarpetaExpediente(
  identificador
){

  const expediente =
    resolverExpedienteDocumentos(
      identificador
    );

  if(!expediente){
    return null;
  }

  const carpetaRaiz =
    DriveApp.getFolderById(
      CARPETA_EXPEDIENTES
    );

  const carpetas =
    carpetaRaiz.getFoldersByName(
      expediente
    );

  if(
    carpetas.hasNext()
  ){

    return carpetas.next();

  }

  return null;

}


/* =========================================================
   COMPATIBILIDAD CON CÓDIGO ANTIGUO

   IMPORTANTE:
   Aunque otra parte del sistema todavía llame
   buscarCarpetaAlumno(dni), esta función YA NO
   busca una carpeta por DNI.

   Convierte:
   DNI -> SETxxx -> carpeta SETxxx
========================================================= */

function buscarCarpetaAlumno(
  identificador
){

  return buscarCarpetaExpediente(
    identificador
  );

}


/* =========================================================
   INFORMACIÓN DE CARPETA
========================================================= */

function obtenerInfoCarpetaExpediente(
  identificador
){

  const expediente =
    resolverExpedienteDocumentos(
      identificador
    );

  if(!expediente){

    return {

      status:false,

      expediente:'',

      message:
        'No se pudo identificar el número de expediente.'

    };

  }

  const carpeta =
    buscarCarpetaExpediente(
      expediente
    );

  if(!carpeta){

    return {

      status:false,

      expediente:
        expediente,

      message:
        'No se encontró la carpeta del expediente ' +
        expediente +
        '.'

    };

  }

  return {

    status:true,

    expediente:
      expediente,

    carpetaId:
      carpeta.getId(),

    carpetaUrl:
      carpeta.getUrl(),

    nombreCarpeta:
      carpeta.getName()

  };

}


/* =========================================================
   OBTENER DOCUMENTOS GOOGLE DOCS DE UNA CARPETA
========================================================= */

function obtenerDocumentosCarpeta(
  carpeta
){

  const documentos =
    [];

  if(!carpeta){
    return documentos;
  }

  recorrerCarpeta(
    carpeta,
    documentos
  );

  return documentos;

}


/* =========================================================
   RECORRER CARPETA RECURSIVAMENTE
========================================================= */

function recorrerCarpeta(
  carpeta,
  documentos
){

  const archivos =
    carpeta.getFiles();

  while(
    archivos.hasNext()
  ){

    const archivo =
      archivos.next();

    /*
      Para la inserción de etiquetas solo
      interesan Google Docs.
    */

    if(
      archivo.getMimeType() ===
      MimeType.GOOGLE_DOCS
    ){

      documentos.push({

        id:
          archivo.getId(),

        nombre:
          archivo.getName(),

        url:
          archivo.getUrl(),

        mimeType:
          archivo.getMimeType()

      });

    }

  }


  const carpetas =
    carpeta.getFolders();

  while(
    carpetas.hasNext()
  ){

    recorrerCarpeta(
      carpetas.next(),
      documentos
    );

  }

}


/* =========================================================
   OBTENER DATOS DEL EXPEDIENTE PARA DOCUMENTOS
   ACEPTA DNI / DNI02 / SETxxx
========================================================= */

function obtenerDatosAlumnoDocumentos(
  identificador
){

  // BD-17.3: los expedientes nuevos ya no existen en COMPAT_EXPEDIENTES.
  // Resolver primero desde las tablas relacionales y conservar el contrato de etiquetas legacy.
  try{
    if(typeof BD16_activo_ === 'function' && BD16_activo_() && typeof BD173_datosDocumentosRelacional_ === 'function'){
      const rel = BD173_datosDocumentosRelacional_(identificador);
      if(rel) return rel;
    }
  }catch(error){
    Logger.log('BD-17.3 obtenerDatosAlumnoDocumentos relacional: ' + (error.message || error));
  }

  const expediente =
    resolverExpedienteDocumentos(
      identificador
    );

  if(!expediente){
    return null;
  }


  const hoja =
    obtenerSheetExpedientes();

  const datos =
    hoja.getDataRange()
      .getValues();

  if(
    datos.length <= 1
  ){
    return null;
  }


  const encabezados =
    datos[0].map(
      function(valor){

        return String(
          valor || ''
        ).trim();

      }
    );


  const indiceExpediente =
    encabezados.indexOf(
      'N° DE TRÁMITE'
    );

  if(
    indiceExpediente === -1
  ){

    throw new Error(
      'No existe la columna N° DE TRÁMITE en EXPEDIENTES.'
    );

  }


  let indiceFila =
    -1;

  for(
    let i = 1;
    i < datos.length;
    i++
  ){

    const expFila =
      String(
        datos[i][
          indiceExpediente
        ] || ''
      )
      .trim()
      .toUpperCase();

    if(
      expFila ===
      expediente
    ){

      indiceFila =
        i;

      break;

    }

  }


  if(
    indiceFila === -1
  ){
    return null;
  }


  const fila =
    datos[
      indiceFila
    ];

  const resultado =
    {};


  encabezados.forEach(
    function(
      cabecera,
      index
    ){

      if(!cabecera){
        return;
      }

      resultado[
        cabecera
      ] =
        fila[index] === null ||
        fila[index] === undefined
        ? ''
        : fila[index];

    }
  );


  /*
    Garantizar siempre el expediente resuelto.
  */

  resultado[
    'N° DE TRÁMITE'
  ] =
    expediente;


  const grupo =
    Number(
      resultado['GRUPO'] || 1
    );

  resultado['GRUPO'] =
    grupo;


  /* =====================================================
     V26 · ALIAS DE CAMPOS PARA DOCUMENTOS

     Los campos del formulario administrativo pueden tener
     encabezados como "N° DECRETO", "N° OFICIO",
     "CO ASESOR", etc., mientras las plantillas suelen usar
     <<DECRETO>>, <<OFICIO>>, <<COASESOR>>, etc.

     Creamos ambas versiones para que funcione igual con
     expedientes de 1 o 2 participantes.
  ===================================================== */

  function valorDocumentoV26(nombres){

    for(
      let i = 0;
      i < nombres.length;
      i++
    ){

      const clave =
        nombres[i];

      if(
        resultado[clave] !== null &&
        resultado[clave] !== undefined &&
        String(resultado[clave]).trim() !== ''
      ){

        return resultado[clave];

      }

    }

    return '';

  }


  const aliasV26 = {

    'DECRETO':
      valorDocumentoV26([
        'DECRETO',
        'N° DECRETO',
        'Nº DECRETO',
        'N DECRETO'
      ]),

    'N° DECRETO':
      valorDocumentoV26([
        'N° DECRETO',
        'DECRETO'
      ]),

    'RECOMENDACION':
      valorDocumentoV26([
        'RECOMENDACION',
        'RECOMENDACIÓN'
      ]),

    'RECOMENDACIÓN':
      valorDocumentoV26([
        'RECOMENDACIÓN',
        'RECOMENDACION'
      ]),

    'PRESIDENTE':
      valorDocumentoV26([
        'PRESIDENTE'
      ]),

    'ASESOR':
      valorDocumentoV26([
        'ASESOR'
      ]),

    'SECRETARIO':
      valorDocumentoV26([
        'SECRETARIO'
      ]),

    'COASESOR':
      valorDocumentoV26([
        'COASESOR',
        'CO ASESOR',
        'CO-ASESOR'
      ]),

    'CO ASESOR':
      valorDocumentoV26([
        'CO ASESOR',
        'COASESOR',
        'CO-ASESOR'
      ]),

    'FECHA APERTURA':
      valorDocumentoV26([
        'FECHA APERTURA',
        'FECHA_APERTURA',
        'FECHA DE APERTURA'
      ]),

    'FECHA_APERTURA':
      valorDocumentoV26([
        'FECHA_APERTURA',
        'FECHA APERTURA',
        'FECHA DE APERTURA'
      ]),

    'FECHA PRESENTACION':
      valorDocumentoV26([
        'FECHA PRESENTACION',
        'FECHA PRESENTACIÓN',
        'FECHA_PRESENTACION',
        'FECHA_PRESENTACIÓN'
      ]),

    'FECHA PRESENTACIÓN':
      valorDocumentoV26([
        'FECHA PRESENTACIÓN',
        'FECHA PRESENTACION',
        'FECHA_PRESENTACIÓN',
        'FECHA_PRESENTACION'
      ]),

    'FECHA_PRESENTACION':
      valorDocumentoV26([
        'FECHA_PRESENTACION',
        'FECHA PRESENTACION',
        'FECHA PRESENTACIÓN'
      ]),

    'OFICIO':
      valorDocumentoV26([
        'OFICIO',
        'N° OFICIO',
        'Nº OFICIO',
        'N OFICIO'
      ]),

    'N° OFICIO':
      valorDocumentoV26([
        'N° OFICIO',
        'OFICIO'
      ]),

    'INTEGRANTE':
      valorDocumentoV26([
        'INTEGRANTE'
      ]),

    'PRESIDENTE ETAPA 02':
      valorDocumentoV26([
        'PRESIDENTE ETAPA 02',
        'PRESIDENTE_ETAPA02'
      ]),

    'SECRETARIO ETAPA 02':
      valorDocumentoV26([
        'SECRETARIO ETAPA 02',
        'SECRETARIO_ETAPA02'
      ]),

    'SUPLENTE ETAPA 02':
      valorDocumentoV26([
        'SUPLENTE ETAPA 02',
        'SUPLENTE_ETAPA02'
      ]),

    'DECANAL':
      valorDocumentoV26([
        'DECANAL'
      ]),

    'FECHA':
      valorDocumentoV26([
        'FECHA',
        'FECHA ACTA',
        'FECHA_ACTA'
      ]),

    'HORA':
      valorDocumentoV26([
        'HORA',
        'HORA ACTA',
        'HORA_ACTA'
      ]),

    'LUGAR SUSTENTACION':
      valorDocumentoV26([
        'LUGAR SUSTENTACION',
        'LUGAR SUSTENTACIÓN',
        'LUGAR_SUSTENTACION'
      ]),

    'LUGAR SUSTENTACIÓN':
      valorDocumentoV26([
        'LUGAR SUSTENTACIÓN',
        'LUGAR SUSTENTACION',
        'LUGAR_SUSTENTACION'
      ])

  };



  /*
    BD-18.13 · MODALIDAD VIRTUAL
    Compatibilidad con las etiquetas históricas:
      <<Mod_F>>
      <<MOD_F>>
      <<MODALIDAD FINAL>>
  */
  /*
    BD-18.15:
    <<Mod_F>> usa PRIMERO el valor exacto de MODALIDAD VIRTUAL
    guardado desde su ComboBox. No modifica su capitalización.
  */
  const modalidadVirtualV1815 =
    valorDocumentoV26([
      'MODALIDAD FINAL',
      'MODALIDAD_FINAL',
      'Mod_F',
      'MOD_F'
    ]) ||
    valorDocumentoV26([
      'MODALIDAD'
    ]);

  if(modalidadVirtualV1815){
    aliasV26['Mod_F'] = String(modalidadVirtualV1815);
    aliasV26['MOD_F'] = String(modalidadVirtualV1815);
    aliasV26['MODALIDAD FINAL'] = String(modalidadVirtualV1815);
    aliasV26['MODALIDAD_FINAL'] = String(modalidadVirtualV1815);
  }


  Object.keys(
    aliasV26
  ).forEach(
    function(clave){

      /*
        No reemplazamos un valor existente por vacío.
      */
      if(
        aliasV26[clave] !== ''
      ){

        resultado[clave] =
          aliasV26[clave];

      }

    }
  );


  /*
    Etiquetas complementarias.
  */

  [
    'NOM_MIN',
    'PROGR_MIN',
    'CORREO_MIN',
    'ASE_MINU',

    'NOMBRES02',
    'NOM_MIN02',
    'DNI02',
    'PROGRAMAS02',
    'PROGR_MIN02',
    'CORREO02',
    'CORREO_MIN02',
    'CUI02',
    'TELEFONO02',
    'NACIONALIDAD02',
    'CIUDAD02',
    'DIRECCION02',
    'TESIS02',
    'MODALIDAD02'

  ].forEach(
    function(campo){

      if(
        resultado[campo] === null ||
        resultado[campo] === undefined
      ){

        resultado[campo] =
          '';

      }

    }
  );


  /* =====================================================
     EXPEDIENTE DE DOS PARTICIPANTES
  ===================================================== */

  if(
    grupo === 2
  ){

    const nombres =
      [
        resultado['NOMBRES'],
        resultado['NOMBRES02']
      ]
      .map(
        function(valor){

          return valor
            ? String(valor).trim()
            : '';

        }
      )
      .filter(Boolean);


    resultado[
      'NOMBRES_INDIVIDUAL01'
    ] =
      resultado['NOMBRES'] || '';


    resultado['NOMBRES'] =
      nombres.join(
        ' Y '
      );


    const autoresOrdenados =
      [
        resultado['NOM_MIN'],
        resultado['NOM_MIN02']
      ]
      .map(
        function(valor){

          return valor
            ? String(valor).trim()
            : '';

        }
      )
      .filter(Boolean)
      .sort(
        function(a,b){

          return a.localeCompare(
            b,
            'es',
            {
              sensitivity:'base'
            }
          );

        }
      );


    resultado[
      'AUTORES_CARATULA'
    ] =
      autoresOrdenados
        .map(
          function(nombre){

            return '• ' +
              nombre;

          }
        )
        .join('\n');


  }else{

    resultado[
      'AUTORES_CARATULA'
    ] =
      resultado[
        'NOM_MIN'
      ] || '';

  }


  return resultado;

}


/* =========================================================
   ESCAPAR EXPRESIÓN REGULAR
========================================================= */

function escaparRegexDocumento(
  texto
){

  return String(
    texto || ''
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

}


/* =========================================================
   INSERTAR DATOS EN UN GOOGLE DOC
========================================================= */

function documentoValorTieneContenido_(valor){

  if(
    valor === null ||
    valor === undefined
  ){
    return false;
  }

  const texto =
    String(valor)
      .trim();

  if(!texto){
    return false;
  }

  return true;

}


/* =========================================================
   QUITAR RESALTADO DE UNA ETIQUETA ANTES DE REEMPLAZARLA

   Esto evita que el valor insertado herede el fondo amarillo
   de una etiqueta que estaba pendiente.
========================================================= */

function limpiarResaltadoEtiquetaDocumento_(
  contenedor,
  etiqueta
){

  if(!contenedor){
    return;
  }

  const regex =
    escaparRegexDocumento(
      etiqueta
    );

  let encontrado =
    null;

  while(
    (
      encontrado =
        contenedor.findText(
          regex,
          encontrado
        )
    )
  ){

    const elemento =
      encontrado.getElement();

    if(
      !elemento ||
      elemento.getType() !==
      DocumentApp.ElementType.TEXT
    ){
      continue;
    }

    const texto =
      elemento.asText();

    const inicio =
      encontrado.getStartOffset();

    const fin =
      encontrado.getEndOffsetInclusive();

    if(
      inicio >= 0 &&
      fin >= inicio
    ){

      texto.setBackgroundColor(
        inicio,
        fin,
        null
      );

    }

  }

}


/* =========================================================
   RESALTAR TODAS LAS ETIQUETAS PENDIENTES <<...>>

   Las etiquetas que todavía existen después de INSERTAR
   significan que aún no tienen información disponible.
========================================================= */

function resaltarEtiquetasPendientesDocumento_(
  contenedor
){

  if(!contenedor){
    return 0;
  }

  /*
    Coincide con cualquier etiqueta tipo:
    <<NOMBRES>>
    <<DECRETO>>
    <<FECHA - ACTAS>>
    etc.
  */

  const patron =
    '<<[^<>]+>>';

  let encontrado =
    null;

  let total =
    0;

  while(
    (
      encontrado =
        contenedor.findText(
          patron,
          encontrado
        )
    )
  ){

    const elemento =
      encontrado.getElement();

    if(
      !elemento ||
      elemento.getType() !==
      DocumentApp.ElementType.TEXT
    ){
      continue;
    }

    const texto =
      elemento.asText();

    const inicio =
      encontrado.getStartOffset();

    const fin =
      encontrado.getEndOffsetInclusive();

    if(
      inicio >= 0 &&
      fin >= inicio
    ){

      /*
        Amarillo suave.
        Se usa un tono legible tanto al imprimir
        como al revisar en pantalla.
      */

      texto.setBackgroundColor(
        inicio,
        fin,
        '#FFF2CC'
      );

      total++;

    }

  }

  return total;

}


/* =========================================================
   REEMPLAZAR ETIQUETAS CON DATOS EN UN CONTENEDOR

   REGLA:
   - Si hay valor: reemplazar.
   - Si está vacío: conservar <<ETIQUETA>>.
========================================================= */

function insertarDatosEnContenedorDocumento_(
  contenedor,
  datosDocumento
){

  if(!contenedor){
    return;
  }

  Object.keys(
    datosDocumento
  ).forEach(
    function(campo){

      let valor =
        datosDocumento[
          campo
        ];

      /*
        MUY IMPORTANTE:
        Si no hay dato, NO hacemos replaceText.
        Así la etiqueta permanece disponible para una
        próxima inserción.
      */

      if(
        !documentoValorTieneContenido_(
          valor
        )
      ){
        return;
      }

      const etiqueta =
        '<<' +
        campo +
        '>>';

      /*
        Primero quitamos el amarillo de la etiqueta.
        De ese modo el texto nuevo no hereda el fondo.
      */

      limpiarResaltadoEtiquetaDocumento_(
        contenedor,
        etiqueta
      );

      contenedor.replaceText(
        escaparRegexDocumento(
          etiqueta
        ),
        String(valor)
      );

    }
  );

}


/* =========================================================
   INSERTAR DATOS EN UN GOOGLE DOC
   BD-18.10 - INSERCIÓN PROGRESIVA

   COMPORTAMIENTO:
   1. Reemplaza solo etiquetas que tengan datos.
   2. Conserva etiquetas cuyo dato siga vacío.
   3. Pinta de amarillo todas las etiquetas pendientes.
   4. Al volver a insertar, las etiquetas que ya tengan
      información se reemplazan y pierden el amarillo.
   5. Aplica al cuerpo, encabezado y pie de página.
========================================================= */

function insertarDatosEnDocumento(
  documentoId,
  datos,
  nombreDocumento
){

  const doc =
    DocumentApp.openById(
      documentoId
    );

  const body =
    doc.getBody();

  const header =
    doc.getHeader();

  const footer =
    doc.getFooter();

  const datosDocumento =
    Object.assign(
      {},
      datos
    );

  const nombreNormalizado =
    String(
      nombreDocumento || ''
    )
    .trim()
    .toUpperCase();

  /*
    BD-18.11 · ASESOR SOLO EN CARÁTULAS

    En el formulario/base se conserva el asesor en MAYÚSCULAS.
    Únicamente al insertar en documentos cuyo nombre contiene
    CARATULA/CARÁTULA se transforma a formato:
      MG. CANAZAS MEJIA MAMANI -> Mg. Canazas Mejia Mamani
      DR. SERGIO TORRES MAMANI -> Dr. Sergio Torres Mamani
  */
  if(
    nombreNormalizado.includes('CARATULA') ||
    nombreNormalizado.includes('CARÁTULA')
  ){
    const asesorCaratula =
      BD1811_nombreProfesionalCaratula_(
        datosDocumento['ASESOR'] || ''
      );

    if(asesorCaratula){
      datosDocumento['ASESOR'] = asesorCaratula;
      datosDocumento['ASE_MINU'] = asesorCaratula;
    }
  }




  /*
    BD-18.13 · FORMATO EXCLUSIVO DE CARÁTULA
    - TESIS: conserva exactamente la escritura del formulario.
    - PROGRAMA: formato natural, sin "IngenieríA".
    - Mod_F: formato natural (Plan de Tesis, Trabajo Académico, etc.).
    - ASESOR: ya se formatea arriba como Mg./Dr. + nombre propio.
  */
  const esCaratulaV1813 =
    nombreNormalizado.includes('CARATULA') ||
    nombreNormalizado.includes('CARÁTULA');

  if(esCaratulaV1813){

    if(typeof BD1813_programaCaratula_ === 'function'){

      const p1 =
        BD1813_programaCaratula_(
          datosDocumento['PROGRAMAS'] ||
          datosDocumento['PROGR_MIN'] ||
          ''
        );

      if(p1){
        datosDocumento['PROGRAMAS'] = p1;
        datosDocumento['PROGR_MIN'] = p1;
      }

      const p2 =
        BD1813_programaCaratula_(
          datosDocumento['PROGRAMAS02'] ||
          datosDocumento['PROGR_MIN02'] ||
          ''
        );

      if(p2){
        datosDocumento['PROGRAMAS02'] = p2;
        datosDocumento['PROGR_MIN02'] = p2;
      }
    }

    /*
      BD-18.15:
      En carátula tampoco recalculamos la modalidad virtual.
      Se conserva exactamente el valor del ComboBox.
    */
    const modFV1815 =
      datosDocumento['MODALIDAD FINAL'] ||
      datosDocumento['MODALIDAD_FINAL'] ||
      datosDocumento['Mod_F'] ||
      datosDocumento['MOD_F'] ||
      '';

    if(modFV1815){
      datosDocumento['Mod_F'] = String(modFV1815);
      datosDocumento['MOD_F'] = String(modFV1815);
      datosDocumento['MODALIDAD FINAL'] = String(modFV1815);
      datosDocumento['MODALIDAD_FINAL'] = String(modFV1815);
    }

    /*
      Ajustes visuales ANTES del replace:
      justificar el párrafo de TESIS y compactar el espacio
      vertical entre TESIS y Mod_F cuando son párrafos del cuerpo.
    */
    if(typeof BD1813_prepararCaratula_ === 'function'){
      BD1813_prepararCaratula_(body);
    }
  }


  /*
    Regla especial para carátula con dos integrantes.
  */

  if(
    Number(
      datos['GRUPO']
    ) === 2
    &&
    nombreNormalizado.includes(
      'CARATULA_PLAN DE TESIS'
    )
  ){

    datosDocumento[
      'NOM_MIN'
    ] =
      datos[
        'AUTORES_CARATULA'
      ] || '';

  }


  /*
    1. INSERTAR SOLO DATOS EXISTENTES
  */

  insertarDatosEnContenedorDocumento_(
    body,
    datosDocumento
  );

  insertarDatosEnContenedorDocumento_(
    header,
    datosDocumento
  );

  insertarDatosEnContenedorDocumento_(
    footer,
    datosDocumento
  );


  /*
    2. RESALTAR ETIQUETAS QUE AÚN SIGUEN PENDIENTES
  */

  const pendientesBody =
    resaltarEtiquetasPendientesDocumento_(
      body
    );

  const pendientesHeader =
    resaltarEtiquetasPendientesDocumento_(
      header
    );

  const pendientesFooter =
    resaltarEtiquetasPendientesDocumento_(
      footer
    );


  doc.saveAndClose();


  return {

    status:true,

    documentoId:
      documentoId,

    pendientes:
      pendientesBody +
      pendientesHeader +
      pendientesFooter

  };

}


/* =========================================================
   INSERTAR EN TODOS LOS DOCUMENTOS DEL EXPEDIENTE
========================================================= */

function insertarEnCarpetaExpediente(
  carpeta,
  datos
){

  const documentos =
    obtenerDocumentosCarpeta(
      carpeta
    );

  documentos.forEach(
    function(documento){

      insertarDatosEnDocumento(
        documento.id,
        datos,
        documento.nombre
      );

    }
  );

  return documentos.length;

}


/* =========================================================
   INSERTAR DOCUMENTACIÓN

   ACEPTA:
   DNI
   DNI02
   SETxxx

   Internamente siempre trabaja con SETxxx.
========================================================= */

function insertarDocumentosAlumno(
  identificador
){

  const expediente =
    resolverExpedienteDocumentos(
      identificador
    );

  if(!expediente){

    return {

      status:false,

      message:
        'NO SE PUDO IDENTIFICAR EL NÚMERO DE EXPEDIENTE.'

    };

  }


  const datos =
    obtenerDatosAlumnoDocumentos(
      expediente
    );

  if(!datos){

    return {

      status:false,

      expediente:
        expediente,

      message:
        'NO EXISTE INFORMACIÓN DEL EXPEDIENTE ' +
        expediente

    };

  }


  const carpeta =
    buscarCarpetaExpediente(
      expediente
    );

  if(!carpeta){

    return {

      status:false,

      expediente:
        expediente,

      message:
        'NO SE ENCONTRÓ LA CARPETA DEL EXPEDIENTE ' +
        expediente

    };

  }


  const total =
    insertarEnCarpetaExpediente(
      carpeta,
      datos
    );


  return {

    status:true,

    total:
      total,

    expediente:
      expediente,

    url:
      carpeta.getUrl(),

    carpeta:{

      expediente:
        expediente,

      id:
        carpeta.getId(),

      url:
        carpeta.getUrl()

    },

    grupo:
      Number(
        datos['GRUPO'] || 1
      ),

    message:
      'Datos insertados correctamente en el expediente ' +
      expediente +
      '.'

  };

}


/* =========================================================
   OBTENER DOCUMENTOS DEL EXPEDIENTE

   IMPORTANTE:
   Conservamos el nombre obtenerDocumentosAlumno()
   porque Dashboard posiblemente ya lo llama.

   PERO YA NO BUSCA CARPETA POR DNI.
========================================================= */

function obtenerDocumentosAlumno(
  identificador
){

  const expediente =
    resolverExpedienteDocumentos(
      identificador
    );

  if(!expediente){

    return [];

  }


  const carpeta =
    buscarCarpetaExpediente(
      expediente
    );


  if(!carpeta){

    return [];

  }


  return obtenerDocumentosCarpeta(
    carpeta
  );

}


/* =========================================================
   OBTENER DOCUMENTOS + INFORMACIÓN DEL EXPEDIENTE
========================================================= */

function obtenerDocumentosExpedienteAdmin(
  identificador
){

  const expediente =
    resolverExpedienteDocumentos(
      identificador
    );

  if(!expediente){

    return {

      status:false,

      expediente:'',

      documentos:[],

      message:
        'No se pudo identificar el expediente.'

    };

  }


  const carpeta =
    buscarCarpetaExpediente(
      expediente
    );


  if(!carpeta){

    return {

      status:false,

      expediente:
        expediente,

      documentos:[],

      message:
        'No se encontró la carpeta del expediente ' +
        expediente +
        '.'

    };

  }


  return {

    status:true,

    expediente:
      expediente,

    carpetaId:
      carpeta.getId(),

    carpetaUrl:
      carpeta.getUrl(),

    documentos:
      obtenerDocumentosCarpeta(
        carpeta
      )

  };

}


/* =========================================================
   CARGAR HTML DE DOCUMENTOS
========================================================= */

function cargarDocumentosDash(){

  return HtmlService
    .createHtmlOutputFromFile(
      'documentosDash'
    )
    .getContent();

}


/* =========================================================
   PRUEBA
========================================================= */
/* =========================================================
   V22 · CARPETA DOCUMENTOS DEL EXPEDIENTE
   Estas funciones conservan exactamente los nombres
   utilizados por Dashboard.html.
========================================================= */

function obtenerCarpetaDocumentosExpedienteV22(expediente, crearSiNoExiste){

  expediente =
    resolverExpedienteDocumentos(
      expediente
    );

  if(!expediente){
    throw new Error(
      'No se pudo identificar el expediente.'
    );
  }

  const carpetaExpediente =
    buscarCarpetaExpediente(
      expediente
    );

  if(!carpetaExpediente){
    throw new Error(
      'No se encontró la carpeta oficial del expediente ' +
      expediente +
      '.'
    );
  }

  const carpetas =
    carpetaExpediente.getFoldersByName(
      'DOCUMENTOS'
    );

  if(carpetas.hasNext()){
    return carpetas.next();
  }

  if(crearSiNoExiste){
    return carpetaExpediente.createFolder(
      'DOCUMENTOS'
    );
  }

  return null;
}


function archivoPerteneceACarpetaV22(
  archivoId,
  carpetaId
){

  try{

    const archivo =
      DriveApp.getFileById(
        archivoId
      );

    const padres =
      archivo.getParents();

    while(padres.hasNext()){

      const padre =
        padres.next();

      if(
        padre.getId() ===
        carpetaId
      ){
        return true;
      }
    }

  }catch(error){}

  return false;
}


function formatearTamanoArchivoV22_(bytes){

  bytes = Number(bytes || 0);

  if(bytes < 1024){
    return bytes + ' B';
  }

  if(bytes < 1024 * 1024){
    return (
      bytes / 1024
    ).toFixed(1) + ' KB';
  }

  return (
    bytes /
    (
      1024 *
      1024
    )
  ).toFixed(1) + ' MB';
}


function formatearFechaDocumentoV22_(fecha){

  if(
    !(fecha instanceof Date) ||
    isNaN(fecha.getTime())
  ){
    return '';
  }

  return Utilities.formatDate(
    fecha,
    Session.getScriptTimeZone() ||
      'America/Lima',
    'dd/MM/yyyy HH:mm'
  );
}


/* =========================================================
   V22 · LISTAR DOCUMENTOS GUARDADOS
========================================================= */

function listarDocumentosExpedienteV22(
  expediente
){

  try{

    expediente =
      resolverExpedienteDocumentos(
        expediente
      );

    if(!expediente){
      return {
        status:false,
        message:
          'No se pudo identificar el expediente.',
        archivos:[]
      };
    }

    const carpeta =
      obtenerCarpetaDocumentosExpedienteV22(
        expediente,
        false
      );

    if(!carpeta){
      return {
        status:true,
        expediente:expediente,
        carpetaId:'',
        carpetaUrl:'',
        archivos:[]
      };
    }

    const archivos = [];
    const it = carpeta.getFiles();

    while(it.hasNext()){

      const archivo =
        it.next();

      archivos.push({
        id:archivo.getId(),
        nombre:archivo.getName(),
        url:archivo.getUrl(),
        mimeType:archivo.getMimeType(),
        tamano:Number(
          archivo.getSize() || 0
        ),
        tamanoTexto:
          formatearTamanoArchivoV22_(
            archivo.getSize()
          ),
        fechaModificacion:
          formatearFechaDocumentoV22_(
            archivo.getLastUpdated()
          )
      });
    }

    archivos.sort(
      function(a,b){
        return String(a.nombre || '')
          .localeCompare(
            String(b.nombre || ''),
            'es',
            {
              sensitivity:'base'
            }
          );
      }
    );

    return {
      status:true,
      expediente:expediente,
      carpetaId:carpeta.getId(),
      carpetaUrl:carpeta.getUrl(),
      archivos:archivos
    };

  }catch(error){

    return {
      status:false,
      message:
        error.message ||
        'No se pudieron listar los documentos.',
      archivos:[]
    };
  }
}


/* =========================================================
   V22 · SUBIR HASTA 5 DOCUMENTOS
========================================================= */

function subirDocumentosExpedienteV22(
  datos
){

  try{

    datos = datos || {};

    const expediente =
      resolverExpedienteDocumentos(
        datos.expediente
      );

    const archivos =
      Array.isArray(datos.archivos)
        ? datos.archivos
        : [];

    if(!expediente){
      return {
        status:false,
        message:
          'No se pudo identificar el expediente.'
      };
    }

    if(!archivos.length){
      return {
        status:false,
        message:
          'No se recibieron archivos.'
      };
    }

    if(archivos.length > 5){
      return {
        status:false,
        message:
          'Puede subir como máximo 5 archivos a la vez.'
      };
    }

    const carpeta =
      obtenerCarpetaDocumentosExpedienteV22(
        expediente,
        true
      );

    const creados = [];

    for(
      let i = 0;
      i < archivos.length;
      i++
    ){

      const item =
        archivos[i] || {};

      let nombre =
        String(
          item.nombre ||
          (
            'documento_' +
            (i + 1) +
            '.pdf'
          )
        ).trim();

      const mimeType =
        String(
          item.mimeType ||
          'application/pdf'
        ).trim();

      if(!item.base64){
        throw new Error(
          'El archivo ' +
          nombre +
          ' no contiene información.'
        );
      }

      /*
        Esta pestaña del Dashboard está diseñada
        actualmente para documentos PDF.
      */
      if(
        mimeType !== 'application/pdf'
      ){
        throw new Error(
          'Solo se permiten archivos PDF en DOCUMENTOS.'
        );
      }

      if(!/\.pdf$/i.test(nombre)){
        nombre += '.pdf';
      }

      const bytes =
        Utilities.base64Decode(
          item.base64
        );

      if(
        bytes.length >
        10 * 1024 * 1024
      ){
        throw new Error(
          'El archivo "' +
          nombre +
          '" supera el máximo de 10 MB.'
        );
      }

      const archivo =
        carpeta.createFile(
          Utilities.newBlob(
            bytes,
            mimeType,
            nombre
          )
        );

      creados.push({
        id:archivo.getId(),
        nombre:archivo.getName(),
        url:archivo.getUrl()
      });
    }

    return {
      status:true,
      expediente:expediente,
      archivos:creados,
      message:
        creados.length === 1
          ? 'Documento subido correctamente.'
          : creados.length +
            ' documentos subidos correctamente.'
    };

  }catch(error){

    return {
      status:false,
      message:
        error.message ||
        'No se pudieron subir los documentos.'
    };
  }
}


/* =========================================================
   V22 · RENOMBRAR DOCUMENTO
========================================================= */

function renombrarDocumentoExpedienteV22(
  expediente,
  archivoId,
  nuevoNombre
){

  try{

    expediente =
      resolverExpedienteDocumentos(
        expediente
      );

    archivoId =
      String(
        archivoId || ''
      ).trim();

    nuevoNombre =
      String(
        nuevoNombre || ''
      ).trim();

    if(
      !expediente ||
      !archivoId ||
      !nuevoNombre
    ){
      return {
        status:false,
        message:
          'Faltan datos para renombrar el archivo.'
      };
    }

    const carpeta =
      obtenerCarpetaDocumentosExpedienteV22(
        expediente,
        false
      );

    if(!carpeta){
      return {
        status:false,
        message:
          'No existe la carpeta DOCUMENTOS del expediente.'
      };
    }

    if(
      !archivoPerteneceACarpetaV22(
        archivoId,
        carpeta.getId()
      )
    ){
      return {
        status:false,
        message:
          'El archivo no pertenece a este expediente.'
      };
    }

    const archivo =
      DriveApp.getFileById(
        archivoId
      );

    if(
      archivo.getMimeType() ===
      'application/pdf' &&
      !/\.pdf$/i.test(nuevoNombre)
    ){
      nuevoNombre += '.pdf';
    }

    archivo.setName(
      nuevoNombre
    );

    return {
      status:true,
      expediente:expediente,
      id:archivo.getId(),
      nombre:archivo.getName(),
      url:archivo.getUrl(),
      message:
        'Documento renombrado correctamente.'
    };

  }catch(error){

    return {
      status:false,
      message:
        error.message ||
        'No se pudo renombrar el documento.'
    };
  }
}


/* =========================================================
   V22 · ELIMINAR DOCUMENTO
========================================================= */

function eliminarDocumentoExpedienteV22(
  expediente,
  archivoId
){

  try{

    expediente =
      resolverExpedienteDocumentos(
        expediente
      );

    archivoId =
      String(
        archivoId || ''
      ).trim();

    if(
      !expediente ||
      !archivoId
    ){
      return {
        status:false,
        message:
          'Faltan datos para eliminar el archivo.'
      };
    }

    const carpeta =
      obtenerCarpetaDocumentosExpedienteV22(
        expediente,
        false
      );

    if(!carpeta){
      return {
        status:false,
        message:
          'No existe la carpeta DOCUMENTOS del expediente.'
      };
    }

    if(
      !archivoPerteneceACarpetaV22(
        archivoId,
        carpeta.getId()
      )
    ){
      return {
        status:false,
        message:
          'El archivo no pertenece a este expediente.'
      };
    }

    const archivo =
      DriveApp.getFileById(
        archivoId
      );

    const nombre =
      archivo.getName();

    /*
      Se envía a papelera para permitir recuperación
      desde Drive si fuera necesario.
    */
    archivo.setTrashed(
      true
    );

    return {
      status:true,
      expediente:expediente,
      id:archivoId,
      nombre:nombre,
      message:
        'Documento eliminado correctamente.'
    };

  }catch(error){

    return {
      status:false,
      message:
        error.message ||
        'No se pudo eliminar el documento.'
    };
  }
}