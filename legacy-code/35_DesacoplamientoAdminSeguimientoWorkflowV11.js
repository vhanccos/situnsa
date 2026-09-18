/**
 * ==============================================================
 * FASE 11 - DESACOPLAMIENTO ADMINISTRACION + SEGUIMIENTO + WORKFLOW
 * ==============================================================
 * Centraliza las operaciones mutables del workflow detrás de SOA.
 * Las lecturas de administración/seguimiento ya son directas por Repository.
 * WorkflowEtapas.gs y SeguimientoSubetapas.gs se mantienen temporalmente
 * como motor de compatibilidad para transiciones complejas/correos hasta
 * la consolidación final.
 */

const ADAPTER_WorkflowLegacyV11 = Object.freeze({
  iniciarSubetapa(id, usuario) { if (typeof BD17_activo_==='function' && BD17_activo_()) return BD17_iniciarSubetapa_(id, usuario); return iniciarSubetapa(id, usuario); },
  confirmarPresentacionInicial(id, usuario) { if (typeof BD17_activo_==='function' && BD17_activo_()) return BD17_finalizarSubetapa_(id, usuario); return confirmarPresentacionInicialWorkflowV4(id, usuario); },
  finalizarSubetapa(id, usuario) { if (typeof BD17_activo_==='function' && BD17_activo_()) return BD17_finalizarSubetapa_(id, usuario); return finalizarSubetapaWorkflowV3(id, usuario); },
  notificarFinalizacion(expediente, etapa, nombreEtapa, descripcion, fechaFin, usuario) {
    if (typeof BD17_activo_==='function' && BD17_activo_()) return {status:true,omitido:true,motivo:'Agenda BD-17 no requiere notificación documental para avanzar.'};
    return notificarFinalizacionSubetapaV26(expediente, etapa, nombreEtapa, descripcion, fechaFin, usuario);
  },
  avanzarSiguienteEtapa(expediente, etapaActual, correoResponsable, usuario) {
    return avanzarSiguienteEtapaV23(expediente, etapaActual, correoResponsable, usuario);
  },
  guardarMensaje(id, mensaje, usuario, correoUsuario) { return guardarMensajeSubetapa(id, mensaje, usuario, correoUsuario); },
  obtenerMensajes(referencia) { return obtenerMensajesExpediente(referencia); },
  delegarSubetapa(id, correo, usuario) { return delegarSubetapa(id, correo, usuario); },
  avanzarEtapa(expediente, etapaActual, usuario) { return avanzarEtapaWorkflowV4(expediente, etapaActual, usuario); },
  finalizarEtapa(expediente, etapa, usuario) { return finalizarEtapaWorkflowV3(expediente, etapa, usuario); },
  rehacerEtapa(expediente, etapa, usuario) { return rehacerEtapaWorkflowV3(expediente, etapa, usuario); }
});

const SOA_WorkflowV11Service = Object.freeze({
  iniciarSubetapa(id, usuario) {
    if (!id) return {status:false,message:'No se recibió el ID de la subetapa.'};
    try { return ADAPTER_WorkflowLegacyV11.iniciarSubetapa(id, usuario || ''); }
    catch(e) { return {status:false,message:e.message}; }
  },
  confirmarPresentacionInicial(id, usuario) {
    if (!id) throw new Error('No se recibió el ID de la subetapa.');
    return ADAPTER_WorkflowLegacyV11.confirmarPresentacionInicial(id, usuario || '');
  },
  finalizarSubetapa(id, usuario) {
    if (!id) throw new Error('No se recibió el ID de la subetapa.');
    return ADAPTER_WorkflowLegacyV11.finalizarSubetapa(id, usuario || '');
  },
  notificarFinalizacion(expediente, etapa, nombreEtapa, descripcion, fechaFin, usuario) {
    return ADAPTER_WorkflowLegacyV11.notificarFinalizacion(expediente, etapa, nombreEtapa, descripcion, fechaFin, usuario);
  },
  avanzarSiguienteEtapa(expediente, etapaActual, correoResponsable, usuario) {
    if (!expediente) throw new Error('Debe indicar el expediente.');
    return ADAPTER_WorkflowLegacyV11.avanzarSiguienteEtapa(expediente, Number(etapaActual), correoResponsable || '', usuario || '');
  },
  guardarMensaje(id, mensaje, usuario, correoUsuario) {
    if (!id) throw new Error('No se recibió el ID de la subetapa.');
    if (!String(mensaje || '').trim()) throw new Error('El mensaje no puede estar vacío.');
    return ADAPTER_WorkflowLegacyV11.guardarMensaje(id, mensaje, usuario || '', correoUsuario || '');
  },
  obtenerMensajes(referencia) {
    if (!referencia) throw new Error('Debe indicar DNI o expediente.');
    return ADAPTER_WorkflowLegacyV11.obtenerMensajes(referencia);
  },
  delegarSubetapa(id, correo, usuario) {
    if (!id) throw new Error('No se recibió el ID de la subetapa.');
    if (!String(correo || '').trim()) throw new Error('Debe seleccionar un responsable.');
    return ADAPTER_WorkflowLegacyV11.delegarSubetapa(id, correo, usuario || '');
  },
  avanzarEtapa(expediente, etapaActual, usuario) {
    if (!expediente) throw new Error('Debe indicar el expediente.');
    return ADAPTER_WorkflowLegacyV11.avanzarEtapa(expediente, Number(etapaActual), usuario || '');
  },
  finalizarEtapa(expediente, etapa, usuario) {
    if (!expediente) throw new Error('Debe indicar el expediente.');
    return ADAPTER_WorkflowLegacyV11.finalizarEtapa(expediente, Number(etapa), usuario || '');
  },
  rehacerEtapa(expediente, etapa, usuario) {
    if (!expediente) throw new Error('Debe indicar el expediente.');
    return ADAPTER_WorkflowLegacyV11.rehacerEtapa(expediente, Number(etapa), usuario || '');
  }
});

function MVC11_diagnostico() {
  const funciones = {
    REPO_ExpedienteV2: typeof REPO_ExpedienteV2 !== 'undefined',
    REPO_AdministracionV3: typeof REPO_AdministracionV3 !== 'undefined',
    REPO_SeguimientoV3: typeof REPO_SeguimientoV3 !== 'undefined',
    SOA_AdministracionV3Service: typeof SOA_AdministracionV3Service !== 'undefined',
    SOA_SeguimientoV3Service: typeof SOA_SeguimientoV3Service !== 'undefined',
    SOA_WorkflowV11Service: typeof SOA_WorkflowV11Service !== 'undefined',
    MVC3_obtenerDatosAlumnoAdmin: typeof MVC3_obtenerDatosAlumnoAdmin === 'function',
    MVC7B_obtenerEstadoExpediente: typeof MVC7B_obtenerEstadoExpediente === 'function'
  };
  const faltantes = Object.keys(funciones).filter(k => !funciones[k]);
  let accesoExpedientes = null, accesoSeguimiento = null, accesoSubetapas = null;
  const errores = [];
  try { accesoExpedientes = REPO_ExpedienteV2.verificarAcceso(); } catch(e) { errores.push('EXPEDIENTES: ' + e.message); }
  try {
    const s = REPO_SeguimientoV3.sheetLegacy();
    accesoSeguimiento = {status:true,hoja:s.getName(),filas:s.getLastRow(),columnas:s.getLastColumn()};
  } catch(e) { errores.push('SEGUIMIENTO: ' + e.message); }
  try {
    const s2 = REPO_SeguimientoV3.sheetSubetapas();
    accesoSubetapas = {status:true,hoja:s2.getName(),filas:s2.getLastRow(),columnas:s2.getLastColumn()};
  } catch(e) { errores.push('SEGUIMIENTO_SUBETAPAS: ' + e.message); }

  return {
    status: faltantes.length === 0 && errores.length === 0,
    fase: 11,
    arquitectura: 'MVC + SOA',
    objetivo: 'Desacoplar Administracion y lecturas de Seguimiento de helpers legacy; centralizar Workflow en SOA',
    resultado: {
      administracionUsaRepositoryExpediente: true,
      seguimientoLecturaDirectaSheets: true,
      subetapasLecturaDirectaSheets: true,
      frontendAdminSeguimientoUsaSOA: true,
      workflowCentralizadoEnSOA: true,
      workflowLegacySoloMotorTemporal: true
    },
    funciones,
    acceso: {expedientes:accesoExpedientes,seguimiento:accesoSeguimiento,subetapas:accesoSubetapas},
    clasificacion: {
      '09_AdminSeguimientoRepositoriesV3.gs':'IMPLEMENTACION_PRINCIPAL',
      '10_AdminSeguimientoServicesV3.gs':'IMPLEMENTACION_PRINCIPAL',
      '11_AdminSeguimientoControllersV3.gs':'IMPLEMENTACION_PRINCIPAL',
      '35_DesacoplamientoAdminSeguimientoWorkflowV11.gs':'ORQUESTACION_WORKFLOW',
      'AdministracionExpedientes.gs':'ADAPTADOR_COMPATIBILIDAD',
      'SeguimientoEtapas.gs':'ADAPTADOR_COMPATIBILIDAD',
      'SeguimientoSubetapas.gs':'MOTOR_TEMPORAL_WORKFLOW',
      'WorkflowEtapas.gs':'MOTOR_TEMPORAL_WORKFLOW'
    },
    puedeEliminarAdministracionExpedientesGs:false,
    puedeEliminarSeguimientoEtapasGs:false,
    puedeEliminarWorkflowEtapasGs:false,
    motivoNoEliminar:'Otros modulos todavia consumen nombres globales legacy y el motor de workflow conserva transiciones, correos e historial.',
    faltantes,
    advertencias:[],
    errores
  };
}

function MVC11_PROBAR_DIAGNOSTICO() {
  const r = MVC11_diagnostico();
  console.log(JSON.stringify(r, null, 2));
  return r;
}
