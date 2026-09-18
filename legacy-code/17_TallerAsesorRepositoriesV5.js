/**
 * FASE 13 - REPOSITORIES TALLER / ASESOR
 * Acceso principal directo a Repository V13. Solo operaciones sensibles de
 * inscripcion, matriculacion y Drive conservan adaptador temporal a TallerTesis.gs.
 */
var REPO_TallerV5 = {
  listarInscripciones: function(forzar){ return TT_listarInscripciones(!!forzar); },
  registrarInscripcion: function(datos){ return TT_registrarInscripcion(datos); },
  subirDocumento: function(form){ return TT_subirDocumento(form); },
  finalizarDocumentos: function(idInscripcion){ return TT_finalizarDocumentos(idInscripcion); },

  listarTalleres: function(forzar){ return REPO_TallerCoreV13.listarTalleres(!!forzar); },
  crearTaller: function(datos){ return REPO_TallerCoreV13.crearTaller(datos); },
  validarMatricular: function(datos){ return TT_validarMatricular(datos); },
  grupo: function(idTaller, forzar){ return TT_grupoTaller(idTaller, !!forzar); },
  matriculados: function(idTaller, forzar){ return TT_matriculados(idTaller, !!forzar); },
  sesiones: function(idTaller){ return REPO_TallerCoreV13.sesiones(idTaller); },
  asistenciaSesion: function(idTaller,idSesion){ return TT_asistenciaSesion(idTaller,idSesion); },
  guardarAsistencia: function(datos){ return TT_guardarAsistencia(datos); },
  dashboard: function(){ return TT_dashboard(); },
  bootstrap: function(forzar){ return TT_adminBootstrap(!!forzar); },
  estadoCopia: function(expediente){ return TT_estadoCopia(expediente); },
  iniciarCopia: function(expediente){ return TT_iniciarCopiaDocumental(expediente); },
  reintentarCopia: function(expediente){ return TT_reintentarCopiaDocumental(expediente); }
};

var REPO_AsesorV5 = {
  listar: function(forzar){ return REPO_TallerCoreV13.listarAsesores(!!forzar); },
  crear: function(datos){ return REPO_TallerCoreV13.crearAsesor(datos); },
  login: function(usuario,password){ return REPO_TallerCoreV13.loginAsesor(usuario,password); },
  portal: function(token){ return TT_portal(token); },
  portalRapido: function(token){ return REPO_TallerCoreV13.portalRapido(token); },
  grupo: function(token,idTaller){ return TT_portalGrupo(token,idTaller); },
  avance: function(token,idTaller,expediente){ return TT_portalAvance(token,idTaller,expediente); },
  asistencia: function(token,idTaller,idSesion){ return TT_portalAsistencia(token,idTaller,idSesion); },
  guardarAsistencia: function(token,datos){ return TT_portalGuardarAsistencia(token,datos); },
  matrizAsistencia: function(token,idTaller){ return REPO_TallerCoreV13.matrizAsistencia(token,idTaller); },
  toggleAsistencia: function(token,datos){ return REPO_TallerCoreV13.toggleAsistencia(token,datos); }
};

var REPO_RevisionAsesorV5 = {
  asegurarEstructura: function(){ return REPO_RevisionAsesorV13.asegurarColumnas(); },
  revisionesExpediente: function(expediente){ return REPO_RevisionAsesorV13.revisiones(expediente); },
  documentos: function(token,idTaller,expediente){ return REPO_RevisionAsesorV13.documentos(token,idTaller,expediente); },
  validarDocumento: function(token,idTaller,expediente,etapa){ return REPO_RevisionAsesorV13.validar(token,idTaller,expediente,etapa); },
  habilitarNuevaCarga: function(token,idTaller,expediente,etapa,mensaje){ return REPO_RevisionAsesorV13.nuevaCarga(token,idTaller,expediente,etapa,mensaje); },
  mensaje: function(token,idTaller,expediente,etapa,mensaje){ return REPO_RevisionAsesorV13.mensaje(token,idTaller,expediente,etapa,mensaje); }
};
