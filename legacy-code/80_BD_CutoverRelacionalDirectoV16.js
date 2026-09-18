/**
 * BD-16 - CUTOVER RELACIONAL DIRECTO
 * Fuente operativa: BD_TITULACION_RELACIONAL_V2.
 * COMPAT_* queda solo como respaldo y NO participa en altas nuevas cuando BD16 esta activo.
 */
const BD16_CONFIG=Object.freeze({fase:'BD-16',version:'db-16.0-cutover-relacional-directo',key:'BD16_DIRECT_RELATIONAL',timezone:'America/Lima'});
function BD16_txt_(v){return String(v==null?'':v).trim();}
function BD16_up_(v){return BD16_txt_(v).toUpperCase();}
function BD16_low_(v){return BD16_txt_(v).toLowerCase();}
function BD16_digits_(v){return BD16_txt_(v).replace(/\D/g,'');}
function BD16_activo_(){return BD16_up_(PropertiesService.getScriptProperties().getProperty(BD16_CONFIG.key)||'FALSE')==='TRUE';}
function BD16_now_(){return new Date();}
function BD16_id_(prefix,key){if(typeof BD3_id_==='function')return BD3_id_(prefix,key); var b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(key||''),Utilities.Charset.UTF_8); return prefix+'_'+b.slice(0,8).map(function(x){if(x<0)x+=256;return ('0'+x.toString(16)).slice(-2);}).join('').toUpperCase();}
/* V20: reutiliza la lectura única del repositorio BD5. Antes cada upsert
   ejecutaba getValues() sobre toda la tabla otra vez. */
function BD16_matrix_(tabla){
  var base=BD5_matrix_(tabla),idx={};
  base.headers.forEach(function(x,i){idx[BD16_up_(x)]=i;});
  return{sheet:base.sheet,headers:base.headers,idx:idx,rows:base.rows};
}
function BD16_objRow_(m,obj,base){var row=base?base.slice():new Array(m.headers.length).fill('');m.headers.forEach(function(h,i){var k=BD16_up_(h);if(Object.prototype.hasOwnProperty.call(obj,k))row[i]=obj[k];});return row;}
function BD16_upsert_(tabla,pk,obj){var m=BD16_matrix_(tabla),pi=m.idx[BD16_up_(pk)]; if(pi==null)throw new Error(tabla+': falta PK '+pk); var key=BD16_txt_(obj[BD16_up_(pk)]),found=-1; for(var i=0;i<m.rows.length;i++){if(BD16_txt_(m.rows[i][pi])===key){found=i;break;}} var row=BD16_objRow_(m,obj,found>=0?m.rows[found]:null); if(found>=0){m.sheet.getRange(found+2,1,1,row.length).setValues([row]);m.rows[found]=row;} else {m.sheet.getRange(m.sheet.getLastRow()+1,1,1,row.length).setValues([row]);m.rows.push(row);} return found>=0?'ACTUALIZADO':'INSERTADO';}
function BD16_programaId_(nombre){var n=BD16_up_(nombre),rows=REPO_RelacionalV5.listar('programas')||[]; for(var i=0;i<rows.length;i++){if(BD16_up_(rows[i].NOMBRE)===n||BD16_up_(rows[i].CODIGO)===n)return BD16_txt_(rows[i].ID_PROGRAMA);} return '';}
function BD16_adminId_(sol){var mail=BD16_low_(sol.correo_admin),usr=BD16_low_(sol.admin),rows=REPO_RelacionalV5.listar('usuarios')||[]; for(var i=0;i<rows.length;i++){if((mail&&BD16_low_(rows[i].CORREO)===mail)||(usr&&BD16_low_(rows[i].USUARIO)===usr))return BD16_txt_(rows[i].ID_USUARIO);} return '';}
function BD16_ensureGuest_(p,now){var dni=BD16_digits_(p.dni); if(!dni)return ''; var old=REPO_RelacionalV5.buscarUno('usuarios','USUARIO',dni),id=old?BD16_txt_(old.ID_USUARIO):BD16_id_('USR',dni),hash=old?BD16_txt_(old.PASSWORD_HASH):''; if(!hash&&p.cui&&typeof BD13_hashPassword_==='function')hash=BD13_hashPassword_(p.cui); BD16_upsert_('usuarios','ID_USUARIO',{ID_USUARIO:id,USUARIO:dni,NOMBRE:BD16_txt_(p.nombre),CORREO:BD16_low_(p.correo),ROL:'invitado',PASSWORD_HASH:hash,ESTADO_REGISTRO:'ACTIVO',CREADO_EN:old&&old.CREADO_EN?old.CREADO_EN:now,MODIFICADO_EN:now}); return id;}
function BD16_ctx_(tabla,pk){
  var sh=BD5_tabla_(tabla), lc=sh.getLastColumn(), lr=Math.max(1,sh.getLastRow());
  var vals=sh.getRange(1,1,lr,lc).getValues(), headers=vals[0].map(BD16_txt_), idx={};
  headers.forEach(function(h,i){idx[BD16_up_(h)]=i;});
  var pi=idx[BD16_up_(pk)]; if(pi==null)throw new Error(tabla+': falta PK '+pk);
  var rows=vals.slice(1), map={}; rows.forEach(function(r,i){var k=BD16_txt_(r[pi]);if(k)map[k]=i;});
  return {tabla:tabla,pk:pk,sheet:sh,headers:headers,idx:idx,pi:pi,rows:rows,map:map,updates:{},inserts:[]};
}
function BD16_ctxUpsert_(ctx,obj){
  var key=BD16_txt_(obj[BD16_up_(ctx.pk)]), pos=Object.prototype.hasOwnProperty.call(ctx.map,key)?ctx.map[key]:-1;
  var row=pos>=0?ctx.rows[pos].slice():new Array(ctx.headers.length).fill('');
  Object.keys(obj).forEach(function(k){var i=ctx.idx[BD16_up_(k)]; if(i!=null)row[i]=obj[k];});
  if(pos>=0){ctx.rows[pos]=row;ctx.updates[pos]=row;return 'ACTUALIZADO';}
  ctx.map[key]=ctx.rows.length;ctx.rows.push(row);ctx.inserts.push(row);return 'INSERTADO';
}
function BD16_ctxCommit_(ctx){
  Object.keys(ctx.updates).forEach(function(k){var i=Number(k);ctx.sheet.getRange(i+2,1,1,ctx.headers.length).setValues([ctx.updates[k]]);});
  if(ctx.inserts.length){ctx.sheet.getRange(ctx.sheet.getLastRow()+1,1,ctx.inserts.length,ctx.headers.length).setValues(ctx.inserts);}
  if(typeof BD5_invalidarMemoria_==='function')BD5_invalidarMemoria_(ctx.tabla);
}
function BD16_findRowBy_(ctx,col,val){var i=ctx.idx[BD16_up_(col)], q=BD16_txt_(val); if(i==null)return null; for(var n=0;n<ctx.rows.length;n++)if(BD16_txt_(ctx.rows[n][i])===q)return ctx.rows[n]; return null;}
function BD16_rowObj_(ctx,row){var o={};if(!row)return o;ctx.headers.forEach(function(h,i){o[BD16_up_(h)]=row[i];});return o;}
function BD16_INSERTAR_EXPEDIENTE_DIRECTO(solicitud,codigo){
  if(!BD16_activo_())throw new Error('BD-16 no esta activo.');
  if(typeof BD188_ASEGURAR_FORMATO_IDENTIFICADORES==='function')BD188_ASEGURAR_FORMATO_IDENTIFICADORES(false);
  var now=BD16_now_(), p=solicitud.participantes||[], idExp=BD16_id_('EXP',codigo);
  var cUsuarios=BD16_ctx_('usuarios','ID_USUARIO'), cProgramas=BD16_ctx_('programas','ID_PROGRAMA'), cEst=BD16_ctx_('estudiantes','ID_ESTUDIANTE');
  var cExp=BD16_ctx_('expedientes','ID_EXPEDIENTE'), cRel=BD16_ctx_('expediente_estudiantes','ID_EXPEDIENTE_ESTUDIANTE');
  var cEtCat=BD16_ctx_('etapas_catalogo','ID_ETAPA'), cSubCat=BD16_ctx_('subetapas_catalogo','ID_SUBETAPA');
  var cEt=BD16_ctx_('expediente_etapas','ID_EXPEDIENTE_ETAPA'), cSub=BD16_ctx_('expediente_subetapas','ID_EXPEDIENTE_SUBETAPA'), cHist=BD16_ctx_('historial','ID_HISTORIAL');
  function programaId(nombre){var q=BD16_up_(nombre), ni=cProgramas.idx.NOMBRE, ci=cProgramas.idx.CODIGO; for(var i=0;i<cProgramas.rows.length;i++){if((ni!=null&&BD16_up_(cProgramas.rows[i][ni])===q)||(ci!=null&&BD16_up_(cProgramas.rows[i][ci])===q))return BD16_txt_(cProgramas.rows[i][cProgramas.pi]);}return '';}
  function usuarioPorCampo(col,val){var i=cUsuarios.idx[BD16_up_(col)],q=BD16_low_(val);if(i==null||!q)return null;for(var n=0;n<cUsuarios.rows.length;n++)if(BD16_low_(cUsuarios.rows[n][i])===q)return BD16_rowObj_(cUsuarios,cUsuarios.rows[n]);return null;}
  var admin=usuarioPorCampo('CORREO',solicitud.correo_admin)||usuarioPorCampo('USUARIO',solicitud.admin)||{}, adminId=BD16_txt_(admin.ID_USUARIO);
  BD16_ctxUpsert_(cExp,{ID_EXPEDIENTE:idExp,CODIGO_TRAMITE:BD16_up_(codigo),GRUPO:Number(solicitud.grupo||p.length||1),FECHA_EXP:now,HORA_EXP:now,TESIS:BD16_txt_(solicitud.tesis),TESIS_02:p.length>1?BD16_txt_(solicitud.tesis):'',MODALIDAD:BD16_txt_(solicitud.modalidad),MODALIDAD_02:BD16_txt_(solicitud.modalidad02),ID_USUARIO_ADMIN:adminId,FECHA_CREACION:now,ESTADO:'EN_PROCESO',ESTADO_REGISTRO:'ACTIVO',CREADO_EN:now,MODIFICADO_EN:now});
  p.forEach(function(x,i){
    var dni=BD16_digits_(x.dni), di=cEst.idx.DNI, oldRow=null; if(di!=null)for(var n=0;n<cEst.rows.length;n++)if(BD16_digits_(cEst.rows[n][di])===dni){oldRow=cEst.rows[n];break;}
    var old=BD16_rowObj_(cEst,oldRow), idEst=old.ID_ESTUDIANTE||BD16_id_('EST',dni);
    BD16_ctxUpsert_(cEst,{ID_ESTUDIANTE:idEst,DNI:dni,CUI:BD16_txt_(x.cui),APELLIDOS_NOMBRES:BD16_up_(x.nombre),CORREO:BD16_low_(x.correo),TELEFONO:BD16_txt_(x.telefono),NACIONALIDAD:BD16_txt_(x.nacionalidad),CIUDAD:BD16_txt_(x.ciudad),DIRECCION:BD16_txt_(x.direccion),ID_PROGRAMA:programaId(x.programa),ESTADO_REGISTRO:'ACTIVO',CREADO_EN:old.CREADO_EN||now,MODIFICADO_EN:now});
    BD16_ctxUpsert_(cRel,{ID_EXPEDIENTE_ESTUDIANTE:BD16_id_('EXR',codigo+'_'+idEst),ID_EXPEDIENTE:idExp,ID_ESTUDIANTE:idEst,ORDEN_PARTICIPANTE:i+1,ESTADO_REGISTRO:'ACTIVO'});
    var gu=usuarioPorCampo('USUARIO',dni)||{}, uid=gu.ID_USUARIO||BD16_id_('USR',dni), hash=gu.PASSWORD_HASH||''; // BD-17.3: hash nuevo se genera en segundo plano por COMPLEMENTARIOS.
    BD16_ctxUpsert_(cUsuarios,{ID_USUARIO:uid,USUARIO:dni,NOMBRE:BD16_txt_(x.nombre),CORREO:BD16_low_(x.correo),ROL:'invitado',PASSWORD_HASH:hash,ESTADO_REGISTRO:'ACTIVO',CREADO_EN:gu.CREADO_EN||now,MODIFICADO_EN:now});
  });
  var etapas=[]; cEtCat.rows.forEach(function(r){var o=BD16_rowObj_(cEtCat,r);if(BD16_up_(o.ESTADO_REGISTRO)!=='INACTIVO')etapas.push(o);}); etapas.sort(function(a,b){return Number(a.ORDEN||0)-Number(b.ORDEN||0);});
  var subs=[]; cSubCat.rows.forEach(function(r){var o=BD16_rowObj_(cSubCat,r);if(BD16_up_(o.ESTADO_REGISTRO)!=='INACTIVO')subs.push(o);}); subs.sort(function(a,b){return Number(a.ORDEN||0)-Number(b.ORDEN||0);});
  var agenda=typeof BD17_activo_==='function'&&BD17_activo_(), firstEt=etapas.length?String(etapas[0].ID_ETAPA):'', firstSub='';
  for(var z=0;z<subs.length;z++){if(String(subs[z].ID_ETAPA)===firstEt){firstSub=String(subs[z].ID_SUBETAPA);break;}}
  etapas.forEach(function(e){var first=String(e.ID_ETAPA)===firstEt;BD16_ctxUpsert_(cEt,{ID_EXPEDIENTE_ETAPA:BD16_id_('EXE',codigo+'_'+e.ID_ETAPA),ID_EXPEDIENTE:idExp,ID_ETAPA:e.ID_ETAPA,ID_RESPONSABLE:first?adminId:'',ESTADO:first?'EN_PROCESO':'PENDIENTE',FECHA_INICIO:first?now:'',FECHA_FIN:'',PORCENTAJE:0,CREADO_EN:now,MODIFICADO_EN:now});});
  subs.forEach(function(s){var first=agenda&&String(s.ID_SUBETAPA)===firstSub;BD16_ctxUpsert_(cSub,{ID_EXPEDIENTE_SUBETAPA:BD16_id_('EXS',codigo+'_'+s.ID_SUBETAPA),ID_EXPEDIENTE:idExp,ID_SUBETAPA:s.ID_SUBETAPA,ID_RESPONSABLE:first?adminId:'',ESTADO:first?'EN_PROCESO':'PENDIENTE',FECHA_INICIO:first?now:'',FECHA_FIN:'',OBSERVACION:'',CREADO_EN:now,MODIFICADO_EN:now});});
  BD16_ctxUpsert_(cHist,{ID_HISTORIAL:BD16_id_('HIS',codigo+'_REGISTRO'),ID_EXPEDIENTE:idExp,ID_USUARIO:adminId,EVENTO:'REGISTRO',ETAPA:'1',SUBETAPA:'',DETALLE:'Expediente registrado correctamente',VISIBILIDAD:'PUBLICO',ESTADO:'SUCCESS',CREADO_EN:now});
  [cUsuarios,cEst,cExp,cRel,cEt,cSub,cHist].forEach(BD16_ctxCommit_);
  try{if(typeof BD18_INVALIDAR_EXPEDIENTE==='function')BD18_INVALIDAR_EXPEDIENTE(codigo);}catch(e){}
  return {status:true,codigo:codigo,idExpediente:idExp,participantes:p.length,fuente:'RELACIONAL_DIRECTA_BATCH',compatEscrito:false,agendaBD17:agenda};
}
function BD16_COMPLEMENTARIOS_DIRECTOS(datos){
  var codigo=BD16_up_(datos&&datos.expediente); if(!codigo)return{status:false,message:'No se recibio expediente'};
  var exp=REPO_RelacionalV5.obtenerExpedientePorCodigo(codigo); if(!exp)return{status:false,expediente:codigo,message:'No se encontro el expediente relacional.'};
  var partes=Array.isArray(datos&&datos.participantes)?datos.participantes:[], hashes=0, errores=[];
  // BD-18.1: defensa adicional. Si el frontend no envía el arreglo de participantes,
  // reconstruirlo desde las relaciones relacionales para poder generar el hash DNI+CUI.
  if(!partes.length){
    try{
      var links=REPO_RelacionalV5.filtrar('expediente_estudiantes',{ID_EXPEDIENTE:exp.ID_EXPEDIENTE})||[];
      partes=links.map(function(l){
        var est=REPO_RelacionalV5.buscarUno('estudiantes','ID_ESTUDIANTE',l.ID_ESTUDIANTE);
        return est?{dni:est.DNI,cui:est.CUI,nombre:est.APELLIDOS_NOMBRES,correo:est.CORREO} : null;
      }).filter(Boolean);
    }catch(e0){errores.push('reconstruccion participantes: '+e0.message);}
  }
  // BD-17.3: cálculo costoso de PASSWORD_HASH fuera del alta principal.
  partes.forEach(function(p){
    try{
      var dni=BD16_digits_(p&&p.dni), cui=BD16_txt_(p&&p.cui); if(!dni||!cui)return;
      var u=REPO_RelacionalV5.buscarUno('usuarios','USUARIO',dni); if(!u||BD16_txt_(u.PASSWORD_HASH))return;
      if(typeof BD13_hashPassword_!=='function')throw new Error('BD13_hashPassword_ no disponible');
      BD16_upsert_('usuarios','ID_USUARIO',Object.assign({},u,{PASSWORD_HASH:BD13_hashPassword_(cui),MODIFICADO_EN:new Date()})); hashes++;
    }catch(e){errores.push((p&&p.dni?p.dni:'')+': '+e.message);}
  });
  // Asegurar agenda si el alta fue interrumpida antes de crearla.
  try{
    if(typeof BD17_activo_==='function'&&BD17_activo_()&&typeof BD17_inicializarExpedienteNuevo_==='function'){
      var sr=REPO_RelacionalV5.obtenerSubetapasExpediente(exp.ID_EXPEDIENTE)||[];
      if(!sr.length)BD17_inicializarExpedienteNuevo_(exp.ID_EXPEDIENTE,codigo,exp.ID_USUARIO_ADMIN||'');
    }
  }catch(e2){errores.push('agenda: '+e2.message);}
  return {status:errores.length===0,expediente:codigo,modo:'RELACIONAL_DIRECTO_BACKGROUND',hashesGenerados:hashes,errores:errores,idempotente:true,message:errores.length?'Expediente registrado; algunos complementarios requieren revisión.':'Complementarios finalizados en segundo plano.'};
}
function BD16_ACTIVAR_CUTOVER_TOTAL(){
  var d=BD16_PREVISUALIZAR(); if(!d.status)throw new Error('BD-16 bloqueado: '+d.errores.join('; '));
  var pr=PropertiesService.getScriptProperties(); pr.setProperty(BD16_CONFIG.key,'TRUE'); pr.setProperty('BD151_SYNC_ENABLED','FALSE'); pr.setProperty('BD12_DUAL_WRITE_ENABLED','FALSE');
  if(typeof BD6_SET_READ_MODE==='function')BD6_SET_READ_MODE('RELATIONAL');
  if(typeof BD13_setMode_==='function')BD13_setMode_('RELATIONAL');
  var out=BD16_PROBAR_DIAGNOSTICO(); Logger.log(JSON.stringify(out,null,2)); return out;
}
function BD16_ROLLBACK_SEGURO(){var pr=PropertiesService.getScriptProperties();pr.setProperty(BD16_CONFIG.key,'FALSE');pr.setProperty('BD151_SYNC_ENABLED','TRUE');pr.setProperty('BD12_DUAL_WRITE_ENABLED','TRUE');if(typeof BD6_SET_READ_MODE==='function')BD6_SET_READ_MODE('MIRROR');if(typeof BD13_setMode_==='function')BD13_setMode_('MIRROR');return{status:true,fase:'BD-16',rollback:true,read:'MIRROR',write:'COMPAT+SYNC',auth:'MIRROR'};}
function BD16_PREVISUALIZAR(){var errs=[],tabs=['usuarios','estudiantes','programas','expedientes','expediente_estudiantes','etapas_catalogo','subetapas_catalogo','expediente_etapas','expediente_subetapas','documentos','checklist_items','checklist_respuestas','historial','asesores','talleres','taller_matriculas','taller_sesiones','taller_asistencia']; tabs.forEach(function(t){try{BD5_tabla_(t);}catch(e){errs.push(t+': '+e.message);}}); var out={status:errs.length===0,fase:'BD-16',version:BD16_CONFIG.version,modo:'PREVIEW',base:'BD_TITULACION_RELACIONAL_V2',tablas:tabs.length,errores:errs,modificaDatos:false};Logger.log(JSON.stringify(out,null,2));return out;}
function BD16_PROBAR_DIAGNOSTICO(){var cfg=typeof BD6_GET_CONFIG==='function'?BD6_GET_CONFIG():{},out={status:BD16_activo_()&&cfg.readMode==='RELATIONAL'&&BD13_mode_()==='RELATIONAL',fase:'BD-16',version:BD16_CONFIG.version,base:'BD_TITULACION_RELACIONAL_V2',readMode:cfg.readMode||'',writeMode:BD16_activo_()?'RELATIONAL':'COMPAT',authMode:BD13_mode_(),dualWrite:typeof BD12_enabled_==='function'?BD12_enabled_():null,sync151:typeof BD151_enabled_==='function'?BD151_enabled_():null,compatOperativo:false,driveHabilitado:true,rollbackDisponible:true};Logger.log(JSON.stringify(out,null,2));return out;}

function BD16_PERFIL_RELACIONAL(usuario,rol){var r=SOA_RolesV6Service.normalizar(rol),u=BD13_userRel_(usuario);if(!u)return null;if(r==='invitado'){var g=BD13_guestProfile_(usuario);return{id:u.ID_USUARIO,dni:u.USUARIO,usuario:u.USUARIO,nombre:u.NOMBRE,correo:u.CORREO,expediente:g.expediente,programa:g.programa,estado:u.ESTADO_REGISTRO};}return{id:u.ID_USUARIO,usuario:u.USUARIO,nombre:u.NOMBRE,rol:r,correo:u.CORREO};}
function BD16_LISTAR_USUARIOS_RELACIONALES(rol){return (REPO_RelacionalV5.listar('usuarios')||[]).filter(function(u){return !rol||SOA_RolesV6Service.normalizar(u.ROL)===rol;});}
