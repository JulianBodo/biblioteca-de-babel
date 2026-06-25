import {
  test,
  expect,
  bearer,
  uniqueSuffix,
  expectJsonError,
  expectStatus,
  getSeedContext,
  createIsolatedBookStack,
  tearDownIsolatedBookStack,
} from "./fixtures.js";
import { allureFeature } from "./allure-meta.js";

allureFeature("Catálogos");

test.describe("Catálogos — Autores", () => {
  test("todos los roles autenticados pueden listar autores", async ({
    request,
    tokens,
  }) => {
    for (const token of [tokens.admin, tokens.librarian, tokens.reader]) {
      const response = await request.get("/api/authors", { headers: bearer(token) });
      await expectStatus(response, 200);
      expect((await response.json()).length).toBeGreaterThan(0);
    }
  });

  test("admin CRUD de autor", async ({ request, tokens }) => {
    const headers = bearer(tokens.admin);
    const suffix = uniqueSuffix();

    const create = await request.post("/api/authors", {
      headers,
      data: { firstName: "Adolfo", lastName: `Test ${suffix}` },
    });
    await expectStatus(create, 201);
    const author = await create.json();
    expect(author).toMatchObject({ firstName: "Adolfo", lastName: `Test ${suffix}` });

    await expectStatus(await request.get(`/api/authors/${author.id}`, { headers }), 200);

    const update = await request.put(`/api/authors/${author.id}`, {
      headers,
      data: { lastName: `Actualizado ${suffix}` },
    });
    await expectStatus(update, 200);

    expect(
      (await request.delete(`/api/authors/${author.id}`, { headers })).status(),
    ).toBe(204);

    await expectJsonError(await request.get(`/api/authors/${author.id}`, { headers }), 404);
  });

  test("lector no puede crear autores", async ({ request, tokens }) => {
    await expectStatus(
      await request.post("/api/authors", {
        headers: bearer(tokens.reader),
        data: { firstName: "X", lastName: "Y" },
      }),
      403,
    );
  });

  test("autor inexistente responde 404", async ({ request, tokens }) => {
    await expectJsonError(
      await request.get("/api/authors/999999", { headers: bearer(tokens.admin) }),
      404,
    );
  });
});

test.describe("Catálogos — Editoriales", () => {
  test("admin CRUD de editorial", async ({ request, tokens }) => {
    const headers = bearer(tokens.admin);
    const name = `Editorial Test ${uniqueSuffix()}`;

    const create = await request.post("/api/publishers", {
      headers,
      data: { name },
    });
    await expectStatus(create, 201);
    const publisher = await create.json();

    await expectStatus(
      await request.get(`/api/publishers/${publisher.id}`, { headers }),
      200,
    );

    await expectStatus(
      await request.put(`/api/publishers/${publisher.id}`, {
        headers,
        data: { name: `${name} SA` },
      }),
      200,
    );

    expect(
      (await request.delete(`/api/publishers/${publisher.id}`, { headers })).status(),
    ).toBe(204);
  });

  test("nombre de editorial duplicado responde 409", async ({ request, tokens }) => {
    const publishers = await request.get("/api/publishers", {
      headers: bearer(tokens.admin),
    });
    const existing = (await publishers.json())[0]!;

    await expectJsonError(
      await request.post("/api/publishers", {
        headers: bearer(tokens.admin),
        data: { name: existing.name },
      }),
      409,
    );
  });

  test("lector no puede modificar editoriales", async ({ request, tokens }) => {
    const list = await request.get("/api/publishers", {
      headers: bearer(tokens.admin),
    });
    const publisherId = (await list.json())[0]!.id;

    await expectStatus(
      await request.put(`/api/publishers/${publisherId}`, {
        headers: bearer(tokens.reader),
        data: { name: "Hack" },
      }),
      403,
    );
  });
});

test.describe("Catálogos — Géneros", () => {
  test("admin CRUD de género", async ({ request, tokens }) => {
    const headers = bearer(tokens.admin);
    const name = `Género Test ${uniqueSuffix()}`;

    const create = await request.post("/api/genres", {
      headers,
      data: { name },
    });
    await expectStatus(create, 201);
    const genre = await create.json();

    await expectStatus(await request.get(`/api/genres/${genre.id}`, { headers }), 200);

    await expectStatus(
      await request.put(`/api/genres/${genre.id}`, {
        headers,
        data: { name: `${name} Plus` },
      }),
      200,
    );

    expect((await request.delete(`/api/genres/${genre.id}`, { headers })).status()).toBe(
      204,
    );
  });

  test("no se puede eliminar género con libros asociados", async ({
    request,
    tokens,
  }) => {
    const stack = await createIsolatedBookStack(request, tokens.admin);

    await expectJsonError(
      await request.delete(`/api/genres/${stack.genre.id}`, {
        headers: stack.headers,
      }),
      400,
      "libros asociados",
    );

    await tearDownIsolatedBookStack(request, tokens.admin, stack);
  });

  test("género duplicado responde 409", async ({ request, tokens }) => {
    const genres = await request.get("/api/genres", { headers: bearer(tokens.admin) });
    const existing = (await genres.json())[0]!;

    await expectJsonError(
      await request.post("/api/genres", {
        headers: bearer(tokens.admin),
        data: { name: existing.name },
      }),
      409,
    );
  });
});
