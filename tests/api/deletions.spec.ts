import {
  test,
  expect,
  bearer,
  createApprovedLoan,
  createPendingLoan,
  rejectLoan,
  returnLoan,
  expectJsonError,
  expectNoContent,
  expectStatus,
} from "./fixtures.js";
import {
  createDisposableAuthor,
  createDisposableGenre,
  createDisposablePublisher,
  createDisposableReaderUser,
  createIsolatedBookStack,
  deleteUserIfExists,
  tearDownIsolatedBookStack,
} from "./helpers/disposable.js";
import { allureFeature, allureStory } from "./allure-meta.js";

allureFeature("Eliminaciones");

test.describe("Catálogos — delete con registros aislados", () => {
  allureStory("Autor, editorial y género");

  test("autor aislado sin libros → DELETE 204", async ({ request, tokens }) => {
    const { headers, author } = await createDisposableAuthor(request, tokens.admin);

    await expectNoContent(await request.delete(`/api/authors/${author.id}`, { headers }));

    await expectJsonError(
      await request.get(`/api/authors/${author.id}`, { headers }),
      404,
    );
  });

  test("autor aislado con libro → DELETE 400", async ({ request, tokens }) => {
    const stack = await createIsolatedBookStack(request, tokens.admin);

    await expectJsonError(
      await request.delete(`/api/authors/${stack.author.id}`, { headers: stack.headers }),
      400,
      "libros asociados",
    );

    await tearDownIsolatedBookStack(request, tokens.admin, stack);
  });

  test("editorial aislada sin libros → DELETE 204", async ({ request, tokens }) => {
    const { headers, publisher } = await createDisposablePublisher(request, tokens.admin);

    await expectNoContent(
      await request.delete(`/api/publishers/${publisher.id}`, { headers }),
    );
  });

  test("editorial aislada con libro → DELETE 400", async ({ request, tokens }) => {
    const stack = await createIsolatedBookStack(request, tokens.admin);

    await expectJsonError(
      await request.delete(`/api/publishers/${stack.publisher.id}`, {
        headers: stack.headers,
      }),
      400,
      "libros asociados",
    );

    await tearDownIsolatedBookStack(request, tokens.admin, stack);
  });

  test("género aislado sin libros → DELETE 204", async ({ request, tokens }) => {
    const { headers, genre } = await createDisposableGenre(request, tokens.admin);

    await expectNoContent(await request.delete(`/api/genres/${genre.id}`, { headers }));
  });

  test("género aislado con libro → DELETE 400", async ({ request, tokens }) => {
    const stack = await createIsolatedBookStack(request, tokens.admin);

    await expectJsonError(
      await request.delete(`/api/genres/${stack.genre.id}`, { headers: stack.headers }),
      400,
      "libros asociados",
    );

    await tearDownIsolatedBookStack(request, tokens.admin, stack);
  });
});

test.describe("Libros — delete con registros aislados", () => {
  allureStory("Restricciones por préstamos");

  test("libro aislado sin préstamos → DELETE 204", async ({ request, tokens }) => {
    const stack = await createIsolatedBookStack(request, tokens.admin);

    await expectNoContent(
      await request.delete(`/api/books/${stack.book.id}`, { headers: stack.headers }),
    );

    await request.delete(`/api/authors/${stack.author.id}`, { headers: stack.headers });
    await request.delete(`/api/publishers/${stack.publisher.id}`, { headers: stack.headers });
    await request.delete(`/api/genres/${stack.genre.id}`, { headers: stack.headers });
  });

  test("libro aislado con préstamo pendiente → DELETE 400", async ({ request, tokens }) => {
    const stack = await createIsolatedBookStack(request, tokens.admin);
    const { loan } = await createPendingLoan(request, tokens, stack.book.id);

    await expectJsonError(
      await request.delete(`/api/books/${stack.book.id}`, { headers: stack.headers }),
      400,
      "pendientes o activos",
    );

    await rejectLoan(request, tokens.librarian, loan.id);
    await expectNoContent(
      await request.delete(`/api/loans/${loan.id}`, {
        headers: bearer(tokens.admin),
      }),
    );
    await tearDownIsolatedBookStack(request, tokens.admin, stack);
  });

  test("libro aislado con préstamo activo → DELETE 400", async ({ request, tokens }) => {
    const stack = await createIsolatedBookStack(request, tokens.admin);
    const { loanId } = await createApprovedLoan(request, tokens, stack.book.id);

    await expectJsonError(
      await request.delete(`/api/books/${stack.book.id}`, { headers: stack.headers }),
      400,
      "pendientes o activos",
    );

    await returnLoan(request, tokens.librarian, loanId);
    await expectNoContent(
      await request.delete(`/api/loans/${loanId}`, {
        headers: bearer(tokens.admin),
      }),
    );
    await tearDownIsolatedBookStack(request, tokens.admin, stack);
  });
});

test.describe("Lectores — delete con registros aislados", () => {
  allureStory("Lector desechable");

  test("lector aislado sin préstamos → DELETE 204", async ({ request, tokens }) => {
    const { userId, readerId } = await createDisposableReaderUser(request, tokens.admin);

    await expectNoContent(
      await request.delete(`/api/readers/${readerId}`, {
        headers: bearer(tokens.admin),
      }),
    );

    await deleteUserIfExists(request, tokens.admin, userId);
  });

  test("lector aislado con préstamo activo → DELETE 400", async ({ request, tokens }) => {
    const stack = await createIsolatedBookStack(request, tokens.admin);
    const { userId, readerId } = await createDisposableReaderUser(request, tokens.admin);

    const create = await request.post("/api/loans", {
      headers: bearer(tokens.librarian),
      data: { bookId: stack.book.id, readerId },
    });
    await expectStatus(create, 201);
    const loanId = (await create.json()).id as number;

    await expectStatus(
      await request.patch(`/api/loans/${loanId}/approve`, {
        headers: bearer(tokens.librarian),
      }),
      200,
    );

    await expectJsonError(
      await request.delete(`/api/readers/${readerId}`, {
        headers: bearer(tokens.admin),
      }),
      400,
      "pendientes o activos",
    );

    await returnLoan(request, tokens.librarian, loanId);
    await expectNoContent(
      await request.delete(`/api/loans/${loanId}`, {
        headers: bearer(tokens.admin),
      }),
    );
    await tearDownIsolatedBookStack(request, tokens.admin, stack);
    await deleteUserIfExists(request, tokens.admin, userId);
  });

  test("lector aislado con solicitud pendiente → DELETE 400", async ({ request, tokens }) => {
    const stack = await createIsolatedBookStack(request, tokens.admin);
    const { userId, readerId } = await createDisposableReaderUser(request, tokens.admin);

    const create = await request.post("/api/loans", {
      headers: bearer(tokens.librarian),
      data: { bookId: stack.book.id, readerId },
    });
    await expectStatus(create, 201);
    const loanId = (await create.json()).id as number;

    await expectJsonError(
      await request.delete(`/api/readers/${readerId}`, {
        headers: bearer(tokens.admin),
      }),
      400,
      "pendientes o activos",
    );

    await expectNoContent(
      await request.delete(`/api/loans/${loanId}`, {
        headers: bearer(tokens.librarian),
      }),
    );
    await tearDownIsolatedBookStack(request, tokens.admin, stack);
    await deleteUserIfExists(request, tokens.admin, userId);
  });
});

test.describe("Préstamos — delete con registros aislados", () => {
  allureStory("Estados finalizados");

  test("admin elimina préstamo REJECTED aislado → 204", async ({ request, tokens }) => {
    const stack = await createIsolatedBookStack(request, tokens.admin);
    const { userId, readerId } = await createDisposableReaderUser(request, tokens.admin);

    const create = await request.post("/api/loans", {
      headers: bearer(tokens.librarian),
      data: { bookId: stack.book.id, readerId },
    });
    await expectStatus(create, 201);
    const loanId = (await create.json()).id as number;

    await rejectLoan(request, tokens.librarian, loanId);

    await expectNoContent(
      await request.delete(`/api/loans/${loanId}`, {
        headers: bearer(tokens.admin),
      }),
    );

    await tearDownIsolatedBookStack(request, tokens.admin, stack);
    await deleteUserIfExists(request, tokens.admin, userId);
  });

  test("bibliotecario no puede eliminar préstamo REJECTED → 403", async ({
    request,
    tokens,
  }) => {
    const stack = await createIsolatedBookStack(request, tokens.admin);
    const { userId, readerId } = await createDisposableReaderUser(request, tokens.admin);

    const create = await request.post("/api/loans", {
      headers: bearer(tokens.librarian),
      data: { bookId: stack.book.id, readerId },
    });
    await expectStatus(create, 201);
    const loanId = (await create.json()).id as number;

    await rejectLoan(request, tokens.librarian, loanId);

    await expectStatus(
      await request.delete(`/api/loans/${loanId}`, {
        headers: bearer(tokens.librarian),
      }),
      403,
    );

    await expectNoContent(
      await request.delete(`/api/loans/${loanId}`, {
        headers: bearer(tokens.admin),
      }),
    );

    await tearDownIsolatedBookStack(request, tokens.admin, stack);
    await deleteUserIfExists(request, tokens.admin, userId);
  });
});
