-- CreateTable
CREATE TABLE "OldGrade" (
    "id" SERIAL NOT NULL,
    "grade" INTEGER NOT NULL,
    "courseNumber" TEXT NOT NULL,
    "studentIdNumber" TEXT NOT NULL,
    "bonus" INTEGER NOT NULL,
    "finalGrade" INTEGER NOT NULL,
    "courseId" TEXT NOT NULL,

    CONSTRAINT "OldGrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OldGrade_studentIdNumber_idx" ON "OldGrade"("studentIdNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OldGrade_studentIdNumber_courseNumber_key" ON "OldGrade"("studentIdNumber", "courseNumber");
