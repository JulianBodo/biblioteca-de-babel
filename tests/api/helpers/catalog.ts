import { expect, type APIRequestContext } from "@playwright/test";
import type { LoanSummary, SeedContext } from "../types.js";
import { bearer } from "./http.js";

export async function getSeedContext(
  request: APIRequestContext,
  adminToken: string,
): Promise<SeedContext> {
  const headers = bearer(adminToken);
  const [authorsRes, publishersRes, genresRes, booksRes] = await Promise.all([
    request.get("/api/authors", { headers }),
    request.get("/api/publishers", { headers }),
    request.get("/api/genres", { headers }),
    request.get("/api/books", { headers }),
  ]);

  expect(authorsRes.ok()).toBeTruthy();
  expect(publishersRes.ok()).toBeTruthy();
  expect(genresRes.ok()).toBeTruthy();
  expect(booksRes.ok()).toBeTruthy();

  return {
    authors: await authorsRes.json(),
    publishers: await publishersRes.json(),
    genres: await genresRes.json(),
    books: await booksRes.json(),
    headers,
  };
}

export async function pickBookForLoan(
  request: APIRequestContext,
  adminToken: string,
  readerToken: string,
) {
  const seed = await getSeedContext(request, adminToken);
  const readerLoansRes = await request.get("/api/loans", {
    headers: bearer(readerToken),
  });
  expect(readerLoansRes.ok()).toBeTruthy();

  const readerLoans = (await readerLoansRes.json()) as LoanSummary[];
  const busyBookIds = new Set(
    readerLoans
      .filter((loan) => loan.status === "PENDING" || loan.status === "ACTIVE")
      .map((loan) => loan.book.id),
  );

  const book = seed.books.find(
    (item) => item.availableCopies > 0 && !busyBookIds.has(item.id),
  );
  expect(book, "No hay libros disponibles para un nuevo préstamo").toBeTruthy();
  return book!;
}
