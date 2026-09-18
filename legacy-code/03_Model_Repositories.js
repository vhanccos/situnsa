/**
 * ==============================================================
 * MODELO / REPOSITORIES
 * ==============================================================
 * En la fase de transicion estos repositorios son ADAPTADORES del
 * codigo actual. Asi, los controladores ya no dependen directamente
 * de Sheets/Drive y podemos migrar cada implementacion gradualmente.
 */

const REPO_AuthRepository = Object.freeze({
  validar(usuario, password) {
    return REPO_AuthUsuariosV6.autenticar(usuario, password);
  }
});

const REPO_ExpedienteRepository = Object.freeze({
  // Fachada compatible. La implementación real de persistencia está en REPO_ExpedienteV2.
  crear(solicitud, codigo) { return REPO_ExpedienteV2.insertar(solicitud, codigo); },
  siguienteCodigo() { return REPO_ExpedienteV2.siguienteCodigo(); },
  dnisRegistrados() { return REPO_ExpedienteV2.dnisRegistrados(); }
});

const REPO_AdminRepository = Object.freeze({
  buscarAlumnos(texto) {
    if (typeof buscarAlumnosAdminV2 === 'function') return buscarAlumnosAdminV2(texto);
    if (typeof buscarAlumnos === 'function') return buscarAlumnos(texto);
    throw new Error('Busqueda administrativa no disponible.');
  },
  obtenerAlumno(dni) {
    if (typeof obtenerDatosAlumnoAdmin !== 'function') throw new Error('obtenerDatosAlumnoAdmin() no existe.');
    return obtenerDatosAlumnoAdmin(dni);
  },
  guardarAlumno(datos) {
    if (typeof guardarInformacionAdmin !== 'function') throw new Error('guardarInformacionAdmin() no existe.');
    return guardarInformacionAdmin(datos);
  }
});

const REPO_SeguimientoRepository = Object.freeze({
  obtener(dni) {
    if (typeof obtenerSeguimiento !== 'function') throw new Error('obtenerSeguimiento() no existe.');
    return obtenerSeguimiento(dni);
  },
  procesoAlumno(dni) {
    if (typeof obtenerProcesoAlumno !== 'function') throw new Error('obtenerProcesoAlumno() no existe.');
    return obtenerProcesoAlumno(dni);
  }
});

const REPO_AlumnoRepository = Object.freeze({
  obtenerPortal(dni) {
    if (typeof obtenerPortalAlumno !== 'function') throw new Error('obtenerPortalAlumno() no existe.');
    return obtenerPortalAlumno(dni);
  }
});
