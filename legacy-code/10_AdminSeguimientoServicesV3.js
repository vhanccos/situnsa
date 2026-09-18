/** SOA SERVICES V3 - ADMINISTRACION + SEGUIMIENTO - REFACTORIZADO FASE 11 */

const SOA_AdministracionV3Service = Object.freeze({
  buscar(texto) {
    try { return {status:true,data:REPO_AdministracionRoutedV8.buscarPersonas(texto,30)}; }
    catch (e) { return {status:false,message:e.message,data:[]}; }
  },
  buscarAdmin(texto) {
    try { return REPO_AdministracionRoutedV8.buscarAdmin(texto,20); }
    catch (e) { return []; }
  },
  buscarExpedientes(texto) {
    try { return REPO_AdministracionRoutedV8.buscarExpedientes(texto,20); }
    catch (e) { return []; }
  },
  obtener(identificador) {
    try {
      const data = REPO_AdministracionRoutedV8.obtenerDatos(identificador);
      return data ? Object.assign({status:true},data) : {status:false,message:'No se encontró el expediente solicitado.'};
    } catch(e) { return {status:false,message:e.message}; }
  },
  guardar(datos) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      const r = REPO_AdministracionRoutedV8.actualizar(datos || {});
      return {status:true,expediente:r.expediente,message:'Información guardada correctamente.'};
    } catch(e) {
      return {status:false,message:e.message || 'No se pudo guardar la información.'};
    } finally { try { lock.releaseLock(); } catch(ignore) {} }
  },
  usuariosDelegables(correoActual) {
    try { return {status:true,data:REPO_UsuariosV3.listarDelegables(correoActual)}; }
    catch(e) { return {status:false,message:e.message,data:[]}; }
  }
});

const SOA_SeguimientoV3Service = Object.freeze({
  buscar(texto) {
    try { return {status:true,data:REPO_SeguimientoRoutedV8.buscar(texto,30)}; }
    catch(e) { return {status:false,message:e.message,data:[]}; }
  },
  buscarLegacyShape(texto) {
    try { return REPO_SeguimientoRoutedV8.buscar(texto,30); }
    catch(e) { return []; }
  },
  obtenerLegacy(dni) {
    try { return {status:true,data:REPO_SeguimientoRoutedV8.obtenerLegacy(dni)}; }
    catch(e) { return {status:false,message:e.message,data:{}}; }
  },
  obtenerLegacyShape(dni) {
    try { return REPO_SeguimientoRoutedV8.obtenerLegacy(dni); }
    catch(e) { return {}; }
  },
  guardarLegacy(datos) {
    try {
      const r = REPO_SeguimientoRoutedV8.guardarLegacy(datos);
      return {status:true,dni:r.dni,message:'Seguimiento guardado correctamente.'};
    } catch(e) { return {status:false,message:e.message}; }
  },
  obtenerProcesoPorExpediente(expediente) {
    try {
      const codigo = String(expediente || '').trim().toUpperCase();
      if (!codigo) return {status:false,message:'No se recibió el expediente.'};
      const completo = REPO_SeguimientoRoutedV8.procesoPorExpediente(codigo) || {};
      const nombres = ['Verificación Inicial de Documentos','Presentación del Borrador de Tesis','Evaluación del Expediente','Programación y Sustentación','Validaciones Institucionales','Aprobaciones Institucionales','Registro y Emisión del Título'];
      const etapas=[]; let total=0, finalizadasTotal=0;
      for(let numero=1;numero<=7;numero++) {
        const lista = completo['etapa'+numero] || [];
        const finalizadas = lista.filter(x=>String(x.estado||'').toUpperCase()==='FINALIZADO').length;
        const enCurso = lista.some(x=>String(x.estado||'').toUpperCase()==='EN CURSO');
        total += lista.length; finalizadasTotal += finalizadas;
        let estado='NO INICIADO';
        if (enCurso || finalizadas>0) estado='EN CURSO';
        if (lista.length && finalizadas===lista.length) estado='FINALIZADO';
        const primera=lista.find(x=>Boolean(x.fechaInicio));
        const conFin=lista.filter(x=>Boolean(x.fechaFin));
        const ultima=conFin.length?conFin[conFin.length-1]:null;
        const responsable=lista.find(x=>String(x.estado||'').toUpperCase()==='EN CURSO') || lista[0] || {};
        etapas.push({ numero, nombre:(lista[0]&&lista[0].nombreEtapa)||nombres[numero-1], estado,
          inicio:primera?primera.fechaInicio:'', fin:estado==='FINALIZADO'&&ultima?ultima.fechaFin:'',
          porcentaje:lista.length?Math.round(finalizadas*100/lista.length):0,
          responsable:responsable.responsable||'', subetapas:lista });
      }
      return {status:true,expediente:codigo,porcentaje:total?Math.round(finalizadasTotal*100/total):0,etapas};
    } catch(e) { return {status:false,message:e.message,etapas:[]}; }
  },
  obtenerEstadoLegacyShape(expediente) {
    const r = this.obtenerProcesoPorExpediente(expediente);
    if (!r || r.status === false) return {expediente:String(expediente || '').trim().toUpperCase(),etapas:[]};
    return {expediente:r.expediente,etapas:(r.etapas || []).map(function(e){ return {numero:e.numero,nombre:e.nombre,estado:e.estado,inicio:e.inicio,fin:e.fin,porcentaje:e.porcentaje,responsable:e.responsable}; })};
  },
  obtenerProcesoPorDni(dni) {
    try { return {status:true,data:REPO_SeguimientoRoutedV8.procesoPorDni(dni)}; }
    catch(e) { return {status:false,message:e.message}; }
  },
  obtenerProcesoPorDniLegacyShape(dni) {
    try { return REPO_SeguimientoRoutedV8.procesoPorDni(dni); }
    catch(e) { return []; }
  },
  iniciarSubetapa(datos, usuario) {
    if (datos && typeof datos === 'object') return SOA_WorkflowV11Service.iniciarSubetapa(datos.id || datos.subetapaId, datos.usuario || datos.correo || '');
    return SOA_WorkflowV11Service.iniciarSubetapa(datos, usuario || '');
  },
  finalizarSubetapa(datos, usuario) {
    if (datos && typeof datos === 'object') return SOA_WorkflowV11Service.finalizarSubetapa(datos.id || datos.subetapaId, datos.usuario || datos.correo || '');
    return SOA_WorkflowV11Service.finalizarSubetapa(datos, usuario || '');
  },
  delegar(datos, correo, usuario) {
    if (datos && typeof datos === 'object') return SOA_WorkflowV11Service.delegarSubetapa(datos.id || datos.subetapaId, datos.correo || datos.correoResponsable || '', datos.usuario || datos.delegadoPor || '');
    return SOA_WorkflowV11Service.delegarSubetapa(datos, correo || '', usuario || '');
  },
  mensaje(datos, mensaje, usuario, correoUsuario) {
    if (datos && typeof datos === 'object') return SOA_WorkflowV11Service.guardarMensaje(datos.id || datos.subetapaId, datos.mensaje || '', datos.usuario || '', datos.correoUsuario || datos.correo || '');
    return SOA_WorkflowV11Service.guardarMensaje(datos, mensaje || '', usuario || '', correoUsuario || '');
  }
});

