/**
 * BD-18.8 - IDENTIFICADORES COMO TEXTO + CATALOGO DE PROGRAMAS
 */
const BD188_MASTER_CONFIG=Object.freeze({
  fase:'BD-18.8',
  version:'db-18.8-masterdata-identificadores',
  formatKey:'BD188_IDENTIFICADORES_TEXTO'
});

function BD188_programas_(){
  return [{"codigo": "SEGIND", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE SEGURIDAD INDUSTRIAL E HIGIENE OCUPACIONAL"}, {"codigo": "PROY", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE PROYECTOS"}, {"codigo": "PROD", "nombre": "SEGUNDA ESPECIALIDAD: EN INGENIERÍA DE PRODUCCIÓN"}, {"codigo": "LOG", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA LOGÍSTICA Y COMERCIO INTERNACIONAL"}, {"codigo": "MANT", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE MANTENIMIENTO"}, {"codigo": "ER", "nombre": "SEGUNDA ESPECIALIDAD EN ENERGÍAS RENOVABLES"}, {"codigo": "SIS", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE SISTEMAS"}, {"codigo": "TEL", "nombre": "SEGUNDA ESPECIALIDAD DE INGENIERÍA EN TELECOMUNICACIONES"}, {"codigo": "FIN", "nombre": "SEGUNDA ESPECIALIDAD: EN INGENIERÍA FINANCIERA"}, {"codigo": "COM", "nombre": "SEGUNDA ESPECIALIDAD DE INGENIERÍA COMERCIAL Y NEGOCIOS INTERNACIONALES"}, {"codigo": "RRHH", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE RECURSOS HUMANO"}, {"codigo": "BIO", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA BIOMEDICA"}, {"codigo": "REF", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE REFRIGERACIÓN Y AIRE ACONDICIONADO"}];
}

function BD188_columna_(sheet,nombre){
  var lc=sheet.getLastColumn();
  if(!lc)return 0;
  var h=sheet.getRange(1,1,1,lc).getValues()[0];
  var q=String(nombre||'').trim().toUpperCase();
  for(var i=0;i<h.length;i++){
    if(String(h[i]||'').trim().toUpperCase()===q)return i+1;
  }
  return 0;
}

function BD188_ASEGURAR_FORMATO_IDENTIFICADORES(forzar){
  var props=PropertiesService.getScriptProperties();
  if(!forzar && props.getProperty(BD188_MASTER_CONFIG.formatKey)==='TRUE'){
    return {status:true,fase:BD188_MASTER_CONFIG.fase,yaConfigurado:true};
  }

  var cfg=[
    {tabla:'estudiantes',columnas:['DNI','CUI']},
    {tabla:'usuarios',columnas:['USUARIO']}
  ];
  var aplicadas=[],faltantes=[];

  cfg.forEach(function(x){
    var sh=BD5_tabla_(x.tabla);
    x.columnas.forEach(function(c){
      var col=BD188_columna_(sh,c);
      if(!col){faltantes.push(x.tabla+'.'+c);return;}
      var filas=Math.max(1,sh.getMaxRows()-1);
      sh.getRange(2,col,filas,1).setNumberFormat('@');
      aplicadas.push(x.tabla+'.'+c);
    });
  });

  props.setProperty(BD188_MASTER_CONFIG.formatKey,'TRUE');
  return {
    status:faltantes.length===0,
    fase:BD188_MASTER_CONFIG.fase,
    version:BD188_MASTER_CONFIG.version,
    formato:'TEXTO',
    columnas:aplicadas,
    faltantes:faltantes
  };
}

function BD188_SINCRONIZAR_PROGRAMAS(){
  var lista=BD188_programas_();
  var existentes=REPO_RelacionalV5.listar('programas')||[];
  var usados={};
  existentes.forEach(function(p){
    usados[String(p.ID_PROGRAMA||'')]=true;
  });

  var creados=[],actualizados=[];
  lista.forEach(function(p,i){
    var encontrado=null;
    for(var j=0;j<existentes.length;j++){
      var n=String(existentes[j].NOMBRE||'').trim().toUpperCase();
      var c=String(existentes[j].CODIGO||'').trim().toUpperCase();
      if(n===p.nombre.toUpperCase() || c===p.codigo.toUpperCase()){
        encontrado=existentes[j]; break;
      }
    }

    var id=encontrado?String(encontrado.ID_PROGRAMA||''):'PRG_'+p.codigo;
    if(!id)id='PRG_'+p.codigo;

    BD16_upsert_('programas','ID_PROGRAMA',{
      ID_PROGRAMA:id,
      CODIGO:p.codigo,
      NOMBRE:p.nombre,
      ESTADO_REGISTRO:'ACTIVO'
    });

    if(encontrado)actualizados.push(p.nombre);
    else creados.push(p.nombre);
  });

  return {
    status:true,
    fase:BD188_MASTER_CONFIG.fase,
    version:BD188_MASTER_CONFIG.version,
    total:lista.length,
    creados:creados,
    actualizados:actualizados
  };
}

function BD188_PREVISUALIZAR_CEROS_IDENTIFICADORES(){
  var est=REPO_RelacionalV5.listar('estudiantes')||[];
  var candidatos=[];
  est.forEach(function(e){
    ['DNI','CUI'].forEach(function(c){
      var v=String(e[c]==null?'':e[c]).trim();
      if(/^\d+$/.test(v) && v.length>0 && v.length<8){
        candidatos.push({id:e.ID_ESTUDIANTE||'',campo:c,longitud:v.length});
      }
    });
  });
  var out={
    status:true,
    fase:BD188_MASTER_CONFIG.fase,
    candidatos:candidatos,
    total:candidatos.length,
    modificaDatos:false,
    nota:'No se completan ceros automáticamente porque primero debe verificarse que correspondan al valor original.'
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD188_CONFIGURAR_DATOS_MAESTROS(){
  var formato=BD188_ASEGURAR_FORMATO_IDENTIFICADORES(true);
  var programas=BD188_SINCRONIZAR_PROGRAMAS();
  var out={
    status:!!formato.status&&!!programas.status,
    fase:BD188_MASTER_CONFIG.fase,
    version:BD188_MASTER_CONFIG.version,
    identificadores:formato,
    programas:programas
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}
