# RF-01: Inscripción del Plan de Tesis / Trabajo Académico / Artículo

## 1. Identificación y Metadatos
* **ID:** RF-01
* **Etapa Legal Asociada:** Etapa 1 — Verificación Inicial de Documentos (subetapas E1.1–E1.2; Taller USE FIPS)
* **Prioridad:** Alta (Core)
* **Actores Involucrados:** Tesista (1–2 participantes), Responsable de Titulación (Srta. Angela — revisión formal), Asesor propuesto, Sistema

## 2. Descripción del Requisito
El sistema debe permitir registrar la inscripción del plan en cualquiera de las tres
modalidades (Tesis, Trabajo Académico, Artículo científico), con asesor obligatorio,
carga de los 5 documentos de entrada (solicitud de inscripción del plan, formato de
aceptación de asesoría, plan estructurado, DJ de confidencialidad + anexos 17, 18, 33
del reglamento 2025), validación de identidad/programa y **autogeneración de la
carátula normalizada**. Sin carátula válida y documentos conformes no se asigna terna.
Resuelve los dolores de entrevista: errores constantes de carátula (tildes, logo,
mayúsculas, grado del asesor) y analfabetismo digital (wizard guiado).

## 3. Precondiciones
* Expediente en estado `REGISTRADO` (vía regular) o inscripción de taller `VALIDADA` con expediente SET generado (RN-01/RN-02 del Taller).
* Tesista autenticado en su portal; DNI/CUI verificados contra catálogo (RN-L01/RN-L02).
* Catálogos vigentes: 13 programas oficiales (RN-L14), 3 modalidades (RN-L10).

## 4. Entradas, Validaciones y Reglas de Negocio
* **Entradas:** modalidad (selector); datos de 1–2 participantes (nombres idénticos al DNI, DNI 8 dígitos texto, programa, correo, teléfono, CUI); asesor propuesto (nombres + grado); título del plan (texto libre); archivos: solicitud plan, aceptación asesoría, plan estructurado, DJ confidencialidad, anexos 17/18/33; si Trabajo Académico: constancia de trabajo + reporte de registros públicos; si Artículo: evidencia de publicación indexada vinculada a UNSA.
* **Reglas de Negocio (RN):**
  * **RN-01.1:** Grupo 1 o 2 participantes; el conteo debe igualar el grupo; DNI 8 dígitos, únicos, como texto (RN-L01…RN-L04).
  * **RN-01.2:** Trabajo Académico exige acreditar **2 años de experiencia posterior al egreso** con constancia + reporte de registros públicos que valide la empresa (entrevista Magnolia).
  * **RN-01.3:** Sin autorización de la empresa, su nombre/datos confidenciales **no** pueden consignarse; se exige DJ de confidencialidad (entrevista).
  * **RN-01.4:** **Carátula autogenerada**: logo institucional vigente; título en minúsculas tipo oración salvo nombres propios (RN-L09); nombre tesista = DNI con tildes; asesor en formato profesional contra grado SUNEDU (RN-L08); administrativos en mayúsculas excepto `TESIS` exacta (RN-L07); modalidad virtual desde ComboBox (RN-L10); párrafo `<<TESIS>>` justificado (RN-L11).
  * **RN-01.5:** Documentos duplicados por nombre normalizado se detectan antes de aceptar la carga; se conserva el más antiguo (RN-L12).
  * **RN-01.6:** El cronograma asesor–tesista consignado en el plan queda registrado como compromiso auditable (entrevista; RN-PLZ-06).
  * **RN-01.7:** Revisión formal administrativa (Srta. Angela) en 1–3 d.h. (E1.2) antes de asignar terna; campos faltantes se resaltan (RN-L13, semáforo amarillo).
* **Salidas:** subetapa E1.1/E1.2 `FINALIZADA`; expediente → `EN_PLAN`; carátula generada + documentos versionados (`CARGADO`); evento + notificación al tesista (CU-120); habilitación de E1.3.

## 5. Criterios de Aceptación (Formato Gherkin)
```gherkin
Escenario: Inscripción de plan de tesis válida
  Dado que el tesista autenticado tiene expediente REGISTRADO
  Cuando registra modalidad Tesis, asesor, título en mayúsculas y los 5 documentos
  Entonces el sistema normaliza el título a tipo oración, genera la carátula oficial
  Y muta el expediente a EN_PLAN
  Y encola notificación con enlace al portal
  Y registra la auditoría con hash SHA-256

Escenario: Trabajo académico sin experiencia suficiente
  Dado que el tesista elige Trabajo Académico con egreso hace 1 año
  Cuando intenta inscribir el plan
  Entonces el sistema rechaza la acción con DomainError tipado
  Y solicita constancia de 2 años + reporte de registros públicos

Escenario: Carátula con grado de asesor incorrecto
  Dado que el asesor figura como "Dr." pero SUNEDU registra "Mg."
  Cuando se genera la carátula
  Entonces el sistema usa "Mg." y advierte la corrección
  Y bloquea la asignación de terna hasta la conformidad formal
```

## 6. Mapeo con Artefactos
* **Pantallas Mockup:** `INTERFACES (1)_1.pdf` §10 Registro de Nuevo Expediente, §6 Detalle del Expediente – Datos, §7 Documentos Etapa 01.
* **Referencia Legacy:** `legacy-code/05_Domain_Expediente.js` (`validarSolicitud`, `normalizarParticipante`, `titulo`, `programa`); `legacy-code/97_BD_DocumentosFormatoModalidadV1811.gs.js` (`BD1811_*`); `legacy-code/99_BD_CaratulaModFTextoV1813.gs.js` (`BD1813_*`); `legacy-code/95/96_BD_*Programas/DatosMaestros*` (catálogo 13 programas).
* **Caso de Uso Técnico:** `RegistrarPlanUseCase` (`apps/api/src/modules/expedientes/`); CUs Taller CU-040/CU-041/CU-052.
* **Historias que lo exigen:** HU-0004/0005/0006 (vía, 1–2 participantes, SET), HU-0007/0008/0009 (inscripción→validación→automatización), HU-0010/0011/0012 (grupos y asesor), HU-0014/0015/0060 (pensiones), HU-0016/0017/0018/0068 (carpeta, plantillas, inserción), HU-0019/0020/0021 (nombre-DNI, carátula, grado asesor), HU-0022/0023/0024 (administración, vía regular, listado), HU-0025 (carga Etapa 1).
