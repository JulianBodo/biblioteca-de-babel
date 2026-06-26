export const CREDENTIALS = {
  admin: { email: "admin@babel.com", password: "admin123" },
  librarian: { email: "bibliotecario@babel.com", password: "biblio123" },
  reader: { email: "lector@babel.com", password: "lector123" },
  inactiveReader: { email: "inactivo@babel.com", password: "inactivo123" },
} as const;

export const LOAN_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  RETURNED: "RETURNED",
  REJECTED: "REJECTED",
} as const;

export const READER_STATUS = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  INACTIVE: "INACTIVE",
} as const;
