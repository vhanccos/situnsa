/**
 * ==============================================================
 * REPOSITORIES V3 - ADMINISTRACION + SEGUIMIENTO
 * REFACTORIZADO EN FASE 11
 * ==============================================================
 * - Administración usa REPO_ExpedienteV2 directamente.
 * - Seguimiento legacy accede directo a su hoja SEGUIMIENTO.
 * - Lectura de SEGUIMIENTO_SUBETAPAS ya no depende de helpers
 *   globales de SeguimientoSubetapas.gs.
 * ==============================================================
 */

const REPO_ADMIN_SEGUIMIENTO_V11_CONFIG = Object.freeze({
  seguimientoLegacySpreadsheetId: '1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs',
  seguimientoLegacySheetName: 'COMPAT_SEGUIMIENTO',
  subetapasSpreadsheetId: '1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs',
  subetapasSheetName: 'COMPAT_SEGUIMIENTO_SUBETAPAS',
  usuariosSpreadsheetId: '1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs',
  usuariosSheetName: 'COMPAT_USUARIOS'
});

function REPO11_mapearColumnas_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]
    .map(v => String(v || '').trim());
  const columnas = {};
  headers.forEach((h, i) => { if (h) columnas[h] = i + 1; });
  return { headers, columnas };
}

function REPO11_formatearFecha_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone() || 'America/Lima', 'dd/MM/yyyy HH:mm');
  }
  return String(valor);
}

const REPO_AdministracionV3 = Object.freeze({
  arquitectura() {
    return { fase: 11, modulo: 'Administracion', accesoExpedientes: 'REPO_ExpedienteV2', legacyExpedientesGs: false };
  },

  sheetExpedientes() { return REPO_ExpedienteV2.sheet(); },

  contextoExpedientes() {
    const sheet = this.sheetExpedientes();
    const mapa = REPO11_mapearColumnas_(sheet);
    return { sheet, headers: mapa.headers, columnas: mapa.columnas };
  },

  normalizar(texto) {
    return String(texto || '').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').trim();
  },

  buscarFila(identificador) {
    const ctx = this.contextoExpedientes();
    const data = ctx.sheet.getDataRange().getDisplayValues();
    const buscado = String(identificador || '').trim().toUpperCase();
    const indices = ['DNI', 'DNI02', 'N° DE TRÁMITE'].map(n => ctx.headers.indexOf(n));
    for (let i = 1; i < data.length; i++) {
      for (let j = 0; j < indices.length; j++) {
        const c = indices[j];
        if (c >= 0 && String(data[i][c] || '').trim().toUpperCase() === buscado) {
          return { fila: i + 1, indice: i, valores: data[i], headers: ctx.headers, columnas: ctx.columnas, sheet: ctx.sheet };
        }
      }
    }
    return null;
  },

  buscarPersonas(texto, limite) {
    const consulta = this.normalizar(texto);
    if (consulta.length < 2) return [];
    const max = Number(limite || 30);
    const ctx = this.contextoExpedientes();
    const data = ctx.sheet.getDataRange().getDisplayValues();
    const c = ctx.columnas;
    const out = [];

    for (let i = 1; i < data.length && out.length < max; i++) {
      const expediente = c['N° DE TRÁMITE'] ? String(data[i][c['N° DE TRÁMITE'] - 1] || '').trim().toUpperCase() : '';
      if (!expediente) continue;
      const grupo = c['GRUPO'] ? Number(data[i][c['GRUPO'] - 1] || 1) : 1;
      const p1 = { numero: 1, nombre: c['NOMBRES'] ? data[i][c['NOMBRES'] - 1] : '', dni: c['DNI'] ? data[i][c['DNI'] - 1] : '' };
      const p2 = { numero: 2, nombre: c['NOMBRES02'] ? data[i][c['NOMBRES02'] - 1] : '', dni: c['DNI02'] ? data[i][c['DNI02'] - 1] : '' };
      [p1, p2].forEach(p => {
        if (out.length >= max) return;
        const nombre = String(p.nombre || '').trim();
        const dni = String(p.dni || '').trim();
        if (!nombre || !dni) return;
        const coincide = this.normalizar(nombre).indexOf(consulta) !== -1 || dni.indexOf(consulta) !== -1 || this.normalizar(expediente).indexOf(consulta) !== -1;
        if (coincide) out.push({ nombre, dni, expediente, participante: p.numero, grupo });
      });
    }
    return out;
  },

  buscarAdmin(texto, limite) {
    const consulta = this.normalizar(texto);
    if (consulta.length < 2) return [];
    const max = Number(limite || 20);
    const ctx = this.contextoExpedientes();
    const data = ctx.sheet.getDataRange().getDisplayValues();
    const c = ctx.columnas;
    const out = [];
    for (let i = 1; i < data.length && out.length < max; i++) {
      const expediente = c['N° DE TRÁMITE'] ? String(data[i][c['N° DE TRÁMITE'] - 1] || '').trim().toUpperCase() : '';
      if (!expediente) continue;
      const nombre1 = c['NOMBRES'] ? String(data[i][c['NOMBRES'] - 1] || '').trim() : '';
      const nombre2 = c['NOMBRES02'] ? String(data[i][c['NOMBRES02'] - 1] || '').trim() : '';
      const dni01 = c['DNI'] ? String(data[i][c['DNI'] - 1] || '').trim() : '';
      const dni02 = c['DNI02'] ? String(data[i][c['DNI02'] - 1] || '').trim() : '';
      const grupo = c['GRUPO'] ? Number(data[i][c['GRUPO'] - 1] || 1) : (nombre2 ? 2 : 1);
      const c1 = this.normalizar(nombre1).indexOf(consulta) !== -1;
      const c2 = this.normalizar(nombre2).indexOf(consulta) !== -1;
      if (!c1 && !c2) continue;
      out.push({
        expediente, grupo,
        nombres: grupo === 2 ? [nombre1,nombre2].filter(Boolean).join(' / ') : (c2 && !c1 ? nombre2 : nombre1),
        nombre: c2 && !c1 ? nombre2 : nombre1,
        dni: c2 && !c1 ? dni02 : dni01,
        dni01, dni02
      });
    }
    return out;
  },

  buscarExpedientes(texto, limite) {
    const consulta = String(texto || '').trim().toUpperCase();
    if (consulta.length < 3) return [];
    const ctx = this.contextoExpedientes();
    const data = ctx.sheet.getDataRange().getDisplayValues();
    const c = ctx.columnas;
    const out = [];
    for (let i = 1; i < data.length && out.length < Number(limite || 20); i++) {
      const expediente = c['N° DE TRÁMITE'] ? String(data[i][c['N° DE TRÁMITE'] - 1] || '').trim().toUpperCase() : '';
      if (!expediente || expediente.indexOf(consulta) === -1) continue;
      const nombre1 = c['NOMBRES'] ? String(data[i][c['NOMBRES'] - 1] || '').trim() : '';
      const nombre2 = c['NOMBRES02'] ? String(data[i][c['NOMBRES02'] - 1] || '').trim() : '';
      out.push({
        expediente,
        grupo: c['GRUPO'] ? Number(data[i][c['GRUPO'] - 1] || 1) : (nombre2 ? 2 : 1),
        nombres: [nombre1, nombre2].filter(Boolean).join(' / '),
        dni: c['DNI'] ? String(data[i][c['DNI'] - 1] || '').trim() : '',
        dni02: c['DNI02'] ? String(data[i][c['DNI02'] - 1] || '').trim() : ''
      });
    }
    return out;
  },

  obtenerDatos(identificador) {
    const found = this.buscarFila(identificador);
    if (!found) return null;
    const valor = nombre => {
      const i = found.headers.indexOf(nombre);
      return i < 0 ? '' : found.valores[i];
    };
    return {
      expediente: valor('N° DE TRÁMITE'), grupo: Number(valor('GRUPO') || 1),
      dni: valor('DNI'), nombres: valor('NOMBRES'), programas: valor('PROGRAMAS'), tesis: valor('TESIS'),
      modalidad: valor('MODALIDAD'), correo: valor('CORREO'), cui: valor('CUI'), nacionalidad: valor('NACIONALIDAD'),
      ciudad: valor('CIUDAD'), telefono: valor('TELEFONO'), direccion: valor('DIRECCION'),
      dni02: valor('DNI02'), nombres02: valor('NOMBRES02'), programas02: valor('PROGRAMAS02'), tesis02: valor('TESIS02'),
      modalidad02: valor('MODALIDAD02'), correo02: valor('CORREO02'), cui02: valor('CUI02'), nacionalidad02: valor('NACIONALIDAD02'),
      ciudad02: valor('CIUDAD02'), telefono02: valor('TELEFONO02'), direccion02: valor('DIRECCION02'),
      decreto: valor('DECRETO'), recomendacion: valor('RECOMENDACION'), presidente: valor('PRESIDENTE'), asesor: valor('ASESOR'),
      secretario: valor('SECRETARIO'), coasesor: valor('CO ASESOR'), fechaApertura: valor('FECHA DE APERTURA'),
      fechaPresentacion: valor('FECHA PRESENTACION'), oficio: valor('OFICIO'), integrante: valor('INTEGRANTE'),
      presidenteEtapa02: valor('PRESIDENTE02'), secretarioEtapa02: valor('SECRETARIO02'), suplenteEtapa02: valor('SUPLENTE02'),
      decanal: valor('DECANAL'), fechaActa: valor('FECHA - ACTAS'), horaActa: valor('HORAS - ACTAS'),
      lugarSustentacion: valor('LUGAR DE SUSTENTACION'), modalidadFinal: valor('MODALIDAD FINAL')
    };
  },

  actualizar(datos) {
    const expediente = String((datos && datos.expediente) || '').trim().toUpperCase();
    if (!expediente) throw new Error('No se recibió el expediente.');
    const found = this.buscarFila(expediente);
    if (!found) throw new Error('No se encontró el expediente ' + expediente + '.');

    const mapa = {
      grupo:'GRUPO', dni:'DNI', nombres:'NOMBRES', programas:'PROGRAMAS', tesis:'TESIS', modalidad:'MODALIDAD',
      correo:'CORREO', cui:'CUI', nacionalidad:'NACIONALIDAD', ciudad:'CIUDAD', telefono:'TELEFONO', direccion:'DIRECCION',
      dni02:'DNI02', nombres02:'NOMBRES02', programas02:'PROGRAMAS02', tesis02:'TESIS02', modalidad02:'MODALIDAD02',
      correo02:'CORREO02', cui02:'CUI02', nacionalidad02:'NACIONALIDAD02', ciudad02:'CIUDAD02', telefono02:'TELEFONO02', direccion02:'DIRECCION02',
      decreto:'DECRETO', recomendacion:'RECOMENDACION', presidente:'PRESIDENTE', asesor:'ASESOR', secretario:'SECRETARIO', coasesor:'CO ASESOR',
      fechaApertura:'FECHA DE APERTURA', fechaPresentacion:'FECHA PRESENTACION', oficio:'OFICIO', integrante:'INTEGRANTE',
      presidenteEtapa02:'PRESIDENTE02', secretarioEtapa02:'SECRETARIO02', suplenteEtapa02:'SUPLENTE02', decanal:'DECANAL',
      fechaActa:'FECHA - ACTAS', horaActa:'HORAS - ACTAS', lugarSustentacion:'LUGAR DE SUSTENTACION', modalidadFinal:'MODALIDAD FINAL'
    };
    const fila = found.sheet.getRange(found.fila, 1, 1, found.sheet.getLastColumn()).getValues()[0];
    Object.keys(mapa).forEach(prop => {
      if (!Object.prototype.hasOwnProperty.call(datos, prop)) return;
      const idx = found.headers.indexOf(mapa[prop]);
      if (idx >= 0) fila[idx] = datos[prop] == null ? '' : datos[prop];
    });
    found.sheet.getRange(found.fila, 1, 1, found.sheet.getLastColumn()).setValues([fila]);
    SpreadsheetApp.flush();
    return { expediente };
  }
});

const REPO_SeguimientoV3 = Object.freeze({
  arquitectura() {
    return { fase: 11, modulo: 'Seguimiento', accesoDirectoSheets: true, helpersLegacyLectura: false };
  },

  sheetLegacy() {
    const ss = SpreadsheetApp.openById(REPO_ADMIN_SEGUIMIENTO_V11_CONFIG.seguimientoLegacySpreadsheetId);
    const sheet = ss.getSheetByName(REPO_ADMIN_SEGUIMIENTO_V11_CONFIG.seguimientoLegacySheetName);
    if (!sheet) throw new Error('No existe la hoja SEGUIMIENTO.');
    return sheet;
  },

  columnasLegacy() {
    const sheet = this.sheetLegacy();
    const mapa = REPO11_mapearColumnas_(sheet);
    return { sheet, columnas: mapa.columnas };
  },

  obtenerLegacy(dni) {
    const buscado = String(dni || '').trim();
    if (!buscado) return {};
    const ctx = this.columnasLegacy();
    const data = ctx.sheet.getDataRange().getValues();
    const colDni = ctx.columnas['DNI'] || 1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colDni - 1] || '').trim() !== buscado) continue;
      const r = {};
      Object.keys(ctx.columnas).forEach(k => r[k] = data[i][ctx.columnas[k] - 1]);
      return r;
    }
    return {};
  },

  guardarLegacy(datos) {
    datos = datos || {};
    const dni = String(datos.dni || '').trim();
    if (!dni) throw new Error('No se recibió el DNI.');
    const ctx = this.columnasLegacy();
    const data = ctx.sheet.getDataRange().getValues();
    const colDni = ctx.columnas['DNI'] || 1;
    let fila = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colDni - 1] || '').trim() === dni) { fila = i + 1; break; }
    }
    if (fila === -1) {
      fila = ctx.sheet.getLastRow() + 1;
      ctx.sheet.getRange(fila, colDni).setValue(dni);
      if (ctx.columnas['NOMBRES']) ctx.sheet.getRange(fila, ctx.columnas['NOMBRES']).setValue(datos.nombre || '');
    }
    const checks = datos.checks && typeof datos.checks === 'object' ? datos.checks : {};
    Object.keys(checks).forEach(k => {
      if (ctx.columnas[k]) ctx.sheet.getRange(fila, ctx.columnas[k]).setValue(checks[k]);
    });
    SpreadsheetApp.flush();
    return { dni, fila };
  },

  sheetSubetapas() {
    const ss = SpreadsheetApp.openById(REPO_ADMIN_SEGUIMIENTO_V11_CONFIG.subetapasSpreadsheetId);
    const sheet = ss.getSheetByName(REPO_ADMIN_SEGUIMIENTO_V11_CONFIG.subetapasSheetName);
    if (!sheet) throw new Error('No existe la hoja SEGUIMIENTO_SUBETAPAS.');
    return sheet;
  },

  contextoSubetapas() {
    const sheet = this.sheetSubetapas();
    const mapa = REPO11_mapearColumnas_(sheet);
    const obligatorias = ['ID','EXPEDIENTE','ETAPA','NOMBRE_ETAPA','SUBETAPA','DESCRIPCION','PLAZO','ESTADO','FECHA_INICIO','USUARIO_INICIO','CORREO_RESPONSABLE','FECHA_FIN','USUARIO_FIN','DELEGADO_POR','FECHA_DELEGACION','ARCHIVO_OFICIAL_ID','ARCHIVO_OFICIAL_NOMBRE','ARCHIVO_OFICIAL_URL','VERSION_ARCHIVO','PERMITE_NUEVA_CARGA','ULTIMA_ACTUALIZACION'];
    const faltantes = obligatorias.filter(n => !mapa.columnas[n]);
    if (faltantes.length) throw new Error('Faltan columnas en SEGUIMIENTO_SUBETAPAS: ' + faltantes.join(', '));
    return { sheet, columnas: mapa.columnas };
  },

  resolverExpediente(referencia) {
    const ref = String(referencia || '').trim();
    if (!ref) return '';
    if (/^SET\d+/i.test(ref)) return ref.toUpperCase();
    const found = REPO_AdministracionV3.buscarFila(ref);
    if (!found) return '';
    const idx = found.headers.indexOf('N° DE TRÁMITE');
    return idx < 0 ? '' : String(found.valores[idx] || '').trim().toUpperCase();
  },

  construirObjeto(fila, col) {
    const v = n => fila[col[n] - 1];
    return {
      id: v('ID') || '', expediente: v('EXPEDIENTE') || '', etapa: Number(v('ETAPA')),
      nombreEtapa: v('NOMBRE_ETAPA') || '', subetapa: Number(v('SUBETAPA')),
      descripcion: v('DESCRIPCION') || '', plazo: v('PLAZO') || '', estado: v('ESTADO') || 'NO INICIADO',
      fechaInicio: REPO11_formatearFecha_(v('FECHA_INICIO')), usuarioInicio: v('USUARIO_INICIO') || '',
      responsable: v('CORREO_RESPONSABLE') || '', fechaFin: REPO11_formatearFecha_(v('FECHA_FIN')),
      usuarioFin: v('USUARIO_FIN') || '', delegadoPor: v('DELEGADO_POR') || '',
      fechaDelegacion: REPO11_formatearFecha_(v('FECHA_DELEGACION')),
      archivoId: v('ARCHIVO_OFICIAL_ID') || '', archivoNombre: v('ARCHIVO_OFICIAL_NOMBRE') || '',
      archivoUrl: v('ARCHIVO_OFICIAL_URL') || '', versionArchivo: Number(v('VERSION_ARCHIVO') || 0),
      permiteNuevaCarga: String(v('PERMITE_NUEVA_CARGA') || 'NO').toUpperCase(),
      ultimaActualizacion: REPO11_formatearFecha_(v('ULTIMA_ACTUALIZACION'))
    };
  },

  procesoPorExpediente(referencia) {
    const expediente = this.resolverExpediente(referencia);
    const resultado = { etapa1:[], etapa2:[], etapa3:[], etapa4:[], etapa5:[], etapa6:[], etapa7:[] };
    if (!expediente) return resultado;
    const ctx = this.contextoSubetapas();
    const data = ctx.sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const exp = String(data[i][ctx.columnas['EXPEDIENTE'] - 1] || '').trim().toUpperCase();
      if (exp !== expediente) continue;
      const etapa = Number(data[i][ctx.columnas['ETAPA'] - 1]);
      if (etapa < 1 || etapa > 7) continue;
      resultado['etapa' + etapa].push(this.construirObjeto(data[i], ctx.columnas));
    }
    Object.keys(resultado).forEach(k => resultado[k].sort((a,b) => Number(a.subetapa) - Number(b.subetapa)));
    return resultado;
  },

  procesoPorDni(dni) {
    const expediente = this.resolverExpediente(dni);
    if (!expediente) return [];
    const completo = this.procesoPorExpediente(expediente);
    const out = [];
    for (let etapa = 1; etapa <= 7; etapa++) {
      const procesos = completo['etapa' + etapa] || [];
      if (!procesos.length) continue;
      const total = procesos.length;
      const finalizadas = procesos.filter(p => String(p.estado || '').toUpperCase() === 'FINALIZADO').length;
      const enCurso = procesos.some(p => String(p.estado || '').toUpperCase() === 'EN CURSO');
      let estado = 'NO INICIADO';
      if (enCurso || finalizadas > 0) estado = 'EN CURSO';
      if (total && finalizadas === total) estado = 'FINALIZADO';
      out.push({ etapa, nombre: procesos[0].nombreEtapa || '', estado, porcentaje: total ? Math.round(finalizadas * 100 / total) : 0, procesos });
    }
    return out;
  },

  buscar(texto, limite) { return REPO_AdministracionV3.buscarPersonas(texto, limite || 30); }
});

const REPO_UsuariosV3 = Object.freeze({
  listarDelegables(correoActual) {
    const actual = String(correoActual || '').trim().toLowerCase();
    const ss = SpreadsheetApp.openById(REPO_ADMIN_SEGUIMIENTO_V11_CONFIG.usuariosSpreadsheetId);
    const sheet = ss.getSheetByName(REPO_ADMIN_SEGUIMIENTO_V11_CONFIG.usuariosSheetName);
    if (!sheet) throw new Error('No existe la hoja USUARIOS.');
    const data = sheet.getDataRange().getDisplayValues();
    const usuarios = [];
    for (let i = 1; i < data.length; i++) {
      const usuario = String(data[i][1] || '').trim();
      const nombre = String(data[i][3] || '').trim();
      const rol = String(data[i][4] || '').trim().toLowerCase();
      const correo = String(data[i][5] || '').trim().toLowerCase();
      if (!correo || correo === actual || rol === 'invitado') continue;
      usuarios.push({ usuario, nombre: nombre || usuario || correo, correo, rol });
    }
    usuarios.sort((a,b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity:'base' }));
    return usuarios;
  }
});
