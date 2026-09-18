/**
 * ==============================================================
 * CAPA SOA - SERVICIOS DE NEGOCIO
 * ==============================================================
 * Cada servicio representa una capacidad del negocio.
 * Durante la migracion llama a los repositorios/adaptadores que
 * encapsulan el codigo legado. La meta es ir trasladando la logica
 * desde los archivos antiguos hacia estos servicios sin detener el
 * sistema.
 */

const SOA_AuthService = Object.freeze({
  login(usuario, password) {
    try {
      return REPO_AuthRepository.validar(usuario, password);
    } catch (e) {
      return APP_Response.error(e, 'No se pudo autenticar al usuario.');
    }
  }
});

const SOA_ExpedienteService = Object.freeze({
  crear(datos) { return SOA_ExpedienteV2Service.crear(datos); },
  siguienteCodigo() { return SOA_ExpedienteV2Service.siguienteCodigo(); },
  procesarComplementarios(datos) { return SOA_ExpedienteComplementarioV2Service.procesar(datos); }
});

const SOA_AdminService = Object.freeze({
  buscarAlumnos(texto) {
    return REPO_AdminRepository.buscarAlumnos(texto);
  },
  obtenerAlumno(dni) {
    return REPO_AdminRepository.obtenerAlumno(dni);
  },
  guardarAlumno(datos) {
    return REPO_AdminRepository.guardarAlumno(datos);
  }
});

const SOA_SeguimientoService = Object.freeze({
  obtener(dni) {
    return REPO_SeguimientoRepository.obtener(dni);
  },
  procesoAlumno(dni) {
    return REPO_SeguimientoRepository.procesoAlumno(dni);
  }
});

const SOA_AlumnoService = Object.freeze({
  obtenerPortal(dni) {
    return REPO_AlumnoRepository.obtenerPortal(dni);
  }
});

const SOA_DocumentoService = Object.freeze({
  listarPorExpediente(expediente) {
    if (typeof listarDocumentosExpedienteV22 !== 'function') {
      throw new Error('Servicio documental no disponible.');
    }
    return listarDocumentosExpedienteV22(expediente);
  }
});

const SOA_HistorialService = Object.freeze({
  porExpediente(expediente) {
    if (typeof obtenerHistorialPorExpediente !== 'function') {
      throw new Error('Servicio de historial no disponible.');
    }
    return obtenerHistorialPorExpediente(expediente);
  }
});
