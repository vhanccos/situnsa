/** BD-09.2 - Diagnostico de la vista legacy de 54 columnas. */

function BD92_PROBAR_DIAGNOSTICO() {
  var ss = BD92_abrirBase_();
  var sh = ss.getSheetByName(BD92_CONFIG.sheetName);
  var exps = REPO_RelacionalV5.listar('expedientes') || [];
  var errores = [];
  var advertencias = [];
  var headers = [];
  var filas = 0;

  if (!sh) {
    errores.push('No existe ' + BD92_CONFIG.sheetName + '. Ejecutar BD92_CREAR_ACTUALIZAR_VISTA().');
  } else {
    var lastCol = sh.getLastColumn();
    var lastRow = sh.getLastRow();
    headers = lastCol ? sh.getRange(1,1,1,lastCol).getDisplayValues()[0].map(function(v){return BD92_str_(v);}) : [];
    filas = Math.max(lastRow - 1, 0);

    if (headers.length !== BD91_LEGACY_COLUMNS.length) {
      errores.push('La vista no tiene 54 columnas. Encontradas: ' + headers.length);
    }
    if (JSON.stringify(headers.slice(0,54)) !== JSON.stringify(BD91_LEGACY_COLUMNS)) {
      errores.push('Los encabezados de la vista no coinciden exactamente con el contrato legacy.');
    }
    if (filas !== exps.length) {
      errores.push('Cantidad de filas distinta a EXPEDIENTES relacional: vista=' + filas + ', fuente=' + exps.length);
    }
  }

  var pruebasEtiquetas = [];
  exps.forEach(function(exp){
    var code = BD92_str_(exp.CODIGO_TRAMITE);
    if (!code) return;
    try {
      var tags = BD91_DOCUMENT_TAGS(code);
      var keys = Object.keys(tags);
      var faltantes = BD91_LEGACY_COLUMNS.filter(function(k){ return !(k in tags); });
      pruebasEtiquetas.push({
        expediente: code,
        status: faltantes.length === 0 && keys.length === 54,
        etiquetas: keys.length,
        faltantes: faltantes
      });
      if (faltantes.length || keys.length !== 54) errores.push('Contrato incompleto en ' + code);
    } catch(e) {
      pruebasEtiquetas.push({expediente:code,status:false,error:e.message});
      errores.push('Error reconstruyendo etiquetas de ' + code + ': ' + e.message);
    }
  });

  if (!exps.length) advertencias.push('No existen expedientes relacionales para materializar en la vista.');

  var out = {
    status: errores.length === 0,
    fase: BD92_CONFIG.fase,
    version: BD92_CONFIG.version,
    vista: {
      nombre: BD92_CONFIG.sheetName,
      existe: !!sh,
      columnasEsperadas: 54,
      columnasEncontradas: headers.length,
      filas: filas,
      expedientesFuente: exps.length,
      encabezadosExactos: headers.length >= 54 && JSON.stringify(headers.slice(0,54)) === JSON.stringify(BD91_LEGACY_COLUMNS)
    },
    contratoDocumental: {
      etiquetasEsperadas: 54,
      compatibilidadPlantillas: errores.filter(function(e){ return e.indexOf('Contrato') >= 0 || e.indexOf('etiquetas') >= 0; }).length === 0,
      expedientesProbados: pruebasEtiquetas
    },
    camposClaveVisibles: {
      NOM_MIN: headers.indexOf('NOM_MIN') >= 0,
      PROGR_MIN: headers.indexOf('PROGR_MIN') >= 0,
      CORREO_MIN: headers.indexOf('CORREO_MIN') >= 0,
      NOMBRES02: headers.indexOf('NOMBRES02') >= 0,
      NOM_MIN02: headers.indexOf('NOM_MIN02') >= 0,
      DNI02: headers.indexOf('DNI02') >= 0,
      PROGRAMAS02: headers.indexOf('PROGRAMAS02') >= 0,
      PROGR_MIN02: headers.indexOf('PROGR_MIN02') >= 0,
      CORREO02: headers.indexOf('CORREO02') >= 0,
      CORREO_MIN02: headers.indexOf('CORREO_MIN02') >= 0,
      ASE_MINU: headers.indexOf('ASE_MINU') >= 0
    },
    datosLegacyModificados: false,
    tablasRelacionalesBaseModificadas: false,
    vistaEsDerivada: true,
    errores: errores,
    advertencias: advertencias
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD92_PROBAR_PRIMER_EXPEDIENTE() {
  var exps = REPO_RelacionalV5.listar('expedientes') || [];
  if (!exps.length) throw new Error('No existen expedientes relacionales.');
  var code = BD92_str_(exps[0].CODIGO_TRAMITE);
  var out = BD91_PROBAR_ETIQUETAS(code);
  Logger.log(JSON.stringify(out,null,2));
  return out;
}
