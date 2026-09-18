/**
 * BD-17 - AGENDA VIRTUAL DE ETAPAS Y SUBETAPAS
 * --------------------------------------------------------------
 * Objetivo:
 * - El seguimiento funciona como agenda/checklist administrativo.
 * - No requiere carga de documentos para avanzar.
 * - Al marcar una actividad se registra FECHA_FIN automáticamente.
 * - La siguiente actividad inicia automáticamente con FECHA_INICIO.
 * - Al completar una etapa, la siguiente etapa inicia automáticamente.
 * - Fuente operativa: tablas relacionales de BD_TITULACION_RELACIONAL_V2.
 */
const BD17_CONFIG = Object.freeze({
  fase: 'BD-17',
  version: 'db-17.0-agenda-virtual-workflow',
  key: 'BD17_AGENDA_ACTIVA',
  timezone: 'America/Lima',
  backupPrefix: 'B17_'
});

function BD17_txt_(v){ return String(v == null ? '' : v).trim(); }
function BD17_up_(v){ return BD17_txt_(v).toUpperCase(); }
function BD17_activo_(){ return BD17_up_(PropertiesService.getScriptProperties().getProperty(BD17_CONFIG.key) || 'FALSE') === 'TRUE'; }
function BD17_now_(){ return new Date(); }
function BD17_fmt_(d){
  if (!d) return '';
  if (Object.prototype.toString.call(d) === '[object Date]' && !isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone() || BD17_CONFIG.timezone, 'dd/MM/yyyy HH:mm');
  }
  return String(d);
}
function BD17_id_(prefix,key){
  if (typeof BD16_id_ === 'function') return BD16_id_(prefix,key);
  if (typeof BD3_id_ === 'function') return BD3_id_(prefix,key);
  return prefix + '_' + Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase();
}

function BD17_catalogo_(){
  return [
    {etapa:1,codigo:'1.1',nombre:'Apertura del expediente',plazo:'',tipo:'CHECKLIST'},
    {etapa:1,codigo:'1.2',nombre:'La Unidad correspondiente realiza la revisión de los documentos presentados por el estudiante y, de estar conforme, asigna jurado para la terna de Plan de Tesis/Trabajo Académico',plazo:''},
    {etapa:1,codigo:'1.3',nombre:'Emisión del Plan de Tesis/Trabajo Académico a la terna para su revisión y opinión',plazo:'3 a 5 días hábiles'},
    {etapa:1,codigo:'1.4',nombre:'El alumno levanta las observaciones formuladas',plazo:'2 a 5 días hábiles'},
    {etapa:1,codigo:'1.5',nombre:'Conformidad de la terna y pase para emisión del Decreto',plazo:''},
    {etapa:1,codigo:'1.6',nombre:'Emisión del Decreto de aprobación del Plan de Tesis/Trabajo Académico',plazo:''},

    {etapa:2,codigo:'2.1',nombre:'Documentos para la presentación del Borrador de Tesis',plazo:'',tipo:'CHECKLIST'},

    {etapa:3,codigo:'3.1',nombre:'Recepción y validación del expediente',plazo:''},
    {etapa:3,codigo:'3.2',nombre:'Programación de la fecha de sorteo de jurados',plazo:'2 a 7 días hábiles'},
    {etapa:3,codigo:'3.3',nombre:'Revisión del borrador de tesis por los jurados designados',plazo:'Aproximadamente 20 días hábiles'},
    {etapa:3,codigo:'3.4',nombre:'Registro de observaciones emitidas por los jurados',plazo:''},
    {etapa:3,codigo:'3.5',nombre:'Levantamiento de observaciones por parte del alumno',plazo:'2 a 10 días hábiles'},
    {etapa:3,codigo:'3.6',nombre:'Emisión de conformidad por parte de la terna de jurados',plazo:''},

    {etapa:4,codigo:'4.1',nombre:'Publicación oficial de la fecha de sustentación',plazo:''},
    {etapa:4,codigo:'4.2',nombre:'El estudiante presenta la versión final de la tesis',plazo:''},

    {etapa:5,codigo:'5.1',nombre:'Evaluación mediante OTI Turnitin',plazo:'Aproximadamente 5 a 20 días hábiles'},
    {etapa:5,codigo:'5.2',nombre:'Revisión del reporte Turnitin por la Unidad de Segunda Especialidad; debe llegar a un máximo de 20%. De no ser así, retorna al alumno para corrección de referencias',plazo:''},
    {etapa:5,codigo:'5.3',nombre:'Emisión del Informe de similitud',plazo:''},
    {etapa:5,codigo:'5.4',nombre:'Firma del Informe de similitud por el Director de la Unidad de Investigación',plazo:'2 a 5 días hábiles'},
    {etapa:5,codigo:'5.5',nombre:'Registro en el Repositorio Institucional',plazo:'Aproximadamente 5 a 15 días hábiles'},
    {etapa:5,codigo:'5.6',nombre:'Generación y validación de la URL del repositorio',plazo:''},

    {etapa:6,codigo:'6.1',nombre:'Informe y revisión de expediente por parte de Secretaría Académica FIPS',plazo:'2 a 6 días hábiles'},
    {etapa:6,codigo:'6.2',nombre:'Revisión por la Comisión de Grados y Títulos del Consejo de Facultad',plazo:'2 a 5 días hábiles'},
    {etapa:6,codigo:'6.3',nombre:'Aprobación por el Consejo de Facultad',plazo:''},
    {etapa:6,codigo:'6.4',nombre:'Emisión de la Resolución de Consejo de Facultad',plazo:'4 a 6 días hábiles'},
    {etapa:6,codigo:'6.5',nombre:'Registro de información en SISGRAD',plazo:''},
    {etapa:6,codigo:'6.6',nombre:'Verificación de datos personales por parte del estudiante',plazo:''},
    {etapa:6,codigo:'6.7',nombre:'Firma del Señor Decano a la Autorización de Emisión del Título',plazo:'1 a 2 días hábiles'},
    {etapa:6,codigo:'6.8',nombre:'Generación de documentos en SISGRAD',plazo:''},
    {etapa:6,codigo:'6.9',nombre:'Revisión por la Oficina de Grados y Títulos',plazo:'Aproximadamente 5 a 15 días hábiles'},
    {etapa:6,codigo:'6.10',nombre:'Aprobación por el Consejo Universitario',plazo:'5 a 15 días hábiles'},

    {etapa:7,codigo:'7.1',nombre:'Programación de la ceremonia de colación',plazo:''},
    {etapa:7,codigo:'7.2',nombre:'Emisión y registro definitivo del Título Profesional',plazo:''},
    {etapa:7,codigo:'7.3',nombre:'Registro del título en SUNEDU',plazo:'Aproximadamente 15 días posteriores a la colación'}
  ];
}

function BD17_etapas_(){
  return [
    'Verificación Inicial de Documentos',
    'Presentación del Borrador de Tesis',
    'Evaluación del Expediente',
    'Programación y Sustentación',
    'Validaciones Institucionales',
    'Aprobaciones Institucionales',
    'Registro y Emisión del Título'
  ];
}

function BD17_ensureColumn_(tabla, nombre){
  var sh = BD5_tabla_(tabla);
  var lc = Math.max(1, sh.getLastColumn());
  var headers = sh.getRange(1,1,1,lc).getDisplayValues()[0].map(BD17_up_);
  var n = BD17_up_(nombre);
  var idx = headers.indexOf(n);
  if (idx >= 0) return idx + 1;
  sh.getRange(1,lc+1).setValue(nombre);
  return lc + 1;
}

function BD17_backupTabla_(tabla, backupName){
  var src = BD5_tabla_(tabla);
  var ss = src.getParent();
  var old = ss.getSheetByName(backupName);
  if (old) ss.deleteSheet(old);
  var cp = src.copyTo(ss).setName(backupName);
  return {tabla:tabla,backup:backupName,filas:cp.getLastRow()};
}

function BD17_restoreTabla_(tabla, backupName){
  var dst = BD5_tabla_(tabla);
  var ss = dst.getParent();
  var b = ss.getSheetByName(backupName);
  if (!b) throw new Error('No existe backup '+backupName);
  dst.clear();
  if (b.getLastRow() && b.getLastColumn()) {
    var vals = b.getRange(1,1,b.getLastRow(),b.getLastColumn()).getValues();
    dst.getRange(1,1,vals.length,vals[0].length).setValues(vals);
  }
}

function BD17_buscarEtapaCatalogoPorOrden_(orden){
  var rows = REPO_RelacionalV5.listar('etapas_catalogo') || [];
  for (var i=0;i<rows.length;i++) if (Number(rows[i].ORDEN) === Number(orden)) return rows[i];
  return null;
}

function BD17_catalogosActivos_(){
  var etapas = REPO_RelacionalV5.listar('etapas_catalogo') || [];
  var subs = REPO_RelacionalV5.listar('subetapas_catalogo') || [];
  var eById = {}, sById = {}, activos=[];
  etapas.forEach(function(e){eById[String(e.ID_ETAPA)]=e;});
  subs.forEach(function(s){
    sById[String(s.ID_SUBETAPA)] = s;
    if (BD17_up_(s.ESTADO_REGISTRO) !== 'INACTIVO') {
      var e=eById[String(s.ID_ETAPA)];
      if (e) activos.push({sub:s, etapa:e});
    }
  });
  activos.sort(function(a,b){
    var de=Number(a.etapa.ORDEN||0)-Number(b.etapa.ORDEN||0);
    return de || Number(a.sub.ORDEN||0)-Number(b.sub.ORDEN||0);
  });
  return {etapas:etapas,subs:subs,eById:eById,sById:sById,activos:activos};
}

function BD17_prepararCatalogo_(){
  var nombres = BD17_etapas_();
  var catalogo = BD17_catalogo_();
  BD17_ensureColumn_('subetapas_catalogo','PLAZO');

  var mE = BD16_matrix_('etapas_catalogo');
  nombres.forEach(function(nombre,i){
    var e=BD17_buscarEtapaCatalogoPorOrden_(i+1);
    if(!e) throw new Error('No existe la etapa catálogo de orden '+(i+1));
    BD16_upsert_('etapas_catalogo','ID_ETAPA',{
      ID_ETAPA:e.ID_ETAPA, ORDEN:i+1, CODIGO:'E'+(i+1), NOMBRE:nombre, ESTADO_REGISTRO:'ACTIVO'
    });
  });

  var shS=BD5_tabla_('subetapas_catalogo');
  var vals=shS.getDataRange().getValues();
  if(vals.length>1){
    var headers=vals[0].map(BD17_up_), cEstado=headers.indexOf('ESTADO_REGISTRO');
    if(cEstado>=0){
      for(var r=1;r<vals.length;r++) if(vals[r].some(function(v){return v!==''&&v!=null;})) vals[r][cEstado]='INACTIVO';
      shS.getRange(2,1,vals.length-1,vals[0].length).setValues(vals.slice(1));
    }
  }

  var ordenEtapa={};
  catalogo.forEach(function(item){
    ordenEtapa[item.etapa]=(ordenEtapa[item.etapa]||0)+1;
    var e=BD17_buscarEtapaCatalogoPorOrden_(item.etapa);
    var id='SUB17_'+String(item.etapa).padStart(2,'0')+'_'+String(ordenEtapa[item.etapa]).padStart(2,'0');
    BD16_upsert_('subetapas_catalogo','ID_SUBETAPA',{
      ID_SUBETAPA:id,
      ID_ETAPA:e.ID_ETAPA,
      ORDEN:ordenEtapa[item.etapa],
      CODIGO:item.codigo,
      NOMBRE:item.nombre,
      PLAZO:item.plazo,
      ESTADO_REGISTRO:'ACTIVO'
    });
  });
  return {status:true,subetapas:catalogo.length};
}

function BD17_inicializarExpedienteNuevo_(idExpediente, codigo, responsableId){
  if(!BD17_activo_()) return {status:true,omitido:true};
  var now=BD17_now_(), cats=BD17_catalogosActivos_();
  var etapaRows=REPO_RelacionalV5.filtrar('expediente_etapas',{ID_EXPEDIENTE:idExpediente})||[];
  var etapaById={}; etapaRows.forEach(function(x){etapaById[String(x.ID_ETAPA)]=x;});
  cats.etapas.sort(function(a,b){return Number(a.ORDEN||0)-Number(b.ORDEN||0);}).forEach(function(e){
    var old=etapaById[String(e.ID_ETAPA)]||{};
    var esPrimera=Number(e.ORDEN)===1;
    BD16_upsert_('expediente_etapas','ID_EXPEDIENTE_ETAPA',{
      ID_EXPEDIENTE_ETAPA:old.ID_EXPEDIENTE_ETAPA||BD17_id_('EXE',codigo+'_'+e.ID_ETAPA),
      ID_EXPEDIENTE:idExpediente,ID_ETAPA:e.ID_ETAPA,ID_RESPONSABLE:esPrimera?(responsableId||old.ID_RESPONSABLE||''):(old.ID_RESPONSABLE||''),
      ESTADO:esPrimera?'EN_PROCESO':'PENDIENTE',FECHA_INICIO:esPrimera?now:'',FECHA_FIN:'',PORCENTAJE:0,
      CREADO_EN:old.CREADO_EN||now,MODIFICADO_EN:now
    });
  });
  var grouped={}; cats.activos.forEach(function(x){var n=Number(x.etapa.ORDEN||0);(grouped[n]=grouped[n]||[]).push(x);});
  Object.keys(grouped).forEach(function(k){
    grouped[k].forEach(function(x,idx){
      var first=Number(k)===1&&idx===0;
      BD16_upsert_('expediente_subetapas','ID_EXPEDIENTE_SUBETAPA',{
        ID_EXPEDIENTE_SUBETAPA:BD17_id_('EXS',codigo+'_'+x.sub.ID_SUBETAPA),ID_EXPEDIENTE:idExpediente,ID_SUBETAPA:x.sub.ID_SUBETAPA,
        ID_RESPONSABLE:first?(responsableId||''):'',ESTADO:first?'EN_PROCESO':'PENDIENTE',FECHA_INICIO:first?now:'',FECHA_FIN:'',OBSERVACION:'',CREADO_EN:now,MODIFICADO_EN:now
      });
    });
  });
  return {status:true,expediente:codigo,agendaIniciada:true};
}

function BD17_migrarExpedientesExistentes_(){
  var now=BD17_now_(), cats=BD17_catalogosActivos_();
  var exps=REPO_RelacionalV5.listar('expedientes')||[], etapaRows=REPO_RelacionalV5.listar('expediente_etapas')||[];
  var etByExp={}; etapaRows.forEach(function(r){var k=String(r.ID_EXPEDIENTE);(etByExp[k]=etByExp[k]||[]).push(r);});
  var grouped={};cats.activos.forEach(function(x){var n=Number(x.etapa.ORDEN||0);(grouped[n]=grouped[n]||[]).push(x);});
  var total=0;
  exps.forEach(function(exp){
    var idExp=String(exp.ID_EXPEDIENTE), codigo=BD17_up_(exp.CODIGO_TRAMITE), rows=etByExp[idExp]||[], byEt={};
    rows.forEach(function(r){byEt[String(r.ID_ETAPA)]=r;});
    var current=1;
    for(var n=1;n<=7;n++){
      var ec=BD17_buscarEtapaCatalogoPorOrden_(n), er=ec?byEt[String(ec.ID_ETAPA)]:null;
      if(!er || BD17_up_(er.ESTADO)!=='FINALIZADO'){current=n;break;}
      if(n===7) current=8;
    }
    for(var eNum=1;eNum<=7;eNum++){
      var ec2=BD17_buscarEtapaCatalogoPorOrden_(eNum), er2=ec2?byEt[String(ec2.ID_ETAPA)]:null;
      if(!ec2)continue;
      var final=er2&&BD17_up_(er2.ESTADO)==='FINALIZADO';
      var active=!final && eNum===current;
      var start=(er2&&er2.FECHA_INICIO)|| (active?now:'');
      var end=(er2&&er2.FECHA_FIN)||'';
      BD16_upsert_('expediente_etapas','ID_EXPEDIENTE_ETAPA',{
        ID_EXPEDIENTE_ETAPA:(er2&&er2.ID_EXPEDIENTE_ETAPA)||BD17_id_('EXE',codigo+'_'+ec2.ID_ETAPA),ID_EXPEDIENTE:idExp,ID_ETAPA:ec2.ID_ETAPA,
        ID_RESPONSABLE:(er2&&er2.ID_RESPONSABLE)||'',ESTADO:final?'FINALIZADO':(active?'EN_PROCESO':'PENDIENTE'),FECHA_INICIO:start,FECHA_FIN:final?end:'',PORCENTAJE:final?100:0,
        CREADO_EN:(er2&&er2.CREADO_EN)||now,MODIFICADO_EN:now
      });
      (grouped[eNum]||[]).forEach(function(x,idx){
        var isFirst=active&&idx===0;
        BD16_upsert_('expediente_subetapas','ID_EXPEDIENTE_SUBETAPA',{
          ID_EXPEDIENTE_SUBETAPA:BD17_id_('EXS',codigo+'_'+x.sub.ID_SUBETAPA),ID_EXPEDIENTE:idExp,ID_SUBETAPA:x.sub.ID_SUBETAPA,
          ID_RESPONSABLE:(er2&&er2.ID_RESPONSABLE)||'',ESTADO:final?'FINALIZADO':(isFirst?'EN_PROCESO':'PENDIENTE'),FECHA_INICIO:final?start:(isFirst?start:''),FECHA_FIN:final?end:'',OBSERVACION:'',CREADO_EN:now,MODIFICADO_EN:now
        });
        total++;
      });
    }
  });
  return {expedientes:exps.length,registrosAgenda:total};
}

function BD17_usuarioId_(usuario){
  var q=BD17_txt_(usuario).toLowerCase(); if(!q)return '';
  var rows=REPO_RelacionalV5.listar('usuarios')||[];
  for(var i=0;i<rows.length;i++) if(BD17_txt_(rows[i].CORREO).toLowerCase()===q||BD17_txt_(rows[i].USUARIO).toLowerCase()===q||BD17_txt_(rows[i].NOMBRE).toLowerCase()===q)return rows[i].ID_USUARIO||'';
  return '';
}

function BD17_finalizarSubetapa_(id, usuario){
  if(!BD17_activo_()) throw new Error('BD-17 no está activo.');
  var lock=LockService.getScriptLock();
  try{
    lock.waitLock(30000);
    var now=BD17_now_(), cats=BD17_catalogosActivos_(), rows=REPO_RelacionalV5.listar('expediente_subetapas')||[], current=null;
    for(var i=0;i<rows.length;i++) if(String(rows[i].ID_EXPEDIENTE_SUBETAPA)===String(id)){current=rows[i];break;}
    if(!current) return {status:false,message:'No se encontró la actividad.'};
    var sc=cats.sById[String(current.ID_SUBETAPA)];
    if(!sc || BD17_up_(sc.ESTADO_REGISTRO)==='INACTIVO') return {status:false,message:'La actividad ya no pertenece al flujo vigente.'};
    if(BD17_up_(current.ESTADO)==='FINALIZADO') return {status:false,silent:true,alreadyFinalized:true,message:''};
    if(BD17_up_(current.ESTADO)!=='EN_PROCESO' && BD17_up_(current.ESTADO)!=='EN_CURSO') return {status:false,message:'Esta actividad todavía no está habilitada.'};
    var ec=cats.eById[String(sc.ID_ETAPA)], etapaNum=Number(ec&&ec.ORDEN||0), exp=REPO_RelacionalV5.buscarUno('expedientes','ID_EXPEDIENTE',current.ID_EXPEDIENTE);
    if (typeof BD175_esChecklist_ === 'function' && BD175_esChecklist_(etapaNum, sc.CODIGO)) {
      var chk = BD175_obtenerChecklistPorIdExpediente_(current.ID_EXPEDIENTE, etapaNum);
      if (!chk || !chk.status || !chk.completo) return {status:false,message:'Debe marcar todos los requisitos del checklist antes de finalizar esta subetapa.'};
    }
    if(!exp) return {status:false,message:'No se encontró el expediente relacional.'};
    var codigo=BD17_up_(exp.CODIGO_TRAMITE), uid=BD17_usuarioId_(usuario);
    BD16_upsert_('expediente_subetapas','ID_EXPEDIENTE_SUBETAPA',{
      ID_EXPEDIENTE_SUBETAPA:current.ID_EXPEDIENTE_SUBETAPA,ID_EXPEDIENTE:current.ID_EXPEDIENTE,ID_SUBETAPA:current.ID_SUBETAPA,
      ID_RESPONSABLE:uid||current.ID_RESPONSABLE||'',ESTADO:'FINALIZADO',FECHA_INICIO:current.FECHA_INICIO||now,FECHA_FIN:now,OBSERVACION:current.OBSERVACION||'',CREADO_EN:current.CREADO_EN||now,MODIFICADO_EN:now
    });

    var same=cats.activos.filter(function(x){return Number(x.etapa.ORDEN)===etapaNum;});
    var pos=-1; for(var p=0;p<same.length;p++) if(String(same[p].sub.ID_SUBETAPA)===String(sc.ID_SUBETAPA)){pos=p;break;}
    var etapaCompleta=pos===same.length-1, siguienteSubetapa=false, siguienteEtapa=null, siguienteId='', fechaSiguiente='';
    var stageRows=REPO_RelacionalV5.filtrar('expediente_etapas',{ID_EXPEDIENTE:current.ID_EXPEDIENTE})||[], er=null;
    for(var sr=0;sr<stageRows.length;sr++)if(String(stageRows[sr].ID_ETAPA)===String(ec.ID_ETAPA)){er=stageRows[sr];break;}
    var pct=Math.round((pos+1)*100/same.length);

    if(!etapaCompleta){
      var nx=same[pos+1], allSubs=REPO_RelacionalV5.filtrar('expediente_subetapas',{ID_EXPEDIENTE:current.ID_EXPEDIENTE})||[], nr=null;
      for(var a=0;a<allSubs.length;a++)if(String(allSubs[a].ID_SUBETAPA)===String(nx.sub.ID_SUBETAPA)){nr=allSubs[a];break;}
      if(nr){
        BD16_upsert_('expediente_subetapas','ID_EXPEDIENTE_SUBETAPA',{
          ID_EXPEDIENTE_SUBETAPA:nr.ID_EXPEDIENTE_SUBETAPA,ID_EXPEDIENTE:nr.ID_EXPEDIENTE,ID_SUBETAPA:nr.ID_SUBETAPA,ID_RESPONSABLE:nr.ID_RESPONSABLE||uid||'',
          ESTADO:'EN_PROCESO',FECHA_INICIO:nr.FECHA_INICIO||now,FECHA_FIN:'',OBSERVACION:nr.OBSERVACION||'',CREADO_EN:nr.CREADO_EN||now,MODIFICADO_EN:now
        });
        siguienteSubetapa=true; siguienteId=nr.ID_EXPEDIENTE_SUBETAPA; fechaSiguiente=BD17_fmt_(nr.FECHA_INICIO||now);
      }
      if(er) BD16_upsert_('expediente_etapas','ID_EXPEDIENTE_ETAPA',{
        ID_EXPEDIENTE_ETAPA:er.ID_EXPEDIENTE_ETAPA,ID_EXPEDIENTE:er.ID_EXPEDIENTE,ID_ETAPA:er.ID_ETAPA,ID_RESPONSABLE:er.ID_RESPONSABLE||uid||'',ESTADO:'EN_PROCESO',FECHA_INICIO:er.FECHA_INICIO||now,FECHA_FIN:'',PORCENTAJE:pct,CREADO_EN:er.CREADO_EN||now,MODIFICADO_EN:now
      });
    }else{
      if(er) BD16_upsert_('expediente_etapas','ID_EXPEDIENTE_ETAPA',{
        ID_EXPEDIENTE_ETAPA:er.ID_EXPEDIENTE_ETAPA,ID_EXPEDIENTE:er.ID_EXPEDIENTE,ID_ETAPA:er.ID_ETAPA,ID_RESPONSABLE:er.ID_RESPONSABLE||uid||'',ESTADO:'FINALIZADO',FECHA_INICIO:er.FECHA_INICIO||now,FECHA_FIN:now,PORCENTAJE:100,CREADO_EN:er.CREADO_EN||now,MODIFICADO_EN:now
      });
      if(etapaNum<7){
        siguienteEtapa=etapaNum+1;
        var nec=BD17_buscarEtapaCatalogoPorOrden_(siguienteEtapa), ner=null;
        for(var z=0;z<stageRows.length;z++) if(nec&&String(stageRows[z].ID_ETAPA)===String(nec.ID_ETAPA)){ner=stageRows[z];break;}
        if(ner) BD16_upsert_('expediente_etapas','ID_EXPEDIENTE_ETAPA',{
          ID_EXPEDIENTE_ETAPA:ner.ID_EXPEDIENTE_ETAPA,ID_EXPEDIENTE:ner.ID_EXPEDIENTE,ID_ETAPA:ner.ID_ETAPA,ID_RESPONSABLE:ner.ID_RESPONSABLE||uid||'',ESTADO:'EN_PROCESO',FECHA_INICIO:ner.FECHA_INICIO||now,FECHA_FIN:'',PORCENTAJE:0,CREADO_EN:ner.CREADO_EN||now,MODIFICADO_EN:now
        });
        var nextTasks=cats.activos.filter(function(x){return Number(x.etapa.ORDEN)===siguienteEtapa;});
        if(nextTasks.length){
          var ars=REPO_RelacionalV5.filtrar('expediente_subetapas',{ID_EXPEDIENTE:current.ID_EXPEDIENTE})||[], first=null;
          for(var q=0;q<ars.length;q++) if(String(ars[q].ID_SUBETAPA)===String(nextTasks[0].sub.ID_SUBETAPA)){first=ars[q];break;}
          if(first) { siguienteId=first.ID_EXPEDIENTE_SUBETAPA; fechaSiguiente=BD17_fmt_(first.FECHA_INICIO||now); BD16_upsert_('expediente_subetapas','ID_EXPEDIENTE_SUBETAPA',{
            ID_EXPEDIENTE_SUBETAPA:first.ID_EXPEDIENTE_SUBETAPA,ID_EXPEDIENTE:first.ID_EXPEDIENTE,ID_SUBETAPA:first.ID_SUBETAPA,ID_RESPONSABLE:first.ID_RESPONSABLE||uid||'',ESTADO:'EN_PROCESO',FECHA_INICIO:first.FECHA_INICIO||now,FECHA_FIN:'',OBSERVACION:first.OBSERVACION||'',CREADO_EN:first.CREADO_EN||now,MODIFICADO_EN:now
          }); }
        }
      }else{
        var expObj=exp;
        BD16_upsert_('expedientes','ID_EXPEDIENTE',Object.assign({},expObj,{ESTADO:'FINALIZADO',MODIFICADO_EN:now}));
      }
    }

    BD16_upsert_('historial','ID_HISTORIAL',{
      ID_HISTORIAL:BD17_id_('HIS',codigo+'_'+sc.CODIGO+'_'+now.getTime()),ID_EXPEDIENTE:current.ID_EXPEDIENTE,ID_USUARIO:uid,EVENTO:'AGENDA_COMPLETADA',ETAPA:String(etapaNum),SUBETAPA:sc.CODIGO,
      DETALLE:'Actividad completada: '+sc.NOMBRE,VISIBILIDAD:'PUBLICO',ESTADO:'SUCCESS',CREADO_EN:now
    });

    /* V20: la próxima apertura debe recibir el workflow recién actualizado. */
    if(typeof BD18_INVALIDAR_EXPEDIENTE==='function')BD18_INVALIDAR_EXPEDIENTE(codigo);

    return {status:true,expediente:codigo,etapa:etapaNum,nombreEtapa:ec?ec.NOMBRE:'',subetapa:sc.CODIGO,descripcion:sc.NOMBRE,fechaFin:BD17_fmt_(now),usuarioFin:usuario||'',porcentaje:etapaCompleta?100:pct,etapaCompleta:etapaCompleta,siguienteSubetapa:siguienteSubetapa,siguienteEtapa:siguienteEtapa,siguienteId:siguienteId,fechaSiguiente:fechaSiguiente,autoInicio:true};
  }catch(e){return{status:false,message:e.message||'No se pudo completar la actividad.'};}
  finally{try{lock.releaseLock();}catch(ignore){}}
}

function BD17_iniciarSubetapa_(id,usuario){
  if(!BD17_activo_()) throw new Error('BD-17 no está activo.');
  var rows=REPO_RelacionalV5.listar('expediente_subetapas')||[], r=null;
  for(var i=0;i<rows.length;i++)if(String(rows[i].ID_EXPEDIENTE_SUBETAPA)===String(id)){r=rows[i];break;}
  if(!r)return{status:false,message:'No se encontró la actividad.'};
  if(BD17_up_(r.ESTADO)==='FINALIZADO')return{status:false,message:'La actividad ya está completada.'};
  var now=BD17_now_();
  BD16_upsert_('expediente_subetapas','ID_EXPEDIENTE_SUBETAPA',Object.assign({},r,{ID_RESPONSABLE:BD17_usuarioId_(usuario)||r.ID_RESPONSABLE||'',ESTADO:'EN_PROCESO',FECHA_INICIO:r.FECHA_INICIO||now,MODIFICADO_EN:now}));
  return{status:true,id:id,fechaInicio:BD17_fmt_(r.FECHA_INICIO||now)};
}

function BD17_PREVISUALIZAR(){
  var errs=[], tabs=['etapas_catalogo','subetapas_catalogo','expedientes','expediente_etapas','expediente_subetapas','historial'];
  tabs.forEach(function(t){try{BD5_tabla_(t);}catch(e){errs.push(t+': '+e.message);}});
  var out={status:errs.length===0,fase:BD17_CONFIG.fase,version:BD17_CONFIG.version,modo:'PREVIEW',actividades:BD17_catalogo_().length,documentosEnAgenda:false,autoFechaFin:true,autoInicioSiguiente:true,autoCambioEtapa:true,errores:errs,modificaDatos:false};
  Logger.log(JSON.stringify(out,null,2));return out;
}

function BD17_ACTIVAR_AGENDA(){
  var pre=BD17_PREVISUALIZAR(); if(!pre.status)throw new Error(pre.errores.join('; '));
  var backups=[];
  backups.push(BD17_backupTabla_('etapas_catalogo','B17_ETAPAS'));
  backups.push(BD17_backupTabla_('subetapas_catalogo','B17_SUBCAT'));
  backups.push(BD17_backupTabla_('expediente_etapas','B17_EXPETA'));
  backups.push(BD17_backupTabla_('expediente_subetapas','B17_EXPSUB'));
  backups.push(BD17_backupTabla_('historial','B17_HIST'));
  var c=BD17_prepararCatalogo_();
  PropertiesService.getScriptProperties().setProperty(BD17_CONFIG.key,'TRUE');
  var mig=BD17_migrarExpedientesExistentes_();
  var out={status:true,fase:BD17_CONFIG.fase,version:BD17_CONFIG.version,agendaActiva:true,catalogo:c,migracion:mig,backups:backups,siguientePaso:'BD17_PROBAR_DIAGNOSTICO()'};
  Logger.log(JSON.stringify(out,null,2));return out;
}

function BD17_ROLLBACK(){
  BD17_restoreTabla_('etapas_catalogo','B17_ETAPAS');
  BD17_restoreTabla_('subetapas_catalogo','B17_SUBCAT');
  BD17_restoreTabla_('expediente_etapas','B17_EXPETA');
  BD17_restoreTabla_('expediente_subetapas','B17_EXPSUB');
  BD17_restoreTabla_('historial','B17_HIST');
  PropertiesService.getScriptProperties().setProperty(BD17_CONFIG.key,'FALSE');
  var out={status:true,fase:BD17_CONFIG.fase,rollback:true,agendaActiva:false};Logger.log(JSON.stringify(out,null,2));return out;
}

function BD17_PROBAR_DIAGNOSTICO(){
  var cats=BD17_catalogosActivos_(), activos=cats.activos.length, exps=REPO_RelacionalV5.listar('expedientes')||[], subs=REPO_RelacionalV5.listar('expediente_subetapas')||[];
  var activeIds={};cats.activos.forEach(function(x){activeIds[String(x.sub.ID_SUBETAPA)]=true;});
  var porExp={}, enCursoPorExp={};
  subs.forEach(function(r){if(!activeIds[String(r.ID_SUBETAPA)])return;var k=String(r.ID_EXPEDIENTE);porExp[k]=(porExp[k]||0)+1;if(BD17_up_(r.ESTADO)==='EN_PROCESO')enCursoPorExp[k]=(enCursoPorExp[k]||0)+1;});
  var incompletos=[];exps.forEach(function(e){var n=porExp[String(e.ID_EXPEDIENTE)]||0;if(n!==activos)incompletos.push({expediente:e.CODIGO_TRAMITE,actividades:n,esperadas:activos});});
  var out={status:BD17_activo_()&&activos===BD17_catalogo_().length&&incompletos.length===0,fase:BD17_CONFIG.fase,version:BD17_CONFIG.version,agendaActiva:BD17_activo_(),actividadesCatalogoActivas:activos,expedientes:exps.length,expedientesIncompletos:incompletos,documentosAgendaHabilitados:false,fechaFinAutomatica:true,inicioSiguienteAutomatico:true,cambioEtapaAutomatico:true,base:'BD_TITULACION_RELACIONAL_V2'};
  Logger.log(JSON.stringify(out,null,2));return out;
}

