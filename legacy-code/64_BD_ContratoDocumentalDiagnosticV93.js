/** BD-09.3 - Diagnostico de normalizacion documental, solo lectura. */
const BD93_CONFIG = Object.freeze({fase:'BD-09.3', version:'db-9.3-contrato-documental-normalizado'});

function BD93_PROBAR_DIAGNOSTICO() {
  var exps = REPO_RelacionalV5.listar('expedientes') || [];
  var camposFecha = [
    {tag:'FECHA DE EXP', field:'FECHA_EXP'},
    {tag:'FECHA PRESENTACION', field:'FECHA_PRESENTACION'},
    {tag:'FECHA DE APERTURA', field:'FECHA_APERTURA'},
    {tag:'FECHA', field:'FECHA'},
    {tag:'FECHA - ACTAS', field:'FECHA_ACTAS'}
  ];
  var camposHora = [
    {tag:'HORA DE EXP', field:'HORA_EXP'},
    {tag:'HORAS - ACTAS', field:'HORAS_ACTAS'}
  ];
  var anomalias = [], pruebas = [], errores = [];

  exps.forEach(function(exp){
    var code = BD91_tagStr_(exp.CODIGO_TRAMITE);
    if (!code) return;
    try {
      var tags = BD91_DOCUMENT_TAGS(code);
      var faltantes = BD91_LEGACY_COLUMNS.filter(function(k){return !(k in tags);});
      camposFecha.forEach(function(c){
        var raw = exp[c.field];
        if (raw !== '' && raw !== null && raw !== undefined && !BD93_parseDate_(raw)) {
          anomalias.push({expediente:code, tipo:'FECHA_INVALIDA', etiqueta:c.tag, campo:c.field, valor:BD91_tagStr_(raw)});
        }
      });
      camposHora.forEach(function(c){
        var raw = exp[c.field];
        if (raw !== '' && raw !== null && raw !== undefined && !BD93_parseTime_(raw)) {
          anomalias.push({expediente:code, tipo:'HORA_INVALIDA', etiqueta:c.tag, campo:c.field, valor:BD91_tagStr_(raw)});
        }
      });
      pruebas.push({
        expediente:code,
        status:faltantes.length===0 && Object.keys(tags).length===54,
        etiquetas:Object.keys(tags).length,
        faltantes:faltantes,
        muestraFormato:{
          'FECHA DE EXP':tags['FECHA DE EXP'],
          'HORA DE EXP':tags['HORA DE EXP'],
          'FECHA PRESENTACION':tags['FECHA PRESENTACION'],
          'FECHA DE APERTURA':tags['FECHA DE APERTURA'],
          'FECHA':tags['FECHA'],
          'FECHA - ACTAS':tags['FECHA - ACTAS'],
          'HORAS - ACTAS':tags['HORAS - ACTAS']
        }
      });
    } catch(e) {
      errores.push({expediente:code,error:e.message});
    }
  });

  var out = {
    status: errores.length===0 && pruebas.every(function(p){return p.status;}),
    fase:BD93_CONFIG.fase,
    version:BD93_CONFIG.version,
    contratoDocumental:{etiquetasEsperadas:54, expedientesProbados:pruebas.length, compatibilidadPlantillas:errores.length===0 && pruebas.every(function(p){return p.status;})},
    formato:{fecha:'dd/MM/yyyy',hora:'HH:mm',timezone:BD93_timezone_()},
    pruebas:pruebas,
    anomalias:anomalias,
    anomaliasTotal:anomalias.length,
    modificaLegacy:false,
    modificaTablasRelacionales:false,
    errores:errores,
    advertencias:anomalias.length ? ['Se detectaron valores no compatibles con fecha/hora. No fueron modificados automaticamente.'] : []
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD93_PROBAR_PRIMER_EXPEDIENTE() {
  var exps = REPO_RelacionalV5.listar('expedientes') || [];
  if (!exps.length) throw new Error('No existen expedientes relacionales.');
  return BD91_PROBAR_ETIQUETAS(BD91_tagStr_(exps[0].CODIGO_TRAMITE));
}
