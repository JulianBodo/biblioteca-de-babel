import { Role } from "../../generated/prisma/client.ts";
import { prisma } from "../database.ts";
import { AppError } from "../utils/errors.ts";
import { hashPassword, signToken, verifyPassword } from "../utils/auth.ts";
import { getReaderStatusId, ReaderStatusCode } from "../utils/readerStatus.ts";

const userSelect = {
  id: true,
  email: true,
  role: true,
  readerId: true,
  reader: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      dni: true,
      lastLoanAt: true,
      readerStatus: true,
    },
  },
} as const;

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      reader: {
        include: { readerStatus: true },
      },
    },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError(401, "Credenciales inválidas");
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
    readerId: user.readerId ?? undefined,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      readerId: user.readerId,
      reader: user.reader,
    },
  };
}

export async function getProfile(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    throw new AppError(404, "Usuario no encontrado");
  }

  return user;
}

export async function createUser(input: {
  email: string;
  password: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  dni?: string;
}) {
  if (input.role === Role.READER) {
    if (!input.firstName || !input.lastName || !input.dni) {
      throw new AppError(400, "Los lectores requieren nombre, apellido y DNI");
    }

    const activeStatusId = await getReaderStatusId(ReaderStatusCode.ACTIVE);

    const passwordHash = await hashPassword(input.password);

    return prisma.$transaction(async (tx) => {
      const reader = await tx.reader.create({
        data: {
          firstName: input.firstName!,
          lastName: input.lastName!,
          email: input.email,
          dni: input.dni!,
          readerStatusId: activeStatusId,
        },
      });

      return tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: Role.READER,
          readerId: reader.id,
        },
        select: userSelect,
      });
    });
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: input.role,
    },
    select: userSelect,
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    select: userSelect,
    orderBy: { id: "asc" },
  });
}

export async function deleteUser(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, "Usuario no encontrado");
  }

  if (user.role === Role.ADMIN) {
    throw new AppError(400, "No se puede eliminar un administrador");
  }

  await prisma.user.delete({ where: { id: userId } });
}
