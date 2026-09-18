/* =========================================================
   PORTAL DEL ALUMNO / INVITADO
   SISTEMA DE TITULACIÓN USE FIPS
   ARCHIVO CONSOLIDADO

   OBJETIVO
   - El invitado entra con DNI/CUI.
   - El DNI se resuelve al expediente SETxxx.
   - El estado se obtiene desde SEGUIMIENTO_SUBETAPAS.
   - Ya NO depende del antiguo SEGUIMIENTO_ETAPAS para
     mostrar el resumen del trámite.

   REQUIERE:
   - Expedientes.gs
   - SeguimientoSubetapas.gs
========================================================= */


/* =========================================================
   NOMBRES OFICIALES DE LAS 7 ETAPAS
========================================================= */

function PA_nombresEtapas_(){
  return [
    'Verificación Inicial de Documentos',
    'Presentación del Borrador de Tesis',
    'Evaluación del Expediente',
    'Programación y Sustentación',
    'Validaciones Institucionales',
    'Aprobaciones Institucionales',
    'Registro y Emisión del Título'
  ];
}


/* =========================================================
   DATOS DEL PARTICIPANTE SEGÚN DNI
========================================================= */

function PA_obtenerParticipantePorDni_(dni){

  dni = String(dni || '').trim();

  if(!dni){
    return null;
  }

  const sheet = obtenerSheetExpedientes();
  const columnas = obtenerColumnas(sheet);
  const data = sheet.getDataRange().getDisplayValues();

  for(let i = 1; i < data.length; i++){

    const dni1 = columnas['DNI']
      ? String(data[i][columnas['DNI'] - 1] || '').trim()
      : '';

    const dni2 = columnas['DNI02']
      ? String(data[i][columnas['DNI02'] - 1] || '').trim()
      : '';

    if(dni !== dni1 && dni !== dni2){
      continue;
    }

    const expediente = columnas['N° DE TRÁMITE']
      ? String(data[i][columnas['N° DE TRÁMITE'] - 1] || '')
          .trim()
          .toUpperCase()
      : '';

    const esSegundo = dni === dni2 && dni2 !== '';

    return {
      dni:dni,
      expediente:expediente,
      participante:esSegundo ? 2 : 1,

      nombre:esSegundo
        ? (
            columnas['NOMBRES02']
            ? String(data[i][columnas['NOMBRES02'] - 1] || '').trim()
            : ''
          )
        : (
            columnas['NOMBRES']
            ? String(data[i][columnas['NOMBRES'] - 1] || '').trim()
            : ''
          ),

      correo:esSegundo
        ? (
            columnas['CORREO02']
            ? String(data[i][columnas['CORREO02'] - 1] || '').trim().toLowerCase()
            : ''
          )
        : (
            columnas['CORREO']
            ? String(data[i][columnas['CORREO'] - 1] || '').trim().toLowerCase()
            : ''
          ),

      programa:esSegundo
        ? (
            columnas['PROGRAMAS02']
            ? String(data[i][columnas['PROGRAMAS02'] - 1] || '').trim()
            : ''
          )
        : (
            columnas['PROGRAMAS']
            ? String(data[i][columnas['PROGRAMAS'] - 1] || '').trim()
            : ''
          ),

      cui:esSegundo
        ? (
            columnas['CUI02']
            ? String(data[i][columnas['CUI02'] - 1] || '').trim()
            : ''
          )
        : (
            columnas['CUI']
            ? String(data[i][columnas['CUI'] - 1] || '').trim()
            : ''
          ),

      grupo:columnas['GRUPO']
        ? Number(data[i][columnas['GRUPO'] - 1] || 1)
        : (dni2 ? 2 : 1),

      tesis:columnas['TESIS']
        ? String(data[i][columnas['TESIS'] - 1] || '').trim()
        : ''
    };
  }

  return null;
}


/* =========================================================
   RESUMEN DE ETAPAS DESDE SEGUIMIENTO_SUBETAPAS
========================================================= */

function PA_construirResumenEtapas_(expediente){

  expediente = String(expediente || '').trim().toUpperCase();

  const nombres = PA_nombresEtapas_();
  const completo = obtenerSubetapasAdminCompleto(expediente) || {};
  const etapas = [];

  for(let numero = 1; numero <= 7; numero++){

    const procesos = completo['etapa' + numero] || [];

    let finalizadas = 0;
    let tieneEnCurso = false;
    let fechaInicio = '';
    let fechaFin = '';
    let usuario = '';

    procesos.forEach(function(proceso){

      const estado = String(proceso.estado || '').trim().toUpperCase();

      if(estado === 'FINALIZADO'){
        finalizadas++;
      }

      if(estado === 'EN CURSO'){
        tieneEnCurso = true;

        if(!usuario){
          usuario =
            proceso.responsable ||
            proceso.usuarioInicio ||
            '';
        }
      }

      if(!fechaInicio && proceso.fechaInicio){
        fechaInicio = proceso.fechaInicio;
      }

      if(proceso.fechaFin){
        fechaFin = proceso.fechaFin;
      }

      if(!usuario){
        usuario =
          proceso.responsable ||
          proceso.usuarioInicio ||
          proceso.usuarioFin ||
          '';
      }
    });

    let estado = 'NO INICIADO';

    if(tieneEnCurso || finalizadas > 0){
      estado = 'EN CURSO';
    }

    if(
      procesos.length > 0 &&
      finalizadas === procesos.length
    ){
      estado = 'FINALIZADO';
    }

    etapas.push({
      numero:numero,
      nombre:
        (procesos[0] && procesos[0].nombreEtapa)
        || nombres[numero - 1],
      estado:estado,
      inicio:fechaInicio,
      fin:estado === 'FINALIZADO' ? fechaFin : '',
      usuario:usuario,
      porcentaje:
        procesos.length
        ? Math.round(finalizadas * 100 / procesos.length)
        : 0
    });
  }

  return etapas;
}


/* =========================================================
   ETAPA ACTUAL
========================================================= */

function PA_obtenerEtapaActual_(etapas){

  etapas = Array.isArray(etapas) ? etapas : [];

  const enCurso = etapas.find(function(etapa){
    return etapa.estado === 'EN CURSO';
  });

  if(enCurso){
    return (
      'ETAPA ' +
      enCurso.numero +
      ' - ' +
      enCurso.nombre
    );
  }

  const pendiente = etapas.find(function(etapa){
    return etapa.estado === 'NO INICIADO';
  });

  if(pendiente){
    return (
      'ETAPA ' +
      pendiente.numero +
      ' - ' +
      pendiente.nombre
    );
  }

  if(
    etapas.length &&
    etapas.every(function(etapa){
      return etapa.estado === 'FINALIZADO';
    })
  ){
    return 'TRÁMITE FINALIZADO';
  }

  return 'ETAPA 1 - Verificación Inicial de Documentos';
}


/* =========================================================
   ESTADO GENERAL
========================================================= */

function PA_obtenerEstadoGeneral_(etapas){

  etapas = Array.isArray(etapas) ? etapas : [];

  if(
    etapas.length &&
    etapas.every(function(etapa){
      return etapa.estado === 'FINALIZADO';
    })
  ){
    return 'FINALIZADO';
  }

  if(
    etapas.some(function(etapa){
      return (
        etapa.estado === 'EN CURSO' ||
        etapa.estado === 'FINALIZADO'
      );
    })
  ){
    return 'EN PROCESO';
  }

  return 'NO INICIADO';
}


/* =========================================================
   ÚLTIMA ACTUALIZACIÓN DEL EXPEDIENTE
========================================================= */

function PA_ultimaActualizacion_(expediente){

  try{

    const sheet = obtenerSheetSubetapas();
    const col = obtenerColumnasSubetapas();
    validarColumnasSubetapas(col);

    const data = sheet.getDataRange().getValues();

    let ultima = null;

    for(let i = 1; i < data.length; i++){

      const expFila =
        String(data[i][col['EXPEDIENTE'] - 1] || '')
          .trim()
          .toUpperCase();

      if(expFila !== expediente){
        continue;
      }

      const fecha =
        data[i][col['ULTIMA_ACTUALIZACION'] - 1];

      if(
        fecha instanceof Date &&
        !isNaN(fecha.getTime()) &&
        (
          !ultima ||
          fecha.getTime() > ultima.getTime()
        )
      ){
        ultima = fecha;
      }
    }

    return ultima
      ? formatearFechaSubetapa(ultima)
      : '';

  }catch(error){

    Logger.log(
      'PA_ultimaActualizacion_: ' +
      error.message
    );

    return '';
  }
}


/* =========================================================
   FUNCIÓN PRINCIPAL LLAMADA POR tramite.html
========================================================= */

function obtenerPortalAlumno(dni){

  try{

    dni = String(dni || '').trim();

    if(!dni){
      return {
        status:false,
        message:'No se recibió el DNI.'
      };
    }

    const participante =
      PA_obtenerParticipantePorDni_(dni);

    if(
      !participante ||
      !participante.expediente
    ){
      return {
        status:false,
        message:
          'No existe trámite registrado para el DNI: ' +
          dni
      };
    }

    const expediente =
      participante.expediente;

    /*
      Si por algún expediente antiguo todavía no existen
      subetapas, intentamos inicializarlas una sola vez.
    */
    let etapas =
      PA_construirResumenEtapas_(expediente);

    const existeInformacion =
      etapas.some(function(etapa){
        return (
          etapa.estado !== 'NO INICIADO' ||
          etapa.porcentaje > 0
        );
      });

    /*
      obtenerSubetapasAdminCompleto normalmente devuelve
      las 7 etapas aunque estén NO INICIADO. Esta llamada
      adicional se usa solo como recuperación si el
      expediente todavía no fue inicializado.
    */
    if(!existeInformacion){

      try{

        const proceso =
          obtenerProcesoExpediente(expediente);

        if(
          !proceso ||
          !proceso.length
        ){
          crearSubetapasIniciales({
            dni:dni,
            expediente:expediente
          });

          etapas =
            PA_construirResumenEtapas_(
              expediente
            );
        }

      }catch(error){

        Logger.log(
          'Inicialización portal alumno: ' +
          error.message
        );
      }
    }

    const finalizadas =
      etapas.filter(function(etapa){
        return etapa.estado === 'FINALIZADO';
      }).length;

    return {
      status:true,

      dni:participante.dni,
      expediente:expediente,
      nombre:participante.nombre,
      correo:participante.correo,
      programa:participante.programa,
      cui:participante.cui,
      grupo:participante.grupo,
      participante:participante.participante,
      tesis:participante.tesis,

      etapaActual:
        PA_obtenerEtapaActual_(etapas),

      estadoGeneral:
        PA_obtenerEstadoGeneral_(etapas),

      ultimaActualizacion:
        PA_ultimaActualizacion_(expediente),

      porcentaje:
        Math.round(
          finalizadas * 100 / 7
        ),

      etapas:etapas
    };

  }catch(error){

    Logger.log(
      'ERROR obtenerPortalAlumno: ' +
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
        'No se pudo cargar la información del trámite.'
    };
  }
}


/* =========================================================
   COMPATIBILIDAD: BUSCAR EXPEDIENTE POR DNI
========================================================= */

function obtenerExpedientePortalAlumno(dni){

  const participante =
    PA_obtenerParticipantePorDni_(
      dni
    );

  return participante
    ? participante.expediente
    : '';
}


/* =========================================================
   PRUEBA MANUAL
========================================================= */

function pruebaPortalAlumno(){

  const dni = '00000000';

  Logger.log(
    JSON.stringify(
      obtenerPortalAlumno(dni)
    )
  );
}
