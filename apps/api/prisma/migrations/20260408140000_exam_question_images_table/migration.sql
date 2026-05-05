-- CreateTable
CREATE TABLE "ExamQuestionImage" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamQuestionImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamQuestionImage_questionId_idx" ON "ExamQuestionImage"("questionId");

-- CreateIndex
CREATE INDEX "ExamQuestionImage_order_idx" ON "ExamQuestionImage"("order");

-- AddForeignKey
ALTER TABLE "ExamQuestionImage" ADD CONSTRAINT "ExamQuestionImage_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
