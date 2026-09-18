/** BD-10 - Diagnóstico Taller + Asesores */
function BD10_PROBAR_DIAGNOSTICO(){
  var cfg=typeof BD6_GET_CONFIG==='function'?BD6_GET_CONFIG():{readMode:'MIRROR',writeMode:'LEGACY'};
  var cov=REPO_TallerAsesorRoutedV10.cobertura(), legacyT=BD10_legacyTalleres_(), compSes=[];
  legacyT.forEach(function(t){var l=REPO_TallerCoreV13.sesiones(t.id)||[],r=BD10_relSesiones_(t.id);compSes.push({idTaller:t.id,taller:t.nombre,status:BD10_cobertura_(l,r),legacy:l.length,relacional:r.length,coberturaRelacional:BD10_cobertura_(l,r)});});
  var ready=cov.asesores.completa&&cov.talleres.completa&&cov.matriculas.relacional>0&&cov.sesiones.relacional>0;
  var adv=[];
  if(!cov.asesores.completa)adv.push('ASESORES relacional no tiene cobertura completa; se mantiene fallback LEGACY.');
  if(!cov.talleres.completa)adv.push('TALLERES relacional no tiene cobertura completa; se mantiene fallback LEGACY.');
  if(cov.matriculas.relacional===0)adv.push('TALLER_MATRICULAS está vacío; matrículas continúan en LEGACY.');
  if(cov.sesiones.relacional===0)adv.push('TALLER_SESIONES está vacío; sesiones continúan en LEGACY.');
  if(cov.asistencia.relacional===0)adv.push('TALLER_ASISTENCIA está vacío; asistencia continúa en LEGACY.');
  var out={status:true,fase:'BD-10',version:BD10_CONFIG.version,integracion:{asesores:true,talleres:true,matriculas:true,sesiones:true,asistencia:true,readMode:cfg.readMode,writeMode:cfg.writeMode||'LEGACY'},coberturaRelacional:cov,comparaciones:{sesiones:compSes},listoParaCutoverRelacional:ready,fallbackSeguro:true,rollback:{disponible:true,funcion:'BD10_ROLLBACK_LEGACY'},escrituraRelacionalHabilitada:false,frontendModificado:false,authAsesorModificado:false,datosLegacyModificadosPorDiagnostico:false,datosRelacionalesModificadosPorDiagnostico:false,errores:[],advertencias:adv};
  Logger.log(JSON.stringify(out,null,2));return out;
}
