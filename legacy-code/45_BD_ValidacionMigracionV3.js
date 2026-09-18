/** BD-03 - Validacion de integridad PK/FK y conteos. */
function BD3_leerObjetos_(tabla){
  var ss=BD2_abrirBase_(), sh=ss && ss.getSheetByName(BD2_nombreHoja_(tabla)); if(!sh||sh.getLastRow()<2) return [];
  var headers=BD1_MODELO_OBJETIVO[tabla].columnas, vals=sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues();
  return vals.map(function(r){var o={}; headers.forEach(function(h,i){o[h]=r[i];}); return o;});
}
function BD3_validarTabla_(tabla, cache){
  var def=BD1_MODELO_OBJETIVO[tabla], rows=cache[tabla], pk=def.pk, errores=[], seen={};
  rows.forEach(function(r,i){var id=BD3_txt_(r[pk]); if(!id) errores.push('PK vacía fila '+(i+2)); else if(seen[id]) errores.push('PK duplicada '+id); else seen[id]=true;});
  var fk=def.fk||{};
  Object.keys(fk).forEach(function(campo){var p=fk[campo].split('.'), refTabla=p[0], refCampo=p[1], refs={}; (cache[refTabla]||[]).forEach(function(x){refs[BD3_txt_(x[refCampo])]=true;}); rows.forEach(function(r,i){var v=BD3_txt_(r[campo]); if(v && !refs[v]) errores.push('FK '+campo+' inválida fila '+(i+2)+': '+v);});});
  return {tabla:tabla,registros:rows.length,ok:errores.length===0,errores:errores.slice(0,20)};
}
function BD3_PROBAR_DIAGNOSTICO(){
  var ss=BD2_abrirBase_(), out={status:true,fase:'BD-03',version:BD3_CONFIG.version,migracionEjecutada:false,tablas:[],totales:{tablas:0,registros:0,erroresIntegridad:0},datosLegacyModificados:false,errores:[]};
  if(!ss){out.status=false;out.errores.push('No existe BD-02');Logger.log(JSON.stringify(out,null,2));return out;}
  var cache={}; Object.keys(BD1_MODELO_OBJETIVO).forEach(function(t){cache[t]=BD3_leerObjetos_(t);});
  Object.keys(BD1_MODELO_OBJETIVO).forEach(function(t){var v=BD3_validarTabla_(t,cache); out.tablas.push(v);out.totales.tablas++;out.totales.registros+=v.registros;out.totales.erroresIntegridad+=v.errores.length;if(!v.ok) out.status=false;});
  out.migracionEjecutada=!!PropertiesService.getScriptProperties().getProperty('BD3_MIGRACION_INICIAL_AT');
  Logger.log(JSON.stringify(out,null,2)); return out;
}
function BD3_RESUMEN_DIAGNOSTICO(){
  var r=BD3_PROBAR_DIAGNOSTICO();
  var compacto={status:r.status,fase:r.fase,version:r.version,migracionEjecutada:r.migracionEjecutada,totales:r.totales,tablas:r.tablas.map(function(t){return {tabla:t.tabla,registros:t.registros,ok:t.ok,errores:t.errores.length};}),errores:r.errores,datosLegacyModificados:false};
  Logger.log(JSON.stringify(compacto,null,2)); return compacto;
}
