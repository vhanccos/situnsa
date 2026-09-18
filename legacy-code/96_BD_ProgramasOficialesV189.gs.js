/**
 * BD-18.9 - CATALOGO OFICIAL DE PROGRAMAS
 * Mantiene activos únicamente los 13 programas oficiales.
 * No elimina físicamente programas antiguos para no romper referencias históricas.
 */
const BD189_CONFIG=Object.freeze({
  fase:'BD-18.9',
  version:'db-18.9-programas-oficiales'
});

function BD189_programasOficiales_(){
  return [{"codigo": "SEGIND", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE SEGURIDAD INDUSTRIAL E HIGIENE OCUPACIONAL"}, {"codigo": "PROY", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE PROYECTOS"}, {"codigo": "PROD", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE PRODUCCIÓN"}, {"codigo": "LOG", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA LOGÍSTICA Y COMERCIO INTERNACIONAL"}, {"codigo": "MANT", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE MANTENIMIENTO"}, {"codigo": "ER", "nombre": "SEGUNDA ESPECIALIDAD EN ENERGÍAS RENOVABLES"}, {"codigo": "SIS", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE SISTEMAS"}, {"codigo": "TEL", "nombre": "SEGUNDA ESPECIALIDAD DE INGENIERÍA EN TELECOMUNICACIONES"}, {"codigo": "FIN", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA FINANCIERA"}, {"codigo": "COM", "nombre": "SEGUNDA ESPECIALIDAD DE INGENIERÍA COMERCIAL Y NEGOCIOS INTERNACIONALES"}, {"codigo": "RRHH", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE RECURSOS HUMANOS"}, {"codigo": "BIO", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA BIOMÉDICA"}, {"codigo": "REF", "nombre": "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE REFRIGERACIÓN Y AIRE ACONDICIONADO"}];
}

function BD189_norm_(v){
  return String(v==null?'':v)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[:.,]/g,' ')
    .replace(/\s+/g,' ');
}

function BD189_clavePrograma_(nombre){
  var n=BD189_norm_(nombre);
  if(n.indexOf('SEGURIDAD INDUSTRIAL')>=0)return 'SEGIND';
  if(n.indexOf('PROYECTOS')>=0)return 'PROY';
  if(n.indexOf('PRODUCCION')>=0)return 'PROD';
  if(n.indexOf('LOGISTICA')>=0 && n.indexOf('COMERCIO INTERNACIONAL')>=0)return 'LOG';
  if(n.indexOf('MANTENIMIENTO')>=0)return 'MANT';
  if(n.indexOf('ENERGIAS RENOVABLES')>=0)return 'ER';
  if(n.indexOf('SISTEMAS')>=0)return 'SIS';
  if(n.indexOf('TELECOMUNICACIONES')>=0)return 'TEL';
  if(n.indexOf('FINANCIERA')>=0)return 'FIN';
  if(n.indexOf('COMERCIAL')>=0 && n.indexOf('NEGOCIOS INTERNACIONALES')>=0)return 'COM';
  if(n.indexOf('RECURSOS HUMAN')>=0)return 'RRHH';
  if(n.indexOf('BIOMED')>=0)return 'BIO';
  if(n.indexOf('REFRIGERACION')>=0 && n.indexOf('AIRE ACONDICIONADO')>=0)return 'REF';
  return '';
}

function BD189_PREVISUALIZAR_PROGRAMAS(){
  var oficiales=BD189_programasOficiales_();
  var actuales=REPO_RelacionalV5.listar('programas')||[];
  var oficialPorCodigo={};
  oficiales.forEach(function(p){oficialPorCodigo[p.codigo]=p;});

  var coincidencias=[],noOficiales=[];
  actuales.forEach(function(p){
    var clave=BD189_clavePrograma_(p.NOMBRE||p.CODIGO);
    if(clave && oficialPorCodigo[clave]){
      coincidencias.push({
        id:p.ID_PROGRAMA||'',
        actual:p.NOMBRE||'',
        oficial:oficialPorCodigo[clave].nombre,
        clave:clave
      });
    }else{
      noOficiales.push({
        id:p.ID_PROGRAMA||'',
        nombre:p.NOMBRE||'',
        estado:p.ESTADO_REGISTRO||''
      });
    }
  });

  var out={
    status:true,
    fase:BD189_CONFIG.fase,
    version:BD189_CONFIG.version,
    oficiales:oficiales.length,
    coincidencias:coincidencias,
    noOficiales:noOficiales,
    modificaDatos:false
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD189_SINCRONIZAR_PROGRAMAS_OFICIALES(){
  var oficiales=BD189_programasOficiales_();
  var actuales=REPO_RelacionalV5.listar('programas')||[];

  var oficialPorCodigo={};
  oficiales.forEach(function(p){oficialPorCodigo[p.codigo]=p;});

  var usados={};
  var actualizados=[],creados=[],inactivados=[],duplicados=[];

  // Agrupar existentes por clave lógica
  var grupos={};
  actuales.forEach(function(p){
    var clave=BD189_clavePrograma_(p.NOMBRE||p.CODIGO);
    if(clave){
      (grupos[clave]=grupos[clave]||[]).push(p);
    }
  });

  oficiales.forEach(function(of){
    var candidatos=grupos[of.codigo]||[];
    var principal=candidatos.length?candidatos[0]:null;

    if(principal){
      BD16_upsert_('programas','ID_PROGRAMA',{
        ID_PROGRAMA:principal.ID_PROGRAMA,
        CODIGO:of.codigo,
        NOMBRE:of.nombre,
        ESTADO_REGISTRO:'ACTIVO'
      });
      usados[String(principal.ID_PROGRAMA)]=true;
      actualizados.push(of.nombre);

      // Duplicados se conservan pero quedan inactivos
      for(var i=1;i<candidatos.length;i++){
        var dup=candidatos[i];
        BD16_upsert_('programas','ID_PROGRAMA',{
          ID_PROGRAMA:dup.ID_PROGRAMA,
          ESTADO_REGISTRO:'INACTIVO'
        });
        usados[String(dup.ID_PROGRAMA)]=true;
        duplicados.push({
          id:dup.ID_PROGRAMA,
          nombre:dup.NOMBRE||'',
          motivo:'DUPLICADO'
        });
      }
    }else{
      var id='PRG_'+of.codigo;
      BD16_upsert_('programas','ID_PROGRAMA',{
        ID_PROGRAMA:id,
        CODIGO:of.codigo,
        NOMBRE:of.nombre,
        ESTADO_REGISTRO:'ACTIVO'
      });
      usados[id]=true;
      creados.push(of.nombre);
    }
  });

  // Todo registro que no forme parte de las 13 oficiales queda inactivo.
  actuales.forEach(function(p){
    var id=String(p.ID_PROGRAMA||'');
    if(!id || usados[id])return;
    var clave=BD189_clavePrograma_(p.NOMBRE||p.CODIGO);
    if(!clave || !oficialPorCodigo[clave]){
      BD16_upsert_('programas','ID_PROGRAMA',{
        ID_PROGRAMA:id,
        ESTADO_REGISTRO:'INACTIVO'
      });
      inactivados.push({
        id:id,
        nombre:p.NOMBRE||''
      });
    }
  });

  var out={
    status:true,
    fase:BD189_CONFIG.fase,
    version:BD189_CONFIG.version,
    programasOficiales:oficiales.length,
    actualizados:actualizados,
    creados:creados,
    duplicadosInactivados:duplicados,
    noOficialesInactivados:inactivados
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD189_PROBAR_CATALOGO(){
  var rows=REPO_RelacionalV5.listar('programas')||[];
  var activos=rows.filter(function(p){
    return String(p.ESTADO_REGISTRO||'').trim().toUpperCase()==='ACTIVO';
  });

  var esperados=BD189_programasOficiales_();
  var faltantes=[];
  esperados.forEach(function(e){
    var ok=activos.some(function(a){
      return BD189_clavePrograma_(a.NOMBRE||a.CODIGO)===e.codigo &&
             BD189_norm_(a.NOMBRE)===BD189_norm_(e.nombre);
    });
    if(!ok)faltantes.push(e.nombre);
  });

  var out={
    status:faltantes.length===0 && activos.length===13,
    fase:BD189_CONFIG.fase,
    version:BD189_CONFIG.version,
    activos:activos.length,
    faltantes:faltantes,
    catalogo:activos.map(function(p){return p.NOMBRE;})
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}
