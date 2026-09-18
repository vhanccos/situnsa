/* =========================================================
   HELPERS
   SISTEMA DE TITULACIÓN USE FIPS
   ARCHIVO CONSOLIDADO

   IMPORTANTE:
   - Aquí NO se define doGet().
   - Aquí NO se define include().
   - Esas funciones quedarán únicamente en Code.gs.
========================================================= */


/* =========================================================
   URL OFICIAL DEL WEB APP
========================================================= */

function getAppUrl(){

  const url =
    ScriptApp
      .getService()
      .getUrl();

  return String(url || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    /* /u/N/ es un selector de cuenta del navegador, no forma parte de la URL
       pública del despliegue y falla con frecuencia en teléfonos. */
    .replace(/\/macros\/u\/\d+\/s\//, '/macros/s/');

}


/* =========================================================
   URL BASE SIN QUERYSTRING
   Útil para navegación entre páginas.
========================================================= */

function getAppBaseUrl(){

  const url = getAppUrl();

  if(!url){
    return '';
  }

  const pos =
    url.indexOf('?');

  return pos >= 0
    ? url.substring(0, pos)
    : url;

}


/* =========================================================
   NORMALIZAR TEXTO SIMPLE
========================================================= */

function helperTexto(valor){

  return String(
    valor === undefined ||
    valor === null
      ? ''
      : valor
  ).trim();

}


/* =========================================================
   NORMALIZAR EXPEDIENTE
========================================================= */

function helperExpediente(valor){

  return helperTexto(valor)
    .toUpperCase();

}


/* =========================================================
   NORMALIZAR CORREO
========================================================= */

function helperCorreo(valor){

  return helperTexto(valor)
    .toLowerCase();

}


/* =========================================================
   RESPUESTA ESTÁNDAR DE ERROR
========================================================= */

function helperError(error, mensaje){

  const detalle =
    error &&
    (
      error.message ||
      error.toString()
    )
      ? (
          error.message ||
          error.toString()
        )
      : '';

  return {
    status:false,
    message:
      detalle ||
      mensaje ||
      'Ocurrió un error.'
  };

}
