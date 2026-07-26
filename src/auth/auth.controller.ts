import { Request, Response } from "express";
import { Role } from "../../generated/prisma/client.js";
import * as authService from "./auth.service.js";
import { AppError } from "../utils/errors.js";

//login
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(400, "Email y contraseña son obligatorios");
  }

  const result = await authService.login(email, password);

  res.json(result);
}

//profile
export async function getProfile(req: Request, res: Response) {
  const profile = await authService.getProfile(req.user!.userId);

  res.json(profile);
}

//list users
export async function listUsers(req: Request, res: Response) {
  const users = await authService.listUsers();

  res.json(users);
}

//create user
export async function createUser(req: Request, res: Response) {
  const { email, password, role, firstName, lastName, dni } = req.body;

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
}

//delete user
export async function deleteUser(req: Request, res: Response) {
  await authService.deleteUser(Number(req.params.id));

  res.status(204).send();
}
