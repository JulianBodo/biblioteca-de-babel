import {
  test,
  expect,
  bearer,
  CREDENTIALS,
  getReaderProfile,
  uniqueSuffix,
  expectJsonError,
  expectStatus,
} from "./fixtures.js";
import { allureFeature } from "./allure-meta.js";

allureFeature("Autenticación");

test.describe("Auth", () => {
  test("login exitoso para admin, bibliotecario y lector", async ({ request }) => {
    for (const cred of Object.values(CREDENTIALS)) {
      const response = await request.post("/api/auth/login", { data: cred });
      await expectStatus(response, 200);
      const body = await response.json();
      expect(body.token).toMatch(/^.+\..+\..+$/);
      expect(body.user).toMatchObject({
        email: cred.email,
        role: expect.any(String),
      });
    }
  });

  test("login falla con credenciales inválidas", async ({ request }) => {
    await expectJsonError(
      await request.post("/api/auth/login", {
        data: { email: CREDENTIALS.admin.email, password: "wrong" },
      }),
      401,
      "Credenciales inválidas",
    );
  });

  test("login falla sin email o contraseña", async ({ request }) => {
    await expectJsonError(
      await request.post("/api/auth/login", { data: { email: "a@b.com" } }),
      400,
    );
  });

  test("GET /api/auth/me devuelve perfil autenticado", async ({ request, tokens }) => {
    const response = await request.get("/api/auth/me", {
      headers: bearer(tokens.admin),
    });
    await expectStatus(response, 200);
    const body = await response.json();
    expect(body).toMatchObject({
      email: CREDENTIALS.admin.email,
      role: "ADMIN",
      readerId: null,
    });
  });

  test("GET /api/auth/me sin token responde 401", async ({ request }) => {
    await expectJsonError(await request.get("/api/auth/me"), 401);
  });

  test("admin puede listar y crear usuarios", async ({ request, tokens }) => {
    const suffix = uniqueSuffix();
    const list = await request.get("/api/auth/users", { headers: bearer(tokens.admin) });
    await expectStatus(list, 200);
    expect((await list.json()).length).toBeGreaterThanOrEqual(4);

    const create = await request.post("/api/auth/users", {
      headers: bearer(tokens.admin),
      data: {
        email: `nuevo.lector.${suffix}@test.com`,
        password: "test1234",
        role: "READER",
        firstName: "Nuevo",
        lastName: "Lector",
        dni: suffix.replace(/\D/g, "").slice(-8).padStart(8, "0"),
      },
    });
    await expectStatus(create, 201);
    const created = await create.json();
    expect(created).toMatchObject({
      email: `nuevo.lector.${suffix}@test.com`,
      role: "READER",
    });
    expect(created.reader).toMatchObject({
      firstName: "Nuevo",
      readerStatus: { status: "ACTIVE" },
    });

    const del = await request.delete(`/api/auth/users/${created.id}`, {
      headers: bearer(tokens.admin),
    });
    expect(del.status()).toBe(204);
  });

  test("admin puede crear bibliotecario", async ({ request, tokens }) => {
    const suffix = uniqueSuffix();
    const create = await request.post("/api/auth/users", {
      headers: bearer(tokens.admin),
      data: {
        email: `biblio.${suffix}@test.com`,
        password: "test1234",
        role: "LIBRARIAN",
      },
    });
    await expectStatus(create, 201);
    const created = await create.json();
    expect(created.role).toBe("LIBRARIAN");
    expect(created.reader).toBeNull();

    await request.delete(`/api/auth/users/${created.id}`, {
      headers: bearer(tokens.admin),
    });
  });

  test("no se puede crear usuario con email duplicado", async ({ request, tokens }) => {
    await expectJsonError(
      await request.post("/api/auth/users", {
        headers: bearer(tokens.admin),
        data: {
          email: CREDENTIALS.reader.email,
          password: "test1234",
          role: "READER",
          firstName: "Dup",
          lastName: "Test",
          dni: "11111111",
        },
      }),
      409,
    );
  });

  test("no se puede eliminar administrador", async ({ request, tokens }) => {
    const profile = await getReaderProfile(request, tokens.admin);
    await expectJsonError(
      await request.delete(`/api/auth/users/${profile.id}`, {
        headers: bearer(tokens.admin),
      }),
      400,
      "administrador",
    );
  });

  test("bibliotecario no puede gestionar usuarios", async ({ request, tokens }) => {
    await expectStatus(
      await request.get("/api/auth/users", { headers: bearer(tokens.librarian) }),
      403,
    );

    await expectStatus(
      await request.post("/api/auth/users", {
        headers: bearer(tokens.librarian),
        data: {
          email: "hack@test.com",
          password: "hack1234",
          role: "ADMIN",
        },
      }),
      403,
    );
  });

  test("lector activo tiene readerId y estado ACTIVE", async ({ request, tokens }) => {
    const profile = await getReaderProfile(request, tokens.reader);
    expect(profile.role).toBe("READER");
    expect(profile.readerId).toBeTruthy();
    expect(profile.reader?.readerStatus.status).toBe("ACTIVE");
  });

  test("lector inactivo tiene estado INACTIVE", async ({ request, tokens }) => {
    const profile = await getReaderProfile(request, tokens.inactiveReader);
    expect(profile.reader?.readerStatus.status).toBe("INACTIVE");
  });

  test("token inválido responde 401", async ({ request }) => {
    await expectJsonError(
      await request.get("/api/auth/me", { headers: bearer("token.invalido") }),
      401,
    );
  });
});
