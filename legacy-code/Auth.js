/* =========================================================
   FASE 14 - AUTH.GS
   ADAPTADOR DE COMPATIBILIDAD
   La implementación principal está en REPO_AuthUsuariosV6.
========================================================= */

const AUTH_SHEET_USUARIOS = '1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs';

function AUTH_getAppUrl_(){ return REPO_AuthUsuariosV6.appUrl(); }
function AUTH_normalizarUsuario_(valor){ return String(valor || '').trim(); }
function AUTH_normalizarPassword_(valor){ return String(valor || '').trim(); }
function validarLogin(usuario, password){ return REPO_AuthUsuariosV6.autenticar(usuario, password); }
function validarUsuarioAdmin(usuario, password){ return REPO_AuthUsuariosV6.autenticarAdmin(String(usuario || '').trim(), String(password || '').trim()); }
function validarUsuarioInvitado(usuario, password){ return REPO_AuthUsuariosV6.autenticarInvitado(String(usuario || '').trim(), String(password || '').trim()); }
function obtenerUsuarioAdminPorUsuario(usuario){ return REPO_AuthUsuariosV6.buscarAdmin(usuario); }
