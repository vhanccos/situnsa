/** BD-15 - BASE UNICA FISICA
 * Centraliza toda persistencia Sheets operativa en BD_TITULACION_RELACIONAL_V2.
 * Los archivos legacy solo se leen UNA VEZ durante PREPARAR para copiar hojas de compatibilidad.
 */
/**const BD15_CONFIG = Object.freeze({
  version:'db-15.0-base-unica',
  spreadsheetId:'1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs',
  spreadsheetName:'BD_TITULACION_RELACIONAL_V2',
  propertyReady:'BD15_BASE_UNICA_READY'
});*/
const BD15_CONFIG = Object.freeze({
  version:'db-15.0-base-unica',
  spreadsheetId:'1jvpGNBTDyly02bgayT2SyrgSaLZrZxj3PH3PavGq6po', // <--- TU NUEVO ID
  spreadsheetName:'Mi_BD_Titulacion',
  propertyReady:'BD15_BASE_UNICA_READY'
});

function BD15_COMPAT_NOMBRE_(n){
  var m={
    'EXPEDIENTES':'COMPAT_EXPEDIENTES','USUARIOS':'COMPAT_USUARIOS','INVITADOS':'COMPAT_INVITADOS',
    'SEGUIMIENTO':'COMPAT_SEGUIMIENTO','SEGUIMIENTO_SUBETAPAS':'COMPAT_SEGUIMIENTO_SUBETAPAS',
    'MENSAJES_SUBETAPAS':'COMPAT_MENSAJES_SUBETAPAS','ARCHIVOS_SUBETAPAS':'COMPAT_ARCHIVOS_SUBETAPAS',
    'INSCRIPCIONES':'COMPAT_INSCRIPCIONES','ASESORES':'COMPAT_ASESORES','TALLERES':'COMPAT_TALLERES',
    'MATRICULADOS':'COMPAT_MATRICULADOS','SESIONES':'COMPAT_SESIONES','ASISTENCIA':'COMPAT_ASISTENCIA',
    'HISTORIAL':'COMPAT_HISTORIAL'
  }; return m[String(n||'').trim().toUpperCase()]||String(n||'');
}

function BD15_fuentes_(){ return [
  {id:'1KyfnlKsbDIA5GpJiW2jVb0eWN8NA3W66I-5qzW3N_O8',hoja:'EXPEDIENTES',dest:'COMPAT_EXPEDIENTES'},
  {id:'1o2Um1qTqRS-0aZ-qtmSAI6bIhPej73lwklOPVY1leFc',hoja:'USUARIOS',dest:'COMPAT_USUARIOS'},
  {id:'1SkYuVQ5ySiZc40nh53N7dDvyH3PipHjDhn2Fj_-HAIY',hoja:'INVITADOS',dest:'COMPAT_INVITADOS'},
  {id:'1OWopKblS6in5xP6UpviLic4sVBXjq1GUD3XqOGOoNb4',hoja:'SEGUIMIENTO',dest:'COMPAT_SEGUIMIENTO'},
  {id:'1G6V_1tiYgwFSepjA6SP3RbfsHHzrADneG9ogJ_EkRDA',hoja:'SEGUIMIENTO_SUBETAPAS',dest:'COMPAT_SEGUIMIENTO_SUBETAPAS'},
  {id:'1G6V_1tiYgwFSepjA6SP3RbfsHHzrADneG9ogJ_EkRDA',hoja:'MENSAJES_SUBETAPAS',dest:'COMPAT_MENSAJES_SUBETAPAS',opcional:true},
  {id:'1G6V_1tiYgwFSepjA6SP3RbfsHHzrADneG9ogJ_EkRDA',hoja:'ARCHIVOS_SUBETAPAS',dest:'COMPAT_ARCHIVOS_SUBETAPAS',opcional:true},
  {id:'1OxbvDeKYxkqnSQ9dmydwxDlw4dZF5Da5dpq1Y8NBhDs',hoja:'INSCRIPCIONES',dest:'COMPAT_INSCRIPCIONES'},
  {id:'133eSqQwGU9aUToe1r04ToQI9s0O288xDXQE937HyWmc',hoja:'ASESORES',dest:'COMPAT_ASESORES'},
  {id:'1sdr7hSzE9NMSAT63GMqPTf0mDxS1BotG3ea4e9jsq-A',hoja:'TALLERES',dest:'COMPAT_TALLERES'},
  {id:'1sdr7hSzE9NMSAT63GMqPTf0mDxS1BotG3ea4e9jsq-A',hoja:'MATRICULADOS',dest:'COMPAT_MATRICULADOS'},
  {id:'1sdr7hSzE9NMSAT63GMqPTf0mDxS1BotG3ea4e9jsq-A',hoja:'SESIONES',dest:'COMPAT_SESIONES'},
  {id:'1sdr7hSzE9NMSAT63GMqPTf0mDxS1BotG3ea4e9jsq-A',hoja:'ASISTENCIA',dest:'COMPAT_ASISTENCIA'},
  {id:'1l7bjIy2utEzXmLW-j1KVVUKIvXK8-2C-OaCM4Z9hgI0',hoja:null,dest:'COMPAT_HISTORIAL',primera:true}
]; }

function BD15_PREVISUALIZAR_BASE_UNICA(){
  var central=SpreadsheetApp.openById(BD15_CONFIG.spreadsheetId), out=[];
  BD15_fuentes_().forEach(function(f){
    var existe=!!central.getSheetByName(f.dest), src=false, filas=0;
    try{var ss=SpreadsheetApp.openById(f.id), sh=f.primera?ss.getSheets()[0]:ss.getSheetByName(f.hoja); src=!!sh; if(sh)filas=sh.getLastRow();}catch(e){}
    out.push({destino:f.dest,yaExiste:existe,fuenteDisponible:src,filasFuente:filas,opcional:!!f.opcional});
  });
  return {status:out.every(function(x){return x.yaExiste||x.fuenteDisponible||x.opcional;}),fase:'BD-15',version:BD15_CONFIG.version,modo:'PREVIEW',central:BD15_CONFIG.spreadsheetName,hojas:out,modificaDatos:false};
}

function BD15_copiarHoja_(central,f){
  if(central.getSheetByName(f.dest)) return {destino:f.dest,accion:'YA_EXISTE'};
  var ss=SpreadsheetApp.openById(f.id), src=f.primera?ss.getSheets()[0]:ss.getSheetByName(f.hoja);
  if(!src){ if(f.opcional)return {destino:f.dest,accion:'OMITIDA_OPCIONAL'}; throw new Error('No existe fuente '+(f.hoja||'primera hoja')); }
  var dst=src.copyTo(central).setName(f.dest);
  return {destino:f.dest,accion:'COPIADA',filas:dst.getLastRow(),columnas:dst.getLastColumn()};
}

function BD15_PREPARAR_BASE_UNICA(){
  var lock=LockService.getScriptLock(); lock.waitLock(30000);
  try{var central=SpreadsheetApp.openById(BD15_CONFIG.spreadsheetId), r=[]; BD15_fuentes_().forEach(function(f){r.push(BD15_copiarHoja_(central,f));}); PropertiesService.getScriptProperties().setProperty(BD15_CONFIG.propertyReady,'TRUE'); return {status:true,fase:'BD-15',version:BD15_CONFIG.version,central:central.getName(),resultado:r,siguientePaso:'BD15_PROBAR_DIAGNOSTICO()'};}
  finally{lock.releaseLock();}
}

function BD15_PROBAR_DIAGNOSTICO(){
  var ss=SpreadsheetApp.openById(BD15_CONFIG.spreadsheetId), req=BD15_fuentes_().filter(function(f){return !f.opcional;}).map(function(f){return f.dest;}), faltan=req.filter(function(n){return !ss.getSheetByName(n);});
  var ids={expedientes:REPO_EXPEDIENTE_V10_CONFIG.spreadsheetId,authUsuarios:AUTH_V14_CONFIG.usuariosSpreadsheetId,authInvitados:AUTH_V14_CONFIG.invitadosSpreadsheetId,seguimiento:REPO_ADMIN_SEGUIMIENTO_V11_CONFIG.seguimientoLegacySpreadsheetId,subetapas:REPO_ADMIN_SEGUIMIENTO_V11_CONFIG.subetapasSpreadsheetId,talleres:CFG_TALLER_V13.talleresId,asesores:CFG_TALLER_V13.asesoresId};
  var externos=Object.keys(ids).filter(function(k){return ids[k]!==BD15_CONFIG.spreadsheetId;});
  return {status:faltan.length===0&&externos.length===0,fase:'BD-15',version:BD15_CONFIG.version,baseUnica:BD15_CONFIG.spreadsheetName,spreadsheetIdCentralizado:true,hojasCompatibilidadPresentes:req.length-faltan.length,hojasCompatibilidadRequeridas:req.length,faltantes:faltan,referenciasOperativasExternas:externos,driveSigueHabilitado:true,otrosSheetsPuedenConservarseSoloComoBackup:true,errores:[]};
}


function BD15_VER_PREVIEW() {
  Logger.log(JSON.stringify(BD15_PREVISUALIZAR_BASE_UNICA(), null, 2));
}

function BD15_VER_DIAGNOSTICO() {
  Logger.log(JSON.stringify(BD15_PROBAR_DIAGNOSTICO(), null, 2));
}
