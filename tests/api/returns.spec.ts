import { prisma } from "../../src/database.js";
import {
  test,
  expect,
  bearer,
  getReaderProfile,
  createPendingLoan,
  createApprovedLoan,
  rejectLoan,
  returnLoan,
  expectJsonError,
  expectStatus,
  expectBookShape,
  expectLoanShape,
  expectSortedDescByDate,
  CREDENTIALS,
} from "./fixtures.js";
import { allureFeature, allureStory } from "./allure-meta.js";

allureFeature("Registro de devoluciones");

test.describe.serial("Registro de devoluciones — flujo", () => {
  let returnedLoanId: number;

  test("devolución queda registrada con metadatos", async ({ request, tokens }) => {
    const { loanId } = await createApprovedLoan(request, tokens);
    const returned = await returnLoan(request, tokens.librarian, loanId);

    returnedLoanId = returned.id;
    expect(returned.wasLate).toBe(false);
    expect(returned.returnDate).toBeTruthy();
  });

  test("staff consulta el registro de devoluciones", async ({ request, tokens }) => {
    const response = await request.get("/api/loans/returns", {
      headers: bearer(tokens.librarian),
    });
    await expectStatus(response, 200);

    const returns = await response.json();
    expect(returns.some((item: { id: number }) => item.id === returnedLoanId)).toBeTruthy();

    const entry = returns.find((item: { id: number }) => item.id === returnedLoanId);
    expectLoanShape(entry);
    expect(entry.status).toBe("RETURNED");
    expect(entry.returnDate).toBeTruthy();
    expect(entry.reader.email).toBe(CREDENTIALS.reader.email);
    expect(typeof entry.wasLate).toBe("boolean");
  });

  test("lector ve solo sus devoluciones en el registro", async ({ request, tokens }) => {
    const response = await request.get("/api/loans/returns", {
      headers: bearer(tokens.reader),
    });
    await expectStatus(response, 200);

    const returns = await response.json();
    expect(returns.length).toBeGreaterThan(0);
    for (const item of returns) {
      expect(item.status).toBe("RETURNED");
      expect(item.reader.email).toBe(CREDENTIALS.reader.email);
    }
  });

  test("admin puede filtrar devoluciones por lector", async ({ request, tokens }) => {
    const profile = await getReaderProfile(request, tokens.reader);
    expect(profile.readerId).toBeTruthy();

    const response = await request.get(
      `/api/loans/returns?readerId=${profile.readerId}`,
      { headers: bearer(tokens.admin) },
    );
    await expectStatus(response, 200);

    const returns = await response.json();
    expect(returns.length).toBeGreaterThan(0);
    for (const item of returns) {
      expect(item.reader.id).toBe(profile.readerId);
    }
  });
});

test.describe("Registro de devoluciones — filtros y permisos", () => {
  test("filtro lateOnly lista devoluciones fuera de plazo", async ({
    request,
    tokens,
  }) => {
    const { loanId } = await createApprovedLoan(request, tokens);

    const pastDue = new Date();
    pastDue.setDate(pastDue.getDate() - 5);
    await prisma.loan.update({
      where: { id: loanId },
      data: { dueDate: pastDue },
    });

    const returned = await returnLoan(request, tokens.librarian, loanId);
    expect(returned.wasLate).toBe(true);

    const lateOnly = await request.get("/api/loans/returns?lateOnly=true", {
      headers: bearer(tokens.admin),
    });
    await expectStatus(lateOnly, 200);
    const lateReturns = await lateOnly.json();
    expect(lateReturns.some((item: { id: number }) => item.id === loanId)).toBeTruthy();
    expect(lateReturns.every((item: { wasLate: boolean }) => item.wasLate)).toBeTruthy();
  });

  test("filtro por rango de fechas", async ({ request, tokens }) => {
    const today = new Date().toISOString().slice(0, 10);

    const response = await request.get(
      `/api/loans/returns?from=${today}&to=${today}`,
      { headers: bearer(tokens.admin) },
    );
    await expectStatus(response, 200);

    for (const item of await response.json()) {
      const returnDay = new Date(item.returnDate).toISOString().slice(0, 10);
      expect(returnDay).toBe(today);
    }
  });

  test("lector no puede filtrar por readerId ajeno", async ({ request, tokens }) => {
    await expectJsonError(
      await request.get("/api/loans/returns?readerId=999", {
        headers: bearer(tokens.reader),
      }),
      403,
    );
  });

  test("readerId inválido responde 400", async ({ request, tokens }) => {
    await expectJsonError(
      await request.get("/api/loans/returns?readerId=abc", {
        headers: bearer(tokens.admin),
      }),
      400,
    );
  });

  test("registro ordenado por fecha de devolución descendente", async ({
    request,
    tokens,
  }) => {
    const response = await request.get("/api/loans/returns", {
      headers: bearer(tokens.admin),
    });
    await expectStatus(response, 200);

    const returns = await response.json();
    expectSortedDescByDate(returns, "returnDate");
  });

  test("endpoint requiere autenticación", async ({ request }) => {
    await expectJsonError(await request.get("/api/loans/returns"), 401);
  });
});
