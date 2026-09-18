# Reingeniería Reversa del Legacy — Reglas de Validación y Datos

> Resultado de la Fase 2: reglas de negocio **no escritas** extraídas del código en
> producción (`legacy-code/`, GAS + JS sobre Sheets/Drive). Cada regla tiene ID
> `RN-Lxx` y cita archivo/función. Los RF las consumen por ID (DoD #2).

## 1. Identidad y participantes

| ID | Regla | Origen |
|---|---|---|
| RN-L01 | DNI: exactamente **8 dígitos** (`/^\d{8}$/`), como **texto** (no número). | `05_Domain_Expediente.validarSolicitud`; `BD188_ASEGURAR_FORMATO_IDENTIFICADORES` |
| RN-L02 | DNI y CUI únicos en el sistema; duplicado intra-solicitud o contra registrados → rechazo. CUI con ceros a la izquierda se preserva (texto); no autocompletar ceros sin verificación. | `validarSolicitud`; `BD188_PREVISUALIZAR_CEROS_IDENTIFICADORES` |
| RN-L03 | Expediente de **1 o 2** participantes; `grupo` debe igualar el conteo (`grupo !== 1 && !== 2` → error). Dos participantes comparten expediente, seguimiento y carátula (nombres en orden alfabético). | `validarSolicitud`, `prepararSolicitud`; entrevista/demo |
| RN-L04 | Nombre + programa obligatorios; programa `SELECCIONE` (placeholder) inválido. | `validarSolicitud` |
| RN-L05 | Normalización de persona: trim de 9 campos (nombre, dni, programa, correo, cui, teléfono, nacionalidad, ciudad, dirección). | `normalizarParticipante` |
| RN-L06 | DNI/CUI/teléfono/usuario/correo/códigos/Drive IDs/passwords son `TEXT` en el esquema (compatibilidad PostgreSQL futura). | `42_BD_EsquemaRelacionalV2 (BD2_COLUMN_TYPES)` |

## 2. Carátula y formato documental

| ID | Regla | Origen |
|---|---|---|
| RN-L07 | **Campos administrativos en MAYÚSCULAS excepto `TESIS`/`TESIS02`**, que conservan escritura exacta del autor. | `97_*V1811 (BD1811_normalizarDatosAdmin_)` + comentario BD-18.15 |
| RN-L08 | **Asesor en formato profesional**: `Dr., Dra., Mg., Mag., Ing., MSc., PhD.` + conectores (`de, del, la…`) en minúscula; corrige "doctor de cariño" contra grado SUNEDU. | `BD1811_nombreProfesionalCaratula_` |
| RN-L09 | **Título en minúsculas tipo oración** (Title Case natural ES, conectores en minúscula salvo inicial); programa en igual formato. | `99_*V1813 (BD1813_tituloNatural_, BD1813_programaCaratula_)`; `05.titulo/programa` |
| RN-L10 | **Modalidad virtual** (ComboBox, no recalcular): `Plan de Tesis→La Tesis`, `Plan de Trabajo Académico→El Trabajo Académico`, `Plan de Tesis Formato Artículo→La Tesis Formato Artículo`; acepta valores ya transformados. | `BD1811_modalidadFinal_`; `BD1813_modalidadVirtual_` |
| RN-L11 | Párrafo `<<TESIS>>` justificado, sin espacios extra; se eliminan solo párrafos **vacíos** entre `<<TESIS>>` y `<<Mod_F>>` (no tocar tablas/imágenes). | `BD1813_prepararCaratula_` |
| RN-L12 | **Dedup documental**: clave = nombre normalizado (sin tildes, mayúsculas); previsualizar duplicados en ETAPA01/ETAPA02 antes de limpiar; al limpiar se conserva el **más antiguo** y el resto va a papelera. | `BD1811_PREVISUALIZAR/LIMPIAR_DUPLICADOS_DOCUMENTOS` |
| RN-L13 | Etiquetas de inserción: `<<TESIS>>`, `<<MOD_F>>/<<Mod_F>>`, `<<DECRETO>>`, `<<OFICIO>>`, `<<NOMBRES>>`, `<<COASESOR>>` (+ alias con/sin guion/espacio y `FECHA APERTURA/PRESENTACION`, `RECOMENDACIÓN`, `PRESIDENTE/ASESOR/SECRETARIO` con variantes). Campos sin dato se **resaltan** como pendientes (semáforo amarillo). | `DocumentosExpedientes.js`; `DE_obtenerCamposFaltantesDocumento_` |

## 3. Catálogos oficiales

| ID | Regla | Origen |
|---|---|---|
| RN-L14 | **13 programas oficiales** con código (`SEGIND, PROY, PROD, LOG, MANT, ER, SIS, TEL, FIN, COM, RRHH, BIO, REF`); sincronización por clave lógica insensible a tildes/puntuación; duplicados y no-oficiales → `INACTIVO` (nunca borrado físico). | `96_BD_ProgramasOficialesV189 (BD189_*)`; `95_BD_DatosMaestrosV188` |
| RN-L15 | Columnas reales del expediente (legado Sheets): `CODIGO_TRAMITE` unique, `GRUPO`, `TESIS/TESIS_02`, `MODALIDAD/MODALIDAD_02/MODALIDAD_FINAL`, `DECRETO`, `RECOMENDACION`, `PRESIDENTE/ASESOR/ASE_MINU/SECRETARIO/CO_ASESOR`, `PRESIDENTE_02/SECRETARIO_02/SUPLENTE_02`, `DECANAL`, `FECHA_ACTAS/HORAS_ACTAS/LUGAR_SUSTENTACION`, `OFICIO`, `INTEGRANTE`, `FECHA/FECHA_PRESENTACION/FECHA_APERTURA`, `ESTADO`, más auditoría. Join N–N vía `expediente_estudiantes` (`ORDEN_PARTICIPANTE`). | `40_BD_MetadataV1 (BD1_MODELO_OBJETIVO)` |

## 4. Flujo, agenda y estados

| ID | Regla | Origen |
|---|---|---|
| RN-L16 | **7 etapas / 38 subetapas** con plazos y responsables por defecto (E1–E2: `fips_usesp_aaa@unsa.edu.pe`; E3–E7: `fips_usesp@unsa.edu.pe`); creación inicial masiva por expediente. | `SeguimientoSubetapas (FLUJO_TITULACION, responsableDefectoEtapa, crearSubetapasIniciales)` |
| RN-L17 | La agenda es **checklist administrativo**: avanzar no exige carga documental salvo subetapa que la requiera; generación diferida de etapas vacías desde plantilla. | `81_BD_AgendaWorkflowV17`; `DocumentosEtapas.js:550` |
| RN-L18 | Cierre de etapa exige subetapas obligatorias finalizadas; reapertura (`rehacerEtapa`) y nueva carga (`autorizarNuevaCarga`) solo con permiso/autorización. | `WorkflowEtapas (finalizar/avanzar/rehacer/autorizar…)` |
| RN-L19 | Checklist Etapa 2 con 12 columnas e items verificables; `validarChecklistCompletoEtapa2V27` gatea E2.3. | `ChecklistEtapa2.js` |
| RN-L20 | Confirmación de presentación inicial marca el arranque formal del seguimiento. | `confirmarPresentacionInicial(WorkflowV3/V4)` |

## 5. Auth, portales y notificaciones

| ID | Regla | Origen |
|---|---|---|
| RN-L21 | Personal: usuario + **hash** (`BD13_verifyPassword_`, modos configurables) con espejo de credenciales; tesistas/invitados: login por **DNI/CUI** con reparación de consistencia y portal relacional. | `71_BD_AuthHashV13`, `72_BD_AuthMirrorV13`, `90/91/92_BD_Login*`, `93_BD_PortalInvitadoRelacionalV184`, `94_BD_AutoPortalV188` |
| RN-L22 | Correos de subetapa finalizada y de derivación con datos del expediente; toda transición relevante → historial (`SUCCESS/INFO/WARNING/ERROR`) + correo con enlace al portal. | `enviarCorreoSubetapaFinalizada`, `enviarCorreoDerivacionEtapaV23`, `notificarFinalizacionSubetapaV26` |
| RN-L23 | Seguimiento masivo y vistas por DNI/expediente para dashboards (número, tesista, DNI, programa, etapa, subetapa, estado, avance, última actualización). | `obtenerSeguimientoSubetapasMasivo`, `obtenerProcesoExpediente/Alumno`, `DashboardExpedientes.js` |

## 6. Brechas detectadas (legacy → nuevo sistema)

1. **Sin cómputo de días hábiles**: los plazos son texto (`plazo:'3 a 5 días hábiles'`); el nuevo sistema debe calcular vencimientos reales (`calendar-rules.md` RN-PLZ-01/02). 
2. **Sin Turnitin/tesis-20 % en código**: la validación de similitud vive en proceso manual OTI → modelada en RF-06 como integración documental + gate. 
3. **Drive personal** del desarrollador → migrar a almacenamiento institucional con custodia. 
4. **Sin WhatsApp programático**: reiteraciones manuales → canal de notificación formal (RNF-04/RF-05). 
5. **Carátula semiautomática** (etiquetas + resaltado) → autogeneración total con las reglas RN-L07…RN-L11 (RF-01).
