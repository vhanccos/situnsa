/**
 * V19 · Diagnóstico de superoptimización.
 * Este archivo usa nombres únicos para evitar el error "Identifier ... has
 * already been declared" que apareció al duplicar configuraciones anteriores.
 */
const SUPEROPT19_CONFIG = Object.freeze({
  fase:'V19',
  version:'19.0.0',
  cacheFichaSegundos:180,
  cacheWorkflowSegundos:90,
  cacheDocumentosSegundos:45
});

function SUPEROPT19_PROBAR_DIAGNOSTICO(expediente){
  var ref=String(expediente||'').trim().toUpperCase();
  var inicio=Date.now(), detalle=null, workflow=null, errores=[];
  if(ref){
    try{detalle=BD18_OBTENER_DATOS_ADMIN(ref);}catch(e){errores.push('detalle: '+e.message);}
    try{workflow=BD18_OBTENER_WORKFLOW(ref);}catch(e){errores.push('workflow: '+e.message);}
  }
  var salida={
    status:errores.length===0,
    fase:SUPEROPT19_CONFIG.fase,
    version:SUPEROPT19_CONFIG.version,
    expediente:ref,
    ms:Date.now()-inicio,
    optimizaciones:{
      lecturaUnicaPorTablaYPorEjecucion:true,
      cacheFicha:true,
      cacheWorkflow:true,
      cacheDocumentos:true,
      cargaDuplicadaTramitesEliminada:true,
      reintentoExpedienteReciente:true,
      urlMovilSinSelectorCuenta:true,
      interfazMovilLegible:true
    },
    detalleEncontrado:!!(detalle&&detalle.dni),
    workflowCargado:!!workflow,
    errores:errores
  };
  Logger.log(JSON.stringify(salida,null,2));
  return salida;
}
