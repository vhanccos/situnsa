import { describe, expect, it } from "vitest";
import {
  construirDatosDocumento,
  type ExpedienteDocumento,
  formatoAsesor,
} from "../src/documentos/datos-documento.js";
import { extraerEtiquetas, fechaLarga, insertarEtiquetas } from "../src/documentos/etiquetas.js";
import { PLANTILLAS, plantillaDe, renderizarPlantilla } from "../src/documentos/plantillas.js";
import { CHECKLIST_COMPLETO } from "../src/expediente/checklist-catalogo.js";

const EXP: ExpedienteDocumento = {
  codigo: "SET010",
  titulo: "sistema de gestión de expedientes para la fips",
  programa: "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE SISTEMAS",
  modalidad: "TESIS",
  participante1: { nombres: "María", apellidos: "Pérez Quispe", dni: "70112233", cui: "20240001" },
  participante2: null,
  asesor: { nombres: "Juan", apellidos: "Torres", dni: "29000001", grado: "Dr." },
  datosAdmin: { nroDecreto: "015-2026", presidente: "dr. ana ruiz", fechaApertura: "2026-09-01" },
};

describe("inserción de etiquetas (legacy insertarDatosEnDocumento)", () => {
  it("reemplaza las etiquetas con dato y conserva las vacías como pendientes", () => {
    const r = insertarEtiquetas("Decreto <<DECRETO>> de <<NOMBRES>> · <<OFICIO>>", {
      DECRETO: "015",
      NOMBRES: "María Pérez",
      OFICIO: "  ",
    });
    expect(r.texto).toBe("Decreto 015 de María Pérez · <<OFICIO>>");
    expect(r.pendientes).toEqual(["OFICIO"]);
  });

  it("normaliza el nombre de la etiqueta (espacios/mayúsculas)", () => {
    expect(extraerEtiquetas("<<presidente etapa 02>> y <<PRESIDENTE  ETAPA 02>>")).toEqual([
      "PRESIDENTE ETAPA 02",
    ]);
  });

  it("formatea fechas civiles en español", () => {
    expect(fechaLarga("2026-09-01")).toBe("1 de septiembre de 2026");
    expect(fechaLarga(null)).toBe("");
  });
});

describe("datos del expediente (RN-L07/L08)", () => {
  const datos = construirDatosDocumento(EXP, new Date("2026-10-05T15:00:00Z"));

  it("asesor en formato profesional y mayúsculas", () => {
    expect(formatoAsesor(EXP.asesor)).toBe("DR. JUAN TORRES");
    expect(datos.ASESOR).toBe("DR. JUAN TORRES");
  });

  it("la tesis conserva la escritura del autor; los administrativos van en mayúsculas", () => {
    expect(datos.TESIS).toBe("sistema de gestión de expedientes para la fips");
    expect(datos.PRESIDENTE).toBe("dr. ana ruiz");
    expect(datos.MODALIDAD).toBe("Plan de Tesis");
    expect(datos.MOD_F).toBe("La Tesis");
    expect(datos["FECHA APERTURA"]).toBe("1 de septiembre de 2026");
    expect(datos.FECHA_EMISION).toBe("5 de octubre de 2026");
  });
});

describe("plantillas", () => {
  it("cada plantilla de tipo checklist corresponde a un documento del catálogo", () => {
    const tipos = new Set(CHECKLIST_COMPLETO.map((d) => d.tipo));
    const extras = new Set(["CARATULA_PLAN", "DECRETO_APROBACION", "INFORME_SECRETARIA"]);
    for (const p of PLANTILLAS) expect(tipos.has(p.tipo) || extras.has(p.tipo)).toBe(true);
  });

  it("el decreto informa campos pendientes cuando faltan datos", () => {
    const plantilla = plantillaDe("DECRETO_APROBACION");
    expect(plantilla).not.toBeNull();
    if (!plantilla) return;
    const doc = renderizarPlantilla(plantilla, construirDatosDocumento(EXP, new Date()));
    expect(doc.pendientes).toEqual(["RECOMENDACION", "SECRETARIO"]);
    expect(doc.titulo.map((s) => s.texto).join("")).toBe("DECRETO N° 015-2026");
  });

  it("informe para Secretaría (HU-0045): jurado de Cierre, similitud y repositorio", () => {
    const plantilla = plantillaDe("INFORME_SECRETARIA");
    expect(plantilla?.etapa).toBe("E6");
    if (!plantilla) return;
    const completo = renderizarPlantilla(
      plantilla,
      construirDatosDocumento(
        {
          ...EXP,
          datosAdmin: { ...EXP.datosAdmin, decanal: "RD 042-2026" },
          sustentacion: {
            fecha: "2026-11-20",
            hora: "10:00",
            lugar: "Auditorio FIPS",
            actaVeredicto: "UNANIMIDAD",
          },
          jurado: [
            { rol: "VOCAL", nombre: "Ing. Luis Soto" },
            { rol: "PRESIDENTE", nombre: "Dr. Ana Ruiz" },
            { rol: "SECRETARIO", nombre: "Mg. Rosa Díaz" },
          ],
          validaciones: { similitud: 12, urlRepositorio: "https://repositorio.unsa.edu.pe/x/1" },
        },
        new Date("2026-12-01T15:00:00Z"),
      ),
    );
    expect(completo.pendientes).toEqual([]);
    const texto = completo.parrafos.map((p) => p.map((x) => x.texto).join("")).join("\n");
    expect(texto).toContain(
      "DR. ANA RUIZ (presidente), MG. ROSA DÍAZ (secretario) y ING. LUIS SOTO (vocal)",
    );
    expect(texto).toContain("similitud del reporte Turnitin es de 12 %");
    expect(texto).toContain("APROBADO POR UNANIMIDAD");

    const incompleto = renderizarPlantilla(plantilla, construirDatosDocumento(EXP, new Date()));
    expect(incompleto.pendientes).toEqual([
      "DECANAL",
      "FECHA",
      "JURADO",
      "SIMILITUD",
      "URL REPOSITORIO",
      "VEREDICTO",
    ]);
  });
});
