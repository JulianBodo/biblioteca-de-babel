import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as booksService from "../services/books.service.js";
import { AppError } from "../utils/errors.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const availableOnly =
      req.user!.role === Role.READER || req.query.available === "true";

    const books = await booksService.listBooks(availableOnly);
    res.json(books);
  }),
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const book = await booksService.getBook(Number(req.params.id));
    res.json(book);
  }),
);

router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const {
      isbn,
      title,
      publicationYear,
      authorIds,
      publisherId,
      genreId,
      totalCopies,
    } = req.body as {
      isbn?: string;
      title?: string;
      publicationYear?: number;
      authorIds?: number[];
      publisherId?: number;
      genreId?: number;
      totalCopies?: number;
    };

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
  }),
);

router.put(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const book = await booksService.updateBook(Number(req.params.id), req.body);
    res.json(book);
  }),
);

router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await booksService.deleteBook(Number(req.params.id));
    res.status(204).send();
  }),
);

export default router;
