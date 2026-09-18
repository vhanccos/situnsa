/**
 * ==============================================================
 * BD-18.21 - MIGRACIÓN CONTROLADA DE HISTORIAL DE TITULACIÓN
 * ==============================================================
 * ORIGEN:
 * https://docs.google.com/spreadsheets/d/
 * 1t67Jl0u5-oaM0ioRxRfxAMTMLACKIRgKlkttDlSul6M/
 *
 * HOJA: TRAMITES
 *
 * DESTINO:
 * BD_TITULACION_RELACIONAL_V2
 *
 * OBJETIVO:
 * - Crear un expediente nuevo por registro válido.
 * - Crear estudiante(s), relaciones, etapas, subetapas e historial.
 * - Guardar datos administrativos históricos.
 * - Crear carpeta Drive del expediente y copiar su documentación.
 * - Generar credenciales de invitado cuando exista DNI + CUI.
 * - Registrar todo en MIGRACION_HISTORIAL_LOG.
 *
 * SEGURIDAD:
 * - NO corrige DNIs de 7 dígitos automáticamente.
 * - NO inventa DNI para TESISTA_2.
 * - NO migra programas que no existan en el catálogo oficial.
 * - NO duplica DNIs ya migrados / existentes.
 * - Es reanudable e idempotente mediante log + validaciones.
 * ==============================================================
 */

const BD1821_CONFIG = Object.freeze({
  fase: 'BD-18.25',
  version: 'db-18.25-programas-dinamicos',
  sourceSpreadsheetId: '1t67Jl0u5-oaM0ioRxRfxAMTMLACKIRgKlkttDlSul6M',
  sourceSheetName: 'TRAMITES',
  logSheetName: 'MIGRACION_HISTORIAL_LOG',
  reportSheetName: 'MIGRACION_NO_REALIZADOS',
  propertyCursor: 'BD1821_MIGRATION_CURSOR',
  propertyRunning: 'BD1821_MIGRATION_RUNNING',
  triggerHandler: 'BD1821_PROCESAR_LOTE_AUTOMATICO',
  batchSize: 2
});

function BD1821_txt_(v) {
  return String(v == null ? '' : v).trim();
}

function BD1821_digits_(v) {
  return BD1821_txt_(v).replace(/\D/g, '');
}

function BD1822_tokens8_(v) {
  var s = BD1821_txt_(v);
  if (!s) return [];
  var tokens = s.match(/\d+/g) || [];
  return tokens.map(function(x){ return String(x).trim(); })
    .filter(function(x){ return /^\d{8}$/.test(x); });
}

function BD1822_nombreKey_(v) {
  return BD1821_key_(v)
    .replace(/\bY\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function BD1822_partirNombres_(row, hm) {
  var nombreTotal = BD1821_txt_(BD1821_val_(row,hm,'NOMBRES'));

  /*
   * BD-18.23:
   * SOLO la columna NOMBRES determina si existen dos participantes.
   *
   * Ejemplo:
   * "CELADIT GRANADOS Y PONCE ARREDONDO"
   * => 2 participantes.
   *
   * Las columnas TESISTA_1 / TESISTA_2 son datos históricos auxiliares
   * y NO convierten por sí solas una fila en expediente de dos personas.
   */
  var partes = nombreTotal.split(/\s+[Yy]\s+/);

  if (partes.length === 2 &&
      BD1821_txt_(partes[0]) &&
      BD1821_txt_(partes[1])) {
    return [BD1821_txt_(partes[0]), BD1821_txt_(partes[1])];
  }

  return [nombreTotal];
}

function BD1822_indiceFuente_(sheet, hm) {
  var last = sheet.getLastRow();
  var data = last > 1
    ? sheet.getRange(2,1,last-1,sheet.getLastColumn()).getValues()
    : [];
  var idx = {};
  data.forEach(function(row, i) {
    var fila = i + 2;
    var nombres = BD1822_partirNombres_(row, hm);
    if (nombres.length === 1) {
      var k = BD1822_nombreKey_(nombres[0]);
      if (k) {
        if (!idx[k]) idx[k] = [];
        idx[k].push({fila:fila,row:row});
      }
    }
  });
  return idx;
}

function BD1822_buscarDatosPersona_(nombre, indice, hm) {
  var k = BD1822_nombreKey_(nombre);
  var candidatos = indice[k] || [];
  for (var i=0;i<candidatos.length;i++) {
    var r = candidatos[i].row;
    var dni = BD1822_tokens8_(BD1821_val_(r,hm,'DNI'));
    var cui = BD1822_tokens8_(BD1821_val_(r,hm,'CUI'));
    if (dni.length === 1 && cui.length === 1) {
      return {
        fila:candidatos[i].fila,
        dni:dni[0],
        cui:cui[0],
        correo:BD1821_txt_(BD1821_val_(r,hm,'CORREO')),
        telefono:BD1821_txt_(BD1821_val_(r,hm,'TELEFONO')),
        nacionalidad:BD1821_txt_(BD1821_val_(r,hm,'NACIONALIDAD')),
        ciudad:BD1821_txt_(BD1821_val_(r,hm,'CIUDAD')),
        direccion:BD1821_txt_(BD1821_val_(r,hm,'DIRECCION'))
      };
    }
  }
  return null;
}

function BD1822_resolverParticipantes_(fila, row, hm, indice) {
  var nombres = BD1822_partirNombres_(row, hm);
  var dnisFila = BD1822_tokens8_(BD1821_val_(row,hm,'DNI'));
  var cuisFila = BD1822_tokens8_(BD1821_val_(row,hm,'CUI'));

  var participantes = [];
  var consumidas = [];

  if (nombres.length === 1) {
    participantes.push({
      nombre:nombres[0],
      dni:dnisFila.length === 1 ? dnisFila[0] : '',
      cui:cuisFila.length === 1 ? cuisFila[0] : '',
      filaFuente:fila,
      correo:BD1821_txt_(BD1821_val_(row,hm,'CORREO')),
      telefono:BD1821_txt_(BD1821_val_(row,hm,'TELEFONO')),
      nacionalidad:BD1821_txt_(BD1821_val_(row,hm,'NACIONALIDAD')),
      ciudad:BD1821_txt_(BD1821_val_(row,hm,'CIUDAD')),
      direccion:BD1821_txt_(BD1821_val_(row,hm,'DIRECCION'))
    });
    return {participantes:participantes,consumidas:consumidas};
  }

  /*
   * REGLA PRINCIPAL:
   * NOMBRE1 Y NOMBRE2
   * DNI: DNI1, DNI2
   * CUI: CUI1, CUI2
   *
   * => DNI1/CUI1 para NOMBRE1
   * => DNI2/CUI2 para NOMBRE2
   */
  if (dnisFila.length >= 2 && cuisFila.length >= 2) {
    participantes.push({
      nombre:nombres[0],
      dni:dnisFila[0],
      cui:cuisFila[0],
      filaFuente:fila,
      correo:BD1821_txt_(BD1821_val_(row,hm,'CORREO')),
      telefono:BD1821_txt_(BD1821_val_(row,hm,'TELEFONO')),
      nacionalidad:BD1821_txt_(BD1821_val_(row,hm,'NACIONALIDAD')),
      ciudad:BD1821_txt_(BD1821_val_(row,hm,'CIUDAD')),
      direccion:BD1821_txt_(BD1821_val_(row,hm,'DIRECCION'))
    });
    participantes.push({
      nombre:nombres[1],
      dni:dnisFila[1],
      cui:cuisFila[1],
      filaFuente:fila,
      correo:'',
      telefono:'',
      nacionalidad:'',
      ciudad:'',
      direccion:''
    });
    return {participantes:participantes,consumidas:consumidas};
  }

  /*
   * BD-18.24 - regla confirmada:
   * Si NOMBRES = "NOMBRE1 Y NOMBRE2" y la fila tiene un solo DNI/CUI,
   * ese DNI/CUI corresponde al PRIMER nombre escrito en NOMBRES.
   *
   * TESISTA_1/TESISTA_2 NO cambian la propiedad del DNI/CUI principal;
   * solo son datos históricos auxiliares.
   */
  var propietario = 0;

  var base = [
    {
      nombre:nombres[0], dni:'', cui:'', filaFuente:fila,
      correo:'', telefono:'', nacionalidad:'', ciudad:'', direccion:''
    },
    {
      nombre:nombres[1], dni:'', cui:'', filaFuente:fila,
      correo:'', telefono:'', nacionalidad:'', ciudad:'', direccion:''
    }
  ];

  if (dnisFila.length === 1) base[propietario].dni = dnisFila[0];
  if (cuisFila.length === 1) base[propietario].cui = cuisFila[0];

  base[propietario].correo = BD1821_txt_(BD1821_val_(row,hm,'CORREO'));
  base[propietario].telefono = BD1821_txt_(BD1821_val_(row,hm,'TELEFONO'));
  base[propietario].nacionalidad = BD1821_txt_(BD1821_val_(row,hm,'NACIONALIDAD'));
  base[propietario].ciudad = BD1821_txt_(BD1821_val_(row,hm,'CIUDAD'));
  base[propietario].direccion = BD1821_txt_(BD1821_val_(row,hm,'DIRECCION'));

  /*
   * DNI_TESISTA_2 solo se usa si coincide con el nombre del segundo
   * participante histórico y el valor es válido.
   */
  var tesista2 = BD1821_txt_(BD1821_val_(row,hm,'TESISTA_2'));
  var dni2col = BD1822_tokens8_(BD1821_val_(row,hm,'DNI_TESISTA_2'));

  if (tesista2 && dni2col.length === 1) {
    var kT2 = BD1822_nombreKey_(tesista2);
    if (kT2 === BD1822_nombreKey_(nombres[0])) base[0].dni = base[0].dni || dni2col[0];
    if (kT2 === BD1822_nombreKey_(nombres[1])) base[1].dni = base[1].dni || dni2col[0];
  }

  /*
   * Completar lo que falte buscando el registro individual del mismo nombre.
   */
  for (var i=0;i<2;i++) {
    if (/^\d{8}$/.test(base[i].dni) && /^\d{8}$/.test(base[i].cui)) continue;

    var encontrado = BD1822_buscarDatosPersona_(base[i].nombre, indice, hm);
    if (encontrado && encontrado.fila !== fila) {
      if (!/^\d{8}$/.test(base[i].dni)) base[i].dni = encontrado.dni;
      if (!/^\d{8}$/.test(base[i].cui)) base[i].cui = encontrado.cui;
      if (!base[i].correo) base[i].correo = encontrado.correo;
      if (!base[i].telefono) base[i].telefono = encontrado.telefono;
      if (!base[i].nacionalidad) base[i].nacionalidad = encontrado.nacionalidad;
      if (!base[i].ciudad) base[i].ciudad = encontrado.ciudad;
      if (!base[i].direccion) base[i].direccion = encontrado.direccion;
      base[i].filaFuente = encontrado.fila;
      consumidas.push(encontrado.fila);
    }
  }

  participantes = base;

  return {
    participantes:participantes,
    consumidas:consumidas.filter(function(x,i,a){return a.indexOf(x)===i;})
  };
}

function BD1822_validarParticipantes_(resueltos, dnisFuente) {
  var errores = [];
  var vistos = {};

  resueltos.participantes.forEach(function(p, idx) {
    var n = idx + 1;
    if (!BD1821_txt_(p.nombre)) errores.push('Falta nombre del participante ' + n + '.');
    if (!/^\d{8}$/.test(BD1821_txt_(p.dni))) {
      errores.push('DNI inválido del participante ' + n + ': ' + (p.dni || 'VACÍO') + '.');
    }
    if (!/^\d{8}$/.test(BD1821_txt_(p.cui))) {
      errores.push('CUI inválido del participante ' + n + ': ' + (p.cui || 'VACÍO') + '.');
    }
    if (p.dni && vistos[p.dni]) {
      errores.push('DNI repetido dentro del mismo registro: ' + p.dni + '.');
    }
    if (p.dni) vistos[p.dni] = true;
  });

  return errores;
}

function BD1821_key_(v) {
  return BD1821_txt_(v)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function BD1821_fecha_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return v;
  }
  return v;
}

function BD1821_hora_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone() || 'America/Lima', 'HH:mm');
  }
  return BD1821_txt_(v);
}

function BD1821_origen_() {
  return SpreadsheetApp
    .openById(BD1821_CONFIG.sourceSpreadsheetId)
    .getSheetByName(BD1821_CONFIG.sourceSheetName);
}

function BD1821_headers_(sheet) {
  var lc = sheet.getLastColumn();
  var h = sheet.getRange(1, 1, 1, lc).getValues()[0];
  var map = {};
  h.forEach(function(x, i) {
    var k = BD1821_key_(x);
    if (k) map[k] = i;
  });
  return { headers: h, map: map };
}

function BD1821_val_(row, hm, nombre) {
  var i = hm.map[BD1821_key_(nombre)];
  return i == null ? '' : row[i];
}

function BD1821_programas_() {
  var rows = REPO_RelacionalV5.listar('programas') || [];
  var map = {};
  rows.forEach(function(p) {
    var nombre = BD1821_txt_(p.NOMBRE || p.CODIGO);
    if (nombre) map[BD1821_key_(nombre)] = p;
  });
  return map;
}

function BD1821_programaCanonico_(nombre, programas) {
  var original = BD1821_txt_(nombre);
  if (!original) return '';

  var p = programas[BD1821_key_(original)];
  return p ? BD1821_txt_(p.NOMBRE || p.CODIGO) : original;
}

function BD1825_codigoPrograma_(nombre) {
  var base = BD1821_key_(nombre)
    .replace(/\bSEGUNDA\b|\bESPECIALIDAD\b|\bEN\b|\bDE\b|\bDEL\b|\bLA\b|\bEL\b|\bY\b/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  var partes = base.split(' ').filter(Boolean);
  var codigo = partes.map(function(x){ return x.substring(0,3); }).join('');
  if (!codigo) codigo = 'PROG';
  codigo = codigo.substring(0,12);

  var existentes = REPO_RelacionalV5.listar('programas') || [];
  var usados = {};
  existentes.forEach(function(p){
    usados[BD1821_key_(p.CODIGO)] = true;
  });

  var candidato = codigo;
  var n = 2;
  while (usados[BD1821_key_(candidato)]) {
    candidato = (codigo.substring(0,10) + n).substring(0,12);
    n++;
  }
  return candidato;
}

function BD1825_asegurarPrograma_(nombre) {
  var original = BD1821_txt_(nombre);
  if (!original) return {status:false,message:'Programa vacío.'};

  var existentes = REPO_RelacionalV5.listar('programas') || [];
  for (var i=0;i<existentes.length;i++) {
    if (BD1821_key_(existentes[i].NOMBRE) === BD1821_key_(original) ||
        BD1821_key_(existentes[i].CODIGO) === BD1821_key_(original)) {
      return {
        status:true,
        creado:false,
        id:BD1821_txt_(existentes[i].ID_PROGRAMA),
        codigo:BD1821_txt_(existentes[i].CODIGO),
        nombre:BD1821_txt_(existentes[i].NOMBRE || original)
      };
    }
  }

  var codigo = BD1825_codigoPrograma_(original);
  var id = 'PRG_' + codigo;

  BD16_upsert_('programas','ID_PROGRAMA',{
    ID_PROGRAMA:id,
    CODIGO:codigo,
    NOMBRE:original,
    ESTADO_REGISTRO:'ACTIVO'
  });

  return {
    status:true,
    creado:true,
    id:id,
    codigo:codigo,
    nombre:original
  };
}

function BD1821_logSheet_() {
  var ss = BD5_abrirBase_();
  var sh = ss.getSheetByName(BD1821_CONFIG.logSheetName);

  if (!sh) {
    sh = ss.insertSheet(BD1821_CONFIG.logSheetName);
    sh.getRange(1, 1, 1, 10).setValues([[
      'FILA_ORIGEN',
      'FECHA_PROCESO',
      'ESTADO',
      'EXPEDIENTE',
      'DNI',
      'NOMBRE',
      'PROGRAMA',
      'CARPETA_ID',
      'MENSAJE',
      'VERSION'
    ]]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function BD1821_logExiste_(fila) {
  var sh = BD1821_logSheet_();
  if (sh.getLastRow() < 2) return false;
  var vals = sh.getRange(2,1,sh.getLastRow()-1,3).getValues();
  for (var i=0;i<vals.length;i++) {
    if (Number(vals[i][0]) === Number(fila) &&
        ['MIGRADO','CONSUMIDO_SEGUNDO_PARTICIPANTE'].indexOf(
          String(vals[i][2] || '').toUpperCase()
        ) >= 0) {
      return true;
    }
  }
  return false;
}

function BD1821_log_(d) {
  var sh = BD1821_logSheet_();
  sh.appendRow([
    d.fila || '',
    new Date(),
    d.estado || '',
    d.expediente || '',
    d.dni || '',
    d.nombre || '',
    d.programa || '',
    d.carpetaId || '',
    d.mensaje || '',
    BD1821_CONFIG.version
  ]);
}

function BD1821_dniExisteDestino_(dni) {
  dni = BD1821_digits_(dni);
  if (!dni) return false;
  try {
    return !!REPO_RelacionalV5.obtenerEstudiantePorDni(dni);
  } catch (e) {
    return false;
  }
}

function BD1821_dnisFuente_() {
  var sh = BD1821_origen_();
  var hm = BD1821_headers_(sh);
  var last = sh.getLastRow();
  var data = last > 1
    ? sh.getRange(2,1,last-1,sh.getLastColumn()).getValues()
    : [];
  var c = {};
  data.forEach(function(r) {
    var d = BD1821_digits_(BD1821_val_(r,hm,'DNI'));
    if (d) c[d] = (c[d] || 0) + 1;
  });
  return c;
}

function BD1821_analizarFila_(fila, row, hm, programas, dnisFuente, indiceFuente) {
  var nombre = BD1821_txt_(BD1821_val_(row,hm,'NOMBRES'));
  var programaOriginal = BD1821_txt_(BD1821_val_(row,hm,'PROGRAMA'));
  var programa = BD1821_programaCanonico_(programaOriginal, programas);
  var resueltos = BD1822_resolverParticipantes_(fila,row,hm,indiceFuente);
  var errores = BD1822_validarParticipantes_(resueltos,dnisFuente);

  if (!nombre) errores.push('Falta NOMBRES.');
  resueltos.participantes.forEach(function(p) {
    if (/^\d{8}$/.test(p.dni) && BD1821_dniExisteDestino_(p.dni)) {
      errores.push('El DNI ya existe en BD_TITULACION_RELACIONAL_V2: ' + p.dni);
    }
  });

  return {
    fila:fila,
    apto:errores.length === 0,
    nombre:nombre,
    dni:resueltos.participantes.length ? resueltos.participantes[0].dni : '',
    cui:resueltos.participantes.length ? resueltos.participantes[0].cui : '',
    programa:programa || programaOriginal,
    programaOriginal:programaOriginal,
    participantes:resueltos.participantes,
    consumidas:resueltos.consumidas,
    errores:errores,
    advertencias:[]
  };
}

function BD1821_PREVISUALIZAR_MIGRACION_HISTORIAL() {
  var sh = BD1821_origen_();
  if (!sh) throw new Error('No se encontró la hoja TRAMITES.');

  var hm = BD1821_headers_(sh);
  var last = sh.getLastRow();
  var lc = sh.getLastColumn();
  var rows = last > 1 ? sh.getRange(2,1,last-1,lc).getValues() : [];
  var programas = BD1821_programas_();
  var dnisFuente = BD1821_dnisFuente_();
  var indiceFuente = BD1822_indiceFuente_(sh,hm);

  var resultado = {
    status: true,
    fase: BD1821_CONFIG.fase,
    version: BD1821_CONFIG.version,
    origen: BD1821_CONFIG.sourceSpreadsheetId,
    hoja: BD1821_CONFIG.sourceSheetName,
    modificaDatos: false,
    totalRegistros: 0,
    aptos: 0,
    bloqueados: 0,
    yaMigrados: 0,
    detalleBloqueados: [],
    advertencias: [],
    programasNuevos: []
  };

  var programasNuevosMap = {};

  rows.forEach(function(row, i) {
    var fila = i + 2;
    var tieneDato = row.some(function(v){ return BD1821_txt_(v) !== ''; });
    if (!tieneDato) return;

    resultado.totalRegistros++;

    if (BD1821_logExiste_(fila)) {
      resultado.yaMigrados++;
      return;
    }

    var a = BD1821_analizarFila_(fila,row,hm,programas,dnisFuente,indiceFuente);

    var programaOriginalFila = BD1821_txt_(BD1821_val_(row,hm,'PROGRAMA'));
    if (programaOriginalFila && !programas[BD1821_key_(programaOriginalFila)]) {
      programasNuevosMap[BD1821_key_(programaOriginalFila)] = programaOriginalFila;
    }

    if (a.apto) {
      resultado.aptos++;
      if (a.advertencias.length) {
        resultado.advertencias.push({
          fila:fila,
          dni:a.dni,
          nombre:a.nombre,
          advertencias:a.advertencias
        });
      }
    } else {
      resultado.bloqueados++;
      resultado.detalleBloqueados.push({
        fila:fila,
        dni:a.dni,
        nombre:a.nombre,
        programa:a.programaOriginal,
        errores:a.errores
      });
    }
  });

  resultado.programasNuevos = Object.keys(programasNuevosMap).map(function(k){
    return programasNuevosMap[k];
  }).sort();

  Logger.log(JSON.stringify(resultado,null,2));
  return resultado;
}

function BD1821_datosFila_(fila, row, hm, programas, indiceFuente) {
  var programa = BD1821_programaCanonico_(
    BD1821_val_(row,hm,'PROGRAMA'),
    programas
  );

  var resueltos = BD1822_resolverParticipantes_(fila,row,hm,indiceFuente);
  var participantes = resueltos.participantes.map(function(p) {
    return {
      nombre:p.nombre,
      dni:p.dni,
      programa:programa,
      correo:p.correo || '',
      cui:p.cui || '',
      telefono:p.telefono || '',
      nacionalidad:p.nacionalidad || '',
      ciudad:p.ciudad || '',
      direccion:p.direccion || ''
    };
  });

  return {
    participantes:participantes,
    consumidas:resueltos.consumidas,
    grupo:participantes.length,
    tesis:BD1821_txt_(BD1821_val_(row,hm,'TESIS')),
    admin:'',
    correo_admin:'',
    adminHistorico:{
      modalidad:BD1821_txt_(BD1821_val_(row,hm,'MODALIDAD')),
      decreto:BD1821_txt_(BD1821_val_(row,hm,'DECRETO')),
      tesis:BD1821_txt_(BD1821_val_(row,hm,'TESIS')),
      recomendacion:BD1821_txt_(BD1821_val_(row,hm,'RECOMENDACION')),
      presidente:BD1821_txt_(BD1821_val_(row,hm,'PRESIDENTE')),
      asesor:BD1821_txt_(BD1821_val_(row,hm,'ASESOR')),
      secretario:BD1821_txt_(BD1821_val_(row,hm,'SECRETARIO')),
      coasesor:BD1821_txt_(BD1821_val_(row,hm,'CO ASESOR')),
      fechaPresentacion:BD1821_fecha_(BD1821_val_(row,hm,'FECHA_PRESENTACION')),
      fechaApertura:BD1821_fecha_(BD1821_val_(row,hm,'FECHA DE APERTURA')),
      oficio:BD1821_txt_(BD1821_val_(row,hm,'OFICIO')),
      integrante:BD1821_txt_(BD1821_val_(row,hm,'INTEGRANTE')),
      presidenteEtapa02:BD1821_txt_(BD1821_val_(row,hm,'PRESIDENTE02')),
      secretarioEtapa02:BD1821_txt_(BD1821_val_(row,hm,'SECRETARIO02')),
      suplenteEtapa02:BD1821_txt_(BD1821_val_(row,hm,'SUPLENTE02')),
      decanal:BD1821_txt_(BD1821_val_(row,hm,'DECANAL')),
      fechaActa:BD1821_fecha_(BD1821_val_(row,hm,'FECHA - ACTAS')),
      horaActa:BD1821_hora_(BD1821_val_(row,hm,'HORAS - ACTAS')),
      lugarSustentacion:BD1821_txt_(BD1821_val_(row,hm,'LUGAR DE SUSTENTACION')),
      modalidadFinal:BD1821_txt_(BD1821_val_(row,hm,'Modalidad final'))
    }
  };
}

function BD1821_MIGRAR_FILA(fila) {
  fila = Number(fila || 0);
  if (fila < 2) return {status:false,message:'Fila inválida.'};

  if (BD1821_logExiste_(fila)) {
    return {status:true,omitido:true,fila:fila,message:'La fila ya fue migrada.'};
  }

  var sh = BD1821_origen_();
  var hm = BD1821_headers_(sh);
  var row = sh.getRange(fila,1,1,sh.getLastColumn()).getValues()[0];
  var programas = BD1821_programas_();
  var dnisFuente = BD1821_dnisFuente_();
  var indiceFuente = BD1822_indiceFuente_(sh,hm);
  var analisis = BD1821_analizarFila_(fila,row,hm,programas,dnisFuente,indiceFuente);

  if (!analisis.apto) {
    BD1821_log_({
      fila:fila,
      estado:'BLOQUEADO',
      dni:analisis.dni,
      nombre:analisis.nombre,
      programa:analisis.programaOriginal,
      mensaje:analisis.errores.join(' | ')
    });
    return {
      status:false,
      bloqueado:true,
      fila:fila,
      errores:analisis.errores
    };
  }

  var programaOriginalMigrar = BD1821_txt_(BD1821_val_(row,hm,'PROGRAMA'));
  var programaCreado = null;

  if (programaOriginalMigrar) {
    programaCreado = BD1825_asegurarPrograma_(programaOriginalMigrar);
    if (!programaCreado.status) {
      BD1821_log_({
        fila:fila,
        estado:'ERROR_PROGRAMA',
        dni:analisis.dni,
        nombre:analisis.nombre,
        programa:programaOriginalMigrar,
        mensaje:programaCreado.message || 'No se pudo registrar el programa.'
      });
      return {status:false,fila:fila,message:programaCreado.message || 'Error de programa.'};
    }
    programas = BD1821_programas_();
  }

  var datos = BD1821_datosFila_(fila,row,hm,programas,indiceFuente);
  var alta = SOA_ExpedienteV2Service.crear(datos);

  if (!alta || alta.status === false) {
    BD1821_log_({
      fila:fila,
      estado:'ERROR_ALTA',
      dni:analisis.dni,
      nombre:analisis.nombre,
      programa:analisis.programa,
      mensaje:alta && alta.message ? alta.message : 'No se pudo crear expediente.'
    });
    return alta || {status:false,message:'No se pudo crear expediente.'};
  }

  var codigo = alta.expediente || alta.codigo;
  var adminData = Object.assign({},datos.adminHistorico,{
    expediente:codigo,
    grupo:datos.grupo,
    dni:datos.participantes[0].dni,
    nombres:datos.participantes[0].nombre,
    programas:datos.participantes[0].programa,
    correo:datos.participantes[0].correo,
    cui:datos.participantes[0].cui,
    telefono:datos.participantes[0].telefono,
    nacionalidad:datos.participantes[0].nacionalidad,
    ciudad:datos.participantes[0].ciudad,
    direccion:datos.participantes[0].direccion
  });

  if (datos.participantes.length > 1) {
    var p2=datos.participantes[1];
    adminData.dni02=p2.dni;
    adminData.nombres02=p2.nombre;
    adminData.programas02=p2.programa;
    adminData.correo02=p2.correo;
    adminData.cui02=p2.cui;
  }

  try {
    BD172_actualizarAdminRelacional(adminData);
  } catch(eAdmin) {
    BD1821_log_({
      fila:fila,
      estado:'ERROR_DATOS_ADMIN',
      expediente:codigo,
      dni:analisis.dni,
      nombre:analisis.nombre,
      programa:analisis.programa,
      mensaje:eAdmin.message
    });
    return {status:false,expediente:codigo,message:eAdmin.message};
  }

  var complementarios = null;
  try {
    complementarios = BD16_COMPLEMENTARIOS_DIRECTOS({
      expediente:codigo,
      participantes:datos.participantes
    });
  } catch(eComp) {
    complementarios={status:false,message:eComp.message};
  }

  var drive = iniciarCopias({
    expediente:codigo,
    participantes:datos.participantes
  });

  if (!drive || drive.status === false) {
    BD1821_log_({
      fila:fila,
      estado:'ERROR_DRIVE',
      expediente:codigo,
      dni:analisis.dni,
      nombre:analisis.nombre,
      programa:analisis.programa,
      mensaje:drive && drive.message ? drive.message : 'Error al crear carpeta/documentos.'
    });
    return {
      status:false,
      expediente:codigo,
      datosCreados:true,
      drive:false,
      message:drive && drive.message ? drive.message : 'Error Drive'
    };
  }

  BD1821_log_({
    fila:fila,
    estado:'MIGRADO',
    expediente:codigo,
    dni:analisis.dni,
    nombre:analisis.nombre,
    programa:analisis.programa,
    carpetaId:drive.carpetaId || '',
    mensaje:'Expediente, datos, etapas, carpeta y documentos creados.'
  });

  (datos.consumidas || []).forEach(function(filaConsumida) {
    BD1821_log_({
      fila:filaConsumida,
      estado:'CONSUMIDO_SEGUNDO_PARTICIPANTE',
      expediente:codigo,
      dni:'',
      nombre:'',
      programa:analisis.programa,
      carpetaId:drive.carpetaId || '',
      mensaje:'Registro usado como segundo participante del expediente ' + codigo + '.'
    });
  });

  return {
    status:true,
    fila:fila,
    expediente:codigo,
    dni:analisis.dni,
    carpetaId:drive.carpetaId || '',
    carpetaUrl:drive.carpetaUrl || '',
    participantes:datos.participantes.length,
    complementarios:complementarios,
    programa:programaCreado,
    message:'Migración completada.'
  };
}

function BD1821_MIGRAR_FILA_2_PRUEBA() {
  return BD1821_MIGRAR_FILA(2);
}

function BD1821_PROCESAR_LOTE_AUTOMATICO() {
  var props=PropertiesService.getScriptProperties();
  var running=String(props.getProperty(BD1821_CONFIG.propertyRunning)||'FALSE').toUpperCase()==='TRUE';
  if(!running) return {status:true,detenido:true,message:'Migración no activa.'};

  var sh=BD1821_origen_();
  var last=sh.getLastRow();
  var cursor=Number(props.getProperty(BD1821_CONFIG.propertyCursor)||2);
  var procesados=0, migrados=0, bloqueados=0, errores=0;

  while(cursor<=last && procesados<BD1821_CONFIG.batchSize){
    try{
      var r=BD1821_MIGRAR_FILA(cursor);
      if(r && r.status && !r.omitido)migrados++;
      else if(r && r.bloqueado)bloqueados++;
      else if(r && !r.status)errores++;
    }catch(e){
      errores++;
      BD1821_log_({
        fila:cursor,
        estado:'ERROR',
        mensaje:e.message || String(e)
      });
    }
    cursor++;
    procesados++;
    props.setProperty(BD1821_CONFIG.propertyCursor,String(cursor));
  }

  if(cursor>last){
    BD1821_DETENER_MIGRACION_AUTOMATICA();
    var reporte = BD1822_GENERAR_REPORTE_NO_MIGRADOS();
    return {
      status:true,
      finalizado:true,
      cursor:cursor,
      procesados:procesados,
      migrados:migrados,
      bloqueados:bloqueados,
      errores:errores,
      reporteNoMigrados:reporte,
      message:'Migración automática finalizada. Se generó el reporte de no migrados.'
    };
  }

  return {
    status:true,
    finalizado:false,
    cursor:cursor,
    procesados:procesados,
    migrados:migrados,
    bloqueados:bloqueados,
    errores:errores
  };
}

function BD1821_INICIAR_MIGRACION_AUTOMATICA() {
  var preview=BD1821_PREVISUALIZAR_MIGRACION_HISTORIAL();

  if(!preview.status) throw new Error('La previsualización no es válida.');

  var props=PropertiesService.getScriptProperties();
  props.setProperty(BD1821_CONFIG.propertyRunning,'TRUE');

  var cursor=Number(props.getProperty(BD1821_CONFIG.propertyCursor)||2);
  if(cursor<2) cursor=2;
  props.setProperty(BD1821_CONFIG.propertyCursor,String(cursor));

  var existe=false;
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()===BD1821_CONFIG.triggerHandler) existe=true;
  });

  if(!existe){
    ScriptApp.newTrigger(BD1821_CONFIG.triggerHandler)
      .timeBased()
      .everyMinutes(1)
      .create();
  }

  return {
    status:true,
    fase:BD1821_CONFIG.fase,
    cursor:cursor,
    lote:BD1821_CONFIG.batchSize,
    triggerCada:'1 minuto',
    aptosPreview:preview.aptos,
    bloqueadosPreview:preview.bloqueados,
    message:'Migración automática iniciada. Solo se migrarán filas aptas.'
  };
}

function BD1821_DETENER_MIGRACION_AUTOMATICA() {
  var props=PropertiesService.getScriptProperties();
  props.setProperty(BD1821_CONFIG.propertyRunning,'FALSE');

  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()===BD1821_CONFIG.triggerHandler){
      try{ScriptApp.deleteTrigger(t);}catch(e){}
    }
  });

  return {status:true,message:'Migración automática detenida.'};
}

function BD1821_REINICIAR_CURSOR() {
  var props=PropertiesService.getScriptProperties();
  props.setProperty(BD1821_CONFIG.propertyCursor,'2');
  return {status:true,cursor:2,message:'Cursor reiniciado. No elimina registros ya migrados.'};
}

function BD1821_ESTADO_MIGRACION() {
  var props=PropertiesService.getScriptProperties();
  var sh=BD1821_origen_();
  return {
    status:true,
    fase:BD1821_CONFIG.fase,
    version:BD1821_CONFIG.version,
    activa:String(props.getProperty(BD1821_CONFIG.propertyRunning)||'FALSE').toUpperCase()==='TRUE',
    cursor:Number(props.getProperty(BD1821_CONFIG.propertyCursor)||2),
    ultimaFila:sh.getLastRow(),
    lote:BD1821_CONFIG.batchSize,
    log:BD1821_CONFIG.logSheetName
  };
}

function BD1822_GENERAR_REPORTE_NO_MIGRADOS() {
  var ss = BD5_abrirBase_();
  var nombre = BD1821_CONFIG.reportSheetName;
  var sh = ss.getSheetByName(nombre);
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet(nombre);

  sh.getRange(1,1,1,7).setValues([[
    'FILA_ORIGEN',
    'NOMBRE',
    'DNI',
    'CUI',
    'PROGRAMA',
    'ESTADO',
    'MOTIVO'
  ]]);

  var origen = BD1821_origen_();
  var hm = BD1821_headers_(origen);
  var programas = BD1821_programas_();
  var dnisFuente = BD1821_dnisFuente_();
  var indiceFuente = BD1822_indiceFuente_(origen,hm);
  var last = origen.getLastRow();
  var salida = [];

  for (var fila=2; fila<=last; fila++) {
    if (BD1821_logExiste_(fila)) continue;

    var row = origen.getRange(fila,1,1,origen.getLastColumn()).getValues()[0];
    var tieneDato = row.some(function(v){ return BD1821_txt_(v) !== ''; });
    if (!tieneDato) continue;

    var a = BD1821_analizarFila_(fila,row,hm,programas,dnisFuente,indiceFuente);

    if (!a.apto) {
      salida.push([
        fila,
        a.nombre,
        a.dni,
        a.cui,
        a.programaOriginal,
        'NO MIGRADO',
        a.errores.join(' | ')
      ]);
    }
  }

  if (salida.length) {
    sh.getRange(2,1,salida.length,7).setValues(salida);
  }
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1,7);

  var out = {
    status:true,
    fase:'BD-18.25',
    hoja:nombre,
    noMigrados:salida.length
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function BD1821_PROBAR_DIAGNOSTICO() {
  var origen=BD1821_origen_();
  var base=BD5_abrirBase_();
  var resultado={
    status:!!origen && !!base &&
      typeof SOA_ExpedienteV2Service!=='undefined' &&
      typeof BD172_actualizarAdminRelacional==='function' &&
      typeof iniciarCopias==='function',
    fase:BD1821_CONFIG.fase,
    version:BD1821_CONFIG.version,
    origenAccesible:!!origen,
    destinoAccesible:!!base,
    altaExpedientes:typeof SOA_ExpedienteV2Service!=='undefined',
    actualizacionAdmin:typeof BD172_actualizarAdminRelacional==='function',
    drive:typeof iniciarCopias==='function',
    modificaDatos:false
  };
  Logger.log(JSON.stringify(resultado,null,2));
  return resultado;
}
