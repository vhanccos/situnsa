import { compareSync, hashSync } from "bcryptjs";

/** Coste bcrypt 12 (S-FIPS SEGURIDAD.md). */
const COSTE = 12;

export function hashearClave(clave: string): string {
  return hashSync(clave, COSTE);
}

/** Solo para specs (rápido); producción siempre usa `hashearClave`. */
export function hashearClaveTest(clave: string): string {
  return hashSync(clave, 4);
}

export function verificarClave(clave: string, hash: string): boolean {
  try {
    return compareSync(clave, hash);
  } catch {
    return false;
  }
}
