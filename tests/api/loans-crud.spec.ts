import {
  test,
  expect,
  bearer,
  pickBookForLoan,
  getReaderProfile,
  createPendingLoan,
  createApprovedLoan,
  returnLoan,
  rejectLoan,
  expectJsonError,
  expectStatus,
} from "./fixtures.js";
import { allureFeature } from "./allure-meta.js";

allureFeature("CRUD de préstamos");

test.describe.serial("CRUD — staff crea y elimina pendiente", () => {
  let loanId: number;

  test("staff crea préstamo pendiente para un lector", async ({
    request,
    tokens,
  }) => {
    const profile = await getReaderProfile(request, tokens.reader);
    const book = await pickBookForLoan(request, tokens.admin, tokens.reader);

    const response = await request.post("/api/loans", {
      headers: bearer(tokens.librarian),
      data: { bookId: book.id, readerId: profile.readerId },
    });
    await expectStatus(response, 201);

    const loan = await response.json();
    loanId = loan.id;
    expect(loan.status).toBe("PENDING");
    expect(loan.reader.id).toBe(profile.readerId);
  });

  test("staff debe enviar readerId al crear", async ({ request, tokens }) => {
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

  test("bibliotecario elimina préstamo pendiente", async ({ request, tokens }) => {
    const response = await request.delete(`/api/loans/${loanId}`, {
      headers: bearer(tokens.librarian),
    });
    expect(response.status()).toBe(204);

    await expectJsonError(
      await request.get(`/api/loans/${loanId}`, { headers: bearer(tokens.admin) }),
      404,
    );
  });
});

test.describe.serial("CRUD — actualizar vencimiento", () => {
  let loanId: number;

  test("crear y aprobar préstamo", async ({ request, tokens }) => {
    const result = await createApprovedLoan(request, tokens);
    loanId = result.loanId;
  });

  test("staff extiende dueDate", async ({ request, tokens }) => {
    const before = await request.get(`/api/loans/${loanId}`, {
      headers: bearer(tokens.librarian),
    });
    const originalDue = new Date((await before.json()).dueDate);

    const extended = new Date(originalDue);
    extended.setDate(extended.getDate() + 7);

    const response = await request.put(`/api/loans/${loanId}`, {
      headers: bearer(tokens.librarian),
      data: { dueDate: extended.toISOString() },
    });
    await expectStatus(response, 200);

    const loan = await response.json();
    expect(new Date(loan.dueDate).getTime()).toBe(extended.getTime());
    expect(loan.isOverdue).toBe(false);
  });

  test("dueDate inválido responde 400", async ({ request, tokens }) => {
    await expectJsonError(
      await request.put(`/api/loans/${loanId}`, {
        headers: bearer(tokens.librarian),
        data: { dueDate: "fecha-invalida" },
      }),
      400,
      "dueDate inválido",
    );
  });

  test("dueDate anterior a loanDate responde 400", async ({ request, tokens }) => {
    const detail = await request.get(`/api/loans/${loanId}`, {
      headers: bearer(tokens.librarian),
    });
    const loanDate = new Date((await detail.json()).loanDate);
    const beforeLoan = new Date(loanDate);
    beforeLoan.setDate(beforeLoan.getDate() - 1);

    await expectJsonError(
      await request.put(`/api/loans/${loanId}`, {
        headers: bearer(tokens.librarian),
        data: { dueDate: beforeLoan.toISOString() },
      }),
      400,
      "loanDate",
    );
  });

  test("lector no puede actualizar préstamo", async ({ request, tokens }) => {
    await expectStatus(
      await request.put(`/api/loans/${loanId}`, {
        headers: bearer(tokens.reader),
        data: { dueDate: new Date().toISOString() },
      }),
      403,
    );
  });

  test("devolver y admin elimina registro finalizado", async ({
    request,
    tokens,
  }) => {
    await returnLoan(request, tokens.librarian, loanId);

    await expectStatus(
      await request.delete(`/api/loans/${loanId}`, {
        headers: bearer(tokens.librarian),
      }),
      403,
    );

    expect(
      (await request.delete(`/api/loans/${loanId}`, {
        headers: bearer(tokens.admin),
      })).status(),
    ).toBe(204);
  });
});

test.describe("CRUD — validaciones delete/update", () => {
  test("no se puede eliminar préstamo activo", async ({ request, tokens }) => {
    const { loanId } = await createApprovedLoan(request, tokens);

    await expectJsonError(
      await request.delete(`/api/loans/${loanId}`, {
        headers: bearer(tokens.admin),
      }),
      400,
      "activo",
    );

    await returnLoan(request, tokens.librarian, loanId);
  });

  test("PUT en préstamo pendiente responde 400", async ({ request, tokens }) => {
    const { loan } = await createPendingLoan(request, tokens);

    await expectJsonError(
      await request.put(`/api/loans/${loan.id}`, {
        headers: bearer(tokens.librarian),
        data: { dueDate: new Date().toISOString() },
      }),
      400,
      "activos",
    );

    await rejectLoan(request, tokens.librarian, loan.id);
  });

  test("DELETE préstamo inexistente responde 404", async ({ request, tokens }) => {
    await expectJsonError(
      await request.delete("/api/loans/999999", {
        headers: bearer(tokens.admin),
      }),
      404,
    );
  });

  test("lector no puede eliminar préstamos", async ({ request, tokens }) => {
    const { loan } = await createPendingLoan(request, tokens);
    await expectStatus(
      await request.delete(`/api/loans/${loan.id}`, {
        headers: bearer(tokens.reader),
      }),
      403,
    );
    await rejectLoan(request, tokens.librarian, loan.id);
  });
});
