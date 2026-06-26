import {
  test,
  expect,
  bearer,
  getInactiveReaderId,
  getReaderProfile,
  CREDENTIALS,
  expectJsonError,
  expectStatus,
  uniqueSuffix,
} from "./fixtures.js";
import { allureFeature } from "./allure-meta.js";

allureFeature("Lectores");

test.describe("Lectores", () => {
  test("staff puede listar estados y lectores", async ({ request, tokens }) => {
    const statuses = await request.get("/api/readers/statuses", {
      headers: bearer(tokens.librarian),
    });
    await expectStatus(statuses, 200);
    expect((await statuses.json()).map((s: { status: string }) => s.status)).toEqual(
      expect.arrayContaining(["ACTIVE", "SUSPENDED", "INACTIVE"]),
    );

    const readers = await request.get("/api/readers", {
      headers: bearer(tokens.librarian),
    });
    await expectStatus(readers, 200);
    expect((await readers.json()).length).toBeGreaterThanOrEqual(2);
  });

  test("filtrar lectores por estado INACTIVE", async ({ request, tokens }) => {
    const response = await request.get("/api/readers?status=INACTIVE", {
      headers: bearer(tokens.admin),
    });
    await expectStatus(response, 200);
    const readers = await response.json();
    expect(readers.length).toBeGreaterThan(0);
    for (const reader of readers) {
      expect(reader.readerStatus.status).toBe("INACTIVE");
      expect(reader.email).toBe(CREDENTIALS.inactiveReader.email);
    }
  });

  test("lector no puede acceder al listado de lectores", async ({
    request,
    tokens,
  }) => {
    await expectStatus(
      await request.get("/api/readers", { headers: bearer(tokens.reader) }),
      403,
    );
  });

  test("detalle de lector incluye estado", async ({ request, tokens }) => {
    const profile = await request.get("/api/auth/me", {
      headers: bearer(tokens.reader),
    });
    const readerId = (await profile.json()).readerId;

    const response = await request.get(`/api/readers/${readerId}`, {
      headers: bearer(tokens.librarian),
    });
    await expectStatus(response, 200);
    const reader = await response.json();
    expect(reader).toMatchObject({
      email: CREDENTIALS.reader.email,
      readerStatus: { status: "ACTIVE" },
    });
  });

  test("lector inexistente responde 404", async ({ request, tokens }) => {
    await expectJsonError(
      await request.get("/api/readers/999999", { headers: bearer(tokens.admin) }),
      404,
    );
  });

  test("lector no puede reactivar otros lectores", async ({ request, tokens }) => {
    const inactive = await getReaderProfile(request, tokens.inactiveReader);
    expect(inactive.readerId).toBeTruthy();

    await expectStatus(
      await request.patch(`/api/readers/${inactive.readerId}/reactivate`, {
        headers: bearer(tokens.reader),
      }),
      403,
    );
  });

  test("reactivar lector inactivo", async ({ request, tokens }) => {
    const readerId = await getInactiveReaderId(request, tokens.librarian);

    const reactivate = await request.patch(`/api/readers/${readerId}/reactivate`, {
      headers: bearer(tokens.librarian),
    });
    await expectStatus(reactivate, 200);
    expect((await reactivate.json()).readerStatus.status).toBe("ACTIVE");

    const suspend = await request.patch(`/api/readers/${readerId}/suspend`, {
      headers: bearer(tokens.admin),
    });
    await expectStatus(suspend, 200);
    expect((await suspend.json()).readerStatus.status).toBe("SUSPENDED");

    const reactivateAgain = await request.patch(
      `/api/readers/${readerId}/reactivate`,
      { headers: bearer(tokens.admin) },
    );
    await expectStatus(reactivateAgain, 200);
    expect((await reactivateAgain.json()).readerStatus.status).toBe("ACTIVE");
  });

  test("admin puede ejecutar sync-inactivity", async ({ request, tokens }) => {
    const response = await request.post("/api/readers/sync-inactivity", {
      headers: bearer(tokens.admin),
    });
    await expectStatus(response, 200);
    const body = await response.json();
    expect(body).toMatchObject({
      updated: expect.any(Number),
      readerIds: expect.any(Array),
    });
  });

  test("bibliotecario no puede ejecutar sync-inactivity", async ({
    request,
    tokens,
  }) => {
    await expectStatus(
      await request.post("/api/readers/sync-inactivity", {
        headers: bearer(tokens.librarian),
      }),
      403,
    );
  });

  test("admin puede actualizar datos de lector", async ({ request, tokens }) => {
    const readers = await request.get("/api/readers", {
      headers: bearer(tokens.admin),
    });
    const activeReader = (await readers.json()).find(
      (r: { email: string }) => r.email === CREDENTIALS.reader.email,
    );
    expect(activeReader).toBeTruthy();

    const suffix = uniqueSuffix();
    const update = await request.put(`/api/readers/${activeReader.id}`, {
      headers: bearer(tokens.admin),
      data: { firstName: "María", lastName: `Lectora ${suffix}` },
    });
    await expectStatus(update, 200);
    expect((await update.json()).lastName).toContain("Lectora");
  });
});
