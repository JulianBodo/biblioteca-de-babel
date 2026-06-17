import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta la variable DATABASE_URL en el archivo .env");
}

// Configuramos el pool de conexiones nativo de Postgres
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Instanciamos y exportamos Prisma para usarlo en el resto de la app
export const prisma = new PrismaClient({ adapter });
