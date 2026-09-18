/**
 * ==============================================================
 * SOA SERVICES V2 - EXPEDIENTE
 * FASE 2 MVC + SOA
 * ==============================================================
 */

const SOA_ExpedienteV2Service = Object.freeze({
  crear(datos) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      const solicitud = DOMAIN_Expediente.prepararSolicitud(datos);
      DOMAIN_Expediente.validarSolicitud(solicitud, REPO_ExpedienteRoutedV7.dnisRegistrados());
      const codigo = REPO_ExpedienteRoutedV7.siguienteCodigo();
      REPO_ExpedienteRoutedV7.insertar(solicitud, codigo);
      return {
        status:true,
        message:'Tu expediente ha sido registrado correctamente',
        codigo:codigo,
        expediente:codigo,
        grupo:solicitud.grupo,
        participantes:solicitud.participantes,
        admin:solicitud.admin,
        correo_admin:solicitud.correo_admin
      };
    } catch (error) {
      Logger.log('ERROR SOA_ExpedienteV2Service.crear: ' + (error.stack || error.message || error));
      return {status:false, message:error.message || 'No se pudo registrar el expediente'};
    } finally {
      try { lock.releaseLock(); } catch (e) {}
    }
  },

  siguienteCodigo() {
    try { return REPO_ExpedienteRoutedV7.siguienteCodigo(); }
    catch (error) { throw new Error(error.message || 'No se pudo generar el código de expediente.'); }
  }
});

const SOA_InvitadoV2Service = Object.freeze({
  registrar(participante, contexto) {
    return REPO_AuthUsuariosV6.registrarInvitado({
      dni:participante.dni, cui:participante.cui, nombre:participante.nombre,
      correo:participante.correo, expediente:contexto.expediente, programa:participante.programa
    });
  }
});

const SOA_SeguimientoV2Service = Object.freeze({
  crearEtapas(participante, contexto) {
    if (typeof crearSeguimientoInicial !== 'function') return null;
    return crearSeguimientoInicial({
      dni:participante.dni, expediente:contexto.expediente,
      nombre:participante.nombre, correo:participante.correo,
      usuario:contexto.admin || ''
    });
  },
  crearSubetapas(participante, contexto) {
    if (typeof crearSubetapasIniciales !== 'function') return null;
    return crearSubetapasIniciales({dni:participante.dni, expediente:contexto.expediente});
  }
});

const SOA_HistorialV2Service = Object.freeze({
  registrarAlta(participante, contexto) {
    return registrarHistorialExpediente({
      dni:participante.dni, expediente:contexto.expediente, nombres:participante.nombre,
      etapa:'1', accion:'REGISTRO', descripcion:'Expediente registrado correctamente',
      usuario:contexto.admin || '', correoUsuario:contexto.correo_admin || '', observacion:'',
      visibilidad:'PUBLICO', estado:'SUCCESS'
    });
  }
});

const SOA_DocumentoV2Service = Object.freeze({
  generar(datos) {
    if (!datos) return {status:false,message:'No se recibieron datos para generar la documentación'};
    if (!Array.isArray(datos.participantes) || !datos.participantes.length) {
      return {status:false,message:'No se recibieron participantes para generar las carpetas'};
    }
    if (typeof iniciarCopias !== 'function') {
      return {status:false,message:'No se encontró la función iniciarCopias(datos). Verifique CopiasExpedientes.gs.'};
    }
    try {
      const respuesta = iniciarCopias(datos);
      return {
        status: !respuesta || respuesta.status !== false,
        message: respuesta && respuesta.message ? respuesta.message : 'Generación de documentación iniciada',
        respuesta: respuesta || null
      };
    } catch (error) {
      return {status:false,message:error.message || 'No se pudo iniciar la generación de carpetas'};
    }
  }
});

const SOA_ExpedienteComplementarioV2Service = Object.freeze({
  procesar(datos) {
    if (typeof BD16_activo_ === 'function' && BD16_activo_()) return BD16_COMPLEMENTARIOS_DIRECTOS(datos);
    if (!datos) return {status:false,message:'No se recibieron datos para los registros complementarios'};
    const contexto = {
      expediente:String(datos.expediente || '').trim().toUpperCase(),
      admin:String(datos.admin || '').trim(),
      correo_admin:String(datos.correo_admin || '').trim()
    };
    const participantes = Array.isArray(datos.participantes)
      ? datos.participantes.map(p => DOMAIN_Expediente.normalizarParticipante(p)) : [];
    if (!contexto.expediente) return {status:false,message:'No se recibió el número de expediente'};
    if (!participantes.length) return {status:false,message:'No se recibieron participantes'};

    const resultado = {status:true,expediente:contexto.expediente,invitados:[],seguimientoEtapas:[],seguimientoSubetapas:[],historial:[],errores:[]};
    const ejecutar = (modulo, participante, indice, destino, fn) => {
      try {
        const r = fn();
        destino.push({participante:indice+1,dni:participante.dni,status:!r || r.status !== false,respuesta:r || null});
        if (r && r.status === false) {
          resultado.status=false;
          resultado.errores.push({modulo:modulo,participante:indice+1,dni:participante.dni,mensaje:r.message || 'Operación no completada'});
        }
      } catch (e) {
        resultado.status=false;
        resultado.errores.push({modulo:modulo,participante:indice+1,dni:participante.dni,mensaje:e.message});
      }
    };

    participantes.forEach((p,index) => {
      ejecutar('INVITADOS_TITULACION',p,index,resultado.invitados,() => SOA_InvitadoV2Service.registrar(p,contexto));
      ejecutar('SEGUIMIENTO_ETAPAS',p,index,resultado.seguimientoEtapas,() => SOA_SeguimientoV2Service.crearEtapas(p,contexto));
      if (index === 0) ejecutar('SEGUIMIENTO_SUBETAPAS',p,index,resultado.seguimientoSubetapas,() => SOA_SeguimientoV2Service.crearSubetapas(p,contexto));
      ejecutar('HISTORIAL',p,index,resultado.historial,() => SOA_HistorialV2Service.registrarAlta(p,contexto));
    });

    resultado.message = resultado.errores.length
      ? 'El expediente fue registrado, pero algunos registros complementarios presentaron errores'
      : 'Los registros complementarios fueron creados correctamente';
    return resultado;
  }
});
