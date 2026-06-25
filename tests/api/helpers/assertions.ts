import { expect } from "@playwright/test";
import { LOAN_STATUS } from "../constants.js";

export function expectBookShape(book: Record<string, unknown>) {
  expect(book).toMatchObject({
    id: expect.any(Number),
    isbn: expect.any(String),
    title: expect.any(String),
    availableCopies: expect.any(Number),
    totalCopies: expect.any(Number),
  });
  expect(Array.isArray(book.authors)).toBe(true);
  expect(book.genre).toMatchObject({
    id: expect.any(Number),
    name: expect.any(String),
  });
  expect(book.publisher).toMatchObject({
    id: expect.any(Number),
    name: expect.any(String),
  });
}

export function expectLoanShape(loan: Record<string, unknown>) {
  expect(loan).toMatchObject({
    id: expect.any(Number),
    status: expect.any(String),
    reader: expect.objectContaining({
      id: expect.any(Number),
      email: expect.any(String),
    }),
    book: expect.objectContaining({
      id: expect.any(Number),
      title: expect.any(String),
    }),
  });
}

export function expectActiveLoanMetadata(loan: Record<string, unknown>) {
  expect(loan.status).toBe(LOAN_STATUS.ACTIVE);
  expect(typeof loan.daysOnLoan).toBe("number");
  expect(typeof loan.isOverdue).toBe("boolean");
  expect(typeof loan.daysOverdue).toBe("number");
}

export function expectReturnedLoanMetadata(loan: Record<string, unknown>) {
  expect(loan.status).toBe(LOAN_STATUS.RETURNED);
  expect(loan.returnDate).toBeTruthy();
  expect(typeof loan.wasLate).toBe("boolean");
}

export function expectSortedDescByDate(
  items: { returnDate?: string; dueDate?: string }[],
  field: "returnDate" | "dueDate",
) {
  for (let i = 1; i < items.length; i++) {
    const prev = new Date(items[i - 1]![field]!).getTime();
    const curr = new Date(items[i]![field]!).getTime();
    expect(prev).toBeGreaterThanOrEqual(curr);
  }
}
