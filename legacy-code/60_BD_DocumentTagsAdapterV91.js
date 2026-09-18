/**
 * BD-09.3 - ADAPTADOR DE ETIQUETAS DOCUMENTALES NORMALIZADO
 * Mantiene exactamente las 54 etiquetas legacy y entrega fechas/horas
 * en formato documental. No modifica las tablas fuente.
 */

function BD91_DOCUMENT_TAGS(codigoTramite) {
  var code = BD91_tagStr_(codigoTramite);
  if (!code) throw new Error('codigoTramite es obligatorio.');

  var repo = (typeof REPO_RelacionalV5 !== 'undefined') ? REPO_RelacionalV5 : null;
  if (!repo) throw new Error('REPO_RelacionalV5 no disponible.');

  var exp = repo.obtenerExpedientePorCodigo(code);
  if (!exp) throw new Error('No existe expediente relacional: ' + code);

  var links = repo.filtrar('expediente_estudiantes', {ID_EXPEDIENTE: exp.ID_EXPEDIENTE}) || [];
  links.sort(function(a,b){ return Number(a.ORDEN_PARTICIPANTE || 0) - Number(b.ORDEN_PARTICIPANTE || 0); });

  var estudiantes = repo.listar('estudiantes') || [];
  var programas = repo.listar('programas') || [];
  var usuarios = repo.listar('usuarios') || [];

  function estudianteOrden(n) {
    var link = links.filter(function(x){ return Number(x.ORDEN_PARTICIPANTE || 0) === n; })[0];
    if (!link) return null;
    return estudiantes.filter(function(e){
      return BD91_tagStr_(e.ID_ESTUDIANTE) === BD91_tagStr_(link.ID_ESTUDIANTE);
    })[0] || null;
  }

  function programaNombre(est) {
    if (!est) return '';
    var p = programas.filter(function(x){
      return BD91_tagStr_(x.ID_PROGRAMA) === BD91_tagStr_(est.ID_PROGRAMA);
    })[0];
    return p ? BD91_tagStr_(p.NOMBRE) : '';
  }

  function usuarioAdmin() {
    return usuarios.filter(function(u){
      return BD91_tagStr_(u.ID_USUARIO) === BD91_tagStr_(exp.ID_USUARIO_ADMIN);
    })[0] || null;
  }

  var e1 = estudianteOrden(1);
  var e2 = estudianteOrden(2);
  var u = usuarioAdmin();
  var p1 = programaNombre(e1);
  var p2 = programaNombre(e2);
  var tags = {};

  tags['N° DE TRÁMITE'] = code;
  tags['GRUPO'] = BD91_tagStr_(exp.GRUPO);
  tags['FECHA DE EXP'] = BD93_formatDate_(exp.FECHA_EXP || exp.FECHA_CREACION || '');
  tags['HORA DE EXP'] = BD93_formatTime_(exp.HORA_EXP || '');
  tags['ADMIN'] = u ? BD91_tagStr_(u.NOMBRE || u.USUARIO) : '';
  tags['CORREO_ADMIN'] = u ? BD91_tagStr_(u.CORREO).toLowerCase() : '';

  BD91_setEstudianteTags_(tags, e1, p1, '');
  BD91_setEstudianteTags_(tags, e2, p2, '02');

  tags['FECHA PRESENTACION'] = BD93_formatDateOrPreserve_(exp.FECHA_PRESENTACION || '');
  tags['FECHA DE APERTURA'] = BD93_formatDateOrPreserve_(exp.FECHA_APERTURA || '');
  tags['MODALIDAD'] = BD91_tagStr_(exp.MODALIDAD);
  tags['MODALIDAD02'] = BD91_tagStr_(exp.MODALIDAD_02);
  tags['DECRETO'] = BD91_tagStr_(exp.DECRETO);
  tags['TESIS'] = BD91_tagStr_(exp.TESIS);
  tags['TESIS02'] = BD91_tagStr_(exp.TESIS_02);
  tags['RECOMENDACION'] = BD91_tagStr_(exp.RECOMENDACION);
  tags['PRESIDENTE'] = BD91_tagStr_(exp.PRESIDENTE);
  tags['ASESOR'] = BD91_tagStr_(exp.ASESOR);
  tags['ASE_MINU'] = BD91_tagStr_(exp.ASE_MINU) || BD91_title_(exp.ASESOR);
  tags['SECRETARIO'] = BD91_tagStr_(exp.SECRETARIO);
  tags['CO ASESOR'] = BD91_tagStr_(exp.CO_ASESOR);
  tags['FECHA'] = BD93_formatDateOrPreserve_(exp.FECHA || '');
  tags['OFICIO'] = BD91_tagStr_(exp.OFICIO);
  tags['INTEGRANTE'] = BD91_tagStr_(exp.INTEGRANTE);
  tags['PRESIDENTE02'] = BD91_tagStr_(exp.PRESIDENTE_02);
  tags['SECRETARIO02'] = BD91_tagStr_(exp.SECRETARIO_02);
  tags['SUPLENTE02'] = BD91_tagStr_(exp.SUPLENTE_02);
  tags['DECANAL'] = BD91_tagStr_(exp.DECANAL);
  tags['FECHA - ACTAS'] = BD93_formatDateOrPreserve_(exp.FECHA_ACTAS || '');
  tags['HORAS - ACTAS'] = BD93_formatTimeOrPreserve_(exp.HORAS_ACTAS || '');
  tags['LUGAR DE SUSTENTACION'] = BD91_tagStr_(exp.LUGAR_SUSTENTACION);
  tags['MODALIDAD FINAL'] = BD91_tagStr_(exp.MODALIDAD_FINAL);

  var ordered = {};
  BD91_LEGACY_COLUMNS.forEach(function(k){ ordered[k] = (k in tags) ? tags[k] : ''; });
  return ordered;
}

function BD91_setEstudianteTags_(tags, est, programa, suffix) {
  var s = suffix || '';
  var nombre = est ? BD91_tagStr_(est.APELLIDOS_NOMBRES) : '';
  var correo = est ? BD91_tagStr_(est.CORREO) : '';
  tags['NOMBRES'+s] = nombre;
  tags['NOM_MIN'+s] = BD91_title_(nombre);
  tags['DNI'+s] = est ? BD91_tagStr_(est.DNI) : '';
  tags['PROGRAMAS'+s] = BD91_tagStr_(programa);
  tags['PROGR_MIN'+s] = BD91_title_(programa);
  tags['CORREO'+s] = correo;
  tags['CORREO_MIN'+s] = correo.toLowerCase();
  tags['CUI'+s] = est ? BD91_tagStr_(est.CUI) : '';
  tags['TELEFONO'+s] = est ? BD91_tagStr_(est.TELEFONO) : '';
  tags['NACIONALIDAD'+s] = est ? BD91_tagStr_(est.NACIONALIDAD) : '';
  tags['CIUDAD'+s] = est ? BD91_tagStr_(est.CIUDAD) : '';
  tags['DIRECCION'+s] = est ? BD91_tagStr_(est.DIRECCION) : '';
}

function BD91_title_(v) {
  var txt = BD91_tagStr_(v).toLowerCase();
  if (!txt) return '';
  var menores = { 'de':1, 'del':1, 'la':1, 'las':1, 'los':1, 'y':1, 'en':1, 'e':1 };
  return txt.split(/\s+/).map(function(w,i){
    if (i > 0 && menores[w]) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

function BD91_tagStr_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

function BD93_timezone_() {
  try { return Session.getScriptTimeZone() || 'America/Lima'; } catch(e) { return 'America/Lima'; }
}

function BD93_parseDate_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return v;
  var s = BD91_tagStr_(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    var iso = new Date(s); if (!isNaN(iso.getTime())) return iso;
  }
  var m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    var d = new Date(Number(m[3]), Number(m[2])-1, Number(m[1]));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function BD93_formatDate_(v) {
  var d = BD93_parseDate_(v);
  if (!d) return '';
  return Utilities.formatDate(d, BD93_timezone_(), 'dd/MM/yyyy');
}

function BD93_formatDateOrPreserve_(v) {
  if (v === null || v === undefined || v === '') return '';
  var d = BD93_parseDate_(v);
  return d ? Utilities.formatDate(d, BD93_timezone_(), 'dd/MM/yyyy') : BD91_tagStr_(v);
}

function BD93_parseTime_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return v;
  var s = BD91_tagStr_(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    var iso = new Date(s); if (!isNaN(iso.getTime())) return iso;
  }
  var m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|A\.M\.|P\.M\.)?$/i);
  if (m) {
    var h = Number(m[1]), min = Number(m[2]), sec = Number(m[3] || 0), ap = (m[4] || '').toUpperCase();
    if (ap.indexOf('P') === 0 && h < 12) h += 12;
    if (ap.indexOf('A') === 0 && h === 12) h = 0;
    var d = new Date(1899,11,30,h,min,sec);
    return d;
  }
  return null;
}

function BD93_formatTime_(v) {
  var d = BD93_parseTime_(v);
  if (!d) return '';
  return Utilities.formatDate(d, BD93_timezone_(), 'HH:mm');
}

function BD93_formatTimeOrPreserve_(v) {
  if (v === null || v === undefined || v === '') return '';
  var d = BD93_parseTime_(v);
  return d ? Utilities.formatDate(d, BD93_timezone_(), 'HH:mm') : BD91_tagStr_(v);
}

function BD91_PROBAR_ETIQUETAS(codigoTramite) {
  var tags = BD91_DOCUMENT_TAGS(codigoTramite);
  var keys = Object.keys(tags);
  var faltantes = BD91_LEGACY_COLUMNS.filter(function(k){ return !(k in tags); });
  var result = {
    status: faltantes.length === 0 && keys.length === BD91_LEGACY_COLUMNS.length,
    fase: 'BD-09.3',
    version: 'db-9.3-contrato-documental-normalizado',
    codigo: codigoTramite,
    esperadas: BD91_LEGACY_COLUMNS.length,
    devueltas: keys.length,
    faltantes: faltantes,
    tags: tags
  };
  Logger.log(JSON.stringify(result,null,2));
  return result;
}


