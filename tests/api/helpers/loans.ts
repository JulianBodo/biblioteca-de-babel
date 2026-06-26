import { expect, type APIRequestContext } from "@playwright/test";
import { LOAN_STATUS } from "../constants.js";
import type { LoanTokens } from "../types.js";
import { expectLoanShape, expectReturnedLoanMetadata } from "./assertions.js";
import { pickBookForLoan } from "./catalog.js";
import { bearer, expectStatus } from "./http.js";

/** Flujos HTTP reutilizables para specs de préstamos. */

export async function createPendingLoan(
  request: APIRequestContext,
  tokens: LoanTokens,
  bookId?: number,
) {
  const book =
    bookId !== undefined
      ? { id: bookId }
      : await pickBookForLoan(request, tokens.admin, tokens.reader);

  const create = await request.post("/api/loans", {
    headers: bearer(tokens.reader),
    data: { bookId: book.id },
  });
  await expectStatus(create, 201);

  const loan = await create.json();
  expectLoanShape(loan);
  expect(loan.status).toBe(LOAN_STATUS.PENDING);

  return { loan, bookId: book.id };
}

export async function approveLoan(
  request: APIRequestContext,
  librarianToken: string,
  loanId: number,
) {
  const response = await request.patch(`/api/loans/${loanId}/approve`, {
    headers: bearer(librarianToken),
  });
  await expectStatus(response, 200);
  const loan = await response.json();
  expect(loan.status).toBe(LOAN_STATUS.ACTIVE);
  expect(loan.loanDate).toBeTruthy();
  expect(loan.dueDate).toBeTruthy();
  return loan;
}

export async function createApprovedLoan(
  request: APIRequestContext,
  tokens: LoanTokens,
  bookId?: number,
) {
  const { loan, bookId: resolvedBookId } = await createPendingLoan(
    request,
    tokens,
    bookId,
  );
  const approved = await approveLoan(request, tokens.librarian, loan.id);
  return { loanId: loan.id as number, bookId: resolvedBookId, loan: approved };
}

export async function rejectLoan(
  request: APIRequestContext,
  librarianToken: string,
  loanId: number,
) {
  const response = await request.patch(`/api/loans/${loanId}/reject`, {
    headers: bearer(librarianToken),
  });
  await expectStatus(response, 200);
  expect((await response.json()).status).toBe(LOAN_STATUS.REJECTED);
}

export async function returnLoan(
  request: APIRequestContext,
  librarianToken: string,
  loanId: number,
) {
  const response = await request.patch(`/api/loans/${loanId}/return`, {
    headers: bearer(librarianToken),
  });
  await expectStatus(response, 200);
  const loan = await response.json();
  expectReturnedLoanMetadata(loan);
  return loan;
}
