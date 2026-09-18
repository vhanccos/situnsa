/**
 * ==============================================================
 * BD-05 - READ MIRROR / COMPARADOR LEGACY VS RELACIONAL
 * ==============================================================
 * Compara lecturas sin alterar ni el sistema legacy ni la BD nueva.
 * ==============================================================
 */

function BD5_legacyExpedientesCompactos_() {
  var src=(typeof BD3_sources_==='function')?BD3_sources_():{};
  var sh=src.expedientes;
  if(!sh || sh.getLastRow()<2) return [];
  var vals=sh.getDataRange().getValues(), h=(vals[0]||[]).map(function(x){return BD5_upper_(x);}), idx={};
  h.forEach(function(x,i){if(x && idx[x]==null) idx[x]=i;});
  return vals.slice(1).filter(function(r){return BD5_normalizar_(r[idx['N° DE TRÁMITE']])!=='';}).map(function(r){
    return {
      CODIGO_TRAMITE:BD5_upper_(r[idx['N° DE TRÁMITE']]),
      DNI1:idx['DNI']!=null?String(r[idx['DNI']]||'').replace(/\D/g,''):'',
      DNI2:idx['DNI02']!=null?String(r[idx['DNI02']]||'').replace(/\D/g,''):''
    };
  });
}

function BD5_relExpedientesCompactos_() {
  return BD5_listar_('expedientes').map(function(e){
    var participantes=REPO_RelacionalV5.obtenerParticipantesExpediente(e.ID_EXPEDIENTE);
    return {
      CODIGO_TRAMITE:BD5_upper_(e.CODIGO_TRAMITE),
      DNIS:participantes.map(function(p){return String(p.DNI||'').replace(/\D/g,'');}).filter(Boolean).sort()
    };
  });
}

function BD5_COMPARAR_EXPEDIENTES() {
  var legacy=BD5_legacyExpedientesCompactos_(), rel=BD5_relExpedientesCompactos_(), relMap={};
  rel.forEach(function(x){relMap[x.CODIGO_TRAMITE]=x;});
  var diferencias=[];
  legacy.forEach(function(x){
    var r=relMap[x.CODIGO_TRAMITE];
    if(!r){diferencias.push({codigo:x.CODIGO_TRAMITE,tipo:'FALTA_RELACIONAL'});return;}
    var ld=[x.DNI1,x.DNI2].filter(Boolean).sort();
    if(JSON.stringify(ld)!==JSON.stringify(r.DNIS)) diferencias.push({codigo:x.CODIGO_TRAMITE,tipo:'PARTICIPANTES_DIFERENTES',legacy:ld,relacional:r.DNIS});
  });
  rel.forEach(function(x){if(!legacy.some(function(l){return l.CODIGO_TRAMITE===x.CODIGO_TRAMITE;})) diferencias.push({codigo:x.CODIGO_TRAMITE,tipo:'SOLO_RELACIONAL'});});
  return {status:diferencias.length===0,legacy:legacy.length,relacional:rel.length,diferencias:diferencias};
}

function BD5_COMPARAR_CONTEOS() {
  var rel={
    usuarios:BD5_listar_('usuarios').length,
    estudiantes:BD5_listar_('estudiantes').length,
    expedientes:BD5_listar_('expedientes').length,
    expediente_estudiantes:BD5_listar_('expediente_estudiantes').length,
    expediente_etapas:BD5_listar_('expediente_etapas').length,
    expediente_subetapas:BD5_listar_('expediente_subetapas').length
  };
  var src=(typeof BD3_sources_==='function')?BD3_sources_():{};
  function rows(sh){return sh?Math.max(0,sh.getLastRow()-1):0;}
  var legacy={usuarios:rows(src.usuarios),expedientes:rows(src.expedientes),subetapas:rows(src.subetapas)};
  return {status:true,legacy:legacy,relacional:rel,nota:'Algunas entidades relacionales no tienen equivalencia 1:1 con una hoja legacy.'};
}

function BD5_PROBAR_DIAGNOSTICO() {
  var repo=BD5_PROBAR_REPOSITORY_RELACIONAL();
  var exp=BD5_COMPARAR_EXPEDIENTES();
  var counts=BD5_COMPARAR_CONTEOS();
  var integrity=null;
  try { if(typeof BD4_PROBAR_RESUMEN==='function') integrity=BD4_PROBAR_RESUMEN(); } catch(e){ integrity={status:false,error:e.message}; }
  var advertencias=[];
  if(integrity && integrity.status===false) advertencias.push('BD-04 aún reporta incidencias de calidad. BD-05 permanece solo lectura.');
  if(!exp.status) advertencias.push('Existen diferencias entre expedientes legacy y relacionales.');
  var out={
    status:repo.status && exp.status,
    fase:'BD-05',
    version:BD5_CONFIG.version,
    mode:BD5_getMode_(),
    objetivo:'Repository relacional + lectura espejo sin reemplazar persistencia productiva',
    repositoryRelacional:repo.status,
    comparacionExpedientes:exp,
    conteos:counts,
    integridadBD04:integrity?{status:integrity.status,resumen:integrity.resumen||null}:null,
    escrituraRelacionalHabilitada:false,
    frontendModificado:false,
    repositoriesLegacyReemplazados:false,
    datosLegacyModificados:false,
    datosRelacionalesModificados:false,
    advertencias:advertencias
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}
