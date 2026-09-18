function BD1820_PROBAR_DIAGNOSTICO() {
  var resultado = {
    status: true,
    fase: "BD-18.20",
    version: "db-18.20-menu-simplificado",
    eliminadosDelMenu: [
      "Administración de Expedientes",
      "Seguimiento de Expediente"
    ],
    soloOcultaAccesosMenu: true,
    eliminaFuncionesInternas: false,
    eliminaDatos: false
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
