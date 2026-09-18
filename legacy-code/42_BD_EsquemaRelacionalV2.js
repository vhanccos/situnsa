/**
 * ==============================================================
 * BD-02 - ESQUEMA RELACIONAL FISICO SOBRE GOOGLE SHEETS
 * Sistema de Titulacion v2.0.0 MVC + SOA
 * ==============================================================
 * Define cómo materializar BD1_MODELO_OBJETIVO en un Spreadsheet
 * independiente, usado como base relacional transitoria antes de
 * PostgreSQL.
 * ==============================================================
 */

const BD2_CONFIG = Object.freeze({
  version: 'db-2.0-esquema-relacional',
  propertySpreadsheetId: 'BD_RELACIONAL_SPREADSHEET_ID',
  nombreSpreadsheet: 'BD_TITULACION_RELACIONAL_V2',
  prefijoTabla: '',
  modificaDatosLegacy: false
});

const BD2_TIPOS = Object.freeze({
  TEXT: 'TEXT', NUMBER: 'NUMBER', BOOLEAN: 'BOOLEAN', DATE: 'DATE', DATETIME: 'DATETIME'
});

/** Tipos explícitos compatibles con PostgreSQL futuro. */
const BD2_COLUMN_TYPES = Object.freeze({
  DNI: BD2_TIPOS.TEXT,
  CUI: BD2_TIPOS.TEXT,
  TELEFONO: BD2_TIPOS.TEXT,
  USUARIO: BD2_TIPOS.TEXT,
  CORREO: BD2_TIPOS.TEXT,
  CODIGO: BD2_TIPOS.TEXT,
  CODIGO_TRAMITE: BD2_TIPOS.TEXT,
  DRIVE_FILE_ID: BD2_TIPOS.TEXT,
  DRIVE_URL: BD2_TIPOS.TEXT,
  PASSWORD_HASH: BD2_TIPOS.TEXT,
  ORDEN: BD2_TIPOS.NUMBER,
  ORDEN_PARTICIPANTE: BD2_TIPOS.NUMBER,
  NRO_SESIONES: BD2_TIPOS.NUMBER,
  NRO_SESION: BD2_TIPOS.NUMBER,
  VERSION: BD2_TIPOS.NUMBER,
  PORCENTAJE: BD2_TIPOS.NUMBER,
  OBLIGATORIO: BD2_TIPOS.BOOLEAN,
  VALOR: BD2_TIPOS.BOOLEAN,
  FECHA: BD2_TIPOS.DATE,
  FECHA_INICIO: BD2_TIPOS.DATETIME,
  FECHA_FIN: BD2_TIPOS.DATETIME,
  FECHA_CREACION: BD2_TIPOS.DATETIME,
  FECHA_MATRICULA: BD2_TIPOS.DATETIME,
  CREADO_EN: BD2_TIPOS.DATETIME,
  MODIFICADO_EN: BD2_TIPOS.DATETIME,
  REGISTRADO_EN: BD2_TIPOS.DATETIME,
  HORA_INICIO: BD2_TIPOS.TEXT,
  HORA_FIN: BD2_TIPOS.TEXT
});

function BD2_nombreHoja_(tabla) {
  return String(BD2_CONFIG.prefijoTabla || '') + String(tabla || '').toUpperCase();
}

function BD2_tipoColumna_(columna) {
  const c = String(columna || '').toUpperCase();
  if (/^ID_/.test(c)) return BD2_TIPOS.TEXT;
  if (/PASSWORD/.test(c)) return BD2_TIPOS.TEXT;
  if (BD2_COLUMN_TYPES[c]) return BD2_COLUMN_TYPES[c];
  if (/(_EN|FECHA_|^FECHA$)/.test(c)) return BD2_TIPOS.DATETIME;
  if (/^(ORDEN|NRO_|PORCENTAJE|VERSION)/.test(c)) return BD2_TIPOS.NUMBER;
  return BD2_TIPOS.TEXT;
}

function BD2_esquemaFisico() {
  const tablas = {};
  Object.keys(BD1_MODELO_OBJETIVO).forEach(nombre => {
    const def = BD1_MODELO_OBJETIVO[nombre];
    tablas[nombre] = {
      nombreHoja: BD2_nombreHoja_(nombre),
      pk: def.pk || null,
      fk: def.fk || {},
      unique: def.unique || [],
      uniqueCompuesto: def.uniqueCompuesto || [],
      columnas: (def.columnas || []).map(col => ({
        nombre: col,
        tipo: BD2_tipoColumna_(col),
        nullable: col !== def.pk
      }))
    };
  });
  return {
    status: true,
    fase: 'BD-02',
    version: BD2_CONFIG.version,
    nombreSpreadsheet: BD2_CONFIG.nombreSpreadsheet,
    modificaDatosLegacy: false,
    tablas: tablas
  };
}
function guardarMiIdRelacional() {
  PropertiesService.getScriptProperties().setProperty('BD_RELACIONAL_SPREADSHEET_ID', '1jvpGNBTDly02bgayT2SyrgSaLZrZxj3PH3PavGq6po');
  Logger.log("¡ID relacional guardado correctamente!");
}
