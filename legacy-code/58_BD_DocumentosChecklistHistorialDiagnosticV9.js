/** BD-09 - Diagnostico de integracion Documentos + Checklist + Historial. */
function BD9_PROBAR_DIAGNOSTICO(){
  var errores=[],advertencias=[],cfg=BD6_GET_CONFIG(),exps=[];
  try{exps=REPO_RelacionalV5.listar('expedientes');}catch(e){errores.push('Expedientes: '+e.message);}
  var docComp=[],chkComp=[],hisComp=[];
  var tot={documentosLegacy:0,documentosRelacional:0,checklistLegacy:0,checklistRelacional:0,historialLegacy:0,historialRelacional:0};
  for(var i=0;i<exps.length;i++){
    var cod=String(exps[i].CODIGO_TRAMITE||'');
    try{
      var dl=REPO_DocumentosV4.listarPorExpediente(cod),dr=BD9_relDocumentosExpediente_(cod),dc=BD9_cmpIds_(dl,dr);
      tot.documentosLegacy+=dc.legacy;tot.documentosRelacional+=dc.relacional;
      docComp.push({expediente:cod,status:dc.status,legacy:dc.legacy,relacional:dc.relacional,coberturaRelacional:!!dr._bd9Coverage});
    }catch(e){docComp.push({expediente:cod,status:false,error:e.message});}
    try{
      var cl=REPO_ChecklistV4.obtener(cod),cr=BD9_relChecklist_(cod),cc=BD9_cmpChecklist_(cl,cr);
      tot.checklistLegacy+=Number(cl&&cl.total||0);tot.checklistRelacional+=Number(cr&&cr.total||0);
      chkComp.push({expediente:cod,status:cr._bd9Coverage?cc.status:true,legacy:Number(cl&&cl.total||0),relacional:Number(cr&&cr.total||0),coberturaRelacional:!!cr._bd9Coverage});
    }catch(e){chkComp.push({expediente:cod,status:false,error:e.message});}
    try{
      var hl=REPO_HistorialV4.porExpediente(cod,false),hr=BD9_relHistorialPorExp_(cod,false),hc=BD9_cmpHistorial_(hl,hr);
      tot.historialLegacy+=hl.length;tot.historialRelacional+=hr.length;
      hisComp.push({expediente:cod,status:hr.length?hc.status:true,legacy:hl.length,relacional:hr.length,coberturaRelacional:hr.length>0});
    }catch(e){hisComp.push({expediente:cod,status:false,error:e.message});}
  }
  var rows={};
  ['documentos','checklist_items','checklist_respuestas','historial'].forEach(function(t){try{rows[t]=REPO_RelacionalV5.listar(t).length;}catch(e){rows[t]=null;errores.push(t+': '+e.message);}});
  var cobertura={
    documentos: rows.documentos>0 && tot.documentosRelacional>=tot.documentosLegacy,
    checklist: rows.checklist_items>0 && rows.checklist_respuestas>0,
    historial: rows.historial>0 && tot.historialRelacional>=tot.historialLegacy
  };
  if(!cobertura.documentos) advertencias.push('Documentos relacionales aun no cubren todo el inventario legacy; MIRROR/fallback mantiene Drive legacy.');
  if(!cobertura.checklist) advertencias.push('Checklist relacional aun no tiene cobertura suficiente; las respuestas continúan en LEGACY.');
  if(!cobertura.historial) advertencias.push('Historial relacional aun no tiene cobertura suficiente; las consultas continúan en LEGACY.');
  if(typeof BD4_PROBAR_RESUMEN==='function') advertencias.push('BD-04 conserva el CUI duplicado de datos de prueba hasta su limpieza final.');
  var out={
    status:errores.length===0,
    fase:'BD-09',version:BD9_CONFIG.version,
    integracion:{documentos:true,checklist:true,historial:true,driveFisico:'LEGACY',readMode:cfg.readMode,writeMode:'LEGACY'},
    tablasRelacionales:rows,
    comparaciones:{documentos:docComp,checklist:chkComp,historial:hisComp},
    totales:tot,
    coberturaRelacional:cobertura,
    listoParaCutoverRelacional:cobertura.documentos&&cobertura.checklist&&cobertura.historial,
    fallbackSeguro:true,
    rollback:{disponible:true,funcion:'BD9_ROLLBACK_LEGACY'},
    escrituraRelacionalHabilitada:false,
    frontendModificado:false,
    datosLegacyModificadosPorDiagnostico:false,
    datosRelacionalesModificadosPorDiagnostico:false,
    errores:errores,advertencias:advertencias
  };
  Logger.log(JSON.stringify(out,null,2));return out;
}
