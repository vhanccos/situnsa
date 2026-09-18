/** BD-13 - Mirror/cutover controlado de autenticación. */
function BD13_incidentSheet_(create){
  var ss=BD2_abrirBase_(), sh=ss.getSheetByName(BD13_CONFIG.incidentSheet);
  if(!sh && create){ sh=ss.insertSheet(BD13_CONFIG.incidentSheet); sh.getRange(1,1,1,8).setValues([['ID','FECHA','TIPO','USUARIO','LEGACY_OK','RELACIONAL_OK','DETALLE','ESTADO']]); sh.setFrozenRows(1); }
  return sh;
}
function BD13_logIncident_(tipo,usuario,legacyOk,relOk,detalle){
  try{ var sh=BD13_incidentSheet_(true); sh.appendRow([Utilities.getUuid(),BD13_now_(),tipo,BD13_txt_(usuario),!!legacyOk,!!relOk,BD13_txt_(detalle),'PENDIENTE']); }catch(e){Logger.log('[BD-13] No se pudo registrar incidencia: '+e.message);}
}
function BD13_userRel_(usuario){ var u=BD13_low_(usuario); return BD13_relUsers_().filter(function(x){return BD13_low_(x.USUARIO)===u;})[0]||null; }
function BD13_guestProfile_(dni){
  dni=BD13_txt_(dni).replace(/\D/g,''); var est=REPO_RelacionalV5.obtenerEstudiantePorDni(dni); if(!est)return {expediente:'',programa:''};
  var links=REPO_RelacionalV5.filtrar('expediente_estudiantes',{ID_ESTUDIANTE:est.ID_ESTUDIANTE})||[], link=links[0], exp=link?REPO_RelacionalV5.buscarUno('expedientes','ID_EXPEDIENTE',link.ID_EXPEDIENTE):null, prg=est.ID_PROGRAMA?REPO_RelacionalV5.buscarUno('programas','ID_PROGRAMA',est.ID_PROGRAMA):null;
  return {expediente:exp?BD13_up_(exp.CODIGO_TRAMITE):'',programa:prg?BD13_txt_(prg.NOMBRE):''};
}
function BD13_AUTENTICAR_RELACIONAL(usuario,password){
  usuario=BD13_txt_(usuario); password=String(password==null?'':password); if(!usuario||!password)return {status:false,message:'Ingrese usuario y contraseña.'};
  var u=BD13_userRel_(usuario); if(!u || BD13_up_(u.ESTADO_REGISTRO)!=='ACTIVO')return {status:false,message:'Usuario o contraseña incorrectos'};
  if(!BD13_verifyPassword_(password,u.PASSWORD_HASH))return {status:false,message:'Usuario o contraseña incorrectos'};
  var rol=SOA_RolesV6Service.normalizar(u.ROL), guest=rol==='invitado'?BD13_guestProfile_(usuario):{expediente:'',programa:''};
  return {status:true,usuario:BD13_txt_(u.USUARIO),dni:rol==='invitado'?BD13_txt_(u.USUARIO):BD13_txt_(u.USUARIO),nombre:BD13_txt_(u.NOMBRE),correo:BD13_low_(u.CORREO),rol:rol,expediente:guest.expediente,programa:guest.programa,url:REPO_AuthUsuariosV6.appUrl()+'?page='+(rol==='invitado'?'tramite':'dashboard'),fuenteAuth:'RELACIONAL'};
}
function BD13_compareAuth_(legacy,rel){
  var dif=[]; if(!!legacy.status!==!!rel.status)dif.push('STATUS');
  if(legacy.status&&rel.status){ if(SOA_RolesV6Service.normalizar(legacy.rol)!==SOA_RolesV6Service.normalizar(rel.rol))dif.push('ROL'); if(BD13_low_(legacy.correo)!==BD13_low_(rel.correo))dif.push('CORREO'); }
  return dif;
}
function BD13_mirrorAfterLegacyAuth_(usuario,password,legacy){
  var rel=BD13_AUTENTICAR_RELACIONAL(usuario,password), dif=BD13_compareAuth_(legacy||{},rel||{});
  if(dif.length)BD13_logIncident_('AUTH_MIRROR',usuario,!!(legacy&&legacy.status),!!rel.status,dif.join(','));
  return {status:dif.length===0,relacional:rel,diferencias:dif};
}
function BD13_AUTENTICAR_SEGUN_MODO(usuario,password){
  var mode=BD13_mode_();
  if(mode==='RELACIONAL') return BD13_AUTENTICAR_RELACIONAL(usuario,password);
  var legacy=REPO_AuthUsuariosV6.autenticar(usuario,password);
  if(mode==='MIRROR'){ try{BD13_mirrorAfterLegacyAuth_(usuario,password,legacy);}catch(e){BD13_logIncident_('AUTH_MIRROR_ERROR',usuario,!!(legacy&&legacy.status),false,e.message);} }
  return legacy;
}
function BD13_AUTENTICAR_ASESOR_MIRROR(usuario,password,legacyResult){
  if(BD13_mode_()!=='MIRROR')return legacyResult;
  try{
    var key=BD13_low_(usuario), rows=REPO_RelacionalV5.listar('asesores')||[], a=rows.filter(function(x){return [x.USUARIO,x.DNI,x.CORREO].some(function(v){return BD13_low_(v)===key;});})[0];
    var relOk=false; if(a&&BD13_up_(a.ESTADO_REGISTRO)==='ACTIVO'&&/^[a-f0-9]{64}$/i.test(BD13_txt_(a.PASSWORD_HASH))) relOk=(V13_hash_(password)===BD13_txt_(a.PASSWORD_HASH));
    var legOk=!!(legacyResult&&legacyResult.status); if(relOk!==legOk)BD13_logIncident_('ASESOR_MIRROR',usuario,legOk,relOk,'STATUS');
  }catch(e){BD13_logIncident_('ASESOR_MIRROR_ERROR',usuario,!!(legacyResult&&legacyResult.status),false,e.message);}
  return legacyResult;
}
function BD13_ACTIVAR_MIRROR_AUTH(){ var m=BD13_setMode_('MIRROR'); var out={status:true,fase:'BD-13',version:BD13_CONFIG.version,authMode:m,loginProductivoAutoritativo:'LEGACY',comparacionRelacional:true}; Logger.log(JSON.stringify(out,null,2)); return out; }
function BD13_ROLLBACK_AUTH_LEGACY(){ var m=BD13_setMode_('LEGACY'); var out={status:true,fase:'BD-13',version:BD13_CONFIG.version,authMode:m,loginProductivoAutoritativo:'LEGACY'}; Logger.log(JSON.stringify(out,null,2)); return out; }
function BD13_ACTIVAR_RELACIONAL_AUTH(){ var d=BD13_PROBAR_DIAGNOSTICO(); if(!d.listoParaCutoverRelacional) throw new Error('BD-13: cutover Auth bloqueado. Revise omitidos, hashes e incidencias.'); var m=BD13_setMode_('RELACIONAL'); return {status:true,fase:'BD-13',version:BD13_CONFIG.version,authMode:m}; }
