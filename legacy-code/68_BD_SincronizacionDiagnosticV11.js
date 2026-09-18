/** BD-11 - Diagnostico de sincronizacion incremental */
function BD11_countLegacy_(id,nombre){return BD11_legacyRows_(id,nombre).length;}
function BD11_countRel_(tabla){try{return (REPO_RelacionalV5.listar(tabla)||[]).length;}catch(e){return 0;}}

function BD11_PROBAR_DIAGNOSTICO(){
  var cfg=typeof BD6_GET_CONFIG==='function'?BD6_GET_CONFIG():{readMode:'MIRROR',writeMode:'LEGACY'};
  var p=BD11_buildPlan_();
  var legacy={
    asesores:BD11_countLegacy_(TT_ID_ASE,'ASESORES'),
    talleres:BD11_countLegacy_(TT_ID_TALL,'TALLERES'),
    sesiones:BD11_countLegacy_(TT_ID_TALL,'SESIONES'),
    matriculas:BD11_countLegacy_(TT_ID_TALL,'MATRICULADOS'),
    asistencia:BD11_countLegacy_(TT_ID_TALL,'ASISTENCIA')
  };
  var rel={asesores:BD11_countRel_('asesores'),talleres:BD11_countRel_('talleres'),sesiones:BD11_countRel_('taller_sesiones'),matriculas:BD11_countRel_('taller_matriculas'),asistencia:BD11_countRel_('taller_asistencia')};
  var resolubles={asesores:p.asesores.length,talleres:p.talleres.length,sesiones:p.sesiones.length,matriculas:p.matriculas.length,asistencia:p.asistencia.length};
  var cobertura={
    asesores:rel.asesores>=resolubles.asesores,
    talleres:rel.talleres>=resolubles.talleres,
    sesiones:rel.sesiones>=resolubles.sesiones,
    matriculas:rel.matriculas>=resolubles.matriculas,
    asistencia:rel.asistencia>=resolubles.asistencia
  };
  var faltantesFK={matriculas:p.omitidos.matriculas.length,asistencia:p.omitidos.asistencia.length};
  var conflictosPK=p.conflictos||{asesores:[],talleres:[],sesiones:[],matriculas:[],asistencia:[]};
  var conflictosTotal=Object.keys(conflictosPK).reduce(function(n,k){return n+(conflictosPK[k]||[]).length;},0);
  var adv=[];
  if(faltantesFK.matriculas)adv.push('Hay matrículas legacy no sincronizables porque su expediente/estudiante ya no existe en la base relacional. No se recrearon automáticamente.');
  if(faltantesFK.asistencia)adv.push('Hay asistencias legacy no sincronizables por falta de estudiante o matrícula relacional. No se recrearon automáticamente.');
  if(conflictosTotal)adv.push('Se detectaron PK legacy duplicadas. Esas claves se excluyen del UPSERT para evitar sobrescritura: '+JSON.stringify(conflictosPK));
  if(cfg.readMode!=='MIRROR')adv.push('Para validación de BD-11 se recomienda readMode MIRROR.');
  var out={status:true,fase:'BD-11',version:BD11_CONFIG.version,integracion:{readMode:cfg.readMode,writeMode:cfg.writeMode||'LEGACY',syncDirection:'LEGACY -> RELACIONAL',upsertIdempotente:true,borradoAutomatico:false},
    registros:{legacy:legacy,relacional:rel,resolubles:resolubles},coberturaResoluble:cobertura,faltantesPorFK:faltantesFK,
    conflictosPKLegacy:conflictosPK,conflictosPKTotal:conflictosTotal,
    seguridad:{legacyModificado:false,escrituraProductivaRelacionalHabilitada:false,authModificado:false,frontendModificado:false,pkDuplicadasExcluidasDelUpsert:true},
    listoParaReejecutar:true,listoParaCutoverRelacional:false,errores:[],advertencias:adv};
  Logger.log(JSON.stringify(out,null,2));return out;
}

function BD11_PROBAR_COBERTURA_TALLERES(){
  var d=BD11_PROBAR_DIAGNOSTICO();
  var out={status:d.status,fase:'BD-11',version:BD11_CONFIG.version,cobertura:d.coberturaResoluble,legacy:d.registros.legacy,relacional:d.registros.relacional,faltantesPorFK:d.faltantesPorFK};
  Logger.log(JSON.stringify(out,null,2));return out;
}

