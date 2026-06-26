import {
  test,
  expect,
  bearer,
  CREDENTIALS,
  LOAN_STATUS,
  getReaderProfile,
  uniqueSuffix,
  expectJsonError,
  expectNoContent,
  expectStatus,
  expectActiveLoanMetadata,
  expectReturnedLoanMetadata,
  expectLoanShape,
  createPendingLoan,
  createApprovedLoan,
  rejectLoan,
  returnLoan,
  getSeedContext,
  pickBookForLoan,
} from "./fixtures.js";
import { allureFeature, allureStory } from "./allure-meta.js";

allureFeature("Préstamos");

test.describe.serial("Flujo E2E: solicitud → aprobación → devolución", () => {
  allureStory("Ciclo de vida completo");

  let bookId: number;
  let loanId: number;

  test("lector inactivo no puede solicitar → 403", async ({ request, tokens }) => {
    const book = await pickBookForLoan(request, tokens.admin, tokens.reader);
    await expectJsonError(
      await request.post("/api/loans", {
        headers: bearer(tokens.inactiveReader),
        data: { bookId: book.id },
      }),
      403,
      "inactiva",
    );
  });

  test("lector activo solicita préstamo → 201 PENDING", async ({ request, tokens }) => {
    const { loan, bookId: pickedBookId } = await createPendingLoan(request, tokens);
    bookId = pickedBookId;
    loanId = loan.id;
  });

  test("bibliotecario lista pendientes incluye la solicitud", async ({ request, tokens }) => {
    const response = await request.get("/api/loans/pending", {
      headers: bearer(tokens.librarian),
    });
    await expectStatus(response, 200);
    expect((await response.json()).some((l: { id: number }) => l.id === loanId)).toBe(true);
  });

  test("lector no accede a pendientes globales → 403", async ({ request, tokens }) => {
    await expectStatus(
      await request.get("/api/loans/pending", { headers: bearer(tokens.reader) }),
      403,
    );
  });

  test("aprobación descuenta ejemplar y activa metadatos de mora", async ({
    request,
    tokens,
  }) => {
    const before = (await (
      await request.get(`/api/books/${bookId}`, { headers: bearer(tokens.admin) })
    ).json()).availableCopies;

    const loan = await (
      await request.patch(`/api/loans/${loanId}/approve`, {
        headers: bearer(tokens.librarian),
      })
    ).json();

    expectLoanShape(loan);
    expect(loan.status).toBe(LOAN_STATUS.ACTIVE);
    expectActiveLoanMetadata(loan);
    expect(loan.isOverdue).toBe(false);

    const after = (await (
      await request.get(`/api/books/${bookId}`, { headers: bearer(tokens.admin) })
    ).json()).availableCopies;
    expect(after).toBe(before - 1);
  });

  test("lector listar préstamos → solo los propios", async ({ request, tokens }) => {
    const loans = await (
      await request.get("/api/loans", { headers: bearer(tokens.reader) })
    ).json();

    expect(loans.length).toBeGreaterThan(0);
    for (const loan of loans) {
      expectLoanShape(loan);
      expect(loan.reader.email).toBe(CREDENTIALS.reader.email);
    }
  });

  test("devolución restaura ejemplar → RETURNED", async ({ request, tokens }) => {
    const before = (await (
      await request.get(`/api/books/${bookId}`, { headers: bearer(tokens.admin) })
    ).json()).availableCopies;

    const loan = await returnLoan(request, tokens.librarian, loanId);
    expectReturnedLoanMetadata(loan);
    expect(loan.wasLate).toBe(false);

    const after = (await (
      await request.get(`/api/books/${bookId}`, { headers: bearer(tokens.admin) })
    ).json()).availableCopies;
    expect(after).toBe(before + 1);
  });
});

test.describe("Rechazos y permisos", () => {
  allureStory("Reglas de negocio");

  test("rechazar solicitud pendiente → REJECTED", async ({ request, tokens }) => {
    const { loan } = await createPendingLoan(request, tokens);
    await rejectLoan(request, tokens.librarian, loan.id);
  });

  test("solicitud duplicada del mismo libro → 409", async ({ request, tokens }) => {
    const book = await pickBookForLoan(request, tokens.admin, tokens.reader);
    const { loan } = await createPendingLoan(request, tokens, book.id);

    await expectJsonError(
      await request.post("/api/loans", {
        headers: bearer(tokens.reader),
        data: { bookId: book.id },
      }),
      409,
    );

    await rejectLoan(request, tokens.librarian, loan.id);
  });

  test("staff crea préstamo con readerId → 201", async ({ request, tokens }) => {
    const profile = await getReaderProfile(request, tokens.reader);
    const book = await pickBookForLoan(request, tokens.admin, tokens.reader);
    const response = await request.post("/api/loans", {
      headers: bearer(tokens.admin),
      data: { bookId: book.id, readerId: profile.readerId },
    });
    await expectStatus(response, 201);
    await rejectLoan(request, tokens.librarian, (await response.json()).id);
  });

  test("staff sin readerId → 400", async ({ request, tokens }) => {
    const book = await pickBookForLoan(request, tokens.admin, tokens.reader);
    await expectJsonError(
      await request.post("/api/loans", {
        headers: bearer(tokens.admin),
        data: { bookId: book.id },
      }),
      400,
      "readerId",
    );
  });

  test("lector no accede al préstamo de otro → 403", async ({ request, tokens }) => {
    const suffix = uniqueSuffix();
    const createUser = await request.post("/api/auth/users", {
      headers: bearer(tokens.admin),
      data: {
        email: `otro.lector.${suffix}@test.com`,
        password: "test1234",
        role: "READER",
        firstName: "Otro",
        lastName: "Lector",
        dni: suffix.replace(/\D/g, "").slice(-8).padStart(8, "0"),
      },
    });
    await expectStatus(createUser, 201);
    const otherUser = await createUser.json();

    const book = await pickBookForLoan(request, tokens.admin, tokens.reader);
    const foreignLoan = await request.post("/api/loans", {
      headers: bearer(tokens.admin),
      data: { bookId: book.id, readerId: otherUser.reader.id },
    });
    await expectStatus(foreignLoan, 201);
    const loanId = (await foreignLoan.json()).id;

    await expectStatus(
      await request.get(`/api/loans/${loanId}`, { headers: bearer(tokens.reader) }),
      403,
    );

    await rejectLoan(request, tokens.librarian, loanId);
    await expectNoContent(
      await request.delete(`/api/auth/users/${otherUser.id}`, {
        headers: bearer(tokens.admin),
      }),
    );
  });
});

test.describe("Validaciones de ciclo de vida", () => {
  allureStory("Errores esperados");

  test("POST sin bookId → 400", async ({ request, tokens }) => {
    await expectJsonError(
      await request.post("/api/loans", {
        headers: bearer(tokens.reader),
        data: {},
      }),
      400,
      "bookId",
    );
  });

  test("libro inexistente → 404", async ({ request, tokens }) => {
    await expectJsonError(
      await request.post("/api/loans", {
        headers: bearer(tokens.reader),
        data: { bookId: 999999 },
      }),
      404,
      "Libro no encontrado",
    );
  });

  test("sin ejemplares disponibles → 409", async ({ request, tokens }) => {
    const seed = await getSeedContext(request, tokens.admin);
    const suffix = uniqueSuffix();

    const createBook = await request.post("/api/books", {
      headers: seed.headers,
      data: {
        isbn: `978-single-${suffix}`,
        title: "Único ejemplar",
        publicationYear: 2020,
        authorIds: [seed.authors[0]!.id],
        publisherId: seed.publishers[0]!.id,
        genreId: seed.genres[0]!.id,
        totalCopies: 1,
      },
    });
    await expectStatus(createBook, 201);
    const book = await createBook.json();

    const { loanId } = await createApprovedLoan(request, tokens, book.id);

    await expectJsonError(
      await request.post("/api/loans", {
        headers: bearer(tokens.reader),
        data: { bookId: book.id },
      }),
      409,
      "ejemplares",
    );

    await returnLoan(request, tokens.librarian, loanId);
    await expectNoContent(
      await request.delete(`/api/loans/${loanId}`, { headers: bearer(tokens.admin) }),
    );
    await expectNoContent(
      await request.delete(`/api/books/${book.id}`, { headers: seed.headers }),
    );
  });

  test("doble aprobación → 400", async ({ request, tokens }) => {
    const { loanId } = await createApprovedLoan(request, tokens);
    await expectJsonError(
      await request.patch(`/api/loans/${loanId}/approve`, {
        headers: bearer(tokens.librarian),
      }),
      400,
      "pendientes",
    );
    await returnLoan(request, tokens.librarian, loanId);
  });

  test("devolver pendiente → 400", async ({ request, tokens }) => {
    const { loan } = await createPendingLoan(request, tokens);
    await expectJsonError(
      await request.patch(`/api/loans/${loan.id}/return`, {
        headers: bearer(tokens.librarian),
      }),
      400,
      "activos",
    );
    await rejectLoan(request, tokens.librarian, loan.id);
  });

  test("id no numérico → 404", async ({ request, tokens }) => {
    await expectJsonError(
      await request.get("/api/loans/abc", { headers: bearer(tokens.admin) }),
      404,
    );
  });

  test("recurso inexistente en acciones → 404", async ({ request, tokens }) => {
    for (const action of ["approve", "reject", "return"]) {
      await expectJsonError(
        await request.patch(`/api/loans/999999/${action}`, {
          headers: bearer(tokens.librarian),
        }),
        404,
      );
    }
  });
});
