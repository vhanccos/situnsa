/**
 * ==============================================================
 * BD-13 - AUTENTICACION RELACIONAL SEGURA
 * Credenciales hash + identidades administrativas/invitadas.
 * LEGACY continúa siendo autoritativo hasta cutover explícito.
 * ==============================================================
 */

const BD13_CONFIG = Object.freeze({
  version: 'db-13.0-auth-mirror-hash',
  modeKey: 'BD13_AUTH_MODE',
  modes: Object.freeze(['LEGACY','MIRROR','RELATIONAL']),
  hashScheme: 'sha256i-v1',
  hashIterations: 2500,
  incidentSheet: 'AUTH_MIRROR_INCIDENCIAS',
  timezone: 'America/Lima'
});

function BD13_txt_(v){ return String(v == null ? '' : v).trim(); }
function BD13_low_(v){ return BD13_txt_(v).toLowerCase(); }
function BD13_up_(v){ return BD13_txt_(v).toUpperCase(); }
function BD13_now_(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || BD13_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'); }
function BD13_hex_(bytes){ return (bytes||[]).map(function(v){ if(v<0)v+=256; return ('0'+v.toString(16)).slice(-2); }).join(''); }
function BD13_sha256_(s){ return BD13_hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s||''), Utilities.Charset.UTF_8)); }
function BD13_stableId_(prefix, value){ return prefix + '_' + BD13_sha256_(BD13_low_(value)).slice(0,16).toUpperCase(); }

function BD13_hashPassword_(password, salt, iterations){
  password=String(password == null ? '' : password);
  salt=BD13_txt_(salt) || Utilities.getUuid().replace(/-/g,'');
  iterations=Number(iterations || BD13_CONFIG.hashIterations);
  var h=BD13_sha256_(salt+'|'+password);
  for(var i=1;i<iterations;i++) h=BD13_sha256_(h+'|'+salt+'|'+password);
  return 'v1$sha256i$'+iterations+'$'+salt+'$'+h;
}

function BD13_verifyPassword_(password, encoded){
  encoded=BD13_txt_(encoded);
  var p=encoded.split('$');
  if(p.length!==5 || p[0]!=='v1' || p[1]!=='sha256i') return false;
  var iterations=Number(p[2]||0), salt=p[3], expected=p[4];
  if(!iterations || !salt || !expected) return false;
  var actual=BD13_hashPassword_(password,salt,iterations).split('$')[4];
  if(actual.length!==expected.length) return false;
  var diff=0; for(var i=0;i<actual.length;i++) diff |= actual.charCodeAt(i)^expected.charCodeAt(i);
  return diff===0;
}

function BD13_mode_(){
  var m=BD13_up_(PropertiesService.getScriptProperties().getProperty(BD13_CONFIG.modeKey)||'LEGACY');
  return BD13_CONFIG.modes.indexOf(m)>=0 ? m : 'LEGACY';
}
function BD13_setMode_(mode){
  mode=BD13_up_(mode); if(BD13_CONFIG.modes.indexOf(mode)<0) throw new Error('Modo Auth BD-13 inválido: '+mode);
  PropertiesService.getScriptProperties().setProperty(BD13_CONFIG.modeKey,mode); return mode;
}

function BD13_relUsersSheet_(){
  var ss=BD2_abrirBase_(); if(!ss) throw new Error('No existe la base relacional BD-02.');
  var sh=ss.getSheetByName(BD2_nombreHoja_('usuarios')); if(!sh) throw new Error('No existe la tabla USUARIOS relacional.');
  return sh;
}
function BD13_matrix_(sh){
  var lc=sh.getLastColumn(), lr=sh.getLastRow();
  var headers=lc?sh.getRange(1,1,1,lc).getDisplayValues()[0].map(BD13_txt_):[];
  var idx={}; headers.forEach(function(h,i){idx[h]=i;});
  var values=(lr>1&&lc)?sh.getRange(2,1,lr-1,lc).getValues():[];
  return {headers:headers,idx:idx,values:values};
}
function BD13_objFromRow_(m,row){ var o={}; m.headers.forEach(function(h,i){o[h]=row[i];}); return o; }
function BD13_relUsers_(){ var sh=BD13_relUsersSheet_(), m=BD13_matrix_(sh); return m.values.map(function(r){return BD13_objFromRow_(m,r);}).filter(function(x){return BD13_txt_(x.USUARIO);}); }

function BD13_relStudentDnis_(){
  var map={};
  try{ (REPO_RelacionalV5.listar('estudiantes')||[]).forEach(function(x){var d=BD13_txt_(x.DNI).replace(/\D/g,''); if(d)map[d]=true;}); }catch(e){}
  return map;
}

function BD13_buildPlan_(){
  var identities=[], omitidosInvitados=[], conflictos=[], seen={};
  var admins=REPO_AuthUsuariosV6.hojaUsuarios().getDataRange().getDisplayValues();
  for(var i=1;i<admins.length;i++){
    var u=BD13_txt_(admins[i][1]), p=BD13_txt_(admins[i][2]); if(!u)continue;
    identities.push({tipo:'ADMIN',legacyId:BD13_txt_(admins[i][0]),usuario:u,password:p,nombre:BD13_txt_(admins[i][3]),rol:BD13_low_(admins[i][4])||'admin',correo:BD13_low_(admins[i][5]),estado:'ACTIVO'});
  }
  var estudiantes=BD13_relStudentDnis_();
  var inv=REPO_AuthUsuariosV6.hojaInvitados().getDataRange().getDisplayValues();
  for(var j=1;j<inv.length;j++){
    var dni=BD13_txt_(inv[j][1]).replace(/\D/g,''), cui=BD13_txt_(inv[j][2]); if(!dni)continue;
    if(!estudiantes[dni]){ omitidosInvitados.push({dni:dni,motivo:'ESTUDIANTE_NO_EXISTE_EN_RELACIONAL'}); continue; }
    identities.push({tipo:'INVITADO',legacyId:BD13_txt_(inv[j][0]),usuario:dni,password:cui,nombre:BD13_txt_(inv[j][3]),rol:'invitado',correo:BD13_low_(inv[j][4]),estado:BD13_up_(inv[j][7])==='ACTIVO'?'ACTIVO':'INACTIVO'});
  }
  identities.forEach(function(x){ var k=BD13_low_(x.usuario); if(!seen[k])seen[k]=[]; seen[k].push(x.tipo); });
  Object.keys(seen).forEach(function(k){ if(seen[k].length>1) conflictos.push({usuario:k,tipos:seen[k]}); });
  var conflictSet={}; conflictos.forEach(function(x){conflictSet[x.usuario]=true;});
  var resolubles=identities.filter(function(x){return !conflictSet[BD13_low_(x.usuario)] && !!x.password;});
  var sinPassword=identities.filter(function(x){return !x.password;}).map(function(x){return {usuario:x.usuario,tipo:x.tipo,motivo:'PASSWORD_VACIO'};});
  return {identidades:identities,resolubles:resolubles,omitidosInvitados:omitidosInvitados,conflictos:conflictos,sinPassword:sinPassword};
}

function BD13_upsertIdentity_(identity){
  var sh=BD13_relUsersSheet_(), m=BD13_matrix_(sh), rowIndex=-1, current=null, key=BD13_low_(identity.usuario);
  for(var i=0;i<m.values.length;i++) if(BD13_low_(m.values[i][m.idx.USUARIO])===key){rowIndex=i+2;current=BD13_objFromRow_(m,m.values[i]);break;}
  var id=current&&BD13_txt_(current.ID_USUARIO) ? current.ID_USUARIO : BD13_stableId_(identity.tipo==='INVITADO'?'USR_INV':'USR_AUTH',identity.usuario);
  var salt=Utilities.getUuid().replace(/-/g,''), hash=BD13_hashPassword_(identity.password,salt,BD13_CONFIG.hashIterations), now=BD13_now_();
  var obj={ID_USUARIO:id,USUARIO:identity.usuario,NOMBRE:identity.nombre,CORREO:identity.correo,ROL:identity.rol,PASSWORD_HASH:hash,ESTADO_REGISTRO:identity.estado,CREADO_EN:(current&&current.CREADO_EN)||now,MODIFICADO_EN:now};
  var row=m.headers.map(function(h){return Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:(current&&current[h]!==undefined?current[h]:'');});
  if(rowIndex>0){sh.getRange(rowIndex,1,1,row.length).setValues([row]);return 'updated';}
  sh.getRange(sh.getLastRow()+1,1,1,row.length).setValues([row]);return 'inserted';
}

function BD13_PREVISUALIZAR_AUTH(){
  var p=BD13_buildPlan_(), rel=BD13_relUsers_();
  var out={status:p.conflictos.length===0,fase:'BD-13',version:BD13_CONFIG.version,modo:'PREVIEW',authModeActual:BD13_mode_(),legacy:{identidades:p.identidades.length,resolubles:p.resolubles.length,administradores:p.identidades.filter(function(x){return x.tipo==='ADMIN';}).length,invitadosResolubles:p.identidades.filter(function(x){return x.tipo==='INVITADO';}).length},relacional:{usuariosActuales:rel.length},omitidos:{invitados:p.omitidosInvitados,sinPassword:p.sinPassword},conflictosUsuario:p.conflictos,passwordsExpuestos:false,passwordsPersistidosEnClaroEnRelacional:false,modificaLegacy:false,modificaRelacional:false,siguientePaso:'BD13_PREPARAR_CREDENCIALES()'};
  Logger.log(JSON.stringify(out,null,2)); return out;
}

function BD13_PREPARAR_CREDENCIALES(){
  var p=BD13_buildPlan_(); if(p.conflictos.length) throw new Error('BD-13 detenido: existen usuarios duplicados entre identidades legacy.');
  var res={insertados:0,actualizados:0,errores:[]};
  p.resolubles.forEach(function(x){try{var a=BD13_upsertIdentity_(x);res[a==='inserted'?'insertados':'actualizados']++;}catch(e){res.errores.push({usuario:x.usuario,tipo:x.tipo,error:e.message});}});
  BD13_incidentSheet_(true);
  var out={status:res.errores.length===0,fase:'BD-13',version:BD13_CONFIG.version,modo:'PREPARAR_CREDENCIALES',resultado:res,omitidosInvitados:p.omitidosInvitados,sinPassword:p.sinPassword,hashScheme:BD13_CONFIG.hashScheme,iterations:BD13_CONFIG.hashIterations,passwordsExpuestos:false,modificaLegacy:false,modificaRelacional:true,authMode:BD13_mode_(),errores:res.errores};
  Logger.log(JSON.stringify(out,null,2)); return out;
}
