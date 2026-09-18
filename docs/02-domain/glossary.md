# Glosario del Dominio — Sistema de Titulación y Segunda Especialidad (FIPS / UNSA)

> Lenguaje ubicuo. Toda referencia cruzada (`docs/01-requirements`, código) debe usar
> exactamente estos términos. Fuentes: Taller USE FIPS (norma), entrevista operativa
> Magnolia/Carlos (Sep-2026), `legacy-code/`.

## 1. Expediente y trámite

| Término | Definición | Fuente |
|---|---|---|
| **Expediente** | Unidad central del trámite de titulación. Agrupa 1–2 participantes, modalidad, asesor/terna, documentos por etapa, seguimiento de subetapas, sustentación y validaciones hasta el título. Clave: código correlativo `SET001, SET002, …` (`SET` = Segunda Especialidad Titulación). | Taller §10–12; `05_Domain_Expediente.js`; `SeguimientoSubetapas.js` |
| **Código SET** | Correlativo único y continuo del expediente, compartido por vía regular y vía taller. Se genera al registrar el nuevo expediente (regular) o al validar la inscripción (taller). | Taller §8, §10; RN-02 |
| **Participante / Tesista** | Egresado de segunda especialidad que tramita su titulación. Un expediente admite **grupo 1 o 2** participantes (tesis en pareja comparte expediente, seguimiento y carátula con ambos nombres en orden alfabético). | Entrevista; `05_Domain_Expediente.validarSolicitud` |
| **Vía regular** | Ingreso directo: el personal registra al interesado y crea el expediente sin pasar por el Taller de Tesis. | Taller §2.1, §10, §17 |
| **Vía Taller de Tesis** | Ingreso por curso: inscripción → carga de documentos → validación → asignación a grupo/asesor → generación automática del expediente. Incluye programación de pensiones por grupo. | Taller §2.2, §3–8, §18 |
| **Inscripción (taller)** | Solicitud previa al expediente formal. Estados: pendiente → observada → **validada** (solo la validación genera expediente). | Taller §4; RN-01/RN-02 |
| **Carpeta digital** | Estructura en Drive por expediente (`EXPEDIENTE → ETAPA01 / ETAPA02 / …`), creada automáticamente con copia de plantillas institucionales. | Taller §9, §12; `DocumentosEtapas.js` |

## 2. Modalidades de titulación

| Término | Definición | Fuente |
|---|---|---|
| **Tesis** | Investigación con estructura clásica (resumen, palabras clave, abstract, referencias APA). Modalidad virtual legacy: `Plan de Tesis` → modalidad final `La Tesis`. | Entrevista; `BD1811_modalidadFinal_`, `BD1813_modalidadVirtual_` |
| **Trabajo Académico** (suficiencia profesional en pregrado) | Evidencia **2 años de experiencia profesional posterior al egreso**, respaldada con constancia de trabajo + reporte de registros públicos que valide la existencia de la empresa. Requiere además **declaración jurada de uso de información confidencial** (autorización de la empresa o prohibición de consignar su nombre/datos). Modalidad final: `El Trabajo Académico`. | Entrevista; `BD1811/BD1813` |
| **Artículo científico** (tesis formato artículo) | Artículo ya **publicado en revista indexada y vinculado a la UNSA**. El asesor solo da el pase; no hay revisión de fondo posterior (ya fue arbitrado). Modalidad final: `La Tesis Formato Artículo`. | Entrevista; `BD1811/BD1813` |
| **Proyecto** | Modalidad propia de la especialidad de Proyectos en segunda especialidad (titulación con un proyecto). | Entrevista (Magnolia) |

## 3. Personas y roles operativos

| Término | Definición | Fuente |
|---|---|---|
| **Asesor** | Docente que acompaña al tesista desde el plan hasta la sustentación. Revisa plan/borrador y otorga el **Visto Bueno** académico. En artículo indexado su rol es formal (pase + presencia). | Entrevista; Taller §6, §25 |
| **Terna** | Comité de 3 para la **etapa Plan**: Director de Unidad (miembro nato en las 14 especialidades) + asesor + docente afín a la línea, designado manualmente por el administrativo. Revisa el plan en ~5 días hábiles. | Entrevista (Magnolia) |
| **Jurado dictaminador** | Sorteado en Secretaría Académica con presencia (virtual) del alumno; roles: **presidente, secretario, accesitario** (+ asesor como parte). Se formaliza con **resolución decanal** firmada por el Decano. Revisa el borrador en 15–20 días hábiles. | Entrevista |
| **Srta. Angela** | Revisión formal inicial (carátula/formatos) y validación de inscritos al taller. | Entrevista |
| **Sra. Magnolia** | Responsable del trámite de titulación (opera etapas 1–2; correos `fips_usesp_aaa@unsa.edu.pe`). | Entrevista; `RESPONSABLE_ETAPAS_1_2` |
| **Srta. Marietha / Sra. Marieta** | Colaboradora con responsabilidades delegadas por subetapa. | Entrevista; demo Carlos |
| **Responsable del área** | Rol sistema: verifica cumplimiento administrativo y **aprueba/finaliza** la subetapa (distinto del Visto Bueno académico del asesor). | Taller §25–26; RN-08 |
| **Validador de inscripciones** | Revisa inscripciones del taller, observa/valida y asigna grupo. | Taller §4–5; CU-012–CU-015 |
| **OTI** | Oficina de Tecnologías de Información: opera Turnitin (reporte) y eventual hosting (servidor virtual / APIs). | Entrevista |
| **Unidad de Investigación** | Firma el **informe de similitud** (revisa Sr. Jorgito, firma el Director). | Entrevista |
| **Repositorio Institucional** | Valida carátula/nombres/jurados del documento final y emite constancia/URL. | Entrevista |
| **Secretaría Académica / Comisión de Grados y Títulos / Consejo de Facultad / Decano / Grados y Títulos / Consejo Universitario / SUNEDU / SISGRAD** | Cadena de aprobación y registro (ver `state-machine.md` y RF-07). **SISGRAD**: sistema nacional donde el alumno consigna etnia/lengua nativa y el área carga modalidad y datos. | Entrevista |

## 4. Documentos y artefactos

| Término | Definición | Fuente |
|---|---|---|
| **Plan de tesis / trabajo / artículo** | Documento de la etapa 1: estructura del plan + solicitud de inscripción del plan + formato de aceptación de asesoría + DJ de confidencialidad. Son **5 documentos** de entrada. | Entrevista |
| **Anexos 17, 18, 33** | Anexos del reglamento 2025 (marzo) exigidos en la inscripción del plan. | docs-plan §Fase 2; reglamento citado en entrevista |
| **Anexo 8** | Conformidad / visto bueno de culminación del asesor (habilita el borrador). | docs-plan RF-03 |
| **Anexo 27** | Solicitud de titulación (etapa borrador). | docs-plan RF-03 |
| **Carátula oficial** | Portada normalizada UNSA: logo institucional vigente, título en **minúsculas tipo oración** (salvo nombres propios), sin comillas/puntos indebidos, nombre del tesista **idéntico al DNI con tildes**, nombre del asesor con **grado según SUNEDU** (no "doctor" de cariño). Regla legacy: campos administrativos en MAYÚSCULAS excepto `TESIS`, que conserva escritura exacta; asesor en formato profesional (`Mg., Dr., Ing., MSc., PhD.`). | Entrevista; `97_*V1811` (`BD1811_normalizarDatosAdmin_`, `BD1811_nombreProfesionalCaratula_`); `99_*V1813` (`BD1813_tituloNatural_`) |
| **Decreto de aprobación (del plan)** | Acto que aprueba el plan cuando los 3 de la terna responden "conforme". Contiene fecha, orden, nombre exacto de tesis/alumno/jurados. "Partida de nacimiento" de la tesis. | Entrevista |
| **Dictamen** | Pronunciamiento individual de cada jurado sobre el borrador: **Favorable / Observado**. | Entrevista |
| **Acta de sustentación** | Registro del veredicto: **felicitación pública / aprobado por unanimidad / aprobado por mayoría / desaprobado (= 0, trunca el trámite y obliga a reiniciar de cero)**. Solo observaciones **de forma** en esta instancia, no de fondo. | Entrevista |
| **Informe de similitud** | Informe firmado por la Unidad de Investigación sobre el reporte Turnitin (< 20 %). | Entrevista |
| **Resolución (decanal / consejo)** | Asignación de jurados (decano) y aprobación de titulados (Consejo de Facultad). | Entrevista |
| **Constancias** | No adeudo de biblioteca, no adeudo de pensiones, egresado, primera matrícula, certificado de estudios (plantilla manual desde libreta DSA en segundas), SUNEDU del título profesional previo. | Entrevista |
| **Cronograma del plan** | Compromiso asesor–tesista consignado en el plan; respaldo para retirar/cambiar asesor o exigir cumplimiento. | Entrevista |

## 5. Estados y control

| Término | Definición | Fuente |
|---|---|---|
| **Etapa / Subetapa** | 7 etapas con subetapas configurables, cada una con responsable, obligatoriedad y documentos requeridos. Ver `state-machine.md`. | `FLUJO_TITULACION`; Taller §13, §24 |
| **Estados de subetapa** | `PENDIENTE, EN_PROCESO, OBSERVADA, APROBADA, FINALIZADA`. | Taller §24; `BD1_ESTADOS.proceso` |
| **Estados de documento** | `PENDIENTE, CARGADO, APROBADO, OBSERVADO, RECHAZADO` (+ versiones con trazabilidad). | `BD1_ESTADOS.documento`; Taller §22–23 |
| **Visto Bueno** | Validación **académica** del asesor sobre plan/borrador. Precede (no sustituye) la aprobación administrativa. | Taller §22–23, §25; RN-08 |
| **Aprobación administrativa** | Validación del responsable del área que permite **finalizar** la subetapa. | Taller §22–23, §26 |
| **Derivación** | Transferencia de una subetapa a otro responsable, registrada en historial + notificación. | Taller §14; `delegarSubetapa`, `enviarCorreoDerivacionEtapaV23` |
| **Semáforo de plazos** | Código visual de vencimiento en tablas (amarillo = campos/documentos pendientes; control de días hábiles restantes). | `INTERFACES (1)_1.pdf`; demo Carlos |
| **Historial / Trazabilidad** | Registro cronológico (quién/qué/cuándo) de creación, cargas, observaciones, vistos buenos, finalizaciones, derivaciones y cierres. | Taller §15; `BD1_MODELO_OBJETIVO.historial` |
| **SUNEDU / SISGRAD / UNSA Gradúa-T** | Registro nacional del título; sistema de grados donde el área carga el expediente aprobado; plataforma universitaria con la que **no** se opera hoy (brecha digital del público) y a la que se quiere superar en usabilidad. | Entrevista |

## 6. Taller de Tesis (curso)

| Término | Definición | Fuente |
|---|---|---|
| **Grupo de taller** | Conjunto de inscritos bajo un asesor (código, periodo/edición, cupo, estado planificado/activo/concluido). La asignación es administrativa, no libre. | Taller §5; RN-03/RN-04 |
| **Sesiones / asistencia** | ~16 sesiones de pulido con el asesor; asistencia `PENDIENTE/PRESENTE/AUSENTE/JUSTIFICADO`. | Entrevista (Carlos); `BD1_ESTADOS.asistencia` |
| **Pensiones** | Cronograma de cuotas **por grupo**, cumplimiento **individual** (monto, vencimiento, comprobante, estado). | Taller §7; RN-05 |
