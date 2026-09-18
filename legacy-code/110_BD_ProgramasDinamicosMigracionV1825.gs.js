function BD1825_PREVISUALIZAR_PROGRAMAS_NUEVOS() {
  var sh = BD1821_origen_();
  var hm = BD1821_headers_(sh);
  var actuales = BD1821_programas_();
  var last = sh.getLastRow();
  var nuevos = {};

  for (var fila=2; fila<=last; fila++) {
    var row = sh.getRange(fila,1,1,sh.getLastColumn()).getValues()[0];
    var nombre = BD1821_txt_(BD1821_val_(row,hm,'PROGRAMA'));
    if (!nombre) continue;
    if (!actuales[BD1821_key_(nombre)]) {
      nuevos[BD1821_key_(nombre)] = nombre;
    }
  }

  var lista = Object.keys(nuevos).map(function(k){ return nuevos[k]; }).sort();
  var out = {
    status:true,
    fase:'BD-18.25',
    version:'db-18.25-programas-dinamicos',
    modificaDatos:false,
    cantidad:lista.length,
    programasQueSeCrearan:lista
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}
