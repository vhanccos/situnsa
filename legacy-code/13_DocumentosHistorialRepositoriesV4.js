/**
 * FASE 12 - REPOSITORIES DOCUMENTALES CONSOLIDADOS
 * Documentos + Drive + Checklist + Historial.
 *
 * Regla:
 * - Historial: acceso directo Repository -> Sheets.
 * - Operaciones físicas Drive/documentos/checklist/subetapas: pasan por un único
 *   ADAPTER_DocumentalLegacyV12 mientras se conserva compatibilidad con archivos existentes.
 */

const REPO_DocumentosV4 = {
  listarPorExpediente: function(expediente) { return ADAPTER_DocumentalLegacyV12.listarDocumentosExpediente(expediente); },
  listarPorEtapa: function(expediente, etapa) { return ADAPTER_DocumentalLegacyV12.listarDocumentosEtapa(expediente, etapa); },
  subirExpediente: function(datos) { return ADAPTER_DocumentalLegacyV12.subirDocumentosExpediente(datos); },
  renombrarExpediente: function(datos) { return ADAPTER_DocumentalLegacyV12.renombrarDocumentoExpediente(datos); },
  eliminarExpediente: function(datos) { return ADAPTER_DocumentalLegacyV12.eliminarDocumentoExpediente(datos); },
  subirSubetapa: function(datos) { return ADAPTER_DocumentalLegacyV12.subirArchivoSubetapa(datos); },
  historialSubetapa: function(expediente, etapa, subetapa) { return ADAPTER_DocumentalLegacyV12.historialArchivosSubetapa(expediente, etapa, subetapa); },
  autorizarNuevaCarga: function(id, usuario, correoUsuario, mensaje) { return ADAPTER_DocumentalLegacyV12.autorizarNuevaCarga(id, usuario, correoUsuario, mensaje); }
};

const REPO_DriveV4 = {
  obtenerUrlCarpeta: function(expediente) { return ADAPTER_DocumentalLegacyV12.obtenerUrlCarpeta(expediente); },
  obtenerOCrearCarpeta: function(expediente) { return ADAPTER_DocumentalLegacyV12.obtenerOCrearCarpeta(expediente); },
  obtenerProgresoCopias: function() { return ADAPTER_DocumentalLegacyV12.obtenerProgresoCopias(); },
  iniciarCopias: function(datos) { return ADAPTER_DocumentalLegacyV12.iniciarCopias(datos); }
};

const REPO_ChecklistV4 = {
  asegurar: function(expediente) { return ADAPTER_DocumentalLegacyV12.asegurarChecklist(expediente); },
  obtener: function(expediente) { return ADAPTER_DocumentalLegacyV12.obtenerChecklist(expediente); },
  guardarCheck: function(expediente, clave, valor, usuario, correo) { return ADAPTER_DocumentalLegacyV12.guardarCheck(expediente, clave, valor, usuario, correo); },
  subirDocumento: function(datos) { return ADAPTER_DocumentalLegacyV12.subirDocumentoChecklist(datos); },
  eliminarDocumento: function(datos) { return ADAPTER_DocumentalLegacyV12.eliminarDocumentoChecklist(datos); },
  renombrarDocumento: function(datos) { return ADAPTER_DocumentalLegacyV12.renombrarDocumentoChecklist(datos); },
  validarCompleto: function(expediente) { return ADAPTER_DocumentalLegacyV12.validarChecklist(expediente); }
};

const REPO_HistorialV4 = {
  registrar: function(datos) { return REPO_HistorialV12.registrar(datos); },
  porDni: function(dni, soloPublico) { return REPO_HistorialV12.porDni(dni, soloPublico); },
  porExpediente: function(expediente, soloPublico) { return REPO_HistorialV12.porExpediente(expediente, soloPublico); },
  admin: function(expediente) { return REPO_HistorialV12.admin(expediente); },
  porCorreo: function(correo) { return REPO_HistorialV12.porCorreo(correo); }
};
