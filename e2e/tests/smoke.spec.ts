import { expect, test } from "@playwright/test";

test("smoke: login renderiza", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText(/iniciar sesi/i)).toBeVisible();
});

test("fase1: detalle del expediente con 4 tabs", async ({ page }) => {
  await page.goto("/expedientes/33333333-3333-4333-8333-333333333333");
  await expect(page.getByText("Detalle del Expediente")).toBeVisible();
  await expect(page.getByText("SET005")).toBeVisible();
  for (const tab of [
    "Datos",
    "Documentos Etapa 01",
    "Documentos Etapa 02",
    "Resumen del Trámite",
  ]) {
    await expect(page.getByRole("button", { name: tab })).toBeVisible();
  }
  await page.getByRole("button", { name: "Documentos Etapa 01" }).click();
  await expect(page.getByText("Solicitud de inscripción del plan")).toBeVisible();
});
