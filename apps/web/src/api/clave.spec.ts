import { describe, expect, it } from "vitest";
import { problemaClave } from "./clave.js";

describe("política de clave (activación)", () => {
  it("exige longitud, letras, números y confirmación", () => {
    expect(problemaClave("abc12", "abc12")).toContain("8 caracteres");
    expect(problemaClave("12345678", "12345678")).toContain("letras");
    expect(problemaClave("abcdefgh", "abcdefgh")).toContain("números");
    expect(problemaClave("Titulo2026", "Titulo2027")).toContain("no coinciden");
    expect(problemaClave("Titulo2026", "Titulo2026")).toBeNull();
  });
});
