/** BD-14 - Acta técnica de cierre lógico de la migración. */
function BD14_CERRAR_MIGRACION_ARQUITECTONICA(){
  var a=BD14_buildAudit_();
  if(!a.status) throw new Error('No se puede cerrar BD-14: existen errores técnicos en la auditoría.');
  var profile=BD14_profile_();
  var cerradoEn=new Date();
  PropertiesService.getScriptProperties().setProperty('BD14_MIGRATION_ARCHITECTURE_CLOSED','TRUE');
  PropertiesService.getScriptProperties().setProperty('BD14_MIGRATION_ARCHITECTURE_CLOSED_AT',cerradoEn.toISOString());
  var out={
    status:true,fase:'BD-14',version:BD14_CONFIG.version,
    migracionArquitectonicaCerrada:true,
    cutoverGlobalEjecutado:a.listoParaCutoverGlobal && a.arquitectura.readMode==='RELATIONAL',
    profile:profile,
    readMode:a.arquitectura.readMode,
    writeMode:'LEGACY',
    dualWriteHabilitado:a.arquitectura.dualWriteHabilitado,
    authMode:a.arquitectura.authMode,
    listoParaCutoverGlobal:a.listoParaCutoverGlobal,
    noAptos:a.noAptosParaCutoverGlobal,
    legacyConservado:true,
    escrituraRelacionalDirectaHabilitada:false,
    siguienteEvolucion:'PostgreSQL / backend profesional usando repositories-services existentes',
    nota:a.listoParaCutoverGlobal?'La lectura global relacional puede habilitarse con el controlador BD-14.':'La arquitectura queda cerrada en MIRROR seguro hasta completar la cobertura pendiente. No es necesario crear nuevas fases estructurales para forzar el corte.',
    cerradoEn:cerradoEn,
    advertencias:a.advertencias,
    errores:[]
  };
  Logger.log(JSON.stringify(out,null,2));return out;
}
function BD14_PROBAR_CIERRE(){
  var p=PropertiesService.getScriptProperties(), a=BD14_buildAudit_();
  var out={status:a.status,fase:'BD-14',version:BD14_CONFIG.version,migracionArquitectonicaCerrada:String(p.getProperty('BD14_MIGRATION_ARCHITECTURE_CLOSED')||'').toUpperCase()==='TRUE',cerradoEn:p.getProperty('BD14_MIGRATION_ARCHITECTURE_CLOSED_AT')||'',readMode:a.arquitectura.readMode,writeMode:a.arquitectura.writeMode,listoParaCutoverGlobal:a.listoParaCutoverGlobal,noAptos:a.noAptosParaCutoverGlobal,legacyDisponible:true,errores:a.errores,advertencias:a.advertencias};
  Logger.log(JSON.stringify(out,null,2));return out;
}
