import { test, expect, expectJsonError, expectStatus } from "./fixtures.js";
import { allureFeature, allureStory } from "./allure-meta.js";

allureFeature("Health");

test.describe("Disponibilidad", () => {
  allureStory("Health check");

  test("GET /api/health → 200 ok", async ({ request }) => {
    const response = await request.get("/api/health");
    await expectStatus(response, 200);
    expect(response.headers()["content-type"]).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  test("GET /api/ruta-inexistente → 404", async ({ request }) => {
    await expectJsonError(await request.get("/api/no-existe"), 404, "Ruta no encontrada");
  });
});
