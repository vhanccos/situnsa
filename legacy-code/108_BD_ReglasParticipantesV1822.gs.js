function BD1822_PROBAR_REGLAS_PARTICIPANTES() {
  var sh = BD1821_origen_();
  var hm = BD1821_headers_(sh);
  var indice = BD1822_indiceFuente_(sh,hm);
  var muestras = [];
  var last = sh.getLastRow();

  for (var fila=2; fila<=last && muestras.length<20; fila++) {
    var row = sh.getRange(fila,1,1,sh.getLastColumn()).getValues()[0];
    var nombreOriginal = BD1821_txt_(BD1821_val_(row,hm,'NOMBRES'));
    var nombres = BD1822_partirNombres_(row,hm);

    /*
     * Mostrar únicamente filas que REALMENTE contienen " Y " en NOMBRES.
     */
    if (nombres.length === 2) {
      var r = BD1822_resolverParticipantes_(fila,row,hm,indice);
      muestras.push({
        fila:fila,
        nombreOriginal:nombreOriginal,
        participantes:r.participantes.map(function(p){
          return {
            nombre:p.nombre,
            dni:p.dni,
            cui:p.cui,
            filaFuente:p.filaFuente
          };
        }),
        filasConsumidas:r.consumidas
      });
    }
  }

  var out = {
    status:true,
    fase:'BD-18.23',
    version:'db-18.23-deteccion-parejas-por-nombres',
    reglaDni:'8 dígitos',
    reglaCui:'8 dígitos',
    dosParticipantes:'SOLO cuando NOMBRES contiene " Y "',
    columnasTesista:'TESISTA_1/TESISTA_2 son auxiliares; no crean por sí solas una pareja',
    asignacionParejaCompleta:'DNI1/CUI1 -> NOMBRE1; DNI2/CUI2 -> NOMBRE2',
    asignacionUnSoloDniCui:'TESISTA_1 ayuda a identificar a quién pertenece; luego se busca al otro por nombre',
    muestras:muestras,
    modificaDatos:false
  };

  Logger.log(JSON.stringify(out,null,2));
  return out;
}
