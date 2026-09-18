/**
 * ==============================================================
 * ARQUITECTURA MVC + SOA - CONFIGURACION CENTRAL
 * Sistema de Titulacion - Segunda Especialidad
 * ==============================================================
 * Apps Script usa un espacio global de funciones. Por ello la
 * arquitectura se implementa mediante namespaces/objetos y capas,
 * manteniendo compatibilidad con el codigo existente.
 */

const APP_ARCH = Object.freeze({
  name: 'Sistema de Titulacion - Segunda Especialidad',
  architecture: 'MVC + SOA',
  version: '2.0.0-final-mvc-soa',
  layers: Object.freeze({
    view: 'HTML/CSS/JavaScript',
    controller: 'MVC_*Controller',
    service: 'SOA_*Service',
    repository: 'REPO_*Repository',
    infrastructure: 'Google Apps Script / Sheets / Drive'
  })
});

const APP_Response = Object.freeze({
  ok(data, message) {
    return { status: true, ok: true, message: message || '', data: data == null ? null : data };
  },
  error(error, fallback) {
    const message = error && error.message ? error.message : String(error || fallback || 'Error no controlado');
    return { status: false, ok: false, message: message, data: null };
  }
});
