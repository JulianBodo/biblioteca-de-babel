import { prisma } from "../database.js";
import { AppError } from "../utils/errors.js";

export async function listAuthors() {
  return prisma.author.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      _count: { select: { books: true } },
    },
  });
}

export async function getAuthor(id: number) {
  const author = await prisma.author.findUnique({
    where: { id },
    include: {
      books: {
        include: {
          book: {
            select: { id: true, title: true, isbn: true },
          },
        },
      },
    },
  });

  if (!author) {
    throw new AppError(404, "Autor no encontrado");
  }

  return {
    ...author,
    books: author.books.map(({ book }) => book),
  };
}

export async function createAuthor(firstName: string, lastName: string) {
  return prisma.author.create({ data: { firstName, lastName } });
}

export async function updateAuthor(
  id: number,
  input: { firstName?: string; lastName?: string },
) {
  await ensureAuthor(id);
  return prisma.author.update({ where: { id }, data: input });
}

export async function deleteAuthor(id: number) {
  await ensureAuthor(id);

  const linkedBooks = await prisma.bookAuthor.count({
    where: { authorId: id },
  });

  if (linkedBooks > 0) {
    throw new AppError(400, "No se puede eliminar un autor con libros asociados");
  }

  await prisma.author.delete({ where: { id } });
}

async function ensureAuthor(id: number) {
  const author = await prisma.author.findUnique({ where: { id } });
  if (!author) {
    throw new AppError(404, "Autor no encontrado");
  }
}
