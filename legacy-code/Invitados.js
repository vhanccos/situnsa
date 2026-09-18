/* =========================================================
   FASE 14 - INVITADOS.GS
   ADAPTADOR DE COMPATIBILIDAD
   La implementación principal está en REPO_AuthUsuariosV6.
========================================================= */

const SHEET_INVITADOS = '1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs';

function obtenerSheetInvitados(){ return REPO_AuthUsuariosV6.hojaInvitados(); }
function normalizarInvitado_(datos){
  datos = datos || {};
  return {
    dni:String(datos.dni || '').trim(), cui:String(datos.cui || '').trim(), nombre:String(datos.nombre || '').trim(),
    correo:String(datos.correo || '').trim().toLowerCase(), expediente:String(datos.expediente || '').trim().toUpperCase(),
    programa:String(datos.programa || '').trim(), estado:String(datos.estado || 'ACTIVO').trim().toUpperCase()
  };
}
function obtenerInvitadoPorDni(dni){ return REPO_AuthUsuariosV6.buscarInvitado(dni); }
function registrarInvitado(datos){ return REPO_AuthUsuariosV6.registrarInvitado(datos); }
function cambiarEstadoInvitado(dni, nuevoEstado){ return REPO_AuthUsuariosV6.cambiarEstadoInvitado(dni, nuevoEstado); }
function obtenerInvitadosPorExpediente(expediente){ return REPO_AuthUsuariosV6.invitadosPorExpediente(expediente); }

