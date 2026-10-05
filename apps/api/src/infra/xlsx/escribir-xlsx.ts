/**
 * Escritor XLSX mínimo (Office Open XML, una hoja) sin dependencias: ZIP sin
 * compresión ("stored") + CRC-32. Suficiente para listados tabulares que se
 * abren en Excel o LibreOffice (RN-07.1): título combinado, encabezado fijo,
 * bordes, ajuste de texto y página A4 horizontal.
 */

export interface HojaXlsx {
  /** Nombre de la pestaña (máx. 31 caracteres, sin []:*?/\). */
  readonly nombre: string;
  /** Filas de título sobre la tabla (en negrita, combinadas a lo ancho). */
  readonly titulo?: readonly string[];
  readonly encabezados: readonly string[];
  readonly filas: ReadonlyArray<ReadonlyArray<string | number>>;
  /** Ancho de cada columna en caracteres. */
  readonly anchos?: readonly number[];
}

// ---------- ZIP "stored" ----------

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of datos) c = (TABLA_CRC[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface EntradaZip {
  readonly nombre: string;
  readonly datos: Uint8Array;
}

/** Fecha y hora en formato DOS (las que muestran los descompresores). */
function fechaDos(f: Date): { hora: number; fecha: number } {
  return {
    hora: (f.getHours() << 11) | (f.getMinutes() << 5) | Math.floor(f.getSeconds() / 2),
    fecha:
      ((Math.max(f.getFullYear(), 1980) - 1980) << 9) | ((f.getMonth() + 1) << 5) | f.getDate(),
  };
}

export function zipAlmacenado(entradas: readonly EntradaZip[], fecha: Date): Uint8Array {
  const enc = new TextEncoder();
  const { hora, fecha: dia } = fechaDos(fecha);
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let desplazamiento = 0;
  for (const e of entradas) {
    const nombre = enc.encode(e.nombre);
    const crc = crc32(e.datos);
    const local = new Uint8Array(30 + nombre.length);
    const l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true);
    l.setUint16(4, 20, true); // versión mínima
    l.setUint16(6, 0x0800, true); // nombres UTF-8
    l.setUint16(8, 0, true); // sin compresión
    l.setUint16(10, hora, true);
    l.setUint16(12, dia, true);
    l.setUint32(14, crc, true);
    l.setUint32(18, e.datos.length, true);
    l.setUint32(22, e.datos.length, true);
    l.setUint16(26, nombre.length, true);
    l.setUint16(28, 0, true);
    local.set(nombre, 30);

    const central = new Uint8Array(46 + nombre.length);
    const c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, hora, true);
    c.setUint16(14, dia, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, e.datos.length, true);
    c.setUint32(24, e.datos.length, true);
    c.setUint16(28, nombre.length, true);
    c.setUint32(42, desplazamiento, true);
    central.set(nombre, 46);

    locales.push(local, e.datos);
    centrales.push(central);
    desplazamiento += local.length + e.datos.length;
  }
  const tamCentral = centrales.reduce((n, x) => n + x.length, 0);
  const fin = new Uint8Array(22);
  const f = new DataView(fin.buffer);
  f.setUint32(0, 0x06054b50, true);
  f.setUint16(8, entradas.length, true);
  f.setUint16(10, entradas.length, true);
  f.setUint32(12, tamCentral, true);
  f.setUint32(16, desplazamiento, true);
  const partes = [...locales, ...centrales, fin];
  const salida = new Uint8Array(partes.reduce((n, x) => n + x.length, 0));
  let i = 0;
  for (const p of partes) {
    salida.set(p, i);
    i += p.length;
  }
  return salida;
}

// ---------- SpreadsheetML ----------

/** Escapa texto para XML y quita caracteres de control no permitidos. */
export function textoXml(v: string): string {
  return v
    .replace(/[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Índice 0 → A, 25 → Z, 26 → AA… */
export function columna(i: number): string {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const ESTILO = { normal: 0, titulo: 1, encabezado: 2, celda: 3 } as const;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="12"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E1F2"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function celda(ref: string, valor: string | number, estilo: number): string {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return `<c r="${ref}" s="${estilo}"><v>${valor}</v></c>`;
  }
  return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${textoXml(String(valor))}</t></is></c>`;
}

function hojaXml(h: HojaXlsx): string {
  const ancho = Math.max(h.encabezados.length, 1);
  const ultima = columna(ancho - 1);
  const titulo = h.titulo ?? [];
  const filasXml: string[] = [];
  const combinadas: string[] = [];
  let r = 1;
  for (const t of titulo) {
    filasXml.push(`<row r="${r}">${celda(`A${r}`, t, ESTILO.titulo)}</row>`);
    if (ancho > 1) combinadas.push(`<mergeCell ref="A${r}:${ultima}${r}"/>`);
    r++;
  }
  if (titulo.length > 0) r++; // fila en blanco antes de la tabla
  const filaEncabezado = r;
  filasXml.push(
    `<row r="${r}">${h.encabezados.map((e, i) => celda(`${columna(i)}${r}`, e, ESTILO.encabezado)).join("")}</row>`,
  );
  r++;
  for (const fila of h.filas) {
    filasXml.push(
      `<row r="${r}">${fila.map((v, i) => celda(`${columna(i)}${r}`, v, ESTILO.celda)).join("")}</row>`,
    );
    r++;
  }
  const cols = (h.anchos ?? [])
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${ultima}${Math.max(r - 1, 1)}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="${filaEncabezado}" topLeftCell="A${filaEncabezado + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
${cols ? `<cols>${cols}</cols>` : ""}
<sheetData>${filasXml.join("")}</sheetData>
${combinadas.length > 0 ? `<mergeCells count="${combinadas.length}">${combinadas.join("")}</mergeCells>` : ""}
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

/** Libro de una hoja listo para descargar (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet). */
export function escribirXlsx(hoja: HojaXlsx, fecha: Date = new Date()): Uint8Array {
  const nombreHoja = textoXml(hoja.nombre.replace(/[[\]:*?/\\]/g, " ").slice(0, 31) || "Hoja1");
  const enc = new TextEncoder();
  const archivos: Array<[string, string]> = [
    [
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nombreHoja}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ],
    ["xl/styles.xml", STYLES_XML],
    ["xl/worksheets/sheet1.xml", hojaXml(hoja)],
  ];
  return zipAlmacenado(
    archivos.map(([nombre, xml]) => ({ nombre, datos: enc.encode(xml) })),
    fecha,
  );
}
