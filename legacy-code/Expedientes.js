/**
 * ==============================================================
 * EXPEDIENTES - ADAPTADOR DE COMPATIBILIDAD
 * FASE 10 MVC + SOA
 * ==============================================================
 * Este archivo YA NO contiene la implementación principal del módulo.
 * La persistencia vive en REPO_ExpedienteV2 y las reglas/operaciones en
 * DOMAIN_Expediente + SOA_ExpedienteV2Service + Controller V2.
 *
 * Se conservan estos nombres globales porque otros módulos legacy aún los
 * utilizan. Podrán retirarse gradualmente en fases posteriores.
 * ==============================================================
 */

function obtenerSheetExpedientes(){
  return REPO_ExpedienteV2.sheet();
}

function normalizarEncabezado(valor){
  return REPO_ExpedienteV2.normalizarEncabezado(valor);
}

function obtenerColumnas(sheet){
  return REPO_ExpedienteV2.mapearColumnas(sheet || REPO_ExpedienteV2.sheet());
}

function validarColumnasExpedientes(columnas){
  return REPO_ExpedienteV2.validarColumnas(columnas);
}

function generarCodigoExpediente(){
  return REPO_ExpedienteV2.siguienteCodigo();
}

function obtenerNuevoCodigo(){
  return MVC_ExpedienteV2Controller.siguienteCodigo();
}

function formatearTitulo(texto){
  return DOMAIN_Expediente.titulo(texto);
}

function formatearPrograma(texto){
  return DOMAIN_Expediente.programa(texto);
}

function obtenerDnisRegistrados(){
  return REPO_ExpedienteV2.dnisRegistrados();
}

function dniExiste(dni){
  return REPO_ExpedienteV2.existeDni(dni);
}

function colocarValorFila(fila, columnas, nombreColumna, valor){
  return REPO_ExpedienteV2.colocarValorFila(fila, columnas, nombreColumna, valor);
}

function normalizarParticipante(participante){
  return DOMAIN_Expediente.normalizarParticipante(participante);
}

function registrarExpediente(datos){
  return MVC_ExpedienteV2Controller.crear(datos);
}

function procesarRegistrosComplementarios(datos){
  return MVC_ExpedienteV2Controller.complementarios(datos);
}

function iniciarRegistrosComplementarios(datos){
  return MVC_ExpedienteV2Controller.complementarios(datos);
}

function iniciarGeneracionExpediente(datos){
  return MVC_ExpedienteV2Controller.generarDocumentos(datos);
}

function LEGACY10_estadoExpedientes(){
  return {
    status: true,
    fase: 10,
    archivo: 'Expedientes.gs',
    modo: 'ADAPTADOR_COMPATIBILIDAD',
    implementacionPrincipal: '06_ExpedienteRepositoryV2.gs + 07_ExpedienteServicesV2.gs + 08_ExpedienteControllerV2.gs'
  };
}
