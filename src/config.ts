import "dotenv/config";

const port = Number(process.env.PORT ?? 3000);

if (Number.isNaN(port)) {
  throw new Error("PORT debe ser un número válido");
}

const inactiveMonths = Number(process.env.INACTIVE_MONTHS ?? 12);

/** Valores leídos de .env; usados en toda la app. */
export const config = {
  port,
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  loanDays: Number(process.env.LOAN_DAYS ?? 14),
  inactiveMonths: Number.isNaN(inactiveMonths) ? 12 : inactiveMonths,
};
