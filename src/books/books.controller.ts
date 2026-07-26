import { Request, Response } from "express";
import { Role } from "../../generated/prisma/client.js";
import * as booksService from "./books.service.js";
import { AppError } from "../utils/errors.js";

//list all books
export async function listBooks(req: Request, res: Response) {
  const availableOnly =
    req.user!.role === Role.READER || req.query.available === "true";

  const books = await booksService.listBooks(availableOnly);

  res.json(books);
}

//get book by id
export async function getBook(req: Request, res: Response) {
  const book = await booksService.getBook(Number(req.params.id));

  res.json(book);
}

//create book
export async function createBook(req: Request, res: Response) {
  const {
    isbn,
    title,
    publicationYear,
    authorIds,
    publisherId,
    genreId,
    totalCopies,
  } = req.body;

  if (
    !isbn ||
    !title ||
    publicationYear === undefined ||
    !authorIds?.length ||
    publisherId === undefined ||
    genreId === undefined
  ) {
    throw new AppError(
      400,
      "ISBN, título, año, authorIds, publisherId y genreId son obligatorios",
    );
  }

  const book = await booksService.createBook({
    isbn,
    title,
    publicationYear,
    authorIds,
    publisherId,
    genreId,
    totalCopies,
  });

  res.status(201).json(book);
}

//update book
export async function updateBook(req: Request, res: Response) {
  const book = await booksService.updateBook(Number(req.params.id), req.body);

  res.json(book);
}

//delete book
export async function deleteBook(req: Request, res: Response) {
  await booksService.deleteBook(Number(req.params.id));

  res.status(204).send();
}
