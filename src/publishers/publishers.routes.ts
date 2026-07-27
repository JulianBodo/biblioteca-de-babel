import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import * as publishersService from "../publishers/publishers.service.js";
import { AppError } from "../utils/errors.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    res.json(await publishersService.listPublishers());
  }),
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const publisher = await publishersService.getPublisher(Number(req.params.id));
    res.json(publisher);
  }),
);

router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { name } = req.body as { name?: string };

    if (!name) {
      throw new AppError(400, "El nombre es obligatorio");
    }

    const publisher = await publishersService.createPublisher(name);
    res.status(201).json(publisher);
  }),
);

router.put(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { name } = req.body as { name?: string };

    if (!name) {
      throw new AppError(400, "El nombre es obligatorio");
    }

    const publisher = await publishersService.updatePublisher(
      Number(req.params.id),
      name,
    );
    res.json(publisher);
  }),
);

router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await publishersService.deletePublisher(Number(req.params.id));
    res.status(204).send();
  }),
);

export default router;
