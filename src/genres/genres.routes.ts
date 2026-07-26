import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as genresController from "./genres.controller.js";

const router = Router();

router.get("/", authenticate, asyncHandler(genresController.listGenres));
router.get("/:id", authenticate, asyncHandler(genresController.getGenre));
router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(genresController.createGenre),
);
router.put(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(genresController.updateGenre),
);
router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(genresController.deleteGenre),
);

export default router;
