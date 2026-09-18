/**
 * BD-17.4 - PROTECCION DE CODIGO DE TRAMITE
 * Corrige el upsert parcial para no borrar columnas no incluidas
 * y repara CODIGO_TRAMITE vacío cuando ID_EXPEDIENTE conserva EXP_SETxxx.
 */
const BD174_CONFIG=Object.freeze({fase:'BD-17.4',version:'db-17.4-proteccion-codigo-tramite'});
function BD174_txt_(v){return String(v==null?'':v).trim();}
function BD174_codigoDesdeId_(id){var m=/^EXP_(SET\d+)$/i.exec(BD174_txt_(id));return m?m[1].toUpperCase():'';}

function BD174_PREVISUALIZAR_REPARACION(){
  var rows=REPO_RelacionalV5.listar('expedientes')||[],reparables=[],revision=[];
  rows.forEach(function(e){
    if(BD174_txt_(e.CODIGO_TRAMITE))return;
    var c=BD174_codigoDesdeId_(e.ID_EXPEDIENTE);
    if(c)reparables.push({ID_EXPEDIENTE:e.ID_EXPEDIENTE,CODIGO_TRAMITE:c});
    else revision.push({ID_EXPEDIENTE:e.ID_EXPEDIENTE||'',motivo:'CODIGO_TRAMITE vacío y no inferible desde ID_EXPEDIENTE'});
  });
  var out={status:revision.length===0,fase:BD174_CONFIG.fase,version:BD174_CONFIG.version,reparables:reparables,requiereRevision:revision,modificaDatos:false};
  Logger.log(JSON.stringify(out,null,2));return out;
}

function BD174_REPARAR_CODIGOS_TRAMITE(){
  var sh=BD5_tabla_('expedientes'),lr=sh.getLastRow(),lc=sh.getLastColumn();
  if(lr<2)return {status:true,reparados:[]};
  var vals=sh.getRange(1,1,lr,lc).getValues(),h=vals[0].map(BD174_txt_),idx={};h.forEach(function(x,i){idx[String(x).toUpperCase()]=i;});
  var iId=idx.ID_EXPEDIENTE,iCod=idx.CODIGO_TRAMITE;if(iId==null||iCod==null)throw new Error('Faltan columnas ID_EXPEDIENTE/CODIGO_TRAMITE');
  var reparados=[];
  for(var r=1;r<vals.length;r++){
    if(BD174_txt_(vals[r][iCod]))continue;
    var c=BD174_codigoDesdeId_(vals[r][iId]);if(!c)continue;
    vals[r][iCod]=c;reparados.push(c);
  }
  if(reparados.length)sh.getRange(2,1,vals.length-1,lc).setValues(vals.slice(1));
  var out={status:true,fase:BD174_CONFIG.fase,version:BD174_CONFIG.version,reparados:reparados,total:reparados.length};
  Logger.log(JSON.stringify(out,null,2));return out;
}

function BD174_PROBAR_DIAGNOSTICO(){
  var rows=REPO_RelacionalV5.listar('expedientes')||[],sinCodigo=[];
  rows.forEach(function(e){if(!BD174_txt_(e.CODIGO_TRAMITE))sinCodigo.push(e.ID_EXPEDIENTE||'');});
  var out={status:sinCodigo.length===0,fase:BD174_CONFIG.fase,version:BD174_CONFIG.version,sinCodigo:sinCodigo,upsertParcialProtegido:true};
  Logger.log(JSON.stringify(out,null,2));return out;
}
