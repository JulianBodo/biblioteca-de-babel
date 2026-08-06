import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as readersController from "./readers.controller.js";

const router = Router();

router.get(
  "/statuses",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(readersController.listReaderStatuses),
);

router.post(
  "/sync-inactivity",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(readersController.syncInactiveReaders),
);

router.get(
  "/",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(readersController.listReaders),
);

router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(readersController.createReader),
);

router.get(
  "/:id",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(readersController.getReader),
);

router.put(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(readersController.updateReader),
);

router.patch(
  "/:id/reactivate",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(readersController.reactivateReader),
);

router.patch(
  "/:id/suspend",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(readersController.suspendReader),
);

router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(readersController.deleteReader),
);

export default router;
