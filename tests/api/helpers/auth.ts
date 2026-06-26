import { expect, type APIRequestContext } from "@playwright/test";
import { CREDENTIALS } from "../constants.js";
import type { AuthUser } from "../types.js";
import { bearer } from "./http.js";

export { CREDENTIALS };

export async function login(
  request: APIRequestContext,
  email: string,
  password: string,
) {
  const response = await request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(response.ok(), `Login falló para ${email}: ${response.status()}`).toBeTruthy();
  const body = (await response.json()) as { token: string };
  return body.token;
}

export async function loginAllRoles(request: APIRequestContext) {
  const [admin, librarian, reader, inactiveReader] = await Promise.all([
    login(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
    login(request, CREDENTIALS.librarian.email, CREDENTIALS.librarian.password),
    login(request, CREDENTIALS.reader.email, CREDENTIALS.reader.password),
    login(
      request,
      CREDENTIALS.inactiveReader.email,
      CREDENTIALS.inactiveReader.password,
    ),
  ]);

  return { admin, librarian, reader, inactiveReader };
}

export async function getReaderProfile(request: APIRequestContext, token: string) {
  const response = await request.get("/api/auth/me", { headers: bearer(token) });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as AuthUser;
}

export async function getInactiveReaderId(
  request: APIRequestContext,
  librarianToken: string,
) {
  const response = await request.get("/api/readers?status=INACTIVE", {
    headers: bearer(librarianToken),
  });
  expect(response.ok()).toBeTruthy();
  const readers = (await response.json()) as { id: number; email: string }[];
  const inactive = readers.find((r) => r.email === CREDENTIALS.inactiveReader.email);
  expect(inactive, "Lector inactivo seed no encontrado").toBeTruthy();
  return inactive!.id;
}
