/**
 * BD-18.8 - INGRESO AUTOMATICO SIN REDIRECCION CROSS-FRAME
 * Evalúa la vista correspondiente y la devuelve para sustituir
 * el documento actual dentro del mismo iframe de Apps Script.
 */
const BD188_UI_CONFIG = Object.freeze({
  fase:'BD-18.8',
  version:'db-18.8-auto-portal-checklist-masterdata'
});

function BD188_OBTENER_VISTA_POST_LOGIN(rol){
  var r = String(rol || '').trim().toLowerCase();
  var file = (r === 'invitado') ? 'tramite' : 'Dashboard';

  var template = HtmlService.createTemplateFromFile(file);
  template.appUrl =
    typeof getAppUrl === 'function'
      ? getAppUrl()
      : String(ScriptApp.getService().getUrl() || '').trim();

  template.paginaActual = (r === 'invitado') ? 'tramite' : 'dashboard';
  template.vistaActual = '';

  return {
    status:true,
    fase:BD188_UI_CONFIG.fase,
    version:BD188_UI_CONFIG.version,
    rol:r,
    vista:file,
    html:template.evaluate().getContent()
  };
}
