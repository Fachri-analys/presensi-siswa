-- AlterTable
ALTER TABLE "sick_letters" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "sick_letters" ADD COLUMN "verified_by_id" TEXT;
ALTER TABLE "sick_letters" ADD COLUMN "verified_at" DATETIME;
ALTER TABLE "sick_letters" ADD COLUMN "catatan_validator" TEXT;

-- CreateIndex
CREATE INDEX "sick_letters_status_idx" ON "sick_letters"("status");
