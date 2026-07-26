import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as authController from "./auth.controller.js";

const router = Router();

router.post("/login", asyncHandler(authController.login));
router.get("/me", authenticate, asyncHandler(authController.getProfile));
router.get(
  "/users",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(authController.listUsers),
);
router.post(
  "/users",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(authController.createUser),
);
router.delete(
  "/users/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(authController.deleteUser),
);

export default router;
