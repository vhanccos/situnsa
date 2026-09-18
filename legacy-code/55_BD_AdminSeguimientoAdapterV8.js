/**
 * ==============================================================
 * BD-08 - ADAPTADOR ADMINISTRACION + SEGUIMIENTO AL ROUTER
 * ==============================================================
 * Lecturas compatibles con BD-06:
 * - LEGACY: devuelve backend operativo actual.
 * - MIRROR: devuelve LEGACY y compara identidad/proceso relacional.
 * - RELATIONAL: habilitado solo para lecturas que tienen equivalencia
 *   funcional completa (busqueda de personas/proceso de seguimiento).
 *
 * Todas las escrituras permanecen en LEGACY.
 * ==============================================================
 */
const BD8_CONFIG = Object.freeze({version:'db-8.0-admin-seguimiento-router', writeBackend:'LEGACY'});

function BD8_norm_(v){return String(v==null?'':v).trim();}
function BD8_normSearch_(v){return BD8_norm_(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function BD8_fmtFecha_(v){
  if(!v) return '';
  if(Object.prototype.toString.call(v)==='[object Date]' && !isNaN(v.getTime())) return Utilities.formatDate(v,Session.getScriptTimeZone()||'America/Lima','dd/MM/yyyy HH:mm');
  return String(v);
}

function BD81_estadoRelALegacy_(v){
  var x=BD8_norm_(v).toUpperCase().replace(/\s+/g,'_');
  var map={
    '':'NO INICIADO',
    'PENDIENTE':'NO INICIADO',
    'NO_INICIADO':'NO INICIADO',
    'EN_PROCESO':'EN CURSO',
    'EN_CURSO':'EN CURSO',
    'FINALIZADO':'FINALIZADO',
    'OBSERVADO':'OBSERVADO',
    'ANULADO':'ANULADO'
  };
  return map.hasOwnProperty(x)?map[x]:BD8_norm_(v);
}
function BD81_estadoCanonico_(v){
  var x=BD8_norm_(v).toUpperCase().replace(/\s+/g,'_');
  if(x==='PENDIENTE'||x==='NO_INICIADO') return 'PENDIENTE';
  if(x==='EN_PROCESO'||x==='EN_CURSO') return 'EN_PROCESO';
  if(x==='FINALIZADO') return 'FINALIZADO';
  if(x==='OBSERVADO') return 'OBSERVADO';
  if(x==='ANULADO') return 'ANULADO';
  return x;
}

function BD8_relExpPorRef_(ref){
  var q=BD8_norm_(ref).toUpperCase();
  if(!q) return null;
  if(/^SET\d+/i.test(q)) return REPO_RelacionalV5.obtenerExpedientePorCodigo(q);
  var est=REPO_RelacionalV5.obtenerEstudiantePorDni(q.replace(/\D/g,''));
  if(!est) return null;
  var rel=REPO_RelacionalV5.filtrar('expediente_estudiantes',{ID_ESTUDIANTE:est.ID_ESTUDIANTE});
  if(!rel.length) return null;
  return REPO_RelacionalV5.buscarUno('expedientes','ID_EXPEDIENTE',rel[0].ID_EXPEDIENTE);
}
function BD8_relBuscarPersonas_(texto,limite){
  var q=BD8_normSearch_(texto); if(q.length<2) return [];
  var max=Number(limite||30), estudiantes=REPO_RelacionalV5.listar('estudiantes'), relaciones=REPO_RelacionalV5.listar('expediente_estudiantes'), expedientes=REPO_RelacionalV5.listar('expedientes');
  var expById={}, relByEst={};
  expedientes.forEach(function(e){expById[String(e.ID_EXPEDIENTE)]=e;});
  relaciones.forEach(function(r){var k=String(r.ID_ESTUDIANTE); if(!relByEst[k]) relByEst[k]=[]; relByEst[k].push(r);});
  var out=[];
  estudiantes.forEach(function(e){
    if(out.length>=max) return;
    var nombre=BD8_norm_(e.APELLIDOS_NOMBRES), dni=BD8_norm_(e.DNI);
    var match=BD8_normSearch_(nombre).indexOf(q)>=0 || dni.indexOf(q)>=0;
    var rr=relByEst[String(e.ID_ESTUDIANTE)]||[];
    rr.forEach(function(r){
      if(out.length>=max) return;
      var exp=expById[String(r.ID_EXPEDIENTE)]; if(!exp) return;
      var codigo=BD8_norm_(exp.CODIGO_TRAMITE).toUpperCase();
      if(!match && BD8_normSearch_(codigo).indexOf(q)<0) return;
      out.push({nombre:nombre,dni:dni,expediente:codigo,participante:Number(r.ORDEN_PARTICIPANTE||1),grupo:rr.length>1?2:1});
    });
  });
  return out;
}
function BD8_keyPersonas_(arr){return (arr||[]).map(function(x){return [BD8_norm_(x.expediente).toUpperCase(),BD8_norm_(x.dni)].join('|');}).sort();}
function BD8_comparePersonas_(a,b){
  var aa=BD8_keyPersonas_(a), bb=BD8_keyPersonas_(b);
  var soloA=aa.filter(function(x){return bb.indexOf(x)<0;}), soloB=bb.filter(function(x){return aa.indexOf(x)<0;});
  return {status:soloA.length===0&&soloB.length===0,legacy:aa.length,relacional:bb.length,soloLegacy:soloA,soloRelacional:soloB};
}
function BD8_relProceso_(referencia){
  var exp=BD8_relExpPorRef_(referencia), resultado={etapa1:[],etapa2:[],etapa3:[],etapa4:[],etapa5:[],etapa6:[],etapa7:[]};
  if(!exp) return resultado;
  var rows=REPO_RelacionalV5.obtenerSubetapasExpediente(exp.ID_EXPEDIENTE)||[];
  // BD-17.3: autorreparar expedientes nuevos que por cualquier corte previo quedaron sin agenda.
  if(!rows.length && typeof BD17_activo_==='function' && BD17_activo_() && typeof BD17_inicializarExpedienteNuevo_==='function'){
    try{
      var adminId=exp.ID_USUARIO_ADMIN||'';
      BD17_inicializarExpedienteNuevo_(exp.ID_EXPEDIENTE,exp.CODIGO_TRAMITE,adminId);
      rows=REPO_RelacionalV5.obtenerSubetapasExpediente(exp.ID_EXPEDIENTE)||[];
    }catch(_e){ Logger.log('[BD-17.3] No se pudo autorreparar agenda '+referencia+': '+_e.message); }
  }
  var catsE=REPO_RelacionalV5.listar('etapas_catalogo'), catsS=REPO_RelacionalV5.listar('subetapas_catalogo'), usuarios=REPO_RelacionalV5.listar('usuarios');
  var etapaById={}, subById={}, userById={};
  catsE.forEach(function(x){etapaById[String(x.ID_ETAPA)]=x;});
  catsS.forEach(function(x){if(BD8_norm_(x.ESTADO_REGISTRO).toUpperCase()!=='INACTIVO')subById[String(x.ID_SUBETAPA)]=x;});
  usuarios.forEach(function(x){userById[String(x.ID_USUARIO)]=x;});
  rows.forEach(function(r){
    var sc=subById[String(r.ID_SUBETAPA)]; if(!sc) return;
    var ec=etapaById[String(sc.ID_ETAPA)]; var n=Number(ec&&ec.ORDEN||0); if(n<1||n>7) return;
    var u=userById[String(r.ID_RESPONSABLE)]||{};
    resultado['etapa'+n].push({
      id:r.ID_EXPEDIENTE_SUBETAPA||'', expediente:exp.CODIGO_TRAMITE||'', etapa:n,
      nombreEtapa:(ec&&ec.NOMBRE)||'', subetapa:Number(sc.ORDEN||0), codigo:sc.CODIGO||'', descripcion:sc.NOMBRE||'', plazo:sc.PLAZO||'',
      estado:BD81_estadoRelALegacy_(r.ESTADO), fechaInicio:BD8_fmtFecha_(r.FECHA_INICIO), usuarioInicio:'', responsable:u.CORREO||u.NOMBRE||'',
      fechaFin:BD8_fmtFecha_(r.FECHA_FIN), usuarioFin:'', delegadoPor:'', fechaDelegacion:'', archivoId:'', archivoNombre:'', archivoUrl:'', versionArchivo:0,
      permiteNuevaCarga:'NO', ultimaActualizacion:BD8_fmtFecha_(r.MODIFICADO_EN)
    });
  });
  Object.keys(resultado).forEach(function(k){resultado[k].sort(function(a,b){return Number(a.subetapa||0)-Number(b.subetapa||0);});});
  return resultado;
}
function BD8_resumenProceso_(obj){var out={}; for(var i=1;i<=7;i++){var a=obj['etapa'+i]||[];out['etapa'+i]=a.map(function(x){return [Number(x.subetapa||0),BD81_estadoCanonico_(x.estado)].join(':');});}return JSON.stringify(out);}

const REPO_AdministracionRoutedV8=Object.freeze({
  buscarPersonas:function(texto,limite){var r=BD6_resolverLectura_(), legacy=REPO_AdministracionV3.buscarPersonas(texto,limite); if(r.mode==='LEGACY')return legacy; var rel=BD8_relBuscarPersonas_(texto,limite); if(r.mode==='RELATIONAL')return rel; var c=BD8_comparePersonas_(legacy,rel); if(!c.status)Logger.log('[BD-08 MIRROR][ADMIN_BUSCAR] '+JSON.stringify(c)); return legacy;},
  buscarAdmin:function(texto,limite){return REPO_AdministracionV3.buscarAdmin(texto,limite);},
  buscarExpedientes:function(texto,limite){return REPO_AdministracionV3.buscarExpedientes(texto,limite);},
  obtenerDatos:function(id){var r=BD6_resolverLectura_(); if(r.mode==='RELATIONAL' && typeof BD172_datosAdminRelacional==='function') return BD172_datosAdminRelacional(id); return REPO_AdministracionV3.obtenerDatos(id);},
  actualizar:function(datos){var r=BD6_resolverLectura_(); if(r.mode==='RELATIONAL' && typeof BD172_actualizarAdminRelacional==='function') return BD172_actualizarAdminRelacional(datos||{}); BD6_assertWriteLegacy_();var x=REPO_AdministracionV3.actualizar(datos);if(typeof BD12_afterLegacySafe_==='function')BD12_afterLegacySafe_('ADMINISTRACION','ACTUALIZAR',(x&&x.expediente)||(datos&&datos.expediente)||'',datos||{});return x;}
});

const REPO_SeguimientoRoutedV8=Object.freeze({
  buscar:function(texto,limite){return REPO_AdministracionRoutedV8.buscarPersonas(texto,limite);},
  obtenerLegacy:function(dni){return REPO_SeguimientoV3.obtenerLegacy(dni);},
  guardarLegacy:function(datos){BD6_assertWriteLegacy_();var r=REPO_SeguimientoV3.guardarLegacy(datos);if(typeof BD12_afterLegacySafe_==='function')BD12_afterLegacySafe_('SEGUIMIENTO','GUARDAR',(r&&r.expediente)||(datos&&datos.expediente)||(datos&&datos.dni)||'',datos||{});return r;},
  procesoPorExpediente:function(ref){var r=BD6_resolverLectura_(), legacy=REPO_SeguimientoV3.procesoPorExpediente(ref); if(r.mode==='LEGACY')return legacy; var rel=BD8_relProceso_(ref); if(r.mode==='RELATIONAL')return rel; var ok=BD8_resumenProceso_(legacy)===BD8_resumenProceso_(rel); if(!ok)Logger.log('[BD-08 MIRROR][SEGUIMIENTO] diferencia en '+ref); return legacy;},
  procesoPorDni:function(dni){var exp=BD8_relExpPorRef_(dni); if(BD6_getReadMode_()==='RELATIONAL'){if(!exp)return []; var completo=BD8_relProceso_(exp.CODIGO_TRAMITE),out=[]; for(var n=1;n<=7;n++){var p=completo['etapa'+n]||[];if(!p.length)continue;var fin=p.filter(function(x){return String(x.estado).toUpperCase()==='FINALIZADO';}).length;var curso=p.some(function(x){return ['EN CURSO','EN_PROCESO'].indexOf(String(x.estado).toUpperCase())>=0;});var estado=(fin===p.length)?'FINALIZADO':((curso||fin)?'EN CURSO':'NO INICIADO');out.push({etapa:n,nombre:p[0].nombreEtapa||'',estado:estado,porcentaje:Math.round(fin*100/p.length),procesos:p});}return out;} return REPO_SeguimientoV3.procesoPorDni(dni);}
});

function BD8_ACTIVAR_MIRROR(){return BD6_SET_READ_MODE('MIRROR');}
function BD8_ROLLBACK_LEGACY(){var x=BD6_SET_READ_MODE('LEGACY');x.rollback=true;return x;}
