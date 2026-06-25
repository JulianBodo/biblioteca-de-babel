import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Migraciones + seed antes de la suite. Con RUN_DB_RESET=1 hace migrate reset. */
export default async function globalSetup() {
  dotenv.config({ path: path.join(rootDir, ".env") });

  const resetRequested = process.env.RUN_DB_RESET === "1";

  if (resetRequested) {
    console.log("\n[global-setup] Reseteando base de datos (RUN_DB_RESET=1)...\n");
    execSync("npx prisma migrate reset --force", {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
    });
    return;
  }

  console.log("\n[global-setup] Aplicando migraciones y seed...\n");
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
