/**
 * FASE 4 - MVC CONTROLLERS / ENDPOINTS
 */

function V4_respuesta_(fn) {
  try {
    return { ok: true, data: fn(), fase: 4 };
  } catch (e) {
    console.error('FASE 4:', e && e.stack ? e.stack : e);
    return { ok: false, mensaje: e && e.message ? e.message : String(e), fase: 4 };
  }
}

const MVC_DocumentosV4Controller = {
  listarExpediente: function(expediente) { return V4_respuesta_(function(){ return SOA_DocumentosV4Service.listarExpediente(expediente); }); },
  listarEtapa: function(expediente, etapa) { return V4_respuesta_(function(){ return SOA_DocumentosV4Service.listarEtapa(expediente, etapa); }); },
  subirExpediente: function(datos) { return V4_respuesta_(function(){ return SOA_DocumentosV4Service.subirExpediente(datos); }); },
  renombrarExpediente: function(datos) { return V4_respuesta_(function(){ return SOA_DocumentosV4Service.renombrarExpediente(datos); }); },
  eliminarExpediente: function(datos) { return V4_respuesta_(function(){ return SOA_DocumentosV4Service.eliminarExpediente(datos); }); },
  subirSubetapa: function(datos) { return V4_respuesta_(function(){ return SOA_DocumentosV4Service.subirSubetapa(datos); }); },
  historialSubetapa: function(expediente, etapa, subetapa) { return V4_respuesta_(function(){ return SOA_DocumentosV4Service.historialSubetapa(expediente, etapa, subetapa); }); },
  autorizarNuevaCarga: function(id, usuario, correoUsuario, mensaje) { return V4_respuesta_(function(){ return SOA_DocumentosV4Service.autorizarNuevaCarga(id, usuario, correoUsuario, mensaje); }); }
};

const MVC_DriveV4Controller = {
  obtenerUrlCarpeta: function(expediente) { return V4_respuesta_(function(){ return SOA_DriveV4Service.obtenerUrlCarpeta(expediente); }); },
  obtenerOCrearCarpeta: function(expediente) { return V4_respuesta_(function(){ return SOA_DriveV4Service.obtenerOCrearCarpeta(expediente); }); },
  obtenerProgresoCopias: function() { return V4_respuesta_(function(){ return SOA_DriveV4Service.obtenerProgresoCopias(); }); },
  iniciarCopias: function(datos) { return V4_respuesta_(function(){ return SOA_DriveV4Service.iniciarCopias(datos); }); }
};

const MVC_ChecklistV4Controller = {
  asegurar: function(expediente) { return V4_respuesta_(function(){ return SOA_ChecklistV4Service.asegurar(expediente); }); },
  obtener: function(expediente) { return V4_respuesta_(function(){ return SOA_ChecklistV4Service.obtener(expediente); }); },
  guardarCheck: function(expediente, clave, valor, usuario, correo) { return V4_respuesta_(function(){ return SOA_ChecklistV4Service.guardarCheck(expediente, clave, valor, usuario, correo); }); },
  subirDocumento: function(datos) { return V4_respuesta_(function(){ return SOA_ChecklistV4Service.subirDocumento(datos); }); },
  eliminarDocumento: function(datos) { return V4_respuesta_(function(){ return SOA_ChecklistV4Service.eliminarDocumento(datos); }); },
  renombrarDocumento: function(datos) { return V4_respuesta_(function(){ return SOA_ChecklistV4Service.renombrarDocumento(datos); }); },
  validarCompleto: function(expediente) { return V4_respuesta_(function(){ return SOA_ChecklistV4Service.validarCompleto(expediente); }); }
};

const MVC_HistorialV4Controller = {
  registrar: function(datos) { return V4_respuesta_(function(){ return SOA_HistorialV4Service.registrar(datos); }); },
  porDni: function(dni, soloPublico) { return V4_respuesta_(function(){ return SOA_HistorialV4Service.porDni(dni, soloPublico); }); },
  porExpediente: function(expediente, soloPublico) { return V4_respuesta_(function(){ return SOA_HistorialV4Service.porExpediente(expediente, soloPublico); }); },
  admin: function(expediente) { return V4_respuesta_(function(){ return SOA_HistorialV4Service.admin(expediente); }); },
  porCorreo: function(correo) { return V4_respuesta_(function(){ return SOA_HistorialV4Service.porCorreo(correo); }); }
};

// Endpoints que podrán ser llamados desde google.script.run
function MVC4_listarDocumentosExpediente(expediente){ return MVC_DocumentosV4Controller.listarExpediente(expediente); }
function MVC4_listarDocumentosEtapa(expediente, etapa){ return MVC_DocumentosV4Controller.listarEtapa(expediente, etapa); }
function MVC4_subirDocumentosExpediente(datos){ return MVC_DocumentosV4Controller.subirExpediente(datos); }
function MVC4_renombrarDocumentoExpediente(datos){ return MVC_DocumentosV4Controller.renombrarExpediente(datos); }
function MVC4_eliminarDocumentoExpediente(datos){ return MVC_DocumentosV4Controller.eliminarExpediente(datos); }
function MVC4_subirArchivoSubetapa(datos){ return MVC_DocumentosV4Controller.subirSubetapa(datos); }
function MVC4_historialArchivosSubetapa(expediente, etapa, subetapa){ return MVC_DocumentosV4Controller.historialSubetapa(expediente, etapa, subetapa); }
function MVC4_autorizarNuevaCarga(id, usuario, correoUsuario, mensaje){ return MVC_DocumentosV4Controller.autorizarNuevaCarga(id, usuario, correoUsuario, mensaje); }

function MVC4_obtenerUrlCarpetaExpediente(expediente){ return MVC_DriveV4Controller.obtenerUrlCarpeta(expediente); }
function MVC4_obtenerProgresoCopias(){ return MVC_DriveV4Controller.obtenerProgresoCopias(); }
function MVC4_iniciarCopias(datos){ return MVC_DriveV4Controller.iniciarCopias(datos); }

function MVC4_obtenerChecklist(expediente){ return MVC_ChecklistV4Controller.obtener(expediente); }
function MVC4_guardarCheck(expediente, clave, valor, usuario, correo){ return MVC_ChecklistV4Controller.guardarCheck(expediente, clave, valor, usuario, correo); }
function MVC4_subirDocumentoChecklist(datos){ return MVC_ChecklistV4Controller.subirDocumento(datos); }
function MVC4_eliminarDocumentoChecklist(datos){ return MVC_ChecklistV4Controller.eliminarDocumento(datos); }
function MVC4_renombrarDocumentoChecklist(datos){ return MVC_ChecklistV4Controller.renombrarDocumento(datos); }
function MVC4_validarChecklistCompleto(expediente){ return MVC_ChecklistV4Controller.validarCompleto(expediente); }

function MVC4_registrarHistorial(datos){ return MVC_HistorialV4Controller.registrar(datos); }
function MVC4_historialPorDni(dni, soloPublico){ return MVC_HistorialV4Controller.porDni(dni, soloPublico); }
function MVC4_historialPorExpediente(expediente, soloPublico){ return MVC_HistorialV4Controller.porExpediente(expediente, soloPublico); }
function MVC4_historialAdmin(expediente){ return MVC_HistorialV4Controller.admin(expediente); }
