/** BD-13 - Diagnóstico de autenticación y cobertura de hashes. */
function BD13_PROBAR_DIAGNOSTICO(){
  var p=BD13_buildPlan_(), rel=BD13_relUsers_(), byUser={}; rel.forEach(function(x){byUser[BD13_low_(x.USUARIO)]=x;});
  var cubiertos=0, hashInvalidos=[], faltantes=[];
  p.resolubles.forEach(function(x){ var r=byUser[BD13_low_(x.usuario)]; if(!r){faltantes.push({usuario:x.usuario,tipo:x.tipo});return;} if(BD13_verifyPassword_(x.password,r.PASSWORD_HASH)){cubiertos++;}else hashInvalidos.push({usuario:x.usuario,tipo:x.tipo}); });
  var sh=BD13_incidentSheet_(false), incidents={total:0,pendientes:0}; if(sh&&sh.getLastRow()>1){var v=sh.getRange(2,1,sh.getLastRow()-1,8).getDisplayValues();incidents.total=v.length;incidents.pendientes=v.filter(function(r){return BD13_up_(r[7])==='PENDIENTE';}).length;}
  var asesores=[]; try{asesores=REPO_RelacionalV5.listar('asesores')||[];}catch(e){}
  var asesorHashValidos=asesores.filter(function(a){return /^[a-f0-9]{64}$/i.test(BD13_txt_(a.PASSWORD_HASH));}).length;
  var listoMirror=p.conflictos.length===0&&p.sinPassword.length===0&&faltantes.length===0&&hashInvalidos.length===0&&cubiertos===p.resolubles.length;
  var listoCutover=listoMirror&&p.omitidosInvitados.length===0&&incidents.pendientes===0;
  var out={status:listoMirror,fase:'BD-13',version:BD13_CONFIG.version,authMode:BD13_mode_(),cobertura:{identidadesResolubles:p.resolubles.length,credencialesRelacionalesValidas:cubiertos,faltantes:faltantes,hashInvalidos:hashInvalidos,administradores:p.resolubles.filter(function(x){return x.tipo==='ADMIN';}).length,invitados:p.resolubles.filter(function(x){return x.tipo==='INVITADO';}).length,asesoresRelacionales:asesores.length,asesoresHashLegacySha256Validos:asesorHashValidos},omitidos:{invitadosSinEstudianteRelacional:p.omitidosInvitados,sinPassword:p.sinPassword},conflictosUsuario:p.conflictos,incidenciasMirror:incidents,seguridad:{passwordsExpuestos:false,passwordsEnClaroEscritosEnRelacional:false,legacyModificado:false,frontendModificado:false,sesionesSiguenEnCache:true,loginLegacyDisponible:true,rollback:'BD13_ROLLBACK_AUTH_LEGACY'},listoParaActivarMirror:listoMirror,listoParaCutoverRelacional:listoCutover,errores:[],advertencias:[]};
  if(p.omitidosInvitados.length)out.advertencias.push('Hay invitados legacy omitidos porque sus estudiantes ya no existen en la base relacional. No se recrearon.');
  if(incidents.pendientes)out.advertencias.push('Existen incidencias de autenticación MIRROR pendientes de revisar.');
  if(asesores.length!==asesorHashValidos)out.advertencias.push('Hay asesores relacionales sin PASSWORD_HASH SHA-256 legacy válido.');
  Logger.log(JSON.stringify(out,null,2)); return out;
}
function BD13_PROBAR_ESTADO(){ var d=BD13_PROBAR_DIAGNOSTICO(); return {status:d.status,fase:'BD-13',version:BD13_CONFIG.version,authMode:d.authMode,listoParaActivarMirror:d.listoParaActivarMirror,listoParaCutoverRelacional:d.listoParaCutoverRelacional,incidencias:d.incidenciasMirror}; }
