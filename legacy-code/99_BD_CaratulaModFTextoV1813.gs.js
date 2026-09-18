/**
 * BD-18.13 · Carátula, Mod_F y ceros iniciales.
 */
const BD1813_CONFIG=Object.freeze({
  fase:'BD-18.13',
  version:'db-18.13-caratula-modf-textids'
});

function BD1813_txt_(v){return String(v==null?'':v).trim();}

function BD1813_sinAcentos_(v){
  return BD1813_txt_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

function BD1813_tituloNatural_(valor){
  var conectores={
    'de':1,'del':1,'la':1,'las':1,'los':1,'y':1,'e':1,'en':1,
    'para':1,'por':1,'con':1,'a':1,'al':1
  };
  var palabras=BD1813_txt_(valor).toLocaleLowerCase('es').split(/\s+/);
  return palabras.map(function(p,i){
    if(i>0 && conectores[p])return p;
    return p ? p.charAt(0).toLocaleUpperCase('es')+p.slice(1) : p;
  }).join(' ');
}

function BD1813_programaCaratula_(valor){
  return BD1813_tituloNatural_(valor);
}

function BD1813_modalidadVirtual_(modalidad){
  var original=BD1813_txt_(modalidad);
  var m=BD1813_sinAcentos_(original).toUpperCase();

  // Acepta también valores ya transformados.
  if(m==='LA TESIS' || m==='PLAN DE TESIS')
    return 'Plan de Tesis';

  if(m==='EL TRABAJO ACADEMICO' || m==='TRABAJO ACADEMICO' ||
     m==='PLAN DE TRABAJO ACADEMICO')
    return 'Trabajo Académico';

  if(m==='LA TESIS FORMATO ARTICULO' ||
     m==='PLAN DE TESIS FORMATO ARTICULO')
    return 'Tesis Formato Artículo';

  return original ? BD1813_tituloNatural_(original) : '';
}

function BD1813_buscarParrafoCon_(body,patron){
  var r=body.findText(patron);
  if(!r)return null;
  var e=r.getElement();
  while(e && e.getType()!==DocumentApp.ElementType.PARAGRAPH &&
        e.getType()!==DocumentApp.ElementType.LIST_ITEM){
    e=e.getParent();
  }
  return e||null;
}

function BD1813_prepararCaratula_(body){
  if(!body)return;

  var pTesis=BD1813_buscarParrafoCon_(body,'<<TESIS>>');
  if(pTesis){
    try{
      pTesis.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
      pTesis.setSpacingAfter(0);
      pTesis.setSpacingBefore(0);
    }catch(_e){}
  }

  var pMod=
    BD1813_buscarParrafoCon_(body,'<<Mod_F>>') ||
    BD1813_buscarParrafoCon_(body,'<<MOD_F>>');

  if(pMod){
    try{
      pMod.setSpacingBefore(0);
      pMod.setSpacingAfter(0);
    }catch(_e){}
  }

  /*
    Si TESIS y Mod_F son párrafos hermanos del mismo contenedor,
    elimina SOLO párrafos completamente vacíos situados entre ambos.
    No toca tablas, imágenes ni párrafos con contenido.
  */
  if(pTesis && pMod && pTesis.getParent()===pMod.getParent()){
    var parent=pTesis.getParent();
    var i1=parent.getChildIndex(pTesis);
    var i2=parent.getChildIndex(pMod);

    if(i2>i1){
      for(var i=i2-1;i>i1;i--){
        var ch=parent.getChild(i);
        if(ch.getType()===DocumentApp.ElementType.PARAGRAPH){
          var t=BD1813_txt_(ch.asParagraph().getText());
          if(!t){
            parent.removeChild(ch);
          }
        }
      }
    }
  }
}

function BD1813_PROBAR_DIAGNOSTICO(){
  var out={
    status:true,
    fase:BD1813_CONFIG.fase,
    version:BD1813_CONFIG.version,
    mod1:BD1813_modalidadVirtual_('PLAN DE TESIS'),
    mod2:BD1813_modalidadVirtual_('PLAN DE TRABAJO ACADÉMICO'),
    mod3:BD1813_modalidadVirtual_('PLAN DE TESIS FORMATO ARTÍCULO'),
    programa:BD1813_programaCaratula_('SEGUNDA ESPECIALIDAD DE INGENIERÍA COMERCIAL Y NEGOCIOS INTERNACIONALES'),
    ceros:{decreto:String('0012'),oficio:String('0007')}
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}
