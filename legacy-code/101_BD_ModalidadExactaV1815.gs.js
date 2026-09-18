/**
 * BD-18.15 · MODALIDAD / MODALIDAD VIRTUAL exactas
 */

const BD1815_CONFIG = Object.freeze({
  fase:'BD-18.15',
  version:'db-18.15-modalidad-exacta'
});

function BD1815_modalidadExacta_(valor){

  var raw=String(valor==null?'':valor).trim();
  var v=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

  if(v==='PLAN DE TESIS') return 'Plan de Tesis';
  if(v==='PLAN DE TRABAJO ACADEMICO') return 'Plan de Trabajo Académico';
  if(v==='PLAN DE TESIS FORMATO ARTICULO') return 'Plan de Tesis Formato Artículo';

  return raw;
}

function BD1815_modalidadVirtualExacta_(valor){

  var raw=String(valor==null?'':valor).trim();
  var v=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

  if(v==='LA TESIS' || v==='PLAN DE TESIS') return 'La Tesis';

  if(
    v==='EL TRABAJO ACADEMICO' ||
    v==='TRABAJO ACADEMICO' ||
    v==='PLAN DE TRABAJO ACADEMICO'
  ) return 'El Trabajo Académico';

  if(
    v==='LA TESIS FORMATO ARTICULO' ||
    v==='TESIS FORMATO ARTICULO' ||
    v==='PLAN DE TESIS FORMATO ARTICULO'
  ) return 'La Tesis Formato Artículo';

  return raw;
}

function BD1815_PROBAR_DIAGNOSTICO(){

  var out={
    status:true,
    fase:BD1815_CONFIG.fase,
    version:BD1815_CONFIG.version,
    modalidad:[
      BD1815_modalidadExacta_('PLAN DE TESIS'),
      BD1815_modalidadExacta_('PLAN DE TRABAJO ACADÉMICO'),
      BD1815_modalidadExacta_('PLAN DE TESIS FORMATO ARTÍCULO')
    ],
    modalidadVirtual:[
      BD1815_modalidadVirtualExacta_('LA TESIS'),
      BD1815_modalidadVirtualExacta_('EL TRABAJO ACADÉMICO'),
      BD1815_modalidadVirtualExacta_('LA TESIS FORMATO ARTÍCULO')
    ],
    etiquetas:{
      modalidad:'<<MODALIDAD>>',
      modalidadVirtual:'<<Mod_F>>'
    }
  };

  Logger.log(JSON.stringify(out,null,2));
  return out;
}
