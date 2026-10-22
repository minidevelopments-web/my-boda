-- CreateTable
CREATE TABLE "GalleryPhoto" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "uploaderName" TEXT NOT NULL,
    "caption" TEXT,
    "fileName" TEXT NOT NULL,
    "thumbName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryPhoto_createdAt_idx" ON "GalleryPhoto"("createdAt");
