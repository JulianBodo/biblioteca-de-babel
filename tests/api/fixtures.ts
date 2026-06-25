import { test as base, expect } from "@playwright/test";
import type { AuthTokens } from "./types.js";
import { loginAllRoles } from "./helpers/auth.js";

type ApiFixtures = {
  tokens: AuthTokens;
};

/** Extiende Playwright con tokens JWT de los cuatro roles del seed. */
export const test = base.extend<ApiFixtures>({
  tokens: async ({ request }, use) => {
    await use(await loginAllRoles(request));
  },
});

export { expect };

export { CREDENTIALS, LOAN_STATUS, READER_STATUS } from "./constants.js";
export type { AuthTokens, LoanTokens, AuthUser, SeedContext } from "./types.js";

export {
  bearer,
  uniqueSuffix,
  expectStatus,
  expectJsonError,
  expectNoContent,
} from "./helpers/http.js";

export {
  expectBookShape,
  expectLoanShape,
  expectActiveLoanMetadata,
  expectReturnedLoanMetadata,
  expectSortedDescByDate,
} from "./helpers/assertions.js";

export {
  login,
  loginAllRoles,
  getReaderProfile,
  getInactiveReaderId,
} from "./helpers/auth.js";

export { getSeedContext, pickBookForLoan } from "./helpers/catalog.js";

export {
  createPendingLoan,
  createApprovedLoan,
  approveLoan,
  rejectLoan,
  returnLoan,
} from "./helpers/loans.js";

export {
  createIsolatedBookStack,
  createDisposableAuthor,
  createDisposablePublisher,
  createDisposableGenre,
  createDisposableReaderUser,
  tearDownIsolatedBookStack,
  deleteUserIfExists,
} from "./helpers/disposable.js";
