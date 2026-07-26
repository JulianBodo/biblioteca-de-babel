import { prisma } from "../database.js";
import { AppError } from "../utils/errors.js";

const bookInclude = {
  genre: true,
  publisher: true,
  authors: {
    include: { author: true },
    orderBy: { author: { lastName: "asc" as const } },
  },
} as const;

function formatBook(book: {
  authors: { author: { id: number; firstName: string; lastName: string; createdAt: Date; updatedAt: Date } }[];
  genre: { id: number; name: string; createdAt: Date; updatedAt: Date };
  publisher: { id: number; name: string; createdAt: Date; updatedAt: Date };
  [key: string]: unknown;
}) {
  const { authors: bookAuthors, ...rest } = book;
  return {
    ...rest,
    authors: bookAuthors.map(({ author }) => author),
  };
}

async function validateAuthorIds(authorIds: number[]) {
  if (authorIds.length === 0) {
    throw new AppError(400, "Debe indicar al menos un autor");
  }

  const uniqueIds = [...new Set(authorIds)];
  const authors = await prisma.author.findMany({
    where: { id: { in: uniqueIds } },
  });

  if (authors.length !== uniqueIds.length) {
    throw new AppError(404, "Uno o más autores no existen");
  }

  return uniqueIds;
}

async function validatePublisherId(publisherId: number) {
  const publisher = await prisma.publisher.findUnique({
    where: { id: publisherId },
  });

  if (!publisher) {
    throw new AppError(404, "Editorial no encontrada");
  }
}

async function validateGenreId(genreId: number) {
  const genre = await prisma.genre.findUnique({ where: { id: genreId } });
  if (!genre) {
    throw new AppError(404, "Género no encontrado");
  }
}

async function syncBookAuthors(bookId: number, authorIds: number[]) {
  const uniqueIds = await validateAuthorIds(authorIds);

  await prisma.$transaction([
    prisma.bookAuthor.deleteMany({ where: { bookId } }),
    prisma.bookAuthor.createMany({
      data: uniqueIds.map((authorId) => ({ bookId, authorId })),
    }),
  ]);
}

export async function listBooks(availableOnly = false) {
  const books = await prisma.book.findMany({
    where: availableOnly ? { availableCopies: { gt: 0 } } : undefined,
    include: bookInclude,
    orderBy: { title: "asc" },
  });

  return books.map(formatBook);
}

export async function getBook(id: number) {
  const book = await prisma.book.findUnique({
    where: { id },
    include: bookInclude,
  });

  if (!book) {
    throw new AppError(404, "Libro no encontrado");
  }

  return formatBook(book);
}

export async function createBook(input: {
  isbn: string;
  title: string;
  publicationYear: number;
  authorIds: number[];
  publisherId: number;
  genreId: number;
  totalCopies?: number;
}) {
  await validateGenreId(input.genreId);
  await validatePublisherId(input.publisherId);
  const authorIds = await validateAuthorIds(input.authorIds);

  const totalCopies = input.totalCopies ?? 1;
  if (totalCopies < 1) {
    throw new AppError(400, "Debe haber al menos un ejemplar");
  }

  const book = await prisma.book.create({
    data: {
      isbn: input.isbn,
      title: input.title,
      publicationYear: input.publicationYear,
      genreId: input.genreId,
      publisherId: input.publisherId,
      totalCopies,
      availableCopies: totalCopies,
      authors: {
        create: authorIds.map((authorId) => ({ authorId })),
      },
    },
    include: bookInclude,
  });

  return formatBook(book);
}

export async function updateBook(
  id: number,
  input: {
    isbn?: string;
    title?: string;
    publicationYear?: number;
    authorIds?: number[];
    publisherId?: number;
    genreId?: number;
    totalCopies?: number;
  },
) {
  const book = await prisma.book.findUnique({ where: { id } });

  if (!book) {
    throw new AppError(404, "Libro no encontrado");
  }

  if (input.genreId !== undefined) {
    await validateGenreId(input.genreId);
  }

  if (input.publisherId !== undefined) {
    await validatePublisherId(input.publisherId);
  }

  let availableCopies = book.availableCopies;
  if (input.totalCopies !== undefined) {
    if (input.totalCopies < 1) {
      throw new AppError(400, "Debe haber al menos un ejemplar");
    }

    const lentCopies = book.totalCopies - book.availableCopies;
    if (input.totalCopies < lentCopies) {
      throw new AppError(
        400,
        `No se puede reducir por debajo de los ${lentCopies} ejemplares prestados`,
      );
    }

    availableCopies = input.totalCopies - lentCopies;
  }

  if (input.authorIds !== undefined) {
    await syncBookAuthors(id, input.authorIds);
  }

  const updated = await prisma.book.update({
    where: { id },
    data: {
      isbn: input.isbn,
      title: input.title,
      publicationYear: input.publicationYear,
      publisherId: input.publisherId,
      genreId: input.genreId,
      totalCopies: input.totalCopies,
      availableCopies,
    },
    include: bookInclude,
  });

  return formatBook(updated);
}

export async function deleteBook(id: number) {
  const activeLoans = await prisma.loan.count({
    where: {
      bookId: id,
      status: { in: ["PENDING", "ACTIVE"] },
    },
  });

  if (activeLoans > 0) {
    throw new AppError(
      400,
      "No se puede eliminar un libro con préstamos pendientes o activos",
    );
  }

  await prisma.book.delete({ where: { id } });
}
