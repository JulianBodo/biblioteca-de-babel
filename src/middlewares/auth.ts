import type { NextFunction, Request, Response } from "express";
import { Role } from "../../generated/prisma/client.js";
import { AppError } from "../utils/errors.js";
import { AuthTokenPayload, verifyToken } from "../utils/auth.js";

declare global {
  namespace Express {
    interface Request {
      /** Payload del JWT decodificado; disponible tras authenticate(). */
      user?: AuthTokenPayload;
    }
  }
}

/** Exige header Authorization: Bearer <token> válido. */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "Token de autenticación requerido"));
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new AppError(401, "Token inválido o expirado"));
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, "No autenticado"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError(403, "No tenés permisos para esta acción"));
      return;
    }

    next();
  };
}
