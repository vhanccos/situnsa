/**
 * ==============================================================
 * BD-04.1 - CORRECCION CONTROLADA DE INTEGRIDAD
 * ==============================================================
 * Objetivos:
 * 1) Corregir CODIGO de PROGRAMAS para evitar colisiones por truncado.
 * 2) Analizar duplicados de CUI mostrando los estudiantes involucrados.
 * 3) Permitir corregir un CUI de forma explicita, nunca automatica.
 *
 * No modifica fuentes legacy.
 * Solo actua sobre BD_TITULACION_RELACIONAL_V2.
 * ==============================================================
 */

const BD41_CONFIG = Object.freeze({
  version: 'db-4.1-correccion-integridad',
  fase: 'BD-04.1'
});

function BD41_txt_(v){ return String(v == null ? '' : v).trim(); }
function BD41_up_(v){ return BD41_txt_(v).toUpperCase(); }
function BD41_safe_(v){
  return BD41_up_(v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^A-Z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'');
}
function BD41_hash8_(v){
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, BD41_txt_(v));
  return bytes.slice(0,4).map(function(x){
    return ('0'+((x+256)%256).toString(16)).slice(-2);
  }).join('').toUpperCase();
}
function BD41_codigoPrograma_(nombre){
  var base = BD41_safe_(nombre);
  var pref = base.slice(0,20).replace(/_+$/,'');
  return (pref || 'PROGRAMA') + '_' + BD41_hash8_(BD41_up_(nombre));
}
function BD41_base_(){
  var ss = BD2_abrirBase_();
  if(!ss) throw new Error('No existe BD_TITULACION_RELACIONAL_V2.');
  return ss;
}
function BD41_tabla_(nombre){
  var ss=BD41_base_(), sh=ss.getSheetByName(BD2_nombreHoja_(nombre));
  if(!sh) throw new Error('No existe la tabla '+nombre+'.');
  var vals=sh.getDataRange().getValues();
  var headers=(vals[0]||[]).map(BD41_up_), idx={};
  headers.forEach(function(h,i){ if(h) idx[h]=i; });
  return {sheet:sh,headers:headers,idx:idx,rows:vals.slice(1)};
}

function BD41_ANALIZAR_DUPLICADOS(){
  var est=BD41_tabla_('estudiantes');
  var prg=BD41_tabla_('programas');
  var gruposCui={}, gruposCodigo={};

  est.rows.forEach(function(r,i){
    var cui=BD41_txt_(r[est.idx.CUI]);
    if(!cui) return;
    if(!gruposCui[cui]) gruposCui[cui]=[];
    gruposCui[cui].push({
      fila:i+2,
      idEstudiante:BD41_txt_(r[est.idx.ID_ESTUDIANTE]),
      dni:BD41_txt_(r[est.idx.DNI]),
      cui:cui,
      nombres:BD41_txt_(r[est.idx.APELLIDOS_NOMBRES]),
      correo:BD41_txt_(r[est.idx.CORREO]),
      idPrograma:BD41_txt_(r[est.idx.ID_PROGRAMA])
    });
  });

  prg.rows.forEach(function(r,i){
    var cod=BD41_txt_(r[prg.idx.CODIGO]);
    if(!cod) return;
    if(!gruposCodigo[cod]) gruposCodigo[cod]=[];
    gruposCodigo[cod].push({
      fila:i+2,
      idPrograma:BD41_txt_(r[prg.idx.ID_PROGRAMA]),
      codigo:cod,
      nombre:BD41_txt_(r[prg.idx.NOMBRE]),
      codigoPropuesto:BD41_codigoPrograma_(r[prg.idx.NOMBRE])
    });
  });

  var cuiDup=Object.keys(gruposCui).filter(function(k){return gruposCui[k].length>1;}).map(function(k){return {valor:k,registros:gruposCui[k]};});
  var codDup=Object.keys(gruposCodigo).filter(function(k){return gruposCodigo[k].length>1;}).map(function(k){return {valor:k,registros:gruposCodigo[k]};});

  var out={
    status:true,
    fase:BD41_CONFIG.fase,
    version:BD41_CONFIG.version,
    soloLectura:true,
    duplicadosCUI:cuiDup,
    duplicadosCodigoPrograma:codDup,
    datosLegacyModificados:false,
    datosRelacionalesModificados:false
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD41_CORREGIR_CODIGOS_PROGRAMAS(){
  var t=BD41_tabla_('programas'), sh=t.sheet;
  var cambios=[], usados={};
  t.rows.forEach(function(r,i){
    var nombre=BD41_txt_(r[t.idx.NOMBRE]);
    if(!nombre) return;
    var anterior=BD41_txt_(r[t.idx.CODIGO]);
    var nuevo=BD41_codigoPrograma_(nombre);
    if(usados[nuevo]) throw new Error('Colision inesperada de codigo: '+nuevo);
    usados[nuevo]=true;
    if(anterior!==nuevo){
      sh.getRange(i+2,t.idx.CODIGO+1).setValue(nuevo);
      cambios.push({fila:i+2,nombre:nombre,anterior:anterior,nuevo:nuevo});
    }
  });
  var out={status:true,fase:BD41_CONFIG.fase,correccion:'CODIGOS_PROGRAMAS',programasRevisados:t.rows.length,cambios:cambios.length,detalle:cambios,datosLegacyModificados:false};
  Logger.log(JSON.stringify(out,null,2)); return out;
}

/**
 * Corrige un CUI solo cuando el usuario ya verifico el dato correcto.
 * Ejemplo: BD41_CORREGIR_CUI_ESTUDIANTE('EST_12345678','2020123456')
 * Para dejarlo temporalmente sin CUI, pase '' como nuevoCui.
 */
function BD41_CORREGIR_CUI_ESTUDIANTE(idEstudiante,nuevoCui){
  idEstudiante=BD41_txt_(idEstudiante);
  nuevoCui=BD41_txt_(nuevoCui);
  if(!idEstudiante) throw new Error('Debe indicar ID_ESTUDIANTE.');
  if(nuevoCui && !/^\d+$/.test(nuevoCui)) throw new Error('El CUI debe contener solo digitos o quedar vacio.');

  var t=BD41_tabla_('estudiantes'), fila=-1, anterior='';
  t.rows.forEach(function(r,i){
    if(BD41_txt_(r[t.idx.ID_ESTUDIANTE])===idEstudiante){ fila=i+2; anterior=BD41_txt_(r[t.idx.CUI]); }
    if(nuevoCui && BD41_txt_(r[t.idx.CUI])===nuevoCui && BD41_txt_(r[t.idx.ID_ESTUDIANTE])!==idEstudiante)
      throw new Error('El CUI '+nuevoCui+' ya pertenece a otro estudiante.');
  });
  if(fila<0) throw new Error('No se encontro el estudiante '+idEstudiante+'.');
  t.sheet.getRange(fila,t.idx.CUI+1).setValue(nuevoCui);
  var out={status:true,fase:BD41_CONFIG.fase,correccion:'CUI_ESTUDIANTE',idEstudiante:idEstudiante,cuiAnterior:anterior,cuiNuevo:nuevoCui,datosLegacyModificados:false};
  Logger.log(JSON.stringify(out,null,2)); return out;
}

function BD41_PROBAR_DIAGNOSTICO(){
  return BD4_PROBAR_RESUMEN();
}
