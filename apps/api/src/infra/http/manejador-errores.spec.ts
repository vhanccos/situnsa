import { describe, expect, it } from "vitest";
import { estadoHttp } from "./errores.js";
import { clasificarError } from "./manejador-errores.js";

/** Error como lo envuelve drizzle: DrizzleQueryError → cause = error de pg. */
function errorDrizzle(code: string, constraint?: string): Error {
  const pg = Object.assign(new Error("duplicate key value violates unique constraint"), {
    code,
    constraint,
  });
  return Object.assign(
    new Error(`Failed query: insert into "usuarios" ("dni", "email") values ($1, $2)`),
    { cause: pg },
  );
}

describe("clasificarError (INC-02: sin fugas de SQL)", () => {
  it("correo duplicado → 409 DATOS_DUPLICADOS con mensaje de negocio", () => {
    const c = clasificarError(errorDrizzle("23505", "usuarios_email_unique"));
    expect(c).toEqual({
      status: 409,
      codigo: "DATOS_DUPLICADOS",
      mensaje: "El correo electrónico ya está registrado para otra persona",
    });
  });

  it("nunca devuelve el texto de la consulta", () => {
    for (const code of ["23505", "23503", "22P02", "XX000"]) {
      const c = clasificarError(errorDrizzle(code));
      expect(c.mensaje).not.toMatch(/insert into|Failed query|\$1/i);
    }
  });

  it("formato inválido (uuid mal formado) o restricción CHECK → 400", () => {
    expect(clasificarError(errorDrizzle("22P02")).status).toBe(400);
    expect(clasificarError(errorDrizzle("23514")).codigo).toBe("VALIDACION_FALLIDA");
  });

  it("error desconocido → 500 genérico", () => {
    const c = clasificarError(new Error("ECONNREFUSED 127.0.0.1:5432"));
    expect(c.status).toBe(500);
    expect(c.codigo).toBe("ERROR_INTERNO");
    expect(c.mensaje).not.toContain("ECONNREFUSED");
  });

  it("errores 4xx de Fastify conservan su estado", () => {
    const e = Object.assign(new Error("Request body is too large"), {
      statusCode: 413,
      code: "FST_ERR_CTP_BODY_TOO_LARGE",
    });
    expect(clasificarError(e)).toMatchObject({ status: 413, codigo: "FST_ERR_CTP_BODY_TOO_LARGE" });
  });
});

describe("estadoHttp", () => {
  it("mapea códigos de dominio a HTTP", () => {
    expect(estadoHttp("NO_ENCONTRADO")).toBe(404);
    expect(estadoHttp("FUERA_DE_ALCANCE")).toBe(403);
    expect(estadoHttp("DATOS_DUPLICADOS")).toBe(409);
    expect(estadoHttp("REQUISITO_PENDIENTE")).toBe(400);
  });
});
