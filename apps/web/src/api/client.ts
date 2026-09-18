import { appContract } from "@pis/contracts";
import { initQueryClient } from "@ts-rest/react-query";

/** Base de la API: relativa por defecto (mismo origen → funciona tras el túnel
 * público y en prod tras Nginx). Solo usar VITE_API_URL si la API vive en otro origen. */
export const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export const tsrClient = initQueryClient(appContract, {
  baseUrl: apiBaseUrl,
  baseHeaders: { "Content-Type": "application/json" },
});
