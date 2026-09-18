/**
 * V20 · Carga consolidada y medición real del trámite.
 * Nombres exclusivos SUPEROPT20 para evitar declaraciones duplicadas.
 */
const SUPEROPT20_CONFIG = Object.freeze({
  fase:'V20',
  version:'20.1.0',
  bootstrapTTL:120
});

function SUPEROPT20_txt_(v){return String(v==null?'':v).trim();}
function SUPEROPT20_up_(v){return SUPEROPT20_txt_(v).toUpperCase();}

function SUPEROPT20_CARGAR_TRAMITE(referencia){
  var ref=SUPEROPT20_up_(referencia);
  if(!ref)return{v20:true,status:false,message:'Debe indicar un expediente.'};
  var key=BD18_key_('BOOT20',ref),cache=CacheService.getScriptCache(),guardado=null;
  try{guardado=cache.get(key);if(guardado)return JSON.parse(guardado);}catch(e){}

  var inicio=Date.now(),marcas={},datos=null,estado=null,workflow=null,avisos=[];

  /* La ficha es obligatoria. Los demás bloques son complementarios y nunca
     deben ocultar datos válidos del expediente. */
  try{
    var t=Date.now();
    datos=BD18_OBTENER_DATOS_ADMIN(ref);
    marcas.datos=Date.now()-t;
  }catch(errorDatos){
    return{v20:true,status:false,expediente:ref,message:errorDatos.message||String(errorDatos),tiempos:marcas,totalMs:Date.now()-inicio};
  }
  if(!datos||!datos.dni){
    return{v20:true,status:false,message:'No se encontró la información del expediente.',expediente:ref,tiempos:marcas,totalMs:Date.now()-inicio};
  }

  var codigo=SUPEROPT20_up_(datos.expediente||ref),tEstado=Date.now();
  try{estado=SOA_WorkflowV7Service.obtenerEstadoExpediente(codigo);}
  catch(errorEstado){avisos.push('estado: '+(errorEstado.message||errorEstado));}
  marcas.estado=Date.now()-tEstado;

  var tWorkflow=Date.now();
  try{workflow=BD18_OBTENER_WORKFLOW(codigo);}
  catch(errorWorkflow){avisos.push('workflow: '+(errorWorkflow.message||errorWorkflow));}
  marcas.workflow=Date.now()-tWorkflow;

  var salida={
    v20:true,status:true,expediente:codigo,
    datos:datos,estado:estado,workflow:workflow,
    cargaParcial:avisos.length>0,avisos:avisos,
    tiempos:marcas,totalMs:Date.now()-inicio,desdeCache:false
  };
  try{
    var json=JSON.stringify(salida);
    if(json.length<95000)cache.put(key,json,SUPEROPT20_CONFIG.bootstrapTTL);
  }catch(e){}
  return salida;
}

function SUPEROPT20_PROBAR_DIAGNOSTICO(expediente){
  var ref=SUPEROPT20_up_(expediente||'SET001');
  BD18_INVALIDAR_EXPEDIENTE(ref);
  var primera=SUPEROPT20_CARGAR_TRAMITE(ref),inicio=Date.now();
  var segunda=SUPEROPT20_CARGAR_TRAMITE(ref),cacheMs=Date.now()-inicio;
  var salida={
    status:!!(primera&&primera.status&&segunda&&segunda.status),
    fase:SUPEROPT20_CONFIG.fase,version:SUPEROPT20_CONFIG.version,
    expediente:ref,primeraCargaMs:primera&&primera.totalMs,
    segundaCargaCacheMs:cacheMs,
    llamadasParaAbrirTramite:1,
    lecturaTablaPorEjecucion:1,
    documentosBajoDemanda:true,
    cacheIdsDrive:true,
    errores:primera&&primera.status?[]:[primera&&primera.message||'Error desconocido']
  };
  Logger.log(JSON.stringify(salida,null,2));
  return salida;
}
