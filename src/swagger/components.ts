import type { OpenAPIV3 } from "openapi-types";

export const securitySchemes: Record<string, OpenAPIV3.SecuritySchemeObject> = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description:
      "Token obtenido en `POST /api/auth/login`. Enviar como `Authorization: Bearer <token>`.",
  },
};

const errorSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["error"],
  properties: {
    error: { type: "string", example: "Descripción del error" },
  },
};

export const responses: Record<string, OpenAPIV3.ResponseObject> = {
  BadRequest: {
    description: "Solicitud inválida",
    content: { "application/json": { schema: errorSchema } },
  },
  Unauthorized: {
    description: "No autenticado o token inválido",
    content: {
      "application/json": {
        schema: errorSchema,
        example: { error: "Token de autenticación requerido" },
      },
    },
  },
  Forbidden: {
    description: "Sin permisos para la acción",
    content: {
      "application/json": {
        schema: errorSchema,
        example: { error: "No tenés permisos para esta acción" },
      },
    },
  },
  NotFound: {
    description: "Recurso no encontrado",
    content: {
      "application/json": {
        schema: errorSchema,
        example: { error: "Recurso no encontrado" },
      },
    },
  },
  Conflict: {
    description: "Conflicto de negocio (duplicado, sin stock, etc.)",
    content: { "application/json": { schema: errorSchema } },
  },
  NoContent: { description: "Operación exitosa sin cuerpo de respuesta" },
};

export const parameters: Record<string, OpenAPIV3.ParameterObject> = {
  idPath: {
    name: "id",
    in: "path",
    required: true,
    schema: { type: "integer", minimum: 1 },
    description: "Identificador numérico del recurso",
  },
  readerIdQuery: {
    name: "readerId",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1 },
    description:
      "Filtrar por lector. Solo staff (ADMIN/LIBRARIAN). Los lectores no pueden usar este filtro.",
  },
  statusQuery: {
    name: "status",
    in: "query",
    required: false,
    schema: {
      type: "string",
      enum: ["ACTIVE", "SUSPENDED", "INACTIVE"],
    },
    description: "Filtrar lectores por código de estado",
  },
  availableQuery: {
    name: "available",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["true"] },
    description:
      "Si es `true`, solo libros con ejemplares disponibles (útil para admin/staff)",
  },
  fromQuery: {
    name: "from",
    in: "query",
    required: false,
    schema: { type: "string", format: "date", example: "2026-01-01" },
    description: "Fecha inicial inclusive (ISO 8601, solo fecha)",
  },
  toQuery: {
    name: "to",
    in: "query",
    required: false,
    schema: { type: "string", format: "date", example: "2026-12-31" },
    description: "Fecha final inclusive (ISO 8601, solo fecha)",
  },
  lateOnlyQuery: {
    name: "lateOnly",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["true"] },
    description:
      "Si es `true`, solo devoluciones fuera de plazo (`wasLate: true`)",
  },
};

export const schemas: Record<string, OpenAPIV3.SchemaObject> = {
  Role: {
    type: "string",
    enum: ["ADMIN", "LIBRARIAN", "READER"],
    description: "Rol del usuario en el sistema",
  },
  LoanStatus: {
    type: "string",
    enum: ["PENDING", "ACTIVE", "RETURNED", "REJECTED"],
    description: "Estado del préstamo",
  },
  ReaderStatusCode: {
    type: "string",
    enum: ["ACTIVE", "SUSPENDED", "INACTIVE"],
    description: "Estado operativo del lector",
  },
  HealthResponse: {
    type: "object",
    required: ["status"],
    properties: { status: { type: "string", example: "ok" } },
  },
  Error: {
    type: "object",
    required: ["error"],
    properties: {
      error: { type: "string", example: "Descripción del error" },
    },
  },
  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email", example: "lector@babel.com" },
      password: { type: "string", format: "password", example: "lector123" },
    },
  },
  LoginResponse: {
    type: "object",
    required: ["token", "user"],
    properties: {
      token: {
        type: "string",
        description: "JWT para autenticación Bearer",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      },
      user: { $ref: "#/components/schemas/AuthUser" },
    },
  },
  ReaderStatus: {
    type: "object",
    required: ["id", "status"],
    properties: {
      id: { type: "integer", example: 1 },
      status: { $ref: "#/components/schemas/ReaderStatusCode" },
    },
  },
  ReaderSummary: {
    type: "object",
    required: [
      "id",
      "firstName",
      "lastName",
      "email",
      "dni",
      "readerStatusId",
      "readerStatus",
    ],
    properties: {
      id: { type: "integer", example: 3 },
      firstName: { type: "string", example: "Juan" },
      lastName: { type: "string", example: "Lector" },
      email: { type: "string", format: "email", example: "lector@babel.com" },
      dni: { type: "string", example: "30123456" },
      readerStatusId: { type: "integer", example: 1 },
      lastLoanAt: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      readerStatus: { $ref: "#/components/schemas/ReaderStatus" },
    },
  },
  AuthUser: {
    type: "object",
    required: ["id", "email", "role", "readerId"],
    properties: {
      id: { type: "integer", example: 4 },
      email: { type: "string", format: "email", example: "lector@babel.com" },
      role: { $ref: "#/components/schemas/Role" },
      readerId: {
        type: "integer",
        nullable: true,
        description: "ID del lector vinculado (null para admin/bibliotecario)",
        example: 3,
      },
      reader: {
        allOf: [{ $ref: "#/components/schemas/ReaderSummary" }],
        nullable: true,
      },
    },
  },
  CreateUserRequest: {
    type: "object",
    required: ["email", "password", "role"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", format: "password", minLength: 6 },
      role: { $ref: "#/components/schemas/Role" },
      firstName: {
        type: "string",
        description: "Obligatorio si role es READER",
      },
      lastName: {
        type: "string",
        description: "Obligatorio si role es READER",
      },
      dni: {
        type: "string",
        description: "Obligatorio si role es READER",
      },
    },
  },
  Author: {
    type: "object",
    required: ["id", "firstName", "lastName", "createdAt", "updatedAt"],
    properties: {
      id: { type: "integer" },
      firstName: { type: "string" },
      lastName: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      _count: {
        type: "object",
        properties: { books: { type: "integer" } },
      },
    },
  },
  AuthorDetail: {
    allOf: [
      { $ref: "#/components/schemas/Author" },
      {
        type: "object",
        properties: {
          books: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                title: { type: "string" },
                isbn: { type: "string" },
              },
            },
          },
        },
      },
    ],
  },
  CreateAuthorRequest: {
    type: "object",
    required: ["firstName", "lastName"],
    properties: {
      firstName: { type: "string", example: "Jorge" },
      lastName: { type: "string", example: "Luis Borges" },
    },
  },
  UpdateAuthorRequest: {
    type: "object",
    properties: {
      firstName: { type: "string" },
      lastName: { type: "string" },
    },
  },
  Publisher: {
    type: "object",
    required: ["id", "name", "createdAt", "updatedAt"],
    properties: {
      id: { type: "integer" },
      name: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      _count: {
        type: "object",
        properties: { books: { type: "integer" } },
      },
    },
  },
  PublisherDetail: {
    allOf: [
      { $ref: "#/components/schemas/Publisher" },
      {
        type: "object",
        properties: {
          books: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                title: { type: "string" },
                isbn: { type: "string" },
              },
            },
          },
        },
      },
    ],
  },
  Genre: {
    type: "object",
    required: ["id", "name", "createdAt", "updatedAt"],
    properties: {
      id: { type: "integer" },
      name: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      _count: {
        type: "object",
        properties: { books: { type: "integer" } },
      },
    },
  },
  GenreDetail: {
    allOf: [
      { $ref: "#/components/schemas/Genre" },
      {
        type: "object",
        properties: {
          books: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                title: { type: "string" },
                isbn: { type: "string" },
              },
            },
          },
        },
      },
    ],
  },
  NameRequest: {
    type: "object",
    required: ["name"],
    properties: { name: { type: "string", example: "Sudamericana" } },
  },
  Book: {
    type: "object",
    required: [
      "id",
      "isbn",
      "title",
      "publicationYear",
      "genreId",
      "publisherId",
      "totalCopies",
      "availableCopies",
      "authors",
      "genre",
      "publisher",
    ],
    properties: {
      id: { type: "integer", example: 1 },
      isbn: { type: "string", example: "978-3-16-148410-0" },
      title: { type: "string", example: "Ficciones" },
      publicationYear: { type: "integer", example: 1944 },
      genreId: { type: "integer" },
      publisherId: { type: "integer" },
      totalCopies: { type: "integer", example: 3 },
      availableCopies: { type: "integer", example: 2 },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      authors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            firstName: { type: "string" },
            lastName: { type: "string" },
          },
        },
      },
      genre: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
        },
      },
      publisher: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
        },
      },
    },
  },
  CreateBookRequest: {
    type: "object",
    required: [
      "isbn",
      "title",
      "publicationYear",
      "authorIds",
      "publisherId",
      "genreId",
    ],
    properties: {
      isbn: { type: "string", example: "978-84-376-0494-7" },
      title: { type: "string", example: "El Aleph" },
      publicationYear: { type: "integer", example: 1949 },
      authorIds: {
        type: "array",
        items: { type: "integer" },
        minItems: 1,
        example: [1],
      },
      publisherId: { type: "integer", example: 1 },
      genreId: { type: "integer", example: 1 },
      totalCopies: {
        type: "integer",
        minimum: 1,
        default: 1,
        description: "Cantidad total de ejemplares",
      },
    },
  },
  UpdateBookRequest: {
    type: "object",
    properties: {
      isbn: { type: "string" },
      title: { type: "string" },
      publicationYear: { type: "integer" },
      authorIds: { type: "array", items: { type: "integer" }, minItems: 1 },
      publisherId: { type: "integer" },
      genreId: { type: "integer" },
      totalCopies: {
        type: "integer",
        minimum: 1,
        description:
          "No puede ser menor que los ejemplares actualmente prestados",
      },
    },
  },
  ReaderDetail: {
    allOf: [
      { $ref: "#/components/schemas/ReaderSummary" },
      {
        type: "object",
        properties: {
          user: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "integer" },
              email: { type: "string" },
              role: { $ref: "#/components/schemas/Role" },
            },
          },
        },
      },
    ],
  },
  UpdateReaderRequest: {
    type: "object",
    properties: {
      firstName: { type: "string" },
      lastName: { type: "string" },
      email: { type: "string", format: "email" },
      dni: { type: "string" },
      readerStatusId: { type: "integer" },
    },
  },

  CreateReaderRequest: {
    type: "object",
    required: ["firstName", "lastName", "email", "dni"],
    properties: {
      firstName: { type: "string", example: "Juan" },
      lastName: { type: "string", example: "Lector" },
      email: {
        type: "string",
        format: "email",
        example: "juan.lector@babel.com",
      },
      dni: { type: "string", example: "30123456" },
      readerStatusId: {
        type: "integer",
        description: "Opcional. Si no se envía, el lector arranca en ACTIVE.",
        example: 1,
      },
    },
  },

  SyncInactivityResponse: {
    type: "object",
    required: ["updated", "readerIds"],
    properties: {
      updated: {
        type: "integer",
        description: "Cantidad de lectores marcados como INACTIVE",
      },
      readerIds: {
        type: "array",
        items: { type: "integer" },
      },
    },
  },
  LoanReader: {
    type: "object",
    required: ["id", "email", "firstName", "lastName", "readerStatus"],
    properties: {
      id: { type: "integer" },
      email: { type: "string" },
      firstName: { type: "string" },
      lastName: { type: "string" },
      readerStatus: { $ref: "#/components/schemas/ReaderStatus" },
    },
  },
  Loan: {
    type: "object",
    required: ["id", "readerId", "bookId", "status", "reader", "book"],
    properties: {
      id: { type: "integer", example: 10 },
      readerId: { type: "integer" },
      bookId: { type: "integer" },
      status: { $ref: "#/components/schemas/LoanStatus" },
      loanDate: { type: "string", format: "date-time", nullable: true },
      dueDate: { type: "string", format: "date-time", nullable: true },
      returnDate: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      reader: { $ref: "#/components/schemas/LoanReader" },
      book: { $ref: "#/components/schemas/Book" },
      daysOnLoan: {
        type: "integer",
        nullable: true,
        description: "Presente en préstamos ACTIVE",
      },
      isOverdue: {
        type: "boolean",
        description: "Presente en préstamos ACTIVE",
      },
      daysOverdue: {
        type: "integer",
        description: "Días de mora (0 si está al día)",
      },
      overdueNotice: {
        type: "string",
        nullable: true,
        description: "Mensaje de aviso si el préstamo está vencido",
      },
      wasLate: {
        type: "boolean",
        description: "Presente en préstamos RETURNED",
      },
    },
  },
  CreateLoanRequest: {
    type: "object",
    required: ["bookId"],
    properties: {
      bookId: { type: "integer", example: 1 },
      readerId: {
        type: "integer",
        description:
          "Obligatorio para ADMIN/LIBRARIAN. Ignorado para READER (usa su propio readerId).",
        example: 3,
      },
    },
  },
  UpdateLoanRequest: {
    type: "object",
    required: ["dueDate"],
    properties: {
      dueDate: {
        type: "string",
        format: "date-time",
        description: "Nueva fecha de vencimiento (solo préstamos ACTIVE)",
      },
    },
  },
};
