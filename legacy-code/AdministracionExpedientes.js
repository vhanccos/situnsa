/* =========================================================
   ADMINISTRACIÓN DE EXPEDIENTES - ADAPTADOR FASE 11
   La implementación principal vive en:
   09_AdminSeguimientoRepositoriesV3.gs
   10_AdminSeguimientoServicesV3.gs
========================================================= */
function obtenerHojaExpedientesAdmin(){ return REPO_AdministracionV3.sheetExpedientes(); }
function encabezadosAdmin(hoja){ return REPO11_mapearColumnas_(hoja).headers; }
function normalizarTextoBusquedaAdminV2_(texto){ return REPO_AdministracionV3.normalizar(texto); }
function buscarFilaExpedienteAdmin(data, encabezados, identificador){
  const buscado=String(identificador==null?'':identificador).trim().toUpperCase();
  const indices=['DNI','DNI02','N° DE TRÁMITE'].map(n=>encabezados.indexOf(n));
  for(let i=1;i<data.length;i++) for(let j=0;j<indices.length;j++){ const c=indices[j]; if(c>=0&&String(data[i][c]||'').trim().toUpperCase()===buscado) return i; }
  return -1;
}
function obtenerIndiceBusquedaAlumnosAdminV2_(){ return REPO_AdministracionV3.buscarPersonas('',30); }
function invalidarCacheBusquedaAlumnosAdminV2(){ return true; }
function buscarAlumnosAdminV2(texto){ return SOA_AdministracionV3Service.buscarAdmin(texto); }
function buscarAlumnos(texto){ return REPO_AdministracionV3.buscarPersonas(texto,30).map(function(x){ return {nombre:x.nombre,dni:x.dni,dniExpediente:x.dni,expediente:x.expediente,grupo:x.grupo,participante:x.participante}; }); }
function buscarExpedientesAdminV2(texto){ return SOA_AdministracionV3Service.buscarExpedientes(texto); }
function obtenerDatosAlumnoAdmin(identificador){ return SOA_AdministracionV3Service.obtener(identificador); }
function guardarInformacionAdmin(datos){ return SOA_AdministracionV3Service.guardar(datos); }
function obtenerEstadoExpedienteSubetapasV2(expediente){ return SOA_SeguimientoV3Service.obtenerEstadoLegacyShape(expediente); }
function obtenerEstadoExpedienteAdmin(expediente){ return obtenerEstadoExpedienteSubetapasV2(expediente); }
function listarUsuariosDelegacionV2(correoActual){ const r=SOA_AdministracionV3Service.usuariosDelegables(correoActual); return r&&r.status?r.data:[]; }
