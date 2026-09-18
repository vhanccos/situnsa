# RF-04: Dictamen de Jurados (Sorteo, Resolución y Revisión del Borrador)

## 1. Identificación y Metadatos
* **ID:** RF-04
* **Etapa Legal Asociada:** Etapa 3 — Evaluación del Expediente (E3.1–E3.6)
* **Prioridad:** Alta (Core)
* **Actores Involucrados:** Responsable de Área, Secretaría Académica (sorteo), Decano (firma resolución), Jurados (presidente/secretario/accesitario + asesor), Tesista (levanta)

## 2. Descripción del Requisito
El sistema debe programar el **sorteo público de jurados** (con alumno presente,
virtual si justifica, y grabación del acto), generar la **resolución decanal de
asignación**, distribuir borrador + resolución a los jurados, controlar la revisión
(20 d.h. operativos) con **dictámenes individuales (Favorable / Observado)**,
gestionar el levantamiento y registrar la **conformidad final** que deja al
expediente apto para sustentar. Incluye reiteraciones automáticas: el cuello de
botella "jurados que no revisan y observan el título el día de la sustentación".

## 3. Precondiciones
* Expediente con E2 finalizada (borrador validado).
* Padrón de jurados elegibles con rol y disponibilidad.

## 4. Entradas, Validaciones y Reglas de Negocio
* **Entradas:** fecha/hora del sorteo; asistencia del alumno (+ justificación si virtual); resultado del sorteo (presidente, secretario, accesitario); resolución decanal; dictámenes individuales; versión levantada.
* **Reglas de Negocio (RN):**
  * **RN-04.1:** Sorteo en Secretaría Académica con convocatoria al alumno y link virtual; el acto se **graba** y el registro queda en el expediente (entrevista). Recepción y validación previa al sorteo en 2–7 d. (HU-0034).
  * **RN-04.2:** La resolución la firma el **Decano**; sin resolución firmada no se distribuye el borrador (entrevista; columna `DECANAL` RN-L15).
  * **RN-04.3:** Plazo de revisión **20 d.h.** operativos (legacy) / 15 d.h. reglamento — parametrizable (RN-PLZ-03); E3.5 levantamiento 2–10 d.h.; E3.6 conformidad 1–3 d.h.
  * **RN-04.4:** Dictamen individual tipado **Favorable / Observado**; observado → E3.5 (levantamiento 2–10 d.h., HU-0036) con detalle; nueva versión conserva historial. Los jurados **no necesitan acceder al sistema**: el responsable registra sus dictámenes con evidencia (HU-0035; patrón registro delegado).
  * **RN-04.5:** **Reiteraciones** antes del vencimiento por correo + WhatsApp con constancia (RN-PLZ-05); el sistema impide llegar a sustentación con jurados que no revisaron (dolor entrevista).
  * **RN-04.6:** Conformidad final exige todos los jurados conformes; solo entonces la etapa se marca completa (HU-0037) y el expediente pasa a `APTO_SUSTENTACION` (E3.6).
* **Salidas:** E3 `FINALIZADA`; expediente → `APTO_SUSTENTACION`; resolución + dictámenes archivados; notificaciones.

## 5. Criterios de Aceptación (Formato Gherkin)
```gherkin
Escenario: Sorteo y revisión conforme
  Dado que el expediente tiene E2 finalizada
  Cuando se realiza el sorteo grabado y el Decano firma la resolución
  Entonces el sistema distribuye el borrador a los 3 jurados
  Y cuando todos dictaminan Favorable muta a APTO_SUSTENTACION
  Y registra la auditoría con hash SHA-256

Escenario: Jurado observado con levantamiento
  Dado que un jurado dictamina Observado
  Cuando el alumno carga la versión corregida
  Entonces el sistema versiona y solicita nueva conformidad solo al observante
  Y mantiene el historial de dictámenes

Escenario: Jurado silencioso
  Dado que faltan 2 días hábiles para el vencimiento sin dictamen
  Cuando corre el job diario
  Entonces el sistema reitera por correo y WhatsApp y deja constancia
```

## 6. Mapeo con Artefactos
* **Pantallas Mockup:** `INTERFACES (1)_1.pdf` §9 Resumen de Trámites, §6 Detalle (jurados/sustentación).
* **Referencia Legacy:** `legacy-code/SeguimientoSubetapas.js` (`FLUJO_TITULACION[3]`, `confirmarPresentacionInicial`); columnas `PRESIDENTE_02/SECRETARIO_02/SUPLENTE_02/DECANAL` (`40_BD_MetadataV1.js`); `legacy-code/DocumentosEtapas.js` (distribución documental).
* **Caso de Uso Técnico:** `DictaminarBorradorUseCase` (`apps/api/src/modules/sustentaciones/`); CUs CU-101/CU-102.
* **Historias que lo exigen:** HU-0034 (validación previa 2–7 d.), HU-0035 (plazo y observaciones sin acceso), HU-0036 (levantamiento 2–10 d.h.), HU-0037 (cierre por conformidad), HU-0065 (roles presidente/secretario/suplente).
