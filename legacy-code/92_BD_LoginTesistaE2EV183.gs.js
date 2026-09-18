/**
 * BD-18.3 - LOGIN TESISTA END-TO-END
 * Fuerza autenticación relacional para DNI/CUI de invitados y conserva
 * el flujo MVC/SOA para administradores.
 */
const BD183_CONFIG=Object.freeze({
  fase:'BD-18.3',
  version:'db-18.3-login-tesista-e2e'
});
function BD183_txt_(v){return String(v==null?'':v).trim();}
function BD183_dni_(v){return BD183_txt_(v).replace(/\D/g,'');}

function BD183_LOGIN(usuario,password){
  try{
    var u=BD183_txt_(usuario), p=BD183_txt_(password);
    if(!u||!p)return{status:false,message:'Ingrese usuario y contraseña.'};

    /* Si parece DNI, primero intenta invitado relacional directamente. */
    var dni=BD183_dni_(u);
    if(dni && dni===u.replace(/\s/g,'') && dni.length===8){
      var rel=BD13_AUTENTICAR_RELACIONAL(dni,p);
      if(rel&&rel.status){
        var ses=SOA_SesionV6Service.crear(rel);
        return Object.assign({},rel,{
          status:true,
          rol:ses.rol,
          token:ses.token,
          permisos:ses.permisos,
          sesionExpiraEn:ses.expiraEn,
          arquitectura:'MVC + SOA',
          fase:'BD-18.3',
          fuenteLogin:'RELACIONAL_INVITADO_DIRECTO'
        });
      }
    }

    /* Admin/otros roles continúan por el servicio normal. */
    return SOA_AuthUsuariosV6Service.login(u,p);
  }catch(e){
    return{status:false,message:e&&e.message?e.message:'No se pudo iniciar sesión.'};
  }
}

/* Prueba de extremo a extremo usando el CUI ya almacenado, sin mostrarlo. */
function BD183_PROBAR_FLUJO_LOGIN_DNI(dni){
  dni=BD183_dni_(dni);
  var est=REPO_RelacionalV5.obtenerEstudiantePorDni(dni);
  if(!est){
    var no={status:false,fase:BD183_CONFIG.fase,dni:dni,mensaje:'No existe estudiante.'};
    Logger.log(JSON.stringify(no,null,2));return no;
  }
  var cui=BD183_txt_(est.CUI);
  var r=BD183_LOGIN(dni,cui)||{};
  var out={
    status:!!r.status,
    fase:BD183_CONFIG.fase,
    version:BD183_CONFIG.version,
    dni:dni,
    tieneCui:!!cui,
    authMode:typeof BD13_mode_==='function'?BD13_mode_():'',
    rol:r.rol||'',
    expediente:r.expediente||'',
    fuenteLogin:r.fuenteLogin||r.fuenteAuth||'',
    tieneToken:!!r.token,
    mensaje:r.status?'LOGIN END-TO-END CORRECTO':(r.message||'Fallo de login')
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

/* Auxiliar ejecutable desde el selector para el DNI de prueba. */
function BD183_PROBAR_DNI_11111111(){
  return BD183_PROBAR_FLUJO_LOGIN_DNI('11111111');
}
