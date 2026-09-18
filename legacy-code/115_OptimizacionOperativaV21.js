/** V21 · Inserción documental selectiva + administración de asesores. */
const OPERATIVA21_CONFIG=Object.freeze({fase:'V22',version:'22.0.0'});
function OPERATIVA21_txt_(v){return String(v==null?'':v).trim();}
function OPERATIVA21_up_(v){return OPERATIVA21_txt_(v).toUpperCase();}

function OPERATIVA21_INSERTAR_DOCUMENTOS(expediente,documentoIds,datosFormulario){
  expediente=resolverExpedienteDocumentos(expediente);
  var ids=Array.isArray(documentoIds)?documentoIds.map(OPERATIVA21_txt_).filter(Boolean):[];
  if(!expediente)return{status:false,message:'No se pudo identificar el expediente.'};
  if(!ids.length)return{status:false,message:'Seleccione por lo menos un documento.'};
  /* Una sola llamada cliente-servidor: guarda únicamente si el navegador envió
     datos actuales y después usa la lectura relacional optimizada. */
  if(datosFormulario&&typeof datosFormulario==='object'){
    var guardado=MVC7A_guardarInformacionAdmin(datosFormulario);
    if(guardado&&guardado.status===false)return guardado;
  }
  var datos=obtenerDatosAlumnoDocumentos(expediente);
  if(!datos)return{status:false,message:'No existe información del expediente '+expediente+'.'};
  /* V22: validar contra el índice persistente. Ya no se recorre toda la
     carpeta de Drive cuando el usuario eligió uno o pocos documentos. */
  var permitidos={},indice=OPERATIVA21_LEER_INDICE_DOCUMENTOS(expediente);
  [1,2].forEach(function(etapa){(indice.porEtapa[etapa]||[]).forEach(function(d){permitidos[OPERATIVA21_txt_(d.id)]=d;});});
  if(!indice.completo){
    var carpeta=buscarCarpetaExpediente(expediente);
    if(!carpeta)return{status:false,message:'No se encontró la carpeta del expediente '+expediente+'.'};
    var documentos=obtenerDocumentosCarpeta(carpeta)||[];
    documentos.forEach(function(d){permitidos[OPERATIVA21_txt_(d.id)]=d;});
  }
  var seleccionados=[],omitidos=[];
  ids.forEach(function(id){if(permitidos[id])seleccionados.push(permitidos[id]);else omitidos.push(id);});
  if(!seleccionados.length)return{status:false,message:'Los documentos seleccionados no pertenecen al expediente.'};
  var procesados=[],errores=[];
  seleccionados.forEach(function(d){try{var r=insertarDatosEnDocumento(d.id,datos,d.nombre);procesados.push({id:d.id,nombre:d.nombre,pendientes:r&&r.pendientes||0});}catch(e){errores.push({id:d.id,nombre:d.nombre,error:e.message||String(e)});}});
  return{status:errores.length===0,parcial:errores.length>0,expediente:expediente,totalSolicitados:ids.length,totalProcesados:procesados.length,procesados:procesados,omitidos:omitidos,errores:errores,message:errores.length?'Se procesaron '+procesados.length+' documentos; '+errores.length+' presentaron error.':'Datos insertados en '+procesados.length+' documento(s).'};
}

function OPERATIVA21_hojaAsesores_(){
  var ss=BD5_abrirBase_();if(!ss)throw new Error('No se pudo abrir la base de datos central.');
  var sh=ss.getSheetByName('ASESORES');
  if(!sh){sh=ss.insertSheet('ASESORES');sh.getRange(1,1,1,11).setValues([['ID_ASESOR','GRADO','APELLIDOS_NOMBRES','DNI','CORREO','TELEFONO','USUARIO','PASSWORD_HASH','ESTADO_REGISTRO','CREADO_EN','MODIFICADO_EN']]);sh.setFrozenRows(1);}
  return sh;
}

function OPERATIVA21_GUARDAR_ASESOR(datos){
  datos=datos||{};var nombre=OPERATIVA21_up_(datos.nombres),telefono=OPERATIVA21_txt_(datos.telefono).replace(/[^0-9+ -]/g,''),correo=OPERATIVA21_txt_(datos.correo).toLowerCase();
  if(nombre.length<5)return{status:false,message:'Ingrese apellidos y nombres completos.'};
  if(telefono&&telefono.replace(/\D/g,'').length<7)return{status:false,message:'El teléfono no es válido.'};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))return{status:false,message:'El correo no es válido.'};
  var lock=LockService.getScriptLock();
  try{lock.waitLock(20000);var sh=OPERATIVA21_hojaAsesores_(),lc=sh.getLastColumn(),h=sh.getRange(1,1,1,lc).getDisplayValues()[0].map(OPERATIVA21_up_),idx={};h.forEach(function(x,i){idx[x]=i;});var rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,lc).getDisplayValues():[];
    for(var i=0;i<rows.length;i++)if(OPERATIVA21_txt_(rows[i][idx.CORREO]).toLowerCase()===correo)return{status:false,message:'Ya existe un asesor con ese correo.'};
    var row=new Array(lc).fill(''),now=new Date(),id='ASE_'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase();function set(c,v){if(idx[c]!=null)row[idx[c]]=v;}
    set('ID_ASESOR',id);set('APELLIDOS_NOMBRES',nombre);set('CORREO',correo);set('TELEFONO',telefono);set('ESTADO_REGISTRO','ACTIVO');set('CREADO_EN',now);set('MODIFICADO_EN',now);sh.getRange(sh.getLastRow()+1,1,1,lc).setValues([row]);
    try{CacheService.getScriptCache().removeAll(['V13_ASESORES','V13_BOOT']);}catch(e){}if(typeof BD5_invalidarMemoria_==='function')BD5_invalidarMemoria_('asesores');return{status:true,id:id,nombres:nombre,telefono:telefono,correo:correo,message:'Asesor registrado correctamente.'};
  }catch(e){return{status:false,message:e.message||String(e)};}finally{try{lock.releaseLock();}catch(e){}}
}

function OPERATIVA21_LISTAR_ASESORES(){
  try{var sh=OPERATIVA21_hojaAsesores_(),lc=sh.getLastColumn(),lr=sh.getLastRow();if(lr<2)return{status:true,asesores:[]};var vals=sh.getRange(1,1,lr,lc).getDisplayValues(),h=vals[0].map(OPERATIVA21_up_),idx={};h.forEach(function(x,i){idx[x]=i;});var out=[];for(var i=1;i<vals.length;i++)if(OPERATIVA21_txt_(vals[i][idx.ID_ASESOR]))out.push({id:vals[i][idx.ID_ASESOR],nombres:vals[i][idx.APELLIDOS_NOMBRES]||'',telefono:vals[i][idx.TELEFONO]||'',correo:vals[i][idx.CORREO]||'',estado:vals[i][idx.ESTADO_REGISTRO]||''});return{status:true,asesores:out};}catch(e){return{status:false,message:e.message||String(e),asesores:[]};}
}

function OPERATIVA21_PROBAR_DIAGNOSTICO(){var a=OPERATIVA21_LISTAR_ASESORES();return{status:!!a.status,fase:OPERATIVA21_CONFIG.fase,version:OPERATIVA21_CONFIG.version,tablaAsesores:true,totalAsesores:(a.asesores||[]).length,insercionSelectiva:true,seguimientoOptimista:true};}

function OPERATIVA21_hojaIndiceDocumentos_(){
  var ss=BD5_abrirBase_();if(!ss)throw new Error('No se pudo abrir la base central.');
  var sh=ss.getSheetByName('DOCUMENTOS_INDICE');
  if(!sh){sh=ss.insertSheet('DOCUMENTOS_INDICE');sh.getRange(1,1,1,8).setValues([['EXPEDIENTE','ETAPA','FILE_ID','NOMBRE','URL','MIME_TYPE','ACTIVO','MODIFICADO_EN']]);sh.setFrozenRows(1);}
  return sh;
}

function OPERATIVA21_LEER_INDICE_DOCUMENTOS(expediente){
  expediente=OPERATIVA21_up_(expediente);var sh=OPERATIVA21_hojaIndiceDocumentos_(),lr=sh.getLastRow(),porEtapa={1:[],2:[]},vista={1:false,2:false};
  if(lr<2)return{completo:false,porEtapa:porEtapa};
  var v=sh.getRange(2,1,lr-1,8).getDisplayValues();
  v.forEach(function(r){if(OPERATIVA21_up_(r[0])!==expediente||OPERATIVA21_up_(r[6])==='NO')return;var e=Number(r[1]);if(!porEtapa[e])return;vista[e]=true;if(r[2]==='__VACIO__')return;porEtapa[e].push({id:r[2],nombre:r[3],url:r[4],mimeType:r[5],incompleto:false,camposFaltantes:[],verificacionEtiquetasPendiente:r[5]===MimeType.GOOGLE_DOCS});});
  return{completo:vista[1]&&vista[2],porEtapa:porEtapa};
}

function OPERATIVA21_GUARDAR_INDICE_DOCUMENTOS(expediente,etapa1,etapa2){
  var sh=OPERATIVA21_hojaIndiceDocumentos_(),lr=sh.getLastRow(),actual=lr>1?sh.getRange(2,1,lr-1,8).getValues():[],keep=actual.filter(function(r){return OPERATIVA21_up_(r[0])!==OPERATIVA21_up_(expediente);}),now=new Date(),nuevas=[];
  function agregar(etapa,r){var docs=(r&&r.documentos||[]);if(!docs.length){nuevas.push([OPERATIVA21_up_(expediente),etapa,'__VACIO__','','','','SI',now]);return;}docs.forEach(function(d){nuevas.push([OPERATIVA21_up_(expediente),etapa,d.id||'',d.nombre||'',d.url||'',d.mimeType||'','SI',now]);});}
  agregar(1,etapa1);agregar(2,etapa2);var salida=keep.concat(nuevas);if(lr>1)sh.getRange(2,1,lr-1,8).clearContent();if(salida.length)sh.getRange(2,1,salida.length,8).setValues(salida);return nuevas.length;
}

function OPERATIVA21_LISTAR_DOCUMENTOS_INDEXADOS(expediente,forzar){
  expediente=resolverExpedienteDocumentos(expediente);if(!expediente)return{status:false,message:'Expediente inválido.'};
  if(!forzar){var idx=OPERATIVA21_LEER_INDICE_DOCUMENTOS(expediente);if(idx.completo)return{status:true,expediente:expediente,etapa1:{status:true,expediente:expediente,etapa:1,documentos:idx.porEtapa[1],total:idx.porEtapa[1].length,desdeIndice:true},etapa2:{status:true,expediente:expediente,etapa:2,documentos:idx.porEtapa[2],total:idx.porEtapa[2].length,desdeIndice:true},desdeIndice:true};}
  var e1=listarDocumentosEtapa(expediente,1),e2=listarDocumentosEtapa(expediente,2);if(e1&&e1.status&&e2&&e2.status)OPERATIVA21_GUARDAR_INDICE_DOCUMENTOS(expediente,e1,e2);return{status:!!(e1&&e1.status&&e2&&e2.status),expediente:expediente,etapa1:e1,etapa2:e2,desdeIndice:false};
}

function OPERATIVA21_RECONSTRUIR_INDICE_DOCUMENTOS(expediente){return OPERATIVA21_LISTAR_DOCUMENTOS_INDEXADOS(expediente,true);}

function OPERATIVA21_INICIAR_INDEXACION_DOCUMENTOS(){
  var props=PropertiesService.getScriptProperties();props.setProperty('OPERATIVA21_CURSOR_INDICE','0');
  var existe=ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='OPERATIVA21_PROCESAR_INDICES_DOCUMENTOS';});
  if(!existe)ScriptApp.newTrigger('OPERATIVA21_PROCESAR_INDICES_DOCUMENTOS').timeBased().everyMinutes(1).create();
  var primera=OPERATIVA21_PROCESAR_INDICES_DOCUMENTOS();
  return{status:true,message:'Indexación documental iniciada por lotes.',primerLote:primera};
}

function OPERATIVA21_PROCESAR_INDICES_DOCUMENTOS(){
  var props=PropertiesService.getScriptProperties(),cursor=Number(props.getProperty('OPERATIVA21_CURSOR_INDICE')||0),exps=REPO_RelacionalV5.listar('expedientes')||[];
  exps=exps.filter(function(e){return OPERATIVA21_up_(e.ESTADO_REGISTRO)!=='ELIMINADO'&&OPERATIVA21_txt_(e.CODIGO_TRAMITE);});
  var lote=exps.slice(cursor,cursor+2),ok=[],errores=[];
  lote.forEach(function(e){var codigo=OPERATIVA21_up_(e.CODIGO_TRAMITE);try{var r=OPERATIVA21_LISTAR_DOCUMENTOS_INDEXADOS(codigo,true);if(r&&r.status)ok.push(codigo);else errores.push(codigo+': '+(r&&r.message||'sin respuesta'));}catch(error){errores.push(codigo+': '+(error.message||error));}});
  cursor+=lote.length;props.setProperty('OPERATIVA21_CURSOR_INDICE',String(cursor));
  var terminado=cursor>=exps.length;
  if(terminado){props.deleteProperty('OPERATIVA21_CURSOR_INDICE');ScriptApp.getProjectTriggers().forEach(function(t){if(t.getHandlerFunction()==='OPERATIVA21_PROCESAR_INDICES_DOCUMENTOS')try{ScriptApp.deleteTrigger(t);}catch(e){}});}
  return{status:errores.length===0,procesados:ok,errores:errores,cursor:cursor,total:exps.length,terminado:terminado};
}
