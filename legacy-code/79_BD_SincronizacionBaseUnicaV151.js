/**
 * ==============================================================
 * BD-15.1 - SINCRONIZACION COMPAT -> RELACIONAL EN BASE UNICA
 * ==============================================================
 * Objetivo:
 * - Mantener el flujo funcional actual sobre COMPAT_*.
 * - Replicar automáticamente cada operación a las tablas relacionales.
 * - Recuperar expedientes ya creados después de BD-15.
 * - No volver a usar Google Sheets externos.
 * - Mantener Drive intacto.
 * ==============================================================
 */

const BD151_CONFIG = Object.freeze({
  fase:'BD-15.1',
  version:'db-15.1-sync-compat-relacional',
  propertyEnabled:'BD151_SYNC_ENABLED'
});

function BD151_txt_(v){ return String(v == null ? '' : v).trim(); }
function BD151_up_(v){ return BD151_txt_(v).toUpperCase(); }
function BD151_digits_(v){ return BD151_txt_(v).replace(/\D/g,''); }
function BD151_enabled_(){
  return BD151_up_(PropertiesService.getScriptProperties().getProperty(BD151_CONFIG.propertyEnabled)||'TRUE')==='TRUE';
}
function BD151_ss_(){
  if(typeof BD15_CONFIG==='undefined') throw new Error('BD-15 no está instalado.');
  return SpreadsheetApp.openById(BD15_CONFIG.spreadsheetId);
}
function BD151_sheet_(name){
  var sh=BD151_ss_().getSheetByName(name);
  if(!sh) throw new Error('No existe la hoja '+name+' en '+BD15_CONFIG.spreadsheetName+'.');
  return sh;
}
function BD151_matrix_(sh){
  var lc=sh.getLastColumn(), lr=sh.getLastRow();
  if(!lc || !lr) return {headers:[],idx:{},rows:[]};
  var vals=sh.getRange(1,1,lr,lc).getValues();
  var headers=(vals[0]||[]).map(function(x){return BD151_txt_(x);});
  var idx={}; headers.forEach(function(h,i){if(h && idx[h]==null)idx[h]=i;});
  return {headers:headers,idx:idx,rows:vals.slice(1)};
}
function BD151_v_(row,idx,names){
  names=Array.isArray(names)?names:[names];
  for(var i=0;i<names.length;i++){
    var n=names[i];
    if(idx[n]!=null && row[idx[n]]!=='' && row[idx[n]]!=null) return row[idx[n]];
  }
  return '';
}

function BD151_codigosCompat_(){
  var m=BD151_matrix_(BD151_sheet_('COMPAT_EXPEDIENTES')), out=[];
  m.rows.forEach(function(r){
    var c=BD151_up_(BD151_v_(r,m.idx,['N° DE TRÁMITE','N° DE TRAMITE','EXPEDIENTE']));
    if(c && out.indexOf(c)<0) out.push(c);
  });
  return out.sort();
}

function BD151_dnisExpedienteCompat_(codigo){
  codigo=BD151_up_(codigo);
  var m=BD151_matrix_(BD151_sheet_('COMPAT_EXPEDIENTES'));
  for(var i=0;i<m.rows.length;i++){
    var r=m.rows[i], c=BD151_up_(BD151_v_(r,m.idx,['N° DE TRÁMITE','N° DE TRAMITE','EXPEDIENTE']));
    if(c!==codigo) continue;
    var out=[];
    ['DNI','DNI02'].forEach(function(k){var d=BD151_digits_(BD151_v_(r,m.idx,k)); if(d && out.indexOf(d)<0)out.push(d);});
    return out;
  }
  return [];
}

function BD151_findInvitado_(dni){
  dni=BD151_digits_(dni);
  var m=BD151_matrix_(BD151_sheet_('COMPAT_INVITADOS'));
  for(var i=0;i<m.rows.length;i++){
    var r=m.rows[i], u=BD151_digits_(BD151_v_(r,m.idx,['Usuario','USUARIO','DNI']));
    if(u!==dni) continue;
    return {
      legacyId:BD151_txt_(BD151_v_(r,m.idx,['ID','Id'])),
      usuario:dni,
      password:BD151_txt_(BD151_v_(r,m.idx,['Contraseña','CONTRASEÑA','CONTRASENA','CUI'])),
      nombre:BD151_txt_(BD151_v_(r,m.idx,['Nombre','NOMBRE','APELLIDOS_NOMBRES'])),
      correo:BD151_txt_(BD151_v_(r,m.idx,['Correo','CORREO'])).toLowerCase(),
      estado:BD151_up_(BD151_v_(r,m.idx,['Estado','ESTADO']))==='INACTIVO'?'INACTIVO':'ACTIVO'
    };
  }
  return null;
}

function BD151_syncInvitadosExpediente_(codigo,resumen){
  if(!BD151_enabled_()) return {status:true,omitido:true,motivo:'BD151_DESHABILITADO'};
  if(typeof BD13_upsertIdentity_!=='function') return {status:false,omitido:true,motivo:'BD13_NO_DISPONIBLE'};
  var dnis=BD151_dnisExpedienteCompat_(codigo), out={insertados:0,actualizados:0,omitidos:[]};
  dnis.forEach(function(dni){
    var inv=BD151_findInvitado_(dni);
    if(!inv){out.omitidos.push({dni:dni,motivo:'NO_EXISTE_EN_COMPAT_INVITADOS'});return;}
    if(!inv.password){out.omitidos.push({dni:dni,motivo:'CREDENCIAL_VACIA'});return;}
    try{
      var accion=BD13_upsertIdentity_({
        tipo:'INVITADO',legacyId:inv.legacyId,usuario:inv.usuario,password:inv.password,
        nombre:inv.nombre,rol:'invitado',correo:inv.correo,estado:inv.estado
      });
      out[accion==='inserted'?'insertados':'actualizados']++;
    }catch(e){out.omitidos.push({dni:dni,motivo:e.message});}
  });
  if(resumen) resumen.usuariosInvitados=out;
  return {status:true,resultado:out};
}

function BD151_SINCRONIZAR_EXPEDIENTE(codigo){
  codigo=BD151_up_(codigo);
  if(!codigo) throw new Error('Indique el código de expediente, por ejemplo SET007.');
  if(typeof BD12_syncExpediente_!=='function') throw new Error('BD-12 no está disponible.');
  var r=BD12_syncExpediente_(codigo);
  var out={status:true,fase:BD151_CONFIG.fase,version:BD151_CONFIG.version,expediente:codigo,resultado:r,baseUnica:BD15_CONFIG.spreadsheetName};
  Logger.log(JSON.stringify(out,null,2)); return out;
}

function BD151_SINCRONIZAR_TODO(){
  var codigos=BD151_codigosCompat_(), ok=0, errores=[];
  codigos.forEach(function(c){
    try{BD12_syncExpediente_(c);ok++;}
    catch(e){errores.push({expediente:c,error:e.message});}
  });
  // Taller/asesores también se reconstruyen desde COMPAT_* de la misma base.
  var taller=null;
  try{ if(typeof BD12_syncTaller_==='function') taller=BD12_syncTaller_('SINCRONIZAR_TODO'); }catch(e){errores.push({modulo:'TALLER',error:e.message});}
  var out={status:errores.length===0,fase:BD151_CONFIG.fase,version:BD151_CONFIG.version,expedientesDetectados:codigos.length,expedientesSincronizados:ok,taller:taller,errores:errores,modificaCompat:false,modificaRelacional:true,usaSheetsExternos:false};
  Logger.log(JSON.stringify(out,null,2)); return out;
}

function BD151_ACTIVAR_SINCRONIZACION_AUTOMATICA(){
  PropertiesService.getScriptProperties().setProperty(BD151_CONFIG.propertyEnabled,'TRUE');
  if(typeof BD12_ACTIVAR_DUAL_WRITE==='function' && typeof BD12_enabled_==='function' && !BD12_enabled_()) BD12_ACTIVAR_DUAL_WRITE();
  var out={status:true,fase:BD151_CONFIG.fase,version:BD151_CONFIG.version,sincronizacionAutomatica:true,dualWrite:(typeof BD12_enabled_==='function'?BD12_enabled_():null),flujo:'COMPAT_* -> TABLAS_RELACIONALES',baseUnica:BD15_CONFIG.spreadsheetName};
  Logger.log(JSON.stringify(out,null,2)); return out;
}

function BD151_PROBAR_DIAGNOSTICO(){
  var codCompat=BD151_codigosCompat_();
  var rel=(typeof REPO_RelacionalV5!=='undefined'?REPO_RelacionalV5.listar('expedientes'):[])||[];
  var codRel=rel.map(function(x){return BD151_up_(x.CODIGO_TRAMITE);}).filter(Boolean);
  var faltan=codCompat.filter(function(c){return codRel.indexOf(c)<0;});
  var estudiantes=(typeof REPO_RelacionalV5!=='undefined'?REPO_RelacionalV5.listar('estudiantes'):[])||[];
  var usuarios=(typeof REPO_RelacionalV5!=='undefined'?REPO_RelacionalV5.listar('usuarios'):[])||[];
  var dnisRel={}; estudiantes.forEach(function(e){var d=BD151_digits_(e.DNI);if(d)dnisRel[d]=true;});
  var userInv={}; usuarios.forEach(function(u){if(BD151_up_(u.ROL)==='INVITADO'){var d=BD151_digits_(u.USUARIO);if(d)userInv[d]=true;}});
  var faltanEst=[],faltanInv=[];
  codCompat.forEach(function(c){BD151_dnisExpedienteCompat_(c).forEach(function(d){if(!dnisRel[d]&&faltanEst.indexOf(d)<0)faltanEst.push(d); if(!userInv[d]&&faltanInv.indexOf(d)<0)faltanInv.push(d);});});
  var out={status:faltan.length===0&&faltanEst.length===0&&faltanInv.length===0,fase:BD151_CONFIG.fase,version:BD151_CONFIG.version,baseUnica:BD15_CONFIG.spreadsheetName,sincronizacionAutomatica:BD151_enabled_(),dualWrite:(typeof BD12_enabled_==='function'?BD12_enabled_():null),compatExpedientes:codCompat.length,relacionalExpedientes:codRel.length,faltanExpedientes:faltan,faltanEstudiantes:faltanEst,faltanUsuariosInvitados:faltanInv,usaSheetsExternos:false};
  Logger.log(JSON.stringify(out,null,2)); return out;
}
