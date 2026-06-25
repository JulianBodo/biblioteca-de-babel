import { expect, type APIResponse } from "@playwright/test";
import type { ApiError } from "../types.js";

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function expectStatus(response: APIResponse, status: number) {
  const body = await response.text();
  expect(response.status(), body).toBe(status);
}

export async function expectJsonError(
  response: APIResponse,
  status: number,
  messagePart?: string,
) {
  await expectStatus(response, status);
  const body = (await response.json()) as ApiError;
  expect(body.error).toBeTruthy();
  if (messagePart) {
    expect(body.error).toContain(messagePart);
  }
  return body;
}

export async function expectNoContent(response: APIResponse) {
  expect(response.status()).toBe(204);
}
