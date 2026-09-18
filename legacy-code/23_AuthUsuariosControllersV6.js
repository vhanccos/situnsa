/**
 * ==============================================================
 * FASE 6 - CONTROLADORES MVC
 * ==============================================================
 * Los HTML deben migrar progresivamente hacia estos endpoints.
 */

const MVC_AuthUsuariosV6Controller = Object.freeze({

  login(usuario, password) {
    return SOA_AuthUsuariosV6Service.login(usuario, password);
  },

  validarSesion(token) {
    return SOA_SesionV6Service.obtener(token);
  },

  cerrarSesion(token) {
    return SOA_SesionV6Service.cerrar(token);
  },

  autorizar(token, permiso) {
    return SOA_SesionV6Service.autorizar(token, permiso);
  },

  perfil(usuario, rol) {
    return SOA_AuthUsuariosV6Service.perfil(usuario, rol);
  },

  listarAdmins() {
    return SOA_AuthUsuariosV6Service.listarUsuariosAdministrativos();
  },

  listarInvitados() {
    return SOA_AuthUsuariosV6Service.listarInvitados();
  },

  registrarInvitado(datos) {
    return SOA_AuthUsuariosV6Service.registrarInvitado(datos);
  },

  cambiarEstadoInvitado(dni, estado) {
    return SOA_AuthUsuariosV6Service.cambiarEstadoInvitado(dni, estado);
  }
});


/* ==============================================================
 * ENDPOINTS PUBLICOS - google.script.run
 * ==============================================================
 */

function MVC6_iniciarSesion(usuario, password) {
  return MVC_AuthUsuariosV6Controller.login(usuario, password);
}

function MVC6_validarSesion(token) {
  return MVC_AuthUsuariosV6Controller.validarSesion(token);
}

function MVC6_cerrarSesion(token) {
  return MVC_AuthUsuariosV6Controller.cerrarSesion(token);
}

function MVC6_autorizar(token, permiso) {
  return MVC_AuthUsuariosV6Controller.autorizar(token, permiso);
}

function MVC6_obtenerPerfil(usuario, rol) {
  return MVC_AuthUsuariosV6Controller.perfil(usuario, rol);
}

function MVC6_listarUsuariosAdministrativos() {
  return MVC_AuthUsuariosV6Controller.listarAdmins();
}

function MVC6_listarInvitados() {
  return MVC_AuthUsuariosV6Controller.listarInvitados();
}

function MVC6_registrarInvitado(datos) {
  return MVC_AuthUsuariosV6Controller.registrarInvitado(datos);
}

function MVC6_cambiarEstadoInvitado(dni, estado) {
  return MVC_AuthUsuariosV6Controller.cambiarEstadoInvitado(dni, estado);
}
