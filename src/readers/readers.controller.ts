import { Request, Response } from "express";
import * as readersService from "./readers.service.js";

// Listar estados de lectores
export async function listReaderStatuses(_req: Request, res: Response) {
  const statuses = await readersService.listReaderStatuses();

  res.json(statuses);
}

// Sincronizar lectores inactivos
export async function syncInactiveReaders(_req: Request, res: Response) {
  const result = await readersService.syncInactiveReaders();

  res.json(result);
}

// Listar todos los lectores
export async function listReaders(req: Request, res: Response) {
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;

  const readers = await readersService.listReaders(status);

  res.json(readers);
}

// Obtener un lector por ID
export async function getReader(req: Request, res: Response) {
  const reader = await readersService.getReader(Number(req.params.id));

  res.json(reader);
}

// Actualizar un lector
export async function updateReader(req: Request, res: Response) {
  const reader = await readersService.updateReader(
    Number(req.params.id),
    req.body,
  );

  res.json(reader);
}

// Reactivar lector
export async function reactivateReader(req: Request, res: Response) {
  const reader = await readersService.reactivateReader(Number(req.params.id));

  res.json(reader);
}

// Suspender lector
export async function suspendReader(req: Request, res: Response) {
  const reader = await readersService.suspendReader(Number(req.params.id));

  res.json(reader);
}

// Eliminar lector
export async function deleteReader(req: Request, res: Response) {
  await readersService.deleteReader(Number(req.params.id));

  res.status(204).send();
}

// Crear un lector
export async function createReader(req: Request, res: Response) {
  const reader = await readersService.createReader(req.body);

  res.status(201).json(reader);
}
