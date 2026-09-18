/**
 * BD-18.4 - PORTAL INVITADO RELACIONAL
 * Fuente única para resumen y agenda del tesista.
 */
const BD184_CONFIG=Object.freeze({fase:'BD-18.4',version:'db-18.4-portal-invitado-relacional'});

function BD184_txt_(v){return String(v==null?'':v).trim();}
function BD184_up_(v){return BD184_txt_(v).toUpperCase();}
function BD184_dni_(v){return BD184_txt_(v).replace(/\D/g,'');}
function BD184_fecha_(v){
  if(!v)return '';
  var tz=Session.getScriptTimeZone()||'America/Lima';
  if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))
    return Utilities.formatDate(v,tz,'dd/MM/yyyy HH:mm');
  var d=new Date(v);
  if(!isNaN(d.getTime()))return Utilities.formatDate(d,tz,'dd/MM/yyyy HH:mm');
  return BD184_txt_(v);
}
function BD184_estadoUi_(v){
  var e=BD184_up_(v);
  if(e==='FINALIZADO')return 'FINALIZADO';
  if(e==='EN_PROCESO'||e==='EN CURSO')return 'EN CURSO';
  return 'NO INICIADO';
}
function BD184_contexto_(dni){
  dni=BD184_dni_(dni);
  var estudiantes=REPO_RelacionalV5.listar('estudiantes')||[];
  var links=REPO_RelacionalV5.listar('expediente_estudiantes')||[];
  var exps=REPO_RelacionalV5.listar('expedientes')||[];
  var est=null;
  for(var i=0;i<estudiantes.length;i++)if(BD184_dni_(estudiantes[i].DNI)===dni){est=estudiantes[i];break;}
  if(!est)return null;
  var link=null;
  for(i=0;i<links.length;i++)if(String(links[i].ID_ESTUDIANTE)===String(est.ID_ESTUDIANTE)){link=links[i];break;}
  if(!link)return null;
  var exp=null;
  for(i=0;i<exps.length;i++)if(String(exps[i].ID_EXPEDIENTE)===String(link.ID_EXPEDIENTE)&&BD184_up_(exps[i].ESTADO_REGISTRO)!=='ELIMINADO'){exp=exps[i];break;}
  return exp?{dni:dni,estudiante:est,link:link,expediente:exp}:null;
}
function BD184_OBTENER_PROCESO_INVITADO(dni){
  var c=BD184_contexto_(dni);
  if(!c)return [];
  var id=String(c.expediente.ID_EXPEDIENTE);
  var ecat=REPO_RelacionalV5.listar('etapas_catalogo')||[];
  var scat=REPO_RelacionalV5.listar('subetapas_catalogo')||[];
  var ee=REPO_RelacionalV5.filtrar('expediente_etapas',{ID_EXPEDIENTE:id})||[];
  var es=REPO_RelacionalV5.filtrar('expediente_subetapas',{ID_EXPEDIENTE:id})||[];
  var codigo=BD184_txt_(c.expediente.CODIGO_TRAMITE);
  var checklists={};
  [1,2].forEach(function(et){
    try{
      if(typeof BD177_OBTENER_CHECKLIST==='function'){
        var ck=BD177_OBTENER_CHECKLIST(codigo,et);
        if(ck&&ck.status)checklists[et]=ck;
      }
    }catch(e){}
  });
  var eBy={},sBy={},eeBy={};
  ecat.forEach(function(x){eBy[String(x.ID_ETAPA)]=x;});
  scat.forEach(function(x){sBy[String(x.ID_SUBETAPA)]=x;});
  ee.forEach(function(x){eeBy[String(x.ID_ETAPA)]=x;});
  var grupos={};
  es.forEach(function(r){
    var s=sBy[String(r.ID_SUBETAPA)];
    if(!s||BD184_up_(s.ESTADO_REGISTRO)==='INACTIVO')return;
    var e=eBy[String(s.ID_ETAPA)]||{};
    var n=Number(e.ORDEN||0); if(!n)return;
    var item={
      subetapa:Number(s.ORDEN||0),
      codigo:BD184_txt_(s.CODIGO),
      descripcion:BD184_txt_(s.NOMBRE),
      plazo:BD184_txt_(s.PLAZO),
      estado:BD184_estadoUi_(r.ESTADO),
      fechaInicio:BD184_fecha_(r.FECHA_INICIO),
      fechaFin:BD184_fecha_(r.FECHA_FIN),
      responsable:BD184_txt_(r.ID_RESPONSABLE)
    };
    if(Number(s.ORDEN||0)===1 && checklists[n]){
      item.checklist={
        marcados:Number(checklists[n].marcados||0),
        total:Number(checklists[n].total||0),
        porcentaje:Number(checklists[n].porcentaje||0),
        completo:!!checklists[n].completo,
        requisitos:(checklists[n].requisitos||[]).map(function(x){
          return {
            numero:Number(x.numero||0),
            nombre:BD184_txt_(x.nombre),
            marcado:!!x.marcado,
            actualizado:BD184_txt_(x.actualizado)
          };
        })
      };
    }
    (grupos[n]=grupos[n]||[]).push(item);
  });
  var out=[];
  ecat.filter(function(e){return BD184_up_(e.ESTADO_REGISTRO)!=='INACTIVO';})
      .sort(function(a,b){return Number(a.ORDEN||0)-Number(b.ORDEN||0);})
      .forEach(function(e){
        var n=Number(e.ORDEN||0), ps=(grupos[n]||[]).sort(function(a,b){return a.subetapa-b.subetapa;});
        var er=eeBy[String(e.ID_ETAPA)]||{}, fin=ps.filter(function(p){return p.estado==='FINALIZADO';}).length;
        var estado=BD184_estadoUi_(er.ESTADO);
        if(!er.ESTADO){
          if(ps.length&&fin===ps.length)estado='FINALIZADO';
          else if(ps.some(function(p){return p.estado==='EN CURSO';})||fin)estado='EN CURSO';
        }
        out.push({
          etapa:n,nombre:BD184_txt_(e.NOMBRE),estado:estado,
          porcentaje:ps.length?Math.round(fin*100/ps.length):0,
          fechaInicio:BD184_fecha_(er.FECHA_INICIO),
          fechaFin:BD184_fecha_(er.FECHA_FIN),
          procesos:ps
        });
      });
  return out;
}
function BD184_OBTENER_PORTAL_INVITADO(dni){
  var c=BD184_contexto_(dni);
  if(!c)return{status:false,message:'No existe trámite relacionado al DNI.'};
  var etapas=BD184_OBTENER_PROCESO_INVITADO(dni), actual=null, total=0,fin=0;
  etapas.forEach(function(e){
    total+=e.procesos.length;
    e.procesos.forEach(function(p){if(p.estado==='FINALIZADO')fin++;});
    if(!actual&&e.estado==='EN CURSO')actual=e;
  });
  if(!actual)actual=etapas.find(function(e){return e.estado!=='FINALIZADO';})||etapas[etapas.length-1]||null;
  return{
    status:true,fuente:'RELACIONAL_DIRECTA',
    expediente:BD184_txt_(c.expediente.CODIGO_TRAMITE),
    estadoGeneral:(total&&fin===total)?'FINALIZADO':(actual?'EN CURSO':'NO INICIADO'),
    etapaActual:actual?('Etapa '+actual.etapa+' · '+actual.nombre):'---',
    porcentaje:total?Math.round(fin*100/total):0,
    etapas:etapas
  };
}
function BD184_PROBAR_PORTAL_DNI(dni){
  var r=BD184_OBTENER_PORTAL_INVITADO(dni);
  var out={status:!!r.status,fase:BD184_CONFIG.fase,version:BD184_CONFIG.version,
    expediente:r.expediente||'',etapas:(r.etapas||[]).length,
    subetapas:(r.etapas||[]).reduce(function(a,e){return a+(e.procesos||[]).length;},0),
    etapaActual:r.etapaActual||'',porcentaje:r.porcentaje||0};
  Logger.log(JSON.stringify(out,null,2)); return out;
}
function BD184_PROBAR_DNI_11111111(){return BD184_PROBAR_PORTAL_DNI('11111111');}
