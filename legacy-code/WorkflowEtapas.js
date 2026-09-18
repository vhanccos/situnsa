/* =========================================================
   WORKFLOW ETAPAS
   SISTEMA DE TITULACIÓN USE FIPS
   ARCHIVO CONSOLIDADO

   REQUIERE SeguimientoSubetapas.gs:
   - obtenerSheetSubetapas()
   - obtenerColumnasSubetapas()
   - validarColumnasSubetapas()
   - formatearFechaSubetapa()
   - resolverExpediente()
   - permitirNuevaCargaDocumento()
   - guardarMensajeSubetapa()
   - enviarCorreoSubetapaFinalizada()

   NO REDECLARA CONSTANTES GLOBALES.
========================================================= */

function finalizarSubetapaWorkflowV3(id, usuario) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const sheet = obtenerSheetSubetapas();
    const col = obtenerColumnasSubetapas();
    validarColumnasSubetapas(col);

    const data = sheet.getDataRange().getValues();
    const ahora = new Date();

    let indiceActual = -1;
    let expediente = '';
    let etapa = 0;
    let subetapa = 0;
    let nombreEtapa = '';
    let descripcion = '';

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][col['ID'] - 1]) !== String(id)) continue;

      indiceActual = i;
      expediente = String(data[i][col['EXPEDIENTE'] - 1] || '').trim().toUpperCase();
      etapa = Number(data[i][col['ETAPA'] - 1]);
      subetapa = Number(data[i][col['SUBETAPA'] - 1]);
      nombreEtapa = String(data[i][col['NOMBRE_ETAPA'] - 1] || '');
      descripcion = String(data[i][col['DESCRIPCION'] - 1] || '');

      const estado = String(data[i][col['ESTADO'] - 1] || '');

      if (estado === 'NO INICIADO') {
        return { status: false, message: 'La subetapa todavía no está en curso.' };
      }

      if (estado === 'FINALIZADO') {
        return { status: false, silent: true, alreadyFinalized: true, message: '' };
      }

      break;
    }

    if (indiceActual === -1) {
      return { status: false, message: 'No se encontró la subetapa.' };
    }

    data[indiceActual][col['ESTADO'] - 1] = 'FINALIZADO';

    if (!data[indiceActual][col['FECHA_INICIO'] - 1]) {
      data[indiceActual][col['FECHA_INICIO'] - 1] = ahora;
      data[indiceActual][col['USUARIO_INICIO'] - 1] = usuario || '';
    }

    data[indiceActual][col['FECHA_FIN'] - 1] = ahora;
    data[indiceActual][col['USUARIO_FIN'] - 1] = usuario || '';
    data[indiceActual][col['ULTIMA_ACTUALIZACION'] - 1] = ahora;

    const siguienteNumero = subetapa + 1;
    let indiceSiguiente = -1;

    for (let i = 1; i < data.length; i++) {
      const mismoExpediente =
        String(data[i][col['EXPEDIENTE'] - 1] || '').trim().toUpperCase() === expediente;
      const mismaEtapa = Number(data[i][col['ETAPA'] - 1]) === etapa;
      const esSiguiente = Number(data[i][col['SUBETAPA'] - 1]) === siguienteNumero;

      if (mismoExpediente && mismaEtapa && esSiguiente) {
        indiceSiguiente = i;

        if (String(data[i][col['ESTADO'] - 1] || '') === 'NO INICIADO') {
          data[i][col['ESTADO'] - 1] = 'EN CURSO';
          data[i][col['FECHA_INICIO'] - 1] = ahora;
          data[i][col['USUARIO_INICIO'] - 1] = usuario || '';
          data[i][col['ULTIMA_ACTUALIZACION'] - 1] = ahora;
        }
        break;
      }
    }

    sheet.getRange(indiceActual + 1, 1, 1, sheet.getLastColumn())
      .setValues([data[indiceActual]]);

    if (indiceSiguiente !== -1) {
      sheet.getRange(indiceSiguiente + 1, 1, 1, sheet.getLastColumn())
        .setValues([data[indiceSiguiente]]);
    }

    SpreadsheetApp.flush();

    let total = 0;
    let finalizadas = 0;

    for (let i = 1; i < data.length; i++) {
      const mismoExpediente =
        String(data[i][col['EXPEDIENTE'] - 1] || '').trim().toUpperCase() === expediente;
      const mismaEtapa = Number(data[i][col['ETAPA'] - 1]) === etapa;

      if (!mismoExpediente || !mismaEtapa) continue;

      total++;
      if (String(data[i][col['ESTADO'] - 1]) === 'FINALIZADO') finalizadas++;
    }

    const porcentaje = total ? Math.round(finalizadas * 100 / total) : 0;

    try {
      enviarCorreoSubetapaFinalizada({
        expediente: expediente,
        etapa: etapa,
        nombreEtapa: nombreEtapa,
        descripcion: descripcion,
        fechaFin: formatearFechaSubetapa(ahora),
        usuario: usuario || ''
      });
    } catch (error) {
      Logger.log('CORREO SUBETAPA: ' + error.message);
    }

    return {
      status: true,
      expediente: expediente,
      etapa: etapa,
      fechaFin: formatearFechaSubetapa(ahora),
      usuarioFin: usuario || '',
      porcentaje: porcentaje,
      etapaCompleta: porcentaje === 100,
      siguienteSubetapa: indiceSiguiente !== -1
    };

  } catch (error) {
    return {
      status: false,
      message: error.message || 'No se pudo finalizar la subetapa.'
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


function confirmarPresentacionInicialWorkflowV3(id, usuario) {
  const sheet = obtenerSheetSubetapas();
  const col = obtenerColumnasSubetapas();
  validarColumnasSubetapas(col);

  const data = sheet.getDataRange().getValues();
  const ahora = new Date();
  let encontrado = false;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col['ID'] - 1]) !== String(id)) continue;

    encontrado = true;

    if (String(data[i][col['ESTADO'] - 1] || '') === 'FINALIZADO') {
      return { status: false, silent: true, alreadyFinalized: true, message: '' };
    }

    data[i][col['ESTADO'] - 1] = 'EN CURSO';

    if (!data[i][col['FECHA_INICIO'] - 1]) {
      data[i][col['FECHA_INICIO'] - 1] = ahora;
    }

    if (!data[i][col['USUARIO_INICIO'] - 1]) {
      data[i][col['USUARIO_INICIO'] - 1] = usuario || '';
    }

    data[i][col['ULTIMA_ACTUALIZACION'] - 1] = ahora;

    sheet.getRange(i + 1, 1, 1, sheet.getLastColumn()).setValues([data[i]]);
    SpreadsheetApp.flush();
    break;
  }

  if (!encontrado) {
    return { status: false, message: 'No se encontró la subetapa.' };
  }

  return finalizarSubetapaWorkflowV3(id, usuario);
}


/* Finaliza una etapa y habilita la primera subetapa de la siguiente.
   Se mantiene por compatibilidad con el Dashboard actual. */
function finalizarEtapaWorkflowV3(expediente, etapa, usuario) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    expediente = resolverExpediente(expediente);
    etapa = Number(etapa);

    if (!expediente || etapa < 1 || etapa > 7) {
      return { status: false, message: 'Expediente o etapa inválida.' };
    }

    const sheet = obtenerSheetSubetapas();
    const col = obtenerColumnasSubetapas();
    validarColumnasSubetapas(col);
    const data = sheet.getDataRange().getValues();

    const filasActuales = [];

    for (let i = 1; i < data.length; i++) {
      const exp = String(data[i][col['EXPEDIENTE'] - 1] || '').trim().toUpperCase();
      const et = Number(data[i][col['ETAPA'] - 1]);

      if (exp === expediente && et === etapa) filasActuales.push(i);
    }

    if (!filasActuales.length) {
      return { status: false, message: 'No existen subetapas para esta etapa.' };
    }

    const pendientes = filasActuales.filter(function(indice) {
      return String(data[indice][col['ESTADO'] - 1] || '') !== 'FINALIZADO';
    });

    if (pendientes.length) {
      return {
        status: false,
        message: 'Primero debe finalizar todas las subetapas de la etapa.'
      };
    }

    if (etapa === 7) {
      return {
        status: true,
        etapaFinalizada: true,
        siguienteEtapa: null,
        message: 'La última etapa quedó finalizada.'
      };
    }

    const siguienteEtapa = etapa + 1;
    let indicePrimera = -1;
    let menorSubetapa = Number.MAX_SAFE_INTEGER;

    for (let i = 1; i < data.length; i++) {
      const exp = String(data[i][col['EXPEDIENTE'] - 1] || '').trim().toUpperCase();
      const et = Number(data[i][col['ETAPA'] - 1]);
      const sub = Number(data[i][col['SUBETAPA'] - 1]);

      if (exp === expediente && et === siguienteEtapa && sub < menorSubetapa) {
        menorSubetapa = sub;
        indicePrimera = i;
      }
    }

    if (indicePrimera === -1) {
      return {
        status: false,
        message: 'No se encontraron las subetapas de la siguiente etapa.'
      };
    }

    const ahora = new Date();

    if (String(data[indicePrimera][col['ESTADO'] - 1] || '') === 'NO INICIADO') {
      data[indicePrimera][col['ESTADO'] - 1] = 'EN CURSO';
      data[indicePrimera][col['FECHA_INICIO'] - 1] = ahora;
      data[indicePrimera][col['USUARIO_INICIO'] - 1] = usuario || '';
      data[indicePrimera][col['ULTIMA_ACTUALIZACION'] - 1] = ahora;

      sheet.getRange(indicePrimera + 1, 1, 1, sheet.getLastColumn())
        .setValues([data[indicePrimera]]);

      SpreadsheetApp.flush();
    }

    return {
      status: true,
      etapaFinalizada: true,
      siguienteEtapa: siguienteEtapa,
      fechaInicioSiguiente: formatearFechaSubetapa(
        data[indicePrimera][col['FECHA_INICIO'] - 1]
      ),
      message: 'Etapa finalizada y siguiente etapa habilitada.'
    };

  } catch (error) {
    return {
      status: false,
      message: error.message || 'No se pudo finalizar la etapa.'
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


/* Reabre la última subetapa de la etapa y vuelve a bloquear las posteriores. */
function rehacerEtapaWorkflowV3(expediente, etapa, usuario) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    expediente = resolverExpediente(expediente);
    etapa = Number(etapa);

    if (!expediente || etapa < 1 || etapa > 7) {
      return { status: false, message: 'Expediente o etapa inválida.' };
    }

    const sheet = obtenerSheetSubetapas();
    const col = obtenerColumnasSubetapas();
    validarColumnasSubetapas(col);
    const data = sheet.getDataRange().getValues();

    let indiceUltima = -1;
    let mayorSubetapa = -1;

    for (let i = 1; i < data.length; i++) {
      const exp = String(data[i][col['EXPEDIENTE'] - 1] || '').trim().toUpperCase();
      const et = Number(data[i][col['ETAPA'] - 1]);
      const sub = Number(data[i][col['SUBETAPA'] - 1]);

      if (exp === expediente && et === etapa && sub > mayorSubetapa) {
        mayorSubetapa = sub;
        indiceUltima = i;
      }
    }

    if (indiceUltima === -1) {
      return { status: false, message: 'No se encontró la etapa.' };
    }

    const ahora = new Date();

    data[indiceUltima][col['ESTADO'] - 1] = 'EN CURSO';
    data[indiceUltima][col['FECHA_FIN'] - 1] = '';
    data[indiceUltima][col['USUARIO_FIN'] - 1] = '';

    if (!data[indiceUltima][col['FECHA_INICIO'] - 1]) {
      data[indiceUltima][col['FECHA_INICIO'] - 1] = ahora;
    }

    data[indiceUltima][col['ULTIMA_ACTUALIZACION'] - 1] = ahora;

    for (let i = 1; i < data.length; i++) {
      const exp = String(data[i][col['EXPEDIENTE'] - 1] || '').trim().toUpperCase();
      const et = Number(data[i][col['ETAPA'] - 1]);

      if (exp !== expediente || et <= etapa) continue;

      data[i][col['ESTADO'] - 1] = 'NO INICIADO';
      data[i][col['FECHA_INICIO'] - 1] = '';
      data[i][col['FECHA_FIN'] - 1] = '';
      data[i][col['USUARIO_INICIO'] - 1] = '';
      data[i][col['USUARIO_FIN'] - 1] = '';
      data[i][col['ULTIMA_ACTUALIZACION'] - 1] = ahora;
    }

    if (data.length > 1) {
      sheet.getRange(2, 1, data.length - 1, sheet.getLastColumn())
        .setValues(data.slice(1));
    }

    SpreadsheetApp.flush();

    return {
      status: true,
      message: 'La etapa fue reabierta correctamente.'
    };

  } catch (error) {
    return {
      status: false,
      message: error.message || 'No se pudo rehacer la etapa.'
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


function autorizarNuevaCargaConMensajeV3(id, usuario, correoUsuario, mensaje) {
  const resultado = permitirNuevaCargaDocumento(id, usuario);

  if (!resultado || !resultado.status) {
    return resultado || {
      status: false,
      message: 'No se pudo habilitar la nueva carga.'
    };
  }

  mensaje = String(mensaje || '').trim();
  let mensajeGuardado = false;

  if (mensaje) {
    const rMensaje = guardarMensajeSubetapa(
      id,
      mensaje,
      usuario || '',
      correoUsuario || ''
    );

    mensajeGuardado = Boolean(rMensaje && rMensaje.status);
  }

  return {
    status: true,
    mensajeGuardado: mensajeGuardado,
    message: mensaje
      ? 'Nueva carga habilitada y mensaje registrado.'
      : 'Nueva carga habilitada correctamente.'
  };
}


/* =========================================================
   AVANZAR A LA SIGUIENTE ETAPA Y DERIVAR
   Integra la funcionalidad que antes estaba en FlujoEtapasV23.
========================================================= */

function avanzarSiguienteEtapaV23(
  expediente,
  etapaActual,
  correoResponsable,
  usuarioActual
) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    expediente = resolverExpediente(expediente);
    etapaActual = Number(etapaActual);
    correoResponsable = String(correoResponsable || '').trim().toLowerCase();
    usuarioActual = String(usuarioActual || '').trim();

    if (!expediente) {
      return { status: false, message: 'No se pudo identificar el expediente.' };
    }

    if (!etapaActual || etapaActual < 1 || etapaActual >= 7) {
      return { status: false, message: 'No existe una etapa siguiente disponible.' };
    }

    const sheet = obtenerSheetSubetapas();
    const col = obtenerColumnasSubetapas();
    validarColumnasSubetapas(col);
    const data = sheet.getDataRange().getValues();

    let totalActual = 0;
    let finalizadasActual = 0;

    for (let i = 1; i < data.length; i++) {
      const expFila = String(data[i][col['EXPEDIENTE'] - 1] || '').trim().toUpperCase();
      const etapaFila = Number(data[i][col['ETAPA'] - 1]);

      if (expFila === expediente && etapaFila === etapaActual) {
        totalActual++;
        if (String(data[i][col['ESTADO'] - 1] || '') === 'FINALIZADO') {
          finalizadasActual++;
        }
      }
    }

    if (!totalActual || finalizadasActual !== totalActual) {
      return {
        status: false,
        message: 'Aún existen subetapas pendientes en la Etapa ' + etapaActual + '.'
      };
    }

    const siguienteEtapa = etapaActual + 1;
    let indiceObjetivo = -1;
    let menorSubetapa = Number.MAX_SAFE_INTEGER;

    for (let i = 1; i < data.length; i++) {
      const expFila = String(data[i][col['EXPEDIENTE'] - 1] || '').trim().toUpperCase();
      const etapaFila = Number(data[i][col['ETAPA'] - 1]);
      const subetapaFila = Number(data[i][col['SUBETAPA'] - 1]);

      if (
        expFila === expediente &&
        etapaFila === siguienteEtapa &&
        subetapaFila < menorSubetapa
      ) {
        menorSubetapa = subetapaFila;
        indiceObjetivo = i;
      }
    }

    if (indiceObjetivo === -1) {
      return {
        status: false,
        message: 'No se encontró la primera subetapa de la Etapa ' + siguienteEtapa + '.'
      };
    }

    const ahora = new Date();
    const estadoActual = String(data[indiceObjetivo][col['ESTADO'] - 1] || '');

    if (estadoActual !== 'FINALIZADO') {
      data[indiceObjetivo][col['ESTADO'] - 1] = 'EN CURSO';
    }

    if (!data[indiceObjetivo][col['FECHA_INICIO'] - 1]) {
      data[indiceObjetivo][col['FECHA_INICIO'] - 1] = ahora;
    }

    if (!data[indiceObjetivo][col['USUARIO_INICIO'] - 1]) {
      data[indiceObjetivo][col['USUARIO_INICIO'] - 1] = usuarioActual;
    }

    if (correoResponsable) {
      data[indiceObjetivo][col['CORREO_RESPONSABLE'] - 1] = correoResponsable;
      data[indiceObjetivo][col['DELEGADO_POR'] - 1] = usuarioActual;
      data[indiceObjetivo][col['FECHA_DELEGACION'] - 1] = ahora;
    }

    data[indiceObjetivo][col['ULTIMA_ACTUALIZACION'] - 1] = ahora;

    sheet.getRange(indiceObjetivo + 1, 1, 1, sheet.getLastColumn())
      .setValues([data[indiceObjetivo]]);

    SpreadsheetApp.flush();

    const nombreEtapa = String(data[indiceObjetivo][col['NOMBRE_ETAPA'] - 1] || '');
    const descripcion = String(data[indiceObjetivo][col['DESCRIPCION'] - 1] || '');
    const subetapa = Number(data[indiceObjetivo][col['SUBETAPA'] - 1] || 1);

    if (correoResponsable) {
      enviarCorreoDerivacionEtapaV23({
        expediente: expediente,
        etapa: siguienteEtapa,
        nombreEtapa: nombreEtapa,
        subetapa: subetapa,
        descripcion: descripcion,
        nuevoResponsable: correoResponsable,
        usuarioActual: usuarioActual,
        fecha: formatearFechaSubetapa(ahora)
      });
    }

    return {
      status: true,
      expediente: expediente,
      etapa: siguienteEtapa,
      nombreEtapa: nombreEtapa,
      subetapa: subetapa,
      descripcion: descripcion,
      responsable: correoResponsable,
      fechaInicio: formatearFechaSubetapa(ahora)
    };

  } catch (error) {
    return {
      status: false,
      message: error.message || 'No se pudo avanzar a la siguiente etapa.'
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


function enviarCorreoDerivacionEtapaV23(datos) {
  try {
    const correo = String(datos.nuevoResponsable || '').trim().toLowerCase();
    if (!correo) return;

    let alumno = {};

    try {
      alumno = obtenerDatosAlumnoAdmin(datos.expediente) || {};
    } catch (error) {
      Logger.log(
        'No se pudieron recuperar los datos del alumno para el correo: ' +
        error.message
      );
    }

    const participantes = [];

    if (alumno.nombres || alumno.dni) {
      participantes.push(
        (alumno.nombres || '-') +
        ' | DNI: ' + (alumno.dni || '-') +
        ' | Programa: ' + (alumno.programas || '-')
      );
    }

    if (Number(alumno.grupo || 1) === 2 && (alumno.nombres02 || alumno.dni02)) {
      participantes.push(
        (alumno.nombres02 || '-') +
        ' | DNI: ' + (alumno.dni02 || '-') +
        ' | Programa: ' + (alumno.programas02 || '-')
      );
    }

    const asunto =
      'Sistema de Titulación USE FIPS - Expediente derivado: ' +
      (datos.expediente || '');

    const cuerpo =
      'Se le ha derivado una nueva actividad en el Sistema de Titulación USE FIPS.\n\n' +
      'DATOS DEL EXPEDIENTE\n' +
      'Expediente: ' + (datos.expediente || '-') + '\n' +
      'Tesista(s):\n' +
      (participantes.length
        ? participantes.map(function(p) { return '- ' + p; }).join('\n')
        : '- No disponible') +
      '\n\n' +
      'ACTIVIDAD DERIVADA\n' +
      'Etapa: ' + (datos.etapa || '-') + ' - ' + (datos.nombreEtapa || '-') + '\n' +
      'Subetapa: ' + (datos.subetapa || '-') + ' - ' + (datos.descripcion || '-') + '\n' +
      'Derivado por: ' + (datos.usuarioActual || '-') + '\n' +
      'Fecha y hora: ' + (datos.fecha || '-') + '\n\n' +
      'A partir de este momento usted figura como responsable de esta actividad. ' +
      'Por favor, revise el expediente en el Sistema de Titulación para continuar con el trámite.';

    GmailApp.sendEmail(correo, asunto, cuerpo);

  } catch (error) {
    Logger.log('ERROR enviarCorreoDerivacionEtapaV23: ' + error.message);
  }
}


/* =========================================================
   COMPATIBILIDAD CONSOLIDADA - WORKFLOW V4/V26
   Contratos usados por Dashboard.html.
========================================================= */

function confirmarPresentacionInicialWorkflowV4(id, usuario){
  const sheet=obtenerSheetSubetapas();
  const col=obtenerColumnasSubetapas();
  validarColumnasSubetapas(col);
  const data=sheet.getDataRange().getValues();
  const ahora=new Date();
  for(let i=1;i<data.length;i++){
    if(String(data[i][col['ID']-1])!==String(id)) continue;
    if(String(data[i][col['ESTADO']-1]||'')==='NO INICIADO'){
      data[i][col['ESTADO']-1]='EN CURSO';
      data[i][col['FECHA_INICIO']-1]=ahora;
      data[i][col['USUARIO_INICIO']-1]=usuario||'';
      data[i][col['ULTIMA_ACTUALIZACION']-1]=ahora;
      sheet.getRange(i+1,1,1,sheet.getLastColumn()).setValues([data[i]]);
      SpreadsheetApp.flush();
    }
    break;
  }
  return finalizarSubetapaWorkflowV4(id,usuario);
}

function avanzarEtapaWorkflowV4(expediente, etapaActual, usuario){
  const lock=LockService.getScriptLock();
  try{
    lock.waitLock(30000);
    expediente=String(expediente||'').trim().toUpperCase();
    etapaActual=Number(etapaActual);
    if(etapaActual>=7) return {status:true,siguienteEtapa:null,message:'El proceso ya se encuentra en la última etapa.'};
    const sheet=obtenerSheetSubetapas();
    const col=obtenerColumnasSubetapas();
    validarColumnasSubetapas(col);
    const data=sheet.getDataRange().getValues();
    let total=0,fin=0;
    for(let i=1;i<data.length;i++){
      const exp=String(data[i][col['EXPEDIENTE']-1]||'').trim().toUpperCase();
      const et=Number(data[i][col['ETAPA']-1]);
      if(exp===expediente && et===etapaActual){ total++; if(String(data[i][col['ESTADO']-1]||'')==='FINALIZADO') fin++; }
    }
    if(!total || fin!==total) return {status:false,message:'Finalice todas las subetapas antes de continuar.'};
    const siguiente=etapaActual+1; let idx=-1,min=999999;
    for(let i=1;i<data.length;i++){
      const exp=String(data[i][col['EXPEDIENTE']-1]||'').trim().toUpperCase();
      const et=Number(data[i][col['ETAPA']-1]); const sub=Number(data[i][col['SUBETAPA']-1]);
      if(exp===expediente && et===siguiente && sub<min){min=sub;idx=i;}
    }
    if(idx===-1) return {status:false,message:'No se encontraron subetapas de la siguiente etapa.'};
    if(String(data[idx][col['ESTADO']-1]||'')==='NO INICIADO'){
      const ahora=new Date();
      data[idx][col['ESTADO']-1]='EN CURSO'; data[idx][col['FECHA_INICIO']-1]=ahora;
      data[idx][col['USUARIO_INICIO']-1]=usuario||''; data[idx][col['ULTIMA_ACTUALIZACION']-1]=ahora;
      sheet.getRange(idx+1,1,1,sheet.getLastColumn()).setValues([data[idx]]); SpreadsheetApp.flush();
    }
    return {status:true,siguienteEtapa:siguiente,message:'Siguiente etapa habilitada correctamente.'};
  }catch(error){ return {status:false,message:error.message||'No se pudo avanzar a la siguiente etapa.'}; }
  finally{try{lock.releaseLock();}catch(e){}}
}

function notificarFinalizacionSubetapaV26(expediente, etapa, nombreEtapa, descripcion, fechaFin, usuario){
  try{
    if(typeof enviarCorreoSubetapaFinalizada!=='function') return {status:false,message:'No está disponible la función de notificación.'};
    enviarCorreoSubetapaFinalizada({expediente:expediente,etapa:etapa,nombreEtapa:nombreEtapa,descripcion:descripcion,fechaFin:fechaFin,usuario:usuario||''});
    return {status:true};
  }catch(error){ Logger.log('NOTIFICACIÓN FINALIZACIÓN: '+error.message); return {status:false,message:error.message}; }
}
