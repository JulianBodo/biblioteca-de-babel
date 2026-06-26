import "dotenv/config";
import { Role } from "../generated/prisma/client.js";
import { prisma } from "../src/database.js";
import { hashPassword } from "../src/utils/auth.js";

async function main() {
  await prisma.loan.deleteMany();
  await prisma.$executeRaw`UPDATE "Book" SET "availableCopies" = "totalCopies"`;

  const activeStatus = await prisma.readerStatus.upsert({
    where: { status: "ACTIVE" },
    update: {},
    create: { status: "ACTIVE" },
  });

  await prisma.readerStatus.upsert({
    where: { status: "SUSPENDED" },
    update: {},
    create: { status: "SUSPENDED" },
  });

  const inactiveStatus = await prisma.readerStatus.upsert({
    where: { status: "INACTIVE" },
    update: {},
    create: { status: "INACTIVE" },
  });

  const fiction = await prisma.genre.upsert({
    where: { name: "Ficción" },
    update: {},
    create: { name: "Ficción" },
  });

  await prisma.genre.upsert({
    where: { name: "Ensayo" },
    update: {},
    create: { name: "Ensayo" },
  });

  const publisher = await prisma.publisher.upsert({
    where: { name: "Editorial Babel" },
    update: {},
    create: { name: "Editorial Babel" },
  });

  const borges =
    (await prisma.author.findFirst({
      where: { firstName: "Jorge Luis", lastName: "Borges" },
    })) ??
    (await prisma.author.create({
      data: { firstName: "Jorge Luis", lastName: "Borges" },
    }));

  const bioy =
    (await prisma.author.findFirst({
      where: { firstName: "Adolfo", lastName: "Bioy Casares" },
    })) ??
    (await prisma.author.create({
      data: { firstName: "Adolfo", lastName: "Bioy Casares" },
    }));

  await prisma.book.upsert({
    where: { isbn: "978-987-1234-01-0" },
    update: {},
    create: {
      isbn: "978-987-1234-01-0",
      title: "El Aleph",
      publicationYear: 1949,
      genreId: fiction.id,
      publisherId: publisher.id,
      totalCopies: 3,
      availableCopies: 3,
      authors: {
        create: [{ authorId: borges.id }],
      },
    },
  });

  const antologiaExists = await prisma.book.findUnique({
    where: { isbn: "978-987-1234-02-7" },
  });

  if (!antologiaExists) {
    await prisma.book.create({
      data: {
        isbn: "978-987-1234-02-7",
        title: "Antología de la literatura fantástica",
        publicationYear: 1940,
        genreId: fiction.id,
        publisherId: publisher.id,
        totalCopies: 2,
        availableCopies: 2,
        authors: {
          create: [{ authorId: borges.id }, { authorId: bioy.id }],
        },
      },
    });
  }

  const adminHash = await hashPassword("admin123");
  await prisma.user.upsert({
    where: { email: "admin@babel.com" },
    update: {},
    create: {
      email: "admin@babel.com",
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  const librarianHash = await hashPassword("biblio123");
  await prisma.user.upsert({
    where: { email: "bibliotecario@babel.com" },
    update: {},
    create: {
      email: "bibliotecario@babel.com",
      passwordHash: librarianHash,
      role: Role.LIBRARIAN,
    },
  });

  const readerHash = await hashPassword("lector123");
  const reader = await prisma.reader.upsert({
    where: { email: "lector@babel.com" },
    update: {},
    create: {
      firstName: "María",
      lastName: "Lectora",
      email: "lector@babel.com",
      dni: "12345678",
      readerStatusId: activeStatus.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "lector@babel.com" },
    update: {},
    create: {
      email: "lector@babel.com",
      passwordHash: readerHash,
      role: Role.READER,
      readerId: reader.id,
    },
  });

  const inactiveReaderHash = await hashPassword("inactivo123");
  const inactiveReader = await prisma.reader.upsert({
    where: { email: "inactivo@babel.com" },
    update: {},
    create: {
      firstName: "Juan",
      lastName: "Inactivo",
      email: "inactivo@babel.com",
      dni: "87654321",
      readerStatusId: inactiveStatus.id,
      lastLoanAt: new Date("2020-01-15"),
    },
  });

  await prisma.user.upsert({
    where: { email: "inactivo@babel.com" },
    update: {},
    create: {
      email: "inactivo@babel.com",
      passwordHash: inactiveReaderHash,
      role: Role.READER,
      readerId: inactiveReader.id,
    },
  });

  console.log("Seed completado");
  console.log("Admin: admin@babel.com / admin123");
  console.log("Bibliotecario: bibliotecario@babel.com / biblio123");
  console.log("Lector activo: lector@babel.com / lector123");
  console.log("Lector inactivo: inactivo@babel.com / inactivo123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
