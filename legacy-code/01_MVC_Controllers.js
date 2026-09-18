/**
 * ==============================================================
 * CAPA MVC - CONTROLADORES
 * ==============================================================
 * Un controlador recibe solicitudes de la Vista y delega TODA la
 * logica de negocio a los servicios SOA. No accede directamente a
 * SpreadsheetApp ni DriveApp.
 */

const MVC_AuthController = Object.freeze({
  login(usuario, password) {
    return SOA_AuthService.login(usuario, password);
  }
});

const MVC_ExpedienteController = Object.freeze({
  crear(datos) {
    return SOA_ExpedienteService.crear(datos);
  },
  siguienteCodigo() {
    return SOA_ExpedienteService.siguienteCodigo();
  },
  procesarComplementarios(datos) {
    return SOA_ExpedienteService.procesarComplementarios(datos);
  }
});

const MVC_AdminController = Object.freeze({
  buscarAlumnos(texto) {
    return SOA_AdminService.buscarAlumnos(texto);
  },
  obtenerAlumno(dni) {
    return SOA_AdminService.obtenerAlumno(dni);
  },
  guardarAlumno(datos) {
    return SOA_AdminService.guardarAlumno(datos);
  }
});

const MVC_SeguimientoController = Object.freeze({
  obtener(dni) {
    return SOA_SeguimientoService.obtener(dni);
  },
  procesoAlumno(dni) {
    return SOA_SeguimientoService.procesoAlumno(dni);
  }
});

const MVC_PortalAlumnoController = Object.freeze({
  obtener(dni) {
    return SOA_AlumnoService.obtenerPortal(dni);
  }
});

/* ENDPOINTS PUBLICOS PARA google.script.run
   Se usan nombres nuevos para no romper el codigo legado. */
function MVC_validarLogin(usuario, password) {
  return MVC_AuthController.login(usuario, password);
}
function MVC_registrarExpediente(datos) {
  return MVC_ExpedienteController.crear(datos);
}
function MVC_obtenerNuevoCodigo() {
  return MVC_ExpedienteController.siguienteCodigo();
}
function MVC_procesarRegistrosComplementarios(datos) {
  return MVC_ExpedienteController.procesarComplementarios(datos);
}
function MVC_buscarAlumnosAdmin(texto) {
  return MVC_AdminController.buscarAlumnos(texto);
}
function MVC_obtenerDatosAlumnoAdmin(dni) {
  return MVC_AdminController.obtenerAlumno(dni);
}
function MVC_guardarInformacionAdmin(datos) {
  return MVC_AdminController.guardarAlumno(datos);
}
function MVC_obtenerSeguimiento(dni) {
  return MVC_SeguimientoController.obtener(dni);
}
function MVC_obtenerProcesoAlumno(dni) {
  return MVC_SeguimientoController.procesoAlumno(dni);
}
function MVC_obtenerPortalAlumno(dni) {
  return MVC_PortalAlumnoController.obtener(dni);
}
