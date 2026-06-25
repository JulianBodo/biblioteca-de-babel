import {
  test,
  expect,
  bearer,
  getSeedContext,
  uniqueSuffix,
  expectBookShape,
  expectJsonError,
  expectStatus,
} from "./fixtures.js";
import { allureFeature } from "./allure-meta.js";

allureFeature("Libros");

test.describe("Libros", () => {
  test("lector solo ve libros con ejemplares disponibles", async ({
    request,
    tokens,
  }) => {
    const readerBooks = await request.get("/api/books", {
      headers: bearer(tokens.reader),
    });
    await expectStatus(readerBooks, 200);
    const books = await readerBooks.json();
    expect(books.length).toBeGreaterThan(0);
    for (const book of books) {
      expectBookShape(book);
      expect(book.availableCopies).toBeGreaterThan(0);
    }

    const adminBooks = await request.get("/api/books", {
      headers: bearer(tokens.admin),
    });
    await expectStatus(adminBooks, 200);
    expect((await adminBooks.json()).length).toBeGreaterThanOrEqual(books.length);
  });

  test("admin puede filtrar solo disponibles con query available=true", async ({
    request,
    tokens,
  }) => {
    const response = await request.get("/api/books?available=true", {
      headers: bearer(tokens.admin),
    });
    await expectStatus(response, 200);
    for (const book of await response.json()) {
      expect(book.availableCopies).toBeGreaterThan(0);
    }
  });

  test("admin puede crear, actualizar y eliminar un libro", async ({
    request,
    tokens,
  }) => {
    const seed = await getSeedContext(request, tokens.admin);
    const suffix = uniqueSuffix();

    const create = await request.post("/api/books", {
      headers: seed.headers,
      data: {
        isbn: `978-test-${suffix}`,
        title: `Libro Test ${suffix}`,
        publicationYear: 2024,
        authorIds: [seed.authors[0]!.id],
        publisherId: seed.publishers[0]!.id,
        genreId: seed.genres[0]!.id,
        totalCopies: 2,
      },
    });
    await expectStatus(create, 201);
    const book = await create.json();
    expectBookShape(book);
    expect(book.title).toContain("Libro Test");
    expect(book.authors).toHaveLength(1);
    expect(book.availableCopies).toBe(2);

    const getOne = await request.get(`/api/books/${book.id}`, {
      headers: seed.headers,
    });
    await expectStatus(getOne, 200);
    expectBookShape(await getOne.json());

    const update = await request.put(`/api/books/${book.id}`, {
      headers: seed.headers,
      data: { title: `Libro Actualizado ${suffix}`, totalCopies: 3 },
    });
    await expectStatus(update, 200);
    expect((await update.json()).totalCopies).toBe(3);

    const del = await request.delete(`/api/books/${book.id}`, {
      headers: seed.headers,
    });
    expect(del.status()).toBe(204);

    await expectJsonError(
      await request.get(`/api/books/${book.id}`, { headers: seed.headers }),
      404,
    );
  });

  test("bibliotecario no puede crear libros", async ({ request, tokens }) => {
    const seed = await getSeedContext(request, tokens.admin);
    await expectStatus(
      await request.post("/api/books", {
        headers: bearer(tokens.librarian),
        data: {
          isbn: "978-denied",
          title: "Denegado",
          publicationYear: 2020,
          authorIds: [seed.authors[0]!.id],
          publisherId: seed.publishers[0]!.id,
          genreId: seed.genres[0]!.id,
        },
      }),
      403,
    );
  });

  test("crear libro sin campos obligatorios responde 400", async ({
    request,
    tokens,
  }) => {
    await expectJsonError(
      await request.post("/api/books", {
        headers: bearer(tokens.admin),
        data: { title: "Incompleto" },
      }),
      400,
    );
  });

  test("ISBN duplicado responde 409", async ({ request, tokens }) => {
    const seed = await getSeedContext(request, tokens.admin);
    const detail = await request.get(`/api/books/${seed.books[0]!.id}`, {
      headers: seed.headers,
    });
    const existing = await detail.json();

    await expectJsonError(
      await request.post("/api/books", {
        headers: seed.headers,
        data: {
          isbn: existing.isbn,
          title: "Duplicado",
          publicationYear: 2020,
          authorIds: [seed.authors[0]!.id],
          publisherId: seed.publishers[0]!.id,
          genreId: seed.genres[0]!.id,
        },
      }),
      409,
    );
  });

  test("libro con múltiples autores", async ({ request, tokens }) => {
    const seed = await getSeedContext(request, tokens.admin);
    expect(seed.authors.length).toBeGreaterThanOrEqual(2);

    const response = await request.post("/api/books", {
      headers: seed.headers,
      data: {
        isbn: `978-multi-${uniqueSuffix()}`,
        title: "Obra Conjunta",
        publicationYear: 1940,
        authorIds: [seed.authors[0]!.id, seed.authors[1]!.id],
        publisherId: seed.publishers[0]!.id,
        genreId: seed.genres[0]!.id,
      },
    });
    await expectStatus(response, 201);
    expect((await response.json()).authors).toHaveLength(2);
  });

  test("endpoints de libros requieren autenticación", async ({ request }) => {
    await expectJsonError(await request.get("/api/books"), 401);
  });
});
