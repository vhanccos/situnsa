/**
 * ==============================================================
 * BD-02 - INICIALIZADOR DE LA BASE RELACIONAL EN GOOGLE SHEETS
 * ==============================================================
 * Crea un Spreadsheet NUEVO con las 18 tablas normalizadas.
 * No modifica las 5 fuentes legacy detectadas en BD-01.
 * No migra registros todavía.
 * ==============================================================
 */

function BD2_obtenerId_() {
  return PropertiesService.getScriptProperties().getProperty(BD2_CONFIG.propertySpreadsheetId) || '';
}

function BD2_guardarId_(id) {
  PropertiesService.getScriptProperties().setProperty(BD2_CONFIG.propertySpreadsheetId, String(id || ''));
}

function BD2_abrirBase_() {
  const id = BD2_obtenerId_();
  if (!id) return null;
  try { return SpreadsheetApp.openById(id); } catch (e) { return null; }
}

function BD2_aplicarFormatoColumna_(sheet, colIndex, tipo) {
  const maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  const r = sheet.getRange(2, colIndex, maxRows, 1);
  switch (tipo) {
    case BD2_TIPOS.TEXT:
      r.setNumberFormat('@');
      break;
    case BD2_TIPOS.NUMBER:
      r.setNumberFormat('0.########');
      break;
    case BD2_TIPOS.DATE:
      r.setNumberFormat('yyyy-mm-dd');
      break;
    case BD2_TIPOS.DATETIME:
      r.setNumberFormat('yyyy-mm-dd hh:mm:ss');
      break;
    case BD2_TIPOS.BOOLEAN:
      // Se deja sin checkbox para conservar semántica booleana portable.
      break;
  }
}

function BD2_listaEstadoPorTabla_(sheetName, columnName) {
  const tabla = String(sheetName || '').toUpperCase();
  const columna = String(columnName || '').toUpperCase();
  if (columna === 'ESTADO_REGISTRO') return BD1_ESTADOS.registro;
  if (columna === 'ASISTENCIA') return BD1_ESTADOS.asistencia;
  if (columna !== 'ESTADO') return null;

  // ESTADO es semántico por entidad; no todas las tablas comparten dominio.
  if (tabla === 'DOCUMENTOS') return BD1_ESTADOS.documento;
  if (tabla === 'HISTORIAL') return BD1_ESTADOS.historial;
  return BD1_ESTADOS.proceso;
}

function BD2_aplicarValidacionEstado_(sheet, headers) {
  headers.forEach((h, i) => {
    const lista = BD2_listaEstadoPorTabla_(sheet.getName(), h);
    if (!lista) return;
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(lista, true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, i + 1, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
  });
}

function BD2_configurarTabla_(sheet, def) {
  const headers = def.columnas.map(c => c.nombre);
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  def.columnas.forEach((c, i) => BD2_aplicarFormatoColumna_(sheet, i + 1, c.tipo));
  BD2_aplicarValidacionEstado_(sheet, headers);
  sheet.autoResizeColumns(1, headers.length);
}

function BD2_CREAR_ESQUEMA() {
  const existente = BD2_abrirBase_();
  if (existente) {
    return {
      status: true,
      fase: 'BD-02',
      creado: false,
      mensaje: 'La base relacional ya existe. No se creo una copia adicional.',
      spreadsheetId: existente.getId(),
      spreadsheet: existente.getName(),
      tablas: existente.getSheets().map(s => s.getName())
    };
  }

  const esquema = BD2_esquemaFisico();
  const ss = SpreadsheetApp.create(BD2_CONFIG.nombreSpreadsheet);
  BD2_guardarId_(ss.getId());

  const tablas = Object.keys(esquema.tablas);
  const inicial = ss.getSheets()[0];
  if (tablas.length) inicial.setName(esquema.tablas[tablas[0]].nombreHoja);

  tablas.forEach((nombre, idx) => {
    const def = esquema.tablas[nombre];
    let sh = idx === 0 ? inicial : ss.getSheetByName(def.nombreHoja);
    if (!sh) sh = ss.insertSheet(def.nombreHoja);
    BD2_configurarTabla_(sh, def);
  });

  return {
    status: true,
    fase: 'BD-02',
    creado: true,
    modificaDatosLegacy: false,
    spreadsheetId: ss.getId(),
    spreadsheet: ss.getName(),
    tablasCreadas: tablas.length,
    tablas: tablas.map(t => esquema.tablas[t].nombreHoja)
  };
}

function BD2_PROBAR_DIAGNOSTICO() {
  const ss = BD2_abrirBase_();
  const esquema = BD2_esquemaFisico();
  const resultado = {
    status: true,
    fase: 'BD-02',
    version: BD2_CONFIG.version,
    baseCreada: !!ss,
    spreadsheet: ss ? ss.getName() : null,
    spreadsheetId: ss ? ss.getId() : null,
    tablasEsperadas: Object.keys(esquema.tablas).length,
    tablasEncontradas: 0,
    tablasCorrectas: 0,
    faltantes: [],
    diferencias: [],
    datosLegacyModificados: false
  };

  if (!ss) {
    resultado.status = false;
    resultado.faltantes.push('Ejecutar BD2_CREAR_ESQUEMA()');
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  Object.keys(esquema.tablas).forEach(nombre => {
    const def = esquema.tablas[nombre];
    const sh = ss.getSheetByName(def.nombreHoja);
    if (!sh) {
      resultado.faltantes.push(def.nombreHoja);
      return;
    }
    resultado.tablasEncontradas++;
    const esperados = def.columnas.map(c => c.nombre);
    const encontrados = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), esperados.length)).getDisplayValues()[0]
      .slice(0, esperados.length).map(v => String(v || '').trim());
    const ok = JSON.stringify(esperados) === JSON.stringify(encontrados);
    if (ok) resultado.tablasCorrectas++;
    else resultado.diferencias.push({tabla:def.nombreHoja, esperado:esperados, encontrado:encontrados});
  });

  resultado.status = resultado.faltantes.length === 0 && resultado.diferencias.length === 0;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function BD2_INFO_BASE() {
  const ss = BD2_abrirBase_();
  if (!ss) return {status:false, mensaje:'Base BD-02 aun no creada.'};
  return {
    status:true,
    fase:'BD-02',
    spreadsheetId:ss.getId(),
    spreadsheet:ss.getName(),
    url:ss.getUrl(),
    tablas:ss.getSheets().map(s => ({nombre:s.getName(), registros:Math.max(s.getLastRow()-1,0), columnas:s.getLastColumn()}))
  };
}
