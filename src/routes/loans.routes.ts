import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as loansService from "../services/loans.service.js";
import { AppError } from "../utils/errors.js";

const router = Router();

function parseLoanId(rawId: string): number {
  const loanId = Number(rawId);
  if (Number.isNaN(loanId)) {
    throw new AppError(404, "Préstamo no encontrado");
  }
  return loanId;
}

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const loans = await loansService.listLoans(
      req.user!.role,
      req.user!.readerId,
    );
    res.json(loans);
  }),
);

// Rutas fijas antes de /:id para que "pending" no se interprete como id
router.get(
  "/pending",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(async (_req, res) => {
    res.json(await loansService.listPendingLoans());
  }),
);

router.get(
  "/returns",
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user!.role === Role.READER && req.query.readerId !== undefined) {
      throw new AppError(403, "No tenés permisos para filtrar por lector");
    }

    const readerIdParam =
      req.query.readerId !== undefined
        ? Number(req.query.readerId)
        : undefined;

    if (
      req.query.readerId !== undefined &&
      Number.isNaN(readerIdParam as number)
    ) {
      throw new AppError(400, "readerId inválido");
    }

    res.json(
      await loansService.listReturns(req.user!.role, req.user!.readerId, {
        readerId: readerIdParam,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        lateOnly: req.query.lateOnly === "true",
      }),
    );
  }),
);

router.get(
  "/available",
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user!.role === Role.READER && req.query.readerId !== undefined) {
      throw new AppError(403, "No tenés permisos para filtrar por lector");
    }

    const readerIdParam =
      req.query.readerId !== undefined
        ? Number(req.query.readerId)
        : undefined;

    if (
      req.query.readerId !== undefined &&
      Number.isNaN(readerIdParam as number)
    ) {
      throw new AppError(400, "readerId inválido");
    }

    res.json(
      await loansService.listAvailableForLoan(
        req.user!.role,
        req.user!.readerId,
        readerIdParam,
      ),
    );
  }),
);

router.get(
  "/overdue",
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user!.role === Role.READER && req.query.readerId !== undefined) {
      throw new AppError(403, "No tenés permisos para filtrar por lector");
    }

    const readerIdParam =
      req.query.readerId !== undefined
        ? Number(req.query.readerId)
        : undefined;

    if (
      req.query.readerId !== undefined &&
      Number.isNaN(readerIdParam as number)
    ) {
      throw new AppError(400, "readerId inválido");
    }

    res.json(
      await loansService.listOverdueLoans(
        req.user!.role,
        req.user!.readerId,
        readerIdParam,
      ),
    );
  }),
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const loan = await loansService.getLoan(
      parseLoanId(req.params.id),
      req.user!.role,
      req.user!.readerId,
    );
    res.json(loan);
  }),
);

router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { bookId, readerId: bodyReaderId } = req.body as {
      bookId?: number;
      readerId?: number;
    };

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
  }),
);

router.put(
  "/:id",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(async (req, res) => {
    const { dueDate } = req.body as { dueDate?: string };
    const loan = await loansService.updateLoan(parseLoanId(req.params.id), {
      dueDate,
    });
    res.json(loan);
  }),
);

router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(async (req, res) => {
    await loansService.deleteLoan(parseLoanId(req.params.id), req.user!.role);
    res.status(204).send();
  }),
);

router.patch(
  "/:id/approve",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(async (req, res) => {
    const loan = await loansService.approveLoan(parseLoanId(req.params.id));
    res.json(loan);
  }),
);

router.patch(
  "/:id/reject",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(async (req, res) => {
    const loan = await loansService.rejectLoan(parseLoanId(req.params.id));
    res.json(loan);
  }),
);

router.patch(
  "/:id/return",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(async (req, res) => {
    const loan = await loansService.returnLoan(parseLoanId(req.params.id));
    res.json(loan);
  }),
);

export default router;
