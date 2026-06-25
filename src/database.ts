import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta la variable DATABASE_URL en el archivo .env");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

/** Cliente Prisma con adapter pg (requerido en Prisma 7). */
export const prisma = new PrismaClient({ adapter });
