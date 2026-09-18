/**
 * FASE 12 - DESACOPLAMIENTO DOCUMENTOS + CHECKLIST + HISTORIAL + DRIVE
 *
 * Historial queda implementado directamente en Repository -> Sheets.
 * Las operaciones físicas de Drive se concentran temporalmente en un único adaptador
 * para preservar IDs, carpetas, nombres y contratos ya existentes.
 */

var ADAPTER_DocumentalLegacyV12 = {
  listarDocumentosExpediente: function(expediente) {
    if (typeof listarDocumentosExpedienteV22 === 'function') return listarDocumentosExpedienteV22(expediente);
    if (typeof obtenerDocumentosExpedienteAdmin === 'function') return obtenerDocumentosExpedienteAdmin(expediente);
    throw new Error('No existe proveedor de documentos por expediente.');
  },
  listarDocumentosEtapa: function(expediente, etapa) {
    if (typeof listarDocumentosEtapaV21 === 'function') return listarDocumentosEtapaV21(expediente, etapa);
    if (typeof listarDocumentosEtapa === 'function') return listarDocumentosEtapa(expediente, etapa);
    throw new Error('No existe proveedor de documentos por etapa.');
  },
  subirDocumentosExpediente: function(datos) {
    if (typeof BD17_activo_ === 'function' && BD17_activo_()) throw new Error('La agenda virtual BD-17 tiene deshabilitada la carga de documentos.');
    if (typeof subirDocumentosExpedienteV22 !== 'function') throw new Error('Proveedor de carga documental no disponible.');
    return subirDocumentosExpedienteV22(datos);
  },
  renombrarDocumentoExpediente: function(datos) {
    datos = datos || {};
    if (typeof renombrarDocumentoExpedienteV22 !== 'function') throw new Error('Proveedor de renombrado documental no disponible.');
    return renombrarDocumentoExpedienteV22(datos.expediente, datos.archivoId || datos.id, datos.nuevoNombre || datos.nombre);
  },
  eliminarDocumentoExpediente: function(datos) {
    datos = datos || {};
    if (typeof eliminarDocumentoExpedienteV22 !== 'function') throw new Error('Proveedor de eliminación documental no disponible.');
    return eliminarDocumentoExpedienteV22(datos.expediente, datos.archivoId || datos.id);
  },
  subirArchivoSubetapa: function(datos) {
    if (typeof BD17_activo_ === 'function' && BD17_activo_()) throw new Error('La agenda virtual BD-17 no admite carga de documentos en subetapas.');
    if (typeof subirArchivoSubetapa !== 'function') throw new Error('Proveedor de archivo de subetapa no disponible.');
    return subirArchivoSubetapa(datos);
  },
  historialArchivosSubetapa: function(expediente, etapa, subetapa) {
    if (typeof obtenerHistorialArchivosSubetapaV6 !== 'function') throw new Error('Historial de archivos de subetapa no disponible.');
    return obtenerHistorialArchivosSubetapaV6(expediente, etapa, subetapa);
  },
  autorizarNuevaCarga: function(id, usuario, correoUsuario, mensaje) {
    if (typeof autorizarNuevaCargaConMensajeV4 !== 'function') throw new Error('Autorización de nueva carga no disponible.');
    return autorizarNuevaCargaConMensajeV4(id, usuario, correoUsuario, mensaje);
  },
  obtenerUrlCarpeta: function(expediente) {
    if (typeof obtenerUrlCarpetaExpediente !== 'function') throw new Error('Proveedor de carpeta no disponible.');
    return obtenerUrlCarpetaExpediente(expediente);
  },
  obtenerOCrearCarpeta: function(expediente) {
    if (typeof obtenerOCrearCarpetaExpediente !== 'function') throw new Error('Proveedor de carpeta no disponible.');
    return obtenerOCrearCarpetaExpediente(expediente);
  },
  obtenerProgresoCopias: function() {
    if (typeof obtenerProgresoCopias !== 'function') throw new Error('Proveedor de progreso de copias no disponible.');
    return obtenerProgresoCopias();
  },
  iniciarCopias: function(datos) {
    if (typeof iniciarCopias !== 'function') throw new Error('Motor de copias no disponible.');
    return iniciarCopias(datos);
  },
  asegurarChecklist: function(expediente) {
    if (typeof asegurarChecklistEtapa2V27 !== 'function') throw new Error('Checklist no disponible.');
    return asegurarChecklistEtapa2V27(expediente);
  },
  obtenerChecklist: function(expediente) {
    if (typeof obtenerChecklistEtapa2V27 !== 'function') throw new Error('Checklist no disponible.');
    return obtenerChecklistEtapa2V27(expediente);
  },
  guardarCheck: function(expediente, numero, marcado, usuario, correo) {
    if (typeof guardarCheckEtapa2V27 !== 'function') throw new Error('Checklist no disponible.');
    return guardarCheckEtapa2V27(expediente, numero, marcado, usuario, correo);
  },
  subirDocumentoChecklist: function(datos) {
    if (typeof BD17_activo_ === 'function' && BD17_activo_()) throw new Error('La agenda virtual BD-17 no admite carga de documentos.');
    if (typeof subirDocumentoChecklistEtapa2V27 !== 'function') throw new Error('Carga de checklist no disponible.');
    return subirDocumentoChecklistEtapa2V27(datos);
  },
  eliminarDocumentoChecklist: function(datos) {
    datos = datos || {};
    if (typeof eliminarDocumentoChecklistEtapa2V27 !== 'function') throw new Error('Eliminación de checklist no disponible.');
    return eliminarDocumentoChecklistEtapa2V27(datos.expediente, datos.numero);
  },
  renombrarDocumentoChecklist: function(datos) {
    datos = datos || {};
    if (typeof renombrarDocumentoChecklistEtapa2V28 !== 'function') throw new Error('Renombrado de checklist no disponible.');
    return renombrarDocumentoChecklistEtapa2V28(datos.expediente, datos.numero, datos.nuevoNombre || datos.nombre);
  },
  validarChecklist: function(expediente) {
    if (typeof validarChecklistCompletoEtapa2V27 !== 'function') throw new Error('Validación de checklist no disponible.');
    return validarChecklistCompletoEtapa2V27(expediente);
  }
};

var REPO_HistorialV12 = {
  sheet: function() {
    var ss = SpreadsheetApp.openById(SHEET_HISTORIAL_EXPEDIENTES);
    var sh = ss.getSheetByName('COMPAT_HISTORIAL');
    if (!sh) throw new Error('No existe la hoja COMPAT_HISTORIAL. Ejecute BD15_PREPARAR_BASE_UNICA().');
    return sh;
  },
  siguienteId: function() {
    var sh = this.sheet(), lr = sh.getLastRow();
    if (lr <= 1) return 1;
    var vals = sh.getRange(2,1,lr-1,1).getValues();
    var max = 0;
    vals.forEach(function(r){ max = Math.max(max, Number(r[0] || 0)); });
    return max + 1;
  },
  mapear: function(f) {
    return {id:f[0]||'',dni:f[1]||'',expediente:f[2]||'',nombres:f[3]||'',etapa:f[4]||'',accion:f[5]||'',descripcion:f[6]||'',usuario:f[7]||'',correoUsuario:f[8]||'',fecha:f[9]||'',hora:f[10]||'',observacion:f[11]||'',visibilidad:f[12]||'',estado:f[13]||''};
  },
  visible: function(f, soloPublico) {
    return !soloPublico || String(f[12] || '').trim().toUpperCase() === 'PUBLICO';
  },
  registrar: function(datos) {
    try {
      datos = datos || {};
      var sh=this.sheet(), ahora=new Date(), zona=Session.getScriptTimeZone()||'America/Lima';
      sh.appendRow([this.siguienteId(),datos.dni||'',String(datos.expediente||'').trim().toUpperCase(),datos.nombres||'',datos.etapa||'',datos.accion||'',datos.descripcion||'',datos.usuario||'',datos.correoUsuario||'',Utilities.formatDate(ahora,zona,'dd/MM/yyyy'),Utilities.formatDate(ahora,zona,'HH:mm:ss'),datos.observacion||'',datos.visibilidad||'PUBLICO',datos.estado||'INFO']);
      return {status:true};
    } catch(e) { return {status:false,message:e.message||String(e)}; }
  },
  filtrar: function(indice, valor, soloPublico) {
    valor=String(valor||'').trim(); if(!valor) return [];
    if(indice===2) valor=valor.toUpperCase();
    var data=this.sheet().getDataRange().getValues(), out=[], self=this;
    for(var i=1;i<data.length;i++){
      var actual=String(data[i][indice]||'').trim(); if(indice===2) actual=actual.toUpperCase();
      if(actual===valor && self.visible(data[i],soloPublico)) out.push(self.mapear(data[i]));
    }
    return out.reverse();
  },
  porDni: function(dni, soloPublico){ return this.filtrar(1,dni,soloPublico); },
  porExpediente: function(expediente, soloPublico){ return this.filtrar(2,expediente,soloPublico); },
  admin: function(identificador, soloPublico){
    identificador=String(identificador||'').trim();
    return /^SET\d+$/i.test(identificador) ? this.porExpediente(identificador,soloPublico) : this.porDni(identificador,soloPublico);
  },
  porCorreo: function(correo){
    correo=String(correo||'').trim().toLowerCase(); if(!correo) return [];
    try {
      var sh=REPO_ExpedienteV2.sheet(), cols=REPO_ExpedienteV2.mapearColumnas(sh), data=sh.getDataRange().getDisplayValues();
      for(var i=1;i<data.length;i++){
        var c1=cols['CORREO']?String(data[i][cols['CORREO']-1]||'').trim().toLowerCase():'', c2=cols['CORREO02']?String(data[i][cols['CORREO02']-1]||'').trim().toLowerCase():'';
        if(correo===c1||correo===c2){ var exp=cols['N° DE TRÁMITE']?data[i][cols['N° DE TRÁMITE']-1]:''; return this.porExpediente(exp,true); }
      }
    } catch(e) { console.error('FASE12 historial por correo:',e); }
    return [];
  }
};

function MVC12_diagnostico(){
  var faltantes=[];
  if (typeof REPO_DocumentosV4 === 'undefined') faltantes.push('REPO_DocumentosV4');
  if (typeof REPO_DriveV4 === 'undefined') faltantes.push('REPO_DriveV4');
  if (typeof REPO_ChecklistV4 === 'undefined') faltantes.push('REPO_ChecklistV4');
  if (typeof REPO_HistorialV4 === 'undefined') faltantes.push('REPO_HistorialV4');
  if (typeof SOA_DocumentosV4Service === 'undefined') faltantes.push('SOA_DocumentosV4Service');
  if (typeof SOA_DriveV4Service === 'undefined') faltantes.push('SOA_DriveV4Service');
  if (typeof SOA_ChecklistV4Service === 'undefined') faltantes.push('SOA_ChecklistV4Service');
  if (typeof SOA_HistorialV4Service === 'undefined') faltantes.push('SOA_HistorialV4Service');
  if (typeof ADAPTER_DocumentalLegacyV12 === 'undefined') faltantes.push('ADAPTER_DocumentalLegacyV12');
  if (typeof REPO_HistorialV12 === 'undefined') faltantes.push('REPO_HistorialV12');
  var accesoHistorial={status:false};
  try { var sh=REPO_HistorialV12.sheet(); accesoHistorial={status:true,hoja:sh.getName(),filas:sh.getLastRow(),columnas:sh.getLastColumn()}; } catch(e){ accesoHistorial={status:false,error:e.message}; }
  return {
    status:faltantes.length===0 && accesoHistorial.status,
    fase:12,
    arquitectura:'MVC + SOA',
    objetivo:'Desacoplar capa documental; Historial directo a Sheets y Drive fisico centralizado en adaptador temporal',
    resultado:{historialDirectoSheets:true,frontendDocumentalUsaSOA:true,driveFisicoCentralizado:true,checklistCentralizado:true,subetapasDocumentalesCentralizadas:true},
    acceso:{historial:accesoHistorial},
    clasificacion:{'13_DocumentosHistorialRepositoriesV4.gs':'IMPLEMENTACION_REPOSITORY','14_DocumentosHistorialServicesV4.gs':'IMPLEMENTACION_SERVICE','15_DocumentosHistorialControllersV4.gs':'IMPLEMENTACION_CONTROLLER','HistorialExpedientes.gs':'ADAPTADOR_COMPATIBILIDAD','DocumentosExpedientes.gs':'MOTOR_DRIVE_TEMPORAL','DocumentosEtapas.gs':'MOTOR_DRIVE_TEMPORAL','ArchivosSubetapas.gs':'MOTOR_DRIVE_TEMPORAL','ChecklistEtapa2.gs':'MOTOR_CHECKLIST_DRIVE_TEMPORAL','CopiasExpedientes.gs':'MOTOR_DRIVE_TEMPORAL'},
    puedeEliminarHistorialExpedientesGs:false,
    puedeEliminarMotoresDrive:false,
    motivoNoEliminar:'Otros modulos todavia consumen nombres globales legacy y las operaciones fisicas de Drive deben conservar IDs, estructura de carpetas y contratos existentes hasta la limpieza final.',
    faltantes:faltantes,
    advertencias:[],errores:[]
  };
}

function MVC12_PROBAR_DIAGNOSTICO(){ var r=MVC12_diagnostico(); console.log(JSON.stringify(r,null,2)); return r; }
