import { test, expectJsonError } from "./fixtures.js";
import { allureFeature, allureStory } from "./allure-meta.js";

allureFeature("Seguridad");

const PROTECTED_ENDPOINTS = [
  { method: "GET" as const, path: "/api/books" },
  { method: "GET" as const, path: "/api/loans" },
  { method: "GET" as const, path: "/api/loans/available" },
  { method: "GET" as const, path: "/api/loans/pending" },
  { method: "GET" as const, path: "/api/loans/overdue" },
  { method: "GET" as const, path: "/api/loans/returns" },
  { method: "GET" as const, path: "/api/readers" },
  { method: "GET" as const, path: "/api/auth/me" },
  { method: "GET" as const, path: "/api/auth/users" },
  { method: "POST" as const, path: "/api/loans", data: { bookId: 1 } },
];

test.describe("Autenticación requerida", () => {
  allureStory("Acceso sin token");

  for (const endpoint of PROTECTED_ENDPOINTS) {
    test(`${endpoint.method} ${endpoint.path} → 401`, async ({ request }) => {
      const response = await request.fetch(endpoint.path, {
        method: endpoint.method,
        data: endpoint.data,
      });
      await expectJsonError(response, 401);
    });
  }
});
