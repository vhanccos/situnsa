/**
 * BD-18.2 - VALIDACION REAL DNI + CUI
 * Verifica que PASSWORD_HASH corresponda al CUI actual de ESTUDIANTES.
 */
const BD182_CONFIG=Object.freeze({
  fase:'BD-18.2',
  version:'db-18.2-auth-cui-consistency'
});
function BD182_txt_(v){return String(v==null?'':v).trim();}
function BD182_up_(v){return BD182_txt_(v).toUpperCase();}
function BD182_dni_(v){return BD182_txt_(v).replace(/\D/g,'');}

function BD182_ANALIZAR_LOGIN_TESISTAS(){
  var usuarios=REPO_RelacionalV5.listar('usuarios')||[];
  var estudiantes=REPO_RelacionalV5.listar('estudiantes')||[];
  var emap={};
  estudiantes.forEach(function(e){
    var d=BD182_dni_(e.DNI);
    if(d) emap[d]=e;
  });
  var ok=[],mismatch=[],sinEstudiante=[],sinCui=[],sinHash=[];
  usuarios.forEach(function(u){
    if(BD182_up_(u.ROL)!=='INVITADO') return;
    var dni=BD182_dni_(u.USUARIO), est=emap[dni];
    if(!est){sinEstudiante.push(dni);return;}
    var cui=BD182_txt_(est.CUI), hash=BD182_txt_(u.PASSWORD_HASH);
    if(!cui){sinCui.push(dni);return;}
    if(!hash){sinHash.push(dni);return;}
    if(typeof BD13_verifyPassword_!=='function'){
      mismatch.push({dni:dni,motivo:'VERIFICADOR_NO_DISPONIBLE'});
      return;
    }
    if(BD13_verifyPassword_(cui,hash)) ok.push(dni);
    else mismatch.push({dni:dni,motivo:'HASH_NO_CORRESPONDE_AL_CUI_ACTUAL'});
  });
  var out={
    status:mismatch.length===0&&sinEstudiante.length===0&&sinCui.length===0&&sinHash.length===0,
    fase:BD182_CONFIG.fase,
    version:BD182_CONFIG.version,
    authMode:typeof BD13_mode_==='function'?BD13_mode_():'',
    invitadosAnalizados:ok.length+mismatch.length+sinEstudiante.length+sinCui.length+sinHash.length,
    correctos:ok,
    hashNoCoincideConCui:mismatch,
    sinEstudiante:sinEstudiante,
    sinCui:sinCui,
    sinHash:sinHash
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD182_REPARAR_HASH_DESDE_CUI(){
  if(typeof BD13_hashPassword_!=='function') throw new Error('BD13_hashPassword_ no disponible.');
  var usuarios=REPO_RelacionalV5.listar('usuarios')||[];
  var estudiantes=REPO_RelacionalV5.listar('estudiantes')||[];
  var emap={};
  estudiantes.forEach(function(e){
    var d=BD182_dni_(e.DNI);
    if(d) emap[d]=e;
  });
  var reparados=[],omitidos=[],errores=[];
  usuarios.forEach(function(u){
    try{
      if(BD182_up_(u.ROL)!=='INVITADO')return;
      var dni=BD182_dni_(u.USUARIO),est=emap[dni];
      if(!est){omitidos.push({dni:dni,motivo:'SIN_ESTUDIANTE'});return;}
      var cui=BD182_txt_(est.CUI);
      if(!cui){omitidos.push({dni:dni,motivo:'SIN_CUI'});return;}
      var hash=BD182_txt_(u.PASSWORD_HASH);
      var coincide=hash && typeof BD13_verifyPassword_==='function' && BD13_verifyPassword_(cui,hash);
      if(coincide)return;
      BD16_upsert_('usuarios','ID_USUARIO',Object.assign({},u,{
        PASSWORD_HASH:BD13_hashPassword_(cui),
        ESTADO_REGISTRO:'ACTIVO',
        MODIFICADO_EN:new Date()
      }));
      reparados.push(dni);
    }catch(e){
      errores.push({usuario:u.USUARIO,error:e.message||String(e)});
    }
  });
  var out={
    status:errores.length===0,
    fase:BD182_CONFIG.fase,
    version:BD182_CONFIG.version,
    reparados:reparados,
    omitidos:omitidos,
    errores:errores
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD182_PROBAR_LOGIN_DNI(dni){
  dni=BD182_dni_(dni);
  var est=REPO_RelacionalV5.obtenerEstudiantePorDni(dni);
  var u=REPO_RelacionalV5.buscarUno('usuarios','USUARIO',dni);
  var out={
    status:false,
    fase:BD182_CONFIG.fase,
    dni:dni,
    estudianteExiste:!!est,
    usuarioExiste:!!u,
    rol:u?BD182_txt_(u.ROL):'',
    estado:u?BD182_txt_(u.ESTADO_REGISTRO):'',
    tieneCui:!!(est&&BD182_txt_(est.CUI)),
    tieneHash:!!(u&&BD182_txt_(u.PASSWORD_HASH)),
    hashCoincideConCui:false,
    authMode:typeof BD13_mode_==='function'?BD13_mode_():''
  };
  if(est&&u&&BD182_txt_(est.CUI)&&BD182_txt_(u.PASSWORD_HASH)&&typeof BD13_verifyPassword_==='function'){
    out.hashCoincideConCui=BD13_verifyPassword_(BD182_txt_(est.CUI),BD182_txt_(u.PASSWORD_HASH));
  }
  out.status=out.estudianteExiste&&out.usuarioExiste&&BD182_up_(out.estado)==='ACTIVO'&&BD182_up_(out.rol)==='INVITADO'&&out.hashCoincideConCui;
  Logger.log(JSON.stringify(out,null,2));
  return out;
}


function BD182_PROBAR_DNI_11111111() {
  return BD182_PROBAR_LOGIN_DNI('11111111');
}