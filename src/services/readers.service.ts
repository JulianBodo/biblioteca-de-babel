import { LoanStatus } from "../../generated/prisma/client.js";
import { config } from "../config.js";
import { prisma } from "../database.js";
import { AppError } from "../utils/errors.js";
import {
  ReaderStatusCode,
  assertReaderCanBorrow,
  getReaderStatusId,
} from "../utils/readerStatus.js";

const readerInclude = {
  readerStatus: true,
  user: {
    select: { id: true, email: true, role: true },
  },
} as const;

function subtractMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

export async function listReaders(status?: string) {
  return prisma.reader.findMany({
    where: status
      ? { readerStatus: { status } }
      : undefined,
    include: readerInclude,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getReader(id: number) {
  const reader = await prisma.reader.findUnique({
    where: { id },
    include: readerInclude,
  });

  if (!reader) {
    throw new AppError(404, "Lector no encontrado");
  }

  return reader;
}

export async function updateReader(
  id: number,
  input: {
    firstName?: string;
    lastName?: string;
    email?: string;
    dni?: string;
    readerStatusId?: number;
  },
) {
  await getReader(id);

  if (input.readerStatusId !== undefined) {
    const status = await prisma.readerStatus.findUnique({
      where: { id: input.readerStatusId },
    });
    if (!status) {
      throw new AppError(404, "Estado de lector no encontrado");
    }
  }

  return prisma.reader.update({
    where: { id },
    data: input,
    include: readerInclude,
  });
}

export async function reactivateReader(id: number) {
  await getReader(id);
  const activeStatusId = await getReaderStatusId(ReaderStatusCode.ACTIVE);

  return prisma.reader.update({
    where: { id },
    data: { readerStatusId: activeStatusId },
    include: readerInclude,
  });
}

export async function suspendReader(id: number) {
  const reader = await getReader(id);

  const openLoans = await prisma.loan.count({
    where: {
      readerId: id,
      status: { in: [LoanStatus.PENDING, LoanStatus.ACTIVE] },
    },
  });

  if (openLoans > 0) {
    throw new AppError(
      400,
      "No se puede suspender un lector con préstamos pendientes o activos",
    );
  }

  const suspendedStatusId = await getReaderStatusId(ReaderStatusCode.SUSPENDED);

  return prisma.reader.update({
    where: { id: reader.id },
    data: { readerStatusId: suspendedStatusId },
    include: readerInclude,
  });
}

export async function syncInactiveReaders() {
  const inactiveStatusId = await getReaderStatusId(ReaderStatusCode.INACTIVE);
  const activeStatusId = await getReaderStatusId(ReaderStatusCode.ACTIVE);
  const cutoff = subtractMonths(new Date(), config.inactiveMonths);

  const candidates = await prisma.reader.findMany({
    where: {
      readerStatusId: activeStatusId,
      loans: {
        none: {
          status: { in: [LoanStatus.PENDING, LoanStatus.ACTIVE] },
        },
      },
    },
    select: {
      id: true,
      lastLoanAt: true,
      createdAt: true,
    },
  });

  const toMarkInactive = candidates.filter((reader) => {
    const lastActivity = reader.lastLoanAt ?? reader.createdAt;
    return lastActivity < cutoff;
  });

  if (toMarkInactive.length === 0) {
    return { updated: 0, readerIds: [] as number[] };
  }

  await prisma.reader.updateMany({
    where: { id: { in: toMarkInactive.map((r) => r.id) } },
    data: { readerStatusId: inactiveStatusId },
  });

  return {
    updated: toMarkInactive.length,
    readerIds: toMarkInactive.map((r) => r.id),
  };
}

export async function deleteReader(id: number) {
  await getReader(id);

  const activeLoans = await prisma.loan.count({
    where: {
      readerId: id,
      status: { in: ["PENDING", "ACTIVE"] },
    },
  });

  if (activeLoans > 0) {
    throw new AppError(
      400,
      "No se puede eliminar un lector con préstamos pendientes o activos",
    );
  }

  await prisma.reader.delete({ where: { id } });
}

export async function listReaderStatuses() {
  return prisma.readerStatus.findMany({ orderBy: { status: "asc" } });
}
