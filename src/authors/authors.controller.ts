import { Request, Response } from "express";
import * as authorsService from "./authors.service.js";
import { AppError } from "../utils/errors.js";

//authors list
export async function listAuthors(_req: Request, res: Response) {
  const authors = await authorsService.listAuthors();

  res.json(authors);
}

//get author by id
export async function getAuthor(req: Request, res: Response) {
  const author = await authorsService.getAuthor(Number(req.params.id));

  res.json(author);
}

//create author
export async function createAuthor(req: Request, res: Response) {
  const { firstName, lastName } = req.body;

  if (!firstName || !lastName) {
    throw new AppError(400, "Nombre y apellido son obligatorios");
  }

  const author = await authorsService.createAuthor(firstName, lastName);
  res.status(201).json(author);
}

//update author
export async function updateAuthor(req: Request, res: Response) {
  const author = await authorsService.updateAuthor(
    Number(req.params.id),
    req.body,
  );

  res.json(author);
}

//delete author
export async function deleteAuthor(req: Request, res: Response) {
  await authorsService.deleteAuthor(Number(req.params.id));

  res.status(204).send();
}
