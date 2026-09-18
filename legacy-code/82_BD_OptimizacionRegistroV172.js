/**
 * BD-17.2 - OPTIMIZACION DE REGISTRO + DETALLE RELACIONAL
 * - Corrige detalle de expedientes nuevos en modo RELATIONAL.
 * - Permite actualizar datos administrativos directamente en tablas relacionales.
 * - El alta principal queda optimizada por lotes desde BD16.
 */
const BD172_CONFIG=Object.freeze({fase:'BD-17.2',version:'db-17.2-registro-rapido-detalle-relacional'});
function BD172_txt_(v){return String(v==null?'':v).trim();}
function BD172_up_(v){return BD172_txt_(v).toUpperCase();}
function BD172_digits_(v){return BD172_txt_(v).replace(/\D/g,'');}
function BD172_fmt_(v){if(!v)return '';if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))return Utilities.formatDate(v,Session.getScriptTimeZone()||'America/Lima','yyyy-MM-dd');return v;}
function BD172_expPorRef_(ref){
  var q=BD172_txt_(ref); if(!q)return null;
  if(/^SET\d+/i.test(q))return REPO_RelacionalV5.obtenerExpedientePorCodigo(BD172_up_(q));
  var est=REPO_RelacionalV5.obtenerEstudiantePorDni(BD172_digits_(q)); if(!est)return null;
  var rel=REPO_RelacionalV5.filtrar('expediente_estudiantes',{ID_ESTUDIANTE:est.ID_ESTUDIANTE})||[]; if(!rel.length)return null;
  return REPO_RelacionalV5.buscarUno('expedientes','ID_EXPEDIENTE',rel[0].ID_EXPEDIENTE);
}
function BD172_datosAdminRelacional(ref){
  var exp=BD172_expPorRef_(ref); if(!exp)return null;
  var rels=(REPO_RelacionalV5.filtrar('expediente_estudiantes',{ID_EXPEDIENTE:exp.ID_EXPEDIENTE})||[]).slice().sort(function(a,b){return Number(a.ORDEN_PARTICIPANTE||0)-Number(b.ORDEN_PARTICIPANTE||0);});
  var progs=REPO_RelacionalV5.listar('programas')||[], pmap={}; progs.forEach(function(p){pmap[String(p.ID_PROGRAMA)]=p;});
  function part(n){var r=rels[n],e=r?REPO_RelacionalV5.buscarUno('estudiantes','ID_ESTUDIANTE',r.ID_ESTUDIANTE):null;if(!e)return{};var pr=pmap[String(e.ID_PROGRAMA)]||{};return{dni:e.DNI||'',nombres:e.APELLIDOS_NOMBRES||'',programas:pr.NOMBRE||pr.CODIGO||'',correo:e.CORREO||'',cui:e.CUI||'',nacionalidad:e.NACIONALIDAD||'',ciudad:e.CIUDAD||'',telefono:e.TELEFONO||'',direccion:e.DIRECCION||''};}
  var a=part(0),b=part(1);
  return {
    expediente:exp.CODIGO_TRAMITE||'',grupo:Number(exp.GRUPO||rels.length||1),
    dni:a.dni||'',nombres:a.nombres||'',programas:a.programas||'',tesis:exp.TESIS||'',modalidad:exp.MODALIDAD||'',correo:a.correo||'',cui:a.cui||'',nacionalidad:a.nacionalidad||'',ciudad:a.ciudad||'',telefono:a.telefono||'',direccion:a.direccion||'',
    dni02:b.dni||'',nombres02:b.nombres||'',programas02:b.programas||'',tesis02:exp.TESIS_02||exp.TESIS||'',modalidad02:exp.MODALIDAD_02||'',correo02:b.correo||'',cui02:b.cui||'',nacionalidad02:b.nacionalidad||'',ciudad02:b.ciudad||'',telefono02:b.telefono||'',direccion02:b.direccion||'',
    decreto:exp.DECRETO||'',recomendacion:exp.RECOMENDACION||'',presidente:exp.PRESIDENTE||'',asesor:exp.ASESOR||'',secretario:exp.SECRETARIO||'',coasesor:exp.CO_ASESOR||'',fechaApertura:BD172_fmt_(exp.FECHA_APERTURA),fechaPresentacion:BD172_fmt_(exp.FECHA_PRESENTACION),oficio:exp.OFICIO||'',integrante:exp.INTEGRANTE||'',presidenteEtapa02:exp.PRESIDENTE_02||'',secretarioEtapa02:exp.SECRETARIO_02||'',suplenteEtapa02:exp.SUPLENTE_02||'',decanal:exp.DECANAL||'',fechaActa:BD172_fmt_(exp.FECHA_ACTAS),horaActa:exp.HORAS_ACTAS||'',lugarSustentacion:exp.LUGAR_SUSTENTACION||'',modalidadFinal:exp.MODALIDAD_FINAL||''
  };
}
function BD172_programaId_(nombre){var q=BD172_up_(nombre),rows=REPO_RelacionalV5.listar('programas')||[];for(var i=0;i<rows.length;i++)if(BD172_up_(rows[i].NOMBRE)===q||BD172_up_(rows[i].CODIGO)===q)return rows[i].ID_PROGRAMA||'';return '';}
function BD172_actualizarAdminRelacional(datos){
  datos=datos||{};
  if(typeof BD1811_normalizarDatosAdmin_==='function') datos=BD1811_normalizarDatosAdmin_(datos);var exp=BD172_expPorRef_(datos.expediente);if(!exp)throw new Error('No se encontró el expediente '+BD172_txt_(datos.expediente)+'.');
  var now=new Date(),eo={ID_EXPEDIENTE:exp.ID_EXPEDIENTE};
  var map={grupo:'GRUPO',tesis:'TESIS',modalidad:'MODALIDAD',tesis02:'TESIS_02',modalidad02:'MODALIDAD_02',decreto:'DECRETO',recomendacion:'RECOMENDACION',presidente:'PRESIDENTE',asesor:'ASESOR',secretario:'SECRETARIO',coasesor:'CO_ASESOR',fechaApertura:'FECHA_APERTURA',fechaPresentacion:'FECHA_PRESENTACION',oficio:'OFICIO',integrante:'INTEGRANTE',presidenteEtapa02:'PRESIDENTE_02',secretarioEtapa02:'SECRETARIO_02',suplenteEtapa02:'SUPLENTE_02',decanal:'DECANAL',fechaActa:'FECHA_ACTAS',horaActa:'HORAS_ACTAS',lugarSustentacion:'LUGAR_SUSTENTACION',modalidadFinal:'MODALIDAD_FINAL'};
  Object.keys(map).forEach(function(k){if(Object.prototype.hasOwnProperty.call(datos,k))eo[map[k]]=datos[k]==null?'':datos[k];});eo.MODIFICADO_EN=now;BD16_upsert_('expedientes','ID_EXPEDIENTE',eo);
  var rels=(REPO_RelacionalV5.filtrar('expediente_estudiantes',{ID_EXPEDIENTE:exp.ID_EXPEDIENTE})||[]).slice().sort(function(a,b){return Number(a.ORDEN_PARTICIPANTE||0)-Number(b.ORDEN_PARTICIPANTE||0);});
  function upd(ix,suf){var r=rels[ix];if(!r)return;var e=REPO_RelacionalV5.buscarUno('estudiantes','ID_ESTUDIANTE',r.ID_ESTUDIANTE);if(!e)return;var get=function(base){var k=base+(suf||'');return Object.prototype.hasOwnProperty.call(datos,k)?datos[k]:undefined;};var o={ID_ESTUDIANTE:e.ID_ESTUDIANTE,MODIFICADO_EN:now};var v;
    if((v=get('dni'))!==undefined)o.DNI=BD172_digits_(v);if((v=get('nombres'))!==undefined)o.APELLIDOS_NOMBRES=BD172_up_(v);if((v=get('correo'))!==undefined)o.CORREO=BD172_txt_(v).toLowerCase();if((v=get('cui'))!==undefined)o.CUI=BD172_txt_(v);if((v=get('nacionalidad'))!==undefined)o.NACIONALIDAD=BD172_txt_(v);if((v=get('ciudad'))!==undefined)o.CIUDAD=BD172_txt_(v);if((v=get('telefono'))!==undefined)o.TELEFONO=BD172_txt_(v);if((v=get('direccion'))!==undefined)o.DIRECCION=BD172_txt_(v);if((v=get('programas'))!==undefined)o.ID_PROGRAMA=BD172_programaId_(v);BD16_upsert_('estudiantes','ID_ESTUDIANTE',o);
  }
  upd(0,'');upd(1,'02');return{status:true,expediente:exp.CODIGO_TRAMITE,fuente:'RELACIONAL_DIRECTA'};
}
function BD172_PROBAR_DIAGNOSTICO(){var cfg=typeof BD6_GET_CONFIG==='function'?BD6_GET_CONFIG():{},out={status:cfg.readMode==='RELATIONAL'&&typeof BD16_activo_==='function'&&BD16_activo_(),fase:BD172_CONFIG.fase,version:BD172_CONFIG.version,readMode:cfg.readMode||'',detalleRelacional:true,registroBatch:true,compatDetalle:false};Logger.log(JSON.stringify(out,null,2));return out;}
