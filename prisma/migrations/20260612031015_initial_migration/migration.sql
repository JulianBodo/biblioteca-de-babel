-- CreateEnum
CREATE TYPE "EstadoLibro" AS ENUM ('DISPONIBLE', 'PRESTADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "EstadoPrestamo" AS ENUM ('ACTIVO', 'DEVUELTO');

-- CreateTable
CREATE TABLE "Libro" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "isbn" TEXT NOT NULL,
    "genero" TEXT NOT NULL,
    "editorial" TEXT NOT NULL,
    "anioPublicacion" INTEGER NOT NULL,
    "cantidadEjemplares" INTEGER NOT NULL,
    "cantidadDisponibles" INTEGER NOT NULL,
    "estado" "EstadoLibro" NOT NULL DEFAULT 'DISPONIBLE',

    CONSTRAINT "Libro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lector" (
    "id" SERIAL NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Lector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prestamo" (
    "id" SERIAL NOT NULL,
    "libroId" INTEGER NOT NULL,
    "lectorId" INTEGER NOT NULL,
    "fechaPrestamo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaDevolucionEsperada" TIMESTAMP(3) NOT NULL,
    "fechaDevolucionReal" TIMESTAMP(3),
    "estado" "EstadoPrestamo" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "Prestamo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Libro_isbn_key" ON "Libro"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "Lector_dni_key" ON "Lector"("dni");

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_libroId_fkey" FOREIGN KEY ("libroId") REFERENCES "Libro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_lectorId_fkey" FOREIGN KEY ("lectorId") REFERENCES "Lector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
