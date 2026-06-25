import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as genresService from "../services/genres.service.js";
import { AppError } from "../utils/errors.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    res.json(await genresService.listGenres());
  }),
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const genre = await genresService.getGenre(Number(req.params.id));
    res.json(genre);
  }),
);

router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { name } = req.body as { name?: string };

    if (!name) {
      throw new AppError(400, "El nombre es obligatorio");
    }

    const genre = await genresService.createGenre(name);
    res.status(201).json(genre);
  }),
);

router.put(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { name } = req.body as { name?: string };

    if (!name) {
      throw new AppError(400, "El nombre es obligatorio");
    }

    const genre = await genresService.updateGenre(Number(req.params.id), name);
    res.json(genre);
  }),
);

router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await genresService.deleteGenre(Number(req.params.id));
    res.status(204).send();
  }),
);

export default router;
