/**
 * ==============================================================
 * BD-09 - ADAPTER DOCUMENTOS + CHECKLIST + HISTORIAL
 * ==============================================================
 * Objetivo:
 * - Integrar lecturas documentales al selector BD-06.
 * - Mantener TODAS las escrituras en LEGACY.
 * - En MIRROR devolver LEGACY y comparar en sombra.
 * - En RELATIONAL usar datos relacionales solo si existe cobertura;
 *   de lo contrario aplicar fallback seguro a LEGACY.
 *
 * No reemplaza operaciones fisicas de Drive.
 * ==============================================================
 */
const BD9_CONFIG = Object.freeze({
  version: 'db-9.0-documentos-checklist-historial-router',
  writeBackend: 'LEGACY'
});

function BD9_txt_(v){ return String(v == null ? '' : v).trim(); }
function BD9_up_(v){ return BD9_txt_(v).toUpperCase(); }
function BD9_bool_(v){
  if (v === true || v === false) return v;
  var x=BD9_up_(v);
  return ['TRUE','SI','SÍ','1','X','OK','PRESENTE'].indexOf(x)>=0;
}
function BD9_fecha_(v){
  if(!v) return '';
  if(Object.prototype.toString.call(v)==='[object Date]' && !isNaN(v.getTime())){
    return Utilities.formatDate(v, Session.getScriptTimeZone()||'America/Lima', 'dd/MM/yyyy HH:mm');
  }
  return String(v);
}
function BD9_relExp_(ref){
  if(typeof BD8_relExpPorRef_==='function') return BD8_relExpPorRef_(ref);
  var q=BD9_up_(ref);
  if(/^SET\d+/.test(q)) return REPO_RelacionalV5.obtenerExpedientePorCodigo(q);
  var est=REPO_RelacionalV5.obtenerEstudiantePorDni(q.replace(/\D/g,''));
  if(!est) return null;
  var rel=REPO_RelacionalV5.filtrar('expediente_estudiantes',{ID_ESTUDIANTE:est.ID_ESTUDIANTE});
  return rel.length ? REPO_RelacionalV5.buscarUno('expedientes','ID_EXPEDIENTE',rel[0].ID_EXPEDIENTE) : null;
}
function BD9_usuarioById_(){
  var map={};
  REPO_RelacionalV5.listar('usuarios').forEach(function(u){map[String(u.ID_USUARIO||'')]=u;});
  return map;
}
function BD9_participantePrincipal_(idExp){
  var rel=REPO_RelacionalV5.filtrar('expediente_estudiantes',{ID_EXPEDIENTE:idExp});
  rel.sort(function(a,b){return Number(a.ORDEN_PARTICIPANTE||1)-Number(b.ORDEN_PARTICIPANTE||1);});
  if(!rel.length) return null;
  return REPO_RelacionalV5.buscarUno('estudiantes','ID_ESTUDIANTE',rel[0].ID_ESTUDIANTE);
}

/* ---------------- DOCUMENTOS ---------------- */
function BD9_relDocsRaw_(ref){
  var exp=BD9_relExp_(ref);
  if(!exp) return {exp:null,rows:[]};
  return {exp:exp,rows:REPO_RelacionalV5.filtrar('documentos',{ID_EXPEDIENTE:exp.ID_EXPEDIENTE})};
}
function BD9_relDocumentosExpediente_(ref){
  var x=BD9_relDocsRaw_(ref), exp=x.exp;
  if(!exp) return {status:false,message:'No se pudo identificar el expediente.',archivos:[],_bd9Coverage:false};
  var archivos=x.rows.filter(function(r){return BD9_up_(r.ESTADO_REGISTRO||'ACTIVO')!=='ELIMINADO';}).map(function(r){
    return {
      id:BD9_txt_(r.DRIVE_FILE_ID)||BD9_txt_(r.ID_DOCUMENTO),
      nombre:BD9_txt_(r.NOMBRE_ARCHIVO),
      url:BD9_txt_(r.DRIVE_URL),
      mimeType:'',
      tamano:0,
      tamanoTexto:'',
      fechaModificacion:BD9_fecha_(r.MODIFICADO_EN),
      estado:BD9_txt_(r.ESTADO),
      version:Number(r.VERSION||1)
    };
  });
  archivos.sort(function(a,b){return a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'});});
  return {status:true,expediente:BD9_txt_(exp.CODIGO_TRAMITE),carpetaId:'',carpetaUrl:'',archivos:archivos,_bd9Coverage:archivos.length>0};
}
function BD9_relDocumentosEtapa_(ref,etapa){
  var x=BD9_relDocsRaw_(ref), exp=x.exp, numero=Number(String(etapa||'').replace(/\D/g,''));
  if(!exp) return {status:false,expediente:'',documentos:[],message:'No se pudo identificar el expediente.',_bd9Coverage:false};
  var subs=REPO_RelacionalV5.listar('subetapas_catalogo'), etapas=REPO_RelacionalV5.listar('etapas_catalogo'), subById={}, etapaById={};
  etapas.forEach(function(e){etapaById[String(e.ID_ETAPA)]=e;});
  subs.forEach(function(s){subById[String(s.ID_SUBETAPA)]=s;});
  var rows=x.rows.filter(function(r){
    var s=subById[String(r.ID_SUBETAPA||'')], e=s?etapaById[String(s.ID_ETAPA||'')]:null;
    return e && Number(e.ORDEN||0)===numero && BD9_up_(r.ESTADO_REGISTRO||'ACTIVO')!=='ELIMINADO';
  });
  var documentos=rows.map(function(r){
    return {id:BD9_txt_(r.DRIVE_FILE_ID)||BD9_txt_(r.ID_DOCUMENTO),nombre:BD9_txt_(r.NOMBRE_ARCHIVO),url:BD9_txt_(r.DRIVE_URL),mimeType:'',estado:BD9_txt_(r.ESTADO),version:Number(r.VERSION||1),fechaModificacion:BD9_fecha_(r.MODIFICADO_EN),camposFaltantes:[],incompleto:false};
  });
  return {status:true,expediente:BD9_txt_(exp.CODIGO_TRAMITE),etapa:numero,documentos:documentos,_bd9Coverage:documentos.length>0};
}
function BD9_docIds_(obj){
  var arr=(obj&&obj.archivos)||(obj&&obj.documentos)||[];
  return arr.map(function(x){return BD9_txt_(x.id||x.archivoId||x.DRIVE_FILE_ID);}).filter(Boolean).sort();
}
function BD9_cmpIds_(legacy,rel){
  var a=BD9_docIds_(legacy),b=BD9_docIds_(rel),sa={},sb={};
  a.forEach(function(x){sa[x]=true;}); b.forEach(function(x){sb[x]=true;});
  var soloA=a.filter(function(x){return !sb[x];}),soloB=b.filter(function(x){return !sa[x];});
  return {status:soloA.length===0&&soloB.length===0,legacy:a.length,relacional:b.length,soloLegacy:soloA,soloRelacional:soloB};
}

/* ---------------- CHECKLIST ---------------- */
function BD9_relChecklist_(ref){
  var exp=BD9_relExp_(ref);
  if(!exp) return {status:false,message:'No se pudo identificar el expediente.',_bd9Coverage:false};
  var items=REPO_RelacionalV5.listar('checklist_items').filter(function(i){return BD9_up_(i.ESTADO_REGISTRO||'ACTIVO')!=='ELIMINADO';});
  var resp=REPO_RelacionalV5.filtrar('checklist_respuestas',{ID_EXPEDIENTE:exp.ID_EXPEDIENTE}), byItem={};
  resp.forEach(function(r){byItem[String(r.ID_CHECKLIST_ITEM||'')]=r;});
  items.sort(function(a,b){return Number(a.ORDEN||0)-Number(b.ORDEN||0);});
  var req=items.map(function(i){var r=byItem[String(i.ID_CHECKLIST_ITEM||'')]||{};return {id:BD9_txt_(r.ID_CHECKLIST_RESPUESTA||i.ID_CHECKLIST_ITEM),numero:Number(i.ORDEN||0),nombre:BD9_txt_(i.NOMBRE),marcado:BD9_bool_(r.VALOR),archivo:{id:'',nombre:'',url:'',mimeType:''},usuario:BD9_txt_(r.ID_USUARIO),correo:'',actualizado:BD9_fecha_(r.MODIFICADO_EN)};});
  var marcados=req.filter(function(x){return x.marcado;}).length,total=req.length;
  return {status:true,expediente:BD9_txt_(exp.CODIGO_TRAMITE),completo:total>0&&marcados===total,porcentaje:total?Math.round(marcados*100/total):0,marcados:marcados,total:total,requisitos:req,_bd9Coverage:items.length>0};
}
function BD9_cmpChecklist_(legacy,rel){
  var la=(legacy&&legacy.requisitos)||[],ra=(rel&&rel.requisitos)||[], lm={},rm={};
  la.forEach(function(x){lm[String(Number(x.numero||0))]=!!x.marcado;});
  ra.forEach(function(x){rm[String(Number(x.numero||0))]=!!x.marcado;});
  var keys={};Object.keys(lm).forEach(function(k){keys[k]=true;});Object.keys(rm).forEach(function(k){keys[k]=true;});
  var dif=[];Object.keys(keys).forEach(function(k){if(lm[k]!==rm[k])dif.push({numero:Number(k),legacy:lm[k],relacional:rm[k]});});
  return {status:dif.length===0&&la.length===ra.length,legacy:la.length,relacional:ra.length,diferencias:dif};
}

/* ---------------- HISTORIAL ---------------- */
function BD9_relHistorialPorExp_(ref,soloPublico){
  var exp=BD9_relExp_(ref); if(!exp) return [];
  var p=BD9_participantePrincipal_(exp.ID_EXPEDIENTE)||{},users=BD9_usuarioById_();
  var rows=REPO_RelacionalV5.filtrar('historial',{ID_EXPEDIENTE:exp.ID_EXPEDIENTE});
  rows=rows.filter(function(r){return !soloPublico || BD9_up_(r.VISIBILIDAD)==='PUBLICO';});
  rows.sort(function(a,b){var da=new Date(a.CREADO_EN||0).getTime()||0,db=new Date(b.CREADO_EN||0).getTime()||0;return db-da;});
  return rows.map(function(r){var u=users[String(r.ID_USUARIO||'')]||{};return {id:BD9_txt_(r.ID_HISTORIAL),dni:BD9_txt_(p.DNI),expediente:BD9_txt_(exp.CODIGO_TRAMITE),nombres:BD9_txt_(p.APELLIDOS_NOMBRES),etapa:BD9_txt_(r.ETAPA),accion:BD9_txt_(r.EVENTO),descripcion:BD9_txt_(r.DETALLE),usuario:BD9_txt_(u.NOMBRE||u.USUARIO),correoUsuario:BD9_txt_(u.CORREO),fecha:BD9_fecha_(r.CREADO_EN),hora:'',observacion:'',visibilidad:BD9_txt_(r.VISIBILIDAD),estado:BD9_txt_(r.ESTADO)};});
}
function BD9_histKey_(x){return [BD9_up_(x.expediente),BD9_up_(x.accion),BD9_up_(x.etapa),BD9_up_(x.descripcion)].join('|');}
function BD9_cmpHistorial_(legacy,rel){
  var a=(legacy||[]).map(BD9_histKey_),b=(rel||[]).map(BD9_histKey_),sa={},sb={};a.forEach(function(x){sa[x]=true;});b.forEach(function(x){sb[x]=true;});
  var soloA=a.filter(function(x){return !sb[x];}),soloB=b.filter(function(x){return !sa[x];});
  return {status:soloA.length===0&&soloB.length===0,legacy:a.length,relacional:b.length,soloLegacy:soloA.slice(0,10),soloRelacional:soloB.slice(0,10)};
}

/* ---------------- ROUTED REPOSITORIES ---------------- */
const REPO_DocumentosRoutedV9 = Object.freeze({
  listarPorExpediente:function(expediente){
    var r=BD6_resolverLectura_(),legacy=REPO_DocumentosV4.listarPorExpediente(expediente);
    if(r.mode==='LEGACY') return legacy;
    var rel=BD9_relDocumentosExpediente_(expediente);
    if(r.mode==='RELATIONAL') return rel._bd9Coverage ? rel : legacy;
    var cmp=BD9_cmpIds_(legacy,rel); if(!cmp.status) Logger.log('[BD-09 MIRROR][DOCUMENTOS] '+BD9_up_(expediente)+' '+JSON.stringify(cmp));
    return legacy;
  },
  listarPorEtapa:function(expediente,etapa){
    var r=BD6_resolverLectura_(),legacy=REPO_DocumentosV4.listarPorEtapa(expediente,etapa);
    if(r.mode==='LEGACY') return legacy;
    var rel=BD9_relDocumentosEtapa_(expediente,etapa);
    if(r.mode==='RELATIONAL') return rel._bd9Coverage ? rel : legacy;
    return legacy;
  },
  subirExpediente:function(datos){BD6_assertWriteLegacy_();var r=REPO_DocumentosV4.subirExpediente(datos);if(typeof BD12_afterLegacySafe_==='function')BD12_afterLegacySafe_('DOCUMENTOS','SUBIR_EXPEDIENTE',(datos&&datos.expediente)||'',datos||{});return r;},
  renombrarExpediente:function(datos){BD6_assertWriteLegacy_();return REPO_DocumentosV4.renombrarExpediente(datos);},
  eliminarExpediente:function(datos){BD6_assertWriteLegacy_();var r=REPO_DocumentosV4.eliminarExpediente(datos);if(typeof BD12_afterLegacySafe_==='function')BD12_afterLegacySafe_('DOCUMENTOS','ELIMINAR_EXPEDIENTE',(datos&&datos.expediente)||'',datos||{});return r;},
  subirSubetapa:function(datos){BD6_assertWriteLegacy_();var r=REPO_DocumentosV4.subirSubetapa(datos);if(typeof BD12_afterLegacySafe_==='function')BD12_afterLegacySafe_('DOCUMENTOS','SUBIR_SUBETAPA',(datos&&datos.expediente)||'',datos||{});return r;},
  historialSubetapa:function(expediente,etapa,subetapa){return REPO_DocumentosV4.historialSubetapa(expediente,etapa,subetapa);},
  autorizarNuevaCarga:function(id,usuario,correoUsuario,mensaje){BD6_assertWriteLegacy_();return REPO_DocumentosV4.autorizarNuevaCarga(id,usuario,correoUsuario,mensaje);}
});

const REPO_ChecklistRoutedV9 = Object.freeze({
  asegurar:function(expediente){BD6_assertWriteLegacy_();return REPO_ChecklistV4.asegurar(expediente);},
  obtener:function(expediente){
    var r=BD6_resolverLectura_(),legacy=REPO_ChecklistV4.obtener(expediente);
    if(r.mode==='LEGACY') return legacy;
    var rel=BD9_relChecklist_(expediente);
    if(r.mode==='RELATIONAL') return rel._bd9Coverage ? rel : legacy;
    if(rel._bd9Coverage){var cmp=BD9_cmpChecklist_(legacy,rel);if(!cmp.status)Logger.log('[BD-09 MIRROR][CHECKLIST] '+BD9_up_(expediente)+' '+JSON.stringify(cmp));}
    return legacy;
  },
  guardarCheck:function(expediente,clave,valor,usuario,correo){BD6_assertWriteLegacy_();var r=REPO_ChecklistV4.guardarCheck(expediente,clave,valor,usuario,correo);if(typeof BD12_afterLegacySafe_==='function')BD12_afterLegacySafe_('CHECKLIST','GUARDAR',expediente,{expediente:expediente,clave:clave,valor:valor,usuario:usuario,correo:correo});return r;},
  subirDocumento:function(datos){BD6_assertWriteLegacy_();var r=REPO_ChecklistV4.subirDocumento(datos);if(typeof BD12_afterLegacySafe_==='function')BD12_afterLegacySafe_('CHECKLIST','SUBIR_DOCUMENTO',(datos&&datos.expediente)||'',datos||{});return r;},
  eliminarDocumento:function(datos){BD6_assertWriteLegacy_();var r=REPO_ChecklistV4.eliminarDocumento(datos);if(typeof BD12_afterLegacySafe_==='function')BD12_afterLegacySafe_('CHECKLIST','ELIMINAR_DOCUMENTO',(datos&&datos.expediente)||'',datos||{});return r;},
  renombrarDocumento:function(datos){BD6_assertWriteLegacy_();return REPO_ChecklistV4.renombrarDocumento(datos);},
  validarCompleto:function(expediente){return REPO_ChecklistV4.validarCompleto(expediente);}
});

const REPO_HistorialRoutedV9 = Object.freeze({
  registrar:function(datos){BD6_assertWriteLegacy_();var r=REPO_HistorialV4.registrar(datos);if(typeof BD12_afterLegacySafe_==='function')BD12_afterLegacySafe_('HISTORIAL','REGISTRAR',(datos&&datos.expediente)||'',datos||{});return r;},
  porDni:function(dni,soloPublico){
    var r=BD6_resolverLectura_(),legacy=REPO_HistorialV4.porDni(dni,soloPublico);if(r.mode==='LEGACY')return legacy;
    var rel=BD9_relHistorialPorExp_(dni,soloPublico);if(r.mode==='RELATIONAL')return rel.length?rel:legacy; if(rel.length){var c=BD9_cmpHistorial_(legacy,rel);if(!c.status)Logger.log('[BD-09 MIRROR][HISTORIAL DNI] '+dni+' '+JSON.stringify(c));}return legacy;
  },
  porExpediente:function(expediente,soloPublico){
    var r=BD6_resolverLectura_(),legacy=REPO_HistorialV4.porExpediente(expediente,soloPublico);if(r.mode==='LEGACY')return legacy;
    var rel=BD9_relHistorialPorExp_(expediente,soloPublico);if(r.mode==='RELATIONAL')return rel.length?rel:legacy; if(rel.length){var c=BD9_cmpHistorial_(legacy,rel);if(!c.status)Logger.log('[BD-09 MIRROR][HISTORIAL EXP] '+expediente+' '+JSON.stringify(c));}return legacy;
  },
  admin:function(expediente){return this.porExpediente(expediente,false);},
  porCorreo:function(correo){
    // Por ahora conserva resolucion legacy: el modelo relacional no define CORREO como FK de historial.
    return REPO_HistorialV4.porCorreo(correo);
  }
});

function BD9_ACTIVAR_MIRROR(){return BD6_SET_READ_MODE('MIRROR');}
function BD9_ROLLBACK_LEGACY(){var x=BD6_SET_READ_MODE('LEGACY');x.rollback=true;return x;}