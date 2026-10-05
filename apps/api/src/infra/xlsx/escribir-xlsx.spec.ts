import { describe, expect, it } from "vitest";
import { columna, crc32, escribirXlsx, textoXml } from "./escribir-xlsx.js";

/** Lee un ZIP sin compresión: nombre → contenido (verificando el CRC de cada entrada). */
function leerZip(zip: Uint8Array): Map<string, string> {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const fin = zip.length - 22;
  expect(v.getUint32(fin, true)).toBe(0x06054b50);
  const total = v.getUint16(fin + 10, true);
  let p = v.getUint32(fin + 16, true);
  const dec = new TextDecoder();
  const salida = new Map<string, string>();
  for (let i = 0; i < total; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50);
    const crc = v.getUint32(p + 16, true);
    const tam = v.getUint32(p + 20, true);
    const largoNombre = v.getUint16(p + 28, true);
    const local = v.getUint32(p + 42, true);
    const nombre = dec.decode(zip.subarray(p + 46, p + 46 + largoNombre));
    expect(v.getUint32(local, true)).toBe(0x04034b50);
    const inicio = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const datos = zip.subarray(inicio, inicio + tam);
    expect(crc32(datos)).toBe(crc);
    salida.set(nombre, dec.decode(datos));
    p += 46 + largoNombre;
  }
  return salida;
}

describe("escritor XLSX mínimo", () => {
  it("CRC-32 estándar (valor de control de «123456789»)", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("nombres de columna y escapado XML", () => {
    expect([0, 25, 26, 701, 702].map(columna)).toEqual(["A", "Z", "AA", "ZZ", "AAA"]);
    expect(textoXml(`a & <b> "c"\u0001`)).toBe("a &amp; &lt;b&gt; &quot;c&quot;");
  });

  it("genera un libro OOXML válido con título, encabezado y filas", () => {
    const xlsx = escribirXlsx(
      {
        nombre: "Consejo/2026",
        titulo: ["LISTADO CONSOLIDADO"],
        encabezados: ["N°", "APELLIDOS Y NOMBRES"],
        filas: [[1, "ÁVILA CRUZ, ANA & <otros>"]],
        anchos: [5, 30],
      },
      new Date(2026, 9, 5, 10, 30),
    );
    const partes = leerZip(xlsx);
    expect([...partes.keys()]).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    const hoja = partes.get("xl/worksheets/sheet1.xml") ?? "";
    expect(hoja).toContain('<mergeCell ref="A1:B1"/>');
    expect(hoja).toContain('<c r="A3" s="2" t="inlineStr"><is><t xml:space="preserve">N°</t>');
    expect(hoja).toContain('<c r="A4" s="3"><v>1</v></c>');
    expect(hoja).toContain("ÁVILA CRUZ, ANA &amp; &lt;otros&gt;");
    expect(hoja).toContain('<pane ySplit="3" topLeftCell="A4"');
    expect(partes.get("xl/workbook.xml")).toContain('<sheet name="Consejo 2026"');
  });
});
