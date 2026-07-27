import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as readersService from "../readers/readers.service.js";

const router = Router();

router.get(
  "/statuses",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(async (_req, res) => {
    res.json(await readersService.listReaderStatuses());
  }),
);

router.post(
  "/sync-inactivity",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const result = await readersService.syncInactiveReaders();
    res.json(result);
  }),
);

router.get(
  "/",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(async (req, res) => {
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    res.json(await readersService.listReaders(status));
  }),
);

router.get(
  "/:id",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(async (req, res) => {
    const reader = await readersService.getReader(Number(req.params.id));
    res.json(reader);
  }),
);

router.put(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const reader = await readersService.updateReader(Number(req.params.id), req.body);
    res.json(reader);
  }),
);

router.patch(
  "/:id/reactivate",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(async (req, res) => {
    const reader = await readersService.reactivateReader(Number(req.params.id));
    res.json(reader);
  }),
);

router.patch(
  "/:id/suspend",
  authenticate,
  authorize(Role.ADMIN, Role.LIBRARIAN),
  asyncHandler(async (req, res) => {
    const reader = await readersService.suspendReader(Number(req.params.id));
    res.json(reader);
  }),
);

router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await readersService.deleteReader(Number(req.params.id));
    res.status(204).send();
  }),
);

export default router;
