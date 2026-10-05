/**
 * Plantilla de correo institucional (HU-0058/0062): título, código del
 * expediente, estado, mensaje y enlace directo al portal. Pura (testeable);
 * escapa todo el contenido dinámico antes de insertarlo en el HTML.
 */

export interface DatosCorreo {
  titulo: string;
  texto: string;
  codigo?: string | null;
  estado?: string | null;
  enlace?: string | null;
  textoEnlace?: string | null;
}

export interface CorreoRenderizado {
  html: string;
  texto: string;
}

export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Solo enlaces http(s): evita `javascript:` u otros esquemas en el HTML. */
function enlaceSeguro(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : null;
}

const ESTADO_LEGIBLE: Readonly<Record<string, string>> = {
  REGISTRADO: "Registrado",
  EN_PLAN: "En evaluación del plan",
  PLAN_APROBADO: "Plan aprobado",
  EN_BORRADOR: "Borrador en revisión",
  EN_DICTAMEN: "En dictamen de jurados",
  APTO_SUSTENTACION: "Apto para sustentación",
  SUSTENTADO: "Sustentado",
  EN_VALIDACION: "En validaciones institucionales",
  EN_APROBACION: "En aprobaciones institucionales",
  TITULO_EMITIDO: "Título emitido",
  OBSERVADO: "Observado",
  DESAPROBADO_TRUNCO: "Desaprobado",
  ANULADO: "Anulado",
};

export function renderizarCorreo(d: DatosCorreo): CorreoRenderizado {
  const enlace = enlaceSeguro(d.enlace);
  const estado = d.estado ? (ESTADO_LEGIBLE[d.estado] ?? d.estado) : null;
  const filas = [
    d.codigo ? `Expediente: ${d.codigo}` : null,
    estado ? `Estado: ${estado}` : null,
  ].filter((x): x is string => x !== null);

  const texto = [
    d.titulo,
    "",
    d.texto,
    "",
    ...filas,
    ...(enlace ? ["", `${d.textoEnlace ?? "Ingresar al portal"}: ${enlace}`] : []),
    "",
    "Unidad de Segunda Especialidad — FIPS UNSA",
    "Este es un mensaje automático; no responda a este correo.",
  ].join("\n");

  const parrafos = d.texto
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${escaparHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const meta = filas.map((f) => `<li style="margin:2px 0">${escaparHtml(f)}</li>`).join("");
  const boton = enlace
    ? `<p style="margin:20px 0"><a href="${escaparHtml(enlace)}" style="background:#7A0019;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">${escaparHtml(d.textoEnlace ?? "Ingresar al portal")}</a></p>`
    : "";

  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#F5F7FA;font-family:Arial,Helvetica,sans-serif;color:#162033">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #D9E0E7;border-radius:8px">
<tr><td style="background:#06283A;color:#ffffff;padding:16px 24px;border-radius:8px 8px 0 0">
<div style="font-size:12px;letter-spacing:1px">UNIVERSIDAD NACIONAL DE SAN AGUSTÍN DE AREQUIPA</div>
<div style="font-size:16px;font-weight:700">Sistema de Titulación · Segunda Especialidad FIPS</div></td></tr>
<tr><td style="padding:24px">
<h1 style="font-size:18px;margin:0 0 16px;color:#7A0019">${escaparHtml(d.titulo)}</h1>
${parrafos}
${meta ? `<ul style="padding-left:18px;margin:12px 0;color:#334155">${meta}</ul>` : ""}
${boton}
<p style="font-size:12px;color:#687386;margin-top:24px">Mensaje automático de la Unidad de Segunda Especialidad — FIPS UNSA. No responda a este correo.</p>
</td></tr></table></td></tr></table></body></html>`;

  return { html, texto };
}
