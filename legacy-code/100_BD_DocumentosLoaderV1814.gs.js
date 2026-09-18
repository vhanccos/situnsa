/**
 * BD-18.14 · Loader interno + espera automática de documentos
 */

const BD1814_CONFIG = Object.freeze({
  fase:'BD-18.14',
  version:'db-18.14-documentos-loader-autorefresh'
});

function BD1814_PROBAR_DIAGNOSTICO(expediente){

  expediente =
    String(expediente || 'SET012')
      .trim()
      .toUpperCase();

  var i1=Date.now();
  var r1=listarDocumentosEtapaRapido(expediente,1);
  var t1=Date.now()-i1;

  var i2=Date.now();
  var r2=listarDocumentosEtapaRapido(expediente,2);
  var t2=Date.now()-i2;

  var out={
    status:true,
    fase:BD1814_CONFIG.fase,
    version:BD1814_CONFIG.version,
    expediente:expediente,
    etapa1:{
      status:Boolean(r1&&r1.status),
      total:(r1&&r1.documentos?r1.documentos.length:0),
      ms:t1
    },
    etapa2:{
      status:Boolean(r2&&r2.status),
      total:(r2&&r2.documentos?r2.documentos.length:0),
      ms:t2
    },
    comportamiento:[
      'Loader visible dentro del contenedor',
      'Reintento automático mientras no existan documentos',
      'No requiere F5',
      'Las etiquetas se verifican después en segundo plano'
    ]
  };

  Logger.log(JSON.stringify(out,null,2));
  return out;
}
