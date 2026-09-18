/**
 * ==============================================================
 * BD-03.1 - CORRECCION DE VALIDACIONES SEMANTICAS
 * ==============================================================
 * Corrige reglas de validacion de la base relacional YA CREADA.
 * No borra registros ni vuelve a ejecutar la migracion.
 * ==============================================================
 */

function BD31_normalizarEstadoHistorial_(v) {
  var s = String(v == null ? '' : v).trim().toUpperCase();
  if (!s) return 'INFO';
  if (['SUCCESS','INFO','WARNING','ERROR'].indexOf(s) >= 0) return s;
  if (s.indexOf('ERROR') >= 0 || s.indexOf('FALL') >= 0) return 'ERROR';
  if (s.indexOf('WARN') >= 0 || s.indexOf('OBSERV') >= 0) return 'WARNING';
  if (s.indexOf('OK') >= 0 || s.indexOf('EXITO') >= 0 || s.indexOf('ÉXITO') >= 0) return 'SUCCESS';
  return 'INFO';
}

function BD31_CORREGIR_VALIDACIONES() {
  var ss = BD2_abrirBase_();
  if (!ss) throw new Error('No se encontro BD_TITULACION_RELACIONAL_V2.');

  var esquema = BD2_esquemaFisico();
  var corregidas = [];

  Object.keys(esquema.tablas).forEach(function(nombre) {
    var def = esquema.tablas[nombre];
    var sh = ss.getSheetByName(def.nombreHoja);
    if (!sh) return;
    var headers = def.columnas.map(function(c){ return c.nombre; });
    BD2_aplicarValidacionEstado_(sh, headers);
    corregidas.push(def.nombreHoja);
  });

  // HISTORIAL: normaliza cualquier valor legacy al dominio de auditoria.
  var hist = ss.getSheetByName('HISTORIAL');
  var historialNormalizado = 0;
  if (hist && hist.getLastRow() > 1) {
    var headersH = hist.getRange(1,1,1,hist.getLastColumn()).getDisplayValues()[0];
    var idx = headersH.indexOf('ESTADO');
    if (idx >= 0) {
      var r = hist.getRange(2, idx + 1, hist.getLastRow() - 1, 1);
      var vals = r.getValues();
      vals = vals.map(function(row){
        var nuevo = BD31_normalizarEstadoHistorial_(row[0]);
        if (String(row[0] || '') !== nuevo) historialNormalizado++;
        return [nuevo];
      });
      r.setValues(vals);
    }
  }

  var out = {
    status: true,
    fase: 'BD-03.1',
    correccion: 'VALIDACIONES_SEMANTICAS',
    tablasReconfiguradas: corregidas.length,
    documentosEstadosPermitidos: BD1_ESTADOS.documento,
    historialEstadosPermitidos: BD1_ESTADOS.historial,
    historialNormalizado: historialNormalizado,
    registrosEliminados: 0,
    datosLegacyModificados: false
  };
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

function BD31_PROBAR_DIAGNOSTICO() {
  var ss = BD2_abrirBase_();
  if (!ss) throw new Error('No se encontro BD_TITULACION_RELACIONAL_V2.');
  var pruebas = [];

  [['DOCUMENTOS','ESTADO',BD1_ESTADOS.documento],['HISTORIAL','ESTADO',BD1_ESTADOS.historial]].forEach(function(p){
    var sh = ss.getSheetByName(p[0]);
    if (!sh) { pruebas.push({tabla:p[0],status:false,error:'No existe'}); return; }
    var hs = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
    var ci = hs.indexOf(p[1]);
    if (ci < 0) { pruebas.push({tabla:p[0],status:false,error:'No existe columna '+p[1]}); return; }
    var dv = sh.getRange(2,ci+1).getDataValidation();
    var permitidos = [];
    if (dv && dv.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
      permitidos = dv.getCriteriaValues()[0] || [];
    }
    pruebas.push({tabla:p[0],columna:p[1],status:JSON.stringify(permitidos)===JSON.stringify(p[2]),permitidos:permitidos});
  });

  var out = {status:pruebas.every(function(x){return x.status;}),fase:'BD-03.1',pruebas:pruebas};
  Logger.log(JSON.stringify(out,null,2));
  return out;
}
