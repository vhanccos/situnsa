# RF-03: Presentación del Borrador de Tesis / Trabajo / Artículo

## 1. Identificación y Metadatos
* **ID:** RF-03
* **Etapa Legal Asociada:** Etapa 2 — Presentación del Borrador de Tesis (E2.1–E2.3)
* **Prioridad:** Alta (Core)
* **Actores Involucrados:** Tesista, Asesor (conformidad Anexo 8), Responsable de Titulación (revisión documental), Sistema

## 2. Descripción del Requisito
El sistema debe recibir el borrador completo con la conformidad de culminación del
asesor (**Anexo 8**), la **solicitud de titulación (Anexo 27)**, declaraciones juradas
(veracidad, no antecedentes penales, no uso de información confidencial), libreta de
notas / certificado de estudios / constancia de egresado / primera matrícula, no-adeudos
(biblioteca y pensiones), recibo de titulación según modalidad y **foto JPG**. La
revisión documental verifica estructura (resumen, palabras clave, abstract, APA) y el
checklist de Etapa 2 gatea el pase al sorteo de jurados. En **artículo indexado** el
asesor solo da el pase (ya arbitrado).

## 3. Precondiciones
* Expediente en `PLAN_APROBADO` con cronograma cumplido (o dispensa registrada).
* Asesor otorga conformidad de culminación (Anexo 8) — sin ella no hay borrador.

## 4. Entradas, Validaciones y Reglas de Negocio
* **Entradas:** borrador (PDF/DOCX); Anexo 8 firmado; Anexo 27; **Anexos 2 y 32**; DDJJ (veracidad, no antecedentes penales, no uso de información confidencial); libreta de notas / certificado de estudios / constancia de egresado / primera matrícula; constancias de no adeudo (biblioteca y pensiones); recibo de titulación según modalidad; **foto JPG**; SUNEDU del título profesional previo (elegibilidad). Total: **13 documentos** (HU-0031).
* **Reglas de Negocio (RN):**
  * **RN-03.1:** Sin Anexo 8 no se habilita E2.1 (entrevista; Taller §23: sin Visto Bueno no continúa).
  * **RN-03.2:** Estructura mínima verificable: resumen, palabras clave, abstract, referencias APA; si faltan, el área observa (el área **no** redacta contenido: dolor "me invento keywords" → el sistema lo exige al alumno con wizard).
  * **RN-03.3:** Revisión documental 2–5 d.h. + validación 1–3 d.h. (E2.2–E2.3) a cargo de Magnolia/Marietha (HU-0032); checklist Etapa 2 completo obligatorio (RN-L19: `validarChecklistCompletoEtapa2V27`).
  * **RN-03.3b:** El sistema **genera las constancias** de estudios, primera matrícula y egresado **a partir de la libreta de notas** (HU-0033), eliminando la transcripción manual nota por nota; la constancia de egresado se remite a DSA como informe con evidencias.
  * **RN-03.4:** Artículo indexado: se verifica publicación vinculada a UNSA; el asesor da pase directo sin revisión de fondo (entrevista).
  * **RN-03.5:** Foto JPG obligatoria y recibo según modalidad; pagos verificables contra comprobante (entrevista; Taller §7 análogo).
  * **RN-03.6:** Cada documento observado → nueva versión con historial (RN-10 Taller); estados `CARGADO/OBSERVADO/APROBADO` (RN-L13).
* **Salidas:** E2 `FINALIZADA`; expediente habilitado a `EN_DICTAMEN` (sorteo); documentos `APROBADO`; constancias generadas; notificación + historial.

## 5. Criterios de Aceptación (Formato Gherkin)
```gherkin
Escenario: Borrador conforme habilita sorteo
  Dado que el expediente PLAN_APROBADO tiene Anexo 8 y expediente documental completo
  Cuando el responsable valida el checklist de Etapa 2
  Entonces el sistema finaliza E2 y habilita el sorteo de jurados
  Y encola notificación al tesista con enlace
  Y registra la auditoría con hash SHA-256

Escenario: Borrador sin resumen ni keywords
  Dado que el borrador carece de resumen y palabras clave
  Cuando el responsable revisa E2.2
  Entonces el sistema marca el documento OBSERVADO con detalle exigible
  Y bloquea E2.3 hasta la subsanación

Escenario: Artículo ya publicado
  Dado que el expediente es modalidad artículo con publicación indexada UNSA
  Cuando el asesor da el pase
  Entonces el sistema omite la revisión de fondo y habilita E2.3
```

## 6. Mapeo con Artefactos
* **Pantallas Mockup:** `INTERFACES (1)_1.pdf` §8 Documentos Etapa 02, §6 Detalle del Expediente.
* **Referencia Legacy:** `legacy-code/ChecklistEtapa2.js` (`asegurar/obtener/validarChecklistCompletoEtapa2V27`); `legacy-code/SeguimientoSubetapas.js` (`FLUJO_TITULACION[2]`); `legacy-code/ArchivosSubetapas.js`.
* **Historias que lo exigen:** HU-0031 (13 documentos incl. Anexos 8, 27, 2 y 32), HU-0032 (validación Magnolia/Marietha), HU-0033 (constancias desde libreta), HU-0013 (Visto Bueno registrado desde correo).
* **Caso de Uso Técnico:** `PresentarBorradorUseCase` (`apps/api/src/modules/expedientes/`); CUs CU-072/CU-074/CU-090–CU-092.
