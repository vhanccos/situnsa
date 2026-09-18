/**
 * FASE 7.5 - FACHADA MVC + SOA PARA VISTAS COMPLEMENTARIAS
 * Taller de Tesis + Administración de Taller + Portal Asesor + Portal Alumno.
 * Mantiene los contratos de respuesta existentes para evitar romper el frontend.
 */

var REPO_VistasComplementariasV7 = {
  // Taller público
  registrarInscripcion: function(datos){ return SOA_TallerV5Service.registrarInscripcion(datos); },
  subirDocumentoTaller: function(form){ return SOA_TallerV5Service.subirDocumento(form); },
  finalizarDocumentosTaller: function(id){ return SOA_TallerV5Service.finalizarDocumentos(id); },

  // Administración Taller
  adminBootstrap: function(forzar){ return TT_adminBootstrap(!!forzar); },
  configCarpeta: function(valor){ return TT_configCarpeta(valor); },
  crearAsesor: function(datos){ return SOA_AsesorV5Service.crear(datos); },
  crearTaller: function(datos){ return SOA_TallerV5Service.crearTaller(datos); },
  inicializarTaller: function(arg){ return TT_inicializar(arg); },
  iniciarCopia: function(expediente){ return TT_iniciarCopiaDocumental(expediente); },
  rosterTaller: function(id){ return TT_rosterTaller(id); },
  validarMatricular: function(datos){ return SOA_TallerV5Service.matricular(datos); },

  // Portal asesor
  loginAsesor: function(usuario,password){ return SOA_AsesorV5Service.login(usuario,password); },
  portalRapido: function(token){ return SOA_AsesorV5Service.portalRapido(token); },
  matrizAsistencia: function(token,idTaller){ return SOA_AsesorV5Service.matrizAsistencia(token,idTaller); },
  toggleAsistencia: function(token,datos){ return SOA_AsesorV5Service.toggleAsistencia(token,datos); },
  portalAvance: function(token,idTaller,expediente){ return SOA_AsesorV5Service.avance(token,idTaller,expediente); },
  documentosRevision: function(token,idTaller,expediente){ return SOA_RevisionAsesorV5Service.documentos(token,idTaller,expediente); },
  validarDocumento: function(token,idTaller,expediente,etapa){ return SOA_RevisionAsesorV5Service.validar(token,idTaller,expediente,etapa); },
  habilitarNuevaCarga: function(token,idTaller,expediente,etapa,mensaje){ return SOA_RevisionAsesorV5Service.nuevaCarga(token,idTaller,expediente,etapa,mensaje); },
  mensajeDocumento: function(token,idTaller,expediente,etapa,mensaje){ return SOA_RevisionAsesorV5Service.mensaje(token,idTaller,expediente,etapa,mensaje); },

  // Portal alumno
  portalAlumno: function(dni){ return obtenerPortalAlumno(dni); },
  historialAlumno: function(dni,soloPublico){ return SOA_HistorialV4Service.porDni(dni,soloPublico); },
  procesoAlumno: function(dni){ return obtenerProcesoAlumno(dni); },
  subirArchivoSubetapa: function(datos){ return SOA_DocumentosV4Service.subirSubetapa(datos); },
  mensajesInvitado: function(dni){ return obtenerMensajesInvitado(dni); }
};

var SOA_VistasComplementariasV7Service = {
  registrarInscripcion:function(d){ return REPO_VistasComplementariasV7.registrarInscripcion(d); },
  subirDocumentoTaller:function(f){ return REPO_VistasComplementariasV7.subirDocumentoTaller(f); },
  finalizarDocumentosTaller:function(id){ return REPO_VistasComplementariasV7.finalizarDocumentosTaller(id); },

  adminBootstrap:function(f){ return REPO_VistasComplementariasV7.adminBootstrap(f); },
  configCarpeta:function(v){ return REPO_VistasComplementariasV7.configCarpeta(v); },
  crearAsesor:function(d){ return REPO_VistasComplementariasV7.crearAsesor(d); },
  crearTaller:function(d){ return REPO_VistasComplementariasV7.crearTaller(d); },
  inicializarTaller:function(a){ return REPO_VistasComplementariasV7.inicializarTaller(a); },
  iniciarCopia:function(e){ return REPO_VistasComplementariasV7.iniciarCopia(e); },
  rosterTaller:function(id){ return REPO_VistasComplementariasV7.rosterTaller(id); },
  validarMatricular:function(d){ return REPO_VistasComplementariasV7.validarMatricular(d); },

  loginAsesor:function(u,p){ return REPO_VistasComplementariasV7.loginAsesor(u,p); },
  portalRapido:function(t){ return REPO_VistasComplementariasV7.portalRapido(t); },
  matrizAsistencia:function(t,id){ return REPO_VistasComplementariasV7.matrizAsistencia(t,id); },
  toggleAsistencia:function(t,d){ return REPO_VistasComplementariasV7.toggleAsistencia(t,d); },
  portalAvance:function(t,id,e){ return REPO_VistasComplementariasV7.portalAvance(t,id,e); },
  documentosRevision:function(t,id,e){ return REPO_VistasComplementariasV7.documentosRevision(t,id,e); },
  validarDocumento:function(t,id,e,et){ return REPO_VistasComplementariasV7.validarDocumento(t,id,e,et); },
  habilitarNuevaCarga:function(t,id,e,et,m){ return REPO_VistasComplementariasV7.habilitarNuevaCarga(t,id,e,et,m); },
  mensajeDocumento:function(t,id,e,et,m){ return REPO_VistasComplementariasV7.mensajeDocumento(t,id,e,et,m); },

  portalAlumno:function(d){ return REPO_VistasComplementariasV7.portalAlumno(d); },
  historialAlumno:function(d,p){ return REPO_VistasComplementariasV7.historialAlumno(d,p); },
  procesoAlumno:function(d){ return REPO_VistasComplementariasV7.procesoAlumno(d); },
  subirArchivoSubetapa:function(d){ return REPO_VistasComplementariasV7.subirArchivoSubetapa(d); },
  mensajesInvitado:function(d){ return REPO_VistasComplementariasV7.mensajesInvitado(d); }
};

// Controller / endpoints usados desde las vistas.
function MVC7D_registrarInscripcion(d){ return SOA_VistasComplementariasV7Service.registrarInscripcion(d); }
function MVC7D_subirDocumentoTaller(f){ return SOA_VistasComplementariasV7Service.subirDocumentoTaller(f); }
function MVC7D_finalizarDocumentosTaller(id){ return SOA_VistasComplementariasV7Service.finalizarDocumentosTaller(id); }

function MVC7D_adminBootstrap(f){ return SOA_VistasComplementariasV7Service.adminBootstrap(f); }
function MVC7D_configCarpeta(v){ return SOA_VistasComplementariasV7Service.configCarpeta(v); }
function MVC7D_crearAsesor(d){ return SOA_VistasComplementariasV7Service.crearAsesor(d); }
function MVC7D_crearTaller(d){ return SOA_VistasComplementariasV7Service.crearTaller(d); }
function MVC7D_inicializarTaller(a){ return SOA_VistasComplementariasV7Service.inicializarTaller(a); }
function MVC7D_iniciarCopiaDocumental(e){ return SOA_VistasComplementariasV7Service.iniciarCopia(e); }
function MVC7D_rosterTaller(id){ return SOA_VistasComplementariasV7Service.rosterTaller(id); }
function MVC7D_validarMatricular(d){ return SOA_VistasComplementariasV7Service.validarMatricular(d); }

function MVC7D_loginAsesor(u,p){ return SOA_VistasComplementariasV7Service.loginAsesor(u,p); }
function MVC7D_portalAsesorRapido(t){ return SOA_VistasComplementariasV7Service.portalRapido(t); }
function MVC7D_portalMatrizAsistencia(t,id){ return SOA_VistasComplementariasV7Service.matrizAsistencia(t,id); }
function MVC7D_toggleAsistencia(t,d){ return SOA_VistasComplementariasV7Service.toggleAsistencia(t,d); }
function MVC7D_portalAvance(t,id,e){ return SOA_VistasComplementariasV7Service.portalAvance(t,id,e); }
function MVC7D_documentosRevisionAsesor(t,id,e){ return SOA_VistasComplementariasV7Service.documentosRevision(t,id,e); }
function MVC7D_validarDocumentoAsesor(t,id,e,et){ return SOA_VistasComplementariasV7Service.validarDocumento(t,id,e,et); }
function MVC7D_habilitarNuevaCargaAsesor(t,id,e,et,m){ return SOA_VistasComplementariasV7Service.habilitarNuevaCarga(t,id,e,et,m); }
function MVC7D_mensajeAsesorDocumento(t,id,e,et,m){ return SOA_VistasComplementariasV7Service.mensajeDocumento(t,id,e,et,m); }

function MVC7D_obtenerPortalAlumno(d){ return SOA_VistasComplementariasV7Service.portalAlumno(d); }
function MVC7D_obtenerHistorialAlumno(d,p){ return SOA_VistasComplementariasV7Service.historialAlumno(d,p); }
function MVC7D_obtenerProcesoAlumno(d){ return SOA_VistasComplementariasV7Service.procesoAlumno(d); }
function MVC7D_subirArchivoSubetapa(d){ return SOA_VistasComplementariasV7Service.subirArchivoSubetapa(d); }
function MVC7D_obtenerMensajesInvitado(d){ return SOA_VistasComplementariasV7Service.mensajesInvitado(d); }

function MVC7D_diagnostico(){
  var requeridas=[
    'MVC5_registrarInscripcion','MVC5_crearTaller','MVC5_crearAsesor','MVC5_loginAsesor',
    'MVC5_portalAsesorRapido','MVC5_portalMatrizAsistencia','MVC5_toggleAsistencia',
    'MVC5_documentosRevision','MVC5_validarDocumentoAsesor',
    'obtenerPortalAlumno','obtenerProcesoAlumno','obtenerMensajesInvitado'
  ];
  var faltantes=[];
  requeridas.forEach(function(n){ try{ if(typeof this[n] !== 'function') faltantes.push(n); }catch(e){ faltantes.push(n); } }, this);
  return {status:faltantes.length===0,fase:'7.5/13',arquitectura:'MVC + SOA',dominio:'Vistas complementarias',vistas:['taller_admin.html','taller_tesis.html','asesor.html','tramite.html'],faltantes:faltantes};
}
