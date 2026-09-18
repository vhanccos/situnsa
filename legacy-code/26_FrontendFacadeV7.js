/**
 * FASE 7 - PARTE 2
 * FACHADA DE INTEGRACION FRONTEND -> MVC/SOA
 *
 * Objetivo:
 * - Permitir que Dashboard.html deje de invocar directamente funciones legacy.
 * - Mantener exactamente las formas de respuesta que el frontend actual espera.
 * - Encapsular temporalmente proveedores legacy detrás de Repository -> Service -> Controller.
 *
 * Esta fachada es transitoria. En fases posteriores cada proveedor legacy podrá sustituirse
 * internamente sin volver a modificar el HTML.
 */

const REPO_FrontendLegacyV7 = Object.freeze({
  // EXPEDIENTES
  siguienteCodigo(){ return SOA_ExpedienteV2Service.siguienteCodigo(); },
  registrarExpediente(datos){ return SOA_ExpedienteV2Service.crear(datos); },
  procesarComplementarios(datos){ return SOA_ExpedienteComplementarioV2Service.procesar(datos); },
  generarDocumentos(datos){ return SOA_DocumentoV2Service.generar(datos); },
  progresoCopias(){ return SOA_DriveV4Service.obtenerProgresoCopias(); },

  // ADMINISTRACION
  buscarAlumnosAdmin(texto){ return SOA_AdministracionV3Service.buscarAdmin(texto); },
  obtenerDatosAlumnoAdmin(id){ return SOA_AdministracionV3Service.obtener(id); },
  guardarInformacionAdmin(datos){ return SOA_AdministracionV3Service.guardar(datos); },
  listarUsuariosDelegacion(correo){ const r=SOA_AdministracionV3Service.usuariosDelegables(correo); return r && r.status ? r.data : []; },

  // SEGUIMIENTO LEGACY (mantiene forma exacta usada por Dashboard)
  buscarAlumnoSeguimiento(texto){ return SOA_SeguimientoV3Service.buscarLegacyShape(texto); },
  obtenerSeguimiento(dni){ return SOA_SeguimientoV3Service.obtenerLegacyShape(dni); },
  guardarSeguimiento(datos){ return SOA_SeguimientoV3Service.guardarLegacy(datos); },

  // DOCUMENTOS
  listarDocumentosEtapa(expediente, etapa){ return SOA_DocumentosV4Service.listarEtapa(expediente, etapa); },
  listarDocumentosExpediente(expediente){ return SOA_DocumentosV4Service.listarExpediente(expediente); },
  subirDocumentosExpediente(datos){ return SOA_DocumentosV4Service.subirExpediente(datos); },
  renombrarDocumentoExpediente(expediente, archivoId, nuevoNombre){
    return SOA_DocumentosV4Service.renombrarExpediente({expediente:expediente,archivoId:archivoId,nuevoNombre:nuevoNombre});
  },
  eliminarDocumentoExpediente(expediente, archivoId){
    return SOA_DocumentosV4Service.eliminarExpediente({expediente:expediente,archivoId:archivoId});
  },

  // CHECKLIST ETAPA 2
  obtenerChecklist(expediente){ return SOA_ChecklistV4Service.obtener(expediente); },
  guardarCheck(expediente, numero, marcado, usuario, correo){
    return SOA_ChecklistV4Service.guardarCheck(expediente, numero, marcado, usuario, correo);
  },
  subirDocumentoChecklist(datos){ return SOA_ChecklistV4Service.subirDocumento(datos); },
  renombrarDocumentoChecklist(expediente, numero, nuevoNombre){
    return SOA_ChecklistV4Service.renombrarDocumento({expediente:expediente,numero:numero,nuevoNombre:nuevoNombre});
  },
  eliminarDocumentoChecklist(expediente, numero){
    return SOA_ChecklistV4Service.eliminarDocumento({expediente:expediente,numero:numero});
  },

  // HISTORIAL / SUBETAPAS
  historialArchivosSubetapa(expediente, etapa, subetapa){
    return SOA_DocumentosV4Service.historialSubetapa(expediente, etapa, subetapa);
  },
  autorizarNuevaCarga(id, usuario, correoUsuario, mensaje){
    return SOA_DocumentosV4Service.autorizarNuevaCarga(id, usuario, correoUsuario, mensaje);
  }
});

const SOA_FrontendV7Service = Object.freeze({
  siguienteCodigo(){ return REPO_FrontendLegacyV7.siguienteCodigo(); },
  registrarExpediente(datos){ return REPO_FrontendLegacyV7.registrarExpediente(datos); },
  procesarComplementarios(datos){ return REPO_FrontendLegacyV7.procesarComplementarios(datos); },
  generarDocumentos(datos){ return REPO_FrontendLegacyV7.generarDocumentos(datos); },
  progresoCopias(){ return REPO_FrontendLegacyV7.progresoCopias(); },

  buscarAlumnosAdmin(texto){ return REPO_FrontendLegacyV7.buscarAlumnosAdmin(texto); },
  obtenerDatosAlumnoAdmin(id){ return REPO_FrontendLegacyV7.obtenerDatosAlumnoAdmin(id); },
  guardarInformacionAdmin(datos){ return REPO_FrontendLegacyV7.guardarInformacionAdmin(datos); },
  listarUsuariosDelegacion(correo){ return REPO_FrontendLegacyV7.listarUsuariosDelegacion(correo); },

  buscarAlumnoSeguimiento(texto){ return REPO_FrontendLegacyV7.buscarAlumnoSeguimiento(texto); },
  obtenerSeguimiento(dni){ return REPO_FrontendLegacyV7.obtenerSeguimiento(dni); },
  guardarSeguimiento(datos){ return REPO_FrontendLegacyV7.guardarSeguimiento(datos); },

  listarDocumentosEtapa(expediente, etapa){ return REPO_FrontendLegacyV7.listarDocumentosEtapa(expediente, etapa); },
  listarDocumentosExpediente(expediente){ return REPO_FrontendLegacyV7.listarDocumentosExpediente(expediente); },
  subirDocumentosExpediente(datos){ return REPO_FrontendLegacyV7.subirDocumentosExpediente(datos); },
  renombrarDocumentoExpediente(expediente, archivoId, nuevoNombre){
    return REPO_FrontendLegacyV7.renombrarDocumentoExpediente(expediente, archivoId, nuevoNombre);
  },
  eliminarDocumentoExpediente(expediente, archivoId){
    return REPO_FrontendLegacyV7.eliminarDocumentoExpediente(expediente, archivoId);
  },

  obtenerChecklist(expediente){ return REPO_FrontendLegacyV7.obtenerChecklist(expediente); },
  guardarCheck(expediente, numero, marcado, usuario, correo){
    return REPO_FrontendLegacyV7.guardarCheck(expediente, numero, marcado, usuario, correo);
  },
  subirDocumentoChecklist(datos){ return REPO_FrontendLegacyV7.subirDocumentoChecklist(datos); },
  renombrarDocumentoChecklist(expediente, numero, nuevoNombre){
    return REPO_FrontendLegacyV7.renombrarDocumentoChecklist(expediente, numero, nuevoNombre);
  },
  eliminarDocumentoChecklist(expediente, numero){
    return REPO_FrontendLegacyV7.eliminarDocumentoChecklist(expediente, numero);
  },

  historialArchivosSubetapa(expediente, etapa, subetapa){
    return REPO_FrontendLegacyV7.historialArchivosSubetapa(expediente, etapa, subetapa);
  },
  autorizarNuevaCarga(id, usuario, correoUsuario, mensaje){
    return REPO_FrontendLegacyV7.autorizarNuevaCarga(id, usuario, correoUsuario, mensaje);
  }
});

// ===== ENDPOINTS DE CONTROLLER/FAÇADE PARA google.script.run =====
function MVC7A_obtenerNuevoCodigo(){ return SOA_FrontendV7Service.siguienteCodigo(); }
function MVC7A_registrarExpediente(datos){ return SOA_FrontendV7Service.registrarExpediente(datos); }
function MVC7A_procesarComplementarios(datos){ return SOA_FrontendV7Service.procesarComplementarios(datos); }
function MVC7A_generarDocumentos(datos){ return SOA_FrontendV7Service.generarDocumentos(datos); }
function MVC7A_obtenerProgresoCopias(){ return SOA_FrontendV7Service.progresoCopias(); }

function MVC7A_buscarAlumnosAdmin(texto){ return SOA_FrontendV7Service.buscarAlumnosAdmin(texto); }
function MVC7A_obtenerDatosAlumnoAdmin(id){ return (typeof BD18_OBTENER_DATOS_ADMIN==='function') ? BD18_OBTENER_DATOS_ADMIN(id) : SOA_FrontendV7Service.obtenerDatosAlumnoAdmin(id); }
function MVC7A_guardarInformacionAdmin(datos){ return AUTOSYNC232_GUARDAR_Y_SINCRONIZAR(datos); }
function MVC7A_listarUsuariosDelegacion(correo){ return SOA_FrontendV7Service.listarUsuariosDelegacion(correo); }

function MVC7A_buscarAlumnoSeguimiento(texto){ return SOA_FrontendV7Service.buscarAlumnoSeguimiento(texto); }
function MVC7A_obtenerSeguimiento(dni){ return SOA_FrontendV7Service.obtenerSeguimiento(dni); }
function MVC7A_guardarSeguimiento(datos){ return SOA_FrontendV7Service.guardarSeguimiento(datos); }

function MVC7A_listarDocumentosEtapa(expediente, etapa){
  var codigo=String(expediente||'').trim().toUpperCase();
  var numero=String(etapa||'').replace(/\D/g,'');
  var key='DOC_ETAPA_V19_'+codigo.replace(/[^A-Z0-9_-]/g,'_')+'_'+numero;
  var cache=CacheService.getScriptCache();
  try{
    var guardado=cache.get(key);
    if(guardado)return JSON.parse(guardado);
  }catch(e){}
  var respuesta=SOA_FrontendV7Service.listarDocumentosEtapa(expediente, etapa);
  try{
    var json=JSON.stringify(respuesta);
    if(respuesta&&respuesta.status&&json.length<95000)cache.put(key,json,45);
  }catch(e){}
  return respuesta;
}

/* V20.3: una sola comunicación navegador-servidor para ambas etapas. */
function MVC7A_listarDocumentosEtapas(expediente){
  var inicio=Date.now();
  if(typeof OPERATIVA21_LISTAR_DOCUMENTOS_INDEXADOS==='function'){
    var indexado=OPERATIVA21_LISTAR_DOCUMENTOS_INDEXADOS(expediente,false);
    indexado.totalMs=Date.now()-inicio;
    indexado.cargaUnificada=true;
    return indexado;
  }
  var etapa1=MVC7A_listarDocumentosEtapa(expediente,1);
  var etapa2=MVC7A_listarDocumentosEtapa(expediente,2);
  return{
    status:!!(etapa1&&etapa1.status)&&!!(etapa2&&etapa2.status),
    expediente:String(expediente||'').trim().toUpperCase(),
    etapa1:etapa1,etapa2:etapa2,
    totalMs:Date.now()-inicio,
    cargaUnificada:true
  };
}
function MVC7A_listarDocumentosExpediente(expediente){ return SOA_FrontendV7Service.listarDocumentosExpediente(expediente); }
function MVC7A_subirDocumentosExpediente(datos){ return SOA_FrontendV7Service.subirDocumentosExpediente(datos); }
function MVC7A_renombrarDocumentoExpediente(expediente, archivoId, nuevoNombre){
  return SOA_FrontendV7Service.renombrarDocumentoExpediente(expediente, archivoId, nuevoNombre);
}
function MVC7A_eliminarDocumentoExpediente(expediente, archivoId){
  return SOA_FrontendV7Service.eliminarDocumentoExpediente(expediente, archivoId);
}

function MVC7A_obtenerChecklist(expediente){ return SOA_FrontendV7Service.obtenerChecklist(expediente); }
function MVC7A_guardarCheck(expediente, numero, marcado, usuario, correo){
  return SOA_FrontendV7Service.guardarCheck(expediente, numero, marcado, usuario, correo);
}
function MVC7A_subirDocumentoChecklist(datos){ return SOA_FrontendV7Service.subirDocumentoChecklist(datos); }
function MVC7A_renombrarDocumentoChecklist(expediente, numero, nuevoNombre){
  return SOA_FrontendV7Service.renombrarDocumentoChecklist(expediente, numero, nuevoNombre);
}
function MVC7A_eliminarDocumentoChecklist(expediente, numero){
  return SOA_FrontendV7Service.eliminarDocumentoChecklist(expediente, numero);
}

function MVC7A_historialArchivosSubetapa(expediente, etapa, subetapa){
  return SOA_FrontendV7Service.historialArchivosSubetapa(expediente, etapa, subetapa);
}
function MVC7A_autorizarNuevaCarga(id, usuario, correoUsuario, mensaje){
  return SOA_FrontendV7Service.autorizarNuevaCarga(id, usuario, correoUsuario, mensaje);
}

function MVC7A_diagnostico(){
  const faltantes = [];
  if (typeof SOA_ExpedienteV2Service === 'undefined') faltantes.push('SOA_ExpedienteV2Service');
  if (typeof SOA_ExpedienteComplementarioV2Service === 'undefined') faltantes.push('SOA_ExpedienteComplementarioV2Service');
  if (typeof SOA_DocumentoV2Service === 'undefined') faltantes.push('SOA_DocumentoV2Service');
  if (typeof SOA_AdministracionV3Service === 'undefined') faltantes.push('SOA_AdministracionV3Service');
  if (typeof SOA_SeguimientoV3Service === 'undefined') faltantes.push('SOA_SeguimientoV3Service');
  if (typeof SOA_DocumentosV4Service === 'undefined') faltantes.push('SOA_DocumentosV4Service');
  if (typeof SOA_ChecklistV4Service === 'undefined') faltantes.push('SOA_ChecklistV4Service');
  if (typeof SOA_DriveV4Service === 'undefined') faltantes.push('SOA_DriveV4Service');
  return {
    status: faltantes.length === 0,
    fase: '7.2',
    arquitectura: 'MVC + SOA',
    dominio: 'Frontend Dashboard Facade',
    faltantes: faltantes
  };
}
