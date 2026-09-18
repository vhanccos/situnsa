/**
 * V23.2 · Autoguardado + sincronización documental automática.
 * El formulario es la fuente de verdad. No requiere botón de insertar.
 */
const AUTOSYNC232_CONFIG = Object.freeze({version:'23.2.0'});
function AUTOSYNC232_txt_(v){return String(v==null?'':v).trim();}
function AUTOSYNC232_escape_(v){return String(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function AUTOSYNC232_norm_(o){
  o=o||{}; var n={}; Object.keys(o).forEach(function(k){n[String(k).trim().toUpperCase()]=o[k];});
  function alias(dst,ks){if(AUTOSYNC232_txt_(n[dst]))return; for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(AUTOSYNC232_txt_(v)){n[dst]=v;return;}}}
  alias('NOMBRES',['nombres','NOMBRES']); alias('DNI',['dni','DNI']); alias('CUI',['cui','CUI']);
  alias('CORREO',['correo','CORREO']); alias('PROGRAMAS',['programas','programa','PROGRAMAS']);
  alias('TESIS',['tesis','TESIS']); alias('MODALIDAD',['modalidad','MODALIDAD']); alias('ASESOR',['asesor','ASESOR']);
  alias('PRESIDENTE',['presidente','PRESIDENTE']); alias('SECRETARIO',['secretario','SECRETARIO']); alias('COASESOR',['coasesor','COASESOR']);
  alias('DECRETO',['decreto','DECRETO']); alias('OFICIO',['oficio','OFICIO']); alias('RECOMENDACION',['recomendacion','RECOMENDACION']);
  alias('FECHA APERTURA',['fechaApertura','FECHA_APERTURA']); alias('FECHA PRESENTACION',['fechaPresentacion','FECHA_PRESENTACION']);
  alias('NACIONALIDAD',['nacionalidad']); alias('CIUDAD',['ciudad']); alias('TELEFONO',['telefono']); alias('DIRECCION',['direccion']);
  alias('N° DE TRÁMITE',['expediente','CODIGO_TRAMITE']); alias('EXPEDIENTE',['expediente','CODIGO_TRAMITE']);
  return n;
}
function AUTOSYNC232_campos_(a,b){var set={},out=[];Object.keys(a||{}).concat(Object.keys(b||{})).forEach(function(k){k=String(k).trim().toUpperCase();if(k&&!set[k]){set[k]=1;out.push(k);}});return out;}
function AUTOSYNC232_reemplazarCont_(c,antes,despues){
  if(!c)return 0; var total=0;
  AUTOSYNC232_campos_(antes,despues).forEach(function(k){
    var nv=AUTOSYNC232_txt_(despues[k]), ov=AUTOSYNC232_txt_(antes[k]); if(!nv)return;
    try{var tag='<<'+k+'>>'; if(c.findText(AUTOSYNC232_escape_(tag))){c.replaceText(AUTOSYNC232_escape_(tag),nv);total++;return;}}catch(e){}
    if(ov && ov!==nv && ov.length>=2){try{if(c.findText(AUTOSYNC232_escape_(ov))){c.replaceText(AUTOSYNC232_escape_(ov),nv);total++;}}catch(e){}}
  }); return total;
}
function AUTOSYNC232_actualizarDoc_(id,antes,despues){
  var d=DocumentApp.openById(id),n=0;n+=AUTOSYNC232_reemplazarCont_(d.getBody(),antes,despues);
  try{n+=AUTOSYNC232_reemplazarCont_(d.getHeader(),antes,despues);}catch(e){}
  try{n+=AUTOSYNC232_reemplazarCont_(d.getFooter(),antes,despues);}catch(e){}
  d.saveAndClose();return n;
}
function AUTOSYNC232_docs_(exp){
  var out=[],seen={},idx=OPERATIVA21_LEER_INDICE_DOCUMENTOS(exp);
  [1,2].forEach(function(e){(idx.porEtapa[e]||[]).forEach(function(d){if(d.id&&!seen[d.id]){seen[d.id]=1;out.push(d);}});});
  if(!idx.completo){try{var f=buscarCarpetaExpediente(exp);(obtenerDocumentosCarpeta(f)||[]).forEach(function(d){if(d.id&&!seen[d.id]){seen[d.id]=1;out.push(d);}});}catch(e){}}
  return out;
}
function AUTOSYNC232_GUARDAR_Y_SINCRONIZAR(datos){
  datos=datos||{};var id=AUTOSYNC232_txt_(datos.expediente||datos.dni||datos.DNI);if(!id)return{status:false,message:'No se pudo identificar el expediente.'};
  var antResp=SOA_AdministracionV3Service.obtener(id),antes=AUTOSYNC232_norm_((antResp&&antResp.status===false)?{}:antResp);
  var guardado=SOA_FrontendV7Service.guardarInformacionAdmin(datos);if(!guardado||guardado.status===false)return guardado||{status:false,message:'No se pudo guardar.'};
  var exp=AUTOSYNC232_txt_(guardado.expediente||datos.expediente||antes.EXPEDIENTE||id).toUpperCase();
  try{if(typeof BD18_INVALIDAR_EXPEDIENTE==='function')BD18_INVALIDAR_EXPEDIENTE(exp);}catch(e){}
  var nuevoResp=SOA_AdministracionV3Service.obtener(exp),despues=AUTOSYNC232_norm_((nuevoResp&&nuevoResp.status===false)?datos:nuevoResp);
  var docs=AUTOSYNC232_docs_(exp),procesados=0,cambios=0,errores=[];
  docs.forEach(function(x){try{var f=DriveApp.getFileById(x.id);if(f.getMimeType()!==MimeType.GOOGLE_DOCS)return;cambios+=AUTOSYNC232_actualizarDoc_(x.id,antes,despues);procesados++;}catch(e){errores.push({id:x.id,nombre:x.nombre||'',error:e.message||String(e)});}});
  return {status:true,expediente:exp,documentosSincronizados:procesados,cambiosDocumentales:cambios,erroresDocumentales:errores,message:'Guardado automático y sincronización documental completados.'};
}
function AUTOSYNC232_DIAGNOSTICO(){return{status:true,version:AUTOSYNC232_CONFIG.version,indice:typeof OPERATIVA21_LEER_INDICE_DOCUMENTOS==='function',servicio:typeof SOA_AdministracionV3Service!=='undefined',documentApp:typeof DocumentApp!=='undefined'};}
