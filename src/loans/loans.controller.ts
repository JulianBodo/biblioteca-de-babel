import { Request, Response } from "express";
import { Role } from "../../generated/prisma/client.js";
import * as loansService from "./loans.service.js";
import { AppError } from "../utils/errors.js";

//parse loan Id
function parseLoanId(rawId: string | string[]): number {
  const normalizedId = Array.isArray(rawId) ? rawId[0] : rawId;
  const loanId = Number(normalizedId);

  if (normalizedId === undefined || Number.isNaN(loanId)) {
    throw new AppError(404, "Préstamo no encontrado");
  }

  return loanId;
}

// get loans
export async function listLoans(req: Request, res: Response) {
  const loans = await loansService.listLoans(
    req.user!.role,
    req.user!.readerId,
  );

  res.json(loans);
}

//pending loans
export async function listPendingLoans(_req: Request, res: Response) {
  res.json(await loansService.listPendingLoans());
}

//list returns
export async function listReturns(req: Request, res: Response) {
  if (req.user!.role === Role.READER && req.query.readerId !== undefined) {
    throw new AppError(403, "No tenés permisos para filtrar por lector");
  }

  const readerId =
    req.query.readerId !== undefined ? Number(req.query.readerId) : undefined;

  if (req.query.readerId !== undefined && Number.isNaN(readerId)) {
    throw new AppError(400, "readerId inválido");
  }

  const returns = await loansService.listReturns(
    req.user!.role,
    req.user!.readerId,
    {
      readerId,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      lateOnly: req.query.lateOnly === "true",
    },
  );

  res.json(returns);
}

//list aviable for loan
export async function listAvailableForLoan(req: Request, res: Response) {
  if (req.user!.role === Role.READER && req.query.readerId !== undefined) {
    throw new AppError(403, "No tenés permisos para filtrar por lector");
  }

  const readerId =
    req.query.readerId !== undefined ? Number(req.query.readerId) : undefined;

  if (req.query.readerId !== undefined && Number.isNaN(readerId)) {
    throw new AppError(400, "readerId inválido");
  }

  const books = await loansService.listAvailableForLoan(
    req.user!.role,
    req.user!.readerId,
    readerId,
  );

  res.json(books);
}

//list overdue loans
export async function listOverdueLoans(req: Request, res: Response) {
  if (req.user!.role === Role.READER && req.query.readerId !== undefined) {
    throw new AppError(403, "No tenés permisos para filtrar por lector");
  }

  const readerId =
    req.query.readerId !== undefined ? Number(req.query.readerId) : undefined;

  if (req.query.readerId !== undefined && Number.isNaN(readerId)) {
    throw new AppError(400, "readerId inválido");
  }

  const loans = await loansService.listOverdueLoans(
    req.user!.role,
    req.user!.readerId,
    readerId,
  );

  res.json(loans);
}

//get loan
export async function getLoan(req: Request, res: Response) {
  const loan = await loansService.getLoan(
    parseLoanId(req.params.id),
    req.user!.role,
    req.user!.readerId,
  );
  res.json(loan);
}

//create loan
export async function createLoan(req: Request, res: Response) {
  const { bookId, readerId: bodyReaderId } = req.body;

  if (bookId === undefined) {
    throw new AppError(400, "bookId es obligatorio");
  }

  const role = req.user!.role;
  let readerId: number;

  if (role === Role.READER) {
    if (!req.user!.readerId) {
      throw new AppError(400, "Tu usuario no está vinculado a un lector");
    }

    readerId = req.user!.readerId;
  } else if (role === Role.ADMIN || role === Role.LIBRARIAN) {
    if (bodyReaderId === undefined) {
      throw new AppError(400, "readerId es obligatorio");
    }

    readerId = bodyReaderId;
  } else {
    throw new AppError(403, "No tenés permisos para esta acción");
  }

  const loan = await loansService.createLoan(readerId, bookId);

  res.status(201).json(loan);
}

//update loan
export async function updateLoan(req: Request, res: Response) {
  const { dueDate } = req.body;

  const loan = await loansService.updateLoan(parseLoanId(req.params.id), {
    dueDate,
  });

  res.json(loan);
}

//delete loan
export async function deleteLoan(req: Request, res: Response) {
  await loansService.deleteLoan(parseLoanId(req.params.id), req.user!.role);

  res.status(204).send();
}

//approve loan
export async function approveLoan(req: Request, res: Response) {
  const loan = await loansService.approveLoan(parseLoanId(req.params.id));

  res.json(loan);
}

//reject loan
export async function rejectLoan(req: Request, res: Response) {
  const loan = await loansService.rejectLoan(parseLoanId(req.params.id));

  res.json(loan);
}

//return loan
export async function returnLoan(req: Request, res: Response) {
  const loan = await loansService.returnLoan(parseLoanId(req.params.id));

  res.json(loan);
}
