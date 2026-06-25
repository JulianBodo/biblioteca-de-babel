import { expect, type APIRequestContext } from "@playwright/test";
import { bearer, expectStatus, uniqueSuffix } from "./http.js";

export type IsolatedBookStack = {
  headers: ReturnType<typeof bearer>;
  author: { id: number };
  publisher: { id: number };
  genre: { id: number };
  book: { id: number };
  suffix: string;
};

/** Catálogo + libro propios del test; no usa datos del seed. */
export async function createIsolatedBookStack(
  request: APIRequestContext,
  adminToken: string,
): Promise<IsolatedBookStack> {
  const headers = bearer(adminToken);
  const suffix = uniqueSuffix();

  const authorRes = await request.post("/api/authors", {
    headers,
    data: { firstName: "Tmp", lastName: `Del ${suffix}` },
  });
  await expectStatus(authorRes, 201);
  const author = await authorRes.json();

  const publisherRes = await request.post("/api/publishers", {
    headers,
    data: { name: `Pub Del ${suffix}` },
  });
  await expectStatus(publisherRes, 201);
  const publisher = await publisherRes.json();

  const genreRes = await request.post("/api/genres", {
    headers,
    data: { name: `Gen Del ${suffix}` },
  });
  await expectStatus(genreRes, 201);
  const genre = await genreRes.json();

  const bookRes = await request.post("/api/books", {
    headers,
    data: {
      isbn: `978-del-${suffix}`,
      title: `Libro Del ${suffix}`,
      publicationYear: 2020,
      authorIds: [author.id],
      publisherId: publisher.id,
      genreId: genre.id,
      totalCopies: 1,
    },
  });
  await expectStatus(bookRes, 201);
  const book = await bookRes.json();

  return { headers, author, publisher, genre, book, suffix };
}

export async function createDisposableAuthor(
  request: APIRequestContext,
  adminToken: string,
) {
  const headers = bearer(adminToken);
  const suffix = uniqueSuffix();
  const response = await request.post("/api/authors", {
    headers,
    data: { firstName: "Solo", lastName: `Borrar ${suffix}` },
  });
  await expectStatus(response, 201);
  return { headers, author: await response.json() };
}

export async function createDisposablePublisher(
  request: APIRequestContext,
  adminToken: string,
) {
  const headers = bearer(adminToken);
  const suffix = uniqueSuffix();
  const response = await request.post("/api/publishers", {
    headers,
    data: { name: `Editorial Borrar ${suffix}` },
  });
  await expectStatus(response, 201);
  return { headers, publisher: await response.json() };
}

export async function createDisposableGenre(
  request: APIRequestContext,
  adminToken: string,
) {
  const headers = bearer(adminToken);
  const suffix = uniqueSuffix();
  const response = await request.post("/api/genres", {
    headers,
    data: { name: `Género Borrar ${suffix}` },
  });
  await expectStatus(response, 201);
  return { headers, genre: await response.json() };
}

export async function createDisposableReaderUser(
  request: APIRequestContext,
  adminToken: string,
) {
  const headers = bearer(adminToken);
  const suffix = uniqueSuffix();
  const dni = suffix.replace(/\D/g, "").slice(-8).padStart(8, "0");

  const response = await request.post("/api/auth/users", {
    headers,
    data: {
      email: `descartable.${suffix}@test.com`,
      password: "test1234",
      role: "READER",
      firstName: "Descartable",
      lastName: `Lector ${suffix}`,
      dni,
    },
  });
  await expectStatus(response, 201);
  const user = await response.json();
  expect(user.readerId).toBeTruthy();

  return {
    headers,
    userId: user.id as number,
    readerId: user.readerId as number,
  };
}

/** Elimina libro y catálogo aislado (sin préstamos abiertos). */
export async function tearDownIsolatedBookStack(
  request: APIRequestContext,
  adminToken: string,
  stack: IsolatedBookStack,
) {
  const headers = bearer(adminToken);
  await request.delete(`/api/books/${stack.book.id}`, { headers });
  await request.delete(`/api/authors/${stack.author.id}`, { headers });
  await request.delete(`/api/publishers/${stack.publisher.id}`, { headers });
  await request.delete(`/api/genres/${stack.genre.id}`, { headers });
}

export async function deleteUserIfExists(
  request: APIRequestContext,
  adminToken: string,
  userId: number,
) {
  await request.delete(`/api/auth/users/${userId}`, {
    headers: bearer(adminToken),
  });
}
