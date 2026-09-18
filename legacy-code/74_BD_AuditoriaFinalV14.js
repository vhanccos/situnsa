/**
 * ==============================================================
 * BD-14 - AUDITORIA FINAL DE MIGRACION RELACIONAL
 * ==============================================================
 * Consolida los diagnósticos de BD-04, BD-07..BD-13 sin modificar datos.
 * Distingue arquitectura instalada, cobertura relacional y aptitud de cutover.
 * ==============================================================
 */
const BD14_CONFIG = Object.freeze({
  version:'db-14.1-auditoria-post-saneamiento',
  propertyProfile:'BD14_CUTOVER_PROFILE',
  profiles:Object.freeze({SAFE_MIRROR:'SAFE_MIRROR',GLOBAL_RELATIONAL_READ:'GLOBAL_RELATIONAL_READ'}),
  defaultProfile:'SAFE_MIRROR'
});

function BD14_bool_(v){return !!v;}
function BD14_safeCall_(nombre, fn){
  try { return {ok:true,nombre:nombre,data:fn()}; }
  catch(e){ return {ok:false,nombre:nombre,error:String(e&&e.message?e.message:e)}; }
}
function BD14_countQueue_(){
  try{return typeof BD12_queueStats_==='function'?BD12_queueStats_():{existe:false,total:0,pendientes:0,resueltos:0,requiereRevision:0};}
  catch(e){return {existe:false,total:0,pendientes:0,resueltos:0,requiereRevision:0,error:e.message};}
}
function BD14_authIncidents_(){
  try{
    var sh=BD13_incidentSheet_(false); if(!sh||sh.getLastRow()<2)return {total:0,pendientes:0};
    var vals=sh.getRange(2,1,sh.getLastRow()-1,8).getValues(), total=vals.length, pendientes=0;
    vals.forEach(function(r){if(String(r[7]||'').trim().toUpperCase()==='PENDIENTE')pendientes++;});
    return {total:total,pendientes:pendientes};
  }catch(e){return {total:0,pendientes:0,error:e.message};}
}
function BD14_estadoModulo_(nombre,integrado,cobertura,apto,detalle){
  return {modulo:nombre,integrado:!!integrado,coberturaRelacional:!!cobertura,aptoParaLecturaRelacional:!!apto,detalle:detalle||{}};
}
function BD14_buildAudit_(){
  var cfg=typeof BD6_GET_CONFIG==='function'?BD6_GET_CONFIG():{readMode:'MIRROR',writeMode:'LEGACY'};
  var d4=BD14_safeCall_('BD04',function(){return typeof BD4_PROBAR_RESUMEN==='function'?BD4_PROBAR_RESUMEN():null;});
  var d7=BD14_safeCall_('BD07',function(){return BD7_PROBAR_DIAGNOSTICO();});
  var d8=BD14_safeCall_('BD08',function(){return BD8_PROBAR_DIAGNOSTICO();});
  var d9=BD14_safeCall_('BD09',function(){return BD9_PROBAR_DIAGNOSTICO();});
  var d10=BD14_safeCall_('BD10',function(){return BD10_PROBAR_DIAGNOSTICO();});
  var d11=BD14_safeCall_('BD11',function(){return BD11_PROBAR_DIAGNOSTICO();});
  var d12=BD14_safeCall_('BD12',function(){return BD12_PROBAR_DIAGNOSTICO();});
  var d13=BD14_safeCall_('BD13',function(){return BD13_PROBAR_DIAGNOSTICO();});
  var q=BD14_countQueue_(), ai=BD14_authIncidents_();

  var x7=d7.data||{}, x8=d8.data||{}, x9=d9.data||{}, x10=d10.data||{}, x11=d11.data||{}, x12=d12.data||{}, x13=d13.data||{};
  var expEval=null;
  try{ if(typeof BD141_evaluarExpedientes_==='function') expEval=BD141_evaluarExpedientes_(); }catch(e){}
  var expCoverage=expEval?!!expEval.status:!!x7.status;

  var adminCoverage=!!x8.status;
  var docsCoverage=!!x9.listoParaCutoverRelacional;
  var tallerCoverage=!!x10.listoParaCutoverRelacional;
  var authCoverage=!!x13.listoParaCutoverRelacional;
  var dualWriteOk=!!x12.status && !!(x12.configuracion&&x12.configuracion.dualWriteHabilitado) && q.pendientes===0;

  var modulos=[
    BD14_estadoModulo_('EXPEDIENTES',d7.ok,expCoverage,expCoverage,{diagnosticoStatus:!!x7.status,baselineExclusiones:expEval?expEval.baseline:[],diferenciasInesperadas:expEval?expEval.inesperados:[]}),
    BD14_estadoModulo_('ADMINISTRACION_SEGUIMIENTO',d8.ok,adminCoverage,adminCoverage,{diagnosticoStatus:!!x8.status}),
    BD14_estadoModulo_('DOCUMENTOS_CHECKLIST_HISTORIAL',d9.ok,docsCoverage,docsCoverage,{listoParaCutoverRelacional:!!x9.listoParaCutoverRelacional}),
    BD14_estadoModulo_('TALLER_ASESOR',d10.ok,tallerCoverage,tallerCoverage,{listoParaCutoverRelacional:!!x10.listoParaCutoverRelacional}),
    BD14_estadoModulo_('AUTH',d13.ok,authCoverage,authCoverage,{authMode:x13.authMode||'',incidenciasPendientes:ai.pendientes})
  ];
  var noAptos=modulos.filter(function(m){return !m.aptoParaLecturaRelacional;}).map(function(m){return m.modulo;});
  var errores=[];
  [d4,d7,d8,d9,d10,d11,d12,d13].forEach(function(d){if(!d.ok)errores.push(d.nombre+': '+d.error);});
  var advertencias=[];
  if(noAptos.length)advertencias.push('Hay módulos sin cobertura suficiente para RELATIONAL global: '+noAptos.join(', ')+'.');
  if(q.pendientes>0)advertencias.push('SYNC_PENDIENTES contiene '+q.pendientes+' evento(s) pendientes.');
  if(q.requiereRevision>0)advertencias.push('SYNC_PENDIENTES contiene '+q.requiereRevision+' evento(s) que requieren revisión.');
  if(ai.pendientes>0)advertencias.push('AUTH_MIRROR contiene '+ai.pendientes+' incidencia(s) pendientes.');
  if(!dualWriteOk)advertencias.push('Dual-write no está completamente limpio/activo para cierre de cutover.');

  var globalReady=errores.length===0 && noAptos.length===0 && q.pendientes===0 && q.requiereRevision===0 && ai.pendientes===0 && dualWriteOk;
  return {
    status:errores.length===0,
    fase:'BD-14',version:BD14_CONFIG.version,
    arquitectura:{mvcSoa:true,readMode:cfg.readMode||'MIRROR',writeMode:cfg.writeMode||'LEGACY',dualWriteHabilitado:!!(x12.configuracion&&x12.configuracion.dualWriteHabilitado),authMode:x13.authMode||'LEGACY'},
    integridad:{bd04Disponible:d4.ok,bd04Status:d4.ok&&d4.data?!!d4.data.status:null},
    sincronizacion:{bd11Status:!!x11.status,cola:q,authIncidencias:ai},
    modulos:modulos,
    noAptosParaCutoverGlobal:noAptos,
    listoParaCutoverGlobal:globalReady,
    modoSeguroRecomendado:globalReady?'RELATIONAL':'MIRROR',
    escrituraRelacionalDirectaHabilitada:false,
    legacySigueDisponible:true,
    errores:errores,
    advertencias:advertencias
  };
}
function BD14_PROBAR_DIAGNOSTICO(){var out=BD14_buildAudit_();Logger.log(JSON.stringify(out,null,2));return out;}
function BD14_PREVISUALIZAR_CUTOVER(){
  var a=BD14_buildAudit_();
  var out={status:a.status,fase:'BD-14',version:BD14_CONFIG.version,modoActual:a.arquitectura.readMode,writeMode:a.arquitectura.writeMode,listoParaCutoverGlobal:a.listoParaCutoverGlobal,noAptos:a.noAptosParaCutoverGlobal,siguientePaso:a.listoParaCutoverGlobal?'BD14_ACTIVAR_LECTURA_RELACIONAL_GLOBAL()':'BD14_MANTENER_MIRROR_SEGURO()',modificaDatos:false,errores:a.errores,advertencias:a.advertencias};
  Logger.log(JSON.stringify(out,null,2));return out;
}
