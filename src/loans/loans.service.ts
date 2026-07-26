import { LoanStatus, Role } from "../../generated/prisma/client.ts";
import * as booksService from "../books/books.service.ts";
import { config } from "../config.ts";
import { prisma } from "../database.ts";
import { AppError } from "../utils/errors.ts";
import { assertReaderCanBorrow } from "../utils/readerStatus.ts";

/** Includes estándar: lector con estado + libro con autores, género y editorial. */
const loanInclude = {
  reader: {
    include: { readerStatus: true },
  },
  book: {
    include: {
      genre: true,
      publisher: true,
      authors: {
        include: { author: true },
      },
    },
  },
} as const;

function formatLoanBook(book: {
  authors: { author: unknown }[];
  [key: string]: unknown;
}) {
  const { authors: bookAuthors, ...rest } = book;
  return {
    ...rest,
    authors: bookAuthors.map(({ author }) => author),
  };
}

function formatLoan<T extends { book: Parameters<typeof formatLoanBook>[0] }>(
  loan: T,
) {
  return {
    ...loan,
    book: formatLoanBook(loan.book),
  };
}

function withReturnMetadata<
  T extends { returnDate: Date | null; dueDate: Date | null },
>(loan: T) {
  const wasLate =
    loan.returnDate && loan.dueDate
      ? new Date(loan.returnDate) > new Date(loan.dueDate)
      : false;

  return { ...loan, wasLate };
}

export interface ReturnsFilters {
  readerId?: number;
  from?: string;
  to?: string;
  lateOnly?: boolean;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function daysBetween(from: Date, to: Date) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatDateLabel(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function withActiveLoanMetadata<
  T extends {
    status: LoanStatus;
    loanDate: Date | null;
    dueDate: Date | null;
  },
>(loan: T, now = new Date()) {
  if (loan.status !== LoanStatus.ACTIVE || !loan.loanDate || !loan.dueDate) {
    return {
      ...loan,
      daysOnLoan: null as number | null,
      isOverdue: false,
      daysOverdue: 0,
      overdueNotice: null as string | null,
    };
  }

  const loanDate = new Date(loan.loanDate);
  const dueDate = new Date(loan.dueDate);
  const daysOnLoan = daysBetween(loanDate, now);
  const isOverdue = now > dueDate;
  const daysOverdue = isOverdue ? daysBetween(dueDate, now) : 0;
  const overdueNotice = isOverdue
    ? `El préstamo lleva ${daysOverdue} día(s) de mora (venció el ${formatDateLabel(dueDate)}).`
    : null;

  return {
    ...loan,
    daysOnLoan,
    isOverdue,
    daysOverdue,
    overdueNotice,
  };
}

function enrichLoan<
  T extends {
    status: LoanStatus;
    loanDate: Date | null;
    dueDate: Date | null;
    returnDate: Date | null;
  },
>(loan: T) {
  const formatted = formatLoan(loan as Parameters<typeof formatLoan>[0]);

  if (loan.status === LoanStatus.ACTIVE) {
    return withActiveLoanMetadata(formatted);
  }

  if (loan.status === LoanStatus.RETURNED) {
    return withReturnMetadata(formatted);
  }

  return formatted;
}

export async function listLoans(role: Role, readerId?: number) {
  const where = role === Role.READER && readerId ? { readerId } : undefined;

  const loans = await prisma.loan.findMany({
    where,
    include: loanInclude,
    orderBy: { createdAt: "desc" },
  });

  return loans.map((loan) => enrichLoan(loan));
}

/** Préstamos ACTIVE con dueDate vencida; ordenados por días de mora. */
export async function listOverdueLoans(
  role: Role,
  readerId: number | undefined,
  filterReaderId?: number,
) {
  if (role === Role.READER && !readerId) {
    throw new AppError(400, "Tu usuario no está vinculado a un lector");
  }

  if (role === Role.READER && filterReaderId !== undefined) {
    throw new AppError(403, "No tenés permisos para filtrar por lector");
  }

  const now = new Date();
  const where: {
    status: typeof LoanStatus.ACTIVE;
    dueDate: { lt: Date };
    readerId?: number;
  } = {
    status: LoanStatus.ACTIVE,
    dueDate: { lt: now },
  };

  if (role === Role.READER) {
    where.readerId = readerId;
  } else if (filterReaderId !== undefined) {
    where.readerId = filterReaderId;
  }

  const loans = await prisma.loan.findMany({
    where,
    include: loanInclude,
    orderBy: { dueDate: "asc" },
  });

  return loans
    .map((loan) => withActiveLoanMetadata(formatLoan(loan), now))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export async function listPendingLoans() {
  const loans = await prisma.loan.findMany({
    where: { status: LoanStatus.PENDING },
    include: loanInclude,
    orderBy: { createdAt: "asc" },
  });

  return loans.map(formatLoan);
}

export async function listAvailableForLoan(
  role: Role,
  readerId: number | undefined,
  filterReaderId?: number,
) {
  if (role === Role.READER) {
    if (!readerId) {
      throw new AppError(400, "Tu usuario no está vinculado a un lector");
    }

    const reader = await prisma.reader.findUnique({
      where: { id: readerId },
      include: { readerStatus: true },
    });

    if (!reader) {
      throw new AppError(404, "Lector no encontrado");
    }

    assertReaderCanBorrow(reader.readerStatus.status);
  }

  if (role === Role.READER && filterReaderId !== undefined) {
    throw new AppError(403, "No tenés permisos para filtrar por lector");
  }

  const targetReaderId = role === Role.READER ? readerId : filterReaderId;
  const books = await booksService.listBooks(true);

  if (targetReaderId === undefined) {
    return books;
  }

  const busyLoans = await prisma.loan.findMany({
    where: {
      readerId: targetReaderId,
      status: { in: [LoanStatus.PENDING, LoanStatus.ACTIVE] },
    },
    select: { bookId: true },
  });

  const busyBookIds = new Set(busyLoans.map((loan) => loan.bookId));
  return books.filter((book) => !busyBookIds.has(book.id));
}

/** Historial RETURNED con filtros opcionales de fecha y mora en devolución. */
export async function listReturns(
  role: Role,
  readerId: number | undefined,
  filters: ReturnsFilters = {},
) {
  if (role === Role.READER && !readerId) {
    throw new AppError(400, "Tu usuario no está vinculado a un lector");
  }

  const where: {
    status: typeof LoanStatus.RETURNED;
    readerId?: number;
    returnDate?: { gte?: Date; lte?: Date };
  } = {
    status: LoanStatus.RETURNED,
  };

  if (role === Role.READER) {
    where.readerId = readerId;
  } else if (filters.readerId !== undefined) {
    where.readerId = filters.readerId;
  }

  if (filters.from || filters.to) {
    where.returnDate = {};
    if (filters.from) {
      where.returnDate.gte = new Date(filters.from);
    }
    if (filters.to) {
      const to = new Date(filters.to);
      to.setHours(23, 59, 59, 999);
      where.returnDate.lte = to;
    }
  }

  const loans = await prisma.loan.findMany({
    where,
    include: loanInclude,
    orderBy: { returnDate: "desc" },
  });

  let results = loans.map((loan) => withReturnMetadata(formatLoan(loan)));

  if (filters.lateOnly) {
    results = results.filter((loan) => loan.wasLate);
  }

  return results;
}

export async function createLoan(readerId: number, bookId: number) {
  const reader = await prisma.reader.findUnique({
    where: { id: readerId },
    include: { readerStatus: true },
  });

  if (!reader) {
    throw new AppError(404, "Lector no encontrado");
  }

  assertReaderCanBorrow(reader.readerStatus.status);

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) {
    throw new AppError(404, "Libro no encontrado");
  }

  if (book.availableCopies < 1) {
    throw new AppError(409, "No hay ejemplares disponibles de este libro");
  }

  const existingPendingOrActive = await prisma.loan.findFirst({
    where: {
      readerId,
      bookId,
      status: { in: [LoanStatus.PENDING, LoanStatus.ACTIVE] },
    },
  });

  if (existingPendingOrActive) {
    throw new AppError(
      409,
      "El lector ya tiene una solicitud o préstamo activo para este libro",
    );
  }

  const loan = await prisma.loan.create({
    data: {
      readerId,
      bookId,
      status: LoanStatus.PENDING,
    },
    include: loanInclude,
  });

  return enrichLoan(loan);
}

export async function requestLoan(readerId: number, bookId: number) {
  return createLoan(readerId, bookId);
}

/** PENDING → ACTIVE en transacción; descuenta ejemplar y actualiza lastLoanAt. */
export async function approveLoan(loanId: number) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      include: { book: true, reader: { include: { readerStatus: true } } },
    });

    if (!loan) {
      throw new AppError(404, "Préstamo no encontrado");
    }

    if (loan.status !== LoanStatus.PENDING) {
      throw new AppError(400, "Solo se pueden aprobar solicitudes pendientes");
    }

    if (loan.reader.readerStatus.status !== "ACTIVE") {
      throw new AppError(
        400,
        `No se puede aprobar: el lector está en estado ${loan.reader.readerStatus.status}`,
      );
    }

    if (loan.book.availableCopies < 1) {
      throw new AppError(409, "No hay ejemplares disponibles");
    }

    const now = new Date();

    const [updatedLoan] = await Promise.all([
      tx.loan.update({
        where: { id: loanId },
        data: {
          status: LoanStatus.ACTIVE,
          loanDate: now,
          dueDate: addDays(now, config.loanDays),
        },
        include: loanInclude,
      }),
      tx.book.update({
        where: { id: loan.bookId },
        data: { availableCopies: { decrement: 1 } },
      }),
      tx.reader.update({
        where: { id: loan.readerId },
        data: { lastLoanAt: now },
      }),
    ]);

    return enrichLoan(updatedLoan);
  });
}

export async function rejectLoan(loanId: number) {
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });

  if (!loan) {
    throw new AppError(404, "Préstamo no encontrado");
  }

  if (loan.status !== LoanStatus.PENDING) {
    throw new AppError(400, "Solo se pueden rechazar solicitudes pendientes");
  }

  const updated = await prisma.loan.update({
    where: { id: loanId },
    data: { status: LoanStatus.REJECTED },
    include: loanInclude,
  });

  return formatLoan(updated);
}

export async function returnLoan(loanId: number) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      include: { book: true },
    });

    if (!loan) {
      throw new AppError(404, "Préstamo no encontrado");
    }

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new AppError(400, "Solo se pueden devolver préstamos activos");
    }

    const now = new Date();

    const [updatedLoan] = await Promise.all([
      tx.loan.update({
        where: { id: loanId },
        data: {
          status: LoanStatus.RETURNED,
          returnDate: now,
        },
        include: loanInclude,
      }),
      tx.book.update({
        where: { id: loan.bookId },
        data: { availableCopies: { increment: 1 } },
      }),
    ]);

    return withReturnMetadata(formatLoan(updatedLoan));
  });
}

export async function getLoan(loanId: number, role: Role, readerId?: number) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: loanInclude,
  });

  if (!loan) {
    throw new AppError(404, "Préstamo no encontrado");
  }

  if (role === Role.READER && loan.readerId !== readerId) {
    throw new AppError(403, "No tenés permisos para ver este préstamo");
  }

  return enrichLoan(loan);
}

export async function updateLoan(loanId: number, input: { dueDate?: string }) {
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });

  if (!loan) {
    throw new AppError(404, "Préstamo no encontrado");
  }

  if (loan.status !== LoanStatus.ACTIVE) {
    throw new AppError(
      400,
      "Solo se puede modificar la fecha de vencimiento en préstamos activos",
    );
  }

  if (input.dueDate === undefined) {
    throw new AppError(400, "dueDate es obligatorio");
  }

  const dueDate = new Date(input.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    throw new AppError(400, "dueDate inválido");
  }

  if (loan.loanDate && dueDate < new Date(loan.loanDate)) {
    throw new AppError(400, "dueDate no puede ser anterior a loanDate");
  }

  const updated = await prisma.loan.update({
    where: { id: loanId },
    data: { dueDate },
    include: loanInclude,
  });

  return enrichLoan(updated);
}

export async function deleteLoan(loanId: number, role: Role) {
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });

  if (!loan) {
    throw new AppError(404, "Préstamo no encontrado");
  }

  if (loan.status === LoanStatus.ACTIVE) {
    throw new AppError(
      400,
      "No se puede eliminar un préstamo activo. Registrá la devolución primero.",
    );
  }

  if (
    (loan.status === LoanStatus.RETURNED ||
      loan.status === LoanStatus.REJECTED) &&
    role !== Role.ADMIN
  ) {
    throw new AppError(
      403,
      "Solo un admin puede eliminar préstamos finalizados",
    );
  }

  await prisma.loan.delete({ where: { id: loanId } });
}
