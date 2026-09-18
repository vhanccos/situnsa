/**
 * BD-18.17 · Agenda de Titulaciones - enlace externo
 */
const BD1817_CONFIG=Object.freeze({
  fase:'BD-18.17',
  version:'db-18.17-agenda-link',
  url:'https://script.google.com/a/macros/unsa.edu.pe/s/AKfycbwHNyryZEbC2PRtRLoAZrLta-wfwzG_QcL7dVUi-7sJ-yOecOo1NjMIa5i6MiFRSem23w/exec'
});

function BD1817_PROBAR_DIAGNOSTICO(){
  var out={
    status:true,
    fase:BD1817_CONFIG.fase,
    version:BD1817_CONFIG.version,
    menu:'Agendar Sustentaciones',
    url:BD1817_CONFIG.url,
    navegacion:'TOP'
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

