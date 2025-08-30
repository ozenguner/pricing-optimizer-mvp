-- CreateTable
CREATE TABLE "SecurityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SecurityLog_eventType_idx" ON "SecurityLog"("eventType");
CREATE INDEX "SecurityLog_userId_idx" ON "SecurityLog"("userId");
CREATE INDEX "SecurityLog_ipAddress_idx" ON "SecurityLog"("ipAddress");
CREATE INDEX "SecurityLog_timestamp_idx" ON "SecurityLog"("timestamp");
CREATE INDEX "SecurityLog_eventType_timestamp_idx" ON "SecurityLog"("eventType", "timestamp");