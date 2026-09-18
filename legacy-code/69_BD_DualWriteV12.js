/**
 * ==============================================================
 * BD-12 - DUAL WRITE CONTROLADO / REPLICA POST-LEGACY
 * ==============================================================
 * Principios:
 * 1) LEGACY sigue siendo la fuente autoritativa de escritura.
 * 2) Solo después de una escritura legacy exitosa se intenta la réplica.
 * 3) Un fallo relacional NUNCA invalida la operación legacy ya confirmada.
 * 4) Los fallos se registran en SYNC_PENDIENTES para reintento.
 * 5) No se habilitan borrados automáticos en relacional.
 * 6) AUTH queda fuera de BD-12.
 * ==============================================================
 */

const BD12_CONFIG = Object.freeze({
  version: 'db-12.0-dual-write-controlado',
  propertyEnabled: 'BD12_DUAL_WRITE_ENABLED',
  queueSheet: 'SYNC_PENDIENTES',
  maxRetriesPerRun: 50,
  queueHeaders: Object.freeze([
    'ID_EVENTO','MODULO','OPERACION','REFERENCIA','PAYLOAD_JSON','ESTADO',
    'INTENTOS','ULTIMO_ERROR','CREADO_EN','ULTIMO_INTENTO','RESUELTO_EN'
  ])
});

function BD12_txt_(v){ return String(v == null ? '' : v).trim(); }
function BD12_up_(v){ return BD12_txt_(v).toUpperCase(); }
function BD12_now_(){ return new Date(); }
function BD12_enabled_(){
  return BD12_up_(PropertiesService.getScriptProperties().getProperty(BD12_CONFIG.propertyEnabled)) === 'TRUE';
}
function BD12_eventId_(){
  return 'SYNC_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Lima', 'yyyyMMdd_HHmmss_SSS') + '_' + Utilities.getUuid().slice(0,8).toUpperCase();
}
function BD12_base_(){
  if (typeof BD5_abrirBase_ === 'function') return BD5_abrirBase_();
  var id=PropertiesService.getScriptProperties().getProperty('BD_RELACIONAL_SPREADSHEET_ID');
  if(!id) throw new Error('No existe BD_RELACIONAL_SPREADSHEET_ID.');
  return SpreadsheetApp.openById(id);
}
function BD12_queueSheet_(create){
  var ss=BD12_base_();
  var sh=ss.getSheetByName(BD12_CONFIG.queueSheet);
  if(!sh && create){
    sh=ss.insertSheet(BD12_CONFIG.queueSheet);
    sh.getRange(1,1,1,BD12_CONFIG.queueHeaders.length).setValues([BD12_CONFIG.queueHeaders]);
    sh.setFrozenRows(1);
  }
  if(sh && sh.getLastColumn() < BD12_CONFIG.queueHeaders.length){
    sh.getRange(1,1,1,BD12_CONFIG.queueHeaders.length).setValues([BD12_CONFIG.queueHeaders]);
  }
  return sh;
}
function BD12_PREPARAR(){
  var sh=BD12_queueSheet_(true);
  var out={status:true,fase:'BD-12',version:BD12_CONFIG.version,cola:sh.getName(),dualWriteHabilitado:BD12_enabled_(),writeMode:(typeof BD6_GET_CONFIG==='function'?BD6_GET_CONFIG().writeMode:'LEGACY'),modificaLegacy:false,modificaTablasRelacionalesBase:false,creaSoloInfraestructuraAuxiliar:true};
  Logger.log(JSON.stringify(out,null,2)); return out;
}
function BD12_ACTIVAR_DUAL_WRITE(){
  BD12_queueSheet_(true);
  var cfg=typeof BD6_GET_CONFIG==='function'?BD6_GET_CONFIG():{writeMode:'LEGACY'};
  if((cfg.writeMode||'LEGACY')!=='LEGACY') throw new Error('BD-12 exige WRITE=LEGACY.');
  PropertiesService.getScriptProperties().setProperty(BD12_CONFIG.propertyEnabled,'TRUE');
  var out={status:true,fase:'BD-12',version:BD12_CONFIG.version,dualWriteHabilitado:true,writeMode:'LEGACY',fuenteAutoritativa:'LEGACY',replica:'RELACIONAL'};
  Logger.log(JSON.stringify(out,null,2)); return out;
}
function BD12_DESACTIVAR_DUAL_WRITE(){
  PropertiesService.getScriptProperties().setProperty(BD12_CONFIG.propertyEnabled,'FALSE');
  var out={status:true,fase:'BD-12',version:BD12_CONFIG.version,dualWriteHabilitado:false,writeMode:'LEGACY',rollback:true};
  Logger.log(JSON.stringify(out,null,2)); return out;
}

function BD12_mergeUpsert_(tabla,obj){
  var def=BD1_MODELO_OBJETIVO[tabla];
  if(!def) throw new Error('Tabla fuera del modelo: '+tabla);
  var info=BD11_tableInfo_(tabla), pk=def.pk, pkv=BD12_txt_(obj[pk]);
  if(!pkv) throw new Error('PK vacía para '+tabla);
  var n=BD11_findRowByPk_(info,pk,pkv);
  if(n>0){
    var row=info.sheet.getRange(n,1,1,info.headers.length).getValues()[0];
    info.headers.forEach(function(h,i){ if(Object.prototype.hasOwnProperty.call(obj,h)) row[i]=obj[h]; });
    info.sheet.getRange(n,1,1,row.length).setValues([row]);
    return 'updated';
  }
  var nueva=info.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';});
  info.sheet.getRange(info.sheet.getLastRow()+1,1,1,nueva.length).setValues([nueva]);
  return 'inserted';
}

function BD12_upsertMany_(tabla,rows,res){
  (rows||[]).forEach(function(x){
    var accion=BD12_mergeUpsert_(tabla,x);
    res[tabla]=res[tabla]||{insertados:0,actualizados:0};
    if(accion==='inserted')res[tabla].insertados++; else res[tabla].actualizados++;
  });
}

function BD12_syncPhysicalExpediente_(codigo){
  if(typeof BD91_contexto_!=='function' || typeof BD91_EXPEDIENTE_PHYSICAL_MAP==='undefined') return {actualizado:false,motivo:'BD91_NO_DISPONIBLE'};
  var ctx=BD91_contexto_(), leg=BD91_matrix_(ctx.legacy), rel=BD91_matrix_(ctx.rel), buscado=BD12_up_(codigo), src=null;
  for(var i=1;i<leg.values.length;i++){
    if(BD12_up_(BD91_get_(leg.values[i],leg.idx,'N° DE TRÁMITE'))===buscado){src=leg.values[i];break;}
  }
  if(!src) return {actualizado:false,motivo:'EXPEDIENTE_LEGACY_NO_ENCONTRADO'};
  for(var r=1;r<rel.values.length;r++){
    if(BD12_up_(BD91_get_(rel.values[r],rel.idx,'CODIGO_TRAMITE'))!==buscado) continue;
    Object.keys(BD91_EXPEDIENTE_PHYSICAL_MAP).forEach(function(tag){
      var dest=BD91_EXPEDIENTE_PHYSICAL_MAP[tag];
      if(dest in rel.idx && tag in leg.idx) rel.values[r][rel.idx[dest]]=BD91_get_(src,leg.idx,tag);
    });
    if('FECHA_CREACION' in rel.idx && 'FECHA DE EXP' in leg.idx) rel.values[r][rel.idx.FECHA_CREACION]=BD91_get_(src,leg.idx,'FECHA DE EXP');
    ctx.rel.getRange(r+1,1,1,rel.headers.length).setValues([rel.values[r]]);
    return {actualizado:true};
  }
  return {actualizado:false,motivo:'EXPEDIENTE_RELACIONAL_NO_ENCONTRADO'};
}

function BD12_codigoDesdePayload_(ref,payload){
  payload=payload||{};
  var direct=BD12_up_(ref||payload.codigo||payload.expediente||payload.CODIGO_TRAMITE||payload['N° DE TRÁMITE']);
  if(/^SET\d+$/i.test(direct)) return direct;
  var dni=BD12_txt_(payload.dni||payload.DNI||ref).replace(/\D/g,'');
  if(!dni) return '';
  var db=BD3_construirDataset_();
  var est=(db.estudiantes||[]).filter(function(x){return BD12_txt_(x.DNI)===dni;})[0];
  if(!est)return '';
  var rel=(db.expediente_estudiantes||[]).filter(function(x){return x.ID_ESTUDIANTE===est.ID_ESTUDIANTE;})[0];
  if(!rel)return '';
  var exp=(db.expedientes||[]).filter(function(x){return x.ID_EXPEDIENTE===rel.ID_EXPEDIENTE;})[0];
  return exp?BD12_up_(exp.CODIGO_TRAMITE):'';
}

function BD12_syncExpediente_(codigo){
  codigo=BD12_up_(codigo); if(!codigo) throw new Error('No se pudo resolver el expediente para réplica.');
  var db=BD3_construirDataset_(), res={};
  var exp=(db.expedientes||[]).filter(function(x){return BD12_up_(x.CODIGO_TRAMITE)===codigo;})[0];
  if(!exp) throw new Error('Expediente '+codigo+' no encontrado en fuente legacy.');
  var idExp=exp.ID_EXPEDIENTE;
  var exRel=(db.expediente_estudiantes||[]).filter(function(x){return x.ID_EXPEDIENTE===idExp;});
  var idsEst={}; exRel.forEach(function(x){idsEst[x.ID_ESTUDIANTE]=true;});
  var est=(db.estudiantes||[]).filter(function(x){return idsEst[x.ID_ESTUDIANTE];});
  var idsPrg={}; est.forEach(function(x){if(x.ID_PROGRAMA)idsPrg[x.ID_PROGRAMA]=true;});
  var prg=(db.programas||[]).filter(function(x){return idsPrg[x.ID_PROGRAMA];});
  var usr=(db.usuarios||[]).filter(function(x){return x.ID_USUARIO===exp.ID_USUARIO_ADMIN;});
  var sub=(db.expediente_subetapas||[]).filter(function(x){return x.ID_EXPEDIENTE===idExp;});
  var idsSub={}; sub.forEach(function(x){idsSub[x.ID_SUBETAPA]=true;});
  var subCat=(db.subetapas_catalogo||[]).filter(function(x){return idsSub[x.ID_SUBETAPA];});
  var idsEt={}; subCat.forEach(function(x){idsEt[x.ID_ETAPA]=true;});
  var etCat=(db.etapas_catalogo||[]).filter(function(x){return idsEt[x.ID_ETAPA];});
  var et=(db.expediente_etapas||[]).filter(function(x){return x.ID_EXPEDIENTE===idExp;});
  var docs=(db.documentos||[]).filter(function(x){return x.ID_EXPEDIENTE===idExp;});
  var chkR=(db.checklist_respuestas||[]).filter(function(x){return x.ID_EXPEDIENTE===idExp;});
  var idsChk={}; chkR.forEach(function(x){idsChk[x.ID_CHECKLIST_ITEM]=true;});
  var chkI=(db.checklist_items||[]).filter(function(x){return idsChk[x.ID_CHECKLIST_ITEM];});
  var hist=(db.historial||[]).filter(function(x){return x.ID_EXPEDIENTE===idExp;});
  BD12_upsertMany_('usuarios',usr,res); BD12_upsertMany_('programas',prg,res); BD12_upsertMany_('estudiantes',est,res);
  BD12_upsertMany_('expedientes',[exp],res); BD12_syncPhysicalExpediente_(codigo);
  BD12_upsertMany_('expediente_estudiantes',exRel,res); BD12_upsertMany_('etapas_catalogo',etCat,res); BD12_upsertMany_('subetapas_catalogo',subCat,res);
  BD12_upsertMany_('expediente_etapas',et,res); BD12_upsertMany_('expediente_subetapas',sub,res);
  BD12_upsertMany_('documentos',docs,res); BD12_upsertMany_('checklist_items',chkI,res); BD12_upsertMany_('checklist_respuestas',chkR,res); BD12_upsertMany_('historial',hist,res);
  // BD-15.1: sincroniza también la identidad INVITADO del/los estudiante(s)
  // sin persistir contraseña en texto plano en la tabla relacional usuarios.
  if(typeof BD151_syncInvitadosExpediente_==='function') BD151_syncInvitadosExpediente_(codigo,res);
  if(typeof BD92_ACTUALIZAR_VISTA==='function') { try{BD92_ACTUALIZAR_VISTA();}catch(ignore){} }
  return {status:true,expediente:codigo,resultado:res};
}

function BD12_syncTaller_(operacion){
  if(typeof BD11_buildPlan_!=='function') throw new Error('BD-11 no disponible para réplica de Taller/Asesor.');
  var p=BD11_buildPlan_(), res={}, op=BD12_up_(operacion);
  if(op.indexOf('ASESOR')>=0){BD12_upsertMany_('asesores',p.asesores,res);}
  else if(op.indexOf('TALLER')>=0){BD12_upsertMany_('asesores',p.asesores,res);BD12_upsertMany_('talleres',p.talleres,res);BD12_upsertMany_('taller_sesiones',p.sesiones,res);}
  else if(op.indexOf('MATRIC')>=0){BD12_upsertMany_('taller_matriculas',p.matriculas,res);}
  else if(op.indexOf('ASIST')>=0){BD12_upsertMany_('taller_asistencia',p.asistencia,res);}
  else {BD12_upsertMany_('asesores',p.asesores,res);BD12_upsertMany_('talleres',p.talleres,res);BD12_upsertMany_('taller_sesiones',p.sesiones,res);BD12_upsertMany_('taller_matriculas',p.matriculas,res);BD12_upsertMany_('taller_asistencia',p.asistencia,res);}
  return {status:true,resultado:res,omitidos:p.omitidos,conflictosPKLegacy:p.conflictos};
}

function BD12_executeEvent_(modulo,operacion,ref,payload){
  modulo=BD12_up_(modulo); operacion=BD12_up_(operacion); payload=payload||{};
  if(operacion.indexOf('ELIMINAR')>=0 || operacion.indexOf('BORRAR')>=0){
    return {status:true,replicado:false,reconciliacionRequerida:true,motivo:'BORRADO_RELACIONAL_AUTOMATICO_BLOQUEADO'};
  }
  if(modulo==='TALLER' || modulo==='ASESOR') return BD12_syncTaller_(operacion);
  if(['EXPEDIENTE','ADMINISTRACION','SEGUIMIENTO','DOCUMENTOS','CHECKLIST','HISTORIAL'].indexOf(modulo)>=0){
    var codigo=BD12_codigoDesdePayload_(ref,payload);
    return BD12_syncExpediente_(codigo);
  }
  return {status:true,replicado:false,motivo:'MODULO_NO_REPLICADO_EN_BD12'};
}

function BD12_appendQueue_(modulo,operacion,ref,payload,error,estado){
  var sh=BD12_queueSheet_(true), now=BD12_now_();
  sh.appendRow([BD12_eventId_(),BD12_up_(modulo),BD12_up_(operacion),BD12_txt_(ref),JSON.stringify(payload||{}),estado||'PENDIENTE',1,BD12_txt_(error),now,now,'']);
}

function BD12_afterLegacySafe_(modulo,operacion,ref,payload){
  if(!BD12_enabled_()) return {status:true,dualWrite:false,motivo:'BD12_DESHABILITADO'};
  try{
    var r=BD12_executeEvent_(modulo,operacion,ref,payload||{});
    if(r && r.reconciliacionRequerida) BD12_appendQueue_(modulo,operacion,ref,payload,r.motivo,'REQUIERE_REVISION');
    return {status:true,dualWrite:true,replica:r};
  }catch(e){
    try{BD12_appendQueue_(modulo,operacion,ref,payload,e.message,'PENDIENTE');}catch(qe){Logger.log('[BD-12] No se pudo registrar cola: '+qe.message);}
    Logger.log('[BD-12] Replica fallida sin afectar LEGACY: '+(e.stack||e.message||e));
    return {status:false,dualWrite:true,legacyConfirmado:true,replicaPendiente:true,error:e.message};
  }
}

function BD12_REINTENTAR_PENDIENTES(){
  var sh=BD12_queueSheet_(true), lr=sh.getLastRow();
  if(lr<2) return {status:true,fase:'BD-12',procesados:0,resueltos:0,fallidos:0};
  var vals=sh.getRange(2,1,lr-1,BD12_CONFIG.queueHeaders.length).getValues(), idx={}; BD12_CONFIG.queueHeaders.forEach(function(h,i){idx[h]=i;});
  var procesados=0,resueltos=0,fallidos=0;
  for(var i=0;i<vals.length && procesados<BD12_CONFIG.maxRetriesPerRun;i++){
    if(BD12_up_(vals[i][idx.ESTADO])!=='PENDIENTE')continue; procesados++;
    var payload={}; try{payload=JSON.parse(vals[i][idx.PAYLOAD_JSON]||'{}');}catch(ignore){}
    try{
      BD12_executeEvent_(vals[i][idx.MODULO],vals[i][idx.OPERACION],vals[i][idx.REFERENCIA],payload);
      vals[i][idx.ESTADO]='RESUELTO'; vals[i][idx.RESUELTO_EN]=BD12_now_(); vals[i][idx.ULTIMO_ERROR]=''; resueltos++;
    }catch(e){ vals[i][idx.INTENTOS]=Number(vals[i][idx.INTENTOS]||0)+1; vals[i][idx.ULTIMO_ERROR]=e.message; fallidos++; }
    vals[i][idx.ULTIMO_INTENTO]=BD12_now_();
  }
  sh.getRange(2,1,vals.length,BD12_CONFIG.queueHeaders.length).setValues(vals);
  var out={status:fallidos===0,fase:'BD-12',version:BD12_CONFIG.version,procesados:procesados,resueltos:resueltos,fallidos:fallidos};
  Logger.log(JSON.stringify(out,null,2));return out;
}

function BD12_PREVISUALIZAR(){
  var cfg=typeof BD6_GET_CONFIG==='function'?BD6_GET_CONFIG():{readMode:'MIRROR',writeMode:'LEGACY'};
  var out={status:true,fase:'BD-12',version:BD12_CONFIG.version,modo:'PREVIEW',dualWriteActual:BD12_enabled_(),readMode:cfg.readMode,writeMode:cfg.writeMode||'LEGACY',fuenteAutoritativa:'LEGACY',replica:'RELACIONAL',replicaSoloPostExitoLegacy:true,falloReplicaNoRompeLegacy:true,borradoRelacionalAutomatico:false,authIncluido:false,modificaLegacy:false,modificaRelacional:false,siguientePaso:'BD12_PREPARAR()'};
  Logger.log(JSON.stringify(out,null,2));return out;
}

