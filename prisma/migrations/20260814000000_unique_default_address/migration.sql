-- Enforce at most one default address per user.
CREATE UNIQUE INDEX "Address_userId_isDefault_key" ON "Address"("userId", "isDefault");
