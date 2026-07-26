import { Request, Response } from "express";
import * as genresService from "./genres.service.js";
import { AppError } from "../utils/errors.js";

//list all genres
export async function listGenres(_req: Request, res: Response) {
  const genres = await genresService.listGenres();

  res.json(genres);
}

//get genre by id
export async function getGenre(req: Request, res: Response) {
  const genre = await genresService.getGenre(Number(req.params.id));

  res.json(genre);
}

//create genre
export async function createGenre(req: Request, res: Response) {
  const { name } = req.body;

  if (!name) {
    throw new AppError(400, "El nombre es obligatorio");
  }

  const genre = await genresService.createGenre(name);
  res.status(201).json(genre);
}

//update genre
export async function updateGenre(req: Request, res: Response) {
  const { name } = req.body;

  if (!name) {
    throw new AppError(400, "El nombre es obligatorio");
  }

  const genre = await genresService.updateGenre(Number(req.params.id), name);
  res.json(genre);
}

//delete genre
export async function deleteGenre(req: Request, res: Response) {
  await genresService.deleteGenre(Number(req.params.id));
  res.status(204).send();
}
