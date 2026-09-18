/** Catálogo de checklist documental por etapa (INTERFACES §§7–8, RF-01/RF-03). Puro, sin I/O. */

export interface ChecklistDef {
  readonly tipo: string;
  readonly nombre: string;
  readonly etapa: "E1" | "E2";
  readonly obligatorio: boolean;
}

/** Etapa 01 — documentos de entrada del plan (carga del tesista). */
export const CHECKLIST_E1: readonly ChecklistDef[] = [
  {
    tipo: "SOLICITUD_INSCRIPCION",
    nombre: "Solicitud de inscripción del plan",
    etapa: "E1",
    obligatorio: true,
  },
  {
    tipo: "ACEPTACION_ASESORIA",
    nombre: "Formato de aceptación de asesoría",
    etapa: "E1",
    obligatorio: true,
  },
  {
    tipo: "PLAN_ESTRUCTURADO",
    nombre: "Plan estructurado de tesis",
    etapa: "E1",
    obligatorio: true,
  },
  { tipo: "DJ_CONFIDENCIALIDAD", nombre: "DJ de confidencialidad", etapa: "E1", obligatorio: true },
  { tipo: "ANEXO_17", nombre: "Anexo 17", etapa: "E1", obligatorio: true },
  { tipo: "ANEXO_18", nombre: "Anexo 18", etapa: "E1", obligatorio: true },
  { tipo: "ANEXO_33", nombre: "Anexo 33", etapa: "E1", obligatorio: true },
];

/** Etapa 02 — actas y anexos del borrador/sustentación (RF-03/04/05). */
export const CHECKLIST_E2: readonly ChecklistDef[] = [
  {
    tipo: "ACTA_CONFORMIDAD",
    nombre: "Acta de conformidad de tesis",
    etapa: "E2",
    obligatorio: true,
  },
  { tipo: "ACTA_DICTAMEN", nombre: "Acta de dictamen de tesis", etapa: "E2", obligatorio: true },
  { tipo: "ACTA_SUSTENTACION", nombre: "Acta de sustentación", etapa: "E2", obligatorio: true },
  {
    tipo: "ANEXO_27",
    nombre: "Anexo N° 27 — Solicitud para optar título 2da especialidad",
    etapa: "E2",
    obligatorio: true,
  },
  {
    tipo: "ANEXO_01_DJ",
    nombre: "Anexo N° 01 — Declaración jurada",
    etapa: "E2",
    obligatorio: true,
  },
  {
    tipo: "ANEXO_32_VERACIDAD",
    nombre: "Anexo N° 32 — DJ veracidad de la información",
    etapa: "E2",
    obligatorio: true,
  },
  {
    tipo: "AUTORIZACION_IMPRESION",
    nombre: "Autorización de impresión de tesis",
    etapa: "E2",
    obligatorio: true,
  },
  {
    tipo: "AUTORIZACION_PUBLICACION",
    nombre: "Autorización de publicación de tesis",
    etapa: "E2",
    obligatorio: true,
  },
  {
    tipo: "CARATULA_FINAL",
    nombre: "Carátula plan de tesis final",
    etapa: "E2",
    obligatorio: false,
  },
];

export const CHECKLIST_COMPLETO: readonly ChecklistDef[] = [...CHECKLIST_E1, ...CHECKLIST_E2];
