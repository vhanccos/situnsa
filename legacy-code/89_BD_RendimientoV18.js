/**
 * BD-18 - OPTIMIZACION DE RENDIMIENTO PARA GOOGLE SHEETS
 * ------------------------------------------------------
 * Objetivos:
 * - CacheService para fichas y seguimiento.
 * - Checklist optimista: una sola escritura, sin releer/renderizar todo.
 * - Eliminacion relacional por lotes (sin deleteRow repetitivo).
 * - Invalidacion centralizada de cache.
 * - Precarga de datos al abrir Tramites.
 */
const BD18_CONFIG = Object.freeze({
  fase:'BD-18',
  version:'db-18.0-rendimiento-sheets',
  detalleTTL:180,
  workflowTTL:90,
  dashboardTTL:120,
  prefix:'BD18_'
});

function BD18_txt_(v){return String(v==null?'':v).trim();}
function BD18_up_(v){return BD18_txt_(v).toUpperCase();}
function BD18_cache_(){return CacheService.getScriptCache();}
function BD18_key_(tipo,ref){return BD18_CONFIG.prefix+tipo+'_'+BD18_up_(ref).replace(/[^A-Z0-9_-]/g,'_');}
function BD18_getJson_(key){try{var x=BD18_cache_().get(key);return x?JSON.parse(x):null;}catch(e){return null;}}
function BD18_putJson_(key,obj,ttl){try{var s=JSON.stringify(obj);if(s.length<95000)BD18_cache_().put(key,s,ttl);}catch(e){}}
function BD18_remove_(key){try{BD18_cache_().remove(key);}catch(e){}}

function BD18_INVALIDAR_EXPEDIENTE(ref){
  var q=BD18_up_(ref);
  BD18_remove_(BD18_key_('DET',q));
  BD18_remove_(BD18_key_('WF',q));
  BD18_remove_('DASHBOARD_EXPEDIENTES_V171_RELACIONAL');
  BD18_remove_(BD18_key_('BOOT20',q));
  return true;
}

function BD18_OBTENER_DATOS_ADMIN(ref){
  var key=BD18_key_('DET',ref),c=BD18_getJson_(key);
  if(c)return c;
  var r=BD172_datosAdminRelacional(ref);
  if(r)BD18_putJson_(key,r,BD18_CONFIG.detalleTTL);
  return r;
}

function BD18_OBTENER_WORKFLOW(ref){
  var key=BD18_key_('WF',ref),c=BD18_getJson_(key);
  if(c)return c;
  var r=REPO_WorkflowLegacyV7.obtenerSubetapasAdmin(ref);
  BD18_putJson_(key,r,BD18_CONFIG.workflowTTL);
  return r;
}

function BD18_PRECARGAR_TRAMITE(ref){
  var t=Date.now(),errores=[];
  try{BD18_OBTENER_DATOS_ADMIN(ref);}catch(e){errores.push('datos: '+e.message);}
  try{BD18_OBTENER_WORKFLOW(ref);}catch(e){errores.push('workflow: '+e.message);}
  return {status:errores.length===0,fase:BD18_CONFIG.fase,ref:BD18_up_(ref),ms:Date.now()-t,errores:errores};
}

/* ===== CHECKLIST RAPIDO ===== */
function BD18_checkSheet_(){
  var ss=BD5_abrirBase_(),sh=ss&&ss.getSheetByName('AGENDA_CHECKLIST');
  if(!sh)throw new Error('No existe AGENDA_CHECKLIST.');
  return sh;
}
function BD18_checkExp_(codigo){
  var exp=BD177_expediente_(codigo);
  if(!exp)throw new Error('No se encontró el expediente '+BD18_up_(codigo)+'.');
  return exp;
}
function BD18_checkRow_(sh,idExp,etapa,numero){
  var key=BD18_key_('CKROW',idExp+'_'+etapa+'_'+numero),cached=BD18_getJson_(key);
  if(cached&&cached.row>1)return Number(cached.row);
  var lr=sh.getLastRow(); if(lr<2)return 0;
  var vals=sh.getRange(2,1,lr-1,5).getValues();
  for(var i=0;i<vals.length;i++){
    if(BD18_txt_(vals[i][1])===BD18_txt_(idExp)&&Number(vals[i][3])===Number(etapa)&&Number(vals[i][4])===Number(numero)){
      var row=i+2; BD18_putJson_(key,{row:row},300); return row;
    }
  }
  return 0;
}
function BD18_GUARDAR_CHECK_RAPIDO(codigo,etapa,numero,marcado,usuario){
  try{
    var exp=BD18_checkExp_(codigo),sh=BD18_checkSheet_();
    BD177_asegurar_(exp,etapa);
    var row=BD18_checkRow_(sh,exp.id,etapa,numero);
    if(!row)throw new Error('No se encontró el requisito '+numero+'.');
    sh.getRange(row,7,1,3).setValues([[marcado?'SI':'NO',usuario||'',new Date()]]);
    BD18_INVALIDAR_EXPEDIENTE(codigo);
    return {status:true,expediente:exp.codigo,etapa:Number(etapa),numero:Number(numero),marcado:!!marcado};
  }catch(e){
    return {status:false,message:e.message||String(e)};
  }
}

/* ===== BORRADO POR LOTES ===== */
function BD18_reescribirSin_(sh,predicate){
  if(!sh||sh.getLastRow()<2||sh.getLastColumn()<1)return 0;
  var lr=sh.getLastRow(),lc=sh.getLastColumn(),vals=sh.getRange(1,1,lr,lc).getValues();
  var headers=vals[0].map(BD18_up_),keep=[vals[0]],removed=0;
  for(var i=1;i<vals.length;i++){
    var o={}; headers.forEach(function(h,j){if(h)o[h]=vals[i][j];});
    if(predicate(o)){removed++;}else{keep.push(vals[i]);}
  }
  if(!removed)return 0;
  sh.getRange(2,1,Math.max(1,lr-1),lc).clearContent();
  if(keep.length>1)sh.getRange(2,1,keep.length-1,lc).setValues(keep.slice(1));
  return removed;
}
function BD18_ELIMINAR_EXPEDIENTE_RAPIDO(codigo,confirmacion){
  codigo=BD18_up_(codigo);
  if(confirmacion!==true)return{status:false,message:'La eliminación requiere confirmación explícita.'};
  var lock=LockService.getScriptLock(); lock.waitLock(30000);
  var ini=Date.now();
  try{
    var ss=BD5_abrirBase_(),exp=REPO_RelacionalV5.obtenerExpedientePorCodigo(codigo);
    if(!exp)return{status:false,message:'No se encontró el expediente '+codigo+'.'};
    var idExp=BD18_txt_(exp.ID_EXPEDIENTE);
    var rels=REPO_RelacionalV5.filtrar('expediente_estudiantes',{ID_EXPEDIENTE:idExp})||[];
    var idsEst=rels.map(function(r){return BD18_txt_(r.ID_ESTUDIANTE);}).filter(Boolean);
    var ests=idsEst.map(function(id){return REPO_RelacionalV5.buscarUno('estudiantes','ID_ESTUDIANTE',id);}).filter(Boolean);
    var dnis=ests.map(function(e){return BD18_txt_(e.DNI);}).filter(Boolean);
    var dset={};dnis.forEach(function(d){dset[d]=true;});
    var idset={};idsEst.forEach(function(x){idset[x]=true;});
    var borrados={};

    function tabla(nombre,fn){
      try{var sh=BD5_tabla_(nombre);borrados[nombre]=BD18_reescribirSin_(sh,fn);}catch(e){borrados[nombre]=0;}
    }
    var mats=REPO_RelacionalV5.filtrar('taller_matriculas',{ID_EXPEDIENTE:idExp})||[],mset={};
    mats.forEach(function(m){mset[BD18_txt_(m.ID_MATRICULA)]=true;});
    tabla('taller_asistencia',function(o){return !!mset[BD18_txt_(o.ID_MATRICULA)];});
    tabla('taller_matriculas',function(o){return BD18_txt_(o.ID_EXPEDIENTE)===idExp;});
    ['checklist_respuestas','documentos','historial','expediente_subetapas','expediente_etapas','expediente_estudiantes'].forEach(function(n){
      tabla(n,function(o){return BD18_txt_(o.ID_EXPEDIENTE)===idExp;});
    });
    try{
      var ag=ss.getSheetByName('AGENDA_CHECKLIST');
      borrados.AGENDA_CHECKLIST=BD18_reescribirSin_(ag,function(o){return BD18_txt_(o.ID_EXPEDIENTE)===idExp;});
    }catch(e){}
    tabla('expedientes',function(o){return BD18_txt_(o.ID_EXPEDIENTE)===idExp;});

    /* Tras borrar la relación, conserva estudiantes compartidos. */
    var linksRest=REPO_RelacionalV5.listar('expediente_estudiantes')||[],usados={};
    linksRest.forEach(function(r){usados[BD18_txt_(r.ID_ESTUDIANTE)]=true;});
    var borrarEst={};
    idsEst.forEach(function(id){if(!usados[id])borrarEst[id]=true;});
    tabla('estudiantes',function(o){return !!borrarEst[BD18_txt_(o.ID_ESTUDIANTE)];});
    tabla('usuarios',function(o){return !!dset[BD18_txt_(o.USUARIO)] && idsEst.some(function(id){return !!borrarEst[id];});});

    /* COMPAT ya no es operativo: limpieza diferida para no bloquear al usuario. */
    PropertiesService.getScriptProperties().setProperty('BD18_COMPAT_PENDIENTE_'+codigo,JSON.stringify({codigo:codigo,dnis:dnis,creado:new Date().toISOString()}));
    try{
      ScriptApp.newTrigger('BD18_PROCESAR_LIMPIEZA_COMPAT').timeBased().after(60*1000).create();
    }catch(e){}

    BD18_INVALIDAR_EXPEDIENTE(codigo);
    return {status:true,fase:BD18_CONFIG.fase,expediente:codigo,idExpediente:idExp,borrados:borrados,driveEliminado:false,compatLimpieza:'DIFERIDA',ms:Date.now()-ini,message:'Expediente eliminado correctamente.'};
  }catch(e){
    return {status:false,fase:BD18_CONFIG.fase,message:e.message||String(e),ms:Date.now()-ini};
  }finally{try{lock.releaseLock();}catch(e){}}
}
function BD18_PROCESAR_LIMPIEZA_COMPAT(){
  var props=PropertiesService.getScriptProperties(),all=props.getProperties(),ss=BD5_abrirBase_();
  Object.keys(all).filter(function(k){return k.indexOf('BD18_COMPAT_PENDIENTE_')===0;}).forEach(function(k){
    try{
      var p=JSON.parse(all[k]),codigo=BD18_up_(p.codigo),dset={};(p.dnis||[]).forEach(function(d){dset[BD18_txt_(d)]=true;});
      ['COMPAT_EXPEDIENTES','COMPAT_INVITADOS','COMPAT_SEGUIMIENTO','COMPAT_SEGUIMIENTO_SUBETAPAS','COMPAT_MENSAJES_SUBETAPAS','COMPAT_ARCHIVOS_SUBETAPAS','COMPAT_HISTORIAL','COMPAT_MATRICULADOS','COMPAT_ASISTENCIA'].forEach(function(n){
        var sh=ss.getSheetByName(n); if(!sh)return;
        BD18_reescribirSin_(sh,function(o){
          var c=BD18_up_(o['N° DE TRÁMITE']||o['N° DE TRAMITE']||o.EXPEDIENTE||o.CODIGO_TRAMITE||'');
          var d=BD18_txt_(o.DNI||o.USUARIO||'');
          return c===codigo||!!dset[d];
        });
      });
      props.deleteProperty(k);
    }catch(e){}
  });
  /* elimina triggers duplicados de esta función */
  ScriptApp.getProjectTriggers().forEach(function(t){if(t.getHandlerFunction()==='BD18_PROCESAR_LIMPIEZA_COMPAT')try{ScriptApp.deleteTrigger(t);}catch(e){}});
}

/* ===== DIAGNOSTICO ===== */
function BD18_PROBAR_DIAGNOSTICO(){
  var out={
    status:true,fase:BD18_CONFIG.fase,version:BD18_CONFIG.version,
    optimizaciones:{
      cacheDatos:true,cacheWorkflow:true,precargaTramite:true,
      checklistOptimista:true,checklistEscrituraUnica:true,
      dashboardOptimista:true,eliminacionPorLotes:true,compatCleanupDiferido:true,
      driveComoCache:false
    },
    cacheService:'SCRIPT_CACHE',
    recomendacion:'No usar Drive como cache; mantener Drive solo para archivos.'
  };
  Logger.log(JSON.stringify(out,null,2)); return out;
}
