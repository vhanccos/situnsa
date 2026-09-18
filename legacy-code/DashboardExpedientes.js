/* =========================================================
   DASHBOARD EXPEDIENTES - BD-17.1 RELACIONAL DIRECTO
   ---------------------------------------------------------
   Fuente única:
   - expedientes
   - expediente_estudiantes
   - estudiantes
   - programas
   - expediente_etapas / etapas_catalogo
   - expediente_subetapas / subetapas_catalogo

   Ya NO depende de COMPAT_EXPEDIENTES ni de
   COMPAT_SEGUIMIENTO_SUBETAPAS.
========================================================= */

function obtenerDashboardExpedientesV13(forzar){
  try{
    const cache = CacheService.getScriptCache();
    const cacheKey = 'DASHBOARD_EXPEDIENTES_V171_RELACIONAL';

    if(!forzar){
      const guardado = cache.get(cacheKey);
      if(guardado){
        try { return JSON.parse(guardado); } catch(e){}
      }
    }

    if(typeof REPO_RelacionalV5 === 'undefined'){
      throw new Error('No está disponible REPO_RelacionalV5.');
    }

    const tz = Session.getScriptTimeZone() || 'America/Lima';
    const exps = REPO_RelacionalV5.listar('expedientes') || [];
    const links = REPO_RelacionalV5.listar('expediente_estudiantes') || [];
    const estudiantes = REPO_RelacionalV5.listar('estudiantes') || [];
    const programas = REPO_RelacionalV5.listar('programas') || [];
    const etapasCat = REPO_RelacionalV5.listar('etapas_catalogo') || [];
    const subCat = REPO_RelacionalV5.listar('subetapas_catalogo') || [];
    const expEtapas = REPO_RelacionalV5.listar('expediente_etapas') || [];
    const expSubs = REPO_RelacionalV5.listar('expediente_subetapas') || [];

    const byEst = {};
    estudiantes.forEach(x => byEst[String(x.ID_ESTUDIANTE || '')] = x);
    const byProg = {};
    programas.forEach(x => byProg[String(x.ID_PROGRAMA || '')] = x);
    const byEtapa = {};
    etapasCat.forEach(x => byEtapa[String(x.ID_ETAPA || '')] = x);
    const bySub = {};
    subCat.forEach(x => bySub[String(x.ID_SUBETAPA || '')] = x);

    const linksByExp = {};
    links.forEach(x => {
      const k = String(x.ID_EXPEDIENTE || '');
      if(!k) return;
      (linksByExp[k] = linksByExp[k] || []).push(x);
    });
    Object.keys(linksByExp).forEach(k => linksByExp[k].sort((a,b) => Number(a.ORDEN_PARTICIPANTE||0)-Number(b.ORDEN_PARTICIPANTE||0)));

    const stagesByExp = {};
    expEtapas.forEach(x => {
      const k = String(x.ID_EXPEDIENTE || '');
      if(k) (stagesByExp[k] = stagesByExp[k] || []).push(x);
    });

    const subsByExp = {};
    expSubs.forEach(x => {
      const k = String(x.ID_EXPEDIENTE || '');
      if(k) (subsByExp[k] = subsByExp[k] || []).push(x);
    });

    function up(v){ return String(v == null ? '' : v).trim().toUpperCase(); }
    function txt(v){ return String(v == null ? '' : v).trim(); }
    function estadoUi(v){
      const e = up(v);
      if(e === 'FINALIZADO') return 'FINALIZADO';
      if(e === 'EN_PROCESO' || e === 'EN CURSO') return 'EN CURSO';
      return 'NO INICIADO';
    }
    function fechaTs(v){
      if(!v) return 0;
      if(Object.prototype.toString.call(v)==='[object Date]' && !isNaN(v.getTime())) return v.getTime();
      const d = new Date(v);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
    function fechaFmt(v){
      if(!v) return '';
      if(Object.prototype.toString.call(v)==='[object Date]' && !isNaN(v.getTime())) return Utilities.formatDate(v,tz,'dd/MM/yyyy HH:mm');
      return txt(v);
    }

    let total=0,enCurso=0,finalizados=0,sinIniciar=0;
    const salida=[];

    exps.forEach(exp => {
      if(up(exp.ESTADO_REGISTRO)==='ELIMINADO' || up(exp.ESTADO_REGISTRO)==='INACTIVO') return;
      const idExp = String(exp.ID_EXPEDIENTE || '');
      const codigo = up(exp.CODIGO_TRAMITE);
      if(!idExp || !codigo) return;

      const participantes = (linksByExp[idExp] || []).map(l => {
        const est = byEst[String(l.ID_ESTUDIANTE || '')] || {};
        const prog = byProg[String(est.ID_PROGRAMA || '')] || {};
        return {
          nombre: txt(est.APELLIDOS_NOMBRES),
          dni: txt(est.DNI),
          programa: txt(prog.NOMBRE || prog.CODIGO)
        };
      });

      const subRows = (subsByExp[idExp] || []).filter(r => {
        const c = bySub[String(r.ID_SUBETAPA || '')];
        return c && up(c.ESTADO_REGISTRO)!=='INACTIVO';
      });

      let finalizadas = 0;
      const actividades = subRows.map(r => {
        const sc = bySub[String(r.ID_SUBETAPA || '')] || {};
        const ec = byEtapa[String(sc.ID_ETAPA || '')] || {};
        const est = up(r.ESTADO);
        if(est==='FINALIZADO') finalizadas++;
        const ref = r.FECHA_FIN || r.MODIFICADO_EN || r.FECHA_INICIO || '';
        return {
          etapa: Number(ec.ORDEN || 0),
          nombreEtapa: txt(ec.NOMBRE),
          subOrden: Number(sc.ORDEN || 0),
          codigoSub: txt(sc.CODIGO),
          descripcionSubetapa: txt(sc.NOMBRE),
          estadoRaw: est,
          fechaRaw: ref,
          ts: fechaTs(ref)
        };
      }).sort((a,b)=>(a.etapa-b.etapa)||(a.subOrden-b.subOrden));

      let actual = actividades.find(a => a.estadoRaw==='EN_PROCESO' || a.estadoRaw==='EN CURSO');
      if(!actual) actual = actividades.find(a => a.estadoRaw!=='FINALIZADO');
      if(!actual && actividades.length) actual = actividades[actividades.length-1];

      const totalActs = actividades.length;
      const porcentaje = totalActs ? Math.round(finalizadas*100/totalActs) : 0;
      let estadoGeneral = 'NO INICIADO';
      if(totalActs && finalizadas===totalActs) estadoGeneral='FINALIZADO';
      else if(actividades.some(a => a.estadoRaw==='EN_PROCESO' || a.estadoRaw==='EN CURSO') || finalizadas>0) estadoGeneral='EN CURSO';
      else {
        const erows = stagesByExp[idExp] || [];
        if(erows.some(r => up(r.ESTADO)==='EN_PROCESO')) estadoGeneral='EN CURSO';
      }

      let ultimaTs = 0, ultimaRaw='';
      actividades.forEach(a => { if(a.ts>ultimaTs){ultimaTs=a.ts; ultimaRaw=a.fechaRaw;} });
      const expTs = fechaTs(exp.MODIFICADO_EN || exp.FECHA_CREACION || exp.FECHA_EXP);
      if(expTs>ultimaTs){ ultimaTs=expTs; ultimaRaw=exp.MODIFICADO_EN || exp.FECHA_CREACION || exp.FECHA_EXP; }

      total++;
      if(estadoGeneral==='FINALIZADO') finalizados++;
      else if(estadoGeneral==='EN CURSO') enCurso++;
      else sinIniciar++;

      salida.push({
        expediente: codigo,
        nombres: participantes.map(p=>p.nombre).filter(Boolean).join(' / '),
        dni: participantes.map(p=>p.dni).filter(Boolean).join(' / '),
        programa: participantes.map(p=>p.programa).filter(Boolean).join(' / '),
        modalidad: txt(exp.MODALIDAD || exp.MODALIDAD_FINAL),
        etapa: actual ? actual.etapa : '',
        nombreEtapa: actual ? actual.nombreEtapa : '',
        subetapa: actual ? (actual.codigoSub || actual.subOrden) : '',
        descripcionSubetapa: actual ? actual.descripcionSubetapa : '',
        estado: estadoGeneral,
        ultimaActualizacion: fechaFmt(ultimaRaw),
        ultimaActualizacionTs: ultimaTs,
        avancePorcentaje: porcentaje,
        avanceFinalizadas: finalizadas,
        avanceTotal: totalActs,
        avanceTexto: finalizadas + '/' + totalActs
      });
    });

    salida.sort((a,b)=>{
      const d=(b.ultimaActualizacionTs||0)-(a.ultimaActualizacionTs||0);
      if(d) return d;
      const na=parseInt(String(a.expediente).replace(/\D/g,''),10)||0;
      const nb=parseInt(String(b.expediente).replace(/\D/g,''),10)||0;
      return nb-na;
    });

    const respuesta={
      status:true,
      fuente:'RELACIONAL_DIRECTA',
      generado:Utilities.formatDate(new Date(),tz,'dd/MM/yyyy HH:mm:ss'),
      resumen:{total:total,enCurso:enCurso,finalizados:finalizados,sinIniciar:sinIniciar},
      expedientes:salida
    };

    try { cache.put(cacheKey, JSON.stringify(respuesta), 120); } catch(e){}
    return respuesta;

  }catch(error){
    Logger.log('ERROR obtenerDashboardExpedientesV13 BD17.1: '+(error.stack||error));
    return {status:false,fuente:'RELACIONAL_DIRECTA',message:error&&error.message?error.message:String(error),resumen:{total:0,enCurso:0,finalizados:0,sinIniciar:0},expedientes:[]};
  }
}

function BD171_PROBAR_DASHBOARD_RELACIONAL(){
  const r=obtenerDashboardExpedientesV13(true);
  const out={
    status:!!r.status,
    fase:'BD-17.1',
    version:'db-17.1-dashboard-relacional',
    fuente:r.fuente||'',
    total:r.resumen?r.resumen.total:0,
    ultimo:r.expedientes&&r.expedientes.length?r.expedientes[0].expediente:'',
    expedientes:(r.expedientes||[]).map(x=>x.expediente),
    error:r.status?'':(r.message||'')
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

/* =========================================================
   UTILIDADES PRIVADAS
========================================================= */

function dashNormalizarEncabezadoV13(valor){

  return String(
    valor || ''
  )
  .trim()
  .replace(
    /\s+/g,
    ' '
  )
  .toUpperCase();

}


function dashConstruirIndiceV13(encabezados){

  const indice = {};

  encabezados.forEach(
    function(nombre,i){

      if(nombre){
        indice[nombre] = i;
      }

    }
  );

  return indice;

}


function dashBuscarColumnaV13(
  indice,
  alternativas
){

  for(
    let i = 0;
    i < alternativas.length;
    i++
  ){

    const nombre =
      dashNormalizarEncabezadoV13(
        alternativas[i]
      );

    if(
      Object.prototype
        .hasOwnProperty
        .call(
          indice,
          nombre
        )
    ){

      return indice[
        nombre
      ];

    }

  }

  return -1;

}


function dashValorFilaV13(
  fila,
  indice
){

  if(
    indice === -1 ||
    indice == null
  ){

    return '';

  }

  return fila[indice] == null
    ? ''
    : fila[indice];

}


function dashValorColNombreV13(
  fila,
  col,
  nombre
){

  if(
    !col ||
    !col[nombre]
  ){

    return '';

  }

  const indice =
    Number(
      col[nombre]
    ) - 1;

  return fila[indice] == null
    ? ''
    : fila[indice];

}


function dashCombinarV13(
  valor1,
  valor2
){

  const a =
    String(
      valor1 || ''
    )
    .trim();

  const b =
    String(
      valor2 || ''
    )
    .trim();

  if(a && b){
    return a + ' / ' + b;
  }

  return a || b || '';

}


function dashFechaTimestampV13(valor){

  if(!valor){
    return 0;
  }

  if(
    Object.prototype
      .toString
      .call(valor)
    ===
    '[object Date]' &&
    !isNaN(
      valor.getTime()
    )
  ){

    return valor.getTime();

  }

  const texto =
    String(
      valor
    )
    .trim();

  const m =
    texto.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );

  if(m){

    return new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1]),
      Number(m[4] || 0),
      Number(m[5] || 0),
      Number(m[6] || 0)
    ).getTime();

  }

  const fecha =
    new Date(
      texto
    );

  return isNaN(
    fecha.getTime()
  )
    ? 0
    : fecha.getTime();

}


function dashFormatearFechaV13(
  valor,
  tz
){

  if(!valor){
    return '';
  }

  if(
    Object.prototype
      .toString
      .call(valor)
    ===
    '[object Date]' &&
    !isNaN(
      valor.getTime()
    )
  ){

    return Utilities.formatDate(
      valor,
      tz ||
      'America/Lima',
      'dd/MM/yyyy HH:mm:ss'
    );

  }

  return String(
    valor
  );

}
