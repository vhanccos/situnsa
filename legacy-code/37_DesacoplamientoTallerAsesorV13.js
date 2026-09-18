/**
 * FASE 13 - DESACOPLAMIENTO TALLER DE TESIS + ASESORES + REVISION DOCUMENTAL
 * Los catalogos, autenticacion de asesor, portal rapido, asistencia y revision
 * documental acceden directamente a Sheets/Cache mediante Repository.
 * Permanecen como motores temporales las operaciones que mezclan Drive,
 * inscripcion publica, matriculacion y copias documentales.
 */

const CFG_TALLER_V13 = Object.freeze({
  inscripcionesId: '1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs',
  talleresId: '1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs',
  asesoresId: '1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs',
  seguimientoSubetapasId: '1W8Qr3d7j4AtjqIjZ0j_ZLQbHNj2pLaYlExBVox_CMGs',
  ttlCatalogos: 600,
  ttlSesionAsesor: 21600
});

function V13_sheet_(id, nombre){
  nombre = BD15_COMPAT_NOMBRE_(nombre);
  const sh = SpreadsheetApp.openById(BD15_CONFIG.spreadsheetId).getSheetByName(nombre);
  if (!sh) throw new Error('No existe la hoja ' + nombre + '.');
  return sh;
}
function V13_cols_(sh){
  const h = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0], out={};
  h.forEach((x,i)=> out[String(x||'').trim().toUpperCase()] = i+1);
  return out;
}
function V13_v_(r,c,n){ return c[n] ? r[c[n]-1] : ''; }
function V13_find_(sh,col,val){
  const c=V13_cols_(sh), data=sh.getDataRange().getDisplayValues(), target=String(val||'').trim().toUpperCase();
  if(!c[String(col).toUpperCase()]) return -1;
  const idx=c[String(col).toUpperCase()]-1;
  for(let i=1;i<data.length;i++) if(String(data[i][idx]||'').trim().toUpperCase()===target) return i+1;
  return -1;
}
function V13_nextId_(sh,col,pref,dig){
  const c=V13_cols_(sh), idx=c[String(col).toUpperCase()], lr=sh.getLastRow(); let max=0;
  if(idx && lr>1){
    sh.getRange(2,idx,lr-1,1).getDisplayValues().forEach(x=>{
      const m=String(x[0]||'').match(/\d+/); if(m) max=Math.max(max,Number(m[0]));
    });
  }
  return pref + String(max+1).padStart(dig||4,'0');
}
function V13_fecha_(patron){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone()||'America/Lima', patron||'dd/MM/yyyy HH:mm:ss'); }
function V13_hash_(texto){
  const b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(texto||''),Utilities.Charset.UTF_8);
  return b.map(v=>{ if(v<0)v+=256; return ('0'+v.toString(16)).slice(-2); }).join('');
}
function V13_cacheGet_(k){ try{ const x=CacheService.getScriptCache().get(k); return x?JSON.parse(x):null; }catch(e){ return null; } }
function V13_cachePut_(k,v,s){ try{ CacheService.getScriptCache().put(k,JSON.stringify(v),Number(s||CFG_TALLER_V13.ttlCatalogos)); }catch(e){} }
function V13_cacheRemove_(keys){ try{ CacheService.getScriptCache().removeAll(keys); }catch(e){} }

const REPO_TallerCoreV13 = Object.freeze({
  arquitectura(){ return {fase:13, modulo:'Taller + Asesores', accesoDirectoSheets:true, tallerTesisGsPrincipal:false}; },

  listarAsesores(forzar){
    const key='V13_ASESORES'; if(!forzar){ const x=V13_cacheGet_(key); if(x) return x; }
    const sh=V13_sheet_(CFG_TALLER_V13.asesoresId,'ASESORES'), lr=sh.getLastRow(); if(lr<2) return [];
    const data=sh.getRange(1,1,lr,sh.getLastColumn()).getDisplayValues(), c=V13_cols_(sh), out=[];
    for(let i=1;i<data.length;i++) if(V13_v_(data[i],c,'ID_ASESOR')) out.push({
      id:V13_v_(data[i],c,'ID_ASESOR'), grado:V13_v_(data[i],c,'GRADO'), nombres:V13_v_(data[i],c,'APELLIDOS_NOMBRES'),
      dni:V13_v_(data[i],c,'DNI'), correo:V13_v_(data[i],c,'CORREO'), telefono:V13_v_(data[i],c,'TELEFONO'),
      usuario:V13_v_(data[i],c,'USUARIO'), estado:V13_v_(data[i],c,'ESTADO')
    });
    V13_cachePut_(key,out); return out;
  },

  crearAsesor(d){
    d=d||{}; const lock=LockService.getScriptLock();
    try{
      lock.waitLock(30000); const sh=V13_sheet_(CFG_TALLER_V13.asesoresId,'ASESORES'), dni=String(d.dni||'').replace(/\D/g,'');
      if(!/^\d{8}$/.test(dni)) return {status:false,message:'DNI inválido.'};
      if(V13_find_(sh,'DNI',dni)>0) return {status:false,message:'El asesor ya existe.'};
      if(!String(d.password||'').trim() || String(d.password).length<6) return {status:false,message:'Contraseña mínima: 6 caracteres.'};
      const c=V13_cols_(sh), row=new Array(sh.getLastColumn()).fill('');
      const set=(n,v)=>{ if(c[n]) row[c[n]-1]=v==null?'':v; };
      set('ID_ASESOR',V13_nextId_(sh,'ID_ASESOR','ASE',4)); set('GRADO',d.grado||''); set('APELLIDOS_NOMBRES',String(d.nombres||'').toUpperCase());
      set('DNI',dni); set('CORREO',String(d.correo||'').toLowerCase()); set('TELEFONO',d.telefono||''); set('USUARIO',d.usuario||dni);
      set('PASSWORD_HASH',V13_hash_(d.password)); set('ESTADO','ACTIVO'); set('FECHA_REGISTRO',V13_fecha_()); sh.appendRow(row);
      V13_cacheRemove_(['V13_ASESORES','V13_TALLERES','V13_BOOT']); return {status:true,message:'Asesor creado.'};
    }catch(e){ return {status:false,message:e.message}; } finally{ try{lock.releaseLock();}catch(x){} }
  },

  listarTalleres(forzar){
    const key='V13_TALLERES'; if(!forzar){ const x=V13_cacheGet_(key); if(x) return x; }
    const sh=V13_sheet_(CFG_TALLER_V13.talleresId,'TALLERES'), lr=sh.getLastRow(); if(lr<2) return [];
    const data=sh.getRange(1,1,lr,sh.getLastColumn()).getDisplayValues(), c=V13_cols_(sh), out=[];
    for(let i=1;i<data.length;i++) if(V13_v_(data[i],c,'ID_TALLER')) out.push({
      id:V13_v_(data[i],c,'ID_TALLER'), nombre:V13_v_(data[i],c,'NOMBRE_TALLER'), idAsesor:V13_v_(data[i],c,'ID_ASESOR'),
      asesor:V13_v_(data[i],c,'ASESOR'), nroSesiones:Number(V13_v_(data[i],c,'NRO_SESIONES')||0), estado:V13_v_(data[i],c,'ESTADO')
    });
    V13_cachePut_(key,out); return out;
  },

  crearTaller(d){
    d=d||{}; const lock=LockService.getScriptLock();
    try{
      lock.waitLock(30000);
      const st=V13_sheet_(CFG_TALLER_V13.talleresId,'TALLERES'), sa=V13_sheet_(CFG_TALLER_V13.asesoresId,'ASESORES'), ss=V13_sheet_(CFG_TALLER_V13.talleresId,'SESIONES');
      const fa=V13_find_(sa,'ID_ASESOR',d.idAsesor), n=Number(d.nroSesiones||0), nom=String(d.nombre||'').trim().toUpperCase();
      if(fa<0) return {status:false,message:'Seleccione asesor.'}; if(n<1) return {status:false,message:'Cantidad de sesiones inválida.'};
      if(!nom) return {status:false,message:'Ingrese nombre del taller.'}; if(V13_find_(st,'NOMBRE_TALLER',nom)>0) return {status:false,message:'El taller ya existe.'};
      const ca=V13_cols_(sa), ra=sa.getRange(fa,1,1,sa.getLastColumn()).getDisplayValues()[0];
      const id=V13_nextId_(st,'ID_TALLER','TAL',4), asesor=(V13_v_(ra,ca,'GRADO')+' '+V13_v_(ra,ca,'APELLIDOS_NOMBRES')).trim();
      const c=V13_cols_(st), row=new Array(st.getLastColumn()).fill(''), set=(k,v)=>{if(c[k])row[c[k]-1]=v==null?'':v;};
      set('ID_TALLER',id);set('NOMBRE_TALLER',nom);set('ID_ASESOR',d.idAsesor);set('ASESOR',asesor);set('NRO_SESIONES',n);
      set('FECHA_INICIO',d.fechaInicio||'');set('FECHA_FIN',d.fechaFin||'');set('ESTADO','ACTIVO');set('FECHA_CREACION',V13_fecha_());set('CREADO_POR',d.creadoPor||'');st.appendRow(row);
      const cs=V13_cols_(ss);
      for(let i=1;i<=n;i++){
        const rs=new Array(ss.getLastColumn()).fill(''), s=(k,v)=>{if(cs[k])rs[cs[k]-1]=v==null?'':v;};
        s('ID_SESION',id+'-S'+String(i).padStart(2,'0'));s('ID_TALLER',id);s('TALLER',nom);s('NRO_SESION',i);s('ESTADO','PROGRAMADA');ss.appendRow(rs);
      }
      V13_cacheRemove_(['V13_TALLERES','V13_BOOT']); return {status:true,message:'Taller creado.'};
    }catch(e){return{status:false,message:e.message};}finally{try{lock.releaseLock();}catch(x){}}
  },

  loginAsesor(usuario,password){
    try{
      const sh=V13_sheet_(CFG_TALLER_V13.asesoresId,'ASESORES'), data=sh.getDataRange().getDisplayValues(), c=V13_cols_(sh), u=String(usuario||'').toLowerCase(), h=V13_hash_(password);
      for(let i=1;i<data.length;i++){
        const r=data[i], match=(String(V13_v_(r,c,'USUARIO')).toLowerCase()===u || String(V13_v_(r,c,'DNI')).toLowerCase()===u || String(V13_v_(r,c,'CORREO')).toLowerCase()===u);
        if(match && String(V13_v_(r,c,'PASSWORD_HASH'))===h && String(V13_v_(r,c,'ESTADO')).toUpperCase()==='ACTIVO'){
          const token=Utilities.getUuid(), asesor={id:V13_v_(r,c,'ID_ASESOR'),grado:V13_v_(r,c,'GRADO'),nombres:V13_v_(r,c,'APELLIDOS_NOMBRES'),correo:V13_v_(r,c,'CORREO')};
          CacheService.getScriptCache().put('V13_ASESOR_'+token,JSON.stringify(asesor),CFG_TALLER_V13.ttlSesionAsesor);
          return {status:true,token:token,asesor:asesor};
        }
      }
      return {status:false,message:'Usuario o contraseña incorrectos.'};
    }catch(e){return{status:false,message:e.message};}
  },

  token(token){
    let raw=CacheService.getScriptCache().get('V13_ASESOR_'+String(token||''));
    // Compatibilidad con sesiones creadas antes de FASE 13.
    if(!raw) raw=CacheService.getScriptCache().get('TT_A_'+String(token||''));
    if(!raw) throw new Error('Sesión vencida.'); return JSON.parse(raw);
  },

  comprobarTaller(idTaller,asesor){
    const t=this.listarTalleres(false).find(x=>String(x.id)===String(idTaller) && String(x.idAsesor)===String(asesor.id));
    if(!t) throw new Error('No tiene acceso a este taller.'); return t;
  },

  roster(idTaller){
    const sh=V13_sheet_(CFG_TALLER_V13.talleresId,'MATRICULADOS'), lr=sh.getLastRow(), out=[]; if(lr<2) return out;
    const data=sh.getRange(1,1,lr,sh.getLastColumn()).getDisplayValues(), c=V13_cols_(sh);
    for(let i=1;i<data.length;i++) if(String(V13_v_(data[i],c,'ID_TALLER'))===String(idTaller)) out.push({
      expediente:V13_v_(data[i],c,'EXPEDIENTE'),dni:V13_v_(data[i],c,'DNI'),nombres:V13_v_(data[i],c,'APELLIDOS_NOMBRES'),
      especialidad:V13_v_(data[i],c,'ESPECIALIDAD'),correo:V13_v_(data[i],c,'CORREO'),telefono:V13_v_(data[i],c,'TELEFONO')
    });
    return out;
  },

  sesiones(idTaller){
    const sh=V13_sheet_(CFG_TALLER_V13.talleresId,'SESIONES'), lr=sh.getLastRow(), out=[]; if(lr<2) return out;
    const data=sh.getRange(1,1,lr,sh.getLastColumn()).getDisplayValues(), c=V13_cols_(sh);
    for(let i=1;i<data.length;i++) if(String(V13_v_(data[i],c,'ID_TALLER'))===String(idTaller)) out.push({id:V13_v_(data[i],c,'ID_SESION'),nro:Number(V13_v_(data[i],c,'NRO_SESION')),fecha:V13_v_(data[i],c,'FECHA'),horaInicio:V13_v_(data[i],c,'HORA_INICIO'),horaFin:V13_v_(data[i],c,'HORA_FIN'),estado:V13_v_(data[i],c,'ESTADO')});
    return out;
  },

  portalRapido(token){
    const a=this.token(token), talleres=this.listarTalleres(false), sh=V13_sheet_(CFG_TALLER_V13.talleresId,'MATRICULADOS'), counts={}, lr=sh.getLastRow();
    if(lr>1){const d=sh.getRange(1,1,lr,sh.getLastColumn()).getDisplayValues(),c=V13_cols_(sh);for(let i=1;i<d.length;i++){const id=String(V13_v_(d[i],c,'ID_TALLER'));if(id)counts[id]=(counts[id]||0)+1;}}
    const out=talleres.filter(t=>String(t.idAsesor)===String(a.id)).map(t=>({id:t.id,nombre:t.nombre,nroSesiones:t.nroSesiones,estado:t.estado,cantidad:counts[t.id]||0,asesor:t.asesor}));
    return {status:true,asesor:a,talleres:out};
  },

  matrizAsistencia(token,idTaller){
    const a=this.token(token); this.comprobarTaller(idTaller,a); const alumnos=this.roster(idTaller), sesiones=this.sesiones(idTaller), map={};
    const sh=V13_sheet_(CFG_TALLER_V13.talleresId,'ASISTENCIA'), lr=sh.getLastRow();
    if(lr>1){const d=sh.getRange(1,1,lr,sh.getLastColumn()).getDisplayValues(),c=V13_cols_(sh);for(let i=1;i<d.length;i++)if(String(V13_v_(d[i],c,'ID_TALLER'))===String(idTaller)) map[String(V13_v_(d[i],c,'EXPEDIENTE')).toUpperCase()+'|'+String(V13_v_(d[i],c,'ID_SESION'))]=String(V13_v_(d[i],c,'ASISTENCIA')).toUpperCase();}
    alumnos.forEach(al=>{al.sesiones={};sesiones.forEach(s=>al.sesiones[s.id]=(map[String(al.expediente).toUpperCase()+'|'+s.id]==='PRESENTE'));});
    return {status:true,alumnos:alumnos,sesiones:sesiones};
  },

  toggleAsistencia(token,d){
    try{
      d=d||{}; const a=this.token(token); this.comprobarTaller(d.idTaller,a); const sh=V13_sheet_(CFG_TALLER_V13.talleresId,'ASISTENCIA'), c=V13_cols_(sh), lr=sh.getLastRow();
      const data=lr>1?sh.getRange(1,1,lr,sh.getLastColumn()).getDisplayValues():[], exp=String(d.expediente||'').toUpperCase(); let fila=-1;
      for(let i=1;i<data.length;i++) if(String(V13_v_(data[i],c,'ID_TALLER'))===String(d.idTaller)&&String(V13_v_(data[i],c,'ID_SESION'))===String(d.idSesion)&&String(V13_v_(data[i],c,'EXPEDIENTE')).toUpperCase()===exp){fila=i+1;break;}
      const presente=!!d.presente, estado=presente?'PRESENTE':'AUSENTE', fecha=V13_fecha_(), asesor=((a.grado||'')+' '+(a.nombres||'')).trim();
      if(fila>0){ if(c['ASISTENCIA'])sh.getRange(fila,c['ASISTENCIA']).setValue(estado); if(c['FECHA_REGISTRO'])sh.getRange(fila,c['FECHA_REGISTRO']).setValue(fecha); if(c['ID_ASESOR'])sh.getRange(fila,c['ID_ASESOR']).setValue(a.id); if(c['ASESOR'])sh.getRange(fila,c['ASESOR']).setValue(asesor); }
      else{ const row=new Array(sh.getLastColumn()).fill(''),set=(k,v)=>{if(c[k])row[c[k]-1]=v==null?'':v;}; set('ID_ASISTENCIA',V13_nextId_(sh,'ID_ASISTENCIA','ASI',6));set('ID_TALLER',d.idTaller);set('ID_SESION',d.idSesion);set('NRO_SESION',d.nroSesion||'');set('EXPEDIENTE',d.expediente);set('DNI',d.dni);set('APELLIDOS_NOMBRES',d.nombres);set('ASISTENCIA',estado);set('FECHA_REGISTRO',fecha);set('ID_ASESOR',a.id);set('ASESOR',asesor);sh.appendRow(row); }
      return {status:true,presente:presente};
    }catch(e){return{status:false,message:e.message};}
  }
});

const REPO_RevisionAsesorV13 = Object.freeze({
  asegurarColumnas(){
    const sh=REPO_SeguimientoV3.sheetSubetapas(), c=V13_cols_(sh), req=['VISTO_BUENO_ASESOR','ASESOR_VALIDO','CORREO_ASESOR_VALIDO','FECHA_VISTO_BUENO_ASESOR','VERSION_VALIDADA_ASESOR','OBSERVACION_ASESOR'];
    const miss=req.filter(x=>!c[x]); if(miss.length) sh.getRange(1,sh.getLastColumn()+1,1,miss.length).setValues([miss]); return sh;
  },
  fila(expediente,etapa){
    const sh=this.asegurarColumnas(), c=V13_cols_(sh), d=sh.getDataRange().getValues(), exp=String(expediente||'').trim().toUpperCase();
    for(let i=1;i<d.length;i++) if(String(d[i][c['EXPEDIENTE']-1]||'').trim().toUpperCase()===exp && Number(d[i][c['ETAPA']-1])===Number(etapa) && Number(d[i][c['SUBETAPA']-1])===1) return {sheet:sh,c:c,row:i+1,v:d[i]};
    return null;
  },
  construir(reg){
    if(!reg)return null; const c=reg.c,v=reg.v,val=n=>c[n]?v[c[n]-1]:'';
    return {id:val('ID'),expediente:String(val('EXPEDIENTE')||'').toUpperCase(),etapa:Number(val('ETAPA')||0),subetapa:Number(val('SUBETAPA')||0),descripcion:val('DESCRIPCION')||'',estado:val('ESTADO')||'NO INICIADO',archivoId:val('ARCHIVO_OFICIAL_ID')||'',archivoNombre:val('ARCHIVO_OFICIAL_NOMBRE')||'',archivoUrl:val('ARCHIVO_OFICIAL_URL')||'',version:Number(val('VERSION_ARCHIVO')||0),permiteNuevaCarga:String(val('PERMITE_NUEVA_CARGA')||'NO').toUpperCase(),vistoBueno:String(val('VISTO_BUENO_ASESOR')||'NO').toUpperCase()==='SI',asesorValido:val('ASESOR_VALIDO')||'',correoAsesor:val('CORREO_ASESOR_VALIDO')||'',fechaVisto:val('FECHA_VISTO_BUENO_ASESOR')?REPO11_formatearFecha_(val('FECHA_VISTO_BUENO_ASESOR')):'',versionValidada:Number(val('VERSION_VALIDADA_ASESOR')||0),observacion:val('OBSERVACION_ASESOR')||''};
  },
  acceso(token,idTaller,expediente){
    const a=REPO_TallerCoreV13.token(token); REPO_TallerCoreV13.comprobarTaller(idTaller,a); const exp=String(expediente||'').trim().toUpperCase();
    if(!REPO_TallerCoreV13.roster(idTaller).some(x=>String(x.expediente||'').trim().toUpperCase()===exp)) throw new Error('El expediente no pertenece a un taller asignado a este asesor.'); return a;
  },
  revisiones(expediente){ return {status:true,expediente:String(expediente||'').toUpperCase(),plan:this.construir(this.fila(expediente,1)),borrador:this.construir(this.fila(expediente,2))}; },
  documentos(token,idTaller,expediente){ try{this.acceso(token,idTaller,expediente);return this.revisiones(expediente);}catch(e){return{status:false,message:e.message};} },
  validar(token,idTaller,expediente,etapa){
    try{const a=this.acceso(token,idTaller,expediente),r=this.fila(expediente,etapa);if(!r)throw new Error('No se encontró la subetapa.');const c=r.c,v=r.v;if(!String(v[c['ARCHIVO_OFICIAL_ID']-1]||'').trim())throw new Error('El alumno todavía no ha presentado un documento.');const asesor=((a.grado||'')+' '+(a.nombres||'')).trim();r.sheet.getRange(r.row,c['VISTO_BUENO_ASESOR']).setValue('SI');r.sheet.getRange(r.row,c['ASESOR_VALIDO']).setValue(asesor);r.sheet.getRange(r.row,c['CORREO_ASESOR_VALIDO']).setValue(a.correo||'');r.sheet.getRange(r.row,c['FECHA_VISTO_BUENO_ASESOR']).setValue(new Date());r.sheet.getRange(r.row,c['VERSION_VALIDADA_ASESOR']).setValue(Number(v[c['VERSION_ARCHIVO']-1]||0));r.sheet.getRange(r.row,c['OBSERVACION_ASESOR']).setValue('');if(c['PERMITE_NUEVA_CARGA'])r.sheet.getRange(r.row,c['PERMITE_NUEVA_CARGA']).setValue('NO');return{status:true,message:'Visto bueno registrado.',revision:this.construir(this.fila(expediente,etapa))};}catch(e){return{status:false,message:e.message};}
  },
  nuevaCarga(token,idTaller,expediente,etapa,mensaje){
    try{const a=this.acceso(token,idTaller,expediente),r=this.fila(expediente,etapa);if(!r)throw new Error('No se encontró la subetapa.');const c=r.c,asesor=((a.grado||'')+' '+(a.nombres||'')).trim(),m=String(mensaje||'').trim();if(c['PERMITE_NUEVA_CARGA'])r.sheet.getRange(r.row,c['PERMITE_NUEVA_CARGA']).setValue('SI');r.sheet.getRange(r.row,c['VISTO_BUENO_ASESOR']).setValue('NO');['ASESOR_VALIDO','CORREO_ASESOR_VALIDO','FECHA_VISTO_BUENO_ASESOR','VERSION_VALIDADA_ASESOR'].forEach(k=>{if(c[k])r.sheet.getRange(r.row,c[k]).clearContent();});r.sheet.getRange(r.row,c['OBSERVACION_ASESOR']).setValue(m);if(m&&typeof SOA_WorkflowV11Service!=='undefined'&&SOA_WorkflowV11Service.mensaje)SOA_WorkflowV11Service.mensaje(r.v[c['ID']-1],m,asesor,a.correo||'');return{status:true,message:'Nueva carga habilitada.',revision:this.construir(this.fila(expediente,etapa))};}catch(e){return{status:false,message:e.message};}
  },
  mensaje(token,idTaller,expediente,etapa,mensaje){
    try{const a=this.acceso(token,idTaller,expediente),m=String(mensaje||'').trim();if(!m)throw new Error('Escriba un mensaje.');const r=this.fila(expediente,etapa);if(!r)throw new Error('No se encontró la subetapa.');const asesor=((a.grado||'')+' '+(a.nombres||'')).trim();if(typeof SOA_WorkflowV11Service==='undefined'||!SOA_WorkflowV11Service.mensaje)throw new Error('No existe el servicio de mensajes de workflow.');const x=SOA_WorkflowV11Service.mensaje(r.v[r.c['ID']-1],m,asesor,a.correo||'');return x&&x.status===false?x:{status:true,message:'Mensaje enviado correctamente.'};}catch(e){return{status:false,message:e.message};}
  }
});

function MVC13_diagnostico(){
  const faltantes=[];
  [['REPO_TallerCoreV13',typeof REPO_TallerCoreV13!=='undefined'],['REPO_RevisionAsesorV13',typeof REPO_RevisionAsesorV13!=='undefined'],['REPO_SeguimientoV3',typeof REPO_SeguimientoV3!=='undefined'],['SOA_WorkflowV11Service',typeof SOA_WorkflowV11Service!=='undefined']].forEach(x=>{if(!x[1])faltantes.push(x[0]);});
  let acceso={}; try{acceso={asesores:REPO_TallerCoreV13.listarAsesores(true).length,talleres:REPO_TallerCoreV13.listarTalleres(true).length,subetapas:REPO_SeguimientoV3.sheetSubetapas().getLastRow()-1};}catch(e){faltantes.push('ACCESO_DATOS: '+e.message);}
  return {status:faltantes.length===0,fase:13,arquitectura:'MVC + SOA',objetivo:'Desacoplar Taller de Tesis, Asesores y Revision documental del nucleo legacy',resultado:{catalogosDirectoSheets:true,loginAsesorDirectoRepository:true,portalRapidoDirectoRepository:true,asistenciaDirectoRepository:true,revisionAsesorDirectoSeguimientoRepository:true,motoresDriveMatriculaTemporales:true},acceso:acceso,clasificacion:{'17_TallerAsesorRepositoriesV5.gs':'IMPLEMENTACION_REPOSITORY','18_TallerAsesorServicesV5.gs':'IMPLEMENTACION_SERVICE','19_TallerAsesorControllersV5.gs':'IMPLEMENTACION_CONTROLLER','37_DesacoplamientoTallerAsesorV13.gs':'CORE_DIRECTO_SHEETS','RevisionAsesorDocumentos.gs':'ADAPTADOR_COMPATIBILIDAD','TallerTesis.gs':'MOTOR_TEMPORAL_INSCRIPCION_MATRICULA_DRIVE'},puedeEliminarRevisionAsesorDocumentosGs:false,puedeEliminarTallerTesisGs:false,motivoNoEliminar:'Inscripcion publica, carga inicial, matriculacion, copias Drive y algunas consultas avanzadas siguen usando contratos legacy hasta la limpieza final.',faltantes:faltantes,advertencias:[],errores:[]};
}
function MVC13_PROBAR_DIAGNOSTICO(){ const r=MVC13_diagnostico(); console.log(JSON.stringify(r,null,2)); return r; }
