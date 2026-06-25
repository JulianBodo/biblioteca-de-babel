import { prisma } from "../database.js";
import { AppError } from "../utils/errors.js";

export async function listPublishers() {
  return prisma.publisher.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { books: true } },
    },
  });
}

export async function getPublisher(id: number) {
  const publisher = await prisma.publisher.findUnique({
    where: { id },
    include: {
      books: {
        select: { id: true, title: true, isbn: true },
        orderBy: { title: "asc" },
      },
    },
  });

  if (!publisher) {
    throw new AppError(404, "Editorial no encontrada");
  }

  return publisher;
}

export async function createPublisher(name: string) {
  return prisma.publisher.create({ data: { name } });
}

export async function updatePublisher(id: number, name: string) {
  await ensurePublisher(id);
  return prisma.publisher.update({ where: { id }, data: { name } });
}

export async function deletePublisher(id: number) {
  await ensurePublisher(id);

  const linkedBooks = await prisma.book.count({
    where: { publisherId: id },
  });

  if (linkedBooks > 0) {
    throw new AppError(
      400,
      "No se puede eliminar una editorial con libros asociados",
    );
  }

  await prisma.publisher.delete({ where: { id } });
}

async function ensurePublisher(id: number) {
  const publisher = await prisma.publisher.findUnique({ where: { id } });
  if (!publisher) {
    throw new AppError(404, "Editorial no encontrada");
  }
}
