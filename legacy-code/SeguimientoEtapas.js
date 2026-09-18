/* =========================================================
   SEGUIMIENTO ETAPAS - ADAPTADOR FASE 11
   La implementación principal de lectura/escritura legacy vive en
   REPO_SeguimientoV3 / SOA_SeguimientoV3Service.
========================================================= */
const SHEET_SEGUIMIENTO_LEGACY = '1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs';
function obtenerSheetSeguimiento(){ return REPO_SeguimientoV3.sheetLegacy(); }
function obtenerColumnasSeguimiento(sheet){ return REPO11_mapearColumnas_(sheet||REPO_SeguimientoV3.sheetLegacy()).columnas; }
function buscarAlumnoSeguimiento(texto){ return SOA_SeguimientoV3Service.buscarLegacyShape(texto); }
function guardarSeguimiento(datos){ return SOA_SeguimientoV3Service.guardarLegacy(datos); }
function obtenerSeguimiento(dni){ return SOA_SeguimientoV3Service.obtenerLegacyShape(dni); }
function crearSeguimientoInicial(datos){
  datos=datos||{};
  return {status:true,legacy:true,expediente:String(datos.expediente||'').trim().toUpperCase(),message:'Seguimiento general atendido por SEGUIMIENTO_SUBETAPAS.'};
}
function obtenerSeguimientoDni(dni){
  const proceso=SOA_SeguimientoV3Service.obtenerProcesoPorDniLegacyShape(dni);
  return proceso&&proceso.length?{dni:String(dni||''),proceso:proceso}:null;
}
function finalizarEtapa(expediente, etapa, usuario){ return SOA_WorkflowV11Service.finalizarEtapa(expediente, etapa, usuario); }
function diagnosticarSeguimientoAdmin(expediente){
  return {status:true,fase:11,expediente:String(expediente||'').trim().toUpperCase(),proceso:SOA_SeguimientoV3Service.obtenerProcesoPorExpediente(expediente)};
}
