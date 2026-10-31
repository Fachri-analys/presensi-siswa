ALTER TABLE "sick_letters"
ADD COLUMN "idempotency_key" TEXT,
ADD COLUMN "request_hash" TEXT;

CREATE UNIQUE INDEX "sick_letters_idempotency_key_key"
ON "sick_letters"("idempotency_key");
