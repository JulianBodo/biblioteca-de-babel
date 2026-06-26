# Biblioteca de Babel

API REST para gestionar una biblioteca: catálogo de libros, usuarios con roles, lectores con estados, y el ciclo completo de préstamos (solicitud, aprobación, devolución y mora).

**Stack:** Node.js · Express 5 · TypeScript · Prisma 7 · PostgreSQL

**Autores:** Bodo Julián, Cabrera Federico, Medina Manuel

---

## Qué hace la aplicación

Tres tipos de usuario conviven en el mismo sistema:

| Rol | Puede hacer |
|-----|-------------|
| **ADMIN** | Todo: catálogos, libros, usuarios, lectores y préstamos |
| **LIBRARIAN** | Préstamos, consulta de lectores, reactivar/suspender lectores |
| **READER** | Ver libros disponibles, pedir préstamos, consultar los propios |

Un préstamo recorre estos estados:

```
PENDING → (approve) → ACTIVE → (return) → RETURNED
PENDING → (reject)  → REJECTED
```

Los lectores tienen estado operativo (`ACTIVE`, `SUSPENDED`, `INACTIVE`). Solo un lector **ACTIVE** puede solicitar préstamos.

---

## Inicio rápido

**Requisitos:** Node.js 20+, PostgreSQL 17, Git.

```powershell
npm install
Copy-Item .env.example .env
# Editá DATABASE_URL y JWT_SECRET en .env

npx prisma migrate dev
npm run db:seed
npm run dev
```

La API queda en `http://localhost:3000/api`.  
Documentación interactiva: `http://localhost:3000/api/docs`

### Con Docker (solo PostgreSQL)

```powershell
docker compose up -d
# En .env: DATABASE_URL=postgresql://postgres:postgres@localhost:5433/biblioteca

npx prisma migrate dev
npm run db:seed
npm run dev
```

### Usuarios del seed

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@babel.com | admin123 |
| Bibliotecario | bibliotecario@babel.com | biblio123 |
| Lector activo | lector@babel.com | lector123 |
| Lector inactivo | inactivo@babel.com | inactivo123 |

---

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DATABASE_URL` | — | Conexión PostgreSQL (obligatoria) |
| `JWT_SECRET` | — | Secreto para firmar tokens |
| `PORT` | 3000 | Puerto del servidor |
| `LOAN_DAYS` | 14 | Días de plazo al aprobar un préstamo |
| `INACTIVE_MONTHS` | 12 | Meses sin actividad para marcar lector INACTIVE |

---

## Autenticación

Todas las rutas (excepto `POST /auth/login` y `GET /health`) requieren JWT:

```http
Authorization: Bearer <token>
```

El token se obtiene con login y dura **8 horas**.

---

## Referencia de endpoints

Base: `/api`

### Disponibilidad

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | No | `{ "status": "ok" }` |

### Autenticación (`/auth`)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/login` | — | Login. Body: `{ email, password }` → `{ token, user }` |
| GET | `/me` | Todos | Perfil del usuario autenticado |
| GET | `/users` | ADMIN | Listar usuarios |
| POST | `/users` | ADMIN | Crear usuario. READER requiere `firstName`, `lastName`, `dni` |
| DELETE | `/users/:id` | ADMIN | Eliminar usuario (no se puede borrar un admin) |

### Libros (`/books`)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/` | Todos | Listar. Lector: solo con ejemplares. Admin: `?available=true` filtra disponibles |
| GET | `/:id` | Todos | Detalle con autores, género y editorial |
| POST | `/` | ADMIN | Crear. Body: `isbn`, `title`, `publicationYear`, `authorIds[]`, `publisherId`, `genreId`, `totalCopies?` |
| PUT | `/:id` | ADMIN | Actualizar (campos opcionales) |
| DELETE | `/:id` | ADMIN | Eliminar (falla si hay préstamos PENDING/ACTIVE) |

### Autores (`/authors`)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/` | Todos | Listar |
| GET | `/:id` | Todos | Detalle con libros asociados |
| POST | `/` | ADMIN | Crear `{ firstName, lastName }` |
| PUT | `/:id` | ADMIN | Actualizar |
| DELETE | `/:id` | ADMIN | Eliminar (falla si tiene libros) |

### Editoriales (`/publishers`)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/` | Todos | Listar |
| GET | `/:id` | Todos | Detalle con libros |
| POST | `/` | ADMIN | Crear `{ name }` |
| PUT | `/:id` | ADMIN | Actualizar `{ name }` |
| DELETE | `/:id` | ADMIN | Eliminar (falla si tiene libros) |

### Géneros (`/genres`)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/` | Todos | Listar |
| GET | `/:id` | Todos | Detalle con libros |
| POST | `/` | ADMIN | Crear `{ name }` |
| PUT | `/:id` | ADMIN | Actualizar `{ name }` |
| DELETE | `/:id` | ADMIN | Eliminar (falla si tiene libros) |

### Lectores (`/readers`)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/statuses` | Staff | Listar estados (ACTIVE, SUSPENDED, INACTIVE) |
| GET | `/` | Staff | Listar lectores. Filtro: `?status=INACTIVE` |
| GET | `/:id` | Staff | Detalle con estado y usuario vinculado |
| PUT | `/:id` | ADMIN | Actualizar datos del lector |
| PATCH | `/:id/reactivate` | Staff | Pasar a ACTIVE |
| PATCH | `/:id/suspend` | Staff | Pasar a SUSPENDED (falla si tiene préstamos abiertos) |
| DELETE | `/:id` | ADMIN | Eliminar (falla si tiene préstamos PENDING/ACTIVE) |
| POST | `/sync-inactivity` | ADMIN | Marcar INACTIVE a lectores sin actividad reciente |

### Préstamos (`/loans`)

Las rutas estáticas (`/pending`, `/available`, `/returns`, `/overdue`) van **antes** de `/:id` en el router.

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/` | Todos | Listar. Lector: propios. Staff: todos. ACTIVE incluye metadatos de mora |
| GET | `/pending` | Staff | Solicitudes PENDING |
| GET | `/available` | Todos | Libros que se pueden pedir. Staff: `?readerId=` |
| GET | `/returns` | Todos | Devoluciones (RETURNED). Filtros: `readerId`, `from`, `to`, `lateOnly` |
| GET | `/overdue` | Todos | Préstamos ACTIVE vencidos. Staff: `?readerId=` |
| GET | `/:id` | Todos | Detalle (lector solo ve los propios) |
| POST | `/` | Todos | Crear solicitud. Lector: `{ bookId }`. Staff: `{ bookId, readerId }` |
| PUT | `/:id` | Staff | Cambiar `dueDate` (solo ACTIVE) |
| DELETE | `/:id` | Staff | PENDING: staff. RETURNED/REJECTED: solo ADMIN. ACTIVE: no permitido |
| PATCH | `/:id/approve` | Staff | PENDING → ACTIVE. Descuenta ejemplar, fija plazo |
| PATCH | `/:id/reject` | Staff | PENDING → REJECTED |
| PATCH | `/:id/return` | Staff | ACTIVE → RETURNED. Restaura ejemplar, setea `wasLate` |

#### Metadatos de mora (préstamos ACTIVE)

| Campo | Significado |
|-------|-------------|
| `daysOnLoan` | Días desde `loanDate` |
| `isOverdue` | `true` si hoy > `dueDate` |
| `daysOverdue` | Días de mora (0 si está al día) |
| `overdueNotice` | Mensaje de aviso cuando hay mora |

#### Metadatos de devolución (préstamos RETURNED)

| Campo | Significado |
|-------|-------------|
| `returnDate` | Cuándo se registró la devolución |
| `wasLate` | `true` si se devolvió después de `dueDate` |

---

## Flujo típico de un préstamo

1. Lector consulta `GET /loans/available` y pide un libro con `POST /loans`.
2. Bibliotecario ve `GET /loans/pending` y aprueba con `PATCH /loans/:id/approve`.
3. Al vencer el plazo sin devolver, el préstamo aparece en `GET /loans/overdue`.
4. Bibliotecario registra `PATCH /loans/:id/return`.
5. Cualquiera con permiso consulta el historial en `GET /loans/returns`.

---

## Documentación Swagger

Con el servidor en marcha:

- UI: `http://localhost:3000/api/docs`
- JSON: `http://localhost:3000/api/docs/openapi.json`

Podés probar endpoints desde la UI con el botón **Authorize** (pegar el token del login).

---

## Postman

En `postman/`:

1. Importar `Biblioteca-de-Babel.postman_collection.json`
2. Importar `Biblioteca-de-Babel.local.postman_environment.json`
3. Seleccionar environment **Biblioteca de Babel — Local**
4. Ejecutar carpeta **Setup — Logins** (guarda tokens automáticamente)

La collection está organizada por carpetas (auth, libros, catálogos, préstamos, devoluciones, mora) e incluye flujos encadenados completos.

**Importante:** Postman usa el puerto **3000** (`npm run dev`). Si algo responde distinto a lo esperado, reiniciá el servidor — a veces queda un proceso viejo en ese puerto.

---

## Tests

Suite de **129 tests** de integración con Playwright. Detalle en [`tests/README.md`](tests/README.md).

```powershell
npm run test:api           # Suite completa (API en puerto 3001)
npm run test:api:ui        # Modo interactivo
npm run allure:serve       # Reporte HTML tras ejecutar tests
```

Los reportes (`allure-results/`, `test-results/`) se generan al correr tests y están en `.gitignore`.

---

## Estructura del proyecto

```
src/
├── init.ts              # Punto de entrada
├── app.ts               # Express + Swagger + rutas
├── config.ts            # Variables de entorno
├── database.ts          # Cliente Prisma
├── routes/              # Definición HTTP por recurso
├── services/            # Lógica de negocio
├── middlewares/         # Auth JWT y manejo de errores
├── utils/               # Auth, errores, estados de lector
└── swagger/             # Spec OpenAPI 3

prisma/
├── schema.prisma        # Modelo de datos
├── seed.ts              # Datos iniciales
└── migrations/

tests/
├── global-setup.ts      # Migraciones + seed antes de la suite
└── api/                 # Specs, helpers y fixtures

postman/                 # Collection y environment
```

---

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con hot-reload |
| `npm run db:migrate` | Migraciones en desarrollo |
| `npm run db:seed` | Cargar datos iniciales |
| `npm run db:setup` | Script PowerShell para DB local |
| `npm run test:api` | Tests de integración |
| `npm run test:api:report` | Generar y abrir reporte Allure |

---

## Licencia

ISC
