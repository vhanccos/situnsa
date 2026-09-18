# RF-07: Grados, Títulos, SISGRAD, SUNEDU y Colación

## 1. Identificación y Metadatos
* **ID:** RF-07
* **Etapa Legal Asociada:** Etapas 6–7 — Aprobaciones Institucionales + Registro y Emisión del Título (E6.1–E7.3)
* **Prioridad:** Alta (Core)
* **Actores Involucrados:** Responsable de Área, Secretaría Académica, Comisión de Grados y Títulos, Consejo de Facultad (consejeros), Decano, Oficina de Grados y Títulos, Consejo Universitario, Tesista (etnia/lengua en SISGRAD), SUNEDU

## 2. Descripción del Requisito
El sistema debe conducir el expediente desde el informe de Secretaría hasta el
título registrado en **SUNEDU**: revisión de Secretaría, dictamen de Comisión,
**Consejo de Facultad** (sesiones 2×/mes con Excel de titulados y casilleros XXX),
resolución, carga en **SISGRAD** (el alumno consigna etnia/lengua nativa),
firma del Decano, Grados y Títulos, Consejo Universitario, **colación** y registro
SUNEDU (~15 d. post-colación). Cierra la trazabilidad inscripción → título.

## 3. Precondiciones
* Expediente en `EN_APROBACION` con informe de similitud firmado + URL de repositorio (RF-06).
* Paquete documental: acta, solicitud, egresado, primera matrícula, certificado, foto, tesis, conformidad de jurados (**10 documentos tesis / 12 trabajo académico** — entrevista).

## 4. Entradas, Validaciones y Reglas de Negocio
* **Entradas:** informe de Secretaría; dictamen de Comisión; Excel consolidado Consejo; resolución de Consejo; carga SISGRAD (+ etnia/lengua del alumno); firma Decano; conformidad Grados y Títulos; aprobación Consejo Universitario; programación de colación; constancia SUNEDU.
* **Reglas de Negocio (RN):**
  * **RN-07.1:** Consejo sesiona **2×/mes**; el sistema agenda expedientes en la próxima sesión con cupo y genera el **Excel** (especialidad, nombres, orden + casilleros XXX para 2 docentes + 3 alumnos de Comisión Académica) (entrevista; RN-PLZ-09).
  * **RN-07.2:** Paquete 10/12 documentos verificable por checklist antes de agendar (entrevista).
  * **RN-07.3:** SISGRAD se carga con correo del área; **etnia y lengua nativa solo las consigna el alumno** en su acceso (entrevista) — el sistema lo deriva y espera.
  * **RN-07.4:** Observadores SISGRAD/Grados y Títulos devuelven con detalle → subetapa observada + subsanación (no reinicio).
  * **RN-07.5:** Orden estricto E6.1→…→E6.9→E7.1→E7.2→E7.3; sin saltos (RN-09); plazos tabla maestra (`calendar-rules.md`).
  * **RN-07.6:** SUNEDU ≈ 15 d. post-colación; el expediente solo muta a `TITULO_EMITIDO` con constancia registrada; cierre genera certificado/título emitido.
* **Salidas:** E6–E7 `FINALIZADA`; expediente → `TITULO_EMITIDO`; resolución, cargo SISGRAD, título y constancia SUNEDU archivados; notificación final + historial completo.

## 5. Criterios de Aceptación (Formato Gherkin)
```gherkin
Escenario: Camino completo hasta el título
  Dado que el expediente EN_APROBACION tiene paquete 10/12 completo
  Cuando avanza por secretaría, comisión, consejo, SISGRAD, decano, grados y títulos y consejo universitario
  Entonces cada instancia deja validación APROBADA con fecha y documento
  Y tras colación y constancia SUNEDU muta a TITULO_EMITIDO
  Y registra la auditoría con hash SHA-256

Escenario: Observación en SISGRAD
  Dado que SISGRAD observa datos del expediente
  Cuando el área registra la observación
  Entonces E6.5 pasa a OBSERVADA y se notifica al responsable
  Y no se pierde el avance de instancias previas

Escenario: Sesión de consejo sin cupo
  Dado que la próxima sesión está llena
  Cuando se agenda el expediente
  Entonces el sistema lo asigna a la siguiente sesión con cupo
  Y lo refleja en el semáforo sin marcar vencimiento
```

## 6. Mapeo con Artefactos
* **Pantallas Mockup:** `INTERFACES (1)_1.pdf` §9 Resumen/Historial, §4 Dashboard Administrativo.
* **Referencia Legacy:** `legacy-code/SeguimientoSubetapas.js` (`FLUJO_TITULACION[6][7]`); `legacy-code/03_Model_Repositories.js`, `02_SOA_Services.js` (menciones repositorio/SISGRAD como validaciones).
* **Caso de Uso Técnico:** `AprobarInstitucionalUseCase` + `EmitirTituloUseCase` (`apps/api/src/modules/grados-titulos/`); CUs CU-110–CU-112.
* **Historias que lo exigen:** HU-0045 (informe Secretaría), HU-0046 (Excel Consejo), HU-0047 (resolución), HU-0048 (carga SISGRAD), HU-0049 (firma decano + revisiones), HU-0050 (colación y título), HU-0051 (SUNEDU).
