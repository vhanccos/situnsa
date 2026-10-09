# Cuestionario §7 — Módulo Gestión Taller de Tesis: respuestas según fuentes

> Preguntas del §7 de `Especificaciónfuncionaldepantallas_MóduloGestiónTallerTesis.pdf`,
> respondidas únicamente con lo que dicen las fuentes:
> `3EB06D7AA67FA1C8FE66BF-Historias de usuario_1.pdf` (HU),
> `3EB08E014CAB3BC9961B96-TALLER TITULACION USE FIPS.pdf` (USE),
> `Entrevista 1 Sep 8, 14.17.docx.md` (ENT) y su `RESUMEN_...` (RES).
> Estado por pregunta: **Respondida** (la fuente la cierra), **Parcial** (hay indicios),
> **Abierta** (ninguna fuente la menciona → recomendación del equipo).

---

## 1. ¿Las sesiones son por Meet, con un enlace por taller?

**Abierta.** Ninguna fuente menciona Meet ni videoconferencia ni enlace de reunión.
Lo único cercano es HU-0038 / ENT L111-113 (el alumno propone un *rango* de fechas
para la sustentación porque coordinar por WhatsApp/llamadas es un cuello de botella),
pero eso es de sustentación, no de sesiones de taller.

**Recomendación:** un campo `enlace` opcional con formato `https` a nivel taller
(P2 del spec) y botón "Unirme a la sesión" (P5/P7). Sin proveedor impuesto en v1.

---

## 2. ¿Quién registra la asistencia? ¿Asistencia mínima? ¿Cierre automático?

**Parcial.**
- ENT L339: *"tengo que crear un espacio para el asesor para que el asesor también
  tenga control de ese grupo y pueda ver la asistencia y los trabajos que esté
  realizando el alumno"*. El asesor **supervisa** la asistencia; ninguna fuente dice
  que la marque él ni que el alumno se automarque.
- USE §25 (portal del asesor): ve grupos/alumnos, revisa documentos, registra
  observaciones y otorga Visto Bueno. No menciona asistencia.
- En las HU no existe historia de asistencia al taller (bloques 4-5 cubren grupos,
  asesor, pensiones; nada de sesiones/asistencia).
- Mínima exigida y cierre automático: **sin evidencia**.

**Recomendación:** el asesor abre/cierra la ventana, el alumno marca una sola vez
(P4/P7 del spec); al cerrar, pendientes → FALTA. Sin cierre automático en v1.
Alerta "asistencia baja" <70% solo informativa hasta que el cliente fije el umbral.

---

## 3. ¿Las fases son fijas o las define cada asesor? ¿Se marcan por alumno o por grupo?

**Parcial.**
- A favor de configurables: HU-0052 (etapas con *"subetapas configurables con
  responsable, obligatoriedad y documentos requeridos"*), USE §7 (cada subetapa
  define responsable, obligatoriedad, documentos; RN-09 bloquea el avance con
  obligatorias pendientes).
- Pero esas fuentes hablan del flujo de titulación (Plan/Borrador/...), no de las
  fases internas del taller. Ninguna fuente dice si las fases del taller son fijas
  ni si el cumplimiento es por alumno o por grupo.

**Recomendación:** el asesor define las fases de su taller (nombre, descripción,
fecha orientativa) y el cumplimiento se marca **por alumno** (matriz alumno×fase
de P6). Si el cliente quiere catálogo fijo, HU-0052 ya prevé administrarlo sin
código.

---

## 4. ¿Condiciones para pasar a Plan de tesis (y luego a Borrador)?

**Parcial, con base sólida.**
- USE §22 (revisión del Plan): el alumno carga → el asesor revisa → observa o da
  **VISTO BUENO** → el encargado del área hace la **aprobación administrativa** →
  subetapa FINALIZADA. RN-08: el Visto Bueno es validación *académica*; la del
  responsable, *administrativa*. §23 replica el mismo circuito para el Borrador.
- ENT L337: el asesor *"en 16 sesiones, me parece, tiene que pulir esa tesis y
  presentar recién su plan de tesis"*.
- Asistencia mínima o pagos al día como condición: **sin evidencia**.

**Recomendación:** el pase exige Visto Bueno del asesor + fases completas
(RN-09); asistencia y pagos solo informativos en v1. El paso a Borrador sigue el
mismo circuito (§23) dentro del flujo de expedientes ya implementado.

---

## 5. ¿Cuándo se genera el número de expediente (SET)?

**Respondida: al validar la inscripción.**
- HU-0009, criterio de aceptación: al validar ocurren *"en una sola operación"*
  estado VALIDADA + grupo y asesor + **número de expediente** + carpeta +
  plantillas (+ historial).
- CU-015, flujo básico paso 7: *"Genera el expediente SET"*; USE §4 y §8 repiten
  que el expediente continúa el correlativo general (HU-0006: SET único para ambas
  vías, nunca se reutiliza).
- ENT L341: *"cuando yo valido una inscripción, automáticamente ese alumno ya
  también se pasa a la base general y se genera un expediente nuevo"*.

**Consecuencia para el spec:** el expediente ya existe durante el taller, así que
el "pase a Plan de tesis" de P6 es un **avance de etapa** dentro de ese expediente,
no su creación. El alumno aparece en "Mis Alumnos" desde la validación, no desde
el pase (matiz a confirmar con el cliente, porque el spec §5 lo deja abierto).

---

## 6. ¿Cuotas o pago único? ¿Pasarela de la UNSA?

**Parcial.**
- Cuotas: HU-0014 (cronograma con *"número de cuotas, fechas, montos"* a nivel de
  grupo; *"todos los integrantes comparten el mismo calendario, pero el
  cumplimiento se controla por alumno"*), CU-030/031/033/034, USE §7, RN-05.
- Comprobante: CU-032 (*"Adjuntar comprobante"* — actor: Participante o
  Responsable de Pagos); USE §6: por cuota *"monto, vencimiento, fecha de pago,
  estado, comprobante y observación"*.
- Medio de pago externo: ENT L185 (*"puede hacerlo en un YAPE o puede hacerlo en
  caja"*); ENT L383: existe un portal académico separado donde el alumno ya ve
  notas y pensiones.
- Reserva: HU-0014/0015 llevan comentario **[VALIDAR VIGENCIA]**: el pago podría
  generarse al matricularse y pagarse por banco, quedando el control 100% externo.
  HU-0060 limita el portal del alumno a *consultar* pensiones.

**Recomendación:** cuotas + comprobante (imagen/PDF 5 MB) que Secretaría valida u
observa; el dinero se mueve fuera (YAPE/caja/banco) y el sistema solo
registra/verifica. Sin pasarela en v1. La vigencia del módulo de pensiones sigue
siendo la validación abierta con Magnolia.

---

## 7. ¿Sesiones por semana? ¿Feriados y reprogramaciones? (12 sesiones vs. sábados y domingos de 2 meses)

**Parcial, con una discrepancia a confirmar.**
- Número: ENT L337 dice **16 sesiones** (*"me parece"* — el propio hablante duda);
  el spec P2 propone **12 por defecto**. Las HU no fijan número.
- Feriados: evidencia fuerte de cómputo en días hábiles — ENT L69-71 (terna, 5 días
  hábiles, *"no feriados, no huelgas"*), ENT L105 (jurados, 15 días hábiles),
  HU-0028 (los días hábiles *"excluye feriados y periodos declarados no
  laborables"*).
- Reprogramación de sesiones de taller: **sin evidencia**.

**Recomendación:** 12 sesiones editables por defecto (confirmar 12 vs 16 con el
cliente), generación automática por días/hora y reprogramación o cancelación por
sesión con motivo (P4). Los feriados se excluyen del cómputo de plazos; no hay
calendario académico automático en v1.

---

## 8. ¿El taller se divide siempre en grupos? ¿A qué nivel cuelgan asesor, sesiones y asistencia?

**Parcial.**
- Sí hay grupos siempre: USE §5 (*"el Taller de Tesis debe organizarse por
  grupos"*; grupo = inscritos + asesor, con periodo, fechas, cupo, estado
  planificado/activo/concluido), HU-0010/0011/0012, ENT L339 (*"yo puedo crear los
  grupos… y a la hora de validar los derivo al taller que corresponde"*).
- Asesor a nivel grupo: HU-0012 (*"asignar un asesor a cada grupo"*; *"un asesor
  puede tener más de un grupo"*), USE §6, ENT L339.
- Asignación administrativa, no libre: HU-0011, RN-03 (*"el validador determina el
  grupo"*), CU-022.
- Sesiones/asistencia a nivel taller o grupo: **sin evidencia**.
- Tensión terminológica: HU-0010 describe "grupos" con periodo/fechas/cupo, que es
  lo que el spec llama **taller**; el "grupo" del spec (subdivisión con pensiones)
  no existe como tal en las HU.

**Recomendación (adoptada por el equipo):** sesiones, asistencia, fases y avances
a nivel **taller**; grupo = miembros + cronograma de pensiones. Si el cliente
opera un solo grupo por taller, taller y grupo coinciden y el modelo sigue valiendo.

---

## 9. Alumno asignado con el taller iniciado: ¿sesiones previas como falta? ¿Puede estar en dos talleres?

**Abierta.** Ninguna fuente contempla asignación tardía ni doble pertenencia.
Lo único análogo es RN-01 (la inscripción no genera expediente hasta validarse) y
HU-0004 (no mezclar información de ambas vías para un mismo participante).

**Recomendación:** las sesiones previas no cuentan (quedan sin registro y excluidas
del porcentaje) y un alumno = un taller activo. Regla barata de implementar y de
revertir si el cliente decide otra cosa.

---

## 10. ¿El responsable de pagos es una persona distinta de Secretaría?

**Parcial.**
- El actor existe: ACT-0011 Responsable de Pagos (anexo HU) y HU-0015 (*"registrar
  el pago de cada cuota y ver deudores por grupo"*, filtro por grupo y periodo).
- Pero HU-0014/0015 están marcadas **[VALIDAR VIGENCIA]** (ver pregunta 6) y la
  entrevista no nombra a ninguna persona en ese rol (solo Angela valida
  inscripciones y Magnolia administra).

**Recomendación:** en v1 no crear rol nuevo; permiso `pagos.*` operado por
Secretaría, con historial de quién validó cada comprobante (trazabilidad HU-0063).
Si el cliente designa un responsable de pagos, es solo asignarle el permiso.

---

## Notas transversales (contradicciones entre fuentes)

1. **Asesor ¿con o sin acceso?** HU ACT-0006 y HU-0013 dicen que el asesor es
   *actor externo, sin acceso al sistema* (coordina por correo/WhatsApp y Magnolia
   transcribe). En cambio USE §§22-26 y el spec P5/P6 asumen **portal del asesor**
   (ver alumnos, revisar, observar, Visto Bueno). El spec §2 lo resuelve con la
   Fase A (el administrador actúa *en nombre del* asesor y el historial registra
   quién lo hizo realmente): construir permisos en servidor desde el día 1 y
   repartir portales en Fase B.
2. **SET al validar vs. al pasar a Plan** (ver pregunta 5): las fuentes dicen al
   validar; el spec P6 sugiere el pase como hito. Adoptado: expediente al validar,
   pase = avance de etapa.
3. **12 vs. 16 sesiones** (ver pregunta 7): pendiente de confirmar.
4. **Vigencia del módulo de pensiones** (ver preguntas 6 y 10): pendiente de
   confirmar si el control sigue en el sistema o migra al banco/matrícula.
