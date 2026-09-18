/** MVC CONTROLLERS V3 - ADMINISTRACION + SEGUIMIENTO */

const MVC_AdministracionV3Controller = Object.freeze({
  buscar(texto){ return SOA_AdministracionV3Service.buscar(texto); },
  obtener(identificador){ return SOA_AdministracionV3Service.obtener(identificador); },
  guardar(datos){ return SOA_AdministracionV3Service.guardar(datos); },
  usuariosDelegables(correo){ return SOA_AdministracionV3Service.usuariosDelegables(correo); }
});

const MVC_SeguimientoV3Controller = Object.freeze({
  buscar(texto){ return SOA_SeguimientoV3Service.buscar(texto); },
  obtenerLegacy(dni){ return SOA_SeguimientoV3Service.obtenerLegacy(dni); },
  guardarLegacy(datos){ return SOA_SeguimientoV3Service.guardarLegacy(datos); },
  procesoExpediente(expediente){ return SOA_SeguimientoV3Service.obtenerProcesoPorExpediente(expediente); },
  procesoDni(dni){ return SOA_SeguimientoV3Service.obtenerProcesoPorDni(dni); },
  iniciarSubetapa(datos){ return SOA_SeguimientoV3Service.iniciarSubetapa(datos); },
  finalizarSubetapa(datos){ return SOA_SeguimientoV3Service.finalizarSubetapa(datos); },
  delegar(datos){ return SOA_SeguimientoV3Service.delegar(datos); },
  mensaje(datos){ return SOA_SeguimientoV3Service.mensaje(datos); }
});

// Endpoints FASE 3. Pueden usarse desde google.script.run sin romper endpoints antiguos.
function MVC3_buscarAlumnosAdmin(texto){ return MVC_AdministracionV3Controller.buscar(texto); }
function MVC3_obtenerDatosAlumnoAdmin(identificador){ return MVC_AdministracionV3Controller.obtener(identificador); }
function MVC3_guardarInformacionAdmin(datos){ return MVC_AdministracionV3Controller.guardar(datos); }
function MVC3_listarUsuariosDelegacion(correo){ return MVC_AdministracionV3Controller.usuariosDelegables(correo); }

function MVC3_buscarAlumnoSeguimiento(texto){ return MVC_SeguimientoV3Controller.buscar(texto); }
function MVC3_obtenerSeguimiento(dni){ return MVC_SeguimientoV3Controller.obtenerLegacy(dni); }
function MVC3_guardarSeguimiento(datos){ return MVC_SeguimientoV3Controller.guardarLegacy(datos); }
function MVC3_obtenerProcesoExpediente(expediente){ return MVC_SeguimientoV3Controller.procesoExpediente(expediente); }
function MVC3_obtenerProcesoAlumno(dni){ return MVC_SeguimientoV3Controller.procesoDni(dni); }
function MVC3_iniciarSubetapa(datos){ return MVC_SeguimientoV3Controller.iniciarSubetapa(datos); }
function MVC3_finalizarSubetapa(datos){ return MVC_SeguimientoV3Controller.finalizarSubetapa(datos); }
function MVC3_delegarSubetapa(datos){ return MVC_SeguimientoV3Controller.delegar(datos); }
function MVC3_guardarMensajeSubetapa(datos){ return MVC_SeguimientoV3Controller.mensaje(datos); }
