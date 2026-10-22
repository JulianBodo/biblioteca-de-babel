import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function loadTestDatabase() {
  const result = dotenv.config({
    path: path.join(rootDir, ".env.test"),
    override: true,
  });

  if (result.error) {
    throw new Error("No se pudo cargar el archivo .env.test");
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Falta DATABASE_URL en .env.test");
  }

  const databaseName = new URL(connectionString).pathname.replace(/^\/+/, "");

  if (databaseName !== "biblioteca_test") {
    throw new Error(
      `Se esperaba biblioteca_test, pero DATABASE_URL apunta a ${databaseName}. Se canceló el setup.`,
    );
  }
}

/** Ejecuta migraciones y seed exclusivamente en la base de tests. */
export default async function globalSetup() {
  loadTestDatabase();

  const resetRequested = process.env.RUN_DB_RESET === "1";

  if (resetRequested) {
    console.log("\n[global-setup] Reseteando biblioteca_test...\n");

    execSync("npx prisma migrate reset --force", {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
    });

    return;
  }

  console.log("\n[global-setup] Aplicando migraciones y seed en biblioteca_test...\n");

  execSync("npx prisma migrate deploy", {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });

  execSync("npx prisma db seed", {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });
}