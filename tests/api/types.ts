export type AuthTokens = {
  admin: string;
  librarian: string;
  reader: string;
  inactiveReader: string;
};

export type LoanTokens = Pick<AuthTokens, "admin" | "librarian" | "reader">;

export type ApiError = {
  error: string;
};

export type AuthUser = {
  id: number;
  email: string;
  role: string;
  readerId: number | null;
  reader?: {
    id: number;
    readerStatus: { status: string };
  };
};

export type BookSummary = {
  id: number;
  availableCopies: number;
  isbn?: string;
};

export type LoanSummary = {
  id: number;
  status: string;
  book: { id: number; title?: string };
  reader: { id: number; email: string };
};

export type SeedContext = {
  authors: { id: number }[];
  publishers: { id: number }[];
  genres: { id: number }[];
  books: BookSummary[];
  headers: { Authorization: string };
};
