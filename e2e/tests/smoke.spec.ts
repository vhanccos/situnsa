import { expect, type Page, test } from "@playwright/test";

async function entrarComo(page: Page, dni: string): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("DNI, CUI o correo").fill(dni);
  await page.getByPlaceholder("Ingrese su contraseña").fill("x");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Panel de administración")).toBeVisible();
}

test("smoke: login renderiza", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("SISTEMA DE TITULACIÓN")).toBeVisible();
});

test("fase1: detalle del expediente con 4 tabs", async ({ page }) => {
  await entrarComo(page, "00000001");
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

test("corrección: login por rol lleva al dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("DNI, CUI o correo").fill("00000001");
  await page.getByPlaceholder("Ingrese su contraseña").fill("x");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Panel de administración")).toBeVisible();
  await expect(page.getByText("SET005")).toBeVisible();
});

test("corrección: resumen muestra 7 etapas e historial", async ({ page }) => {
  await entrarComo(page, "00000001");
  await page.goto("/expedientes/33333333-3333-4333-8333-333333333333");
  await page.getByRole("button", { name: "Resumen del Trámite" }).click();
  await expect(page.getByText("Progreso del trámite")).toBeVisible();
  await expect(page.getByText("Avance general del expediente")).toBeVisible();
  await expect(page.getByText("Historial del expediente")).toBeVisible();
  await expect(page.getByText("Etapas del expediente")).toBeVisible();
  await expect(page.getByText("Historial de mensajes")).toBeVisible();
});
