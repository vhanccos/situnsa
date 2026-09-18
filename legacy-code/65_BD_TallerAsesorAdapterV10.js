/** BD-10 - Adapter Taller/Asesor/Matrículas/Sesiones/Asistencia */
const BD10_CONFIG = Object.freeze({version:'db-10.0-taller-asesor-router'});
function BD10_norm_(v){return String(v==null?'':v).trim();}
function BD10_mode_(){return (typeof BD6_GET_CONFIG==='function'?BD6_GET_CONFIG().readMode:'MIRROR');}
function BD10_relList_(tabla){try{return REPO_RelacionalV5.listar(tabla)||[];}catch(e){return[];}}
function BD10_legacyAsesores_(){return REPO_TallerCoreV13.listarAsesores(true)||[];}
function BD10_legacyTalleres_(){return REPO_TallerCoreV13.listarTalleres(true)||[];}
function BD10_relAsesores_(){return BD10_relList_('asesores').map(function(x){return {id:x.ID_ASESOR,grado:x.GRADO,nombres:x.APELLIDOS_NOMBRES,dni:x.DNI,correo:x.CORREO,telefono:x.TELEFONO,usuario:x.USUARIO,estado:x.ESTADO_REGISTRO};});}
function BD10_relTalleres_(){return BD10_relList_('talleres').map(function(x){var a=REPO_RelacionalV5.buscarUno('asesores','ID_ASESOR',x.ID_ASESOR)||{};return {id:x.ID_TALLER,nombre:x.NOMBRE,idAsesor:x.ID_ASESOR,asesor:((a.GRADO||'')+' '+(a.APELLIDOS_NOMBRES||'')).trim(),nroSesiones:Number(x.NRO_SESIONES||0),estado:x.ESTADO};});}
function BD10_relSesiones_(id){return REPO_RelacionalV5.filtrar('taller_sesiones',{ID_TALLER:id}).map(function(x){return {id:x.ID_SESION,nro:Number(x.NRO_SESION||0),fecha:x.FECHA||'',horaInicio:x.HORA_INICIO||'',horaFin:x.HORA_FIN||'',estado:x.ESTADO||''};});}
function BD10_cobertura_(legacy,rel){return legacy.length===0?true:(rel.length>0&&rel.length===legacy.length);}
function BD10_select_(legacy,rel){var m=BD10_mode_(); if(m==='RELATIONAL' && BD10_cobertura_(legacy,rel)) return rel; return legacy;}
const REPO_TallerAsesorRoutedV10 = Object.freeze({
  listarAsesores:function(){var l=BD10_legacyAsesores_(),r=BD10_relAsesores_();return BD10_select_(l,r);},
  listarTalleres:function(){var l=BD10_legacyTalleres_(),r=BD10_relTalleres_();return BD10_select_(l,r);},
  sesiones:function(id){var l=REPO_TallerCoreV13.sesiones(id)||[],r=BD10_relSesiones_(id);return BD10_select_(l,r);},
  matriculados:function(id){
    var l=TT_matriculados(id,true)||[], mats=REPO_RelacionalV5.filtrar('taller_matriculas',{ID_TALLER:id});
    if(!mats.length) return l; // el contrato legacy incluye avance/asistencia y requiere cobertura total
    return l;
  },
  cobertura:function(){
    var la=BD10_legacyAsesores_(),ra=BD10_relAsesores_(),lt=BD10_legacyTalleres_(),rt=BD10_relTalleres_();
    return {asesores:{legacy:la.length,relacional:ra.length,completa:BD10_cobertura_(la,ra)},talleres:{legacy:lt.length,relacional:rt.length,completa:BD10_cobertura_(lt,rt)},matriculas:{relacional:BD10_relList_('taller_matriculas').length},sesiones:{relacional:BD10_relList_('taller_sesiones').length},asistencia:{relacional:BD10_relList_('taller_asistencia').length}};
  }
});
function BD10_ACTIVAR_MIRROR(){return BD6_SET_READ_MODE('MIRROR');}
function BD10_ROLLBACK_LEGACY(){return BD6_SET_READ_MODE('LEGACY');}
