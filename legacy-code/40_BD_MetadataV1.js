/**
 * ==============================================================
 * BD-01 - METADATOS Y MODELO RELACIONAL OBJETIVO
 * Sistema de Titulacion v2.0.0 MVC + SOA
 * ==============================================================
 * Esta fase NO modifica datos. Define el contrato de persistencia
 * que permitira tratar Google Sheets como una BD relacional y
 * migrar luego a PostgreSQL sustituyendo principalmente Repository.
 * ==============================================================
 */

const BD1_CONFIG = Object.freeze({
  version: 'db-1.1-contrato-legacy-documental',
  objetivo: 'Normalizacion relacional de Google Sheets con destino PostgreSQL',
  reglas: Object.freeze({
    unaFilaEncabezado: true,
    sinCeldasCombinadasComoDatos: true,
    clavesPrimariasObligatorias: true,
    clavesForaneasExplicitas: true,
    borradoLogico: true,
    fechasComoDate: true,
    dniComoTexto: true,
    cuiComoTexto: true,
    estadosControlados: true
  })
});

const BD1_ESTADOS = Object.freeze({
  registro: Object.freeze(['ACTIVO','INACTIVO','ELIMINADO']),
  proceso: Object.freeze(['PENDIENTE','EN_PROCESO','FINALIZADO','OBSERVADO','ANULADO']),
  documento: Object.freeze(['PENDIENTE','CARGADO','APROBADO','OBSERVADO','RECHAZADO']),
  historial: Object.freeze(['SUCCESS','INFO','WARNING','ERROR']),
  asistencia: Object.freeze(['PENDIENTE','PRESENTE','AUSENTE','JUSTIFICADO'])
});

const BD1_MODELO_OBJETIVO = Object.freeze({
  usuarios: {
    pk: 'ID_USUARIO',
    columnas: ['ID_USUARIO','USUARIO','NOMBRE','CORREO','ROL','PASSWORD_HASH','ESTADO_REGISTRO','CREADO_EN','MODIFICADO_EN']
  },
  estudiantes: {
    pk: 'ID_ESTUDIANTE',
    unique: ['DNI','CUI'],
    columnas: ['ID_ESTUDIANTE','DNI','CUI','APELLIDOS_NOMBRES','CORREO','TELEFONO','NACIONALIDAD','CIUDAD','DIRECCION','ID_PROGRAMA','ESTADO_REGISTRO','CREADO_EN','MODIFICADO_EN']
  },
  programas: {
    pk: 'ID_PROGRAMA',
    unique: ['CODIGO'],
    columnas: ['ID_PROGRAMA','CODIGO','NOMBRE','ESTADO_REGISTRO']
  },
  expedientes: {
    pk: 'ID_EXPEDIENTE',
    unique: ['CODIGO_TRAMITE'],
    fk: { ID_USUARIO_ADMIN: 'usuarios.ID_USUARIO' },
    columnas: ['ID_EXPEDIENTE','CODIGO_TRAMITE','GRUPO','FECHA_EXP','HORA_EXP','TESIS','TESIS_02','MODALIDAD','MODALIDAD_02','FECHA_PRESENTACION','FECHA_APERTURA','DECRETO','RECOMENDACION','PRESIDENTE','ASESOR','ASE_MINU','SECRETARIO','CO_ASESOR','FECHA','OFICIO','INTEGRANTE','PRESIDENTE_02','SECRETARIO_02','SUPLENTE_02','DECANAL','FECHA_ACTAS','HORAS_ACTAS','LUGAR_SUSTENTACION','MODALIDAD_FINAL','ID_USUARIO_ADMIN','FECHA_CREACION','ESTADO','ESTADO_REGISTRO','CREADO_EN','MODIFICADO_EN']
  },
  expediente_estudiantes: {
    pk: 'ID_EXPEDIENTE_ESTUDIANTE',
    fk: { ID_EXPEDIENTE: 'expedientes.ID_EXPEDIENTE', ID_ESTUDIANTE: 'estudiantes.ID_ESTUDIANTE' },
    uniqueCompuesto: ['ID_EXPEDIENTE','ID_ESTUDIANTE'],
    columnas: ['ID_EXPEDIENTE_ESTUDIANTE','ID_EXPEDIENTE','ID_ESTUDIANTE','ORDEN_PARTICIPANTE','ESTADO_REGISTRO']
  },
  etapas_catalogo: {
    pk: 'ID_ETAPA',
    columnas: ['ID_ETAPA','ORDEN','CODIGO','NOMBRE','ESTADO_REGISTRO']
  },
  subetapas_catalogo: {
    pk: 'ID_SUBETAPA',
    fk: { ID_ETAPA: 'etapas_catalogo.ID_ETAPA' },
    columnas: ['ID_SUBETAPA','ID_ETAPA','ORDEN','CODIGO','NOMBRE','ESTADO_REGISTRO']
  },
  expediente_etapas: {
    pk: 'ID_EXPEDIENTE_ETAPA',
    fk: { ID_EXPEDIENTE: 'expedientes.ID_EXPEDIENTE', ID_ETAPA: 'etapas_catalogo.ID_ETAPA', ID_RESPONSABLE: 'usuarios.ID_USUARIO' },
    uniqueCompuesto: ['ID_EXPEDIENTE','ID_ETAPA'],
    columnas: ['ID_EXPEDIENTE_ETAPA','ID_EXPEDIENTE','ID_ETAPA','ID_RESPONSABLE','ESTADO','FECHA_INICIO','FECHA_FIN','PORCENTAJE','CREADO_EN','MODIFICADO_EN']
  },
  expediente_subetapas: {
    pk: 'ID_EXPEDIENTE_SUBETAPA',
    fk: { ID_EXPEDIENTE: 'expedientes.ID_EXPEDIENTE', ID_SUBETAPA: 'subetapas_catalogo.ID_SUBETAPA', ID_RESPONSABLE: 'usuarios.ID_USUARIO' },
    uniqueCompuesto: ['ID_EXPEDIENTE','ID_SUBETAPA'],
    columnas: ['ID_EXPEDIENTE_SUBETAPA','ID_EXPEDIENTE','ID_SUBETAPA','ID_RESPONSABLE','ESTADO','FECHA_INICIO','FECHA_FIN','OBSERVACION','CREADO_EN','MODIFICADO_EN']
  },
  documentos: {
    pk: 'ID_DOCUMENTO',
    fk: { ID_EXPEDIENTE: 'expedientes.ID_EXPEDIENTE', ID_SUBETAPA: 'subetapas_catalogo.ID_SUBETAPA', ID_USUARIO: 'usuarios.ID_USUARIO' },
    columnas: ['ID_DOCUMENTO','ID_EXPEDIENTE','ID_SUBETAPA','TIPO_DOCUMENTO','NOMBRE_ARCHIVO','DRIVE_FILE_ID','DRIVE_URL','VERSION','ESTADO','ID_USUARIO','CREADO_EN','MODIFICADO_EN','ESTADO_REGISTRO']
  },
  checklist_items: {
    pk: 'ID_CHECKLIST_ITEM',
    columnas: ['ID_CHECKLIST_ITEM','CODIGO','NOMBRE','ORDEN','OBLIGATORIO','ESTADO_REGISTRO']
  },
  checklist_respuestas: {
    pk: 'ID_CHECKLIST_RESPUESTA',
    fk: { ID_EXPEDIENTE: 'expedientes.ID_EXPEDIENTE', ID_CHECKLIST_ITEM: 'checklist_items.ID_CHECKLIST_ITEM', ID_USUARIO: 'usuarios.ID_USUARIO' },
    uniqueCompuesto: ['ID_EXPEDIENTE','ID_CHECKLIST_ITEM'],
    columnas: ['ID_CHECKLIST_RESPUESTA','ID_EXPEDIENTE','ID_CHECKLIST_ITEM','VALOR','OBSERVACION','ID_USUARIO','MODIFICADO_EN']
  },
  historial: {
    pk: 'ID_HISTORIAL',
    fk: { ID_EXPEDIENTE: 'expedientes.ID_EXPEDIENTE', ID_USUARIO: 'usuarios.ID_USUARIO' },
    columnas: ['ID_HISTORIAL','ID_EXPEDIENTE','ID_USUARIO','EVENTO','ETAPA','SUBETAPA','DETALLE','VISIBILIDAD','ESTADO','CREADO_EN']
  },
  asesores: {
    pk: 'ID_ASESOR',
    unique: ['DNI','CORREO'],
    columnas: ['ID_ASESOR','GRADO','APELLIDOS_NOMBRES','DNI','CORREO','TELEFONO','USUARIO','PASSWORD_HASH','ESTADO_REGISTRO','CREADO_EN','MODIFICADO_EN']
  },
  talleres: {
    pk: 'ID_TALLER',
    fk: { ID_ASESOR: 'asesores.ID_ASESOR' },
    columnas: ['ID_TALLER','NOMBRE','ID_ASESOR','NRO_SESIONES','FECHA_INICIO','FECHA_FIN','ESTADO','CREADO_POR','CREADO_EN','MODIFICADO_EN']
  },
  taller_matriculas: {
    pk: 'ID_MATRICULA',
    fk: { ID_TALLER: 'talleres.ID_TALLER', ID_EXPEDIENTE: 'expedientes.ID_EXPEDIENTE', ID_ESTUDIANTE: 'estudiantes.ID_ESTUDIANTE' },
    uniqueCompuesto: ['ID_TALLER','ID_ESTUDIANTE'],
    columnas: ['ID_MATRICULA','ID_TALLER','ID_EXPEDIENTE','ID_ESTUDIANTE','ESTADO','FECHA_MATRICULA']
  },
  taller_sesiones: {
    pk: 'ID_SESION',
    fk: { ID_TALLER: 'talleres.ID_TALLER' },
    columnas: ['ID_SESION','ID_TALLER','NRO_SESION','FECHA','HORA_INICIO','HORA_FIN','ESTADO']
  },
  taller_asistencia: {
    pk: 'ID_ASISTENCIA',
    fk: { ID_SESION: 'taller_sesiones.ID_SESION', ID_MATRICULA: 'taller_matriculas.ID_MATRICULA', ID_ASESOR: 'asesores.ID_ASESOR' },
    uniqueCompuesto: ['ID_SESION','ID_MATRICULA'],
    columnas: ['ID_ASISTENCIA','ID_SESION','ID_MATRICULA','ID_ASESOR','ASISTENCIA','OBSERVACION','REGISTRADO_EN']
  }
});

function BD1_modeloObjetivo() {
  return {
    status: true,
    version: BD1_CONFIG.version,
    reglas: BD1_CONFIG.reglas,
    estados: BD1_ESTADOS,
    tablas: BD1_MODELO_OBJETIVO
  };
}
