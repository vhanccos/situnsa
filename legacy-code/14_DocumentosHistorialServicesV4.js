/**
 * FASE 4 - SOA SERVICES
 * Servicios de negocio para documentos, Drive, checklist e historial.
 */

function V4_exigirTexto_(valor, nombre) {
  var v = String(valor == null ? '' : valor).trim();
  if (!v) throw new Error(nombre + ' es obligatorio.');
  return v;
}

const SOA_DocumentosV4Service = {
  listarExpediente: function(expediente) {
    expediente = V4_exigirTexto_(expediente, 'Expediente');
    return REPO_DocumentosRoutedV9.listarPorExpediente(expediente);
  },

  listarEtapa: function(expediente, etapa) {
    expediente = V4_exigirTexto_(expediente, 'Expediente');
    etapa = V4_exigirTexto_(etapa, 'Etapa');
    return REPO_DocumentosRoutedV9.listarPorEtapa(expediente, etapa);
  },

  subirExpediente: function(datos) {
    if (!datos) throw new Error('No se recibieron datos del documento.');
    V4_exigirTexto_(datos.expediente || datos.numeroExpediente, 'Expediente');
    return REPO_DocumentosRoutedV9.subirExpediente(datos);
  },

  renombrarExpediente: function(datos) {
    if (!datos) throw new Error('No se recibieron datos para renombrar.');
    return REPO_DocumentosRoutedV9.renombrarExpediente(datos);
  },

  eliminarExpediente: function(datos) {
    if (!datos) throw new Error('No se recibieron datos para eliminar.');
    return REPO_DocumentosRoutedV9.eliminarExpediente(datos);
  },

  subirSubetapa: function(datos) {
    if (!datos) throw new Error('No se recibieron datos del archivo de subetapa.');
    V4_exigirTexto_(datos.expediente, 'Expediente');
    return REPO_DocumentosRoutedV9.subirSubetapa(datos);
  },

  historialSubetapa: function(expediente, etapa, subetapa) {
    expediente = V4_exigirTexto_(expediente, 'Expediente');
    etapa = V4_exigirTexto_(etapa, 'Etapa');
    subetapa = V4_exigirTexto_(subetapa, 'Subetapa');
    return REPO_DocumentosRoutedV9.historialSubetapa(expediente, etapa, subetapa);
  },

  autorizarNuevaCarga: function(id, usuario, correoUsuario, mensaje) {
    id = V4_exigirTexto_(id, 'ID');
    return REPO_DocumentosRoutedV9.autorizarNuevaCarga(id, usuario, correoUsuario, mensaje);
  }
};

const SOA_DriveV4Service = {
  obtenerUrlCarpeta: function(expediente) {
    expediente = V4_exigirTexto_(expediente, 'Expediente');
    return REPO_DriveV4.obtenerUrlCarpeta(expediente);
  },

  obtenerOCrearCarpeta: function(expediente) {
    expediente = V4_exigirTexto_(expediente, 'Expediente');
    return REPO_DriveV4.obtenerOCrearCarpeta(expediente);
  },

  obtenerProgresoCopias: function() {
    return REPO_DriveV4.obtenerProgresoCopias();
  },

  iniciarCopias: function(datos) {
    if (!datos) throw new Error('No se recibieron datos para iniciar copias.');
    return REPO_DriveV4.iniciarCopias(datos);
  }
};

const SOA_ChecklistV4Service = {
  asegurar: function(expediente) {
    expediente = V4_exigirTexto_(expediente, 'Expediente');
    return REPO_ChecklistRoutedV9.asegurar(expediente);
  },

  obtener: function(expediente) {
    expediente = V4_exigirTexto_(expediente, 'Expediente');
    REPO_ChecklistRoutedV9.asegurar(expediente);
    return REPO_ChecklistRoutedV9.obtener(expediente);
  },

  guardarCheck: function(expediente, clave, valor, usuario, correo) {
    expediente = V4_exigirTexto_(expediente, 'Expediente');
    clave = V4_exigirTexto_(clave, 'Clave de checklist');
    return REPO_ChecklistRoutedV9.guardarCheck(expediente, clave, valor, usuario, correo);
  },

  subirDocumento: function(datos) {
    if (!datos) throw new Error('No se recibieron datos del documento de checklist.');
    return REPO_ChecklistRoutedV9.subirDocumento(datos);
  },

  eliminarDocumento: function(datos) {
    if (!datos) throw new Error('No se recibieron datos para eliminar el documento.');
    return REPO_ChecklistRoutedV9.eliminarDocumento(datos);
  },

  renombrarDocumento: function(datos) {
    if (!datos) throw new Error('No se recibieron datos para renombrar el documento.');
    return REPO_ChecklistRoutedV9.renombrarDocumento(datos);
  },

  validarCompleto: function(expediente) {
    expediente = V4_exigirTexto_(expediente, 'Expediente');
    return REPO_ChecklistRoutedV9.validarCompleto(expediente);
  }
};

const SOA_HistorialV4Service = {
  registrar: function(datos) {
    if (!datos) throw new Error('No se recibieron datos del historial.');
    return REPO_HistorialRoutedV9.registrar(datos);
  },

  porDni: function(dni, soloPublico) {
    dni = V4_exigirTexto_(dni, 'DNI');
    return REPO_HistorialRoutedV9.porDni(dni, soloPublico !== false);
  },

  porExpediente: function(expediente, soloPublico) {
    expediente = V4_exigirTexto_(expediente, 'Expediente');
    return REPO_HistorialRoutedV9.porExpediente(expediente, soloPublico !== false);
  },

  admin: function(expediente) {
    expediente = V4_exigirTexto_(expediente, 'Expediente');
    return REPO_HistorialRoutedV9.admin(expediente);
  },

  porCorreo: function(correo) {
    correo = V4_exigirTexto_(correo, 'Correo');
    return REPO_HistorialRoutedV9.porCorreo(correo);
  }
};
