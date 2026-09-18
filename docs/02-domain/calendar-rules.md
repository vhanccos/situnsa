# Reglas de Calendario y Plazos — Titulación FIPS / UNSA

> Todos los plazos operativos en **días hábiles** (lunes–viernes; excluyen feriados,
> huelgas y vacaciones institucionales — entrevista Magnolia, `FLUJO_TITULACION`).
> El conteo inicia **al día siguiente del envío** ("hoy lo envío, al día siguiente
> cuenta" — entrevista). Fuente primaria de valores:
> `legacy-code/SeguimientoSubetapas.js → FLUJO_TITULACION`.

## 1. Tabla maestra de plazos

| Etapa · Subetapa | Plazo | Origen |
|---|---|---|
| E1.1 Presentación del plan | según alumno | legacy |
| E1.2 Validación administrativa | 1–3 d.h. | legacy |
| E1.3 Asignación de terna | 1–2 d.h. | legacy |
| E1.4 Revisión del plan por la terna | **3–5 d.h. (operativa: 5)** | legacy + entrevista |
| E1.5 Levantamiento observaciones (alumno) | 2–5 d.h. | legacy |
| E1.6 Decreto de aprobación | 2–4 d.h. | legacy |
| E2.1 Carga de documentos borrador | variable | legacy |
| E2.2 Revisión documental | 2–5 d.h. | legacy |
| E2.3 Validación del expediente | 1–3 d.h. | legacy |
| E3.1 Recepción y validación | 1–2 d.h. | legacy |
| E3.2 Programación sorteo jurados | 2–7 d.h. | legacy |
| E3.3 Revisión borrador por jurados | **20 d.h.** (reglamento citado: 15) | legacy + entrevista |
| E3.4 Emisión de observaciones | incluida en E3.3 | legacy |
| E3.5 Levantamiento (alumno) | 2–10 d.h. | legacy |
| E3.6 Conformidad final jurados | 1–3 d.h. | legacy |
| E4.1 Propuesta de fechas (alumno, **rango**) | 1–3 d.h. | legacy + entrevista |
| E4.2 Coordinación con jurados | 2–5 d.h. | legacy |
| E4.3 Publicación oficial (**≥ 1 semana antes**) | 1 d.h. | legacy + entrevista |
| E4.4 Versión final | 1–2 d. antes de sustentar | legacy |
| E4.5 Sustentación | fecha programada | legacy |
| E5.1 Evaluación Turnitin (OTI) | 5–20 d.h. | legacy |
| E5.2 Revisión de similitud (< 20 %) | 1–3 d.h. | legacy + entrevista |
| E5.3 Emisión informe similitud | 1–2 d.h. | legacy |
| E5.4 Firma del informe | 2–5 d.h. | legacy |
| E5.5 Registro en repositorio | 5–15 d.h. | legacy |
| E5.6 URL del repositorio | 1 d.h. | legacy |
| E6.1 Secretaría Académica | 2–6 d.h. | legacy |
| E6.2 Comisión Grados y Títulos | 2–5 d.h. | legacy |
| E6.3 Consejo de Facultad | según sesión (**2×/mes**) | legacy + entrevista |
| E6.4 Emisión de resolución | 4–6 d.h. | legacy |
| E6.5 Registro SISGRAD | 1–3 d.h. | legacy |
| E6.6 Validación datos alumno | 1–2 d.h. | legacy |
| E6.7 Firma Decano | 1–2 d.h. | legacy |
| E6.8 Grados y Títulos | 5–15 d.h. | legacy |
| E6.9 Consejo Universitario | 5–15 d.h. | legacy |
| E7.1 Colación | cronograma institucional | legacy |
| E7.2 Emisión del título | 3–7 d.h. | legacy |
| E7.3 SUNEDU | ~15 d. post-colación | legacy |

## 2. Reglas de cómputo (RN-PLZ)

- **RN-PLZ-01 — Día hábil.** Lunes a viernes, menos feriados nacionales/regionales,
  huelgas y vacaciones institucionales. Catálogo administrable (`PARAMETROS` /
  `PERIODOS`; Taller §18).
- **RN-PLZ-02 — Inicio de conteo.** El plazo corre desde el **día hábil siguiente**
  al envío/entrega ("hoy lo envío, al día siguiente cuenta").
- **RN-PLZ-03 — Revisión de jurados.** Valor operativo **20 d.h.** (legacy),
  parametrizable; el reglamento cita 15 d.h. para la revisión del borrador.
  Divergencia documentada, no error: el sistema debe permitir configurar 15/20.
- **RN-PLZ-04 — Sustentación.** La publicación exige **mínimo 1 semana** entre
  fijación y acto; sin este margen la fecha no es válida.
- **RN-PLZ-05 — Reiteratorias.** El área **reitera** a jurados/terna antes del
  vencimiento (correo + WhatsApp; el correo solo no basta — entrevista). Cada
  reiteración queda en historial.
- **RN-PLZ-06 — Cronograma del plan.** Las fechas pactadas asesor–tesista son
  compromiso auditable: respaldan cambio de asesor o exigencia de cumplimiento.
- **RN-PLZ-07 — Semáforos.** Verde (en plazo) / ámbar (≤ 2 d.h. al vencimiento o
  campos pendientes) / rojo (vencido). Amarillo en documentos = campos sin insertar
  (demo Carlos). Ver `INTERFACES (1)_1.pdf` §5, §9, §14.
- **RN-PLZ-08 — Vencidos.** Subetapa vencida → estado `OBSERVADA` por plazo +
  notificación + escalamiento al responsable (`HU-0055`; `calcularPorcentajeSubetapas`).
- **RN-PLZ-09 — Sesiones de Consejo.** E6.3 no tiene plazo en días: depende del
  calendario de sesiones (2×/mes); el sistema agenda al expediente en la próxima
  sesión con cupo.
