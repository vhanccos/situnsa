/** BD-14 - Controlador de cutover/rollback final. */
function BD14_profile_(){return PropertiesService.getScriptProperties().getProperty(BD14_CONFIG.propertyProfile)||BD14_CONFIG.defaultProfile;}
function BD14_MANTENER_MIRROR_SEGURO(){
  var p=PropertiesService.getScriptProperties();
  p.setProperty(BD14_CONFIG.propertyProfile,BD14_CONFIG.profiles.SAFE_MIRROR);
  if(typeof BD6_SET_READ_MODE==='function')BD6_SET_READ_MODE('MIRROR');
  var out={status:true,fase:'BD-14',version:BD14_CONFIG.version,profile:BD14_CONFIG.profiles.SAFE_MIRROR,readMode:'MIRROR',writeMode:'LEGACY',dualWrite:(typeof BD12_enabled_==='function'?BD12_enabled_():false),authMode:(typeof BD13_mode_==='function'?BD13_mode_():'LEGACY'),rollbackDisponible:true};
  Logger.log(JSON.stringify(out,null,2));return out;
}
function BD14_ACTIVAR_LECTURA_RELACIONAL_GLOBAL(){
  var a=BD14_buildAudit_();
  if(!a.listoParaCutoverGlobal){
    throw new Error('BD-14 bloquea RELATIONAL global. Módulos no aptos: '+a.noAptosParaCutoverGlobal.join(', ')+'. Revise advertencias/colas antes del corte.');
  }
  PropertiesService.getScriptProperties().setProperty(BD14_CONFIG.propertyProfile,BD14_CONFIG.profiles.GLOBAL_RELATIONAL_READ);
  var cfg=BD6_SET_READ_MODE('RELATIONAL');
  var out={status:true,fase:'BD-14',version:BD14_CONFIG.version,profile:BD14_CONFIG.profiles.GLOBAL_RELATIONAL_READ,readMode:cfg.readMode,writeMode:'LEGACY',escrituraDirectaRelacional:false,rollback:'BD14_ROLLBACK_MIRROR()'};
  Logger.log(JSON.stringify(out,null,2));return out;
}
function BD14_ROLLBACK_MIRROR(){return BD14_MANTENER_MIRROR_SEGURO();}
function BD14_ROLLBACK_TOTAL_LEGACY(){
  PropertiesService.getScriptProperties().setProperty(BD14_CONFIG.propertyProfile,BD14_CONFIG.profiles.SAFE_MIRROR);
  if(typeof BD6_SET_READ_MODE==='function')BD6_SET_READ_MODE('LEGACY');
  if(typeof BD13_ROLLBACK_AUTH_LEGACY==='function')BD13_ROLLBACK_AUTH_LEGACY();
  if(typeof BD12_DESACTIVAR_DUAL_WRITE==='function')BD12_DESACTIVAR_DUAL_WRITE();
  var out={status:true,fase:'BD-14',version:BD14_CONFIG.version,readMode:'LEGACY',writeMode:'LEGACY',authMode:'LEGACY',dualWrite:false,rollbackTotal:true};
  Logger.log(JSON.stringify(out,null,2));return out;
}
function BD14_PROBAR_ESTADO(){
  var cfg=typeof BD6_GET_CONFIG==='function'?BD6_GET_CONFIG():{};
  var out={status:true,fase:'BD-14',version:BD14_CONFIG.version,profile:BD14_profile_(),readMode:cfg.readMode||'MIRROR',writeMode:cfg.writeMode||'LEGACY',dualWrite:(typeof BD12_enabled_==='function'?BD12_enabled_():false),authMode:(typeof BD13_mode_==='function'?BD13_mode_():'LEGACY'),rollbackMirror:'BD14_ROLLBACK_MIRROR',rollbackTotal:'BD14_ROLLBACK_TOTAL_LEGACY'};
  Logger.log(JSON.stringify(out,null,2));return out;
}
