import { prisma } from "../database.js";
import { AppError } from "../utils/errors.js";

export const ReaderStatusCode = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  INACTIVE: "INACTIVE",
} as const;

export type ReaderStatusCode =
  (typeof ReaderStatusCode)[keyof typeof ReaderStatusCode];

/** Mensaje que ve el lector cuando su estado no permite pedir préstamos. */
export function getLoanBlockMessage(status: string): string {
  switch (status) {
    case ReaderStatusCode.SUSPENDED:
      return "Tu cuenta está suspendida. Contactá a la biblioteca.";
    case ReaderStatusCode.INACTIVE:
      return "Tu cuenta está inactiva por falta de uso. Pedile al staff que te reactive.";
    default:
      return "Tu cuenta de lector no está habilitada para pedir préstamos.";
  }
}

/** Lanza 403 si el lector no está ACTIVE. */
export function assertReaderCanBorrow(status: string): void {
  if (status !== ReaderStatusCode.ACTIVE) {
    throw new AppError(403, getLoanBlockMessage(status));
  }
}

export async function getReaderStatusId(code: ReaderStatusCode) {
  const status = await prisma.readerStatus.findUnique({
    where: { status: code },
  });

  if (!status) {
    throw new AppError(500, `Estado ${code} no configurado en la base`);
  }

  return status.id;
}
