# RF-05: Programación, Sustentación y Acta

## 1. Identificación y Metadatos
* **ID:** RF-05
* **Etapa Legal Asociada:** Etapa 4 — Programación y Sustentación (E4.1–E4.5)
* **Prioridad:** Alta (Core)
* **Actores Involucrados:** Tesista (propone rango), Responsable de Área (coordina y publica), Terna/Jurados (confirman), Público (invitación), Sistema

## 2. Descripción del Requisito
El sistema debe implementar el **coordinador de agenda** que elimina el principal
cuello de botella operativo: el alumno propone un **rango** de fechas, el sistema
cruza con la disponibilidad de la terna (que cambia por semestre), recoge
conformidades, fija fecha/hora definitiva, publica la **citación oficial con ≥ 1
semana de anticipación** (físico + web + correo + WhatsApp) y registra el
**acta con el veredicto** (felicitación pública / unanimidad / mayoría /
desaprobación = 0 que trunca el trámite).

## 3. Precondiciones
* Expediente en `APTO_SUSTENTACION` (conformidad final de jurados, RF-04).
* Disponibilidad de terna cargada/actualizada por periodo.

## 4. Entradas, Validaciones y Reglas de Negocio
* **Entradas:** rango de fechas del alumno; disponibilidades de terna; fecha/hora/lugar/modalidad definitivas; justificación de virtualidad (si aplica); **versión final de tesis cargada por el alumno** (HU-0040); acta (veredicto + observaciones solo de forma + firmas).
* **Reglas de Negocio (RN):**
  * **RN-05.1:** El alumno propone **rango** (HU-0038), nunca fecha única ("¿tú crees que los demás van a poder?" — entrevista); el sistema propone intersecciones con la agenda de la terna.
  * **RN-05.2:** Fecha definitiva exige **conformidad de toda la terna** (con cortesía formal registrada); cambios de última hora (ej. cita médica) se renegocian por el mismo flujo.
  * **RN-05.3:** Citación oficial mínimo **1 semana antes** (RN-PLZ-04; HU-0039); difusión multicanal: publicación física, web/red, correo **y WhatsApp** (el correo solo no se lee — entrevista).
  * **RN-05.4:** Sustentación **presencial** por defecto; virtual solo con documento justificatorio (público de pandemia extendido — entrevista).
  * **RN-05.5:** Veredicto tipado: `FELICITACION_PUBLICA / UNANIMIDAD / MAYORIA / DESAPROBADO`; en sustentación solo observaciones **de forma**, no de fondo (reglamento).
  * **RN-05.6:** `DESAPROBADO (= 0)` **trunca**: el expediente pasa a `DESAPROBADO_TRUNCO` y el reinicio es de cero (plan, recibos; nombre/asesor actualizables — entrevista).
  * **RN-05.7:** Acta con fecha/hora/lugar (`FECHA_ACTAS/HORAS_ACTAS/LUGAR_SUSTENTACION` RN-L15) y registro de asistencia/roles.
* **Salidas:** E4 `FINALIZADA`; expediente → `SUSTENTADO` (o `DESAPROBADO_TRUNCO`); citación publicada; acta archivada; notificaciones.

## 5. Criterios de Aceptación (Formato Gherkin)
```gherkin
Escenario: Coordinación exitosa de fecha
  Dado que el expediente APTO_SUSTENTACION tiene rango del alumno y agendas de terna
  Cuando el sistema propone intersecciones y toda la terna confirma
  Entonces fija fecha/hora con más de 1 semana de anticipación
  Y publica la citación multicanal
  Y registra la auditoría con hash SHA-256

Escenario: Fecha única impuesta por el alumno
  Dado que el alumno propone una sola fecha sin rango
  Cuando intenta enviar la propuesta
  Entonces el sistema rechaza con DomainError tipado exigiendo un rango

Escenario: Desaprobación
  Dado que el veredicto es desaprobatorio
  Cuando se registra el acta con nota 0
  Entonces el expediente muta a DESAPROBADO_TRUNCO
  Y se informa el reinicio de cero con instructivo
```

## 6. Mapeo con Artefactos
* **Pantallas Mockup:** `INTERFACES (1)_1.pdf` §6 Detalle (sustentación), §9 Resumen/Historial.
* **Referencia Legacy:** `legacy-code/81_BD_AgendaWorkflowV17.js` (agenda/checklist); `legacy-code/SeguimientoSubetapas.js` (`FLUJO_TITULACION[4]`); columnas `FECHA_ACTAS/HORAS_ACTAS/LUGAR_SUSTENTACION` (`40_BD_MetadataV1.js`).
* **Caso de Uso Técnico:** `ProgramarSustentacionUseCase` + `RegistrarActaUseCase` (`apps/api/src/modules/sustentaciones/`); CUs CU-100/CU-103/CU-104.
* **Historias que lo exigen:** HU-0038 (rango de fechas), HU-0039 (publicación oficial), HU-0040 (versión final), HU-0066 (resultado y acta).
