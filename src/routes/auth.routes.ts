import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as authService from "../services/auth.service.js";
import { AppError } from "../utils/errors.js";

const router = Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      throw new AppError(400, "Email y contraseña son obligatorios");
    }

    const result = await authService.login(email, password);
    res.json(result);
  }),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await authService.getProfile(req.user!.userId);
    res.json(profile);
  }),
);

router.get(
  "/users",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const users = await authService.listUsers();
    res.json(users);
  }),
);

router.post(
  "/users",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { email, password, role, firstName, lastName, dni } = req.body as {
      email?: string;
      password?: string;
      role?: Role;
      firstName?: string;
      lastName?: string;
      dni?: string;
    };

    if (!email || !password || !role) {
      throw new AppError(400, "Email, contraseña y rol son obligatorios");
    }

    if (!Object.values(Role).includes(role)) {
      throw new AppError(400, "Rol inválido");
    }

    const user = await authService.createUser({
      email,
      password,
      role,
      firstName,
      lastName,
      dni,
    });

    res.status(201).json(user);
  }),
);

router.delete(
  "/users/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await authService.deleteUser(Number(req.params.id));
    res.status(204).send();
  }),
);

export default router;
