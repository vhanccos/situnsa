/* FASE 12 - ADAPTADOR DE COMPATIBILIDAD HISTORIAL */
const SHEET_HISTORIAL_EXPEDIENTES = '1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs';
function obtenerSheetHistorial(){ return REPO_HistorialV12.sheet(); }
function generarIdHistorial(){ return REPO_HistorialV12.siguienteId(); }
function registrarHistorialExpediente(datos){ return REPO_HistorialV12.registrar(datos); }
function mapearFilaHistorial_(fila){ return REPO_HistorialV12.mapear(fila); }
function historialEsVisible_(fila,soloPublico){ return REPO_HistorialV12.visible(fila,soloPublico); }
function obtenerHistorialPorDni(dni,soloPublico){ return REPO_HistorialV12.porDni(dni,soloPublico); }
function obtenerHistorialPorExpediente(expediente,soloPublico){ return REPO_HistorialV12.porExpediente(expediente,soloPublico); }
function obtenerHistorialExpedienteAdmin(identificador,soloPublico){ return REPO_HistorialV12.admin(identificador,soloPublico); }
function obtenerHistorialAlumnoPorCorreo(correo){ return REPO_HistorialV12.porCorreo(correo); }
