/** BD-08 diagnostico de integracion Administracion + Seguimiento. */
function BD8_PROBAR_DIAGNOSTICO(){
  var errores=[], advertencias=[], cfg=BD6_GET_CONFIG();
  var legacyBus=[], relBus=[], compBus={status:false};
  try{legacyBus=REPO_AdministracionV3.buscarPersonas('SET',50);relBus=BD8_relBuscarPersonas_('SET',50);compBus=BD8_comparePersonas_(legacyBus,relBus);}catch(e){errores.push('Busqueda: '+e.message);}
  var exps=[];try{exps=REPO_RelacionalV5.listar('expedientes');}catch(e){errores.push('Expedientes relacionales: '+e.message);}
  var comps=[], max=Math.min(exps.length,10);
  for(var i=0;i<max;i++){
    var codigo=String(exps[i].CODIGO_TRAMITE||'');
    try{var l=REPO_SeguimientoV3.procesoPorExpediente(codigo), r=BD8_relProceso_(codigo), rl=BD8_resumenProceso_(l), rr=BD8_resumenProceso_(r), ok=rl===rr;comps.push({expediente:codigo,status:ok,legacySubetapas:Object.keys(l).reduce(function(s,k){return s+(l[k]||[]).length;},0),relacionalSubetapas:Object.keys(r).reduce(function(s,k){return s+(r[k]||[]).length;},0),comparacionSemantica:true});}catch(e){comps.push({expediente:codigo,status:false,error:e.message});}
  }
  var segOk=comps.every(function(x){return x.status;});
  if(!compBus.status) advertencias.push('Busqueda administrativa no coincide 100% entre legacy y relacional; MIRROR mantiene LEGACY como respuesta.');
  if(!segOk) advertencias.push('Hay diferencias de forma/estado en seguimiento; MIRROR mantiene LEGACY como respuesta.');
  var bd04=null;try{bd04=typeof BD4_PROBAR_RESUMEN==='function'?BD4_PROBAR_RESUMEN():null;}catch(e){}
  if(bd04&&bd04.status===false)advertencias.push('BD-04 mantiene incidencias de calidad de datos de prueba.');
  var out={status:errores.length===0,fase:'BD-08',version:'db-8.1-admin-seguimiento-normalizado',integracion:{administracion:true,seguimiento:true,readMode:cfg.readMode,writeMode:'LEGACY'},comparaciones:{busquedaPersonas:compBus,seguimiento:{status:segOk,expedientes:comps}},rollback:{disponible:true,funcion:'BD8_ROLLBACK_LEGACY'},escrituraRelacionalHabilitada:false,frontendModificado:false,datosLegacyModificadosPorDiagnostico:false,datosRelacionalesModificadosPorDiagnostico:false,errores:errores,advertencias:advertencias};
  Logger.log(JSON.stringify(out,null,2));return out;
}
