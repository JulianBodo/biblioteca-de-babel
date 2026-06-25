import type { OpenAPIV3 } from "openapi-types";
import { config } from "../config.js";
import { parameters, responses, schemas, securitySchemes } from "./components.js";
import {
  authPaths,
  bookPaths,
  catalogPaths,
  healthPaths,
  loanPaths,
  readerPaths,
} from "./paths.js";

export function buildOpenApiSpec(): OpenAPIV3.Document {
  return {
    openapi: "3.0.3",
    info: {
      title: "Biblioteca de Babel — API REST",
      version: "1.0.0",
      description: `
Sistema de gestión bibliotecaria con roles **ADMIN**, **LIBRARIAN** y **READER**.

## Autenticación

1. Obtener token con \`POST /api/auth/login\`.
2. Enviar \`Authorization: Bearer <token>\` en endpoints protegidos.

## Roles y permisos

| Rol | Descripción |
|-----|-------------|
| **ADMIN** | CRUD completo de catálogos, libros, usuarios y lectores |
| **LIBRARIAN** | Gestión de préstamos, lectores (sin usuarios ni catálogos) |
| **READER** | Consulta de libros disponibles, solicitud y seguimiento de préstamos propios |

## Ciclo de vida del préstamo

\`PENDING\` → (approve) → \`ACTIVE\` → (return) → \`RETURNED\`

También: \`PENDING\` → (reject) → \`REJECTED\`

## Variables de entorno relevantes

| Variable | Default | Descripción |
|----------|---------|-------------|
| \`PORT\` | 3000 | Puerto del servidor |
| \`LOAN_DAYS\` | 14 | Días de préstamo al aprobar |
| \`INACTIVE_MONTHS\` | 12 | Meses sin actividad para marcar lector INACTIVE |

## Usuarios de prueba (seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@babel.com | admin123 |
| Bibliotecario | bibliotecario@babel.com | biblio123 |
| Lector activo | lector@babel.com | lector123 |
| Lector inactivo | inactivo@babel.com | inactivo123 |
      `.trim(),
      contact: {
        name: "Biblioteca de Babel",
        url: "https://github.com/JulianBodo/biblioteca-de-babel",
      },
      license: {
        name: "ISC",
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: "Servidor local",
      },
    ],
    tags: [
      { name: "Disponibilidad", description: "Health check" },
      { name: "Autenticación", description: "Login, perfil y gestión de usuarios" },
      { name: "Libros", description: "Catálogo bibliográfico" },
      { name: "Autores", description: "Catálogo de autores" },
      { name: "Editoriales", description: "Catálogo de editoriales" },
      { name: "Géneros", description: "Catálogo de géneros literarios" },
      { name: "Lectores", description: "Gestión de lectores y estados" },
      {
        name: "Préstamos",
        description:
          "Solicitudes, aprobaciones, devoluciones, mora y catálogo disponible",
      },
    ],
    paths: {
      ...healthPaths,
      ...authPaths,
      ...bookPaths,
      ...catalogPaths,
      ...readerPaths,
      ...loanPaths,
    },
    components: {
      securitySchemes,
      schemas,
      responses,
      parameters,
    },
  };
}

export const openApiSpec = buildOpenApiSpec();
