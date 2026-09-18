/**
 * FASE 7 - PARTE 3 / REFACTORIZADO EN FASE 11
 * FACHADA WORKFLOW / ETAPAS / SUBETAPAS -> MVC + SOA
 *
 * FASE 11:
 * - Lecturas: REPO_SeguimientoV3 directo a Sheets.
 * - Mutaciones/transiciones: SOA_WorkflowV11Service.
 * - El frontend deja de depender directamente de WorkflowEtapas.gs.
 */

const REPO_WorkflowLegacyV7 = Object.freeze({
  obtenerEstadoExpediente(expediente) {
    return SOA_SeguimientoV3Service.obtenerEstadoLegacyShape(expediente);
  },
  obtenerSubetapasAdmin(referencia) {
    if (typeof REPO_SeguimientoRoutedV8 !== 'undefined' && REPO_SeguimientoRoutedV8) {
      return REPO_SeguimientoRoutedV8.procesoPorExpediente(referencia);
    }
    return REPO_SeguimientoV3.procesoPorExpediente(referencia);
  },
  confirmarPresentacionInicial(id, usuario) { return SOA_WorkflowV11Service.confirmarPresentacionInicial(id, usuario); },
  finalizarSubetapa(id, usuario) { return SOA_WorkflowV11Service.finalizarSubetapa(id, usuario); },
  notificarFinalizacionSubetapa(expediente, etapa, nombreEtapa, descripcion, fechaFin, usuario) {
    return SOA_WorkflowV11Service.notificarFinalizacion(expediente, etapa, nombreEtapa, descripcion, fechaFin, usuario);
  },
  avanzarSiguienteEtapa(expediente, etapaActual, correoResponsable, usuario) {
    return SOA_WorkflowV11Service.avanzarSiguienteEtapa(expediente, etapaActual, correoResponsable, usuario);
  },
  guardarMensajeSubetapa(id, mensaje, usuario, correoUsuario) { return SOA_WorkflowV11Service.guardarMensaje(id, mensaje, usuario, correoUsuario); },
  obtenerMensajesExpediente(referencia) { return SOA_WorkflowV11Service.obtenerMensajes(referencia); },
  delegarSubetapa(id, correo, usuario) { return SOA_WorkflowV11Service.delegarSubetapa(id, correo, usuario); },
  avanzarEtapa(expediente, etapaActual, usuario) { return SOA_WorkflowV11Service.avanzarEtapa(expediente, etapaActual, usuario); },
  finalizarEtapa(expediente, etapa, usuario) { return SOA_WorkflowV11Service.finalizarEtapa(expediente, etapa, usuario); },
  rehacerEtapa(expediente, etapa, usuario) { return SOA_WorkflowV11Service.rehacerEtapa(expediente, etapa, usuario); }
});

const SOA_WorkflowV7Service = Object.freeze({
  obtenerEstadoExpediente(expediente) {
    if (!expediente) throw new Error('Debe indicar el expediente.');
    return REPO_WorkflowLegacyV7.obtenerEstadoExpediente(expediente);
  },
  obtenerSubetapasAdmin(referencia) {
    if (!referencia) throw new Error('Debe indicar DNI o expediente.');
    return REPO_WorkflowLegacyV7.obtenerSubetapasAdmin(referencia);
  },
  confirmarPresentacionInicial(id, usuario) {
    if (!id) throw new Error('No se recibió el ID de la subetapa.');
    return REPO_WorkflowLegacyV7.confirmarPresentacionInicial(id, usuario || '');
  },
  finalizarSubetapa(id, usuario) {
    if (!id) throw new Error('No se recibió el ID de la subetapa.');
    return REPO_WorkflowLegacyV7.finalizarSubetapa(id, usuario || '');
  },
  notificarFinalizacionSubetapa(expediente, etapa, nombreEtapa, descripcion, fechaFin, usuario) {
    return REPO_WorkflowLegacyV7.notificarFinalizacionSubetapa(expediente, etapa, nombreEtapa, descripcion, fechaFin, usuario);
  },
  avanzarSiguienteEtapa(expediente, etapaActual, correoResponsable, usuario) {
    if (!expediente) throw new Error('Debe indicar el expediente.');
    return REPO_WorkflowLegacyV7.avanzarSiguienteEtapa(expediente, Number(etapaActual), correoResponsable || '', usuario || '');
  },
  guardarMensajeSubetapa(id, mensaje, usuario, correoUsuario) {
    if (!id) throw new Error('No se recibió el ID de la subetapa.');
    if (!String(mensaje || '').trim()) throw new Error('El mensaje no puede estar vacío.');
    return REPO_WorkflowLegacyV7.guardarMensajeSubetapa(id, mensaje, usuario || '', correoUsuario || '');
  },
  obtenerMensajesExpediente(referencia) {
    if (!referencia) throw new Error('Debe indicar DNI o expediente.');
    return REPO_WorkflowLegacyV7.obtenerMensajesExpediente(referencia);
  },
  delegarSubetapa(id, correo, usuario) {
    if (!id) throw new Error('No se recibió el ID de la subetapa.');
    if (!String(correo || '').trim()) throw new Error('Debe seleccionar un responsable.');
    return REPO_WorkflowLegacyV7.delegarSubetapa(id, correo, usuario || '');
  },
  avanzarEtapa(expediente, etapaActual, usuario) {
    if (!expediente) throw new Error('Debe indicar el expediente.');
    return REPO_WorkflowLegacyV7.avanzarEtapa(expediente, Number(etapaActual), usuario || '');
  },
  finalizarEtapa(expediente, etapa, usuario) {
    if (!expediente) throw new Error('Debe indicar el expediente.');
    return REPO_WorkflowLegacyV7.finalizarEtapa(expediente, Number(etapa), usuario || '');
  },
  rehacerEtapa(expediente, etapa, usuario) {
    if (!expediente) throw new Error('Debe indicar el expediente.');
    return REPO_WorkflowLegacyV7.rehacerEtapa(expediente, Number(etapa), usuario || '');
  }
});

function MVC7B_obtenerEstadoExpediente(expediente) { return SOA_WorkflowV7Service.obtenerEstadoExpediente(expediente); }
function MVC7B_obtenerSubetapasAdmin(referencia) { return (typeof BD18_OBTENER_WORKFLOW==='function') ? BD18_OBTENER_WORKFLOW(referencia) : SOA_WorkflowV7Service.obtenerSubetapasAdmin(referencia); }
function MVC7B_confirmarPresentacionInicial(id, usuario) { return SOA_WorkflowV7Service.confirmarPresentacionInicial(id, usuario); }
function MVC7B_finalizarSubetapa(id, usuario) { return SOA_WorkflowV7Service.finalizarSubetapa(id, usuario); }
function MVC7B_notificarFinalizacionSubetapa(expediente, etapa, nombreEtapa, descripcion, fechaFin, usuario) { return SOA_WorkflowV7Service.notificarFinalizacionSubetapa(expediente, etapa, nombreEtapa, descripcion, fechaFin, usuario); }
function MVC7B_avanzarSiguienteEtapa(expediente, etapaActual, correoResponsable, usuario) { return SOA_WorkflowV7Service.avanzarSiguienteEtapa(expediente, etapaActual, correoResponsable, usuario); }
function MVC7B_guardarMensajeSubetapa(id, mensaje, usuario, correoUsuario) { return SOA_WorkflowV7Service.guardarMensajeSubetapa(id, mensaje, usuario, correoUsuario); }
function MVC7B_obtenerMensajesExpediente(referencia) { return SOA_WorkflowV7Service.obtenerMensajesExpediente(referencia); }
function MVC7B_delegarSubetapa(id, correo, usuario) { return SOA_WorkflowV7Service.delegarSubetapa(id, correo, usuario); }
function MVC7B_avanzarEtapa(expediente, etapaActual, usuario) { return SOA_WorkflowV7Service.avanzarEtapa(expediente, etapaActual, usuario); }
function MVC7B_finalizarEtapa(expediente, etapa, usuario) { return SOA_WorkflowV7Service.finalizarEtapa(expediente, etapa, usuario); }
function MVC7B_rehacerEtapa(expediente, etapa, usuario) { return SOA_WorkflowV7Service.rehacerEtapa(expediente, etapa, usuario); }

function MVC7B_diagnostico() {
  const requeridas = {
    REPO_SeguimientoV3: typeof REPO_SeguimientoV3 !== 'undefined',
    SOA_SeguimientoV3Service: typeof SOA_SeguimientoV3Service !== 'undefined',
    SOA_WorkflowV11Service: typeof SOA_WorkflowV11Service !== 'undefined'
  };
  const faltantes = Object.keys(requeridas).filter(k => !requeridas[k]);
  return {
    status: faltantes.length === 0,
    fase: '7.3 / 11', arquitectura: 'MVC + SOA', dominio: 'Workflow de etapas y subetapas',
    lecturaDirectaRepository: true, workflowCentralizadoSOA: true,
    correcciones: ['finalizarSubetapaWorkflowV4 -> motor V3 mediante SOA_WorkflowV11Service'],
    faltantes
  };
}
