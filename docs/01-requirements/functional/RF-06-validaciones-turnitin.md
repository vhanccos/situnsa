# RF-06: Validaciones Turnitin, Similitud y Repositorio

## 1. Identificación y Metadatos
* **ID:** RF-06
* **Etapa Legal Asociada:** Etapa 5 — Validaciones Institucionales (E5.1–E5.6)
* **Prioridad:** Alta (Core)
* **Actores Involucrados:** Responsable de Área, OTI (reporte Turnitin), Unidad de Investigación (firma informe), Repositorio Institucional, Tesista (subsana referenciación)

## 2. Descripción del Requisito
El sistema debe trazar el circuito post-sustentación (o pre, a criterio fundado):
envío a **OTI/Turnitin**, control del umbral **< 20 % de similitud**, referenciación
por el área (**solo carátula/introducción tocan; capítulos, nunca**), re-envíos hasta
el óptimo, **informe de similitud firmado** por la Unidad de Investigación y
**registro en el Repositorio Institucional con URL**. Cubre la brecha legacy #2 (sin
soporte en código: era 100 % manual por correo/trámite).

## 3. Precondiciones
* Expediente `SUSTENTADO` con acta (o, excepcionalmente, pre-sustentación con fundamento registrado: asesor desconocido/flojín o alerta de jurado — entrevista).
* Documento final sin observaciones de fondo pendientes.

## 4. Entradas, Validaciones y Reglas de Negocio
* **Entradas:** solicitud OTI (documento/trámite); reporte Turnitin (% + detalle, 5–20 d.h. — HU-0041); versión referenciada; informe de similitud; firma Director UI; constancia + URL del repositorio (5–15 d.h. — HU-0044).
* **Reglas de Negocio (RN):**
  * **RN-06.1:** Umbral **< 20 %** aplicado automáticamente: reporte mayor → no conforme y retorno al alumno (HU-0042); ≥ 20 % → referenciación (mayormente citas) + re-envío OTI; ciclos ilimitados con historial (entrevista).
  * **RN-06.2:** El área como administrativa **solo edita carátula/presentación**; contenido de capítulos intocable (entrevista).
  * **RN-06.3:** Momento del envío (pre vs post) parametrizable con motivo auditable (asesor no conocido / alerta jurado); por defecto post-sustentación (entrevista: doble envío "una vida").
  * **RN-06.4:** Informe de similitud con formato institucional; revisa Sr. Jorgito (Facultad), **firma el Director** de la Unidad de Investigación (entrevista) — registrado por el responsable **sin que el director acceda al sistema** (HU-0043; registro delegado).
  * **RN-06.5:** Repositorio valida nombre alumno/jurados y otorga constancia/URL; sus observaciones se tratan como E5.5-observada (entrevista: "vincularlo, porque eso ya tiene").
  * **RN-06.6:** Plazos E5.1 5–20 / E5.2 1–3 / E5.3 1–2 / E5.4 2–5 / E5.5 5–15 / E5.6 1 d.h. con semáforos (RN-PLZ-07).
* **Salidas:** E5 `FINALIZADA`; expediente → `EN_APROBACION`; informe firmado + URL registrados; notificaciones.

## 5. Criterios de Aceptación (Formato Gherkin)
```gherkin
Escenario: Similitud conforme a la primera
  Dado que el expediente SUSTENTADO tiene reporte OTI de 12%
  Cuando el área registra el reporte y genera el informe
  Entonces la Unidad de Investigación lo firma
  Y el repositorio emite constancia y URL
  Y el expediente muta a EN_APROBACION con auditoría hash SHA-256

Escenario: Similitud excedida con re-envío
  Dado que el reporte marca 34% por falta de referencias
  Cuando el área lo retorna
  Entonces el alumno carga la versión referenciada
  Y el sistema re-abre E5.1 manteniendo el historial de reportes

Escenario: Edición indebida de capítulos
  Dado que un usuario del área intenta modificar capítulos del borrador
  Cuando guarda el cambio
  Entonces el sistema rechaza con DomainError tipado de integridad documental
```

## 6. Mapeo con Artefactos
* **Pantallas Mockup:** `INTERFACES (1)_1.pdf` §6 Detalle (validaciones), §9 Historial.
* **Referencia Legacy:** `legacy-code/SeguimientoSubetapas.js` (`FLUJO_TITULACION[5]`); menciones Turnitin/repositorio en `81_BD_AgendaWorkflowV17.js`, `03_Model_Repositories.js`, `02_SOA_Services.js` (brecha: sin lógica implementada → nuevo).
* **Caso de Uso Técnico:** `ValidarSimilitudUseCase` + `RegistrarRepositorioUseCase` (`apps/api/src/modules/validaciones/`); CUs CU-110–CU-112.
* **Historias que lo exigen:** HU-0041 (reporte Turnitin 5–20 d.h.), HU-0042 (regla 20 % automática), HU-0043 (firma Director UI sin acceso), HU-0044 (repositorio + URL 5–15 d.h.), HU-0067 (validaciones independientes).
