/**
 * BD-18.1 - CORRECCION LOGIN TESISTA DNI + CUI
 * Repara invitados relacionales con PASSWORD_HASH vacío usando el CUI
 * ya almacenado en la tabla estudiantes.
 */
const BD181_CONFIG=Object.freeze({
  fase:'BD-18.1',
  version:'db-18.1-auth-invitado-fix'
});
function BD181_txt_(v){return String(v==null?'':v).trim();}
function BD181_digits_(v){return BD181_txt_(v).replace(/\D/g,'');}
function BD181_up_(v){return BD181_txt_(v).toUpperCase();}

function BD181_PREVISUALIZAR_CREDENCIALES_INVITADOS(){
  var usuarios=REPO_RelacionalV5.listar('usuarios')||[];
  var estudiantes=REPO_RelacionalV5.listar('estudiantes')||[];
  var emap={};
  estudiantes.forEach(function(e){
    var dni=BD181_digits_(e.DNI);
    if(dni)emap[dni]=e;
  });
  var pendientes=[],sinCui=[];
  usuarios.forEach(function(u){
    if(BD181_up_(u.ROL)!=='INVITADO')return;
    var dni=BD181_digits_(u.USUARIO);
    if(BD181_txt_(u.PASSWORD_HASH))return;
    var e=emap[dni];
    if(e&&BD181_txt_(e.CUI)) pendientes.push({dni:dni,nombre:u.NOMBRE||e.APELLIDOS_NOMBRES||'',tieneCui:true});
    else sinCui.push({dni:dni,nombre:u.NOMBRE||'',motivo:'CUI_NO_DISPONIBLE'});
  });
  var out={status:sinCui.length===0,fase:BD181_CONFIG.fase,version:BD181_CONFIG.version,pendientes:pendientes,sinCui:sinCui,modificaDatos:false};
  Logger.log(JSON.stringify(out,null,2));return out;
}

function BD181_REPARAR_CREDENCIALES_INVITADOS(){
  if(typeof BD13_hashPassword_!=='function')throw new Error('BD13_hashPassword_ no disponible.');
  var usuarios=REPO_RelacionalV5.listar('usuarios')||[];
  var estudiantes=REPO_RelacionalV5.listar('estudiantes')||[];
  var emap={};
  estudiantes.forEach(function(e){
    var dni=BD181_digits_(e.DNI);
    if(dni)emap[dni]=e;
  });
  var reparados=0,omitidos=[],errores=[];
  usuarios.forEach(function(u){
    try{
      if(BD181_up_(u.ROL)!=='INVITADO')return;
      if(BD181_txt_(u.PASSWORD_HASH))return;
      var dni=BD181_digits_(u.USUARIO),e=emap[dni],cui=e?BD181_txt_(e.CUI):'';
      if(!cui){omitidos.push({dni:dni,motivo:'CUI_NO_DISPONIBLE'});return;}
      BD16_upsert_('usuarios','ID_USUARIO',Object.assign({},u,{
        PASSWORD_HASH:BD13_hashPassword_(cui),
        MODIFICADO_EN:new Date()
      }));
      reparados++;
    }catch(x){errores.push({usuario:u.USUARIO,error:x.message});}
  });
  var out={status:errores.length===0,fase:BD181_CONFIG.fase,version:BD181_CONFIG.version,reparados:reparados,omitidos:omitidos,errores:errores};
  Logger.log(JSON.stringify(out,null,2));return out;
}

function BD181_PROBAR_LOGIN_TESISTAS(){
  var usuarios=REPO_RelacionalV5.listar('usuarios')||[];
  var invitados=usuarios.filter(function(u){return BD181_up_(u.ROL)==='INVITADO';});
  var sinHash=invitados.filter(function(u){return !BD181_txt_(u.PASSWORD_HASH);}).map(function(u){return BD181_digits_(u.USUARIO);});
  var hashInvalidos=invitados.filter(function(u){
    var h=BD181_txt_(u.PASSWORD_HASH);
    return h && !/^v1\$sha256i\$\d+\$[^$]+\$[a-f0-9]{64}$/i.test(h);
  }).map(function(u){return BD181_digits_(u.USUARIO);});
  var out={
    status:sinHash.length===0&&hashInvalidos.length===0,
    fase:BD181_CONFIG.fase,
    version:BD181_CONFIG.version,
    authMode:typeof BD13_mode_==='function'?BD13_mode_():'',
    invitados:invitados.length,
    sinHash:sinHash,
    hashInvalidos:hashInvalidos,
    loginEsperado:'DNI + CUI'
  };
  Logger.log(JSON.stringify(out,null,2));return out;
}
