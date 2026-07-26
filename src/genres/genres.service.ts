import { prisma } from "../database.js";
import { AppError } from "../utils/errors.js";

export async function listGenres() {
  return prisma.genre.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { books: true } },
    },
  });
}

export async function getGenre(id: number) {
  const genre = await prisma.genre.findUnique({
    where: { id },
    include: {
      books: {
        select: { id: true, title: true, isbn: true },
        orderBy: { title: "asc" },
      },
    },
  });

  if (!genre) {
    throw new AppError(404, "Género no encontrado");
  }

  return genre;
}

export async function createGenre(name: string) {
  return prisma.genre.create({ data: { name } });
}

export async function updateGenre(id: number, name: string) {
  await ensureGenre(id);
  return prisma.genre.update({ where: { id }, data: { name } });
}

export async function deleteGenre(id: number) {
  await ensureGenre(id);

  const linkedBooks = await prisma.book.count({ where: { genreId: id } });
  if (linkedBooks > 0) {
    throw new AppError(400, "No se puede eliminar un género con libros asociados");
  }

  await prisma.genre.delete({ where: { id } });
}

async function ensureGenre(id: number) {
  const genre = await prisma.genre.findUnique({ where: { id } });
  if (!genre) {
    throw new AppError(404, "Género no encontrado");
  }
}
