import type { OpenAPIV3 } from "openapi-types";

const bearer401 = { $ref: "#/components/responses/Unauthorized" };
const forbidden403 = { $ref: "#/components/responses/Forbidden" };
const notFound404 = { $ref: "#/components/responses/NotFound" };
const badRequest400 = { $ref: "#/components/responses/BadRequest" };
const conflict409 = { $ref: "#/components/responses/Conflict" };

export const healthPaths: OpenAPIV3.PathsObject = {
  "/api/health": {
    get: {
      tags: ["Disponibilidad"],
      summary: "Health check",
      description: "Verifica que la API esté en ejecución. No requiere autenticación.",
      operationId: "getHealth",
      responses: {
        "200": {
          description: "Servicio operativo",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/HealthResponse" },
            },
          },
        },
      },
    },
  },
};

export const authPaths: OpenAPIV3.PathsObject = {
  "/api/auth/login": {
    post: {
      tags: ["Autenticación"],
      summary: "Iniciar sesión",
      description:
        "Autentica con email y contraseña. Devuelve un JWT válido por 24 h (configurable vía `JWT_SECRET`).",
      operationId: "login",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/LoginRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Login exitoso",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginResponse" },
            },
          },
        },
        "400": badRequest400,
        "401": {
          description: "Credenciales inválidas",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Credenciales inválidas" },
            },
          },
        },
      },
    },
  },
  "/api/auth/me": {
    get: {
      tags: ["Autenticación"],
      summary: "Perfil del usuario autenticado",
      operationId: "getMe",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Perfil del usuario",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthUser" },
            },
          },
        },
        "401": bearer401,
      },
    },
  },
  "/api/auth/users": {
    get: {
      tags: ["Autenticación"],
      summary: "Listar usuarios",
      description: "Solo **ADMIN**.",
      operationId: "listUsers",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Listado de usuarios",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/AuthUser" },
              },
            },
          },
        },
        "401": bearer401,
        "403": forbidden403,
      },
    },
    post: {
      tags: ["Autenticación"],
      summary: "Crear usuario",
      description:
        "Solo **ADMIN**. Si el rol es `READER`, se crea también el registro de lector con estado ACTIVE.",
      operationId: "createUser",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateUserRequest" },
          },
        },
      },
      responses: {
        "201": {
          description: "Usuario creado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthUser" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "409": {
          description: "Email o DNI duplicado",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
  },
  "/api/auth/users/{id}": {
    delete: {
      tags: ["Autenticación"],
      summary: "Eliminar usuario",
      description: "Solo **ADMIN**. No se puede eliminar un administrador.",
      operationId: "deleteUser",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "204": { $ref: "#/components/responses/NoContent" },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
  },
};

export const bookPaths: OpenAPIV3.PathsObject = {
  "/api/books": {
    get: {
      tags: ["Libros"],
      summary: "Listar libros",
      description:
        "Los **READER** ven solo libros con `availableCopies > 0`. Admin/bibliotecario ven el catálogo completo salvo que usen `?available=true`.",
      operationId: "listBooks",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/availableQuery" }],
      responses: {
        "200": {
          description: "Listado de libros",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/Book" },
              },
            },
          },
        },
        "401": bearer401,
      },
    },
    post: {
      tags: ["Libros"],
      summary: "Crear libro",
      description: "Solo **ADMIN**.",
      operationId: "createBook",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateBookRequest" },
          },
        },
      },
      responses: {
        "201": {
          description: "Libro creado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Book" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
        "409": {
          description: "ISBN duplicado",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
  },
  "/api/books/{id}": {
    get: {
      tags: ["Libros"],
      summary: "Obtener libro por ID",
      operationId: "getBook",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "200": {
          description: "Detalle del libro",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Book" },
            },
          },
        },
        "401": bearer401,
        "404": notFound404,
      },
    },
    put: {
      tags: ["Libros"],
      summary: "Actualizar libro",
      description: "Solo **ADMIN**. Todos los campos del body son opcionales.",
      operationId: "updateBook",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateBookRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Libro actualizado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Book" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
        "409": conflict409,
      },
    },
    delete: {
      tags: ["Libros"],
      summary: "Eliminar libro",
      description:
        "Solo **ADMIN**. Falla si hay préstamos PENDING o ACTIVE asociados.",
      operationId: "deleteBook",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "204": { $ref: "#/components/responses/NoContent" },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
  },
};

export const catalogPaths: OpenAPIV3.PathsObject = {
  "/api/authors": {
    get: {
      tags: ["Autores"],
      summary: "Listar autores",
      operationId: "listAuthors",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Listado de autores",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/Author" },
              },
            },
          },
        },
        "401": bearer401,
      },
    },
    post: {
      tags: ["Autores"],
      summary: "Crear autor",
      description: "Solo **ADMIN**.",
      operationId: "createAuthor",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateAuthorRequest" },
          },
        },
      },
      responses: {
        "201": {
          description: "Autor creado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Author" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
      },
    },
  },
  "/api/authors/{id}": {
    get: {
      tags: ["Autores"],
      summary: "Obtener autor por ID",
      operationId: "getAuthor",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "200": {
          description: "Detalle del autor con libros asociados",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthorDetail" },
            },
          },
        },
        "401": bearer401,
        "404": notFound404,
      },
    },
    put: {
      tags: ["Autores"],
      summary: "Actualizar autor",
      description: "Solo **ADMIN**.",
      operationId: "updateAuthor",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateAuthorRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Autor actualizado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Author" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
    delete: {
      tags: ["Autores"],
      summary: "Eliminar autor",
      description: "Solo **ADMIN**. Falla si tiene libros asociados.",
      operationId: "deleteAuthor",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "204": { $ref: "#/components/responses/NoContent" },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
  },
  "/api/publishers": {
    get: {
      tags: ["Editoriales"],
      summary: "Listar editoriales",
      operationId: "listPublishers",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Listado de editoriales",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/Publisher" },
              },
            },
          },
        },
        "401": bearer401,
      },
    },
    post: {
      tags: ["Editoriales"],
      summary: "Crear editorial",
      description: "Solo **ADMIN**.",
      operationId: "createPublisher",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/NameRequest" },
          },
        },
      },
      responses: {
        "201": {
          description: "Editorial creada",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Publisher" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "409": {
          description: "Nombre duplicado",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
  },
  "/api/publishers/{id}": {
    get: {
      tags: ["Editoriales"],
      summary: "Obtener editorial por ID",
      operationId: "getPublisher",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "200": {
          description: "Detalle de la editorial",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PublisherDetail" },
            },
          },
        },
        "401": bearer401,
        "404": notFound404,
      },
    },
    put: {
      tags: ["Editoriales"],
      summary: "Actualizar editorial",
      description: "Solo **ADMIN**.",
      operationId: "updatePublisher",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/NameRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Editorial actualizada",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Publisher" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
        "409": conflict409,
      },
    },
    delete: {
      tags: ["Editoriales"],
      summary: "Eliminar editorial",
      description: "Solo **ADMIN**. Falla si tiene libros asociados.",
      operationId: "deletePublisher",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "204": { $ref: "#/components/responses/NoContent" },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
  },
  "/api/genres": {
    get: {
      tags: ["Géneros"],
      summary: "Listar géneros",
      operationId: "listGenres",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Listado de géneros",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/Genre" },
              },
            },
          },
        },
        "401": bearer401,
      },
    },
    post: {
      tags: ["Géneros"],
      summary: "Crear género",
      description: "Solo **ADMIN**.",
      operationId: "createGenre",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/NameRequest" },
          },
        },
      },
      responses: {
        "201": {
          description: "Género creado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Genre" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "409": conflict409,
      },
    },
  },
  "/api/genres/{id}": {
    get: {
      tags: ["Géneros"],
      summary: "Obtener género por ID",
      operationId: "getGenre",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "200": {
          description: "Detalle del género",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GenreDetail" },
            },
          },
        },
        "401": bearer401,
        "404": notFound404,
      },
    },
    put: {
      tags: ["Géneros"],
      summary: "Actualizar género",
      description: "Solo **ADMIN**.",
      operationId: "updateGenre",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/NameRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Género actualizado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Genre" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
        "409": conflict409,
      },
    },
    delete: {
      tags: ["Géneros"],
      summary: "Eliminar género",
      description: "Solo **ADMIN**. Falla si tiene libros asociados.",
      operationId: "deleteGenre",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "204": { $ref: "#/components/responses/NoContent" },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
  },
};

export const readerPaths: OpenAPIV3.PathsObject = {
  "/api/readers/statuses": {
    get: {
      tags: ["Lectores"],
      summary: "Listar estados de lector",
      description: "Solo **ADMIN** y **LIBRARIAN**.",
      operationId: "listReaderStatuses",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Estados disponibles (ACTIVE, SUSPENDED, INACTIVE)",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/ReaderStatus" },
              },
            },
          },
        },
        "401": bearer401,
        "403": forbidden403,
      },
    },
  },
  "/api/readers/sync-inactivity": {
    post: {
      tags: ["Lectores"],
      summary: "Sincronizar inactividad de lectores",
      description:
        "Solo **ADMIN**. Marca como INACTIVE a lectores ACTIVE sin préstamos abiertos cuya última actividad supera `INACTIVE_MONTHS` (default 12).",
      operationId: "syncInactiveReaders",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Resultado de la sincronización",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SyncInactivityResponse" },
            },
          },
        },
        "401": bearer401,
        "403": forbidden403,
      },
    },
  },
  "/api/readers": {
    get: {
      tags: ["Lectores"],
      summary: "Listar lectores",
      description: "Solo **ADMIN** y **LIBRARIAN**.",
      operationId: "listReaders",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/statusQuery" }],
      responses: {
        "200": {
          description: "Listado de lectores",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/ReaderDetail" },
              },
            },
          },
        },
        "401": bearer401,
        "403": forbidden403,
      },
    },
  },
  "/api/readers/{id}": {
    get: {
      tags: ["Lectores"],
      summary: "Obtener lector por ID",
      description: "Solo **ADMIN** y **LIBRARIAN**.",
      operationId: "getReader",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "200": {
          description: "Detalle del lector",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReaderDetail" },
            },
          },
        },
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
    put: {
      tags: ["Lectores"],
      summary: "Actualizar lector",
      description: "Solo **ADMIN**.",
      operationId: "updateReader",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateReaderRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Lector actualizado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReaderDetail" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
    delete: {
      tags: ["Lectores"],
      summary: "Eliminar lector",
      description:
        "Solo **ADMIN**. Falla si tiene préstamos PENDING o ACTIVE.",
      operationId: "deleteReader",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "204": { $ref: "#/components/responses/NoContent" },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
  },
  "/api/readers/{id}/reactivate": {
    patch: {
      tags: ["Lectores"],
      summary: "Reactivar lector",
      description:
        "Solo **ADMIN** y **LIBRARIAN**. Cambia el estado a ACTIVE.",
      operationId: "reactivateReader",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "200": {
          description: "Lector reactivado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReaderDetail" },
            },
          },
        },
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
  },
  "/api/readers/{id}/suspend": {
    patch: {
      tags: ["Lectores"],
      summary: "Suspender lector",
      description:
        "Solo **ADMIN** y **LIBRARIAN**. Falla si tiene préstamos PENDING o ACTIVE.",
      operationId: "suspendReader",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "200": {
          description: "Lector suspendido",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReaderDetail" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
  },
};

export const loanPaths: OpenAPIV3.PathsObject = {
  "/api/loans": {
    get: {
      tags: ["Préstamos"],
      summary: "Listar préstamos",
      description:
        "Los **READER** ven solo sus préstamos. Staff ve todos. Los préstamos ACTIVE incluyen metadatos de mora.",
      operationId: "listLoans",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Listado de préstamos",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/Loan" },
              },
            },
          },
        },
        "401": bearer401,
      },
    },
    post: {
      tags: ["Préstamos"],
      summary: "Solicitar o crear préstamo",
      description: `Crea una solicitud en estado **PENDING**.

- **READER**: envía solo \`bookId\`; el lector debe estar ACTIVE.
- **ADMIN/LIBRARIAN**: envían \`bookId\` y \`readerId\`.

Validaciones: libro existente, ejemplares disponibles, sin solicitud/préstamo duplicado del mismo libro para el lector.`,
      operationId: "createLoan",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateLoanRequest" },
          },
        },
      },
      responses: {
        "201": {
          description: "Solicitud creada",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Loan" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
        "409": conflict409,
      },
    },
  },
  "/api/loans/pending": {
    get: {
      tags: ["Préstamos"],
      summary: "Listar solicitudes pendientes",
      description: "Solo **ADMIN** y **LIBRARIAN**.",
      operationId: "listPendingLoans",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Solicitudes PENDING",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/Loan" },
              },
            },
          },
        },
        "401": bearer401,
        "403": forbidden403,
      },
    },
  },
  "/api/loans/available": {
    get: {
      tags: ["Préstamos"],
      summary: "Libros disponibles para préstamo",
      description: `Catálogo de libros con ejemplares libres, excluyendo los que el lector ya tiene en PENDING o ACTIVE.

- **READER**: catálogo personal (debe estar ACTIVE).
- **Staff**: todos los libros disponibles; opcionalmente filtrar por \`readerId\`.`,
      operationId: "listAvailableForLoan",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/readerIdQuery" }],
      responses: {
        "200": {
          description: "Libros disponibles",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/Book" },
              },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
      },
    },
  },
  "/api/loans/returns": {
    get: {
      tags: ["Préstamos"],
      summary: "Registro de devoluciones",
      description:
        "Préstamos en estado RETURNED. Ordenados por `returnDate` descendente. Incluye `wasLate`.",
      operationId: "listReturns",
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: "#/components/parameters/readerIdQuery" },
        { $ref: "#/components/parameters/fromQuery" },
        { $ref: "#/components/parameters/toQuery" },
        { $ref: "#/components/parameters/lateOnlyQuery" },
      ],
      responses: {
        "200": {
          description: "Devoluciones registradas",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/Loan" },
              },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
      },
    },
  },
  "/api/loans/overdue": {
    get: {
      tags: ["Préstamos"],
      summary: "Préstamos en mora",
      description:
        "Préstamos ACTIVE con `dueDate` vencida. Incluye `daysOverdue` y `overdueNotice`. Ordenados por días de mora descendente.",
      operationId: "listOverdueLoans",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/readerIdQuery" }],
      responses: {
        "200": {
          description: "Préstamos vencidos",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/Loan" },
              },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
      },
    },
  },
  "/api/loans/{id}": {
    get: {
      tags: ["Préstamos"],
      summary: "Obtener préstamo por ID",
      description: "Los **READER** solo pueden ver sus propios préstamos.",
      operationId: "getLoan",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "200": {
          description: "Detalle del préstamo",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Loan" },
            },
          },
        },
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
    put: {
      tags: ["Préstamos"],
      summary: "Actualizar fecha de vencimiento",
      description:
        "Solo **ADMIN** y **LIBRARIAN**. Solo préstamos **ACTIVE**. Body: `{ dueDate }`.",
      operationId: "updateLoan",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateLoanRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Préstamo actualizado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Loan" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
    delete: {
      tags: ["Préstamos"],
      summary: "Eliminar préstamo",
      description: `Solo **ADMIN** y **LIBRARIAN** con restricciones:

- **PENDING**: staff puede eliminar.
- **ACTIVE**: no permitido (devolver primero).
- **RETURNED/REJECTED**: solo **ADMIN**.`,
      operationId: "deleteLoan",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "204": { $ref: "#/components/responses/NoContent" },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
  },
  "/api/loans/{id}/approve": {
    patch: {
      tags: ["Préstamos"],
      summary: "Aprobar solicitud",
      description:
        "Solo **ADMIN** y **LIBRARIAN**. PENDING → ACTIVE. Descuenta un ejemplar y fija `dueDate` según `LOAN_DAYS` (default 14).",
      operationId: "approveLoan",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "200": {
          description: "Préstamo activado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Loan" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
        "409": conflict409,
      },
    },
  },
  "/api/loans/{id}/reject": {
    patch: {
      tags: ["Préstamos"],
      summary: "Rechazar solicitud",
      description: "Solo **ADMIN** y **LIBRARIAN**. PENDING → REJECTED.",
      operationId: "rejectLoan",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "200": {
          description: "Solicitud rechazada",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Loan" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
  },
  "/api/loans/{id}/return": {
    patch: {
      tags: ["Préstamos"],
      summary: "Registrar devolución",
      description:
        "Solo **ADMIN** y **LIBRARIAN**. ACTIVE → RETURNED. Restaura un ejemplar e incluye `wasLate`.",
      operationId: "returnLoan",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/idPath" }],
      responses: {
        "200": {
          description: "Devolución registrada",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Loan" },
            },
          },
        },
        "400": badRequest400,
        "401": bearer401,
        "403": forbidden403,
        "404": notFound404,
      },
    },
  },
};
