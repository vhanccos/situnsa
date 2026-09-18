/**
 * BD-17.6 - ELIMINACION INTEGRAL DE EXPEDIENTE
 * Elimina datos relacionales y compatibilidad del expediente.
 * NO elimina carpetas ni archivos fisicos de Google Drive.
 */
const BD176_CONFIG = Object.freeze({fase:'BD-17.6',version:'db-17.6-eliminacion-integral'});

function BD176_norm_(v){ return String(v==null?'':v).trim(); }
function BD176_up_(v){ return BD176_norm_(v).toUpperCase(); }
function BD176_sheetByTable_(tabla){ return BD5_tabla_(tabla); }
function BD176_deleteRows_(sh, predicate){
  if(!sh || sh.getLastRow()<2 || sh.getLastColumn()<1) return 0;
  var vals=sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn()).getValues();
  var headers=vals[0].map(BD176_up_), borrar=[];
  for(var i=1;i<vals.length;i++){
    var o={}; headers.forEach(function(h,j){if(h)o[h]=vals[i][j];});
    if(predicate(o,vals[i],headers)) borrar.push(i+1);
  }
  // Borrar desde abajo evita desplazar índices pendientes.
  for(var k=borrar.length-1;k>=0;k--) sh.deleteRow(borrar[k]);
  return borrar.length;
}
function BD176_deleteTableBy_(tabla,campo,valores){
  valores=(Array.isArray(valores)?valores:[valores]).map(BD176_norm_).filter(Boolean);
  if(!valores.length) return 0;
  var set={}; valores.forEach(function(v){set[v]=true;});
  try{return BD176_deleteRows_(BD176_sheetByTable_(tabla),function(o){return !!set[BD176_norm_(o[BD176_up_(campo)])];});}catch(e){return 0;}
}
function BD176_deleteCompat_(nombre,codigo,dnis){
  var ss=BD5_abrirBase_(), sh=ss&&ss.getSheetByName(nombre); if(!sh)return 0;
  var cod=BD176_up_(codigo), dset={}; (dnis||[]).forEach(function(d){dset[BD176_norm_(d)]=true;});
  return BD176_deleteRows_(sh,function(o){
    var camposCod=['N° DE TRÁMITE','N° DE TRAMITE','EXPEDIENTE','CODIGO_TRAMITE','CÓDIGO_TRÁMITE'];
    for(var i=0;i<camposCod.length;i++) if(BD176_up_(o[camposCod[i]])===cod) return true;
    var camposDni=['DNI','USUARIO'];
    for(var j=0;j<camposDni.length;j++) if(dset[BD176_norm_(o[camposDni[j]])]) return true;
    return false;
  });
}

function BD176_PREVISUALIZAR_ELIMINACION(codigo){
  codigo=BD176_up_(codigo); var exp=REPO_RelacionalV5.obtenerExpedientePorCodigo(codigo);
  if(!exp) return {status:false,message:'No se encontró el expediente '+codigo+'.'};
  var id=BD176_norm_(exp.ID_EXPEDIENTE), links=REPO_RelacionalV5.filtrar('expediente_estudiantes',{ID_EXPEDIENTE:id})||[];
  var estudiantes=links.map(function(l){return REPO_RelacionalV5.buscarUno('estudiantes','ID_ESTUDIANTE',l.ID_ESTUDIANTE);}).filter(Boolean);
  return {status:true,fase:BD176_CONFIG.fase,expediente:codigo,idExpediente:id,estudiantes:estudiantes.map(function(e){return{ID_ESTUDIANTE:e.ID_ESTUDIANTE,DNI:e.DNI,NOMBRE:e.APELLIDOS_NOMBRES};}),driveSeElimina:false,requiereConfirmacion:true};
}


function BD176_ELIMINAR_EXPEDIENTE(codigo,confirmacion){
  if(typeof BD18_ELIMINAR_EXPEDIENTE_RAPIDO==='function') return BD18_ELIMINAR_EXPEDIENTE_RAPIDO(codigo,confirmacion);
  return BD176_ELIMINAR_EXPEDIENTE_LEGACY(codigo,confirmacion);
}
function BD176_ELIMINAR_EXPEDIENTE_LEGACY(codigo,confirmacion){
  codigo=BD176_up_(codigo);
  if(confirmacion!==true) return {status:false,message:'La eliminación requiere confirmación explícita.'};
  var lock=LockService.getScriptLock(); lock.waitLock(30000);
  try{
    var exp=REPO_RelacionalV5.obtenerExpedientePorCodigo(codigo);
    if(!exp) return {status:false,message:'No se encontró el expediente '+codigo+'.'};
    var idExp=BD176_norm_(exp.ID_EXPEDIENTE);

    /* BD-18.19 · eliminar también la carpeta Drive. */
    var driveResultado = {
      status: true,
      eliminada: false,
      message: 'Sin carpeta procesada.'
    };

    if (typeof BD1819_ELIMINAR_CARPETA_EXPEDIENTE === 'function') {
      driveResultado = BD1819_ELIMINAR_CARPETA_EXPEDIENTE(codigo);

      if (driveResultado && driveResultado.status === false) {
        return {
          status:false,
          fase:'BD-18.19',
          expediente:codigo,
          message:
            'No se pudo eliminar la carpeta del expediente en Drive: ' +
            (driveResultado.message || 'Error desconocido.')
        };
      }
    }

    var links=REPO_RelacionalV5.filtrar('expediente_estudiantes',{ID_EXPEDIENTE:idExp})||[];
    var idsEst=links.map(function(x){return BD176_norm_(x.ID_ESTUDIANTE);}).filter(Boolean);
    var estudiantes=idsEst.map(function(id){return REPO_RelacionalV5.buscarUno('estudiantes','ID_ESTUDIANTE',id);}).filter(Boolean);
    var dnis=estudiantes.map(function(e){return BD176_norm_(e.DNI);}).filter(Boolean);
    var borrados={};

    // Taller: asistencia depende de matrículas.
    var mats=REPO_RelacionalV5.filtrar('taller_matriculas',{ID_EXPEDIENTE:idExp})||[];
    var idsMat=mats.map(function(x){return BD176_norm_(x.ID_MATRICULA);}).filter(Boolean);
    borrados.taller_asistencia=BD176_deleteTableBy_('taller_asistencia','ID_MATRICULA',idsMat);
    borrados.taller_matriculas=BD176_deleteTableBy_('taller_matriculas','ID_EXPEDIENTE',idExp);
    borrados.checklist_respuestas=BD176_deleteTableBy_('checklist_respuestas','ID_EXPEDIENTE',idExp);
    borrados.documentos=BD176_deleteTableBy_('documentos','ID_EXPEDIENTE',idExp);
    borrados.historial=BD176_deleteTableBy_('historial','ID_EXPEDIENTE',idExp);
    borrados.expediente_subetapas=BD176_deleteTableBy_('expediente_subetapas','ID_EXPEDIENTE',idExp);
    borrados.expediente_etapas=BD176_deleteTableBy_('expediente_etapas','ID_EXPEDIENTE',idExp);
    borrados.agenda_checklist=0;
    try{var ag=BD5_abrirBase_().getSheetByName('AGENDA_CHECKLIST'); if(ag)borrados.agenda_checklist=BD176_deleteRows_(ag,function(o){return BD176_norm_(o.ID_EXPEDIENTE)===idExp;});}catch(e){}
    borrados.expediente_estudiantes=BD176_deleteTableBy_('expediente_estudiantes','ID_EXPEDIENTE',idExp);
    borrados.expedientes=BD176_deleteTableBy_('expedientes','ID_EXPEDIENTE',idExp);

    // Estudiante/Invitado solo si ya no participa en otro expediente.
    var eliminadosEst=[], conservadosEst=[];
    idsEst.forEach(function(idEst){
      var otros=REPO_RelacionalV5.filtrar('expediente_estudiantes',{ID_ESTUDIANTE:idEst})||[];
      var est=estudiantes.find(function(x){return BD176_norm_(x.ID_ESTUDIANTE)===idEst;})||{};
      var dni=BD176_norm_(est.DNI);
      if(otros.length){conservadosEst.push(idEst);return;}
      borrados.estudiantes=(borrados.estudiantes||0)+BD176_deleteTableBy_('estudiantes','ID_ESTUDIANTE',idEst);
      if(dni) borrados.usuarios=(borrados.usuarios||0)+BD176_deleteTableBy_('usuarios','USUARIO',dni);
      eliminadosEst.push(idEst);
    });

    // Limpieza de pestañas COMPAT dentro de la base única; no toca Sheets externos.
    var compat=['COMPAT_EXPEDIENTES','COMPAT_INVITADOS','COMPAT_SEGUIMIENTO','COMPAT_SEGUIMIENTO_SUBETAPAS','COMPAT_MENSAJES_SUBETAPAS','COMPAT_ARCHIVOS_SUBETAPAS','COMPAT_HISTORIAL','COMPAT_MATRICULADOS','COMPAT_ASISTENCIA'];
    borrados.compat={}; compat.forEach(function(n){try{borrados.compat[n]=BD176_deleteCompat_(n,codigo,dnis);}catch(e){borrados.compat[n]=0;}});

    try{CacheService.getScriptCache().remove('DASHBOARD_EXPEDIENTES_V171_RELACIONAL');}catch(e){}
    return {
      status:true,
      fase:'BD-18.19',
      version:'db-18.19-eliminar-carpeta-expediente',
      expediente:codigo,
      idExpediente:idExp,
      borrados:borrados,
      estudiantesEliminados:eliminadosEst,
      estudiantesConservadosPorOtraRelacion:conservadosEst,
      driveEliminado:!!(driveResultado && driveResultado.eliminada),
      drive:driveResultado,
      message:
        driveResultado && driveResultado.eliminada
          ? 'Expediente y carpeta de Drive eliminados correctamente.'
          : 'Expediente eliminado correctamente. ' +
            (driveResultado && driveResultado.message ? driveResultado.message : '')
    };
  }catch(error){
    return {status:false,fase:BD176_CONFIG.fase,message:error&&error.message?error.message:String(error)};
  }finally{try{lock.releaseLock();}catch(e){}}
}

function BD176_PROBAR_DIAGNOSTICO(){
  var ss=BD5_abrirBase_(), tablas=['expedientes','expediente_estudiantes','expediente_etapas','expediente_subetapas','documentos','checklist_respuestas','historial','usuarios','estudiantes'];
  var faltan=tablas.filter(function(t){try{BD5_tabla_(t);return false;}catch(e){return true;}});
  var out={status:!!ss&&faltan.length===0,fase:BD176_CONFIG.fase,version:BD176_CONFIG.version,baseRelacional:!!ss,tablasDisponibles:tablas.length-faltan.length,faltantes:faltan,eliminacionDrive:false,confirmacionObligatoria:true};
  Logger.log(JSON.stringify(out,null,2)); return out;
}
