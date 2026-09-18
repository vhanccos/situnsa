/** BD-09.1 - DIAGNOSTICO DE COBERTURA 54/54 */
function BD91_PROBAR_DIAGNOSTICO() {
  var ctx = BD91_contexto_();
  var legacy = BD91_matrix_(ctx.legacy);
  var rel = BD91_matrix_(ctx.rel);
  var faltantesLegacy = BD91_LEGACY_COLUMNS.filter(function(c){ return !(c in legacy.idx); });

  var physicalRequired = [];
  Object.keys(BD91_EXPEDIENTE_PHYSICAL_MAP).forEach(function(k){
    var c = BD91_EXPEDIENTE_PHYSICAL_MAP[k];
    if (physicalRequired.indexOf(c) < 0) physicalRequired.push(c);
  });
  var faltantesFisicos = physicalRequired.filter(function(c){ return !(c in rel.idx); });
  var expRows = [];
  var errores = [];
  for (var i=1;i<rel.values.length;i++) {
    var code = BD91_str_(BD91_get_(rel.values[i],rel.idx,'CODIGO_TRAMITE'));
    if (!code) continue;
    try {
      var tags = BD91_DOCUMENT_TAGS(code);
      var missing = BD91_LEGACY_COLUMNS.filter(function(k){ return !(k in tags); });
      expRows.push({expediente:code,status:missing.length===0,etiquetas:54,faltantes:missing});
      if (missing.length) errores.push(code+': '+missing.join(', '));
    } catch(e) {
      expRows.push({expediente:code,status:false,error:String(e.message||e)});
      errores.push(code+': '+String(e.message||e));
    }
  }

  var contrato = BD91_LEGACY_COLUMNS.map(function(tag){
    var categoria = 'EXPEDIENTE';
    if (['ADMIN','CORREO_ADMIN'].indexOf(tag)>=0) categoria='USUARIO_NORMALIZADO';
    else if (/^(NOMBRES|NOM_MIN|DNI|PROGRAMAS|PROGR_MIN|CORREO|CORREO_MIN|CUI|TELEFONO|NACIONALIDAD|CIUDAD|DIRECCION)(02)?$/.test(tag)) categoria='ESTUDIANTE_NORMALIZADO_DERIVADO';
    else if (tag === 'N° DE TRÁMITE') categoria='EXPEDIENTE_NORMALIZADO';
    return {etiqueta:tag,categoria:categoria};
  });

  var status = faltantesLegacy.length===0 && faltantesFisicos.length===0 && errores.length===0;
  var result = {
    status: status,
    fase: 'BD-09.1',
    version: BD91_CONFIG.version,
    contratoDocumental: {esperadas:54,enFuenteLegacy:54-faltantesLegacy.length,faltantesFuenteLegacy:faltantesLegacy},
    esquemaRelacional: {columnasFisicasDetalle:physicalRequired.length,faltantesFisicos:faltantesFisicos},
    expedientes: expRows,
    clasificacion: contrato,
    compatibilidadPlantillas: status,
    escrituraLegacyHabilitada: true,
    escrituraRelacionalGeneralHabilitada: false,
    datosLegacyModificadosPorDiagnostico: false,
    datosRelacionalesModificadosPorDiagnostico: false,
    errores: errores
  };
  Logger.log(JSON.stringify(result,null,2));
  return result;
}
