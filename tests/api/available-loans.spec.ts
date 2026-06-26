import {
  test,
  expect,
  bearer,
  pickBookForLoan,
  getReaderProfile,
  createPendingLoan,
  rejectLoan,
  expectBookShape,
  expectJsonError,
  expectStatus,
} from "./fixtures.js";
import { allureFeature } from "./allure-meta.js";

allureFeature("Préstamos disponibles");

test.describe("Préstamos disponibles", () => {
  test("lector ve libros con ejemplares y sin préstamo propio pendiente/activo", async ({
    request,
    tokens,
  }) => {
    const response = await request.get("/api/loans/available", {
      headers: bearer(tokens.reader),
    });
    await expectStatus(response, 200);

    const books = await response.json();
    expect(Array.isArray(books)).toBeTruthy();
    for (const book of books) {
      expectBookShape(book);
      expect(book.availableCopies).toBeGreaterThan(0);
    }
  });

  test("catálogo disponible es subconjunto de libros del lector", async ({
    request,
    tokens,
  }) => {
    const [availableRes, booksRes] = await Promise.all([
      request.get("/api/loans/available", { headers: bearer(tokens.reader) }),
      request.get("/api/books", { headers: bearer(tokens.reader) }),
    ]);
    const available = await availableRes.json();
    const books = await booksRes.json();
    const bookIds = new Set(books.map((b: { id: number }) => b.id));
    for (const item of available) {
      expect(bookIds.has(item.id)).toBeTruthy();
    }
  });

  test("lector no ve un libro con préstamo pendiente propio", async ({
    request,
    tokens,
  }) => {
    const book = await pickBookForLoan(request, tokens.admin, tokens.reader);
    const { loan } = await createPendingLoan(request, tokens, book.id);

    const response = await request.get("/api/loans/available", {
      headers: bearer(tokens.reader),
    });
    await expectStatus(response, 200);
    expect(
      (await response.json()).some((item: { id: number }) => item.id === book.id),
    ).toBeFalsy();

    await rejectLoan(request, tokens.librarian, loan.id);
  });

  test("staff ve todos los libros con ejemplares disponibles", async ({
    request,
    tokens,
  }) => {
    const allBooks = await request.get("/api/books", {
      headers: bearer(tokens.admin),
    });
    const availableCount = (await allBooks.json()).filter(
      (book: { availableCopies: number }) => book.availableCopies > 0,
    ).length;

    const response = await request.get("/api/loans/available", {
      headers: bearer(tokens.librarian),
    });
    await expectStatus(response, 200);
    expect((await response.json()).length).toBe(availableCount);
  });

  test("staff puede filtrar por readerId", async ({ request, tokens }) => {
    const profile = await getReaderProfile(request, tokens.reader);
    const book = await pickBookForLoan(request, tokens.admin, tokens.reader);
    const { loan } = await createPendingLoan(request, tokens, book.id);

    const response = await request.get(
      `/api/loans/available?readerId=${profile.readerId}`,
      { headers: bearer(tokens.admin) },
    );
    await expectStatus(response, 200);
    expect(
      (await response.json()).some((item: { id: number }) => item.id === book.id),
    ).toBeFalsy();

    await rejectLoan(request, tokens.librarian, loan.id);
  });

  test("lector inactivo no puede consultar préstamos disponibles", async ({
    request,
    tokens,
  }) => {
    await expectJsonError(
      await request.get("/api/loans/available", {
        headers: bearer(tokens.inactiveReader),
      }),
      403,
    );
  });

  test("lector no puede filtrar por readerId", async ({ request, tokens }) => {
    await expectJsonError(
      await request.get("/api/loans/available?readerId=1", {
        headers: bearer(tokens.reader),
      }),
      403,
    );
  });

  test("readerId inválido responde 400", async ({ request, tokens }) => {
    await expectJsonError(
      await request.get("/api/loans/available?readerId=abc", {
        headers: bearer(tokens.admin),
      }),
      400,
    );
  });

  test("endpoint requiere autenticación", async ({ request }) => {
    await expectJsonError(await request.get("/api/loans/available"), 401);
  });
});
