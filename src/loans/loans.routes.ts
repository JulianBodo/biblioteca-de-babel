import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as loansController from "./loans.controller.js";

const router = Router();

router.get("/", authenticate, asyncHandler(loansController.listLoans));

router.get(
  "/pending",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(loansController.listPendingLoans),
);

router.get("/returns", authenticate, asyncHandler(loansController.listReturns));

router.get(
  "/available",
  authenticate,
  asyncHandler(loansController.listAvailableForLoan),
);

router.get(
  "/overdue",
  authenticate,
  asyncHandler(loansController.listOverdueLoans),
);

router.get("/:id", authenticate, asyncHandler(loansController.getLoan));

router.post("/", authenticate, asyncHandler(loansController.createLoan));

router.put(
  "/:id",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(loansController.updateLoan),
);

router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(loansController.deleteLoan),
);

router.patch(
  "/:id/approve",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(loansController.approveLoan),
);

router.patch(
  "/:id/reject",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(loansController.rejectLoan),
);

router.patch(
  "/:id/return",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(loansController.returnLoan),
);

export default router;
