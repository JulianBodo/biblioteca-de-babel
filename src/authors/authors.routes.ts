import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as authorsController from "./authors.controller.js";

const router = Router();

router.get("/", authenticate, asyncHandler(authorsController.listAuthors));
router.get("/:id", authenticate, asyncHandler(authorsController.getAuthor));
router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(authorsController.createAuthor),
);
router.put(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(authorsController.updateAuthor),
);
router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(authorsController.deleteAuthor),
);

export default router;
