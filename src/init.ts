import "dotenv/config";
import { App } from "./app.js";
import { prisma } from "./database.js";

/** Conecta Prisma y levanta el servidor HTTP. */
async function main() {
  await prisma.$connect();
  console.log("Conectado a PostgreSQL");

  const application = new App();
  application.start();
}

main().catch((error) => {
  console.error("Error al iniciar la aplicación:", error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
