/**
 * FASE 15 - CONSOLIDACION FINAL MVC + SOA
 * Sistema de Titulacion - Segunda Especialidad
 *
 * Diagnostico final de arquitectura. No modifica datos.
 */
function MVC15_diagnosticoFinal() {
  const checks = {
    arquitecturaBase: typeof APP_ARCH === 'object' && APP_ARCH.architecture === 'MVC + SOA',
    expedienteRepository: typeof REPO_ExpedienteV2 === 'object',
    expedienteService: typeof SOA_ExpedienteV2Service === 'object',
    expedienteController: typeof MVC_ExpedienteV2Controller === 'object',
    adminRepository: typeof REPO_AdministracionV3 === 'object',
    adminService: typeof SOA_AdministracionV3Service === 'object',
    seguimientoRepository: typeof REPO_SeguimientoV3 === 'object',
    seguimientoService: typeof SOA_SeguimientoV3Service === 'object',
    workflowService: typeof SOA_WorkflowV11Service === 'object',
    documentosRepository: typeof REPO_DocumentosV4 === 'object',
    historialRepository: typeof REPO_HistorialV12 === 'object',
    documentalAdapter: typeof ADAPTER_DocumentalLegacyV12 === 'object',
    tallerRepository: typeof REPO_TallerV5 === 'object',
    tallerCoreRepository: typeof REPO_TallerCoreV13 === 'object',
    revisionRepository: typeof REPO_RevisionAsesorV13 === 'object',
    authRepository: typeof REPO_AuthUsuariosV6 === 'object',
    authService: typeof SOA_AuthUsuariosV6Service === 'object',
    sesionService: typeof SOA_SesionV6Service === 'object',
    frontendExpediente: typeof MVC7A_registrarExpediente === 'function',
    frontendWorkflow: typeof MVC7B_obtenerEstadoExpediente === 'function',
    frontendAuxiliar: typeof MVC7C_obtenerDashboardExpedientes === 'function',
    frontendVistas: typeof MVC7D_obtenerPortalAlumno === 'function',
    login: typeof MVC6_iniciarSesion === 'function',
    portalAlumno: typeof MVC7D_obtenerPortalAlumno === 'function'
  };

  const faltantes = Object.keys(checks).filter(k => !checks[k]);

  let acceso = {};
  try {
    const ex = REPO_ExpedienteV2.diagnosticoAcceso ? REPO_ExpedienteV2.diagnosticoAcceso() : null;
    acceso.expedientes = ex || {status:true, nota:'Repository disponible'};
  } catch (e) {
    acceso.expedientes = {status:false, error:String(e && e.message || e)};
  }

  return {
    status: faltantes.length === 0,
    fase: 15,
    version: APP_ARCH && APP_ARCH.version ? APP_ARCH.version : '2.0.0-final-mvc-soa',
    arquitectura: 'MVC + SOA',
    objetivo: 'Consolidacion final y cierre de la migracion arquitectonica',
    checks: checks,
    acceso: acceso,
    clasificacionFinal: {
      coreArquitectura: 'CONSOLIDADO',
      frontend: 'MIGRADO_A_MVC',
      services: 'CONSOLIDADOS',
      repositories: 'CONSOLIDADOS',
      auth: 'DESACOPLADO',
      expedientes: 'DESACOPLADO',
      administracionSeguimiento: 'DESACOPLADO',
      historial: 'DIRECTO_SHEETS',
      drive: 'ADAPTADOR_OPERATIVO_CONTROLADO',
      workflow: 'MOTOR_OPERATIVO_CONTROLADO',
      tallerInscripcionMatricula: 'MOTOR_OPERATIVO_CONTROLADO'
    },
    archivosOperativosQueSeConservan: [
      'WorkflowEtapas.gs',
      'SeguimientoSubetapas.gs',
      'DocumentosExpedientes.gs',
      'DocumentosEtapas.gs',
      'ArchivosSubetapas.gs',
      'ChecklistEtapa2.gs',
      'CopiasExpedientes.gs',
      'TallerTesis.gs'
    ],
    nota: 'Los motores operativos conservados no son llamadas directas del frontend; permanecen encapsulados por Services/Repositories/Adapters para preservar contratos, Drive, correos y transiciones.',
    faltantes: faltantes,
    advertencias: [],
    errores: faltantes.length ? ['Existen componentes arquitectonicos faltantes.'] : []
  };
}

function MVC15_PROBAR_DIAGNOSTICO() {
  const r = MVC15_diagnosticoFinal();
  console.log(JSON.stringify(r, null, 2));
  return r;
}
