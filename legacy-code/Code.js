/* =========================================================
   CODE.GS
   SISTEMA DE TITULACIÓN USE FIPS
   ARCHIVO CONSOLIDADO

   ÚNICO ARCHIVO DEL PROYECTO QUE DEBE CONTENER:
   - doGet(e)
   - include(filename)
========================================================= */


/* =========================================================
   RUTAS DEL WEB APP
========================================================= */

function doGet(e){

  const page =
    e &&
    e.parameter &&
    e.parameter.page
      ? String(e.parameter.page)
          .trim()
          .toLowerCase()
      : 'index';

  const rutas = {

    index:{
      file:'index',
      title:'Sistema de Titulación'
    },

    dashboard:{
      file:'Dashboard',
      title:'Dashboard'
    },

    tramite:{
      file:'tramite',
      title:'Mi Trámite de Titulación'
    },

    avisos:{
      file:'avisos',
      title:'Comunicados y Avisos'
    },

    taller:{
      file:'taller_tesis',
      title:'Inscripción - Taller de Tesis'
    },

    'taller-admin':{
      file:'taller_admin',
      title:'Taller de Tesis'
    },

    asesor:{
      file:'asesor',
      title:'Portal del Asesor'
    }

  };

  /*
    Si llega una ruta desconocida, vuelve al login.
  */
  const ruta =
    rutas[page] ||
    rutas.index;

  try{

    const template =
      HtmlService.createTemplateFromFile(
        ruta.file
      );

    /*
      Variables disponibles en los HTML mediante:
      <?!= appUrl ?>
      <?!= paginaActual ?>
    */
    template.appUrl =
      typeof getAppUrl === 'function'
        ? getAppUrl()
        : String(
            ScriptApp.getService().getUrl() || ''
          )
          .trim()
          .replace(/^['"]+|['"]+$/g, '');

    template.paginaActual =
      page;

    template.vistaActual =
      e &&
      e.parameter &&
      e.parameter.view
        ? String(e.parameter.view)
            .trim()
            .toLowerCase()
        : '';

    return template
      .evaluate()
      .setTitle(
        ruta.title
      )
      .addMetaTag(
        'viewport',
        'width=device-width, initial-scale=1, maximum-scale=5'
      );

  }catch(error){

    Logger.log(
      'ERROR doGet [' +
      page +
      ']: ' +
      (
        error.stack ||
        error.message ||
        error
      )
    );

    /*
      Si una vista secundaria no existe o tiene un error
      de plantilla, mostramos un mensaje controlado.
      Para index dejamos propagar el error porque significa
      que el archivo principal del sistema está dañado.
    */
    if(page === 'index'){
      throw error;
    }

    return HtmlService
      .createHtmlOutput(
        '<!DOCTYPE html>' +
        '<html><head>' +
        '<base target="_top">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<title>Error de carga</title>' +
        '</head><body style="font-family:Arial,sans-serif;padding:30px">' +
        '<h2>No se pudo cargar esta sección</h2>' +
        '<p>' +
        escaparHtmlCode_(
          error.message ||
          'Se produjo un error al abrir la página.'
        ) +
        '</p>' +
        '</body></html>'
      )
      .setTitle(
        'Error de carga'
      );
  }
}


/* =========================================================
   INCLUDE DE HTML PARCIAL
========================================================= */

function include(filename){

  filename =
    String(filename || '')
      .trim();

  if(!filename){
    return '';
  }

  return HtmlService
    .createHtmlOutputFromFile(
      filename
    )
    .getContent();
}


/* =========================================================
   ESCAPE PARA MENSAJE DE ERROR HTML
========================================================= */

function escaparHtmlCode_(texto){

  return String(texto || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
