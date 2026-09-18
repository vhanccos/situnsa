/**
 * BD-18.12 · Rendimiento documental + actualización automática sin F5
 */

const BD1812_CONFIG = Object.freeze({
  fase:'BD-18.12',
  version:'db-18.12-documentos-fast-refresh'
});

function BD1812_PROBAR_DIAGNOSTICO(expediente){

  expediente =
    String(expediente||'').trim().toUpperCase();

  if(!expediente){
    expediente='SET012';
  }

  var inicio1=Date.now();
  var e1=listarDocumentosEtapaRapido(expediente,1);
  var ms1=Date.now()-inicio1;

  var inicio2=Date.now();
  var e2=listarDocumentosEtapaRapido(expediente,2);
  var ms2=Date.now()-inicio2;

  var out={
    status:Boolean(e1&&e1.status&&e2&&e2.status),
    fase:BD1812_CONFIG.fase,
    version:BD1812_CONFIG.version,
    expediente:expediente,
    etapa1:{
      total:e1&&e1.documentos?e1.documentos.length:0,
      ms:ms1
    },
    etapa2:{
      total:e2&&e2.documentos?e2.documentos.length:0,
      ms:ms2
    },
    nota:'El listado rápido no abre los Google Docs. La verificación de etiquetas ocurre después, en segundo plano.'
  };

  Logger.log(JSON.stringify(out,null,2));
  return out;
}
