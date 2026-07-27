import { Router } from "express";
import authRoutes from "../auth/auth.routes.js";
import booksRoutes from "../books/books.routes.js";
import authorsRoutes from "../authors/authors.routes.js";
import publishersRoutes from "../publishers/publishers.routes.js";
import genresRoutes from "../genres/genres.routes.js";
import readersRoutes from "../readers/readers.routes.js";
import loansRoutes from "../loans/loans.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Montaje por dominio; el prefijo /api lo agrega app.ts
router.use("/auth", authRoutes);
router.use("/books", booksRoutes);
router.use("/authors", authorsRoutes);
router.use("/publishers", publishersRoutes);
router.use("/genres", genresRoutes);
router.use("/readers", readersRoutes);
router.use("/loans", loansRoutes);

export default router;
