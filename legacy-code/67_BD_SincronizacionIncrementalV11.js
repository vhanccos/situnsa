/**
 * ==============================================================
 * BD-11 - SINCRONIZACION INCREMENTAL LEGACY -> RELACIONAL
 * ==============================================================
 * Alcance inicial:
 *   ASESORES, TALLERES, TALLER_SESIONES, TALLER_MATRICULAS,
 *   TALLER_ASISTENCIA.
 *
 * Principios:
 * - LEGACY sigue siendo la escritura productiva.
 * - La sincronizacion se ejecuta de forma explicita/manual.
 * - Upsert idempotente por PK legacy.
 * - No elimina registros relacionales.
 * - No crea expedientes/estudiantes faltantes para completar matriculas.
 * - No modifica fuentes legacy.
 * ==============================================================
 */

const BD11_CONFIG = Object.freeze({
  version: 'db-11.1-sync-integridad-pk',
  timezone: 'America/Lima',
  tablas: Object.freeze(['asesores','talleres','taller_sesiones','taller_matriculas','taller_asistencia'])
});

function BD11_txt_(v){ return String(v == null ? '' : v).trim(); }
function BD11_up_(v){ return BD11_txt_(v).toUpperCase(); }
function BD11_digits_(v){ return BD11_txt_(v).replace(/\D/g,''); }
function BD11_now_(){ return new Date(); }

function BD11_date_(v){
  if (!v) return '';
  if (Object.prototype.toString.call(v)==='[object Date]' && !isNaN(v.getTime())) return v;
  var s=BD11_txt_(v), m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if(m) return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]||0),Number(m[5]||0),Number(m[6]||0));
  var d=new Date(s);
  return isNaN(d.getTime()) ? '' : d;
}

function BD11_estadoProceso_(v){
  var s=BD11_up_(v).replace(/\s+/g,'_');
  if(!s) return 'PENDIENTE';
  if(s.indexOf('FINAL')>=0 || s.indexOf('COMPLET')>=0 || s==='TERMINADO') return 'FINALIZADO';
  if(s.indexOf('OBSERV')>=0) return 'OBSERVADO';
  if(s.indexOf('ANUL')>=0 || s.indexOf('CANCEL')>=0 || s==='INACTIVO') return 'ANULADO';
  if(s.indexOf('PROCES')>=0 || s.indexOf('CURSO')>=0 || s==='ACTIVO' || s.indexOf('PROGRAM')>=0 || s.indexOf('MATRICUL')>=0) return 'EN_PROCESO';
  return 'PENDIENTE';
}

function BD11_estadoRegistro_(v){
  var s=BD11_up_(v);
  if(s==='INACTIVO') return 'INACTIVO';
  if(s==='ELIMINADO') return 'ELIMINADO';
  return 'ACTIVO';
}

function BD11_asistencia_(v){
  var s=BD11_up_(v);
  if(!s) return 'PENDIENTE';
  if(['PRESENTE','P','SI','SÍ','X','OK','1','TRUE'].indexOf(s)>=0) return 'PRESENTE';
  if(['AUSENTE','A','NO','0','FALSE'].indexOf(s)>=0) return 'AUSENTE';
  if(s.indexOf('JUST')>=0) return 'JUSTIFICADO';
  if(['PENDIENTE','PRESENTE','AUSENTE','JUSTIFICADO'].indexOf(s)>=0) return s;
  return 'PENDIENTE';
}

function BD11_legacyRows_(spreadsheetId, sheetName){
  var sh=TT_sheet(spreadsheetId,sheetName), lr=sh.getLastRow(), lc=sh.getLastColumn();
  if(lr<2 || lc<1) return [];
  var vals=sh.getRange(1,1,lr,lc).getValues();
  var headers=vals[0].map(function(x){return BD11_up_(x);});
  return vals.slice(1).filter(function(r){return r.some(function(v){return v!==''&&v!=null;});}).map(function(r){
    var o={}; headers.forEach(function(h,i){if(h)o[h]=r[i];}); return o;
  });
}


function BD11_pkConflicts_(rows, campo){
  var seen={}, dup={};
  (rows||[]).forEach(function(x){
    var k=BD11_txt_(x[BD11_up_(campo)]);
    if(!k)return;
    if(seen[k]){dup[k]=(dup[k]||[seen[k]]);dup[k].push(x);}else seen[k]=x;
  });
  return dup;
}

function BD11_duplicateIds_(dup){
  return Object.keys(dup||{}).sort();
}

function BD11_isDuplicate_(dup,id){
  return !!(dup && dup[BD11_txt_(id)]);
}

function BD11_tableInfo_(tabla){
  var sh=BD5_tabla_(tabla), lastCol=sh.getLastColumn();
  var headers=sh.getRange(1,1,1,lastCol).getDisplayValues()[0].map(function(x){return BD11_up_(x);});
  var index={}; headers.forEach(function(h,i){if(h)index[h]=i;});
  return {sheet:sh,headers:headers,index:index};
}

function BD11_findRowByPk_(info,pk,value){
  var col=info.index[BD11_up_(pk)];
  if(col==null) throw new Error('PK '+pk+' no existe en '+info.sheet.getName());
  var lr=info.sheet.getLastRow(); if(lr<2)return -1;
  var vals=info.sheet.getRange(2,col+1,lr-1,1).getDisplayValues();
  var target=BD11_txt_(value);
  for(var i=0;i<vals.length;i++) if(BD11_txt_(vals[i][0])===target) return i+2;
  return -1;
}

function BD11_upsert_(tabla,obj){
  var def=BD1_MODELO_OBJETIVO[tabla];
  if(!def) throw new Error('Tabla fuera del modelo: '+tabla);
  var info=BD11_tableInfo_(tabla), pk=def.pk, pkv=BD11_txt_(obj[pk]);
  if(!pkv) throw new Error('PK vacía para '+tabla);
  var row=info.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'';});
  var n=BD11_findRowByPk_(info,pk,pkv);
  if(n>0){info.sheet.getRange(n,1,1,row.length).setValues([row]);return 'updated';}
  info.sheet.getRange(info.sheet.getLastRow()+1,1,1,row.length).setValues([row]);return 'inserted';
}

function BD11_indexRel_(tabla,campo){
  var out={}; (REPO_RelacionalV5.listar(tabla)||[]).forEach(function(x){var k=BD11_txt_(x[BD11_up_(campo)]);if(k)out[k]=x;}); return out;
}

function BD11_buildPlan_(){
  var ases=BD11_legacyRows_(TT_ID_ASE,'ASESORES');
  var tall=BD11_legacyRows_(TT_ID_TALL,'TALLERES');
  var ses=BD11_legacyRows_(TT_ID_TALL,'SESIONES');
  var mat=BD11_legacyRows_(TT_ID_TALL,'MATRICULADOS');
  var asi=BD11_legacyRows_(TT_ID_TALL,'ASISTENCIA');
  var relExp=BD11_indexRel_('expedientes','CODIGO_TRAMITE');
  var relEst=BD11_indexRel_('estudiantes','DNI');
  var relTall=BD11_indexRel_('talleres','ID_TALLER');
  var relMatByPair={};
  (REPO_RelacionalV5.listar('taller_matriculas')||[]).forEach(function(x){relMatByPair[BD11_txt_(x.ID_TALLER)+'|'+BD11_txt_(x.ID_ESTUDIANTE)]=x;});
  var legacyTallById={}; tall.forEach(function(x){legacyTallById[BD11_txt_(x.ID_TALLER)]=x;});

  var dupAses=BD11_pkConflicts_(ases,'ID_ASESOR'), dupTall=BD11_pkConflicts_(tall,'ID_TALLER'), dupSes=BD11_pkConflicts_(ses,'ID_SESION'), dupMat=BD11_pkConflicts_(mat,'ID_MATRICULA'), dupAsi=BD11_pkConflicts_(asi,'ID_ASISTENCIA');
  var plan={asesores:[],talleres:[],sesiones:[],matriculas:[],asistencia:[],omitidos:{matriculas:[],asistencia:[]},conflictos:{
    asesores:BD11_duplicateIds_(dupAses),talleres:BD11_duplicateIds_(dupTall),sesiones:BD11_duplicateIds_(dupSes),matriculas:BD11_duplicateIds_(dupMat),asistencia:BD11_duplicateIds_(dupAsi)
  }};
  ases.forEach(function(x){
    var id=BD11_txt_(x.ID_ASESOR); if(!id||BD11_isDuplicate_(dupAses,id))return;
    plan.asesores.push({
      ID_ASESOR:id,GRADO:BD11_txt_(x.GRADO),APELLIDOS_NOMBRES:BD11_up_(x.APELLIDOS_NOMBRES),DNI:BD11_digits_(x.DNI),
      CORREO:BD11_txt_(x.CORREO).toLowerCase(),TELEFONO:BD11_txt_(x.TELEFONO),USUARIO:BD11_txt_(x.USUARIO),PASSWORD_HASH:BD11_txt_(x.PASSWORD_HASH),
      ESTADO_REGISTRO:BD11_estadoRegistro_(x.ESTADO),CREADO_EN:BD11_date_(x.FECHA_REGISTRO),MODIFICADO_EN:BD11_now_()
    });
  });
  tall.forEach(function(x){
    var id=BD11_txt_(x.ID_TALLER); if(!id||BD11_isDuplicate_(dupTall,id))return;
    plan.talleres.push({
      ID_TALLER:id,NOMBRE:BD11_txt_(x.NOMBRE_TALLER),ID_ASESOR:BD11_txt_(x.ID_ASESOR),NRO_SESIONES:Number(x.NRO_SESIONES||0),
      FECHA_INICIO:BD11_date_(x.FECHA_INICIO),FECHA_FIN:BD11_date_(x.FECHA_FIN),ESTADO:BD11_estadoProceso_(x.ESTADO),CREADO_POR:BD11_txt_(x.CREADO_POR),
      CREADO_EN:BD11_date_(x.FECHA_CREACION),MODIFICADO_EN:BD11_now_()
    });
  });
  ses.forEach(function(x){
    var id=BD11_txt_(x.ID_SESION); if(!id||BD11_isDuplicate_(dupSes,id))return;
    plan.sesiones.push({ID_SESION:id,ID_TALLER:BD11_txt_(x.ID_TALLER),NRO_SESION:Number(x.NRO_SESION||0),FECHA:BD11_date_(x.FECHA),HORA_INICIO:x.HORA_INICIO||'',HORA_FIN:x.HORA_FIN||'',ESTADO:BD11_estadoProceso_(x.ESTADO)});
  });
  mat.forEach(function(x){
    var id=BD11_txt_(x.ID_MATRICULA), cod=BD11_up_(x.EXPEDIENTE), dni=BD11_digits_(x.DNI), idT=BD11_txt_(x.ID_TALLER);
    if(!id||BD11_isDuplicate_(dupMat,id))return;
    var exp=relExp[cod], est=relEst[dni];
    if(!exp||!est){plan.omitidos.matriculas.push({idMatricula:id,idTaller:idT,expediente:cod,dni:dni,motivo:!exp&&!est?'EXPEDIENTE_Y_ESTUDIANTE_NO_EXISTEN_EN_RELACIONAL':(!exp?'EXPEDIENTE_NO_EXISTE_EN_RELACIONAL':'ESTUDIANTE_NO_EXISTE_EN_RELACIONAL')});return;}
    var obj={ID_MATRICULA:id,ID_TALLER:idT,ID_EXPEDIENTE:exp.ID_EXPEDIENTE,ID_ESTUDIANTE:est.ID_ESTUDIANTE,ESTADO:BD11_estadoProceso_(x.ESTADO),FECHA_MATRICULA:BD11_date_(x.FECHA_MATRICULA)};
    plan.matriculas.push(obj); relMatByPair[idT+'|'+est.ID_ESTUDIANTE]=obj;
  });
  asi.forEach(function(x){
    var id=BD11_txt_(x.ID_ASISTENCIA), idT=BD11_txt_(x.ID_TALLER), dni=BD11_digits_(x.DNI), est=relEst[dni], matObj=est?relMatByPair[idT+'|'+est.ID_ESTUDIANTE]:null;
    if(!id||BD11_isDuplicate_(dupAsi,id))return;
    if(!est||!matObj){plan.omitidos.asistencia.push({idAsistencia:id,idTaller:idT,idSesion:BD11_txt_(x.ID_SESION),expediente:BD11_up_(x.EXPEDIENTE),dni:dni,motivo:!est?'ESTUDIANTE_NO_EXISTE_EN_RELACIONAL':'MATRICULA_NO_RESUELTA'});return;}
    var taller=relTall[idT]||legacyTallById[idT]||{};
    plan.asistencia.push({ID_ASISTENCIA:id,ID_SESION:BD11_txt_(x.ID_SESION),ID_MATRICULA:matObj.ID_MATRICULA,ID_ASESOR:BD11_txt_(x.ID_ASESOR)||BD11_txt_(taller.ID_ASESOR),ASISTENCIA:BD11_asistencia_(x.ASISTENCIA),OBSERVACION:BD11_txt_(x.OBSERVACION),REGISTRADO_EN:BD11_date_(x.FECHA_REGISTRO)});
  });
  return plan;
}

function BD11_PREVISUALIZAR_SINCRONIZACION(){
  var p=BD11_buildPlan_();
  var out={status:true,fase:'BD-11',version:BD11_CONFIG.version,modo:'PREVIEW',fuente:'LEGACY',destino:'RELACIONAL',upsert:true,eliminaRegistros:false,
    resolubles:{asesores:p.asesores.length,talleres:p.talleres.length,sesiones:p.sesiones.length,matriculas:p.matriculas.length,asistencia:p.asistencia.length},
    omitidos:{matriculas:p.omitidos.matriculas,asistencia:p.omitidos.asistencia},
    conflictosPKLegacy:p.conflictos,
    sincronizacionProtegida:true,
    modificaLegacy:false,modificaRelacional:false};
  Logger.log(JSON.stringify(out,null,2));return out;
}

function BD11_EJECUTAR_SINCRONIZACION(){
  var lock=LockService.getScriptLock();
  try{
    lock.waitLock(30000);
    var cfg=typeof BD6_GET_CONFIG==='function'?BD6_GET_CONFIG():{writeMode:'LEGACY'};
    if((cfg.writeMode||'LEGACY')!=='LEGACY') throw new Error('BD-11 exige writeMode LEGACY durante la sincronizacion controlada.');
    var p=BD11_buildPlan_(), r={}, errores=[];
    function sync(nombre,tabla,arr){
      var s={insertados:0,actualizados:0,errores:[]};
      arr.forEach(function(x){try{var a=BD11_upsert_(tabla,x);if(a==='inserted')s.insertados++;else s.actualizados++;}catch(e){s.errores.push({id:x[BD1_MODELO_OBJETIVO[tabla].pk]||'',error:e.message});}});
      if(s.errores.length)errores.push({tabla:tabla,errores:s.errores}); r[nombre]=s;
    }
    sync('asesores','asesores',p.asesores);
    sync('talleres','talleres',p.talleres);
    sync('sesiones','taller_sesiones',p.sesiones);
    sync('matriculas','taller_matriculas',p.matriculas);
    sync('asistencia','taller_asistencia',p.asistencia);
    var out={status:errores.length===0,fase:'BD-11',version:BD11_CONFIG.version,modo:'UPSERT_INCREMENTAL',resultado:r,
      omitidos:{matriculas:p.omitidos.matriculas,asistencia:p.omitidos.asistencia},conflictosPKLegacy:p.conflictos,eliminados:0,modificaLegacy:false,modificaRelacional:true,
      escrituraProductivaRelacionalHabilitada:false,writeMode:'LEGACY',errores:errores};
    Logger.log(JSON.stringify(out,null,2));return out;
  }finally{try{lock.releaseLock();}catch(e){}}
}

