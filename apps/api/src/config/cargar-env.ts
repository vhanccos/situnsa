import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Carga el `.env` de la raíz del monorepo en desarrollo. `turbo run dev`
 * (modo estricto) no reenvía las variables del shell a las tareas, por lo
 * que sin esto el API arrancaba solo con valores por defecto (sin SMTP,
 * APP_URL ni JWT_SECRET propios). Las variables ya definidas en el entorno
 * tienen prioridad; en producción las inyecta el orquestador.
 * Debe importarse antes que cualquier módulo que lea process.env.
 */
const ruta = fileURLToPath(new URL("../../../../.env", import.meta.url));
if (process.env.NODE_ENV !== "production" && existsSync(ruta)) {
  process.loadEnvFile(ruta);
}
