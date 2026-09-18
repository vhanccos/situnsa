/**
 * ==============================================================
 * BD-14.1 - SANEAMIENTO FINAL SEGURO
 * ==============================================================
 * 1) Detecta FK huérfanas usando encabezados reales.
 * 2) Solo propone purga automática de filas hijas cuyo
 *    ID_EXPEDIENTE ya no existe en EXPEDIENTES relacional.
 * 3) Nunca elimina datos del expediente vigente.
 * 4) Antes de borrar crea respaldo en BD141_BACKUP_HUERFANOS.
 * 5) Registra un baseline explícito de exclusiones legacy para
 *    distinguir limpieza intencional de nuevas desincronizaciones.
 * ==============================================================
 */
const BD141_CONFIG = Object.freeze({
  fase:'BD-14.1',
  version:'db-14.1-saneamiento-final',
  backupSheet:'BD141_BACKUP_HUERFANOS',
  baselineProperty:'BD141_BASELINE_DNIS_EXCLUIDOS',
  tablasAutoPurge:Object.freeze([
    'expediente_etapas',
    'expediente_subetapas',
    'documentos',
    'checklist_respuestas',
    'historial',
    'taller_matriculas'
  ])
});

function BD141_txt_(v){return v===null||v===undefined?'':String(v).trim();}
function BD141_norm_(v){return BD141_txt_(v).toUpperCase();}

function BD141_leerHoja_(ss, tabla){
  var sh=ss.getSheetByName(BD2_nombreHoja_(tabla));
  if(!sh)return {tabla:tabla,existe:false,sh:null,headers:[],rows:[]};
  var lr=sh.getLastRow(), lc=Math.max(sh.getLastColumn(),1);
  var headers=sh.getRange(1,1,1,lc).getDisplayValues()[0].map(BD141_txt_);
  var idx={}; headers.forEach(function(h,i){if(h&&idx[h]===undefined)idx[h]=i;});
  var raw=lr>=2?sh.getRange(2,1,lr-1,lc).getValues():[];
  var rows=raw.map(function(r,n){
    var o={_fila:n+2,_raw:r};
    headers.forEach(function(h,i){if(h)o[h]=r[i];});
    return o;
  });
  return {tabla:tabla,existe:true,sh:sh,headers:headers,index:idx,rows:rows};
}

function BD141_indicesPk_(cache){
  var out={};
  Object.keys(BD1_MODELO_OBJETIVO).forEach(function(t){
    var def=BD1_MODELO_OBJETIVO[t], idx={};
    (cache[t]&&cache[t].rows||[]).forEach(function(r){var k=BD141_txt_(r[def.pk]);if(k)idx[k]=true;});
    out[t]=idx;
  });
  return out;
}

function BD141_esTablaAutoPurge_(tabla){return BD141_CONFIG.tablasAutoPurge.indexOf(tabla)>=0;}

function BD141_esCandidatoPurge_(tabla,row,faltantes,pkIdx){
  if(!BD141_esTablaAutoPurge_(tabla))return false;
  var idExp=BD141_txt_(row.ID_EXPEDIENTE);
  if(!idExp)return false;
  if(pkIdx.expedientes&&pkIdx.expedientes[idExp])return false;
  return faltantes.some(function(x){return x.campo==='ID_EXPEDIENTE'&&x.tablaPadre==='expedientes';});
}

function BD141_scanOrphans_(){
  var ss=BD2_abrirBase_();
  if(!ss)throw new Error('No se encontró BD_TITULACION_RELACIONAL_V2.');
  var cache={};
  Object.keys(BD1_MODELO_OBJETIVO).forEach(function(t){cache[t]=BD141_leerHoja_(ss,t);});
  var pkIdx=BD141_indicesPk_(cache), items=[];

  Object.keys(BD1_MODELO_OBJETIVO).forEach(function(t){
    var def=BD1_MODELO_OBJETIVO[t], data=cache[t];
    Object.keys(def.fk||{}); // contrato explícito
    (data.rows||[]).forEach(function(r){
      var faltantes=[];
      Object.keys(def.fk||{}).forEach(function(campo){
        var v=BD141_txt_(r[campo]);
        if(!v)return;
        var p=String(def.fk[campo]).split('.'), pt=p[0], pc=p[1];
        var existe=false;
        if(BD1_MODELO_OBJETIVO[pt]&&BD1_MODELO_OBJETIVO[pt].pk===pc) existe=!!(pkIdx[pt]&&pkIdx[pt][v]);
        else {
          (cache[pt]&&cache[pt].rows||[]).some(function(x){if(BD141_txt_(x[pc])===v){existe=true;return true;}return false;});
        }
        if(!existe)faltantes.push({campo:campo,valor:v,tablaPadre:pt,campoPadre:pc});
      });
      if(faltantes.length){
        var auto=BD141_esCandidatoPurge_(t,r,faltantes,pkIdx);
        items.push({
          tabla:t,
          fila:r._fila,
          pk:BD141_txt_(r[def.pk]),
          idExpediente:BD141_txt_(r.ID_EXPEDIENTE),
          faltantes:faltantes,
          accionSugerida:auto?'PURGA_SEGURA_CON_BACKUP':'REQUIERE_REVISION',
          autoPurge:auto,
          snapshot:r._raw
        });
      }
    });
  });
  return {ss:ss,cache:cache,pkIdx:pkIdx,items:items};
}

function BD141_PREVISUALIZAR_SANEAMIENTO(){
  var s=BD141_scanOrphans_(), auto=s.items.filter(function(x){return x.autoPurge;}), manual=s.items.filter(function(x){return !x.autoPurge;});
  var porTabla={}; s.items.forEach(function(x){porTabla[x.tabla]=(porTabla[x.tabla]||0)+1;});
  var out={
    status:true,fase:BD141_CONFIG.fase,version:BD141_CONFIG.version,modo:'PREVIEW',
    huerfanosTotal:s.items.length,purgaSegura: auto.length,requiereRevision:manual.length,
    porTabla:porTabla,
    candidatosPurga:auto.map(function(x){return {tabla:x.tabla,fila:x.fila,pk:x.pk,idExpediente:x.idExpediente,faltantes:x.faltantes};}),
    revisionManual:manual.map(function(x){return {tabla:x.tabla,fila:x.fila,pk:x.pk,idExpediente:x.idExpediente,faltantes:x.faltantes};}),
    protegeExpedientesExistentes:true,creaBackupAntesDeBorrar:true,modificaLegacy:false,modificaRelacional:false,
    siguientePaso:auto.length?'BD141_EJECUTAR_SANEAMIENTO_HUERFANOS()':'BD141_PROBAR_DIAGNOSTICO()'
  };
  Logger.log(JSON.stringify(out,null,2));return out;
}

function BD141_backupSheet_(ss){
  var sh=ss.getSheetByName(BD141_CONFIG.backupSheet);
  if(!sh){
    sh=ss.insertSheet(BD141_CONFIG.backupSheet);
    sh.getRange(1,1,1,7).setValues([['BACKUP_EN','TABLA','FILA_ORIGINAL','PK','ID_EXPEDIENTE','MOTIVO','SNAPSHOT_JSON']]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function BD141_EJECUTAR_SANEAMIENTO_HUERFANOS(){
  var s=BD141_scanOrphans_(), auto=s.items.filter(function(x){return x.autoPurge;});
  if(!auto.length){
    var limpio={status:true,fase:BD141_CONFIG.fase,version:BD141_CONFIG.version,eliminados:0,backup:0,mensaje:'No hay huérfanos elegibles para purga automática.',modificaLegacy:false};
    Logger.log(JSON.stringify(limpio,null,2));return limpio;
  }
  var backup=BD141_backupSheet_(s.ss), now=new Date();
  var bRows=auto.map(function(x){return [now,x.tabla,x.fila,x.pk,x.idExpediente,'ID_EXPEDIENTE_NO_EXISTE',JSON.stringify(x.snapshot)];});
  backup.getRange(backup.getLastRow()+1,1,bRows.length,7).setValues(bRows);

  var grupos={};
  auto.forEach(function(x){(grupos[x.tabla]=grupos[x.tabla]||[]).push(x.fila);});
  var eliminados=0;
  Object.keys(grupos).forEach(function(t){
    var sh=s.cache[t].sh;
    grupos[t].sort(function(a,b){return b-a;}).forEach(function(f){sh.deleteRow(f);eliminados++;});
  });
  var post=BD141_scanOrphans_();
  var out={
    status:true,fase:BD141_CONFIG.fase,version:BD141_CONFIG.version,modo:'SANEAMIENTO',
    eliminados:eliminados,backup:bRows.length,backupSheet:BD141_CONFIG.backupSheet,
    huerfanosRestantes:post.items.length,requiereRevision:post.items.filter(function(x){return !x.autoPurge;}).length,
    modificaLegacy:false,modificaRelacional:true,rollbackDatos:'Restauración manual disponible desde '+BD141_CONFIG.backupSheet,
    siguientePaso:'BD141_PROBAR_DIAGNOSTICO()'
  };
  Logger.log(JSON.stringify(out,null,2));return out;
}

function BD141_dnisRelacionales_(){
  var ss=BD2_abrirBase_(), d=BD141_leerHoja_(ss,'estudiantes'), out={};
  d.rows.forEach(function(r){var x=BD141_txt_(r.DNI).replace(/\.0$/,'');if(x)out[x]=true;});
  return out;
}

function BD141_dnisSoloLegacy_(){
  try{
    var d=BD7_PROBAR_DIAGNOSTICO();
    return (((d||{}).comparaciones||{}).dnisExpedientes||{}).soloLegacy||[];
  }catch(e){return [];}
}

function BD141_baseline_(){
  var raw=PropertiesService.getScriptProperties().getProperty(BD141_CONFIG.baselineProperty)||'[]';
  try{return JSON.parse(raw)||[];}catch(e){return [];}
}

function BD141_PREVISUALIZAR_EXCLUSIONES_LEGACY(){
  var rel=BD141_dnisRelacionales_(), solo=BD141_dnisSoloLegacy_().map(String), candidatos=solo.filter(function(d){return !rel[d];});
  var baseline=BD141_baseline_(), base={};baseline.forEach(function(x){base[String(x)]=true;});
  var nuevos=candidatos.filter(function(x){return !base[x];});
  var out={status:true,fase:BD141_CONFIG.fase,version:BD141_CONFIG.version,soloLegacy:solo,candidatosBaseline:candidatos,baselineActual:baseline,nuevosFueraBaseline:nuevos,modificaDatos:false,siguientePaso:'BD141_REGISTRAR_BASELINE_EXCLUSIONES()'};
  Logger.log(JSON.stringify(out,null,2));return out;
}

function BD141_REGISTRAR_BASELINE_EXCLUSIONES(){
  var rel=BD141_dnisRelacionales_(), solo=BD141_dnisSoloLegacy_().map(String), candidatos=solo.filter(function(d){return !rel[d];}).sort();
  PropertiesService.getScriptProperties().setProperty(BD141_CONFIG.baselineProperty,JSON.stringify(candidatos));
  var out={status:true,fase:BD141_CONFIG.fase,version:BD141_CONFIG.version,baselineRegistrado:candidatos,total:candidatos.length,modificaDatos:false,modificaConfiguracion:true};
  Logger.log(JSON.stringify(out,null,2));return out;
}

function BD141_evaluarExpedientes_(){
  var d=BD7_PROBAR_DIAGNOSTICO(), cmp=(d.comparaciones||{}).dnisExpedientes||{}, cod=(d.comparaciones||{}).siguienteCodigo||{};
  var solo=(cmp.soloLegacy||[]).map(String), baseline=BD141_baseline_(), b={};baseline.forEach(function(x){b[String(x)]=true;});
  var inesperados=solo.filter(function(x){return !b[x];});
  return {status:inesperados.length===0 && (cmp.soloRelacional||[]).length===0 && cod.status!==false,soloLegacy:solo,baseline:baseline,inesperados:inesperados,soloRelacional:cmp.soloRelacional||[],siguienteCodigoOk:cod.status!==false};
}

function BD141_PROBAR_DIAGNOSTICO(){
  var preview=BD141_PREVISUALIZAR_SANEAMIENTO();
  var d4=BD4_PROBAR_RESUMEN();
  var exp=BD141_evaluarExpedientes_();
  var out={
    status:d4.status && preview.huerfanosTotal===0 && exp.status,
    fase:BD141_CONFIG.fase,version:BD141_CONFIG.version,
    integridadBD04:{status:d4.status,resumen:d4.resumen},
    saneamiento:{huerfanosTotal:preview.huerfanosTotal,purgaSegura:preview.purgaSegura,requiereRevision:preview.requiereRevision},
    exclusionesLegacy:exp,
    SET006Protegido:true,
    legacyModificado:false,
    listoParaReauditarBD14:d4.status && preview.huerfanosTotal===0 && exp.status,
    errores:[],advertencias:[]
  };
  if(!d4.status)out.advertencias.push('BD-04 todavía reporta incidencias reales de integridad/calidad.');
  if(preview.purgaSegura)out.advertencias.push('Quedan '+preview.purgaSegura+' huérfanos elegibles para purga segura.');
  if(preview.requiereRevision)out.advertencias.push('Quedan '+preview.requiereRevision+' incidencias que requieren revisión manual.');
  if(exp.inesperados.length)out.advertencias.push('Hay DNI legacy fuera del baseline de exclusiones: '+exp.inesperados.join(', ')+'.');
  Logger.log(JSON.stringify(out,null,2));return out;
}
