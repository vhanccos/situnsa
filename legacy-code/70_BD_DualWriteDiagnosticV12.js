/** BD-12 - Diagnóstico dual write controlado */
function BD12_queueStats_(){
  var sh=BD12_queueSheet_(false); if(!sh||sh.getLastRow()<2)return {existe:!!sh,total:0,pendientes:0,resueltos:0,requiereRevision:0};
  var vals=sh.getRange(2,1,sh.getLastRow()-1,Math.max(sh.getLastColumn(),BD12_CONFIG.queueHeaders.length)).getDisplayValues();
  var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0], idx={}; h.forEach(function(x,i){idx[BD12_up_(x)]=i;});
  var s={existe:true,total:vals.length,pendientes:0,resueltos:0,requiereRevision:0};
  vals.forEach(function(r){var e=BD12_up_(r[idx.ESTADO]);if(e==='PENDIENTE')s.pendientes++;else if(e==='RESUELTO')s.resueltos++;else if(e==='REQUIERE_REVISION')s.requiereRevision++;}); return s;
}
function BD12_PROBAR_DIAGNOSTICO(){
  var cfg=typeof BD6_GET_CONFIG==='function'?BD6_GET_CONFIG():{readMode:'MIRROR',writeMode:'LEGACY'};
  var cola=BD12_queueStats_(), errores=[], adv=[];
  if((cfg.writeMode||'LEGACY')!=='LEGACY')errores.push('WRITE_MODE_DEBE_SER_LEGACY');
  if(typeof BD12_afterLegacySafe_!=='function')errores.push('HOOK_DUAL_WRITE_NO_DISPONIBLE');
  if(typeof BD11_buildPlan_!=='function')errores.push('BD11_NO_DISPONIBLE');
  if(!cola.existe)adv.push('Ejecute BD12_PREPARAR() para crear la cola auxiliar antes de activar dual write.');
  if(!BD12_enabled_())adv.push('Dual write está instalado pero DESHABILITADO. Activar solo después de validar este diagnóstico.');
  if(cola.pendientes)adv.push('Existen eventos de réplica pendientes: '+cola.pendientes+'.');
  if(cola.requiereRevision)adv.push('Existen operaciones destructivas que requieren revisión manual: '+cola.requiereRevision+'.');
  var bd10=null; try{if(typeof BD10_PROBAR_DIAGNOSTICO==='function')bd10=BD10_PROBAR_DIAGNOSTICO();}catch(e){bd10={status:false,error:e.message};}
  var out={status:errores.length===0,fase:'BD-12',version:BD12_CONFIG.version,configuracion:{dualWriteHabilitado:BD12_enabled_(),readMode:cfg.readMode,writeMode:cfg.writeMode||'LEGACY',fuenteAutoritativa:'LEGACY',replica:'RELACIONAL'},
    seguridad:{legacyPrimero:true,replicaSoloTrasExitoLegacy:true,falloRelacionalNoRevierteLegacy:true,borradoRelacionalAutomatico:false,authModificado:false,frontendModificado:false},
    modulos:{expedientes:true,administracion:true,seguimiento:true,documentos:true,checklist:true,historial:true,asesores:true,talleres:true,matriculas:true,asistencia:true,auth:false},
    colaSincronizacion:cola,coberturaTallerBD10:bd10?{status:bd10.status,listoParaCutoverRelacional:bd10.listoParaCutoverRelacional}:null,listoParaActivar:errores.length===0&&cola.existe,errores:errores,advertencias:adv};
  Logger.log(JSON.stringify(out,null,2));return out;
}
function BD12_PROBAR_ESTADO(){
  var d=BD12_PROBAR_DIAGNOSTICO();
  var out={status:d.status,fase:'BD-12',version:BD12_CONFIG.version,dualWriteHabilitado:d.configuracion.dualWriteHabilitado,writeMode:d.configuracion.writeMode,cola:d.colaSincronizacion,listoParaActivar:d.listoParaActivar};
  Logger.log(JSON.stringify(out,null,2));return out;
}
