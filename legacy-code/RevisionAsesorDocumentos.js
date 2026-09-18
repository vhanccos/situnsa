/**
 * FASE 13 - ADAPTADOR DE COMPATIBILIDAD
 * La implementacion real vive en REPO_RevisionAsesorV13.
 */
function asegurarColumnasRevisionAsesorV29(){ return REPO_RevisionAsesorV13.asegurarColumnas(); }
function obtenerRevisionesAsesorExpedienteV29(expediente){ return REPO_RevisionAsesorV13.revisiones(expediente); }
function TT_documentosRevisionAsesorV29(token,idTaller,expediente){ return REPO_RevisionAsesorV13.documentos(token,idTaller,expediente); }
function TT_validarDocumentoAsesorV29(token,idTaller,expediente,etapa){ return REPO_RevisionAsesorV13.validar(token,idTaller,expediente,etapa); }
function TT_habilitarNuevaCargaAsesorV29(token,idTaller,expediente,etapa,mensaje){ return REPO_RevisionAsesorV13.nuevaCarga(token,idTaller,expediente,etapa,mensaje); }
function TT_mensajeAsesorDocumentoV29(token,idTaller,expediente,etapa,mensaje){ return REPO_RevisionAsesorV13.mensaje(token,idTaller,expediente,etapa,mensaje); }
