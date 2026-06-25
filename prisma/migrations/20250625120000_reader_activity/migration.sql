-- AlterTable
ALTER TABLE "Reader" ADD COLUMN "lastLoanAt" TIMESTAMP(3);

-- SeedReaderStatus
INSERT INTO "ReaderStatus" ("status")
VALUES ('INACTIVE')
ON CONFLICT ("status") DO NOTHING;
