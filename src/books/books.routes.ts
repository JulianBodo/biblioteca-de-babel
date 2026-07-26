import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as booksController from "./books.controller.js";

const router = Router();

router.get("/", authenticate, asyncHandler(booksController.listBooks));
router.get("/:id", authenticate, asyncHandler(booksController.getBook));
router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(booksController.createBook),
);
router.put(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(booksController.updateBook),
);
router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(booksController.deleteBook),
);

export default router;
