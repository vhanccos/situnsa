/** MVC CONTROLLER V2 - EXPEDIENTES */
const MVC_ExpedienteV2Controller = Object.freeze({
  crear(datos) { return SOA_ExpedienteV2Service.crear(datos); },
  siguienteCodigo() { return SOA_ExpedienteV2Service.siguienteCodigo(); },
  complementarios(datos) { return SOA_ExpedienteComplementarioV2Service.procesar(datos); },
  generarDocumentos(datos) { return SOA_DocumentoV2Service.generar(datos); }
});

// Endpoints nuevos opcionales para migrar el frontend gradualmente.
function MVC2_registrarExpediente(datos){ return MVC_ExpedienteV2Controller.crear(datos); }
function MVC2_obtenerNuevoCodigo(){ return MVC_ExpedienteV2Controller.siguienteCodigo(); }
function MVC2_procesarComplementarios(datos){ return MVC_ExpedienteV2Controller.complementarios(datos); }
function MVC2_generarDocumentos(datos){ return MVC_ExpedienteV2Controller.generarDocumentos(datos); }
