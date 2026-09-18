/* =========================================================
   SEGUIMIENTO DE SUBETAPAS - SISTEMA DE TITULACIÓN
   LÓGICA PRINCIPAL POR EXPEDIENTE
========================================================= */

const ID_SEGUIMIENTO_SUBETAPAS =
  '1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs';

const RESPONSABLE_ETAPAS_1_2 =
  'fips_usesp_aaa@unsa.edu.pe';

const RESPONSABLE_ETAPAS_3_7 =
  'fips_usesp@unsa.edu.pe';


/* =========================================================
   DEFINICIÓN DEL FLUJO
========================================================= */

const FLUJO_TITULACION = {

  1: {
    nombre: 'Verificación Inicial de Documentos',
    subetapas: [
      { descripcion:'Presentación del Plan de Tesis / Trabajo Académico', plazo:'Según fecha de presentación del alumno' },
      { descripcion:'Validación de documentos administrativos', plazo:'1 a 3 días hábiles' },
      { descripcion:'Asignación de jurados', plazo:'1 a 2 días hábiles' },
      { descripcion:'Revisión del plan por la terna', plazo:'3 a 5 días hábiles' },
      { descripcion:'Levantamiento de observaciones por el alumno', plazo:'2 a 5 días hábiles' },
      { descripcion:'Emisión del decreto de aprobación', plazo:'2 a 4 días hábiles' }
    ]
  },

  2: {
    nombre: 'Presentación del Borrador de Tesis',
    subetapas: [
      { descripcion:'Carga de documentos', plazo:'Variable' },
      { descripcion:'Revisión documental', plazo:'2 a 5 días hábiles' },
      { descripcion:'Validación del expediente', plazo:'1 a 3 días hábiles' }
    ]
  },

  3: {
    nombre: 'Evaluación del Expediente',
    subetapas: [
      { descripcion:'Recepción y validación del expediente', plazo:'1 a 2 días hábiles' },
      { descripcion:'Programación de sorteo de jurados', plazo:'2 a 7 días hábiles' },
      { descripcion:'Revisión del borrador por jurados', plazo:'20 días hábiles' },
      { descripcion:'Emisión de observaciones', plazo:'Incluido en revisión' },
      { descripcion:'Levantamiento de observaciones por el alumno', plazo:'2 a 10 días hábiles' },
      { descripcion:'Conformidad final de jurados', plazo:'1 a 3 días hábiles' }
    ]
  },

  4: {
    nombre: 'Programación y Sustentación',
    subetapas: [
      { descripcion:'Propuesta de fechas por el alumno', plazo:'1 a 3 días hábiles' },
      { descripcion:'Coordinación con jurados', plazo:'2 a 5 días hábiles' },
      { descripcion:'Publicación oficial de sustentación', plazo:'1 día hábil' },
      { descripcion:'Presentación de versión final', plazo:'1 a 2 días hábiles antes de sustentar' },
      { descripcion:'Sustentación presencial', plazo:'Fecha programada' }
    ]
  },

  5: {
    nombre: 'Validaciones Institucionales',
    subetapas: [
      { descripcion:'Evaluación en Turnitin', plazo:'5 a 20 días hábiles' },
      { descripcion:'Revisión de similitud', plazo:'1 a 3 días hábiles' },
      { descripcion:'Emisión del informe de similitud', plazo:'1 a 2 días hábiles' },
      { descripcion:'Firma del informe', plazo:'2 a 5 días hábiles' },
      { descripcion:'Registro en repositorio institucional', plazo:'5 a 15 días hábiles' },
      { descripcion:'Generación de URL del repositorio', plazo:'1 día hábil' }
    ]
  },

  6: {
    nombre: 'Aprobaciones Institucionales',
    subetapas: [
      { descripcion:'Revisión por Secretaría Académica', plazo:'2 a 6 días hábiles' },
      { descripcion:'Comisión de Grados y Títulos', plazo:'2 a 5 días hábiles' },
      { descripcion:'Consejo de Facultad', plazo:'Según sesión programada' },
      { descripcion:'Emisión de resolución', plazo:'4 a 6 días hábiles' },
      { descripcion:'Registro en SISGRAD', plazo:'1 a 3 días hábiles' },
      { descripcion:'Validación de datos del alumno', plazo:'1 a 2 días hábiles' },
      { descripcion:'Firma de autorización del Decano', plazo:'1 a 2 días hábiles' },
      { descripcion:'Revisión por Oficina de Grados y Títulos', plazo:'5 a 15 días hábiles' },
      { descripcion:'Aprobación por Consejo Universitario', plazo:'5 a 15 días hábiles' }
    ]
  },

  7: {
    nombre: 'Registro y Emisión del Título',
    subetapas: [
      { descripcion:'Programación de colación', plazo:'Según cronograma institucional' },
      { descripcion:'Emisión del título profesional', plazo:'3 a 7 días hábiles' },
      { descripcion:'Registro del título en SUNEDU', plazo:'Aproximadamente 15 días posteriores a la colación' }
    ]
  }

};


/* =========================================================
   HOJAS
========================================================= */

function obtenerSSSeguimientoSubetapas(){

  return SpreadsheetApp.openById(
    ID_SEGUIMIENTO_SUBETAPAS
  );

}


function obtenerSheetSubetapas(){

  const ss =
    obtenerSSSeguimientoSubetapas();

  const sheet =
    ss.getSheetByName(
      'COMPAT_SEGUIMIENTO_SUBETAPAS'
    );

  if(!sheet){

    throw new Error(
      'No existe la hoja SEGUIMIENTO_SUBETAPAS'
    );

  }

  return sheet;

}


function obtenerSheetMensajesSubetapas(){

  const ss =
    obtenerSSSeguimientoSubetapas();

  return ss.getSheetByName(
    'COMPAT_MENSAJES_SUBETAPAS'
  );

}


function obtenerSheetArchivosSubetapas(){

  const ss =
    obtenerSSSeguimientoSubetapas();

  return ss.getSheetByName(
    'COMPAT_ARCHIVOS_SUBETAPAS'
  );

}


/* =========================================================
   COLUMNAS
========================================================= */

function obtenerColumnasSubetapas(){

  const sheet =
    obtenerSheetSubetapas();

  const headers =
    sheet.getRange(
      1,
      1,
      1,
      sheet.getLastColumn()
    ).getValues()[0];

  const col = {};

  headers.forEach(function(header,index){

    const nombre =
      header
      ? header.toString().trim()
      : '';

    if(nombre){

      col[nombre] =
        index + 1;

    }

  });

  return col;

}


function validarColumnasSubetapas(
  col
){

  const obligatorias = [

    'ID',
    'EXPEDIENTE',
    'ETAPA',
    'NOMBRE_ETAPA',
    'SUBETAPA',
    'DESCRIPCION',
    'PLAZO',
    'ESTADO',
    'FECHA_INICIO',
    'USUARIO_INICIO',
    'CORREO_RESPONSABLE',
    'FECHA_FIN',
    'USUARIO_FIN',
    'DELEGADO_POR',
    'FECHA_DELEGACION',
    'ARCHIVO_OFICIAL_ID',
    'ARCHIVO_OFICIAL_NOMBRE',
    'ARCHIVO_OFICIAL_URL',
    'VERSION_ARCHIVO',
    'PERMITE_NUEVA_CARGA',
    'ULTIMA_ACTUALIZACION'

  ];

  const faltantes =
    obligatorias.filter(
      function(nombre){

        return !col[nombre];

      }
    );

  if(faltantes.length){

    throw new Error(
      'Faltan columnas en SEGUIMIENTO_SUBETAPAS: ' +
      faltantes.join(', ')
    );

  }

}


/* =========================================================
   UTILIDADES
========================================================= */

function responsableDefectoEtapa(
  etapa
){

  etapa =
    Number(etapa);

  return (
    etapa === 1 ||
    etapa === 2
  )
    ? RESPONSABLE_ETAPAS_1_2
    : RESPONSABLE_ETAPAS_3_7;

}


function formatearFechaSubetapa(
  fecha
){

  if(!fecha){
    return '';
  }

  if(
    Object.prototype
      .toString
      .call(fecha)
    ===
    '[object Date]'
  ){

    return Utilities.formatDate(
      fecha,
      Session.getScriptTimeZone() ||
      'America/Lima',
      'dd/MM/yyyy HH:mm:ss'
    );

  }

  return fecha.toString();

}


function obtenerExpedientePorDni(
  dni
){

  const sheet =
    obtenerSheetExpedientes();

  const columnas =
    obtenerColumnas(
      sheet
    );

  const data =
    sheet.getDataRange()
      .getValues();

  dni =
    dni
    ? dni.toString().trim()
    : '';

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    const dni1 =
      columnas['DNI']
      &&
      data[i][
        columnas['DNI'] - 1
      ]
      ? data[i][
          columnas['DNI'] - 1
        ].toString().trim()
      : '';

    const dni2 =
      columnas['DNI02']
      &&
      data[i][
        columnas['DNI02'] - 1
      ]
      ? data[i][
          columnas['DNI02'] - 1
        ].toString().trim()
      : '';

    if(
      dni === dni1 ||
      dni === dni2
    ){

      return (
        data[i][
          columnas[
            'N° DE TRÁMITE'
          ] - 1
        ] || ''
      )
      .toString()
      .trim()
      .toUpperCase();

    }

  }

  return '';

}


function resolverExpediente(
  referencia
){

  referencia =
    referencia
    ? referencia.toString().trim()
    : '';

  if(!referencia){
    return '';
  }

  if(
    /^SET\d+$/i.test(
      referencia
    )
  ){

    return referencia.toUpperCase();

  }

  return obtenerExpedientePorDni(
    referencia
  );

}


/* =========================================================
   CREAR SUBETAPAS: UNA SOLA ESTRUCTURA POR EXPEDIENTE
========================================================= */

function crearSubetapasIniciales(
  datos
){

  if(
    !datos ||
    !datos.expediente
  ){

    return {
      status:false,
      message:'No se recibió el expediente'
    };

  }

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

  const expediente =
    datos.expediente
      .toString()
      .trim()
      .toUpperCase();

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    const expFila =
      data[i][
        col['EXPEDIENTE'] - 1
      ]
      ? data[i][
          col['EXPEDIENTE'] - 1
        ]
        .toString()
        .trim()
        .toUpperCase()
      : '';

    if(
      expFila === expediente
    ){

      return {
        status:true,
        message:
          'Las subetapas del expediente ya existen'
      };

    }

  }

  let siguienteId = 1;

  if(data.length > 1){

    const ids =
      data.slice(1)
      .map(
        function(r){

          return Number(
            r[col['ID'] - 1]
          ) || 0;

        }
      );

    siguienteId =
      Math.max.apply(
        null,
        ids
      ) + 1;

  }

  const filas = [];

  Object.keys(
    FLUJO_TITULACION
  ).forEach(
    function(numeroEtapa){

      const info =
        FLUJO_TITULACION[
          numeroEtapa
        ];

      const responsable =
        responsableDefectoEtapa(
          numeroEtapa
        );

      info.subetapas.forEach(
        function(sub,index){

          const fila =
            new Array(
              sheet.getLastColumn()
            ).fill('');

          fila[
            col['ID'] - 1
          ] =
            siguienteId++;

          fila[
            col['EXPEDIENTE'] - 1
          ] =
            expediente;

          fila[
            col['ETAPA'] - 1
          ] =
            Number(numeroEtapa);

          fila[
            col['NOMBRE_ETAPA'] - 1
          ] =
            info.nombre;

          fila[
            col['SUBETAPA'] - 1
          ] =
            index + 1;

          fila[
            col['DESCRIPCION'] - 1
          ] =
            sub.descripcion;

          fila[
            col['PLAZO'] - 1
          ] =
            sub.plazo;

          fila[
            col['ESTADO'] - 1
          ] =
            'NO INICIADO';

          fila[
            col['CORREO_RESPONSABLE'] - 1
          ] =
            responsable;

          fila[
            col['VERSION_ARCHIVO'] - 1
          ] =
            0;

          fila[
            col['PERMITE_NUEVA_CARGA'] - 1
          ] =
            'NO';

          filas.push(
            fila
          );

        }
      );

    }
  );

  if(filas.length){

    sheet.getRange(
      sheet.getLastRow() + 1,
      1,
      filas.length,
      sheet.getLastColumn()
    ).setValues(
      filas
    );

  }

  return {
    status:true,
    total:filas.length,
    expediente:expediente
  };

}


/* =========================================================
   FILA -> OBJETO
========================================================= */

function construirObjetoSubetapa(
  fila,
  col
){

  return {

    id:
      fila[
        col['ID'] - 1
      ] || '',

    expediente:
      fila[
        col['EXPEDIENTE'] - 1
      ] || '',

    etapa:
      Number(
        fila[
          col['ETAPA'] - 1
        ]
      ),

    nombreEtapa:
      fila[
        col['NOMBRE_ETAPA'] - 1
      ] || '',

    subetapa:
      Number(
        fila[
          col['SUBETAPA'] - 1
        ]
      ),

    descripcion:
      fila[
        col['DESCRIPCION'] - 1
      ] || '',

    plazo:
      fila[
        col['PLAZO'] - 1
      ] || '',

    estado:
      fila[
        col['ESTADO'] - 1
      ] || 'NO INICIADO',

    fechaInicio:
      formatearFechaSubetapa(
        fila[
          col['FECHA_INICIO'] - 1
        ]
      ),

    usuarioInicio:
      fila[
        col['USUARIO_INICIO'] - 1
      ] || '',

    responsable:
      fila[
        col['CORREO_RESPONSABLE'] - 1
      ] || '',

    fechaFin:
      formatearFechaSubetapa(
        fila[
          col['FECHA_FIN'] - 1
        ]
      ),

    usuarioFin:
      fila[
        col['USUARIO_FIN'] - 1
      ] || '',

    delegadoPor:
      fila[
        col['DELEGADO_POR'] - 1
      ] || '',

    fechaDelegacion:
      formatearFechaSubetapa(
        fila[
          col['FECHA_DELEGACION'] - 1
        ]
      ),

    archivoId:
      fila[
        col['ARCHIVO_OFICIAL_ID'] - 1
      ] || '',

    archivoNombre:
      fila[
        col['ARCHIVO_OFICIAL_NOMBRE'] - 1
      ] || '',

    archivoUrl:
      fila[
        col['ARCHIVO_OFICIAL_URL'] - 1
      ] || '',

    versionArchivo:
      Number(
        fila[
          col['VERSION_ARCHIVO'] - 1
        ] || 0
      ),

    permiteNuevaCarga:
      String(
        fila[
          col['PERMITE_NUEVA_CARGA'] - 1
        ] || 'NO'
      ).toUpperCase(),

    ultimaActualizacion:
      formatearFechaSubetapa(
        fila[
          col['ULTIMA_ACTUALIZACION'] - 1
        ]
      )

  };

}


/* =========================================================
   SUBETAPAS POR EXPEDIENTE
========================================================= */

function obtenerSubetapasPorExpediente(
  expediente,
  etapa
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

  expediente =
    resolverExpediente(
      expediente
    );

  etapa =
    Number(etapa);

  if(!expediente){
    return [];
  }

  const lista = [];

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    const expFila =
      data[i][
        col['EXPEDIENTE'] - 1
      ]
      ? data[i][
          col['EXPEDIENTE'] - 1
        ]
        .toString()
        .trim()
        .toUpperCase()
      : '';

    const etapaFila =
      Number(
        data[i][
          col['ETAPA'] - 1
        ]
      );

    if(
      expFila !== expediente ||
      etapaFila !== etapa
    ){
      continue;
    }

    lista.push(
      construirObjetoSubetapa(
        data[i],
        col
      )
    );

  }

  lista.sort(
    function(a,b){

      return (
        Number(a.subetapa) -
        Number(b.subetapa)
      );

    }
  );

  return lista;

}


/* =========================================================
   COMPATIBILIDAD CON CÓDIGO ANTERIOR
   Puede recibir DNI o expediente.
========================================================= */

function obtenerSubetapas(
  referencia,
  etapa
){

  const expediente =
    resolverExpediente(
      referencia
    );

  return obtenerSubetapasPorExpediente(
    expediente,
    etapa
  );

}


/* =========================================================
   TODAS LAS ETAPAS - UNA SOLA LECTURA
========================================================= */

function obtenerSubetapasAdminCompleto(
  referencia
){

  const expediente =
    resolverExpediente(
      referencia
    );

  const resultado = {
    etapa1:[],
    etapa2:[],
    etapa3:[],
    etapa4:[],
    etapa5:[],
    etapa6:[],
    etapa7:[]
  };

  if(!expediente){
    return resultado;
  }

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

    const expFila =
      data[i][
        col['EXPEDIENTE'] - 1
      ]
      ? data[i][
          col['EXPEDIENTE'] - 1
        ]
        .toString()
        .trim()
        .toUpperCase()
      : '';

    if(
      expFila !== expediente
    ){
      continue;
    }

    const etapa =
      Number(
        data[i][
          col['ETAPA'] - 1
        ]
      );

    if(
      etapa < 1 ||
      etapa > 7
    ){
      continue;
    }

    resultado[
      'etapa' + etapa
    ].push(
      construirObjetoSubetapa(
        data[i],
        col
      )
    );

  }

  Object.keys(
    resultado
  ).forEach(
    function(clave){

      resultado[clave]
        .sort(
          function(a,b){

            return (
              Number(a.subetapa) -
              Number(b.subetapa)
            );

          }
        );

    }
  );

  return resultado;

}


/* =========================================================
   PROCESO COMPLETO
========================================================= */

function obtenerProcesoExpediente(
  expediente
){

  const datos =
    obtenerSubetapasAdminCompleto(
      expediente
    );

  const resultado = [];

  for(
    let etapa = 1;
    etapa <= 7;
    etapa++
  ){

    const procesos =
      datos[
        'etapa' + etapa
      ] || [];

    if(!procesos.length){
      continue;
    }

    const total =
      procesos.length;

    const finalizadas =
      procesos.filter(
        function(p){

          return (
            p.estado ===
            'FINALIZADO'
          );

        }
      ).length;

    const enCurso =
      procesos.some(
        function(p){

          return (
            p.estado ===
            'EN CURSO'
          );

        }
      );

    let estado =
      'NO INICIADO';

    if(enCurso){

      estado =
        'EN CURSO';

    }

    if(
      finalizadas === total &&
      total > 0
    ){

      estado =
        'FINALIZADO';

    }

    resultado.push({

      etapa:etapa,

      nombre:
        procesos[0]
          .nombreEtapa || '',

      estado:estado,

      porcentaje:
        total
        ? Math.round(
            finalizadas *
            100 /
            total
          )
        : 0,

      procesos:procesos

    });

  }

  return resultado;

}


function obtenerProcesoAlumno(
  dni
){

  const expediente =
    obtenerExpedientePorDni(
      dni
    );

  if(!expediente){
    return [];
  }

  return obtenerProcesoExpediente(
    expediente
  );

}


/* =========================================================
   INICIAR SUBETAPA
========================================================= */

function iniciarSubetapa(
  id,
  usuario
){

  const sheet =
    obtenerSheetSubetapas();

  const col =
    obtenerColumnasSubetapas();

  const data =
    sheet.getDataRange()
      .getValues();

  const ahora =
    new Date();

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    if(
      data[i][
        col['ID'] - 1
      ].toString()
      !==
      id.toString()
    ){
      continue;
    }

    const estado =
      String(
        data[i][
          col['ESTADO'] - 1
        ] || ''
      );

    if(
      estado ===
      'FINALIZADO'
    ){

      return {
        status:false,
        message:
          'La subetapa ya está finalizada.'
      };

    }

    data[i][
      col['ESTADO'] - 1
    ] =
      'EN CURSO';

    if(
      !data[i][
        col['FECHA_INICIO'] - 1
      ]
    ){

      data[i][
        col['FECHA_INICIO'] - 1
      ] =
        ahora;

    }

    if(
      !data[i][
        col['USUARIO_INICIO'] - 1
      ]
    ){

      data[i][
        col['USUARIO_INICIO'] - 1
      ] =
        usuario || '';

    }

    data[i][
      col['ULTIMA_ACTUALIZACION'] - 1
    ] =
      ahora;

    sheet.getRange(
      i + 1,
      1,
      1,
      sheet.getLastColumn()
    ).setValues([
      data[i]
    ]);

    return {
      status:true,
      fechaInicio:
        formatearFechaSubetapa(
          ahora
        )
    };

  }

  return {
    status:false,
    message:
      'No se encontró la subetapa.'
  };

}



/* =========================================================
   DATOS DE INVITADOS DEL EXPEDIENTE
========================================================= */

function obtenerInvitadosExpediente(expediente){

  expediente =
    String(expediente || '')
      .trim()
      .toUpperCase();

  if(!expediente){
    return [];
  }

  const sheet =
    obtenerSheetExpedientes();

  const columnas =
    obtenerColumnas(sheet);

  const data =
    sheet.getDataRange().getValues();

  const invitados = [];

  for(let i = 1; i < data.length; i++){

    const expedienteFila =
      columnas['N° DE TRÁMITE']
      ? String(
          data[i][columnas['N° DE TRÁMITE'] - 1] || ''
        ).trim().toUpperCase()
      : '';

    if(expedienteFila !== expediente){
      continue;
    }

    const invitado1 = {
      dni:
        columnas['DNI']
        ? String(data[i][columnas['DNI'] - 1] || '').trim()
        : '',
      nombre:
        columnas['NOMBRES']
        ? String(data[i][columnas['NOMBRES'] - 1] || '').trim()
        : '',
      correo:
        columnas['CORREO']
        ? String(data[i][columnas['CORREO'] - 1] || '').trim().toLowerCase()
        : ''
    };

    if(
      invitado1.dni ||
      invitado1.nombre ||
      invitado1.correo
    ){
      invitados.push(invitado1);
    }

    const invitado2 = {
      dni:
        columnas['DNI02']
        ? String(data[i][columnas['DNI02'] - 1] || '').trim()
        : '',
      nombre:
        columnas['NOMBRES02']
        ? String(data[i][columnas['NOMBRES02'] - 1] || '').trim()
        : '',
      correo:
        columnas['CORREO02']
        ? String(data[i][columnas['CORREO02'] - 1] || '').trim().toLowerCase()
        : ''
    };

    if(
      invitado2.dni ||
      invitado2.nombre ||
      invitado2.correo
    ){
      invitados.push(invitado2);
    }

    break;
  }

  return invitados;
}


/* =========================================================
   NOTIFICAR FINALIZACIÓN DE SUBETAPA
========================================================= */

function enviarCorreoSubetapaFinalizada(datos){

  try{

    const invitados =
      obtenerInvitadosExpediente(
        datos.expediente
      );

    const correos = [
      ...new Set(
        invitados
          .map(function(invitado){
            return String(
              invitado.correo || ''
            ).trim().toLowerCase();
          })
          .filter(Boolean)
      )
    ];

    if(!correos.length){
      return;
    }

    const asunto =
      'Sistema de Titulación USE FIPS - Subetapa finalizada';

    const cuerpo =
      'Se informa que una subetapa de su proceso de titulación ha sido finalizada.\n\n' +
      'Expediente: ' + (datos.expediente || '-') + '\n' +
      'Etapa: ' + (datos.etapa || '-') + ' - ' + (datos.nombreEtapa || '-') + '\n' +
      'Subetapa: ' + (datos.descripcion || '-') + '\n' +
      'Fecha y hora de finalización: ' + (datos.fechaFin || '-') + '\n' +
      'Finalizado por: ' + (datos.usuario || '-') + '\n\n' +
      'Puede revisar el avance actualizado desde su Portal de Titulación.';

    correos.forEach(function(correo){

      try{

        GmailApp.sendEmail(
          correo,
          asunto,
          cuerpo
        );

      }catch(error){

        Logger.log(
          'ERROR CORREO FINALIZACIÓN ' +
          correo +
          ': ' +
          error.message
        );

      }

    });

  }catch(error){

    Logger.log(
      'ERROR enviarCorreoSubetapaFinalizada: ' +
      error.message
    );

  }

}


/* =========================================================
   NOTIFICAR DELEGACIÓN
========================================================= */

function enviarCorreoDelegacionSubetapa(datos){

  try{

    const correo =
      String(
        datos.nuevoResponsable || ''
      ).trim().toLowerCase();

    if(!correo){
      return;
    }

    const asunto =
      'Sistema de Titulación USE FIPS - Nueva responsabilidad asignada';

    const cuerpo =
      'Se le ha asignado la responsabilidad de una subetapa en el Sistema de Titulación USE FIPS.\n\n' +
      'Expediente: ' + (datos.expediente || '-') + '\n' +
      'Etapa: ' + (datos.etapa || '-') + ' - ' + (datos.nombreEtapa || '-') + '\n' +
      'Subetapa: ' + (datos.descripcion || '-') + '\n' +
      'Responsabilidad delegada por: ' + (datos.usuarioActual || '-') + '\n' +
      'Fecha y hora: ' + (datos.fechaDelegacion || '-') + '\n\n' +
      'A partir de este momento figura como responsable de esta subetapa.';

    GmailApp.sendEmail(
      correo,
      asunto,
      cuerpo
    );

  }catch(error){

    Logger.log(
      'ERROR enviarCorreoDelegacionSubetapa: ' +
      error.message
    );

  }

}


/* =========================================================
   FINALIZAR SUBETAPA POR EXPEDIENTE
========================================================= */

function finalizarSubetapa(
  id,
  usuario
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

  const ahora =
    new Date();

  let indiceActual =
    -1;

  let expediente = '';
  let etapa = 0;
  let numeroSubetapa = 0;
  let nombreEtapaActual = '';
  let descripcionActual = '';

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    if(
      data[i][
        col['ID'] - 1
      ].toString()
      ===
      id.toString()
    ){

      indiceActual =
        i;

      expediente =
        String(
          data[i][
            col['EXPEDIENTE'] - 1
          ] || ''
        )
        .trim()
        .toUpperCase();

      etapa =
        Number(
          data[i][
            col['ETAPA'] - 1
          ]
        );

      numeroSubetapa =
        Number(
          data[i][
            col['SUBETAPA'] - 1
          ]
        );

      nombreEtapaActual =
        String(
          data[i][
            col['NOMBRE_ETAPA'] - 1
          ] || ''
        );

      descripcionActual =
        String(
          data[i][
            col['DESCRIPCION'] - 1
          ] || ''
        );

      const estado =
        String(
          data[i][
            col['ESTADO'] - 1
          ] || ''
        );

      if(
        estado ===
        'NO INICIADO'
      ){

        return {
          status:false,
          message:
            'La subetapa todavía no se encuentra en curso.'
        };

      }

      if(
        estado ===
        'FINALIZADO'
      ){

        return {
          status:false,
          message:
            'La subetapa ya fue finalizada.'
        };

      }

      break;

    }

  }

  if(
    indiceActual === -1
  ){

    return {
      status:false,
      message:
        'No se encontró la subetapa.'
    };

  }

  data[indiceActual][
    col['ESTADO'] - 1
  ] =
    'FINALIZADO';

  data[indiceActual][
    col['FECHA_FIN'] - 1
  ] =
    ahora;

  data[indiceActual][
    col['USUARIO_FIN'] - 1
  ] =
    usuario || '';

  data[indiceActual][
    col['ULTIMA_ACTUALIZACION'] - 1
  ] =
    ahora;

  const numeroSiguiente =
    numeroSubetapa + 1;

  let indiceSiguiente =
    -1;

  let siguienteId =
    null;

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    const mismoExpediente =
      String(
        data[i][
          col['EXPEDIENTE'] - 1
        ] || ''
      )
      .trim()
      .toUpperCase()
      ===
      expediente;

    const mismaEtapa =
      Number(
        data[i][
          col['ETAPA'] - 1
        ]
      )
      ===
      etapa;

    const esSiguiente =
      Number(
        data[i][
          col['SUBETAPA'] - 1
        ]
      )
      ===
      numeroSiguiente;

    if(
      mismoExpediente &&
      mismaEtapa &&
      esSiguiente
    ){

      indiceSiguiente =
        i;

      siguienteId =
        data[i][
          col['ID'] - 1
        ];

      data[i][
        col['ESTADO'] - 1
      ] =
        'EN CURSO';

      if(
        !data[i][
          col['FECHA_INICIO'] - 1
        ]
      ){

        data[i][
          col['FECHA_INICIO'] - 1
        ] =
          ahora;

      }

      if(
        !data[i][
          col['USUARIO_INICIO'] - 1
        ]
      ){

        data[i][
          col['USUARIO_INICIO'] - 1
        ] =
          usuario || '';

      }

      data[i][
        col['ULTIMA_ACTUALIZACION'] - 1
      ] =
        ahora;

      break;

    }

  }

  sheet.getRange(
    indiceActual + 1,
    1,
    1,
    sheet.getLastColumn()
  ).setValues([
    data[indiceActual]
  ]);

  if(
    indiceSiguiente !== -1
  ){

    sheet.getRange(
      indiceSiguiente + 1,
      1,
      1,
      sheet.getLastColumn()
    ).setValues([
      data[indiceSiguiente]
    ]);

  }

  let total = 0;
  let completadas = 0;

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    const mismoExpediente =
      String(
        data[i][
          col['EXPEDIENTE'] - 1
        ] || ''
      )
      .trim()
      .toUpperCase()
      ===
      expediente;

    const mismaEtapa =
      Number(
        data[i][
          col['ETAPA'] - 1
        ]
      )
      ===
      etapa;

    if(
      !mismoExpediente ||
      !mismaEtapa
    ){
      continue;
    }

    total++;

    if(
      data[i][
        col['ESTADO'] - 1
      ]
      ===
      'FINALIZADO'
    ){

      completadas++;

    }

  }

  const porcentaje =
    total
    ? Math.round(
        completadas *
        100 /
        total
      )
    : 0;

  enviarCorreoSubetapaFinalizada({

    expediente:
      expediente,

    etapa:
      etapa,

    nombreEtapa:
      nombreEtapaActual,

    descripcion:
      descripcionActual,

    fechaFin:
      formatearFechaSubetapa(
        ahora
      ),

    usuario:
      usuario || ''

  });


  return {

    status:true,

    id:id,

    expediente:
      expediente,

    estado:
      'FINALIZADO',

    fechaFin:
      formatearFechaSubetapa(
        ahora
      ),

    usuarioFin:
      usuario || '',

    siguienteId:
      siguienteId,

    fechaSiguiente:
      siguienteId
      ? formatearFechaSubetapa(
          ahora
        )
      : '',

    porcentaje:
      porcentaje,

    etapaCompleta:
      porcentaje === 100

  };

}


/* =========================================================
   CONFIRMAR PRESENTACIÓN INICIAL
========================================================= */

function confirmarPresentacionInicial(
  id,
  usuario
){

  const sheet =
    obtenerSheetSubetapas();

  const col =
    obtenerColumnasSubetapas();

  const data =
    sheet.getDataRange()
      .getValues();

  const ahora =
    new Date();

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    if(
      data[i][
        col['ID'] - 1
      ].toString()
      !==
      id.toString()
    ){
      continue;
    }

    const estado =
      String(
        data[i][
          col['ESTADO'] - 1
        ] || ''
      );

    if(
      estado ===
      'FINALIZADO'
    ){

      return {
        status:false,
        message:
          'Esta subetapa ya fue finalizada.'
      };

    }

    if(
      !data[i][
        col['FECHA_INICIO'] - 1
      ]
    ){

      data[i][
        col['FECHA_INICIO'] - 1
      ] =
        ahora;

    }

    if(
      !data[i][
        col['USUARIO_INICIO'] - 1
      ]
    ){

      data[i][
        col['USUARIO_INICIO'] - 1
      ] =
        usuario || '';

    }

    data[i][
      col['ESTADO'] - 1
    ] =
      'EN CURSO';

    data[i][
      col['ULTIMA_ACTUALIZACION'] - 1
    ] =
      ahora;

    sheet.getRange(
      i + 1,
      1,
      1,
      sheet.getLastColumn()
    ).setValues([
      data[i]
    ]);

    break;

  }

  return finalizarSubetapa(
    id,
    usuario
  );

}


/* =========================================================
   PORCENTAJE
========================================================= */

function calcularPorcentajeSubetapas(
  referencia,
  etapa
){

  const lista =
    obtenerSubetapas(
      referencia,
      etapa
    );

  if(!lista.length){
    return 0;
  }

  const finalizadas =
    lista.filter(
      function(item){

        return (
          item.estado ===
          'FINALIZADO'
        );

      }
    ).length;

  return Math.round(
    finalizadas *
    100 /
    lista.length
  );

}


/* =========================================================
   DELEGAR RESPONSABILIDAD
========================================================= */

function delegarSubetapa(
  id,
  nuevoResponsable,
  usuarioActual
){

  const sheet =
    obtenerSheetSubetapas();

  const col =
    obtenerColumnasSubetapas();

  const data =
    sheet.getDataRange()
      .getValues();

  const ahora =
    new Date();

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    if(
      data[i][
        col['ID'] - 1
      ].toString()
      !==
      id.toString()
    ){
      continue;
    }

    const expediente =
      String(
        data[i][
          col['EXPEDIENTE'] - 1
        ] || ''
      ).trim().toUpperCase();

    const etapa =
      Number(
        data[i][
          col['ETAPA'] - 1
        ]
      );

    const nombreEtapa =
      String(
        data[i][
          col['NOMBRE_ETAPA'] - 1
        ] || ''
      );

    const descripcion =
      String(
        data[i][
          col['DESCRIPCION'] - 1
        ] || ''
      );

    data[i][
      col['CORREO_RESPONSABLE'] - 1
    ] =
      nuevoResponsable;

    data[i][
      col['DELEGADO_POR'] - 1
    ] =
      usuarioActual || '';

    data[i][
      col['FECHA_DELEGACION'] - 1
    ] =
      ahora;

    data[i][
      col['ULTIMA_ACTUALIZACION'] - 1
    ] =
      ahora;

    sheet.getRange(
      i + 1,
      1,
      1,
      sheet.getLastColumn()
    ).setValues([
      data[i]
    ]);

    enviarCorreoDelegacionSubetapa({

      expediente:
        expediente,

      etapa:
        etapa,

      nombreEtapa:
        nombreEtapa,

      descripcion:
        descripcion,

      nuevoResponsable:
        nuevoResponsable,

      usuarioActual:
        usuarioActual || '',

      fechaDelegacion:
        formatearFechaSubetapa(
          ahora
        )

    });

    return {
      status:true
    };

  }

  return {
    status:false,
    message:
      'No se encontró la subetapa.'
  };

}


/* =========================================================
   AUTORIZAR NUEVA CARGA
========================================================= */

function autorizarNuevaCargaSubetapa(
  id,
  usuario
){

  const sheet =
    obtenerSheetSubetapas();

  const col =
    obtenerColumnasSubetapas();

  const data =
    sheet.getDataRange()
      .getValues();

  const ahora =
    new Date();

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    if(
      data[i][
        col['ID'] - 1
      ].toString()
      !==
      id.toString()
    ){
      continue;
    }

    data[i][
      col['PERMITE_NUEVA_CARGA'] - 1
    ] =
      'SI';

    data[i][
      col['ULTIMA_ACTUALIZACION'] - 1
    ] =
      ahora;

    sheet.getRange(
      i + 1,
      1,
      1,
      sheet.getLastColumn()
    ).setValues([
      data[i]
    ]);

    return {
      status:true,
      usuario:
        usuario || ''
    };

  }

  return {
    status:false,
    message:
      'No se encontró la subetapa.'
  };

}


/* =========================================================
   MENSAJES - HOJA INDEPENDIENTE
========================================================= */

function guardarMensajeSubetapa(
  id,
  mensaje,
  usuario,
  correoUsuario
){

  mensaje =
    mensaje
    ? mensaje.toString().trim()
    : '';

  if(!mensaje){

    return {
      status:false,
      message:
        'El mensaje está vacío'
    };

  }

  const sheetSub =
    obtenerSheetSubetapas();

  const col =
    obtenerColumnasSubetapas();

  const data =
    sheetSub.getDataRange()
      .getValues();

  let expediente = '';
  let etapa = '';
  let subetapa = '';

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    if(
      data[i][
        col['ID'] - 1
      ].toString()
      ===
      id.toString()
    ){

      expediente =
        data[i][
          col['EXPEDIENTE'] - 1
        ] || '';

      etapa =
        data[i][
          col['ETAPA'] - 1
        ] || '';

      subetapa =
        data[i][
          col['SUBETAPA'] - 1
        ] || '';

      break;

    }

  }

  if(!expediente){

    return {
      status:false,
      message:
        'No se encontró la subetapa'
    };

  }

  const sheet =
    obtenerSheetMensajesSubetapas();

  if(!sheet){

    throw new Error(
      'No existe la hoja MENSAJES_SUBETAPAS'
    );

  }

  const ahora =
    new Date();

  const dataMensajes =
    sheet.getDataRange()
      .getValues();

  let nuevoId = 1;

  if(dataMensajes.length > 1){

    const ids =
      dataMensajes.slice(1)
      .map(
        function(r){

          return Number(r[0]) || 0;

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
    expediente,
    etapa,
    subetapa,
    mensaje,
    ahora,
    usuario || '',
    correoUsuario || '',
    'PUBLICO'

  ]);

  return {
    status:true,
    fecha:
      formatearFechaSubetapa(
        ahora
      )
  };

}


function obtenerMensajesExpediente(
  referencia
){

  const expediente =
    resolverExpediente(
      referencia
    );

  const sheet =
    obtenerSheetMensajesSubetapas();

  if(
    !sheet ||
    !expediente
  ){
    return [];
  }

  const data =
    sheet.getDataRange()
      .getValues();

  const mensajes = [];

  for(
    let i = 1;
    i < data.length;
    i++
  ){

    const expFila =
      data[i][1]
      ? data[i][1]
          .toString()
          .trim()
          .toUpperCase()
      : '';

    if(
      expFila !== expediente
    ){
      continue;
    }

    const fecha =
      data[i][5];

    mensajes.push({

      id:
        data[i][0] || '',

      expediente:
        data[i][1] || '',

      etapa:
        data[i][2] || '',

      subetapa:
        data[i][3] || '',

      mensaje:
        data[i][4] || '',

      fecha:
        formatearFechaSubetapa(
          fecha
        ),

      usuario:
        data[i][6] || '',

      correoUsuario:
        data[i][7] || '',

      visibilidad:
        data[i][8] || 'PUBLICO',

      _orden:
        fecha instanceof Date
        ? fecha.getTime()
        : 0

    });

  }

  mensajes.sort(
    function(a,b){

      return (
        b._orden -
        a._orden
      );

    }
  );

  mensajes.forEach(
    function(item){

      delete item._orden;

    }
  );

  return mensajes;

}


function obtenerMensajesInvitado(
  dni
){

  const expediente =
    obtenerExpedientePorDni(
      dni
    );

  if(!expediente){
    return [];
  }

  return obtenerMensajesExpediente(
    expediente
  );

}

/* =========================================================
   OPTIMIZACIÓN DE LECTURA MASIVA PARA TALLER DE TESIS
   ---------------------------------------------------------
   Esta función NO cambia el flujo existente. Permite que un
   módulo que necesita varios expedientes lea la hoja una sola
   vez y construya un índice en memoria.
========================================================= */
function obtenerSeguimientoSubetapasMasivo(expedientes){

  const filtro = {};
  (expedientes || []).forEach(function(exp){
    exp = String(exp || '').trim().toUpperCase();
    if(exp) filtro[exp] = true;
  });

  const sheet = obtenerSheetSubetapas();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if(lastRow < 2 || lastCol < 1){
    return {};
  }

  const data = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
  const headers = data[0];
  const col = {};

  headers.forEach(function(h, i){
    h = String(h || '').trim();
    if(h) col[h] = i;
  });

  if(col['EXPEDIENTE'] == null){
    throw new Error('No existe la columna EXPEDIENTE en SEGUIMIENTO_SUBETAPAS.');
  }

  const salida = {};

  for(let i = 1; i < data.length; i++){
    const row = data[i];
    const exp = String(row[col['EXPEDIENTE']] || '').trim().toUpperCase();

    if(!exp) continue;
    if(Object.keys(filtro).length && !filtro[exp]) continue;

    if(!salida[exp]) salida[exp] = [];

    salida[exp].push({
      etapa: Number(row[col['ETAPA']] || 0),
      nombre: String(row[col['NOMBRE_ETAPA']] || ''),
      sub: Number(row[col['SUBETAPA']] || 0),
      desc: String(row[col['DESCRIPCION']] || ''),
      estado: String(row[col['ESTADO']] || 'NO INICIADO').trim().toUpperCase(),
      plazo: String(row[col['PLAZO']] || '')
    });
  }

  return salida;
}


