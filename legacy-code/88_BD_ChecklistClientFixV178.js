/**
 * BD-17.8 - Diagnóstico de respuesta serializable para google.script.run
 */
function BD178_PROBAR_CHECKLIST_CLIENTE(){
  var exps=REPO_RelacionalV5.listar('expedientes')||[];
  var codigo='';
  for(var i=0;i<exps.length;i++){if(exps[i].CODIGO_TRAMITE){codigo=String(exps[i].CODIGO_TRAMITE).trim();break;}}
  if(!codigo){var o={status:false,fase:'BD-17.8',mensaje:'No hay expedientes para probar.'};Logger.log(JSON.stringify(o,null,2));return o;}
  var e1=BD177_OBTENER_CHECKLIST(codigo,1),e2=BD177_OBTENER_CHECKLIST(codigo,2);
  // JSON stringify is intentional: verifies no Date/unsupported values remain in the response.
  var serial1=JSON.parse(JSON.stringify(e1)),serial2=JSON.parse(JSON.stringify(e2));
  var out={status:!!(serial1.status&&serial2.status),fase:'BD-17.8',version:'db-17.8-checklist-client-serialization',expediente:codigo,etapa1:{total:serial1.total,serializable:true},etapa2:{total:serial2.total,serializable:true},causaCorregida:'Fechas Date convertidas a texto antes de responder a google.script.run'};
  Logger.log(JSON.stringify(out,null,2));return out;
}
