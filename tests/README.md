# Tests de API

Suite de integración con **Playwright** que levanta la API real, habla HTTP contra ella y valida respuestas, permisos y reglas de negocio.

**129 tests** · un worker (serial) · ~40 s en máquina local

---

## Cómo ejecutar

Desde la raíz del proyecto, con PostgreSQL accesible según tu `.env`:

```powershell
npm run test:api
```

Otros comandos útiles:

```powershell
npm run test:api:ui                              # Playwright UI
npm run test:api -- tests/api/deletions.spec.ts  # Un solo archivo
npm run allure:serve                             # Reporte HTML (después de correr tests)
npm run test:api:report                          # Generar + abrir Allure
```

Playwright arranca la API en el puerto **3001** (no interfiere con `npm run dev` en 3000).  
Antes de la suite, `global-setup.ts` aplica migraciones y ejecuta el seed.

---

## Estructura de carpetas

```
tests/
├── global-setup.ts          # Prepara la DB antes de correr nada
└── api/
    ├── fixtures.ts          # Punto de entrada: test, expect, tokens, helpers
    ├── constants.ts         # Credenciales del seed y enums (LOAN_STATUS, etc.)
    ├── types.ts             # Tipos compartidos de respuestas HTTP
    ├── allure-meta.ts       # Etiquetas para el reporte Allure
    │
    ├── helpers/
    │   ├── http.ts          # bearer(), expectStatus(), expectJsonError()
    │   ├── assertions.ts    # Validar shape de libros y préstamos
    │   ├── auth.ts          # Login y perfiles
    │   ├── catalog.ts       # Contexto del seed, elegir libro para préstamo
    │   ├── loans.ts         # Flujos: crear, aprobar, rechazar, devolver
    │   └── disposable.ts    # Registros aislados para tests de DELETE
    │
    └── *.spec.ts            # Un archivo por dominio (ver tabla abajo)
```

### Regla de imports

Cada spec importa **solo desde `./fixtures.js`**. Ese archivo re-exporta todo lo que hace falta para no repetir imports en cada test.

---

## Archivos de test

| Archivo | Qué prueba | Tests |
|---------|------------|-------|
| `health.spec.ts` | Health check y rutas inexistentes | 2 |
| `auth.spec.ts` | Login, perfil, CRUD usuarios, permisos | 13 |
| `security.spec.ts` | 401 sin token en endpoints protegidos | 10 |
| `books.spec.ts` | CRUD libros, filtros, permisos, ISBN duplicado | 8 |
| `catalogs.spec.ts` | CRUD autores, editoriales, géneros | 10 |
| `readers.spec.ts` | Estados, reactivar/suspender, sync-inactivity | 10 |
| `available-loans.spec.ts` | Catálogo de libros solicitables | 9 |
| `loans.spec.ts` | Flujo E2E, rechazos, validaciones de ciclo de vida | 19 |
| `loans-crud.spec.ts` | Staff: crear, PUT dueDate, DELETE con reglas de rol | 13 |
| `returns.spec.ts` | Registro de devoluciones y filtros | 10 |
| `overdue.spec.ts` | Mora: metadatos, avisos, filtros | 11 |
| `deletions.spec.ts` | DELETE con registros desechables (no toca el seed) | 14 |

---

## Convenciones

### Nombres de tests

Formato **`acción → resultado`**:  
`lector activo solicita préstamo → 201 PENDING`

### Datos de prueba

- **`uniqueSuffix()`** en emails, ISBN y nombres para evitar colisiones entre tests.
- **Seed** (`lector@babel.com`, libros iniciales): se usa para flujos generales, no se borra.
- **Registros desechables** (`helpers/disposable.ts`): cada test de DELETE crea su propio autor/libro/lector y lo limpia al final. Así no rompemos otros casos.

### Aserciones

Preferir helpers en lugar de comparar JSON a mano:

- `expectStatus(response, 200)`
- `expectJsonError(response, 403, "permisos")`
- `expectBookShape(book)` / `expectLoanShape(loan)`

### Tests seriales

`test.describe.serial` solo donde un test deja estado que el siguiente necesita (por ejemplo el flujo E2E de préstamo en `loans.spec.ts`).

### Allure

Cada spec llama `allureFeature("Nombre del dominio")`. Sub-grupos importantes usan `allureStory()`.

---

## Helpers de préstamos (`helpers/loans.ts`)

Funciones reutilizables para no repetir pasos en cada spec:

| Función | Qué hace |
|---------|----------|
| `createPendingLoan(tokens, bookId?)` | Lector pide préstamo → PENDING |
| `createApprovedLoan(tokens, bookId?)` | PENDING + approve → ACTIVE |
| `approveLoan(token, loanId)` | Aprueba una solicitud |
| `rejectLoan(token, loanId)` | Rechaza una solicitud |
| `returnLoan(token, loanId)` | Devuelve un préstamo activo |

---

## Helpers desechables (`helpers/disposable.ts`)

Para tests que **eliminan** registros:

| Función | Qué crea |
|---------|----------|
| `createIsolatedBookStack()` | Autor + editorial + género + libro (todo nuevo) |
| `createDisposableReaderUser()` | Usuario READER que no existía en el seed |
| `tearDownIsolatedBookStack()` | Borra el stack completo (previo: eliminar préstamos que referencien el libro) |

---

## Configuración (`playwright.config.ts`)

- **`workers: 1`** — los tests comparten base de datos; correr en paralelo generaría conflictos.
- **`webServer`** — levanta `tsx src/init.ts` con `PORT=3001` y espera `/api/health`.
- **`globalSetup`** — `migrate deploy` + `db seed` antes de la suite.
- **Reporter Allure** — escribe en `allure-results/` (ignorado por git).

---

## Credenciales

Definidas en `constants.ts`, coinciden con el seed de Prisma:

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@babel.com | admin123 |
| Bibliotecario | bibliotecario@babel.com | biblio123 |
| Lector activo | lector@babel.com | lector123 |
| Lector inactivo | inactivo@babel.com | inactivo123 |

El fixture `tokens` hace login de los cuatro roles una vez por test file y expone `tokens.admin`, `tokens.librarian`, etc.

---

## Reset completo de base (opcional)

Si la DB quedó en mal estado:

```powershell
$env:RUN_DB_RESET = "1"
npm run test:api
```

Eso ejecuta `prisma migrate reset --force` en lugar del seed normal.
