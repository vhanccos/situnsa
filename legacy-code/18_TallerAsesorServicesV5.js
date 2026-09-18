/** FASE 5 - SOA SERVICES */
var SOA_TallerV5Service = {
  listarInscripciones: function(forzar){ return REPO_TallerV5.listarInscripciones(forzar); },
  registrarInscripcion: function(datos){
    if(!datos) throw new Error('Debe enviar los datos de inscripción.');
    return REPO_TallerV5.registrarInscripcion(datos);
  },
  subirDocumento: function(form){ return REPO_TallerV5.subirDocumento(form); },
  finalizarDocumentos: function(id){
    if(!id) throw new Error('ID de inscripción requerido.');
    return REPO_TallerV5.finalizarDocumentos(id);
  },
  listarTalleres: function(forzar){ return (typeof REPO_TallerAsesorRoutedV10==='object') ? REPO_TallerAsesorRoutedV10.listarTalleres() : REPO_TallerV5.listarTalleres(forzar); },
  crearTaller: function(datos){
    if(!datos) throw new Error('Debe enviar los datos del taller.');
    var r = REPO_TallerV5.crearTaller(datos);
    if(typeof BD12_afterLegacySafe_==='function') BD12_afterLegacySafe_('TALLER','CREAR_TALLER',(r&&r.id)||'',datos||{});
    return r;
  },
  matricular: function(datos){
    if(!datos) throw new Error('Debe enviar los datos para matrícula.');
    var r = REPO_TallerV5.validarMatricular(datos);
    if(typeof BD12_afterLegacySafe_==='function') BD12_afterLegacySafe_('TALLER','MATRICULAR',(datos&&datos.idTaller)||'',datos||{});
    return r;
  },
  grupo: function(id,forzar){ if(!id) throw new Error('ID de taller requerido.'); return REPO_TallerV5.grupo(id,forzar); },
  matriculados: function(id,forzar){ return (typeof REPO_TallerAsesorRoutedV10==='object') ? REPO_TallerAsesorRoutedV10.matriculados(id) : REPO_TallerV5.matriculados(id,forzar); },
  sesiones: function(id){ return (typeof REPO_TallerAsesorRoutedV10==='object') ? REPO_TallerAsesorRoutedV10.sesiones(id) : REPO_TallerV5.sesiones(id); },
  asistenciaSesion: function(idT,idS){ return REPO_TallerV5.asistenciaSesion(idT,idS); },
  guardarAsistencia: function(datos){ var r=REPO_TallerV5.guardarAsistencia(datos); if(typeof BD12_afterLegacySafe_==='function')BD12_afterLegacySafe_('TALLER','GUARDAR_ASISTENCIA',(datos&&datos.idTaller)||'',datos||{}); return r; },
  dashboard: function(){ return REPO_TallerV5.dashboard(); },
  bootstrap: function(forzar){ return REPO_TallerV5.bootstrap(forzar); },
  estadoCopia: function(exp){ return REPO_TallerV5.estadoCopia(exp); },
  iniciarCopia: function(exp){ return REPO_TallerV5.iniciarCopia(exp); },
  reintentarCopia: function(exp){ return REPO_TallerV5.reintentarCopia(exp); }
};

var SOA_AsesorV5Service = {
  listar: function(forzar){ return (typeof REPO_TallerAsesorRoutedV10==='object') ? REPO_TallerAsesorRoutedV10.listarAsesores() : REPO_AsesorV5.listar(forzar); },
  crear: function(datos){ if(!datos) throw new Error('Debe enviar los datos del asesor.'); var r=REPO_AsesorV5.crear(datos); if(typeof BD12_afterLegacySafe_==='function')BD12_afterLegacySafe_('ASESOR','CREAR_ASESOR',(r&&r.id)||'',datos||{}); return r; },
  login: function(usuario,password){
    if(!usuario || !password) return {status:false,message:'Usuario y contraseña son obligatorios.'};
    var r=REPO_AsesorV5.login(usuario,password);
    return (typeof BD13_AUTENTICAR_ASESOR_MIRROR==='function') ? BD13_AUTENTICAR_ASESOR_MIRROR(usuario,password,r) : r;
  },
  portal: function(token){ return REPO_AsesorV5.portal(token); },
  portalRapido: function(token){ return REPO_AsesorV5.portalRapido(token); },
  grupo: function(token,id){ return REPO_AsesorV5.grupo(token,id); },
  avance: function(token,id,exp){ return REPO_AsesorV5.avance(token,id,exp); },
  asistencia: function(token,idT,idS){ return REPO_AsesorV5.asistencia(token,idT,idS); },
  guardarAsistencia: function(token,datos){ var r=REPO_AsesorV5.guardarAsistencia(token,datos); if(typeof BD12_afterLegacySafe_==='function')BD12_afterLegacySafe_('TALLER','GUARDAR_ASISTENCIA',(datos&&datos.idTaller)||'',datos||{}); return r; },
  matrizAsistencia: function(token,id){ return REPO_AsesorV5.matrizAsistencia(token,id); },
  toggleAsistencia: function(token,datos){ var r=REPO_AsesorV5.toggleAsistencia(token,datos); if(typeof BD12_afterLegacySafe_==='function')BD12_afterLegacySafe_('TALLER','GUARDAR_ASISTENCIA',(datos&&datos.idTaller)||'',datos||{}); return r; }
};

var SOA_RevisionAsesorV5Service = {
  inicializar: function(){ return REPO_RevisionAsesorV5.asegurarEstructura(); },
  revisiones: function(expediente){ return REPO_RevisionAsesorV5.revisionesExpediente(expediente); },
  documentos: function(token,idTaller,expediente){ return REPO_RevisionAsesorV5.documentos(token,idTaller,expediente); },
  validar: function(token,idTaller,expediente,etapa){ return REPO_RevisionAsesorV5.validarDocumento(token,idTaller,expediente,etapa); },
  nuevaCarga: function(token,idTaller,expediente,etapa,mensaje){ return REPO_RevisionAsesorV5.habilitarNuevaCarga(token,idTaller,expediente,etapa,mensaje); },
  mensaje: function(token,idTaller,expediente,etapa,mensaje){ return REPO_RevisionAsesorV5.mensaje(token,idTaller,expediente,etapa,mensaje); }
};

