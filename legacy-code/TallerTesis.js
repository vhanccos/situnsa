/* MODULO TALLER DE TESIS - USE FIPS/UNSA */
var TT_ID_INS='1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs';
var TT_ID_TALL='1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs';
var TT_ID_ASE='1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs';
var TT_ID_SEG='1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs';
var TT_MAX=10*1024*1024;
var TT_MAX_25=25*1024*1024;
var TT_CARPETA_RAIZ_FIJA='1DTH4ibHv8L_f9xMSq8Gqm70jjR9aA-3N';
var TT_CACHE_TTL=600;          // 10 minutos para catálogos/listados
var TT_CACHE_TTL_GRUPO=90;     // 90 segundos para avance de talleres

function TT_cache_(){return CacheService.getScriptCache()}
function TT_cacheGet_(k){try{var x=TT_cache_().get(k);return x?JSON.parse(x):null}catch(e){return null}}
function TT_cachePut_(k,v,seg){try{TT_cache_().put(k,JSON.stringify(v),Number(seg||TT_CACHE_TTL))}catch(e){}}
function TT_cacheClear_(){
 try{
  var c=TT_cache_();
  c.removeAll(['TT_INS_V2','TT_ASE_V2','TT_TALL_V2','TT_BOOT_V2']);
 }catch(e){}
}
function TT_cacheClearGrupo_(id){try{TT_cache_().remove('TT_GRUPO_V2_'+String(id||''))}catch(e){}}

function TT_sheet(id,n){n=BD15_COMPAT_NOMBRE_(n);var s=SpreadsheetApp.openById(BD15_CONFIG.spreadsheetId).getSheetByName(n);if(!s)throw new Error('No existe la hoja '+n+'. Ejecute BD15_PREPARAR_BASE_UNICA().');return s}
function TT_cols(s){var h=s.getRange(1,1,1,s.getLastColumn()).getDisplayValues()[0],o={},i;for(i=0;i<h.length;i++)o[String(h[i]).trim()]=i+1;return o}
function TT_v(r,c,n){return c[n]?r[c[n]-1]:''}
function TT_s(r,c,n,v){if(c[n])r[c[n]-1]=v==null?'':v}
function TT_f(d,p){return Utilities.formatDate(d||new Date(),Session.getScriptTimeZone()||'America/Lima',p||'dd/MM/yyyy')}
function TT_id(s,col,pref,dig){var c=TT_cols(s),m=0,i,a,x;if(s.getLastRow()>1&&c[col]){a=s.getRange(2,c[col],s.getLastRow()-1,1).getDisplayValues();for(i=0;i<a.length;i++){x=String(a[i][0]).match(/\d+/);if(x)m=Math.max(m,Number(x[0]))}}x=String(m+1);while(x.length<(dig||4))x='0'+x;return pref+x}
function TT_find(s,col,val){var c=TT_cols(s),d=s.getDataRange().getDisplayValues(),i,t=String(val||'').trim().toUpperCase();if(!c[col])return-1;for(i=1;i<d.length;i++)if(String(d[i][c[col]-1]||'').trim().toUpperCase()===t)return i+1;return-1}
function TT_hash(t){var b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(t||''),Utilities.Charset.UTF_8),o='',i,v;for(i=0;i<b.length;i++){v=b[i];if(v<0)v+=256;o+=('0'+v.toString(16)).slice(-2)}return o}

function TT_ensure(id,n,h){n=BD15_COMPAT_NOMBRE_(n);var ss=SpreadsheetApp.openById(BD15_CONFIG.spreadsheetId),s=ss.getSheetByName(n),i,now,miss=[];if(!s)s=ss.insertSheet(n);if(s.getLastColumn()===0){s.getRange(1,1,1,h.length).setValues([h]);s.setFrozenRows(1);return}now=s.getRange(1,1,1,s.getLastColumn()).getDisplayValues()[0];for(i=0;i<h.length;i++)if(now.indexOf(h[i])<0)miss.push(h[i]);if(miss.length)s.getRange(1,s.getLastColumn()+1,1,miss.length).setValues([miss]);s.setFrozenRows(1)}

function TT_inicializar(){
 try{
  TT_ensure(TT_ID_INS,'INSCRIPCIONES',['ID_INSCRIPCION','FECHA_REGISTRO','HORA_REGISTRO','APELLIDOS_NOMBRES','DNI','DEPARTAMENTO','PROVINCIA','DISTRITO','DIRECCION_ACTUAL','ESPECIALIDAD','ANIO_EGRESO','CORREO','TELEFONO','CUI','TITULO_TESIS','ESTADO','ID_TALLER','TALLER','EXPEDIENTE','FECHA_VALIDACION','ADMIN_VALIDO','CORREO_ADMIN','CARPETA_DNI_ID','CARPETA_DNI_URL','DOC_DNI_URL','DOC_NO_ADEUDO_URL','DOC_CV_URL','DOC_CARTA_COMPROMISO_URL','DOC_PLAN_TESIS_URL','DOC_PAGO_URL','OBSERVACION']);
  TT_ensure(TT_ID_ASE,'ASESORES',['ID_ASESOR','GRADO','APELLIDOS_NOMBRES','DNI','CORREO','TELEFONO','USUARIO','PASSWORD_HASH','ESTADO','FECHA_REGISTRO']);
  TT_ensure(TT_ID_TALL,'TALLERES',['ID_TALLER','NOMBRE_TALLER','ID_ASESOR','ASESOR','NRO_SESIONES','FECHA_INICIO','FECHA_FIN','ESTADO','FECHA_CREACION','CREADO_POR']);
  TT_ensure(TT_ID_TALL,'MATRICULADOS',['ID_MATRICULA','ID_TALLER','TALLER','EXPEDIENTE','DNI','APELLIDOS_NOMBRES','ESPECIALIDAD','CORREO','TELEFONO','FECHA_MATRICULA','ESTADO']);
  TT_ensure(TT_ID_TALL,'SESIONES',['ID_SESION','ID_TALLER','TALLER','NRO_SESION','FECHA','HORA_INICIO','HORA_FIN','ESTADO']);
  TT_ensure(TT_ID_TALL,'ASISTENCIA',['ID_ASISTENCIA','ID_TALLER','ID_SESION','NRO_SESION','EXPEDIENTE','DNI','APELLIDOS_NOMBRES','ASISTENCIA','FECHA_REGISTRO','ID_ASESOR','ASESOR','OBSERVACION']);
  return{status:true,message:'Módulo inicializado correctamente.'}
 }catch(e){return{status:false,message:e.message}}
}

function TT_configCarpeta(v){
 try{
  var f=DriveApp.getFolderById(TT_CARPETA_RAIZ_FIJA);
  PropertiesService.getScriptProperties().setProperty('TT_CARPETA_RAIZ',TT_CARPETA_RAIZ_FIJA);
  TT_cacheClear_();
  return{
   status:true,
   id:TT_CARPETA_RAIZ_FIJA,
   nombre:f.getName(),
   url:f.getUrl(),
   automatica:true,
   message:'La carpeta raíz del Taller de Tesis está configurada automáticamente.'
  };
 }catch(e){
  return{status:false,message:'No se pudo acceder a la carpeta raíz fija: '+e.message};
 }
}

function TT_getConfig(){
 try{
  var f=DriveApp.getFolderById(TT_CARPETA_RAIZ_FIJA);
  return{
   status:true,
   id:TT_CARPETA_RAIZ_FIJA,
   nombre:f.getName(),
   url:f.getUrl(),
   automatica:true
  };
 }catch(e){
  return{
   status:false,
   id:TT_CARPETA_RAIZ_FIJA,
   nombre:'Sin acceso',
   url:'',
   automatica:true,
   message:'No se pudo acceder a la carpeta raíz fija: '+e.message
  };
 }
}

function TT_folder(dni){
 dni=String(dni||'').replace(/\D/g,'');
 if(!/^\d{8}$/.test(dni))throw new Error('DNI inválido para crear la carpeta documental.');

 try{
  var r=DriveApp.getFolderById(TT_CARPETA_RAIZ_FIJA);
  var it=r.getFoldersByName(dni);
  var f=it.hasNext()?it.next():r.createFolder(dni);

  return{
   id:f.getId(),
   url:f.getUrl(),
   nombre:f.getName()
  };
 }catch(e){
  throw new Error('No se pudo acceder o crear la carpeta del estudiante en Drive: '+e.message);
 }
}

function TT_registrarInscripcion(d){
 try{
  TT_inicializar();d=d||{};var dni=String(d.dni||'').replace(/\D/g,''),s=TT_sheet(TT_ID_INS,'INSCRIPCIONES'),c=TT_cols(s),r,i,id,car;
  if(!String(d.nombres||'').trim())return{status:false,message:'Ingrese apellidos y nombres.'};
  if(!/^\d{8}$/.test(dni))return{status:false,message:'DNI inválido.'};
  if(TT_find(s,'DNI',dni)>0)return{status:false,message:'El DNI ya tiene una inscripción.'};
  if(typeof dniExiste==='function'&&dniExiste(dni))return{status:false,message:'El DNI ya tiene un expediente registrado.'};
  id=TT_id(s,'ID_INSCRIPCION','INS',5);car=TT_folder(dni);r=new Array(s.getLastColumn());for(i=0;i<r.length;i++)r[i]='';
  TT_s(r,c,'ID_INSCRIPCION',id);TT_s(r,c,'FECHA_REGISTRO',TT_f(new Date(),'dd/MM/yyyy'));TT_s(r,c,'HORA_REGISTRO',TT_f(new Date(),'HH:mm:ss'));TT_s(r,c,'APELLIDOS_NOMBRES',String(d.nombres).trim().toUpperCase());TT_s(r,c,'DNI',dni);TT_s(r,c,'DEPARTAMENTO',d.departamento||'');TT_s(r,c,'PROVINCIA',d.provincia||'');TT_s(r,c,'DISTRITO',d.distrito||'');TT_s(r,c,'DIRECCION_ACTUAL',d.direccion||'');TT_s(r,c,'ESPECIALIDAD',d.especialidad||'');TT_s(r,c,'ANIO_EGRESO',d.anioEgreso||'');TT_s(r,c,'CORREO',String(d.correo||'').toLowerCase());TT_s(r,c,'TELEFONO',d.telefono||'');TT_s(r,c,'CUI',d.cui||'');TT_s(r,c,'TITULO_TESIS',d.tituloTesis||'');TT_s(r,c,'ESTADO','PENDIENTE DE DOCUMENTOS');TT_s(r,c,'CARPETA_DNI_ID',car.id);TT_s(r,c,'CARPETA_DNI_URL',car.url);s.appendRow(r);
  TT_cacheClear_();return{status:true,idInscripcion:id,dni:dni}
 }catch(e){return{status:false,message:e.message}}
}

function TT_subirDocumento(form){
 try{
  var id=String(form.idInscripcion||''),dni=String(form.dni||''),tipo=String(form.tipoDocumento||'').toUpperCase(),blob=form.archivo,map={'DNI':'DOC_DNI_URL','NO_ADEUDO':'DOC_NO_ADEUDO_URL','CV':'DOC_CV_URL','CARTA':'DOC_CARTA_COMPROMISO_URL','PLAN':'DOC_PLAN_TESIS_URL','PAGO':'DOC_PAGO_URL'},s=TT_sheet(TT_ID_INS,'INSCRIPCIONES'),fila=TT_find(s,'ID_INSCRIPCION',id),c=TT_cols(s),row,f,ext='',p,nombre,req,i,ok=true;
  if(fila<0)throw new Error('Inscripción no encontrada.');
  if(!map[tipo])throw new Error('Tipo inválido.');
  if(!blob||typeof blob.getBytes!=='function')throw new Error('Seleccione archivo.');

  var limite=(tipo==='NO_ADEUDO'||tipo==='CV')?TT_MAX_25:TT_MAX;
  var limiteMB=(limite===TT_MAX_25)?25:10;
  if(blob.getBytes().length>limite)throw new Error('El archivo supera '+limiteMB+' MB.');
  row=s.getRange(fila,1,1,s.getLastColumn()).getDisplayValues()[0];f=DriveApp.getFolderById(String(TT_v(row,c,'CARPETA_DNI_ID')));p=String(blob.getName()||'').lastIndexOf('.');if(p>=0)ext=String(blob.getName()).substring(p);nombre=dni+'_'+tipo+'_'+TT_f(new Date(),'yyyyMMdd_HHmmss')+ext;blob.setName(nombre);var file=f.createFile(blob);s.getRange(fila,c[map[tipo]]).setValue(file.getUrl());
  row=s.getRange(fila,1,1,s.getLastColumn()).getDisplayValues()[0];req=['DOC_DNI_URL','DOC_NO_ADEUDO_URL','DOC_CV_URL','DOC_CARTA_COMPROMISO_URL','DOC_PLAN_TESIS_URL','DOC_PAGO_URL'];for(i=0;i<req.length;i++)if(!String(TT_v(row,c,req[i])||'').trim())ok=false;if(ok)s.getRange(fila,c['ESTADO']).setValue('PENDIENTE DE VALIDACIÓN');
  TT_cacheClear_();return{status:true,url:file.getUrl()}
 }catch(e){return{status:false,message:e.message}}
}

function TT_insObj(r,c){return{id:TT_v(r,c,'ID_INSCRIPCION'),fecha:TT_v(r,c,'FECHA_REGISTRO'),nombres:TT_v(r,c,'APELLIDOS_NOMBRES'),dni:TT_v(r,c,'DNI'),departamento:TT_v(r,c,'DEPARTAMENTO'),provincia:TT_v(r,c,'PROVINCIA'),distrito:TT_v(r,c,'DISTRITO'),direccion:TT_v(r,c,'DIRECCION_ACTUAL'),especialidad:TT_v(r,c,'ESPECIALIDAD'),anioEgreso:TT_v(r,c,'ANIO_EGRESO'),correo:TT_v(r,c,'CORREO'),telefono:TT_v(r,c,'TELEFONO'),cui:TT_v(r,c,'CUI'),tituloTesis:TT_v(r,c,'TITULO_TESIS'),estado:TT_v(r,c,'ESTADO'),idTaller:TT_v(r,c,'ID_TALLER'),taller:TT_v(r,c,'TALLER'),expediente:TT_v(r,c,'EXPEDIENTE'),docs:{dni:TT_v(r,c,'DOC_DNI_URL'),adeudo:TT_v(r,c,'DOC_NO_ADEUDO_URL'),cv:TT_v(r,c,'DOC_CV_URL'),carta:TT_v(r,c,'DOC_CARTA_COMPROMISO_URL'),plan:TT_v(r,c,'DOC_PLAN_TESIS_URL'),pago:TT_v(r,c,'DOC_PAGO_URL')}}}
function TT_listarInscripciones(forzar){
 var key='TT_INS_V2',cached,s,d,c,o=[],i;
 if(!forzar){cached=TT_cacheGet_(key);if(cached)return cached}
 s=TT_sheet(TT_ID_INS,'INSCRIPCIONES');
 if(s.getLastRow()<2)return [];
 d=s.getRange(1,1,s.getLastRow(),s.getLastColumn()).getDisplayValues();
 c=TT_cols(s);
 for(i=1;i<d.length;i++)if(String(TT_v(d[i],c,'ID_INSCRIPCION')).trim())o.push(TT_insObj(d[i],c));
 o.reverse();TT_cachePut_(key,o,TT_CACHE_TTL);return o;
}

function TT_crearAsesor(d){
 try{TT_inicializar();var s=TT_sheet(TT_ID_ASE,'ASESORES'),dni=String(d.dni||'').replace(/\D/g,'');if(!/^\d{8}$/.test(dni))return{status:false,message:'DNI inválido.'};if(TT_find(s,'DNI',dni)>0)return{status:false,message:'El asesor ya existe.'};if(!String(d.password||'').trim()||String(d.password).length<6)return{status:false,message:'Contraseña mínima: 6 caracteres.'};s.appendRow([TT_id(s,'ID_ASESOR','ASE',4),d.grado||'',String(d.nombres||'').toUpperCase(),dni,String(d.correo||'').toLowerCase(),d.telefono||'',d.usuario||dni,TT_hash(d.password),'ACTIVO',TT_f(new Date(),'dd/MM/yyyy HH:mm:ss')]);TT_cacheClear_();return{status:true,message:'Asesor creado.'}}catch(e){return{status:false,message:e.message}}
}
function TT_listarAsesores(forzar){
 var key='TT_ASE_V2',cached,s,d,c,o=[],i,r;
 if(!forzar){cached=TT_cacheGet_(key);if(cached)return cached}
 s=TT_sheet(TT_ID_ASE,'ASESORES');if(s.getLastRow()<2)return [];
 d=s.getRange(1,1,s.getLastRow(),s.getLastColumn()).getDisplayValues();c=TT_cols(s);
 for(i=1;i<d.length;i++){r=d[i];if(TT_v(r,c,'ID_ASESOR'))o.push({id:TT_v(r,c,'ID_ASESOR'),grado:TT_v(r,c,'GRADO'),nombres:TT_v(r,c,'APELLIDOS_NOMBRES'),dni:TT_v(r,c,'DNI'),correo:TT_v(r,c,'CORREO'),telefono:TT_v(r,c,'TELEFONO'),usuario:TT_v(r,c,'USUARIO'),estado:TT_v(r,c,'ESTADO')})}
 TT_cachePut_(key,o,TT_CACHE_TTL);return o;
}

function TT_crearTaller(d){
 try{TT_inicializar();var st=TT_sheet(TT_ID_TALL,'TALLERES'),sa=TT_sheet(TT_ID_ASE,'ASESORES'),fa=TT_find(sa,'ID_ASESOR',d.idAsesor),ca,ra,nom,id,n=Number(d.nroSesiones||0),ss,i;if(fa<0)return{status:false,message:'Seleccione asesor.'};if(n<1)return{status:false,message:'Cantidad de sesiones inválida.'};nom=String(d.nombre||'').trim().toUpperCase();if(!nom)return{status:false,message:'Ingrese nombre del taller.'};if(TT_find(st,'NOMBRE_TALLER',nom)>0)return{status:false,message:'El taller ya existe.'};ca=TT_cols(sa);ra=sa.getRange(fa,1,1,sa.getLastColumn()).getDisplayValues()[0];id=TT_id(st,'ID_TALLER','TAL',4);var asesor=(TT_v(ra,ca,'GRADO')+' '+TT_v(ra,ca,'APELLIDOS_NOMBRES')).trim();st.appendRow([id,nom,d.idAsesor,asesor,n,d.fechaInicio||'',d.fechaFin||'','ACTIVO',TT_f(new Date(),'dd/MM/yyyy HH:mm:ss'),d.creadoPor||'']);ss=TT_sheet(TT_ID_TALL,'SESIONES');for(i=1;i<=n;i++)ss.appendRow([id+'-S'+('00'+i).slice(-2),id,nom,i,'','','','PROGRAMADA']);TT_cacheClear_();TT_cacheClearGrupo_(id);return{status:true,message:'Taller creado.'}}catch(e){return{status:false,message:e.message}}
}
function TT_listarTalleres(forzar){
 var key='TT_TALL_V2',cached,s,d,c,o=[],i,r;
 if(!forzar){cached=TT_cacheGet_(key);if(cached)return cached}
 s=TT_sheet(TT_ID_TALL,'TALLERES');if(s.getLastRow()<2)return [];
 d=s.getRange(1,1,s.getLastRow(),s.getLastColumn()).getDisplayValues();c=TT_cols(s);
 for(i=1;i<d.length;i++){r=d[i];if(TT_v(r,c,'ID_TALLER'))o.push({id:TT_v(r,c,'ID_TALLER'),nombre:TT_v(r,c,'NOMBRE_TALLER'),idAsesor:TT_v(r,c,'ID_ASESOR'),asesor:TT_v(r,c,'ASESOR'),nroSesiones:Number(TT_v(r,c,'NRO_SESIONES')||0),estado:TT_v(r,c,'ESTADO')})}
 TT_cachePut_(key,o,TT_CACHE_TTL);return o;
}

function TT_validarMatricular(d){
 var lock=LockService.getScriptLock();
 try{
  lock.waitLock(30000);
  var si=TT_sheet(TT_ID_INS,'INSCRIPCIONES'),fi=TT_find(si,'ID_INSCRIPCION',d.idInscripcion),ci,ri,ins,st,ft,ct,rt,taller,cui,tit,p,reg,exp,sm,now;
  if(fi<0)return{status:false,message:'Inscripción no encontrada.'};
  ci=TT_cols(si);ri=si.getRange(fi,1,1,si.getLastColumn()).getDisplayValues()[0];ins=TT_insObj(ri,ci);
  if(ins.expediente)return{status:false,message:'Ya fue validado: '+ins.expediente};
  st=TT_sheet(TT_ID_TALL,'TALLERES');ft=TT_find(st,'ID_TALLER',d.idTaller);
  if(ft<0)return{status:false,message:'Seleccione Taller.'};
  ct=TT_cols(st);rt=st.getRange(ft,1,1,st.getLastColumn()).getDisplayValues()[0];taller=TT_v(rt,ct,'NOMBRE_TALLER');
  cui=String(d.cui||ins.cui||'').trim();tit=String(d.tituloTesis||ins.tituloTesis||'').trim();
  if(!cui)return{status:false,message:'Complete CUI antes de validar.'};
  if(!tit)return{status:false,message:'Complete el título de tesis antes de validar.'};
  if(typeof registrarExpediente!=='function')throw new Error('No existe registrarExpediente() en el proyecto.');
  p={nombre:ins.nombres,dni:ins.dni,programa:ins.especialidad,correo:ins.correo,cui:cui,telefono:ins.telefono,nacionalidad:'PERUANA',ciudad:(ins.departamento+' / '+ins.provincia+' / '+ins.distrito),direccion:ins.direccion};
  reg=registrarExpediente({grupo:1,admin:d.admin||'',correo_admin:d.correoAdmin||'',tesis:tit,participantes:[p]});
  if(!reg||reg.status!==true)return{status:false,message:(reg&&reg.message)||'No se pudo crear expediente.'};
  exp=String(reg.expediente||reg.codigo||'').toUpperCase();
  /*
    V5: la validación responde sin esperar los registros complementarios.
    Invitado, seguimiento y Drive se procesan luego en una llamada separada.
  */
  now=TT_f(new Date(),'dd/MM/yyyy HH:mm:ss');
  sm=TT_sheet(TT_ID_TALL,'MATRICULADOS');
  sm.appendRow([TT_id(sm,'ID_MATRICULA','MAT',5),d.idTaller,taller,exp,ins.dni,ins.nombres,ins.especialidad,ins.correo,ins.telefono,now,'ACTIVO']);
  var cambios={CUI:cui,TITULO_TESIS:tit,ESTADO:'VALIDADO / MATRICULADO',ID_TALLER:d.idTaller,TALLER:taller,EXPEDIENTE:exp,FECHA_VALIDACION:now,ADMIN_VALIDO:d.admin||'',CORREO_ADMIN:d.correoAdmin||''};

  /* Una sola escritura de la fila completa. */
  var filaActual=si.getRange(fi,1,1,si.getLastColumn()).getValues()[0];
  Object.keys(cambios).forEach(function(k){if(ci[k])filaActual[ci[k]-1]=cambios[k]});
  si.getRange(fi,1,1,filaActual.length).setValues([filaActual]);

  TT_crearTrabajoCopia_(exp,ins.nombres,p,d.admin||'',d.correoAdmin||'');
  TT_cacheClear_();TT_cacheClearGrupo_(d.idTaller);
  return{status:true,expediente:exp,nombres:ins.nombres,message:'Validado y matriculado. Expediente: '+exp,copiaPendiente:true};
 }catch(e){return{status:false,message:e.message}}
 finally{try{lock.releaseLock()}catch(x){}}
}

/* =========================================================
   LECTURAS OPTIMIZADAS - TALLER DE TESIS
========================================================= */
function TT_avanceDesdeFilas_(a){
 var i,fin=0,act=null,map={},k,e=[];
 a=(a||[]).slice().sort(function(x,y){return x.etapa-y.etapa||x.sub-y.sub});
 for(i=0;i<a.length;i++){
  if(a[i].estado==='FINALIZADO')fin++;
  if(!act&&a[i].estado==='EN CURSO')act=a[i];
 }
 if(!act)for(i=0;i<a.length;i++)if(a[i].estado!=='FINALIZADO'){act=a[i];break}
 if(!act&&a.length)act=a[a.length-1];
 if(!act)return{etapaActual:0,nombreEtapa:'SIN SEGUIMIENTO',subetapaActual:0,descripcionSubetapa:'SIN SEGUIMIENTO',avance:0,etapas:[]};
 for(i=0;i<a.length;i++){
  k=String(a[i].etapa);
  if(!map[k])map[k]={numero:a[i].etapa,nombre:a[i].nombre,subs:[],fin:0};
  map[k].subs.push(a[i]);
  if(a[i].estado==='FINALIZADO')map[k].fin++;
 }
 for(k in map)if(map.hasOwnProperty(k)){
  map[k].avance=map[k].subs.length?Math.round(map[k].fin/map[k].subs.length*100):0;
  e.push(map[k]);
 }
 e.sort(function(x,y){return x.numero-y.numero});
 return{etapaActual:act.etapa,nombreEtapa:act.nombre,subetapaActual:act.sub,descripcionSubetapa:act.desc,avance:a.length?Math.round(fin/a.length*100):0,etapas:e};
}

function TT_seguimientoMasivo_(expedientes){
 if(typeof obtenerSeguimientoSubetapasMasivo==='function'){
  return obtenerSeguimientoSubetapasMasivo(expedientes||[]);
 }
 var wanted={},out={},i,r,exp,s,d,c;
 (expedientes||[]).forEach(function(x){x=String(x||'').trim().toUpperCase();if(x)wanted[x]=true});
 s=TT_sheet(TT_ID_SEG,'SEGUIMIENTO_SUBETAPAS');
 d=s.getDataRange().getDisplayValues();
 c=TT_cols(s);
 for(i=1;i<d.length;i++){
  r=d[i];exp=String(TT_v(r,c,'EXPEDIENTE')||'').trim().toUpperCase();
  if(!exp||!wanted[exp])continue;
  if(!out[exp])out[exp]=[];
  out[exp].push({etapa:Number(TT_v(r,c,'ETAPA')||0),nombre:TT_v(r,c,'NOMBRE_ETAPA'),sub:Number(TT_v(r,c,'SUBETAPA')||0),desc:TT_v(r,c,'DESCRIPCION'),estado:String(TT_v(r,c,'ESTADO')||'NO INICIADO').toUpperCase(),plazo:TT_v(r,c,'PLAZO')});
 }
 return out;
}

function TT_resumenAsistenciaMasiva_(idTaller,expedientes,totalSesiones){
 var wanted={},out={},s,d,c,i,r,exp,estado;
 (expedientes||[]).forEach(function(x){x=String(x||'').trim().toUpperCase();if(x){wanted[x]=true;out[x]={presentes:0,registradas:0,totalSesiones:Number(totalSesiones||0),porcentaje:0}}});
 s=TT_sheet(TT_ID_TALL,'ASISTENCIA');
 d=s.getDataRange().getDisplayValues();
 c=TT_cols(s);
 for(i=1;i<d.length;i++){
  r=d[i];
  if(String(TT_v(r,c,'ID_TALLER'))!==String(idTaller))continue;
  exp=String(TT_v(r,c,'EXPEDIENTE')||'').trim().toUpperCase();
  if(!wanted[exp])continue;
  out[exp].registradas++;
  estado=String(TT_v(r,c,'ASISTENCIA')||'').trim().toUpperCase();
  if(estado==='PRESENTE')out[exp].presentes++;
 }
 for(exp in out)if(out.hasOwnProperty(exp)){
  out[exp].porcentaje=out[exp].totalSesiones?Math.round(out[exp].presentes/out[exp].totalSesiones*100):0;
 }
 return out;
}

function TT_numSesionesTaller_(id){
 var s=TT_sheet(TT_ID_TALL,'TALLERES'),d=s.getDataRange().getDisplayValues(),c=TT_cols(s),i,r;
 for(i=1;i<d.length;i++){
  r=d[i];
  if(String(TT_v(r,c,'ID_TALLER'))===String(id))return Number(TT_v(r,c,'NRO_SESIONES')||0);
 }
 return 0;
}

function TT_avance(exp){
 var x=String(exp||'').trim().toUpperCase(),m;
 if(!x)return TT_avanceDesdeFilas_([]);
 m=TT_seguimientoMasivo_([x]);
 return TT_avanceDesdeFilas_(m[x]||[]);
}

function TT_sesiones(id){var s=TT_sheet(TT_ID_TALL,'SESIONES'),lr=s.getLastRow(),d,c,o=[],i,r;if(lr<2)return o;d=s.getRange(1,1,lr,s.getLastColumn()).getDisplayValues();c=TT_cols(s);for(i=1;i<d.length;i++){r=d[i];if(String(TT_v(r,c,'ID_TALLER'))===String(id))o.push({id:TT_v(r,c,'ID_SESION'),nro:Number(TT_v(r,c,'NRO_SESION')),fecha:TT_v(r,c,'FECHA'),horaInicio:TT_v(r,c,'HORA_INICIO'),horaFin:TT_v(r,c,'HORA_FIN'),estado:TT_v(r,c,'ESTADO')})}return o}
function TT_resAs(id,exp){
 var total=TT_numSesionesTaller_(id),x=String(exp||'').trim().toUpperCase(),m=TT_resumenAsistenciaMasiva_(id,[x],total);
 return m[x]||{presentes:0,registradas:0,totalSesiones:total,porcentaje:0};
}
function TT_matriculados(id,forzar){
 var key='TT_GRUPO_V2_'+String(id||''),cached,s,d,c,base=[],exps=[],i,r,exp,seg,asis,total,av,o=[];
 if(!forzar){cached=TT_cacheGet_(key);if(cached&&cached.alumnos)return cached.alumnos}
 s=TT_sheet(TT_ID_TALL,'MATRICULADOS');
 if(s.getLastRow()<2)return [];
 d=s.getRange(1,1,s.getLastRow(),s.getLastColumn()).getDisplayValues();c=TT_cols(s);
 for(i=1;i<d.length;i++){
  r=d[i];if(String(TT_v(r,c,'ID_TALLER'))!==String(id))continue;
  exp=String(TT_v(r,c,'EXPEDIENTE')||'').trim().toUpperCase();if(!exp)continue;
  base.push({expediente:exp,dni:TT_v(r,c,'DNI'),nombres:TT_v(r,c,'APELLIDOS_NOMBRES'),especialidad:TT_v(r,c,'ESPECIALIDAD')});exps.push(exp);
 }
 if(!base.length)return [];
 seg=TT_seguimientoMasivo_(exps);total=TT_numSesionesTaller_(id);asis=TT_resumenAsistenciaMasiva_(id,exps,total);
 for(i=0;i<base.length;i++){
  exp=base[i].expediente;av=TT_avanceDesdeFilas_(seg[exp]||[]);
  o.push({expediente:exp,dni:base[i].dni,nombres:base[i].nombres,especialidad:base[i].especialidad,etapaActual:av.etapaActual,nombreEtapa:av.nombreEtapa,subetapaActual:av.subetapaActual,descripcionSubetapa:av.descripcionSubetapa,avance:av.avance,asistencia:asis[exp]||{presentes:0,registradas:0,totalSesiones:total,porcentaje:0}});
 }
 TT_cachePut_(key,{alumnos:o},TT_CACHE_TTL_GRUPO);return o;
}

function TT_grupoTaller(id,forzar){
 var key='TT_GRUPO_V2_'+String(id||''),cached,alumnos,sesiones,res;
 if(!forzar){cached=TT_cacheGet_(key);if(cached&&cached.alumnos&&cached.sesiones)return cached}
 alumnos=TT_matriculados(id,forzar);sesiones=TT_sesiones(id);res={status:true,alumnos:alumnos,sesiones:sesiones};
 TT_cachePut_(key,res,TT_CACHE_TTL_GRUPO);return res;
}

function TT_asistenciaSesion(idT,idS){var a=TT_matriculados(idT),s=TT_sheet(TT_ID_TALL,'ASISTENCIA'),d=s.getDataRange().getDisplayValues(),c=TT_cols(s),m={},i,r,k;for(i=1;i<d.length;i++){r=d[i];if(String(TT_v(r,c,'ID_TALLER'))===String(idT)&&String(TT_v(r,c,'ID_SESION'))===String(idS)){k=String(TT_v(r,c,'EXPEDIENTE')).toUpperCase();m[k]={estado:TT_v(r,c,'ASISTENCIA'),obs:TT_v(r,c,'OBSERVACION')}}}for(i=0;i<a.length;i++){k=String(a[i].expediente).toUpperCase();a[i].asistenciaSesion=m[k]?m[k].estado:'';a[i].observacionSesion=m[k]?m[k].obs:''}return a}
function TT_guardarAsistencia(d){try{var s=TT_sheet(TT_ID_TALL,'ASISTENCIA'),c=TT_cols(s),data=s.getDataRange().getDisplayValues(),i,j,r,f,reg,id;for(i=0;i<d.registros.length;i++){reg=d.registros[i];f=-1;for(j=1;j<data.length;j++){r=data[j];if(String(TT_v(r,c,'ID_TALLER'))===String(d.idTaller)&&String(TT_v(r,c,'ID_SESION'))===String(d.idSesion)&&String(TT_v(r,c,'EXPEDIENTE')).toUpperCase()===String(reg.expediente).toUpperCase()){f=j+1;break}}if(f>0){s.getRange(f,c['ASISTENCIA']).setValue(reg.asistencia);s.getRange(f,c['OBSERVACION']).setValue(reg.observacion||'');s.getRange(f,c['FECHA_REGISTRO']).setValue(TT_f(new Date(),'dd/MM/yyyy HH:mm:ss'))}else{id=TT_id(s,'ID_ASISTENCIA','ASI',6);s.appendRow([id,d.idTaller,d.idSesion,d.nroSesion||'',reg.expediente,reg.dni,reg.nombres,reg.asistencia,TT_f(new Date(),'dd/MM/yyyy HH:mm:ss'),d.idAsesor||'',d.asesor||'',reg.observacion||''])}}TT_cacheClearGrupo_(d.idTaller);return{status:true,message:'Asistencia guardada.'}}catch(e){return{status:false,message:e.message}}}

function TT_loginAsesor(u,p){try{var s=TT_sheet(TT_ID_ASE,'ASESORES'),d=s.getDataRange().getDisplayValues(),c=TT_cols(s),i,r,x=String(u||'').toLowerCase(),h=TT_hash(p);for(i=1;i<d.length;i++){r=d[i];if((String(TT_v(r,c,'USUARIO')).toLowerCase()===x||String(TT_v(r,c,'DNI')).toLowerCase()===x||String(TT_v(r,c,'CORREO')).toLowerCase()===x)&&String(TT_v(r,c,'PASSWORD_HASH'))===h&&String(TT_v(r,c,'ESTADO')).toUpperCase()==='ACTIVO'){var t=Utilities.getUuid(),a={id:TT_v(r,c,'ID_ASESOR'),grado:TT_v(r,c,'GRADO'),nombres:TT_v(r,c,'APELLIDOS_NOMBRES')};CacheService.getScriptCache().put('TT_A_'+t,JSON.stringify(a),21600);return{status:true,token:t,asesor:a}}}return{status:false,message:'Usuario o contraseña incorrectos.'}}catch(e){return{status:false,message:e.message}}}
function TT_tok(t){var x=CacheService.getScriptCache().get('TT_A_'+String(t||''));if(!x)throw new Error('Sesión vencida.');return JSON.parse(x)}
function TT_checkT(id,a){var t=TT_listarTalleres(),i;for(i=0;i<t.length;i++)if(t[i].id===id&&String(t[i].idAsesor)===String(a.id))return t[i];throw new Error('No tiene acceso a este taller.')}
function TT_portal(token){var a=TT_tok(token),t=TT_listarTalleres(),o=[],i,m,j,sa,sv;for(i=0;i<t.length;i++)if(String(t[i].idAsesor)===String(a.id)){m=TT_matriculados(t[i].id);sa=0;sv=0;for(j=0;j<m.length;j++){sa+=m[j].avance;sv+=m[j].asistencia.porcentaje}t[i].cantidad=m.length;t[i].promedioAvance=m.length?Math.round(sa/m.length):0;t[i].promedioAsistencia=m.length?Math.round(sv/m.length):0;o.push(t[i])}return{status:true,asesor:a,talleres:o}}
function TT_portalGrupo(token,id){var a=TT_tok(token);TT_checkT(id,a);return{status:true,alumnos:TT_matriculados(id),sesiones:TT_sesiones(id)}}
function TT_portalAvance(token,id,exp){var a=TT_tok(token);TT_checkT(id,a);return{status:true,avance:TT_avance(exp)}}
function TT_portalAsistencia(token,id,idS){var a=TT_tok(token);TT_checkT(id,a);return{status:true,alumnos:TT_asistenciaSesion(id,idS)}}
function TT_portalGuardarAsistencia(token,d){var a=TT_tok(token),t=TT_checkT(d.idTaller,a);d.idAsesor=a.id;d.asesor=(a.grado+' '+a.nombres).trim();return TT_guardarAsistencia(d)}
function TT_adminBootstrap(forzar){
 var key='TT_BOOT_V2',cached,ins,t,a,p=0,v=0,i,e,res;
 if(forzar){TT_cacheClear_()}else{cached=TT_cacheGet_(key);if(cached)return cached}
 ins=TT_listarInscripciones(!!forzar);t=TT_listarTalleres(!!forzar);a=TT_listarAsesores(!!forzar);
 for(i=0;i<ins.length;i++){e=String(ins[i].estado||'');if(e.indexOf('PENDIENTE')===0)p++;if(e.indexOf('VALIDADO')===0)v++}
 res={status:true,resumen:{inscripciones:ins.length,pendientes:p,validados:v,talleres:t.length,asesores:a.length},talleres:t,asesores:a,inscripciones:ins,config:TT_getConfig()};
 TT_cachePut_(key,res,TT_CACHE_TTL);return res;
}
function TT_dashboard(){var b=TT_adminBootstrap(false);return{status:b.status,resumen:b.resumen,talleres:b.talleres,asesores:b.asesores}}

/* =========================================================
   V3 - CARGA RAPIDA / ASISTENCIA POR CHECK
   ========================================================= */

function TT_rosterTaller(id){
  var key='TT_ROSTER_V3_'+String(id||''), cached=TT_cacheGet_(key);
  if(cached) return cached;
  var s=TT_sheet(TT_ID_TALL,'MATRICULADOS'), lr=s.getLastRow(), out=[], d,c,i,r;
  if(lr>1){
    d=s.getRange(1,1,lr,s.getLastColumn()).getDisplayValues();
    c=TT_cols(s);
    for(i=1;i<d.length;i++){
      r=d[i];
      if(String(TT_v(r,c,'ID_TALLER'))!==String(id)) continue;
      out.push({
        expediente:TT_v(r,c,'EXPEDIENTE'),
        dni:TT_v(r,c,'DNI'),
        nombres:TT_v(r,c,'APELLIDOS_NOMBRES'),
        especialidad:TT_v(r,c,'ESPECIALIDAD'),
        correo:TT_v(r,c,'CORREO'),
        telefono:TT_v(r,c,'TELEFONO')
      });
    }
  }
  TT_cachePut_(key,out,300);
  return out;
}

function TT_matrizAsistenciaTaller_(id){
  var key='TT_MATRIZ_V3_'+String(id||''), cached=TT_cacheGet_(key);
  if(cached) return cached;

  var alumnos=TT_rosterTaller(id), sesiones=TT_sesiones(id);
  var sa=TT_sheet(TT_ID_TALL,'ASISTENCIA'), lr=sa.getLastRow(), d=[],c={},i,r,k,map={};
  if(lr>1){
    d=sa.getRange(1,1,lr,sa.getLastColumn()).getDisplayValues();
    c=TT_cols(sa);
    for(i=1;i<d.length;i++){
      r=d[i];
      if(String(TT_v(r,c,'ID_TALLER'))!==String(id)) continue;
      k=String(TT_v(r,c,'EXPEDIENTE')).toUpperCase()+'|'+String(TT_v(r,c,'ID_SESION'));
      map[k]=String(TT_v(r,c,'ASISTENCIA')).toUpperCase();
    }
  }
  for(i=0;i<alumnos.length;i++){
    alumnos[i].sesiones={};
    for(var j=0;j<sesiones.length;j++){
      k=String(alumnos[i].expediente).toUpperCase()+'|'+String(sesiones[j].id);
      alumnos[i].sesiones[sesiones[j].id]=(map[k]==='PRESENTE');
    }
  }
  var res={status:true,alumnos:alumnos,sesiones:sesiones};
  TT_cachePut_(key,res,120);
  return res;
}

function TT_portalRapido(token){
  var a=TT_tok(token), talleres=TT_listarTalleres(), sm=TT_sheet(TT_ID_TALL,'MATRICULADOS');
  var lr=sm.getLastRow(), d=[],c={}, counts={},i,r,id,out=[];
  if(lr>1){
    d=sm.getRange(1,1,lr,sm.getLastColumn()).getDisplayValues(); c=TT_cols(sm);
    for(i=1;i<d.length;i++){
      id=String(TT_v(d[i],c,'ID_TALLER'));
      if(id) counts[id]=(counts[id]||0)+1;
    }
  }
  for(i=0;i<talleres.length;i++){
    if(String(talleres[i].idAsesor)!==String(a.id)) continue;
    r=talleres[i];
    out.push({
      id:r.id,nombre:r.nombre,nroSesiones:r.nroSesiones,estado:r.estado,
      cantidad:counts[r.id]||0,asesor:r.asesor
    });
  }
  return {status:true,asesor:a,talleres:out};
}

function TT_portalMatrizAsistencia(token,id){
  var a=TT_tok(token); TT_checkT(id,a);
  return TT_matrizAsistenciaTaller_(id);
}

function TT_toggleAsistencia(token,d){
  try{
    var a=TT_tok(token); TT_checkT(d.idTaller,a);
    var s=TT_sheet(TT_ID_TALL,'ASISTENCIA'), lr=s.getLastRow(), c=TT_cols(s);
    var data=lr>1?s.getRange(1,1,lr,s.getLastColumn()).getDisplayValues():[[]];
    var i,r,fila=-1, exp=String(d.expediente||'').toUpperCase(), presente=!!d.presente;
    for(i=1;i<data.length;i++){
      r=data[i];
      if(String(TT_v(r,c,'ID_TALLER'))===String(d.idTaller) &&
         String(TT_v(r,c,'ID_SESION'))===String(d.idSesion) &&
         String(TT_v(r,c,'EXPEDIENTE')).toUpperCase()===exp){ fila=i+1; break; }
    }
    var estado=presente?'PRESENTE':'AUSENTE', fecha=TT_f(new Date(),'dd/MM/yyyy HH:mm:ss');
    if(fila>0){
      s.getRange(fila,c['ASISTENCIA']).setValue(estado);
      s.getRange(fila,c['FECHA_REGISTRO']).setValue(fecha);
      if(c['ID_ASESOR']) s.getRange(fila,c['ID_ASESOR']).setValue(a.id);
      if(c['ASESOR']) s.getRange(fila,c['ASESOR']).setValue((a.grado+' '+a.nombres).trim());
    }else{
      var id=TT_id(s,'ID_ASISTENCIA','ASI',6);
      s.appendRow([id,d.idTaller,d.idSesion,d.nroSesion||'',d.expediente,d.dni,d.nombres,estado,fecha,a.id,(a.grado+' '+a.nombres).trim(),'']);
    }
    TT_cache_().remove('TT_MATRIZ_V3_'+String(d.idTaller));
    TT_cacheClearGrupo_(d.idTaller);
    return {status:true,presente:presente};
  }catch(e){return{status:false,message:e.message}}
}

function TT_finalizarDocumentos(idInscripcion){
  try{
    var s=TT_sheet(TT_ID_INS,'INSCRIPCIONES'), fila=TT_find(s,'ID_INSCRIPCION',idInscripcion);
    if(fila<0) throw new Error('Inscripción no encontrada.');
    var c=TT_cols(s), row=s.getRange(fila,1,1,s.getLastColumn()).getDisplayValues()[0];
    var req=['DOC_DNI_URL','DOC_NO_ADEUDO_URL','DOC_CV_URL','DOC_CARTA_COMPROMISO_URL','DOC_PLAN_TESIS_URL','DOC_PAGO_URL'];
    for(var i=0;i<req.length;i++) if(!String(TT_v(row,c,req[i])||'').trim())
      return {status:false,message:'Todavía falta registrar uno o más documentos.'};
    s.getRange(fila,c['ESTADO']).setValue('PENDIENTE DE VALIDACIÓN');
    TT_cacheClear_();
    return {status:true,message:'Ya se enviaron correctamente los documentos.'};
  }catch(e){return{status:false,message:e.message}}
}

function TT_limpiarCacheV3(idTaller){
  try{
    TT_cacheClear_();
    if(idTaller){
      TT_cache_().remove('TT_ROSTER_V3_'+String(idTaller));
      TT_cache_().remove('TT_MATRIZ_V3_'+String(idTaller));
      TT_cacheClearGrupo_(idTaller);
    }
    return {status:true};
  }catch(e){return{status:false,message:e.message}}
}


/* =========================================================
   V4 - COPIA DOCUMENTAL NO BLOQUEANTE + PROGRESO
   ========================================================= */
function TT_jobKey_(exp){return 'TT_COPY_JOB_'+String(exp||'').toUpperCase()}
function TT_crearTrabajoCopia_(exp,nombres,p,admin,correoAdmin){
  var job={
    expediente:String(exp||'').toUpperCase(),
    nombres:nombres||'',
    estado:'PENDIENTE',
    porcentaje:0,
    mensaje:'Pendiente de procesar',
    inicio:'',
    fin:'',
    error:'',
    participante:p||{},
    admin:admin||'',
    correoAdmin:correoAdmin||''
  };
  PropertiesService.getScriptProperties().setProperty(TT_jobKey_(exp),JSON.stringify(job));
  return job;
}
function TT_estadoCopia(exp){
  var raw=PropertiesService.getScriptProperties().getProperty(TT_jobKey_(exp));
  if(!raw)return{status:true,job:{expediente:exp,estado:'SIN_DATOS',porcentaje:0,mensaje:'Sin información de copia'}};
  try{return{status:true,job:JSON.parse(raw)}}catch(e){return{status:false,message:e.message}}
}
function TT_iniciarCopiaDocumental(exp){
  var props=PropertiesService.getScriptProperties(),key=TT_jobKey_(exp),raw=props.getProperty(key),job;
  try{
    job=raw?JSON.parse(raw):{expediente:String(exp||'').toUpperCase(),nombres:'',participante:{}};
    if(job.estado==='COMPLETADO')return{status:true,job:job};

    job.estado='PROCESANDO';
    job.porcentaje=8;
    job.mensaje='Preparando expediente...';
    job.inicio=TT_f(new Date(),'dd/MM/yyyy HH:mm:ss');
    job.error='';
    props.setProperty(key,JSON.stringify(job));

    /*
      1. Invitado + seguimiento + historial.
      Esta parte ya NO bloquea el botón VALIDAR Y MATRICULAR.
    */
    if(typeof procesarRegistrosComplementarios==='function'){
      job.porcentaje=20;
      job.mensaje='Creando acceso y seguimiento del alumno...';
      props.setProperty(key,JSON.stringify(job));

      var rc=procesarRegistrosComplementarios({
        expediente:job.expediente,
        grupo:1,
        participantes:[job.participante],
        admin:job.admin||'',
        correo_admin:job.correoAdmin||''
      });

      if(rc&&rc.status===false){
        job.mensaje='Seguimiento creado con observaciones. Continuando con documentos...';
        props.setProperty(key,JSON.stringify(job));
      }
    }

    /*
      2. Copia de carpetas/documentos.
    */
    if(typeof iniciarCopias!=='function')throw new Error('No existe iniciarCopias() en el proyecto.');

    job.porcentaje=45;
    job.mensaje='Copiando documentos en Drive...';
    props.setProperty(key,JSON.stringify(job));

    iniciarCopias({
      expediente:job.expediente,
      participantes:[job.participante]
    });

    job.estado='COMPLETADO';
    job.porcentaje=100;
    job.mensaje='Expediente, acceso, seguimiento y documentos listos.';
    job.fin=TT_f(new Date(),'dd/MM/yyyy HH:mm:ss');
    props.setProperty(key,JSON.stringify(job));

    TT_cacheClear_();

    return{status:true,job:job};

  }catch(e){
    job=job||{expediente:String(exp||'').toUpperCase()};
    job.estado='ERROR';
    job.error=e.message;
    job.mensaje='No se pudo completar el procesamiento posterior.';
    job.fin=TT_f(new Date(),'dd/MM/yyyy HH:mm:ss');
    props.setProperty(key,JSON.stringify(job));
    return{status:false,message:e.message,job:job};
  }
}
function TT_reintentarCopiaDocumental(exp){
  var r=TT_estadoCopia(exp),j=(r&&r.job)||{};
  j.estado='PENDIENTE';j.porcentaje=0;j.mensaje='Pendiente de reintentar';j.error='';
  PropertiesService.getScriptProperties().setProperty(TT_jobKey_(exp),JSON.stringify(j));
  return TT_iniciarCopiaDocumental(exp);
}
