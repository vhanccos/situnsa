# RF-02: Evaluación del Plan por Terna y Decreto de Aprobación

## 1. Identificación y Metadatos
* **ID:** RF-02
* **Etapa Legal Asociada:** Etapa 1 — Verificación Inicial (subetapas E1.3–E1.6)
* **Prioridad:** Alta (Core)
* **Actores Involucrados:** Responsable de Titulación (asigna terna), Terna (Director de Unidad nato + asesor + docente afín), Tesista (levanta observaciones), Sistema

## 2. Descripción del Requisito
El sistema debe gestionar la asignación de la terna evaluadora del plan, su revisión
formal con plazo controlado, el ciclo de observaciones ↔ levantamiento y la emisión
del **decreto de aprobación** cuando los 3 responden "conforme". El decreto (fecha,
orden, nombre exacto de tesis/alumno/jurados) es la "partida de nacimiento" de la
tesis: todo error aquí se propaga hasta repositorio/SUNEDU.

## 3. Precondiciones
* Expediente en `EN_PLAN` con E1.1–E1.2 finalizadas y carátula válida (RF-01).
* Padrón de docentes con línea/especialidad para designar al miembro afín.

## 4. Entradas, Validaciones y Reglas de Negocio
* **Entradas:** terna propuesta (director auto, asesor del expediente, docente afín elegido de lista); oficio circular de asignación; observaciones por miembro; versión levantada del alumno; datos del decreto (fecha, orden, nombres exactos).
* **Reglas de Negocio (RN):**
  * **RN-02.1:** Terna = Director de Unidad (nato, 14 especialidades) + asesor + docente afín. El sistema **propone la terna automáticamente** (HU-0027) y el administrativo la confirma o ajusta manualmente (entrevista); la revisión formal previa es de Srta. Angela (HU-0026).
  * **RN-02.2:** Plazo de revisión **3–5 d.h.** (HU-0028; operativa entrevista: 5) desde el día hábil siguiente al envío; excluye feriados/huelgas/vacaciones (RN-PLZ-01/02; E1.4 legacy). El sistema notifica el envío y alerta al vencerse.
  * **RN-02.3:** Observaciones de terna → derivación al alumno; levantamiento en **2–5 d.h.** (HU-0029; E1.5) como nueva versión con historial (RN-10 Taller; RN-L13).
  * **RN-02.4:** El decreto exige las **3 conformidades**; nombres (tesis, alumno, jurados) verificados carácter por carácter contra DNI/caratula (entrevista).
  * **RN-02.5:** Vencido el plazo sin respuesta, el sistema reitera (correo + WhatsApp) y escala (RN-PLZ-05); el conteo y las reiteraciones quedan en historial.
  * **RN-02.6:** Revisión administrativa (no académica) del área: formatos, datos, asesor — nunca contenido del plan (entrevista: "no me corresponde observar eso").
* **Salidas:** E1.3–E1.6 `FINALIZADA`; expediente → `PLAN_APROBADO`; decreto generado/insertado (etiquetas `<<DECRETO>>`, `<<NOMBRES>>`); notificaciones a alumno y terna.

## 5. Criterios de Aceptación (Formato Gherkin)
```gherkin
Escenario: Plan aprobado por unanimidad de terna
  Dado que el expediente EN_PLAN tiene terna asignada y plan enviado
  Cuando los 3 miembros responden conforme dentro de 5 días hábiles
  Entonces el sistema genera el decreto con nombres exactos
  Y muta el expediente a PLAN_APROBADO
  Y encola notificación al tesista con enlace
  Y registra la auditoría con hash SHA-256

Escenario: Terna observa y alumno levanta
  Dado que un miembro observa la carátula
  Cuando el alumno carga la versión corregida
  Entonces el sistema conserva ambas versiones con trazabilidad
  Y reabre E1.5 a EN_PROCESO hasta nueva conformidad

Escenario: Silencio de un miembro
  Dado que vence el plazo sin respuesta de un miembro
  Cuando el job diario detecta el vencimiento
  Entonces el sistema reitera por correo y WhatsApp
  Y marca la subetapa OBSERVADA por plazo con semáforo rojo
```

## 6. Mapeo con Artefactos
* **Pantallas Mockup:** `INTERFACES (1)_1.pdf` §9 Resumen de Trámites e Historial, §6 Detalle (decreto/oficio/fechas).
* **Referencia Legacy:** `legacy-code/SeguimientoSubetapas.js` (`FLUJO_TITULACION[1]`, `finalizarSubetapa`, `delegarSubetapa`); `legacy-code/WorkflowEtapas.js` (`finalizarSubetapaWorkflowV3`, `finalizarEtapaWorkflowV3`); `legacy-code/DocumentosExpedientes.js` (etiquetas `<<DECRETO>>`, `<<OFICIO>>`).
* **Caso de Uso Técnico:** `EvaluarPlanUseCase` (`apps/api/src/modules/expedientes/`); CUs CU-062/CU-064/CU-090–CU-092.
* **Historias que lo exigen:** HU-0026 (revisión Angela), HU-0027 (terna automática), HU-0028 (plazo y alerta 3–5 d.h.), HU-0029 (levantamiento 2–5 d.h.), HU-0030 (decreto).
