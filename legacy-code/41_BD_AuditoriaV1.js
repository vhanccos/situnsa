/**
 * ==============================================================
 * BD-01 - INVENTARIO READ-ONLY DE GOOGLE SHEETS
 * ==============================================================
 * No crea, modifica ni elimina datos. Solo inspecciona estructura.
 * ==============================================================
 */

function BD1_normalizarHeader_(v) {
  return String(v == null ? '' : v).trim();
}

function BD1_tipoMuestra_(valores) {
  const noVacios = valores.filter(v => v !== '' && v !== null && v !== undefined);
  if (!noVacios.length) return 'SIN_DATOS';
  let fechas = 0, numeros = 0, booleanos = 0, textos = 0;
  noVacios.forEach(v => {
    if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) fechas++;
    else if (typeof v === 'boolean') booleanos++;
    else if (typeof v === 'number') numeros++;
    else textos++;
  });
  const total = noVacios.length;
  if (fechas === total) return 'DATE';
  if (booleanos === total) return 'BOOLEAN';
  if (numeros === total) return 'NUMBER';
  if (textos === total) return 'TEXT';
  return 'MIXED';
}

function BD1_analizarHoja_(sheet, origen) {
  const lr = sheet.getLastRow();
  const lc = sheet.getLastColumn();
  const headers = lc > 0 ? sheet.getRange(1,1,1,lc).getDisplayValues()[0].map(BD1_normalizarHeader_) : [];
  const duplicados = headers.filter((h,i,a) => h && a.indexOf(h) !== i);
  const vacios = headers.map((h,i) => h ? null : i + 1).filter(Boolean);
  const sampleRows = Math.min(Math.max(lr - 1, 0), 50);
  const raw = sampleRows && lc ? sheet.getRange(2,1,sampleRows,lc).getValues() : [];
  const tipos = headers.map((h,ci) => ({
    columna: h || ('COL_' + (ci + 1)),
    tipoDetectado: BD1_tipoMuestra_(raw.map(r => r[ci]))
  }));
  const merged = sheet.getDataRange().getMergedRanges().length;
  return {
    origen: origen,
    hoja: sheet.getName(),
    filas: lr,
    registros: Math.max(lr - 1, 0),
    columnas: lc,
    encabezados: headers,
    encabezadosDuplicados: Array.from(new Set(duplicados)),
    columnasSinEncabezado: vacios,
    celdasCombinadas: merged,
    tiposMuestra: tipos,
    aptaComoTabla: duplicados.length === 0 && vacios.length === 0 && merged === 0 && headers.length > 0
  };
}

function BD1_fuentes_() {
  const fuentes = [];
  const push = (id, nombre) => {
    id = String(id || '').trim();
    if (!id) return;
    if (fuentes.some(f => f.id === id)) return;
    fuentes.push({id:id, nombre:nombre});
  };

  if (typeof REPO_EXPEDIENTE_V10_CONFIG !== 'undefined') push(REPO_EXPEDIENTE_V10_CONFIG.spreadsheetId, 'CORE_EXPEDIENTES');
  if (typeof TT_ID_INS !== 'undefined') push(TT_ID_INS, 'TALLER_INSCRIPCIONES');
  if (typeof TT_ID_TALL !== 'undefined') push(TT_ID_TALL, 'TALLER_ADMIN');
  if (typeof TT_ID_ASE !== 'undefined') push(TT_ID_ASE, 'TALLER_ASESORES');
  if (typeof TT_ID_SEG !== 'undefined') push(TT_ID_SEG, 'SEGUIMIENTO_SUBETAPAS');

  return fuentes;
}

function BD1_inventarioActual() {
  const salida = {status:true, fase:'BD-01', soloLectura:true, fuentes:[], hojas:[], errores:[]};
  BD1_fuentes_().forEach(f => {
    try {
      const ss = SpreadsheetApp.openById(f.id);
      salida.fuentes.push({nombre:f.nombre, spreadsheet: ss.getName(), hojas:ss.getSheets().length});
      ss.getSheets().forEach(sh => {
        try { salida.hojas.push(BD1_analizarHoja_(sh, f.nombre)); }
        catch (e) { salida.errores.push({origen:f.nombre, hoja:sh.getName(), error:e.message}); }
      });
    } catch (e) {
      salida.errores.push({origen:f.nombre, error:e.message});
    }
  });
  salida.status = salida.errores.length === 0;
  salida.resumen = {
    fuentes: salida.fuentes.length,
    hojas: salida.hojas.length,
    tablasAptas: salida.hojas.filter(h => h.aptaComoTabla).length,
    tablasPorNormalizar: salida.hojas.filter(h => !h.aptaComoTabla).length
  };
  return salida;
}

function BD1_mapaMigracionPropuesto() {
  return {
    status:true,
    fase:'BD-01',
    actualAObjetivo:{
      'EXPEDIENTES':['expedientes','estudiantes','expediente_estudiantes'],
      'USUARIOS':['usuarios'],
      'INVITADOS':['estudiantes','expediente_estudiantes'],
      'SEGUIMIENTO_ETAPAS':['expediente_etapas','historial'],
      'SEGUIMIENTO_SUBETAPAS':['expediente_subetapas'],
      'ARCHIVOS_SUBETAPAS':['documentos'],
      'CHECKLIST_ETAPA2':['checklist_items','checklist_respuestas'],
      'ASESORES':['asesores'],
      'TALLERES':['talleres'],
      'MATRICULADOS':['taller_matriculas'],
      'SESIONES':['taller_sesiones'],
      'ASISTENCIA':['taller_asistencia'],
      'INSCRIPCIONES':['estudiantes','documentos','taller_matriculas']
    },
    nota:'El mapa es de diseno. BD-01 no mueve datos.'
  };
}

function BD1_diagnostico() {
  const faltantes = [];
  if (typeof BD1_CONFIG === 'undefined') faltantes.push('BD1_CONFIG');
  if (typeof BD1_MODELO_OBJETIVO === 'undefined') faltantes.push('BD1_MODELO_OBJETIVO');
  if (typeof BD1_inventarioActual !== 'function') faltantes.push('BD1_inventarioActual');
  if (typeof REPO_ExpedienteV2 === 'undefined') faltantes.push('REPO_ExpedienteV2');
  return {
    status:faltantes.length===0,
    fase:'BD-01',
    arquitectura:'MVC + SOA + Persistencia Relacional',
    versionApp: typeof APP_ARCH !== 'undefined' ? APP_ARCH.version : '',
    versionDatos: typeof BD1_CONFIG !== 'undefined' ? BD1_CONFIG.version : '',
    modeloObjetivoTablas: typeof BD1_MODELO_OBJETIVO !== 'undefined' ? Object.keys(BD1_MODELO_OBJETIVO).length : 0,
    modificaDatos:false,
    faltantes:faltantes,
    errores:[]
  };
}

function BD1_PROBAR_DIAGNOSTICO() {
  const r = {
    diagnostico: BD1_diagnostico(),
    inventario: BD1_inventarioActual(),
    mapaMigracion: BD1_mapaMigracionPropuesto()
  };
  console.log(JSON.stringify(r, null, 2));
  return r;
}

/**
 * Resumen compacto del inventario para evitar truncamiento del Logger.
 * No modifica datos.
 */
function BD1_resumenInventario() {
  const inv = BD1_inventarioActual();
  const hojas = inv.hojas.map(h => ({
    origen: h.origen,
    hoja: h.hoja,
    registros: h.registros,
    columnas: h.columnas,
    aptaComoTabla: h.aptaComoTabla,
    problemas: {
      encabezadosDuplicados: h.encabezadosDuplicados,
      columnasSinEncabezado: h.columnasSinEncabezado,
      celdasCombinadas: h.celdasCombinadas
    },
    tiposRiesgo: h.tiposMuestra
      .filter(t => ['MIXED','NUMBER','SIN_DATOS'].includes(t.tipoDetectado))
      .map(t => ({columna:t.columna, tipo:t.tipoDetectado}))
  }));

  return {
    status: inv.status,
    fase: 'BD-01',
    soloLectura: true,
    resumen: inv.resumen,
    fuentes: inv.fuentes,
    hojas: hojas,
    errores: inv.errores,
    observacionesClave: [
      'DNI, CUI y telefonos deben normalizarse como TEXT antes de PostgreSQL.',
      'Las columnas MIXED deben tiparse explicitamente en BD-02.',
      'Las hojas con celdas combinadas, encabezados vacios o duplicados requieren normalizacion.',
      'Las hojas auxiliares tipo Hoja 1 deben clasificarse para conservarlas o excluirlas del modelo relacional.'
    ]
  };
}

function BD1_PROBAR_RESUMEN() {
  const r = BD1_resumenInventario();
  console.log(JSON.stringify(r, null, 2));
  return r;
}

