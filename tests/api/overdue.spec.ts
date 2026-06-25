import { prisma } from "../../src/database.js";
import {
  test,
  expect,
  bearer,
  getReaderProfile,
  createApprovedLoan,
  returnLoan,
  CREDENTIALS,
  expectJsonError,
  expectLoanShape,
  expectStatus,
} from "./fixtures.js";
import { allureFeature } from "./allure-meta.js";

allureFeature("Mora de préstamos");

test.describe.serial("Mora — aviso al lector", () => {
  let overdueLoanId: number;

  test("préstamo activo incluye días en préstamo", async ({ request, tokens }) => {
    const { loanId } = await createApprovedLoan(request, tokens);

    const response = await request.get(`/api/loans/${loanId}`, {
      headers: bearer(tokens.reader),
    });
    await expectStatus(response, 200);

    const loan = await response.json();
    expectLoanShape(loan);
    expect(loan.status).toBe("ACTIVE");
    expect(loan.daysOnLoan).toBeGreaterThanOrEqual(0);
    expect(loan.isOverdue).toBe(false);
    expect(loan.daysOverdue).toBe(0);
    expect(loan.overdueNotice).toBeNull();

    await returnLoan(request, tokens.librarian, loanId);
  });

  test("lector en mora recibe aviso con días vencidos", async ({ request, tokens }) => {
    const { loanId } = await createApprovedLoan(request, tokens);
    overdueLoanId = loanId;

    const pastDue = new Date();
    pastDue.setDate(pastDue.getDate() - 3);
    await prisma.loan.update({
      where: { id: loanId },
      data: { dueDate: pastDue },
    });

    const response = await request.get("/api/loans/overdue", {
      headers: bearer(tokens.reader),
    });
    await expectStatus(response, 200);

    const overdue = await response.json();
    expect(overdue.some((item: { id: number }) => item.id === loanId)).toBeTruthy();

    const entry = overdue.find((item: { id: number }) => item.id === loanId);
    expectLoanShape(entry);
    expect(entry.isOverdue).toBe(true);
    expect(entry.daysOverdue).toBeGreaterThanOrEqual(3);
    expect(entry.overdueNotice).toContain("mora");
  });

  test("staff consulta morosos del sistema", async ({ request, tokens }) => {
    const response = await request.get("/api/loans/overdue", {
      headers: bearer(tokens.librarian),
    });
    await expectStatus(response, 200);

    const overdue = await response.json();
    expect(overdue.some((item: { id: number }) => item.id === overdueLoanId)).toBeTruthy();
    for (const item of overdue) {
      expect(item.status).toBe("ACTIVE");
      expect(item.isOverdue).toBe(true);
      expect(item.daysOverdue).toBeGreaterThan(0);
      expect(item.overdueNotice).toContain("mora");
    }
  });

  test("admin filtra mora por lector", async ({ request, tokens }) => {
    const profile = await getReaderProfile(request, tokens.reader);

    const response = await request.get(
      `/api/loans/overdue?readerId=${profile.readerId}`,
      { headers: bearer(tokens.admin) },
    );
    await expectStatus(response, 200);

    const overdue = await response.json();
    expect(overdue.length).toBeGreaterThan(0);
    for (const item of overdue) {
      expect(item.reader.id).toBe(profile.readerId);
      expect(item.reader.email).toBe(CREDENTIALS.reader.email);
    }
  });

  test("listado general incluye metadatos de mora en préstamos activos", async ({
    request,
    tokens,
  }) => {
    const response = await request.get("/api/loans", {
      headers: bearer(tokens.reader),
    });
    await expectStatus(response, 200);

    const overdueOnes = (await response.json()).filter(
      (loan: { status: string; isOverdue: boolean }) =>
        loan.status === "ACTIVE" && loan.isOverdue,
    );
    expect(overdueOnes.length).toBeGreaterThan(0);
    for (const loan of overdueOnes) {
      expect(loan.daysOnLoan).toBeGreaterThanOrEqual(0);
      expect(loan.daysOverdue).toBeGreaterThan(0);
      expect(loan.overdueNotice).toContain("mora");
    }
  });

  test("detalle de préstamo vencido incluye aviso de mora", async ({
    request,
    tokens,
  }) => {
    const response = await request.get(`/api/loans/${overdueLoanId}`, {
      headers: bearer(tokens.reader),
    });
    await expectStatus(response, 200);

    const loan = await response.json();
    expect(loan.isOverdue).toBe(true);
    expect(loan.overdueNotice).toContain("mora");
    expect(loan.overdueNotice).toContain(String(loan.daysOverdue));

    await returnLoan(request, tokens.librarian, overdueLoanId);
  });
});

test.describe("Mora — permisos", () => {
  test("lector no puede filtrar mora por readerId ajeno", async ({ request, tokens }) => {
    await expectJsonError(
      await request.get("/api/loans/overdue?readerId=1", {
        headers: bearer(tokens.reader),
      }),
      403,
    );
  });

  test("préstamo al día no aparece en listado de mora", async ({ request, tokens }) => {
    const { loanId } = await createApprovedLoan(request, tokens);

    const response = await request.get("/api/loans/overdue", {
      headers: bearer(tokens.admin),
    });
    await expectStatus(response, 200);
    expect(
      (await response.json()).some((item: { id: number }) => item.id === loanId),
    ).toBeFalsy();

    await returnLoan(request, tokens.librarian, loanId);
  });

  test("readerId inválido responde 400", async ({ request, tokens }) => {
    await expectJsonError(
      await request.get("/api/loans/overdue?readerId=abc", {
        headers: bearer(tokens.admin),
      }),
      400,
    );
  });

  test("listado de mora ordenado por días vencidos descendente", async ({
    request,
    tokens,
  }) => {
    const response = await request.get("/api/loans/overdue", {
      headers: bearer(tokens.admin),
    });
    await expectStatus(response, 200);

    const overdue = await response.json();
    for (let i = 1; i < overdue.length; i++) {
      expect(overdue[i - 1].daysOverdue).toBeGreaterThanOrEqual(overdue[i].daysOverdue);
    }
  });

  test("endpoint requiere autenticación", async ({ request }) => {
    await expectJsonError(await request.get("/api/loans/overdue"), 401);
  });
});
