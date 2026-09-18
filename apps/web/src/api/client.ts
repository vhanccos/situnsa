import { appContract } from "@pis/contracts";
import { initQueryClient } from "@ts-rest/react-query";

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const tsrClient = initQueryClient(appContract, {
  baseUrl: apiBaseUrl,
  baseHeaders: { "Content-Type": "application/json" },
});
