/**
 * ==============================================================
 * BD-04 - INTEGRIDAD REFERENCIAL Y CALIDAD DE DATOS
 * Sistema de Titulacion v2.0.0 MVC + SOA
 * ==============================================================
 * Auditoria SOLO LECTURA sobre BD_TITULACION_RELACIONAL_V2.
 * No modifica datos legacy ni datos relacionales.
 * Valida PK, FK, UNIQUE, UNIQUE compuesto, tipos logicos,
 * estados, DNI/CUI/correo, porcentajes, fechas y reglas de negocio.
 * ==============================================================
 */

const BD4_CONFIG = Object.freeze({
  version: 'db-4.2-integridad-header-aware',
  fase: 'BD-04',
  soloLectura: true,
  maxMuestrasPorRegla: 10
});

function BD4_txt_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function BD4_norm_(v) {
  return BD4_txt_(v).toUpperCase();
}

function BD4_esVacio_(v) {
  return BD4_txt_(v) === '';
}

function BD4_fechaValida_(v) {
  return Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime());
}

function BD4_emailValido_(v) {
  var s = BD4_txt_(v);
  if (!s) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function BD4_dniValido_(v) {
  var s = BD4_txt_(v).replace(/\.0$/, '');
  if (!s) return true;
  return /^\d{8}$/.test(s);
}

function BD4_cuiValido_(v) {
  var s = BD4_txt_(v).replace(/\.0$/, '');
  if (!s) return true;
  return /^\d+$/.test(s);
}

function BD4_agregarError_(lista, regla, tabla, fila, campo, valor, detalle) {
  lista.push({
    regla: regla,
    tabla: tabla,
    fila: fila || null,
    campo: campo || '',
    valor: BD4_txt_(valor),
    detalle: detalle || ''
  });
}

function BD4_leerTabla_(ss, tabla) {
  var def = BD1_MODELO_OBJETIVO[tabla];
  var sh = ss.getSheetByName(BD2_nombreHoja_(tabla));
  if (!sh) return {tabla:tabla, existe:false, headers:[], rows:[], rawRows:[], errores:['Hoja inexistente']};

  var cols = def.columnas || [];
  var lastRow = sh.getLastRow();
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var headers = sh.getRange(1,1,1,lastCol).getDisplayValues()[0].map(BD4_txt_);
  var headerIndex = {};
  headers.forEach(function(h,i){ if(h && headerIndex[h] === undefined) headerIndex[h]=i; });
  var raw = lastRow >= 2 ? sh.getRange(2,1,lastRow-1,lastCol).getValues() : [];
  var rows = raw.map(function(r, idx){
    var o = {_fila: idx + 2};
    cols.forEach(function(h){
      var pos=headerIndex[h];
      o[h] = pos === undefined ? '' : r[pos];
    });
    return o;
  });
  return {tabla:tabla, existe:true, headers:headers, headerIndex:headerIndex, rows:rows, rawRows:raw, errores:[]};
}

function BD4_catalogoEstado_(tabla, campo) {
  if (campo === 'ESTADO_REGISTRO') return BD1_ESTADOS.registro;
  if (tabla === 'documentos' && campo === 'ESTADO') return BD1_ESTADOS.documento;
  if (tabla === 'historial' && campo === 'ESTADO') return BD1_ESTADOS.historial;
  if (tabla === 'taller_asistencia' && campo === 'ASISTENCIA') return BD1_ESTADOS.asistencia;
  if (campo === 'ESTADO') return BD1_ESTADOS.proceso;
  return null;
}

function BD4_validarEstructura_(tabla, data, errores) {
  var esperados = BD1_MODELO_OBJETIVO[tabla].columnas || [];
  if (!data.existe) {
    BD4_agregarError_(errores,'ESTRUCTURA',tabla,null,'','', 'Falta la hoja '+BD2_nombreHoja_(tabla));
    return;
  }
  var vistos={};
  (data.headers||[]).forEach(function(h){
    h=BD4_txt_(h);
    if(!h) return;
    if(vistos[h]) BD4_agregarError_(errores,'ENCABEZADO_DUPLICADO',tabla,1,h,h,'El encabezado aparece más de una vez');
    vistos[h]=true;
  });
  esperados.forEach(function(h){
    if(!vistos[h]) BD4_agregarError_(errores,'ENCABEZADO_FALTANTE',tabla,1,h,'','Falta la columna requerida '+h);
  });
}

function BD4_validarPkFk_(tabla, data, cache, errores) {
  var def = BD1_MODELO_OBJETIVO[tabla];
  var seen = {};
  data.rows.forEach(function(r){
    var id = BD4_txt_(r[def.pk]);
    if (!id) BD4_agregarError_(errores,'PK_VACIA',tabla,r._fila,def.pk,'','Clave primaria obligatoria');
    else if (seen[id]) BD4_agregarError_(errores,'PK_DUPLICADA',tabla,r._fila,def.pk,id,'Ya existe en fila '+seen[id]);
    else seen[id] = r._fila;
  });

  Object.keys(def.fk || {}).forEach(function(campo){
    var p = String(def.fk[campo]).split('.');
    var rt = p[0], rc = p[1], idx = {};
    (cache[rt] ? cache[rt].rows : []).forEach(function(x){ var k=BD4_txt_(x[rc]); if(k) idx[k]=true; });
    data.rows.forEach(function(r){
      var v = BD4_txt_(r[campo]);
      if (v && !idx[v]) BD4_agregarError_(errores,'FK_HUERFANA',tabla,r._fila,campo,v,'No existe en '+rt+'.'+rc);
    });
  });
}

function BD4_validarUnique_(tabla, data, errores) {
  var def = BD1_MODELO_OBJETIVO[tabla];
  (def.unique || []).forEach(function(campo){
    var seen = {};
    data.rows.forEach(function(r){
      var v = BD4_norm_(r[campo]);
      if (!v) return;
      if (seen[v]) BD4_agregarError_(errores,'UNIQUE_DUPLICADO',tabla,r._fila,campo,v,'Duplicado con fila '+seen[v]);
      else seen[v]=r._fila;
    });
  });

  var comp = def.uniqueCompuesto || [];
  if (comp.length) {
    var seenComp = {};
    data.rows.forEach(function(r){
      var vals = comp.map(function(c){return BD4_norm_(r[c]);});
      if (vals.some(function(v){return !v;})) return;
      var key = vals.join('||');
      if (seenComp[key]) BD4_agregarError_(errores,'UNIQUE_COMPUESTO_DUPLICADO',tabla,r._fila,comp.join('+'),key,'Duplicado con fila '+seenComp[key]);
      else seenComp[key]=r._fila;
    });
  }
}

function BD4_validarCalidadCampos_(tabla, data, errores) {
  var def = BD1_MODELO_OBJETIVO[tabla];
  data.rows.forEach(function(r){
    Object.keys(r).forEach(function(campo){
      if (campo === '_fila') return;
      var v = r[campo];

      if (/^DNI$/.test(campo) && !BD4_dniValido_(v))
        BD4_agregarError_(errores,'DNI_FORMATO',tabla,r._fila,campo,v,'Debe contener exactamente 8 dígitos');

      if (/^CUI$/.test(campo) && !BD4_cuiValido_(v))
        BD4_agregarError_(errores,'CUI_FORMATO',tabla,r._fila,campo,v,'Debe almacenarse como texto numérico');

      if (/CORREO/.test(campo) && !BD4_emailValido_(v))
        BD4_agregarError_(errores,'CORREO_FORMATO',tabla,r._fila,campo,v,'Formato de correo inválido');

      var catalogo = BD4_catalogoEstado_(tabla,campo);
      if (catalogo && !BD4_esVacio_(v) && catalogo.indexOf(BD4_norm_(v)) < 0)
        BD4_agregarError_(errores,'ESTADO_FUERA_CATALOGO',tabla,r._fila,campo,v,'Permitidos: '+catalogo.join(', '));

      if (campo === 'PORCENTAJE' && !BD4_esVacio_(v)) {
        var n = Number(v);
        if (isNaN(n) || n < 0 || n > 100)
          BD4_agregarError_(errores,'PORCENTAJE_RANGO',tabla,r._fila,campo,v,'Debe estar entre 0 y 100');
      }

      var tipo = BD2_tipoColumna_(campo);
      if (!BD4_esVacio_(v) && (tipo === BD2_TIPOS.DATE || tipo === BD2_TIPOS.DATETIME) && !BD4_fechaValida_(v))
        BD4_agregarError_(errores,'TIPO_FECHA',tabla,r._fila,campo,v,'Debe ser una fecha real de Google Sheets');
    });

    if ('FECHA_INICIO' in r && 'FECHA_FIN' in r && BD4_fechaValida_(r.FECHA_INICIO) && BD4_fechaValida_(r.FECHA_FIN) && r.FECHA_FIN.getTime() < r.FECHA_INICIO.getTime())
      BD4_agregarError_(errores,'FECHAS_INCONSISTENTES',tabla,r._fila,'FECHA_INICIO/FECHA_FIN','', 'FECHA_FIN es anterior a FECHA_INICIO');
  });
}

function BD4_validarReglasNegocio_(cache, errores) {
  var expedientes = cache.expedientes ? cache.expedientes.rows : [];
  var etapas = cache.expediente_etapas ? cache.expediente_etapas.rows : [];
  var participantes = cache.expediente_estudiantes ? cache.expediente_estudiantes.rows : [];
  var sesiones = cache.taller_sesiones ? cache.taller_sesiones.rows : [];

  var cntEtapas = {}, cntPart = {};
  etapas.forEach(function(r){ var k=BD4_txt_(r.ID_EXPEDIENTE); if(k) cntEtapas[k]=(cntEtapas[k]||0)+1; });
  participantes.forEach(function(r){ var k=BD4_txt_(r.ID_EXPEDIENTE); if(k) cntPart[k]=(cntPart[k]||0)+1; });

  expedientes.forEach(function(r){
    var id=BD4_txt_(r.ID_EXPEDIENTE);
    if ((cntEtapas[id]||0) !== 7) BD4_agregarError_(errores,'REGLA_7_ETAPAS','expedientes',r._fila,'ID_EXPEDIENTE',id,'Tiene '+(cntEtapas[id]||0)+' etapas; se esperan 7');
    if ((cntPart[id]||0) < 1 || (cntPart[id]||0) > 2) BD4_agregarError_(errores,'REGLA_PARTICIPANTES','expedientes',r._fila,'ID_EXPEDIENTE',id,'Debe tener 1 o 2 participantes; tiene '+(cntPart[id]||0));
  });

  sesiones.forEach(function(r){
    var n=Number(r.NRO_SESION);
    if (!BD4_esVacio_(r.NRO_SESION) && (isNaN(n) || n < 1 || Math.floor(n)!==n))
      BD4_agregarError_(errores,'NRO_SESION_INVALIDO','taller_sesiones',r._fila,'NRO_SESION',r.NRO_SESION,'Debe ser entero mayor o igual a 1');
  });
}

function BD4_agruparErrores_(errores) {
  var porRegla={}, porTabla={};
  errores.forEach(function(e){
    porRegla[e.regla]=(porRegla[e.regla]||0)+1;
    porTabla[e.tabla]=(porTabla[e.tabla]||0)+1;
  });
  return {porRegla:porRegla, porTabla:porTabla};
}

function BD4_PROBAR_DIAGNOSTICO() {
  var ss = BD2_abrirBase_();
  var out = {
    status: true,
    fase: BD4_CONFIG.fase,
    version: BD4_CONFIG.version,
    soloLectura: true,
    spreadsheet: ss ? ss.getName() : '',
    tablasAuditadas: 0,
    registrosAuditados: 0,
    resumen: {},
    tablas: [],
    muestrasErrores: [],
    datosLegacyModificados: false,
    datosRelacionalesModificados: false,
    erroresSistema: []
  };

  if (!ss) {
    out.status=false;
    out.erroresSistema.push('No se encontró BD_TITULACION_RELACIONAL_V2.');
    Logger.log(JSON.stringify(out,null,2));
    return out;
  }

  var cache={}, errores=[];
  Object.keys(BD1_MODELO_OBJETIVO).forEach(function(t){ cache[t]=BD4_leerTabla_(ss,t); });

  Object.keys(BD1_MODELO_OBJETIVO).forEach(function(t){
    var d=cache[t], inicio=errores.length;
    BD4_validarEstructura_(t,d,errores);
    BD4_validarPkFk_(t,d,cache,errores);
    BD4_validarUnique_(t,d,errores);
    BD4_validarCalidadCampos_(t,d,errores);
    var eTabla=errores.length-inicio;
    out.tablas.push({tabla:t,registros:d.rows.length,status:eTabla===0,errores:eTabla});
    out.tablasAuditadas++;
    out.registrosAuditados+=d.rows.length;
  });

  BD4_validarReglasNegocio_(cache,errores);
  var agrupado=BD4_agruparErrores_(errores);
  out.status=errores.length===0;
  out.resumen={
    erroresTotal: errores.length,
    tablasConErrores: Object.keys(agrupado.porTabla).length,
    porRegla: agrupado.porRegla,
    porTabla: agrupado.porTabla
  };
  out.muestrasErrores=errores.slice(0,BD4_CONFIG.maxMuestrasPorRegla*3);
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

/** Salida muy compacta para evitar "Logging output too large". */
function BD4_PROBAR_RESUMEN() {
  var r=BD4_PROBAR_DIAGNOSTICO();
  var compacto={
    status:r.status,
    fase:r.fase,
    version:r.version,
    soloLectura:true,
    tablasAuditadas:r.tablasAuditadas,
    registrosAuditados:r.registrosAuditados,
    resumen:r.resumen,
    tablas:r.tablas,
    muestrasErrores:r.muestrasErrores.slice(0,15),
    datosLegacyModificados:false,
    datosRelacionalesModificados:false,
    erroresSistema:r.erroresSistema
  };
  Logger.log(JSON.stringify(compacto,null,2));
  return compacto;
}

