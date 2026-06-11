-- CreateTable
CREATE TABLE "phone_verification_codes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "code" VARCHAR(6) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "phone_verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "phone_verification_codes_user_id_phone_code_verified_at_idx"
  ON "phone_verification_codes"("user_id", "phone", "code", "verified_at");

-- CreateIndex
CREATE INDEX "phone_verification_codes_expires_at_idx"
  ON "phone_verification_codes"("expires_at");

-- AddForeignKey
ALTER TABLE "phone_verification_codes"
  ADD CONSTRAINT "phone_verification_codes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
