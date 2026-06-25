import type { NextFunction, Request, Response } from "express";
import { AppError, isAppError, isPrismaKnownError } from "../utils/errors.js";

/** Último middleware: traduce AppError y errores Prisma a JSON con status HTTP. */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isAppError(error)) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (isPrismaKnownError(error)) {
    if (error.code === "P2002") {
      const target = error.meta?.target?.join(", ") ?? "campo";
      res.status(409).json({ error: `Ya existe un registro con ese ${target}` });
      return;
    }

    if (error.code === "P2025") {
      res.status(404).json({ error: "Registro no encontrado" });
      return;
    }
  }

  console.error(error);
  res.status(500).json({ error: "Error interno del servidor" });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Ruta no encontrada" });
}

export function asyncHandler<
  Params extends Record<string, string> = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends Record<string, unknown> = Record<string, unknown>,
>(
  handler: (
    req: Request<Params, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => Promise<void>,
) {
  return (
    req: Request<Params, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => {
    handler(req, res, next).catch(next);
  };
}
