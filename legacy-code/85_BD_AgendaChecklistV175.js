/**
 * BD-17.5 - CHECKLIST AGRUPADO DE AGENDA
 * Checklist administrativo sin carga documental para Etapa 1.1 y Etapa 2.1.
 * Persistencia: hoja auxiliar AGENDA_CHECKLIST dentro de BD_TITULACION_RELACIONAL_V2.
 */
const BD175_CONFIG = Object.freeze({fase:'BD-17.5',version:'db-17.5-checklist-agrupado',sheet:'AGENDA_CHECKLIST'});

function BD175_items_(etapa){
  if(Number(etapa)===1) return [
    'Plan de Tesis/Trabajo Académico',
    'Recibo derecho de Inscripción Plan de Tesis',
    'Anexo 17 Solicitud',
    'Anexo 18 Aceptación de asesoría',
    'Autorización de uso de información o declaración jurada Anexo 33',
    'En el caso de Trabajo Académico, evidenciar 2 años de experiencia posterior a la fecha de egreso con la Constancia de Trabajo y Reporte SUNARP'
  ];
  if(Number(etapa)===2) return [
    'Anexo 8 formato de Culminación de Asesoría',
    'Anexo 27 Solicitud de titulación',
    'Anexo 2 declaración jurada de antecedentes',
    'Anexo 32 Declaración jurada de veracidad de la información',
    'Recibos de pago derecho de titulación',
    'Anexo 1',
    'Libreta de notas',
    'Certificado de estudios',
    'Constancia de primera matrícula',
    'Constancia de Egresado',
    'Constancia de no adeudar bienes y servicios (pensiones)',
    'Constancia de no adeudar libros a biblioteca',
    'Fotografía en formato JPG'
  ];
  return [];
}
function BD175_esChecklist_(etapa,codigo){ return (Number(etapa)===1&&String(codigo)==='1.1')||(Number(etapa)===2&&String(codigo)==='2.1'); }
function BD175_sheet_(){
  var ss=BD5_abrirBase_(); if(!ss) throw new Error('No se encontró BD_TITULACION_RELACIONAL_V2.');
  var sh=ss.getSheetByName(BD175_CONFIG.sheet);
  if(!sh){ sh=ss.insertSheet(BD175_CONFIG.sheet); sh.getRange(1,1,1,9).setValues([['ID','ID_EXPEDIENTE','CODIGO_TRAMITE','ETAPA','NUMERO','REQUISITO','MARCADO','USUARIO','MODIFICADO_EN']]); sh.setFrozenRows(1); }
  return sh;
}
function BD175_codigoPorId_(id){ var e=REPO_RelacionalV5.buscarUno('expedientes','ID_EXPEDIENTE',id); return e?String(e.CODIGO_TRAMITE||'').trim().toUpperCase():''; }
function BD175_idExp_(codigo){ var e=REPO_RelacionalV5.buscarUno('expedientes','CODIGO_TRAMITE',String(codigo||'').trim().toUpperCase()); return e?String(e.ID_EXPEDIENTE||''):''; }
function BD175_asegurar_(idExp,codigo,etapa){
  var items=BD175_items_(etapa); if(!items.length) return;
  var sh=BD175_sheet_(), lr=sh.getLastRow(), vals=lr>1?sh.getRange(2,1,lr-1,9).getValues():[], existe={};
  vals.forEach(function(r){if(String(r[1])===String(idExp)&&Number(r[3])===Number(etapa)) existe[Number(r[4])]=true;});
  var add=[], now=new Date(); items.forEach(function(nombre,i){var n=i+1;if(!existe[n]) add.push(['AGC_'+String(idExp).replace(/[^A-Za-z0-9]/g,'')+'_'+etapa+'_'+n,idExp,codigo,Number(etapa),n,nombre,'NO','',now]);});
  if(add.length) sh.getRange(sh.getLastRow()+1,1,add.length,9).setValues(add);
}
function BD175_obtenerChecklistPorIdExpediente_(idExp,etapa){
  var codigo=BD175_codigoPorId_(idExp); if(!codigo)return{status:false,message:'No se encontró el expediente.'};
  BD175_asegurar_(idExp,codigo,etapa); var sh=BD175_sheet_(), lr=sh.getLastRow(), vals=lr>1?sh.getRange(2,1,lr-1,9).getValues():[], req=[];
  vals.forEach(function(r){if(String(r[1])===String(idExp)&&Number(r[3])===Number(etapa))req.push({numero:Number(r[4]),nombre:r[5]||'',marcado:String(r[6]).toUpperCase()==='SI',usuario:r[7]||'',actualizado:r[8]||''});});
  req.sort(function(a,b){return a.numero-b.numero;}); var marc=req.filter(function(x){return x.marcado;}).length,total=req.length;
  return{status:true,expediente:codigo,etapa:Number(etapa),marcados:marc,total:total,completo:total>0&&marc===total,porcentaje:total?Math.round(marc*100/total):0,requisitos:req};
}
function BD175_OBTENER_CHECKLIST(expediente,etapa){ var id=BD175_idExp_(expediente); if(!id)return{status:false,message:'No se encontró el expediente '+expediente+'.'}; return BD175_obtenerChecklistPorIdExpediente_(id,etapa); }
function BD175_GUARDAR_CHECK(expediente,etapa,numero,marcado,usuario){
  var id=BD175_idExp_(expediente); if(!id)return{status:false,message:'No se encontró el expediente '+expediente+'.'}; BD175_asegurar_(id,String(expediente).toUpperCase(),etapa);
  var sh=BD175_sheet_(), lr=sh.getLastRow(), vals=lr>1?sh.getRange(2,1,lr-1,9).getValues():[];
  for(var i=0;i<vals.length;i++) if(String(vals[i][1])===id&&Number(vals[i][3])===Number(etapa)&&Number(vals[i][4])===Number(numero)){
    sh.getRange(i+2,7,1,3).setValues([[marcado?'SI':'NO',usuario||'',new Date()]]); return BD175_obtenerChecklistPorIdExpediente_(id,etapa);
  }
  return{status:false,message:'No se encontró el requisito.'};
}
function BD175_APLICAR_CAMBIOS_AGENDA(){
  var b1=BD17_backupTabla_('subetapas_catalogo','B175_SUBCAT'); var b2=BD17_backupTabla_('expediente_subetapas','B175_EXPSUB'); var b3=BD17_backupTabla_('expediente_etapas','B175_EXPETA');
  var cat=BD17_prepararCatalogo_(); var mig=BD17_migrarExpedientesExistentes_();
  var exps=REPO_RelacionalV5.listar('expedientes')||[]; exps.forEach(function(e){BD175_asegurar_(e.ID_EXPEDIENTE,e.CODIGO_TRAMITE,1);BD175_asegurar_(e.ID_EXPEDIENTE,e.CODIGO_TRAMITE,2);});
  var out={status:true,fase:BD175_CONFIG.fase,version:BD175_CONFIG.version,subetapasActivas:BD17_catalogo_().length,catalogo:cat,migracion:mig,backups:[b1,b2,b3],checklistEtapa1:6,checklistEtapa2:13}; Logger.log(JSON.stringify(out,null,2)); return out;
}
function BD175_PROBAR_DIAGNOSTICO(){
  var cats=BD17_catalogosActivos_(), c1=BD175_items_(1).length,c2=BD175_items_(2).length;
  var out={status:cats.activos.length===BD17_catalogo_().length&&c1===6&&c2===13,fase:BD175_CONFIG.fase,subetapasActivas:cats.activos.length,esperadas:BD17_catalogo_().length,checklistEtapa1:c1,checklistEtapa2:c2,fechaAutomatica:true,scrollAutomaticoFrontend:true,documentosChecklist:false}; Logger.log(JSON.stringify(out,null,2)); return out;
}
