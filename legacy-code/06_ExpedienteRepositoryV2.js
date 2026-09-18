/**
 * ==============================================================
 * REPOSITORY V2 - EXPEDIENTES (REFACTORIZADO EN FASE 10)
 * ==============================================================
 * Persistencia directa de EXPEDIENTES.
 *
 * FASE 10:
 * - Ya NO depende de obtenerSheetExpedientes(), obtenerColumnas(),
 *   validarColumnasExpedientes() ni colocarValorFila() de Expedientes.gs.
 * - Expedientes.gs queda como adaptador de compatibilidad.
 * ==============================================================
 */

const REPO_EXPEDIENTE_V10_CONFIG = Object.freeze({
  spreadsheetId: '1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs',
  sheetName: 'COMPAT_EXPEDIENTES',
  columnasObligatorias: Object.freeze([
    'N° DE TRÁMITE','GRUPO','FECHA DE EXP','HORA DE EXP','ADMIN','CORREO_ADMIN',
    'NOMBRES','NOM_MIN','DNI','PROGRAMAS','PROGR_MIN','CORREO','CORREO_MIN',
    'CUI','TELEFONO','NACIONALIDAD','CIUDAD','DIRECCION','TESIS',
    'NOMBRES02','NOM_MIN02','DNI02','PROGRAMAS02','PROGR_MIN02','CORREO02',
    'CORREO_MIN02','CUI02','TELEFONO02','NACIONALIDAD02','CIUDAD02',
    'DIRECCION02','TESIS02','MODALIDAD02'
  ])
});

const REPO_ExpedienteV2 = Object.freeze({
  arquitectura() {
    return {
      fase: 10,
      modulo: 'Expedientes',
      accesoDirectoSheets: true,
      legacyPrincipal: false,
      dependenciasLegacyExpedientesGs: []
    };
  },

  sheet() {
    const ss = SpreadsheetApp.openById(REPO_EXPEDIENTE_V10_CONFIG.spreadsheetId);
    const sheet = ss.getSheetByName(REPO_EXPEDIENTE_V10_CONFIG.sheetName) || ss.getSheets()[0];
    if (!sheet) throw new Error('No se encontró la hoja EXPEDIENTES.');
    return sheet;
  },

  normalizarEncabezado(valor) {
    return valor == null ? '' : String(valor).trim();
  },

  mapearColumnas(sheet) {
    sheet = sheet || this.sheet();
    const ultimaColumna = sheet.getLastColumn();
    if (ultimaColumna < 1) throw new Error('La hoja EXPEDIENTES no contiene encabezados.');

    const headers = sheet.getRange(1, 1, 1, ultimaColumna).getValues()[0];
    const columnas = {};
    headers.forEach((header, index) => {
      const nombre = this.normalizarEncabezado(header);
      if (nombre) columnas[nombre] = index + 1;
    });
    return columnas;
  },

  validarColumnas(columnas) {
    columnas = columnas || {};
    const faltantes = REPO_EXPEDIENTE_V10_CONFIG.columnasObligatorias.filter(nombre => !columnas[nombre]);
    if (faltantes.length) {
      throw new Error('Faltan columnas en EXPEDIENTES: ' + faltantes.join(', '));
    }
    return true;
  },

  columnas() {
    const sheet = this.sheet();
    const columnas = this.mapearColumnas(sheet);
    this.validarColumnas(columnas);
    return { sheet: sheet, columnas: columnas };
  },

  colocarValorFila(fila, columnas, nombreColumna, valor) {
    const columna = columnas[nombreColumna];
    if (!columna) return fila;
    fila[columna - 1] = valor === undefined || valor === null ? '' : valor;
    return fila;
  },

  dnisRegistrados() {
    const sheet = this.sheet();
    const columnas = this.mapearColumnas(sheet);
    const ultimaFila = sheet.getLastRow();
    const registrados = {};
    if (ultimaFila <= 1) return registrados;

    ['DNI','DNI02'].forEach(nombre => {
      const col = columnas[nombre];
      if (!col) return;
      sheet.getRange(2, col, ultimaFila - 1, 1).getDisplayValues().flat().forEach(valor => {
        const dni = String(valor || '').trim();
        if (dni) registrados[dni] = true;
      });
    });
    return registrados;
  },

  existeDni(dni) {
    dni = String(dni || '').trim();
    if (!dni) return false;
    return Boolean(this.dnisRegistrados()[dni]);
  },

  siguienteCodigo() {
    const sheet = this.sheet();
    const columnas = this.mapearColumnas(sheet);
    const col = columnas['N° DE TRÁMITE'];
    if (!col) throw new Error('No existe la columna N° DE TRÁMITE.');

    const ultimaFila = sheet.getLastRow();
    if (ultimaFila <= 1) return 'SET001';

    const numeros = sheet.getRange(2, col, ultimaFila - 1, 1).getDisplayValues().flat()
      .map(v => String(v || '').trim())
      .filter(Boolean)
      .map(codigo => {
        const m = codigo.match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      });

    const mayor = numeros.length ? Math.max.apply(null, numeros) : 0;
    return 'SET' + String(mayor + 1).padStart(3, '0');
  },

  insertar(solicitud, codigo) {
    const acceso = this.columnas();
    const sheet = acceso.sheet;
    const columnas = acceso.columnas;
    const ahora = new Date();
    const zona = Session.getScriptTimeZone() || 'America/Lima';
    const fecha = Utilities.formatDate(ahora, zona, 'dd/MM/yyyy');
    const hora = Utilities.formatDate(ahora, zona, 'HH:mm:ss');
    const p1 = solicitud.participantes[0];
    const p2 = solicitud.grupo === 2 ? solicitud.participantes[1] : null;
    const fila = new Array(sheet.getLastColumn()).fill('');

    const set = (nombre, valor) => this.colocarValorFila(fila, columnas, nombre, valor);
    set('N° DE TRÁMITE', codigo); set('GRUPO', solicitud.grupo);
    set('FECHA DE EXP', fecha); set('HORA DE EXP', hora);
    set('ADMIN', solicitud.admin); set('CORREO_ADMIN', solicitud.correo_admin);

    set('NOMBRES', p1.nombre.toUpperCase()); set('NOM_MIN', DOMAIN_Expediente.titulo(p1.nombre));
    set('DNI', p1.dni); set('PROGRAMAS', p1.programa.toUpperCase());
    set('PROGR_MIN', DOMAIN_Expediente.programa(p1.programa));
    set('CORREO', p1.correo.toUpperCase()); set('CORREO_MIN', p1.correo.toLowerCase());
    set('CUI', p1.cui); set('TELEFONO', p1.telefono); set('NACIONALIDAD', p1.nacionalidad);
    set('CIUDAD', p1.ciudad); set('DIRECCION', p1.direccion); set('TESIS', solicitud.tesis);

    if (p2) {
      set('NOMBRES02', p2.nombre.toUpperCase()); set('NOM_MIN02', DOMAIN_Expediente.titulo(p2.nombre));
      set('DNI02', p2.dni); set('PROGRAMAS02', p2.programa.toUpperCase());
      set('PROGR_MIN02', DOMAIN_Expediente.programa(p2.programa));
      set('CORREO02', p2.correo.toUpperCase()); set('CORREO_MIN02', p2.correo.toLowerCase());
      set('CUI02', p2.cui); set('TELEFONO02', p2.telefono); set('NACIONALIDAD02', p2.nacionalidad);
      set('CIUDAD02', p2.ciudad); set('DIRECCION02', p2.direccion); set('TESIS02', solicitud.tesis);
    }

    sheet.appendRow(fila);
    SpreadsheetApp.flush();
    return { codigo: codigo, fecha: fecha, hora: hora };
  },

  verificarAcceso() {
    const sheet = this.sheet();
    const columnas = this.mapearColumnas(sheet);
    this.validarColumnas(columnas);
    return {
      status: true,
      hoja: sheet.getName(),
      filas: sheet.getLastRow(),
      columnas: Object.keys(columnas).length,
      codigoSiguiente: this.siguienteCodigo()
    };
  }
});
