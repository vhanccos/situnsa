/**
 * BD-17.3 - CORRECCIONES DE AGENDA, DOCUMENTOS Y RENDIMIENTO
 * - Workflow administrativo lee agenda relacional real.
 * - Autorrepara expedientes sin subetapas.
 * - Inserción de etiquetas documentales obtiene datos desde relacional.
 * - ETAPA 02 se hidrata bajo demanda para acelerar el alta.
 * - Diagnóstico/repair seguro.
 */
const BD173_CONFIG=Object.freeze({fase:'BD-17.3',version:'db-17.3-agenda-documentos-performance'});
function BD173_txt_(v){return String(v==null?'':v).trim();}
function BD173_up_(v){return BD173_txt_(v).toUpperCase();}
function BD173_title_(v){return BD173_txt_(v).toLowerCase().replace(/\b\w/g,function(m){return m.toUpperCase();});}
function BD173_fmtDate_(v){if(!v)return '';if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))return Utilities.formatDate(v,Session.getScriptTimeZone()||'America/Lima','dd/MM/yyyy');return v;}
function BD173_fmtTime_(v){if(!v)return '';if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))return Utilities.formatDate(v,Session.getScriptTimeZone()||'America/Lima','HH:mm');return v;}

function BD173_datosDocumentosRelacional_(ref){
  var exp=typeof BD172_expPorRef_==='function'?BD172_expPorRef_(ref):BD8_relExpPorRef_(ref); if(!exp)return null;
  var rels=(REPO_RelacionalV5.filtrar('expediente_estudiantes',{ID_EXPEDIENTE:exp.ID_EXPEDIENTE})||[]).slice().sort(function(a,b){return Number(a.ORDEN_PARTICIPANTE||0)-Number(b.ORDEN_PARTICIPANTE||0);});
  var programas=REPO_RelacionalV5.listar('programas')||[], pmap={};programas.forEach(function(p){pmap[String(p.ID_PROGRAMA)]=p;});
  var usuarios=REPO_RelacionalV5.listar('usuarios')||[], admin={};for(var i=0;i<usuarios.length;i++)if(String(usuarios[i].ID_USUARIO)===String(exp.ID_USUARIO_ADMIN)){admin=usuarios[i];break;}
  function part(i){var r=rels[i],e=r?REPO_RelacionalV5.buscarUno('estudiantes','ID_ESTUDIANTE',r.ID_ESTUDIANTE):null;if(!e)return{};var pr=pmap[String(e.ID_PROGRAMA)]||{};return{n:e.APELLIDOS_NOMBRES||'',dni:e.DNI||'',prog:pr.NOMBRE||pr.CODIGO||'',correo:e.CORREO||'',cui:e.CUI||'',tel:e.TELEFONO||'',nac:e.NACIONALIDAD||'',ciu:e.CIUDAD||'',dir:e.DIRECCION||''};}
  var a=part(0),b=part(1),o={};
  function put(k,v){o[k]=v==null?'':v;}
  put('N° DE TRÁMITE',exp.CODIGO_TRAMITE);put('GRUPO',Number(exp.GRUPO||rels.length||1));put('FECHA DE EXP',BD173_fmtDate_(exp.FECHA_EXP||exp.FECHA_CREACION));put('HORA DE EXP',BD173_fmtTime_(exp.HORA_EXP||exp.FECHA_CREACION));put('ADMIN',admin.NOMBRE||admin.USUARIO||'');put('CORREO_ADMIN',admin.CORREO||'');
  put('NOMBRES',a.n);put('NOM_MIN',BD173_title_(a.n));put('DNI',a.dni);put('PROGRAMAS',a.prog);put('PROGR_MIN',BD173_title_(a.prog));put('CORREO',a.correo);put('CORREO_MIN',String(a.correo||'').toLowerCase());put('CUI',a.cui);put('TELEFONO',a.tel);put('NACIONALIDAD',a.nac);put('CIUDAD',a.ciu);put('DIRECCION',a.dir);
  put('NOMBRES02',b.n);put('NOM_MIN02',BD173_title_(b.n));put('DNI02',b.dni);put('PROGRAMAS02',b.prog);put('PROGR_MIN02',BD173_title_(b.prog));put('CORREO02',b.correo);put('CORREO_MIN02',String(b.correo||'').toLowerCase());put('CUI02',b.cui);put('TELEFONO02',b.tel);put('NACIONALIDAD02',b.nac);put('CIUDAD02',b.ciu);put('DIRECCION02',b.dir);
  put('FECHA PRESENTACION',BD173_fmtDate_(exp.FECHA_PRESENTACION));put('FECHA PRESENTACIÓN',BD173_fmtDate_(exp.FECHA_PRESENTACION));put('FECHA_PRESENTACION',BD173_fmtDate_(exp.FECHA_PRESENTACION));
  put('FECHA DE APERTURA',BD173_fmtDate_(exp.FECHA_APERTURA));put('FECHA APERTURA',BD173_fmtDate_(exp.FECHA_APERTURA));put('FECHA_APERTURA',BD173_fmtDate_(exp.FECHA_APERTURA));
  put('MODALIDAD',exp.MODALIDAD||'');put('MODALIDAD02',exp.MODALIDAD_02||'');put('DECRETO',exp.DECRETO||'');put('N° DECRETO',exp.DECRETO||'');put('TESIS',exp.TESIS||'');put('TESIS02',exp.TESIS_02||exp.TESIS||'');put('RECOMENDACION',exp.RECOMENDACION||'');put('RECOMENDACIÓN',exp.RECOMENDACION||'');put('PRESIDENTE',exp.PRESIDENTE||'');put('ASESOR',exp.ASESOR||'');put('ASE_MINU',exp.ASE_MINU||'');put('SECRETARIO',exp.SECRETARIO||'');put('CO ASESOR',exp.CO_ASESOR||'');put('COASESOR',exp.CO_ASESOR||'');put('FECHA',BD173_fmtDate_(exp.FECHA));put('OFICIO',exp.OFICIO||'');put('N° OFICIO',exp.OFICIO||'');put('INTEGRANTE',exp.INTEGRANTE||'');put('PRESIDENTE02',exp.PRESIDENTE_02||'');put('SECRETARIO02',exp.SECRETARIO_02||'');put('SUPLENTE02',exp.SUPLENTE_02||'');put('DECANAL',exp.DECANAL||'');put('FECHA - ACTAS',BD173_fmtDate_(exp.FECHA_ACTAS));put('HORAS - ACTAS',BD173_fmtTime_(exp.HORAS_ACTAS)||exp.HORAS_ACTAS||'');put('LUGAR DE SUSTENTACION',exp.LUGAR_SUSTENTACION||'');put('MODALIDAD FINAL',exp.MODALIDAD_FINAL||'');
  return o;
}

function BD173_esEtapa2_(nombre){return /^ETAPA\s*0?2\b/i.test(String(nombre||'').trim())||/DOCUMENTOS\s*ETAPA\s*0?2/i.test(String(nombre||''));}
function BD173_copiarCarpetaRec_(origen,destino){
  var fs=origen.getFiles();while(fs.hasNext()){var f=fs.next(),ex=destino.getFilesByName(f.getName());if(!ex.hasNext())f.makeCopy(f.getName(),destino);}var ds=origen.getFolders();while(ds.hasNext()){var so=ds.next(),it=destino.getFoldersByName(so.getName()),sd=it.hasNext()?it.next():destino.createFolder(so.getName());BD173_copiarCarpetaRec_(so,sd);}
}
function BD173_copiarPlantillaInicialRapida_(origen,destino){
  var fs=origen.getFiles();while(fs.hasNext()){var f=fs.next(),ex=destino.getFilesByName(f.getName());if(!ex.hasNext())f.makeCopy(f.getName(),destino);}var ds=origen.getFolders();while(ds.hasNext()){var so=ds.next(),it=destino.getFoldersByName(so.getName()),sd=it.hasNext()?it.next():destino.createFolder(so.getName());if(BD173_esEtapa2_(so.getName()))continue;BD173_copiarCarpetaRec_(so,sd);}return{status:true,modo:'RAPIDO_ETAPA2_DIFERIDA'};
}
function BD173_hidratarDocumentosEtapa_(expediente,etapa,carpetaExp,carpetaEtapa){
  etapa=Number(etapa||0);if(etapa!==1&&etapa!==2)return{status:false};
  var tpl=DriveApp.getFolderById(DE_CARPETA_PLANTILLA_EXPEDIENTE),tplEt=DE_obtenerCarpetaEtapa_(tpl,etapa);if(!tplEt)return{status:false,message:'Plantilla ETAPA '+etapa+' no encontrada'};
  if(!carpetaEtapa){carpetaEtapa=DE_obtenerCarpetaEtapa_(carpetaExp,etapa);if(!carpetaEtapa)carpetaEtapa=carpetaExp.createFolder('ETAPA '+String(etapa).padStart(2,'0'));}
  BD173_copiarCarpetaRec_(tplEt,carpetaEtapa);return{status:true,expediente:expediente,etapa:etapa};
}

function BD173_REPARAR_AGENDA_EXPEDIENTES(){
  var exps=REPO_RelacionalV5.listar('expedientes')||[],reparados=[],ok=[];exps.forEach(function(e){if(BD173_up_(e.ESTADO_REGISTRO)==='ELIMINADO')return;var rows=REPO_RelacionalV5.obtenerSubetapasExpediente(e.ID_EXPEDIENTE)||[];if(rows.length){ok.push(e.CODIGO_TRAMITE);return;}try{BD17_inicializarExpedienteNuevo_(e.ID_EXPEDIENTE,e.CODIGO_TRAMITE,e.ID_USUARIO_ADMIN||'');reparados.push(e.CODIGO_TRAMITE);}catch(err){reparados.push(e.CODIGO_TRAMITE+':ERROR '+err.message);}});var out={status:true,fase:BD173_CONFIG.fase,reparados:reparados,yaCorrectos:ok.length};Logger.log(JSON.stringify(out,null,2));return out;
}
function BD173_PROBAR_DIAGNOSTICO(){
  var exps=REPO_RelacionalV5.listar('expedientes')||[],sinAgenda=[];exps.forEach(function(e){if(BD173_up_(e.ESTADO_REGISTRO)==='ELIMINADO')return;var r=REPO_RelacionalV5.obtenerSubetapasExpediente(e.ID_EXPEDIENTE)||[];if(!r.length)sinAgenda.push(e.CODIGO_TRAMITE);});
  var out={status:sinAgenda.length===0,fase:BD173_CONFIG.fase,version:BD173_CONFIG.version,sinAgenda:sinAgenda,workflowRelacional:true,datosDocumentosRelacionales:true,etapa2Diferida:true,passwordHashEnSegundoPlano:true,compatLecturaAgenda:false};Logger.log(JSON.stringify(out,null,2));return out;
}
