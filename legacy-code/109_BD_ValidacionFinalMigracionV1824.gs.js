function BD1824_PREVISUALIZAR_RESUMEN() {
  var r = BD1821_PREVISUALIZAR_MIGRACION_HISTORIAL();

  var resumen = {
    status:r.status,
    fase:'BD-18.25',
    version:'db-18.25-programas-dinamicos',
    totalRegistros:r.totalRegistros,
    aptos:r.aptos,
    bloqueados:r.bloqueados,
    yaMigrados:r.yaMigrados,
    criterioIngreso:'DNI y CUI válidos de 8 dígitos por participante + DNI no existente en la BD',
    programaNoBloquea:true,
    programasNuevos:r.programasNuevos || [],
    accionProgramaNuevo:'Se agregará automáticamente a PROGRAMAS con ESTADO_REGISTRO=ACTIVO al migrar el primer expediente que lo use.',
    detalleBloqueados:r.detalleBloqueados,
    modificaDatos:false
  };

  Logger.log(JSON.stringify(resumen,null,2));
  return resumen;
}
