import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as authorsService from "../services/authors.service.js";
import { AppError } from "../utils/errors.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    res.json(await authorsService.listAuthors());
  }),
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const author = await authorsService.getAuthor(Number(req.params.id));
    res.json(author);
  }),
);

router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { firstName, lastName } = req.body as {
      firstName?: string;
      lastName?: string;
    };

    if (!firstName || !lastName) {
      throw new AppError(400, "Nombre y apellido son obligatorios");
    }

    const author = await authorsService.createAuthor(firstName, lastName);
    res.status(201).json(author);
  }),
);

router.put(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const author = await authorsService.updateAuthor(Number(req.params.id), req.body);
    res.json(author);
  }),
);

router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await authorsService.deleteAuthor(Number(req.params.id));
    res.status(204).send();
  }),
);

export default router;
