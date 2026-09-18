/**
 * ==============================================================
 * BD-03 - MIGRACION CONTROLADA LEGACY -> MODELO RELACIONAL
 * ==============================================================
 * - Solo LEE las fuentes legacy.
 * - Solo ESCRIBE en BD_TITULACION_RELACIONAL_V2.
 * - No elimina ni modifica datos legacy.
 * - La ejecucion inicial exige tablas destino vacias.
 * ==============================================================
 */

const BD3_CONFIG = Object.freeze({
  version: 'db-3.0-migracion-controlada',
  timezone: 'America/Lima',
  exigeDestinoVacio: true
});

function BD3_txt_(v){ return String(v == null ? '' : v).trim(); }
function BD3_up_(v){ return BD3_txt_(v).toUpperCase(); }
function BD3_low_(v){ return BD3_txt_(v).toLowerCase(); }
function BD3_digits_(v){ return BD3_txt_(v).replace(/\D/g,''); }
function BD3_bool_(v){ var s=BD3_up_(v); return s==='SI'||s==='SÍ'||s==='TRUE'||s==='1'||s==='X'||s==='OK'; }
function BD3_safe_(v){ return BD3_up_(v).replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60); }

function BD3_hash8_(v){
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, BD3_txt_(v));
  return bytes.slice(0,4).map(function(x){return ('0'+((x+256)%256).toString(16)).slice(-2);}).join('').toUpperCase();
}
function BD3_codigoPrograma_(nombre){
  var base=BD3_safe_(nombre), pref=base.slice(0,20).replace(/_+$/,'');
  return (pref||'PROGRAMA')+'_'+BD3_hash8_(BD3_up_(nombre));
}

function BD3_id_(prefijo, clave){
  var k=BD3_safe_(clave);
  if(k) return prefijo+'_'+k;
  var b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, BD3_txt_(clave)||Utilities.getUuid());
  return prefijo+'_'+b.slice(0,8).map(function(x){return ('0'+((x+256)%256).toString(16)).slice(-2);}).join('').toUpperCase();
}
function BD3_date_(v){
  if(!v) return '';
  if(Object.prototype.toString.call(v)==='[object Date]' && !isNaN(v.getTime())) return v;
  var s=BD3_txt_(v), m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if(m) return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]||0),Number(m[5]||0),Number(m[6]||0));
  var d=new Date(s); return isNaN(d.getTime()) ? '' : d;
}

function BD3_estadoHistorial_(v){
  var s=BD3_up_(v);
  if(!s) return 'INFO';
  if(['SUCCESS','INFO','WARNING','ERROR'].indexOf(s)>=0) return s;
  if(s.indexOf('ERROR')>=0 || s.indexOf('FALL')>=0) return 'ERROR';
  if(s.indexOf('WARN')>=0 || s.indexOf('OBSERV')>=0) return 'WARNING';
  if(s.indexOf('OK')>=0 || s.indexOf('EXITO')>=0 || s.indexOf('SUCCESS')>=0) return 'SUCCESS';
  return 'INFO';
}
function BD3_estadoProceso_(v){
  var s=BD3_up_(v).replace(/\s+/g,'_');
  if(!s) return 'PENDIENTE';
  if(s.indexOf('FINAL')>=0 || s.indexOf('COMPLET')>=0 || s==='TERMINADO') return 'FINALIZADO';
  if(s.indexOf('OBSERV')>=0) return 'OBSERVADO';
  if(s.indexOf('ANUL')>=0 || s.indexOf('CANCEL')>=0) return 'ANULADO';
  if(s.indexOf('PROCES')>=0 || s.indexOf('CURSO')>=0 || s==='ACTIVO' || s==='PROGRAMADA') return 'EN_PROCESO';
  return 'PENDIENTE';
}
function BD3_estadoRegistro_(v){ return BD3_up_(v)==='INACTIVO'?'INACTIVO':(BD3_up_(v)==='ELIMINADO'?'ELIMINADO':'ACTIVO'); }

function BD3_matrix_(sheet){
  if(!sheet || sheet.getLastColumn()===0) return {headers:[],rows:[],idx:{}};
  var vals=sheet.getDataRange().getValues(), headers=(vals[0]||[]).map(function(x){return BD3_up_(x);}), idx={};
  headers.forEach(function(h,i){ if(h && idx[h] == null) idx[h]=i; });
  return {headers:headers, rows:vals.slice(1), idx:idx};
}
function BD3_v_(row, idx, names){
  names=Array.isArray(names)?names:[names];
  for(var i=0;i<names.length;i++){
    var k=BD3_up_(names[i]);
    if(idx[k] != null && row[idx[k]] !== '' && row[idx[k]] != null) return row[idx[k]];
  }
  return '';
}
function BD3_sheetByIdName_(id,name){
  if(!id) return null;
  try { return SpreadsheetApp.openById(id).getSheetByName(name); } catch(e){ return null; }
}
function BD3_sources_(){
  // BD-15.1: desde Base Única, el dataset incremental se construye
  // exclusivamente desde las hojas COMPAT_* del spreadsheet central.
  // Esto evita volver a leer los antiguos Google Sheets externos.
  var centralId=(typeof BD15_CONFIG!=='undefined' && BD15_CONFIG.spreadsheetId)
    ? BD15_CONFIG.spreadsheetId
    : PropertiesService.getScriptProperties().getProperty('BD_RELACIONAL_SPREADSHEET_ID');
  var ss=null;
  try{ if(centralId) ss=SpreadsheetApp.openById(centralId); }catch(e){ ss=null; }
  function sh(name){ return ss ? ss.getSheetByName(name) : null; }
  return {
    expedientes: sh('COMPAT_EXPEDIENTES'),
    usuarios: sh('COMPAT_USUARIOS'),
    invitados: sh('COMPAT_INVITADOS'),
    inscripciones: sh('COMPAT_INSCRIPCIONES'),
    asesores: sh('COMPAT_ASESORES'),
    talleres: sh('COMPAT_TALLERES'),
    matriculados: sh('COMPAT_MATRICULADOS'),
    sesiones: sh('COMPAT_SESIONES'),
    asistencia: sh('COMPAT_ASISTENCIA'),
    subetapas: sh('COMPAT_SEGUIMIENTO_SUBETAPAS'),
    checklist: sh('COMPAT_CHECKLIST_ETAPA2'),
    archivos: sh('COMPAT_ARCHIVOS_SUBETAPAS'),
    historial: sh('COMPAT_HISTORIAL')
  };
}

function BD3_destinoVacio_(){
  var ss=BD2_abrirBase_(); if(!ss) return {ok:false,mensaje:'No existe la base BD-02.'};
  var ocupadas=[];
  Object.keys(BD1_MODELO_OBJETIVO).forEach(function(t){var sh=ss.getSheetByName(BD2_nombreHoja_(t)); if(sh && sh.getLastRow()>1) ocupadas.push({tabla:sh.getName(),registros:sh.getLastRow()-1});});
  return {ok:ocupadas.length===0,ocupadas:ocupadas};
}
function BD3_push_(db, tabla, obj){
  if(!db[tabla]) db[tabla]=[];
  var def=BD1_MODELO_OBJETIVO[tabla], pk=def.pk;
  if(pk && obj[pk] && db[tabla].some(function(r){return BD3_txt_(r[pk])===BD3_txt_(obj[pk]);})) return;
  db[tabla].push(obj);
}
function BD3_findBy_(arr,field,val){val=BD3_txt_(val); return (arr||[]).filter(function(r){return BD3_txt_(r[field])===val;})[0]||null;}

function BD3_construirDataset_(){
  var src=BD3_sources_(), db={}, now=new Date(), userByLogin={}, userByMail={}, studentByDni={}, programByName={}, expByCode={}, advisorByLegacy={}, tallerByLegacy={}, sesionByLegacy={}, matricByKey={};
  Object.keys(BD1_MODELO_OBJETIVO).forEach(function(t){db[t]=[];});

  // USUARIOS
  var m=BD3_matrix_(src.usuarios);
  m.rows.forEach(function(r){
    var usuario=BD3_txt_(BD3_v_(r,m.idx,['USUARIO','Usuario'])); if(!usuario) return;
    var legacyId=BD3_txt_(BD3_v_(r,m.idx,['ID','ID_USUARIO']));
    var id=legacyId ? BD3_id_('USR',legacyId) : BD3_id_('USR',usuario);
    var correo=BD3_low_(BD3_v_(r,m.idx,['CORREO','Correo']));
    var o={ID_USUARIO:id,USUARIO:usuario,NOMBRE:BD3_txt_(BD3_v_(r,m.idx,['NOMBRE','Nombre'])),CORREO:correo,ROL:BD3_low_(BD3_v_(r,m.idx,['ROL','Rol']))||'admin',PASSWORD_HASH:'',ESTADO_REGISTRO:'ACTIVO',CREADO_EN:'',MODIFICADO_EN:now};
    BD3_push_(db,'usuarios',o); userByLogin[BD3_low_(usuario)]=id; if(correo) userByMail[correo]=id;
  });

  function ensurePrograma(nombre){
    nombre=BD3_up_(nombre); if(!nombre) return '';
    if(programByName[nombre]) return programByName[nombre];
    var id=BD3_id_('PRG',nombre); programByName[nombre]=id;
    BD3_push_(db,'programas',{ID_PROGRAMA:id,CODIGO:BD3_codigoPrograma_(nombre),NOMBRE:nombre,ESTADO_REGISTRO:'ACTIVO'}); return id;
  }
  function ensureEstudiante(data){
    var dni=BD3_digits_(data.dni); if(!dni) return '';
    if(studentByDni[dni]) return studentByDni[dni];
    var id=BD3_id_('EST',dni), prg=ensurePrograma(data.programa||'');
    BD3_push_(db,'estudiantes',{ID_ESTUDIANTE:id,DNI:dni,CUI:BD3_txt_(data.cui),APELLIDOS_NOMBRES:BD3_up_(data.nombres),CORREO:BD3_low_(data.correo),TELEFONO:BD3_txt_(data.telefono),NACIONALIDAD:BD3_txt_(data.nacionalidad),CIUDAD:BD3_txt_(data.ciudad),DIRECCION:BD3_txt_(data.direccion),ID_PROGRAMA:prg,ESTADO_REGISTRO:'ACTIVO',CREADO_EN:data.creado||'',MODIFICADO_EN:now});
    studentByDni[dni]=id; return id;
  }

  // EXPEDIENTES + ESTUDIANTES + RELACION
  m=BD3_matrix_(src.expedientes);
  m.rows.forEach(function(r){
    var cod=BD3_up_(BD3_v_(r,m.idx,['N° DE TRÁMITE','N° DE TRAMITE','EXPEDIENTE'])); if(!cod) return;
    var idExp=BD3_id_('EXP',cod), adminMail=BD3_low_(BD3_v_(r,m.idx,'CORREO_ADMIN')), adminUser=BD3_txt_(BD3_v_(r,m.idx,'ADMIN'));
    expByCode[cod]=idExp;
    BD3_push_(db,'expedientes',{ID_EXPEDIENTE:idExp,CODIGO_TRAMITE:cod,TESIS:BD3_txt_(BD3_v_(r,m.idx,['TESIS','TESIS02'])),MODALIDAD:BD3_txt_(BD3_v_(r,m.idx,['MODALIDAD','MODALIDAD FINAL'])),ID_USUARIO_ADMIN:userByMail[adminMail]||userByLogin[BD3_low_(adminUser)]||'',FECHA_CREACION:BD3_date_(BD3_v_(r,m.idx,'FECHA DE EXP')),ESTADO:'EN_PROCESO',ESTADO_REGISTRO:'ACTIVO',CREADO_EN:BD3_date_(BD3_v_(r,m.idx,'FECHA DE EXP')),MODIFICADO_EN:now});
    [1,2].forEach(function(n){var s=n===1?'':'02', dni=BD3_v_(r,m.idx,'DNI'+s); if(!dni) return; var est=ensureEstudiante({dni:dni,cui:BD3_v_(r,m.idx,'CUI'+s),nombres:BD3_v_(r,m.idx,'NOMBRES'+s),correo:BD3_v_(r,m.idx,'CORREO'+s),telefono:BD3_v_(r,m.idx,'TELEFONO'+s),nacionalidad:BD3_v_(r,m.idx,'NACIONALIDAD'+s),ciudad:BD3_v_(r,m.idx,'CIUDAD'+s),direccion:BD3_v_(r,m.idx,'DIRECCION'+s),programa:BD3_v_(r,m.idx,'PROGRAMAS'+s),creado:BD3_date_(BD3_v_(r,m.idx,'FECHA DE EXP'))}); if(est) BD3_push_(db,'expediente_estudiantes',{ID_EXPEDIENTE_ESTUDIANTE:BD3_id_('EXE',cod+'_'+est),ID_EXPEDIENTE:idExp,ID_ESTUDIANTE:est,ORDEN_PARTICIPANTE:n,ESTADO_REGISTRO:'ACTIVO'});});
  });

  // INVITADOS e INSCRIPCIONES enriquecen estudiantes
  [src.invitados,src.inscripciones].forEach(function(sh){var z=BD3_matrix_(sh); z.rows.forEach(function(r){ensureEstudiante({dni:BD3_v_(r,z.idx,'DNI')||BD3_v_(r,z.idx,'USUARIO'),cui:BD3_v_(r,z.idx,['CUI','CONTRASEÑA','CONTRASENA']),nombres:BD3_v_(r,z.idx,['APELLIDOS_NOMBRES','NOMBRE','NOMBRE COMPLETO']),correo:BD3_v_(r,z.idx,'CORREO'),telefono:BD3_v_(r,z.idx,'TELEFONO'),direccion:BD3_v_(r,z.idx,['DIRECCION_ACTUAL','DIRECCION']),programa:BD3_v_(r,z.idx,['ESPECIALIDAD','PROGRAMA']),creado:BD3_date_(BD3_v_(r,z.idx,['FECHA_REGISTRO','FECHA']))});});});

  // CATALOGOS + SUBETAPAS/ETAPAS
  var etapaNames={1:'VERIFICACIÓN INICIAL DE DOCUMENTOS',2:'PRESENTACIÓN DEL BORRADOR DE TESIS',3:'EVALUACIÓN DEL EXPEDIENTE',4:'PROGRAMACIÓN Y SUSTENTACIÓN',5:'VALIDACIONES INSTITUCIONALES',6:'APROBACIONES INSTITUCIONALES',7:'REGISTRO Y EMISIÓN DEL TÍTULO'};
  Object.keys(etapaNames).forEach(function(k){BD3_push_(db,'etapas_catalogo',{ID_ETAPA:'ETA_'+('0'+k).slice(-2),ORDEN:Number(k),CODIGO:'ETAPA_'+('0'+k).slice(-2),NOMBRE:etapaNames[k],ESTADO_REGISTRO:'ACTIVO'});});
  m=BD3_matrix_(src.subetapas);
  m.rows.forEach(function(r){
    var codExp=BD3_up_(BD3_v_(r,m.idx,'EXPEDIENTE')), etapa=Number(BD3_v_(r,m.idx,'ETAPA')||0), sub=BD3_txt_(BD3_v_(r,m.idx,'SUBETAPA')); if(!codExp||!etapa||!sub) return;
    var idSub=BD3_id_('SUB','E'+etapa+'_'+sub), nombre=BD3_txt_(BD3_v_(r,m.idx,['DESCRIPCION','NOMBRE_SUBETAPA']))||sub;
    BD3_push_(db,'subetapas_catalogo',{ID_SUBETAPA:idSub,ID_ETAPA:'ETA_'+('0'+etapa).slice(-2),ORDEN:Number(String(sub).match(/\d+/)?String(sub).match(/\d+/)[0]:0),CODIGO:'E'+etapa+'_'+BD3_safe_(sub),NOMBRE:nombre,ESTADO_REGISTRO:'ACTIVO'});
    var idExp=expByCode[codExp]; if(!idExp) return;
    var respMail=BD3_low_(BD3_v_(r,m.idx,'CORREO_RESPONSABLE')), respUser=BD3_txt_(BD3_v_(r,m.idx,['USUARIO_FIN','USUARIO_INICIO'])), resp=userByMail[respMail]||userByLogin[BD3_low_(respUser)]||'';
    BD3_push_(db,'expediente_subetapas',{ID_EXPEDIENTE_SUBETAPA:BD3_id_('EXS',codExp+'_'+idSub),ID_EXPEDIENTE:idExp,ID_SUBETAPA:idSub,ID_RESPONSABLE:resp,ESTADO:BD3_estadoProceso_(BD3_v_(r,m.idx,'ESTADO')),FECHA_INICIO:BD3_date_(BD3_v_(r,m.idx,'FECHA_INICIO')),FECHA_FIN:BD3_date_(BD3_v_(r,m.idx,'FECHA_FIN')),OBSERVACION:'',CREADO_EN:BD3_date_(BD3_v_(r,m.idx,'FECHA_INICIO')),MODIFICADO_EN:BD3_date_(BD3_v_(r,m.idx,'ULTIMA_ACTUALIZACION'))||now});
  });
  // etapa agregada desde subetapas
  Object.keys(expByCode).forEach(function(cod){for(var e=1;e<=7;e++){var idExp=expByCode[cod], subrows=db.expediente_subetapas.filter(function(x){var cat=BD3_findBy_(db.subetapas_catalogo,'ID_SUBETAPA',x.ID_SUBETAPA);return x.ID_EXPEDIENTE===idExp && cat && cat.ID_ETAPA==='ETA_'+('0'+e).slice(-2);}); if(!subrows.length) continue; var fin=subrows.filter(function(x){return x.ESTADO==='FINALIZADO';}).length, pct=Math.round((fin/subrows.length)*100), est=pct===100?'FINALIZADO':(subrows.some(function(x){return x.ESTADO==='EN_PROCESO';})?'EN_PROCESO':'PENDIENTE'); BD3_push_(db,'expediente_etapas',{ID_EXPEDIENTE_ETAPA:BD3_id_('EXE',cod+'_E'+e),ID_EXPEDIENTE:idExp,ID_ETAPA:'ETA_'+('0'+e).slice(-2),ID_RESPONSABLE:'',ESTADO:est,FECHA_INICIO:'',FECHA_FIN:'',PORCENTAJE:pct,CREADO_EN:'',MODIFICADO_EN:now});}});

  // CHECKLIST
  m=BD3_matrix_(src.checklist);
  m.rows.forEach(function(r){var num=Number(BD3_v_(r,m.idx,'NUMERO')||0), req=BD3_txt_(BD3_v_(r,m.idx,'REQUISITO')); if(!num||!req) return; var item='CHK_'+('00'+num).slice(-2); BD3_push_(db,'checklist_items',{ID_CHECKLIST_ITEM:item,CODIGO:item,NOMBRE:req,ORDEN:num,OBLIGATORIO:true,ESTADO_REGISTRO:'ACTIVO'}); var cod=BD3_up_(BD3_v_(r,m.idx,'EXPEDIENTE')), idExp=expByCode[cod]; if(!idExp) return; var usr=BD3_low_(BD3_v_(r,m.idx,'CORREO')); BD3_push_(db,'checklist_respuestas',{ID_CHECKLIST_RESPUESTA:BD3_id_('CHR',cod+'_'+item),ID_EXPEDIENTE:idExp,ID_CHECKLIST_ITEM:item,VALOR:BD3_bool_(BD3_v_(r,m.idx,'MARCADO')),OBSERVACION:'',ID_USUARIO:userByMail[usr]||'',MODIFICADO_EN:BD3_date_(BD3_v_(r,m.idx,'ULTIMA_ACTUALIZACION'))||now});});

  // DOCUMENTOS
  m=BD3_matrix_(src.archivos);
  m.rows.forEach(function(r){var cod=BD3_up_(BD3_v_(r,m.idx,'EXPEDIENTE')), idExp=expByCode[cod], fileId=BD3_txt_(BD3_v_(r,m.idx,'ARCHIVO_ID')); if(!idExp || !fileId) return; var etapa=Number(BD3_v_(r,m.idx,'ETAPA')||0), sub=BD3_txt_(BD3_v_(r,m.idx,'SUBETAPA')), idSub=(etapa&&sub)?BD3_id_('SUB','E'+etapa+'_'+sub):''; BD3_push_(db,'documentos',{ID_DOCUMENTO:BD3_id_('DOC',fileId),ID_EXPEDIENTE:idExp,ID_SUBETAPA:idSub,TIPO_DOCUMENTO:'SUBETAPA',NOMBRE_ARCHIVO:BD3_txt_(BD3_v_(r,m.idx,'ARCHIVO_NOMBRE')),DRIVE_FILE_ID:fileId,DRIVE_URL:BD3_txt_(BD3_v_(r,m.idx,'ARCHIVO_URL')),VERSION:Number(BD3_v_(r,m.idx,'VERSION')||1),ESTADO:'CARGADO',ID_USUARIO:'',CREADO_EN:BD3_date_(BD3_v_(r,m.idx,'FECHA_HORA')),MODIFICADO_EN:BD3_date_(BD3_v_(r,m.idx,'FECHA_HORA')),ESTADO_REGISTRO:'ACTIVO'});});

  // HISTORIAL
  m=BD3_matrix_(src.historial);
  m.rows.forEach(function(r){var cod=BD3_up_(BD3_v_(r,m.idx,['EXPEDIENTE'])); if(!cod && m.headers.length>=14) cod=BD3_up_(r[2]); var idExp=expByCode[cod]; if(!idExp) return; var usr=m.idx['USUARIO']!=null?BD3_txt_(BD3_v_(r,m.idx,'USUARIO')):BD3_txt_(r[7]), mail=m.idx['CORREO_USUARIO']!=null?BD3_low_(BD3_v_(r,m.idx,'CORREO_USUARIO')):BD3_low_(r[8]); var fecha=m.idx['FECHA']!=null?BD3_v_(r,m.idx,'FECHA'):r[9]; var accion=m.idx['ACCION']!=null?BD3_v_(r,m.idx,'ACCION'):r[5]; var desc=m.idx['DESCRIPCION']!=null?BD3_v_(r,m.idx,'DESCRIPCION'):r[6]; BD3_push_(db,'historial',{ID_HISTORIAL:BD3_id_('HIS',cod+'_'+(m.idx['ID']!=null?BD3_v_(r,m.idx,'ID'):r[0])),ID_EXPEDIENTE:idExp,ID_USUARIO:userByMail[mail]||userByLogin[BD3_low_(usr)]||'',EVENTO:BD3_txt_(accion),ETAPA:m.idx['ETAPA']!=null?BD3_txt_(BD3_v_(r,m.idx,'ETAPA')):BD3_txt_(r[4]),SUBETAPA:'',DETALLE:BD3_txt_(desc),VISIBILIDAD:m.idx['VISIBILIDAD']!=null?BD3_txt_(BD3_v_(r,m.idx,'VISIBILIDAD')):BD3_txt_(r[12]),ESTADO:BD3_estadoHistorial_(m.idx['ESTADO']!=null?BD3_v_(r,m.idx,'ESTADO'):r[13]),CREADO_EN:BD3_date_(fecha)});});

  // ASESORES
  m=BD3_matrix_(src.asesores);
  m.rows.forEach(function(r){var leg=BD3_txt_(BD3_v_(r,m.idx,'ID_ASESOR')), dni=BD3_digits_(BD3_v_(r,m.idx,'DNI')); if(!leg && !dni) return; var id=leg?BD3_id_('ASE',leg):BD3_id_('ASE',dni); advisorByLegacy[leg]=id; BD3_push_(db,'asesores',{ID_ASESOR:id,GRADO:BD3_txt_(BD3_v_(r,m.idx,'GRADO')),APELLIDOS_NOMBRES:BD3_up_(BD3_v_(r,m.idx,'APELLIDOS_NOMBRES')),DNI:dni,CORREO:BD3_low_(BD3_v_(r,m.idx,'CORREO')),TELEFONO:BD3_txt_(BD3_v_(r,m.idx,'TELEFONO')),USUARIO:BD3_txt_(BD3_v_(r,m.idx,'USUARIO')),PASSWORD_HASH:BD3_txt_(BD3_v_(r,m.idx,'PASSWORD_HASH')),ESTADO_REGISTRO:BD3_estadoRegistro_(BD3_v_(r,m.idx,'ESTADO')),CREADO_EN:BD3_date_(BD3_v_(r,m.idx,'FECHA_REGISTRO')),MODIFICADO_EN:now});});
  // TALLERES
  m=BD3_matrix_(src.talleres);
  m.rows.forEach(function(r){var leg=BD3_txt_(BD3_v_(r,m.idx,'ID_TALLER')); if(!leg) return; var id=BD3_id_('TAL',leg); tallerByLegacy[leg]=id; BD3_push_(db,'talleres',{ID_TALLER:id,NOMBRE:BD3_txt_(BD3_v_(r,m.idx,'NOMBRE_TALLER')),ID_ASESOR:advisorByLegacy[BD3_txt_(BD3_v_(r,m.idx,'ID_ASESOR'))]||'',NRO_SESIONES:Number(BD3_v_(r,m.idx,'NRO_SESIONES')||0),FECHA_INICIO:BD3_date_(BD3_v_(r,m.idx,'FECHA_INICIO')),FECHA_FIN:BD3_date_(BD3_v_(r,m.idx,'FECHA_FIN')),ESTADO:BD3_estadoProceso_(BD3_v_(r,m.idx,'ESTADO')),CREADO_POR:BD3_txt_(BD3_v_(r,m.idx,'CREADO_POR')),CREADO_EN:BD3_date_(BD3_v_(r,m.idx,'FECHA_CREACION')),MODIFICADO_EN:now});});
  // SESIONES
  m=BD3_matrix_(src.sesiones);
  m.rows.forEach(function(r){var leg=BD3_txt_(BD3_v_(r,m.idx,'ID_SESION')), tal=BD3_txt_(BD3_v_(r,m.idx,'ID_TALLER')); if(!leg||!tallerByLegacy[tal]) return; var id=BD3_id_('SES',leg); sesionByLegacy[leg]=id; BD3_push_(db,'taller_sesiones',{ID_SESION:id,ID_TALLER:tallerByLegacy[tal],NRO_SESION:Number(BD3_v_(r,m.idx,'NRO_SESION')||0),FECHA:BD3_date_(BD3_v_(r,m.idx,'FECHA')),HORA_INICIO:BD3_txt_(BD3_v_(r,m.idx,'HORA_INICIO')),HORA_FIN:BD3_txt_(BD3_v_(r,m.idx,'HORA_FIN')),ESTADO:BD3_estadoProceso_(BD3_v_(r,m.idx,'ESTADO'))});});
  // MATRICULAS
  m=BD3_matrix_(src.matriculados);
  m.rows.forEach(function(r){var leg=BD3_txt_(BD3_v_(r,m.idx,'ID_MATRICULA')), tal=BD3_txt_(BD3_v_(r,m.idx,'ID_TALLER')), dni=BD3_digits_(BD3_v_(r,m.idx,'DNI')), est=studentByDni[dni]||ensureEstudiante({dni:dni,nombres:BD3_v_(r,m.idx,'APELLIDOS_NOMBRES'),correo:BD3_v_(r,m.idx,'CORREO'),telefono:BD3_v_(r,m.idx,'TELEFONO'),programa:BD3_v_(r,m.idx,'ESPECIALIDAD')}); if(!leg||!tallerByLegacy[tal]||!est) return; var id=BD3_id_('MAT',leg); matricByKey[tal+'|'+dni]=id; var cod=BD3_up_(BD3_v_(r,m.idx,'EXPEDIENTE')); BD3_push_(db,'taller_matriculas',{ID_MATRICULA:id,ID_TALLER:tallerByLegacy[tal],ID_EXPEDIENTE:expByCode[cod]||'',ID_ESTUDIANTE:est,ESTADO:BD3_estadoProceso_(BD3_v_(r,m.idx,'ESTADO')),FECHA_MATRICULA:BD3_date_(BD3_v_(r,m.idx,'FECHA_MATRICULA'))});});
  // ASISTENCIA
  m=BD3_matrix_(src.asistencia);
  m.rows.forEach(function(r){var leg=BD3_txt_(BD3_v_(r,m.idx,'ID_ASISTENCIA')), tal=BD3_txt_(BD3_v_(r,m.idx,'ID_TALLER')), ses=BD3_txt_(BD3_v_(r,m.idx,'ID_SESION')), dni=BD3_digits_(BD3_v_(r,m.idx,'DNI')), mat=matricByKey[tal+'|'+dni]; if(!leg||!sesionByLegacy[ses]||!mat) return; var a=BD3_up_(BD3_v_(r,m.idx,'ASISTENCIA')); if(['PRESENTE','AUSENTE','JUSTIFICADO'].indexOf(a)<0) a='PENDIENTE'; BD3_push_(db,'taller_asistencia',{ID_ASISTENCIA:BD3_id_('ASI',leg),ID_SESION:sesionByLegacy[ses],ID_MATRICULA:mat,ID_ASESOR:advisorByLegacy[BD3_txt_(BD3_v_(r,m.idx,'ID_ASESOR'))]||'',ASISTENCIA:a,OBSERVACION:BD3_txt_(BD3_v_(r,m.idx,'OBSERVACION')),REGISTRADO_EN:BD3_date_(BD3_v_(r,m.idx,'FECHA_REGISTRO'))});});

  return db;
}

function BD3_resumenDataset_(db){var r={}; Object.keys(BD1_MODELO_OBJETIVO).forEach(function(t){r[t]=(db[t]||[]).length;}); return r;}

function BD3_PREVISUALIZAR_MIGRACION(){
  var base=BD2_abrirBase_(), vacio=BD3_destinoVacio_(), db=BD3_construirDataset_();
  var out={status:!!base && (!BD3_CONFIG.exigeDestinoVacio||vacio.ok),fase:'BD-03',version:BD3_CONFIG.version,soloLectura:true,destinoVacio:vacio.ok,tablasDestinoOcupadas:vacio.ocupadas||[],registrosPropuestos:BD3_resumenDataset_(db),datosLegacyModificados:false};
  Logger.log(JSON.stringify(out,null,2)); return out;
}

function BD3_EJECUTAR_MIGRACION_INICIAL(){
  var ss=BD2_abrirBase_(); if(!ss) throw new Error('Primero debe existir BD-02.');
  var vacio=BD3_destinoVacio_(); if(BD3_CONFIG.exigeDestinoVacio && !vacio.ok) throw new Error('Migración detenida: existen tablas destino con datos. Ejecute BD3_PROBAR_DIAGNOSTICO() y no borre nada manualmente.');
  var db=BD3_construirDataset_(), escritos={};
  Object.keys(BD1_MODELO_OBJETIVO).forEach(function(t){var rows=db[t]||[], sh=ss.getSheetByName(BD2_nombreHoja_(t)), headers=BD1_MODELO_OBJETIVO[t].columnas; if(!sh) throw new Error('Falta tabla destino '+t); if(rows.length){var values=rows.map(function(o){return headers.map(function(h){return o[h]===undefined?'':o[h];});}); sh.getRange(2,1,values.length,headers.length).setValues(values);} escritos[t]=rows.length;});
  PropertiesService.getScriptProperties().setProperty('BD3_MIGRACION_INICIAL_AT',new Date().toISOString());
  var out={status:true,fase:'BD-03',version:BD3_CONFIG.version,migracionEjecutada:true,registrosEscritos:escritos,datosLegacyModificados:false}; Logger.log(JSON.stringify(out,null,2)); return out;
}

function registrarMiBaseRelacional() {
  PropertiesService.getScriptProperties().setProperty('BD_RELACIONAL_SPREADSHEET_ID', '1jvpGNBTDly02bgayT2SyrgSaLZrZxj3PH3PavGq6po');
  Logger.log("¡ID relacional guardado correctamente!");
}
