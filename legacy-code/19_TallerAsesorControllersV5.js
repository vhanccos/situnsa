/** FASE 5 - MVC CONTROLLERS + ENDPOINTS */
function MVC5_respuesta_(fn){
  try { return fn(); }
  catch(e){ return {status:false,message:e && e.message ? e.message : String(e)}; }
}

var MVC_TallerV5Controller = {
  listarInscripciones:function(f){return MVC5_respuesta_(function(){return SOA_TallerV5Service.listarInscripciones(f);});},
  registrarInscripcion:function(d){return MVC5_respuesta_(function(){return SOA_TallerV5Service.registrarInscripcion(d);});},
  subirDocumento:function(f){return MVC5_respuesta_(function(){return SOA_TallerV5Service.subirDocumento(f);});},
  finalizarDocumentos:function(id){return MVC5_respuesta_(function(){return SOA_TallerV5Service.finalizarDocumentos(id);});},
  listarTalleres:function(f){return MVC5_respuesta_(function(){return SOA_TallerV5Service.listarTalleres(f);});},
  crearTaller:function(d){return MVC5_respuesta_(function(){return SOA_TallerV5Service.crearTaller(d);});},
  matricular:function(d){return MVC5_respuesta_(function(){return SOA_TallerV5Service.matricular(d);});},
  grupo:function(id,f){return MVC5_respuesta_(function(){return SOA_TallerV5Service.grupo(id,f);});},
  dashboard:function(){return MVC5_respuesta_(function(){return SOA_TallerV5Service.dashboard();});},
  bootstrap:function(f){return MVC5_respuesta_(function(){return SOA_TallerV5Service.bootstrap(f);});},
  estadoCopia:function(e){return MVC5_respuesta_(function(){return SOA_TallerV5Service.estadoCopia(e);});},
  iniciarCopia:function(e){return MVC5_respuesta_(function(){return SOA_TallerV5Service.iniciarCopia(e);});},
  reintentarCopia:function(e){return MVC5_respuesta_(function(){return SOA_TallerV5Service.reintentarCopia(e);});}
};

var MVC_AsesorV5Controller = {
  listar:function(f){return MVC5_respuesta_(function(){return SOA_AsesorV5Service.listar(f);});},
  crear:function(d){return MVC5_respuesta_(function(){return SOA_AsesorV5Service.crear(d);});},
  login:function(u,p){return MVC5_respuesta_(function(){return SOA_AsesorV5Service.login(u,p);});},
  portal:function(t){return MVC5_respuesta_(function(){return SOA_AsesorV5Service.portal(t);});},
  portalRapido:function(t){return MVC5_respuesta_(function(){return SOA_AsesorV5Service.portalRapido(t);});},
  grupo:function(t,id){return MVC5_respuesta_(function(){return SOA_AsesorV5Service.grupo(t,id);});},
  avance:function(t,id,e){return MVC5_respuesta_(function(){return SOA_AsesorV5Service.avance(t,id,e);});},
  matrizAsistencia:function(t,id){return MVC5_respuesta_(function(){return SOA_AsesorV5Service.matrizAsistencia(t,id);});},
  toggleAsistencia:function(t,d){return MVC5_respuesta_(function(){return SOA_AsesorV5Service.toggleAsistencia(t,d);});}
};

var MVC_RevisionAsesorV5Controller = {
  inicializar:function(){return MVC5_respuesta_(function(){return SOA_RevisionAsesorV5Service.inicializar();});},
  revisiones:function(e){return MVC5_respuesta_(function(){return SOA_RevisionAsesorV5Service.revisiones(e);});},
  documentos:function(t,id,e){return MVC5_respuesta_(function(){return SOA_RevisionAsesorV5Service.documentos(t,id,e);});},
  validar:function(t,id,e,et){return MVC5_respuesta_(function(){return SOA_RevisionAsesorV5Service.validar(t,id,e,et);});},
  nuevaCarga:function(t,id,e,et,m){return MVC5_respuesta_(function(){return SOA_RevisionAsesorV5Service.nuevaCarga(t,id,e,et,m);});},
  mensaje:function(t,id,e,et,m){return MVC5_respuesta_(function(){return SOA_RevisionAsesorV5Service.mensaje(t,id,e,et,m);});}
};

// Endpoints explícitos FASE 5
function MVC5_listarInscripciones(f){return MVC_TallerV5Controller.listarInscripciones(f);}
function MVC5_registrarInscripcion(d){return MVC_TallerV5Controller.registrarInscripcion(d);}
function MVC5_listarTalleres(f){return MVC_TallerV5Controller.listarTalleres(f);}
function MVC5_crearTaller(d){return MVC_TallerV5Controller.crearTaller(d);}
function MVC5_matricular(d){return MVC_TallerV5Controller.matricular(d);}
function MVC5_dashboardTaller(){return MVC_TallerV5Controller.dashboard();}
function MVC5_listarAsesores(f){return MVC_AsesorV5Controller.listar(f);}
function MVC5_crearAsesor(d){return MVC_AsesorV5Controller.crear(d);}
function MVC5_loginAsesor(u,p){return MVC_AsesorV5Controller.login(u,p);}
function MVC5_portalAsesorRapido(t){return MVC_AsesorV5Controller.portalRapido(t);}
function MVC5_portalGrupo(t,id){return MVC_AsesorV5Controller.grupo(t,id);}
function MVC5_portalAvance(t,id,e){return MVC_AsesorV5Controller.avance(t,id,e);}
function MVC5_portalMatrizAsistencia(t,id){return MVC_AsesorV5Controller.matrizAsistencia(t,id);}
function MVC5_toggleAsistencia(t,d){return MVC_AsesorV5Controller.toggleAsistencia(t,d);}
function MVC5_documentosRevision(t,id,e){return MVC_RevisionAsesorV5Controller.documentos(t,id,e);}
function MVC5_validarDocumentoAsesor(t,id,e,et){return MVC_RevisionAsesorV5Controller.validar(t,id,e,et);}
function MVC5_habilitarNuevaCarga(t,id,e,et,m){return MVC_RevisionAsesorV5Controller.nuevaCarga(t,id,e,et,m);}
function MVC5_mensajeDocumentoAsesor(t,id,e,et,m){return MVC_RevisionAsesorV5Controller.mensaje(t,id,e,et,m);}
