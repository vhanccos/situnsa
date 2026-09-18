import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AlmacenamientoPort } from "./almacenamiento.port.js";

/** Almacenamiento local Lean: /var/data/titulacion-docs (volumen Docker en prod). */
export class LocalStorageService implements AlmacenamientoPort {
  constructor(
    private readonly baseDir = process.env.DOCS_VOLUME_PATH ?? "./var/data/titulacion-docs",
  ) {}

  async save(
    expedienteId: string,
    filename: string,
    bytes: Uint8Array,
  ): Promise<{ ruta: string; sha256: string }> {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const dir = join(this.baseDir, expedienteId);
    await mkdir(dir, { recursive: true });
    const ruta = join(dir, filename);
    await writeFile(ruta, bytes);
    return { ruta, sha256 };
  }

  /** Ruta interna Nginx para X-Accel-Redirect: /protected-files/<exp>/<file> */
  accelPath(expedienteId: string, filename: string): string {
    return `/protected-files/${expedienteId}/${filename}`;
  }
}
