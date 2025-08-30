-- Performance optimization indexes for RateCardLab

-- User indexes for analytics and user lookup
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "User_email_createdAt_idx" ON "User"("email", "createdAt");

-- Folder indexes for hierarchy operations
CREATE INDEX "Folder_userId_idx" ON "Folder"("userId");
CREATE INDEX "Folder_userId_parentId_idx" ON "Folder"("userId", "parentId");
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");
CREATE INDEX "Folder_userId_name_idx" ON "Folder"("userId", "name");
CREATE INDEX "Folder_userId_createdAt_idx" ON "Folder"("userId", "createdAt");

-- RateCard indexes for common query patterns
CREATE INDEX "RateCard_userId_idx" ON "RateCard"("userId");
CREATE INDEX "RateCard_userId_isActive_idx" ON "RateCard"("userId", "isActive");
CREATE INDEX "RateCard_userId_folderId_idx" ON "RateCard"("userId", "folderId");
CREATE INDEX "RateCard_folderId_idx" ON "RateCard"("folderId");
CREATE INDEX "RateCard_shareToken_idx" ON "RateCard"("shareToken");
CREATE INDEX "RateCard_userId_updatedAt_idx" ON "RateCard"("userId", "updatedAt");
CREATE INDEX "RateCard_userId_name_idx" ON "RateCard"("userId", "name");
CREATE INDEX "RateCard_userId_pricingModel_idx" ON "RateCard"("userId", "pricingModel");
CREATE INDEX "RateCard_isActive_createdAt_idx" ON "RateCard"("isActive", "createdAt");

-- Composite indexes for pagination queries
CREATE INDEX "RateCard_userId_isActive_createdAt_idx" ON "RateCard"("userId", "isActive", "createdAt");
CREATE INDEX "RateCard_folderId_isActive_createdAt_idx" ON "RateCard"("folderId", "isActive", "createdAt");

-- Index for search functionality
CREATE INDEX "RateCard_userId_name_description_idx" ON "RateCard"("userId", "name", "description");