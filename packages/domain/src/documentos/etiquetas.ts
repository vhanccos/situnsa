/**
 * Inserción de etiquetas <<CAMPO>> (port de legacy-code/DocumentosExpedientes.js
 * `insertarDatosEnDocumento`): reemplaza solo etiquetas con dato, conserva
 * las vacías y las informa como pendientes (el legacy las pintaba de
 * amarillo; aquí el renderer las resalta). Puro, sin I/O.
 */

export interface Segmento {
  readonly texto: string;
  /** true = etiqueta sin dato (se resalta en el documento generado). */
  readonly pendiente: boolean;
}

const PATRON = /<<([^<>]+)>>/g;

/** Normaliza el nombre de la etiqueta: mayúsculas, sin espacios extremos. */
export function claveEtiqueta(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Etiquetas presentes en un texto (claves normalizadas, sin duplicados). */
export function extraerEtiquetas(texto: string): string[] {
  const vistas = new Set<string>();
  for (const m of texto.matchAll(PATRON)) {
    if (m[1]) vistas.add(claveEtiqueta(m[1]));
  }
  return [...vistas];
}

/**
 * Divide el texto en segmentos: los datos insertados y las etiquetas
 * pendientes (sin dato o vacías) por separado, en orden.
 */
export function segmentar(
  texto: string,
  datos: Readonly<Record<string, string>>,
): { segmentos: Segmento[]; pendientes: string[] } {
  const segmentos: Segmento[] = [];
  const pendientes = new Set<string>();
  let ultimo = 0;
  for (const m of texto.matchAll(PATRON)) {
    const inicio = m.index ?? 0;
    if (inicio > ultimo) segmentos.push({ texto: texto.slice(ultimo, inicio), pendiente: false });
    const clave = claveEtiqueta(m[1] ?? "");
    const valor = (datos[clave] ?? "").trim();
    if (valor) {
      segmentos.push({ texto: valor, pendiente: false });
    } else {
      segmentos.push({ texto: `<<${clave}>>`, pendiente: true });
      pendientes.add(clave);
    }
    ultimo = inicio + m[0].length;
  }
  if (ultimo < texto.length) segmentos.push({ texto: texto.slice(ultimo), pendiente: false });
  return { segmentos, pendientes: [...pendientes] };
}

/** Versión texto plano de segmentar (útil para correos y pruebas). */
export function insertarEtiquetas(
  texto: string,
  datos: Readonly<Record<string, string>>,
): { texto: string; pendientes: string[] } {
  const { segmentos, pendientes } = segmentar(texto, datos);
  return { texto: segmentos.map((s) => s.texto).join(""), pendientes };
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2026-09-01" → "1 de septiembre de 2026" (fecha civil, sin zona). */
export function fechaLarga(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m?.[1] || !m[2] || !m[3]) return iso;
  const mes = MESES[Number.parseInt(m[2], 10) - 1];
  if (!mes) return iso;
  return `${Number.parseInt(m[3], 10)} de ${mes} de ${m[1]}`;
}
