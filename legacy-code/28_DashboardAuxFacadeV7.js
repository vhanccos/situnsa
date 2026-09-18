/**
 * FASE 7 - PARTE 4
 * FACHADA AUXILIAR DEL DASHBOARD -> MVC + SOA
 *
 * Cierra las llamadas directas que aún permanecían en Dashboard.html:
 * - Inserción/generación de documentos del alumno.
 * - Consulta de revisiones del asesor.
 * - Reset de documento de una etapa.
 * - Dashboard consolidado de expedientes.
 *
 * Mantiene el contrato de respuesta de las funciones existentes para no romper la UI.
 */

const REPO_DashboardAuxLegacyV7 = Object.freeze({
  insertarDocumentosAlumno: function(referencia){
    return insertarDocumentosAlumno(referencia);
  },

  revisionesAsesor: function(expediente){
    // Reutiliza la capa SOA creada en FASE 5 cuando está disponible.
    if (typeof SOA_RevisionAsesorV5Service !== 'undefined' &&
        SOA_RevisionAsesorV5Service &&
        typeof SOA_RevisionAsesorV5Service.revisiones === 'function') {
      return SOA_RevisionAsesorV5Service.revisiones(expediente);
    }
    return obtenerRevisionesAsesorExpedienteV29(expediente);
  },

  resetearDocumento: function(documentoId){
    return resetearDocumentoExpedienteV4(documentoId);
  },

  dashboardExpedientes: function(forzar){
    return obtenerDashboardExpedientesV13(Boolean(forzar));
  }
});

const SOA_DashboardAuxV7Service = Object.freeze({
  insertarDocumentosAlumno: function(referencia){
    if (!referencia) {
      return {status:false, message:'Debe indicar el expediente o DNI del alumno.'};
    }
    return REPO_DashboardAuxLegacyV7.insertarDocumentosAlumno(referencia);
  },

  revisionesAsesor: function(expediente){
    if (!expediente) {
      return {status:false, message:'Expediente requerido.'};
    }
    return REPO_DashboardAuxLegacyV7.revisionesAsesor(expediente);
  },

  resetearDocumento: function(documentoId){
    if (!documentoId) {
      return {status:false, message:'Documento requerido.'};
    }
    return REPO_DashboardAuxLegacyV7.resetearDocumento(documentoId);
  },

  dashboardExpedientes: function(forzar){
    return REPO_DashboardAuxLegacyV7.dashboardExpedientes(forzar);
  }
});

function MVC7C_respuesta_(accion){
  try {
    return accion();
  } catch (e) {
    return {
      status:false,
      message:e && e.message ? e.message : String(e)
    };
  }
}

// ===== ENDPOINTS FRONTEND =====
function MVC7C_insertarDocumentosAlumno(referencia){
  return MVC7C_respuesta_(function(){
    return SOA_DashboardAuxV7Service.insertarDocumentosAlumno(referencia);
  });
}

function MVC7C_obtenerRevisionesAsesor(expediente){
  return MVC7C_respuesta_(function(){
    return SOA_DashboardAuxV7Service.revisionesAsesor(expediente);
  });
}

function MVC7C_resetearDocumentoExpediente(documentoId){
  return MVC7C_respuesta_(function(){
    return SOA_DashboardAuxV7Service.resetearDocumento(documentoId);
  });
}

function MVC7C_obtenerDashboardExpedientes(forzar){
  return MVC7C_respuesta_(function(){
    return SOA_DashboardAuxV7Service.dashboardExpedientes(forzar);
  });
}

function MVC7C_diagnostico(){
  const faltantes = [];

  if (typeof insertarDocumentosAlumno !== 'function') {
    faltantes.push('insertarDocumentosAlumno');
  }
  if (typeof obtenerRevisionesAsesorExpedienteV29 !== 'function') {
    faltantes.push('obtenerRevisionesAsesorExpedienteV29');
  }
  if (typeof resetearDocumentoExpedienteV4 !== 'function') {
    faltantes.push('resetearDocumentoExpedienteV4');
  }
  if (typeof obtenerDashboardExpedientesV13 !== 'function') {
    faltantes.push('obtenerDashboardExpedientesV13');
  }

  return {
    status: faltantes.length === 0,
    fase: '7.4',
    arquitectura: 'MVC + SOA',
    dominio: 'Dashboard auxiliar + revisión asesor + documentos + resumen de expedientes',
    endpoints: [
      'MVC7C_insertarDocumentosAlumno',
      'MVC7C_obtenerRevisionesAsesor',
      'MVC7C_resetearDocumentoExpediente',
      'MVC7C_obtenerDashboardExpedientes'
    ],
    faltantes: faltantes
  };
}
