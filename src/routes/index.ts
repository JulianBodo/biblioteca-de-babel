import { Router } from "express";
import authRoutes from "./auth.routes.js";
import booksRoutes from "./books.routes.js";
import authorsRoutes from "./authors.routes.js";
import publishersRoutes from "./publishers.routes.js";
import genresRoutes from "./genres.routes.js";
import readersRoutes from "./readers.routes.js";
import loansRoutes from "./loans.routes.js";

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
