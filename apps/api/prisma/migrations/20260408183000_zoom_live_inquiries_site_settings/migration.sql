-- CreateTable
CREATE TABLE "ZoomLiveSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "zoomUrl" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    "weeklyScheduleJson" TEXT NOT NULL DEFAULT '[]',
    "manualOverride" TEXT NOT NULL DEFAULT 'AUTO',
    "showButton" BOOLEAN NOT NULL DEFAULT true,
    "nextSessionMessageAr" TEXT,
    "buttonLabelAr" TEXT NOT NULL DEFAULT 'الدخول إلى البث المباشر',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZoomLiveSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteContentSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "registrationUrl" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "mapsInfoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentInquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminAnswerAr" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicFaqEntry" (
    "id" TEXT NOT NULL,
    "questionAr" TEXT NOT NULL,
    "answerAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sourceInquiryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicFaqEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicFaqEntry_sourceInquiryId_key" ON "PublicFaqEntry"("sourceInquiryId");

-- CreateIndex
CREATE INDEX "StudentInquiry_status_idx" ON "StudentInquiry"("status");

-- CreateIndex
CREATE INDEX "StudentInquiry_createdAt_idx" ON "StudentInquiry"("createdAt");

-- CreateIndex
CREATE INDEX "PublicFaqEntry_isVisible_sortOrder_idx" ON "PublicFaqEntry"("isVisible", "sortOrder");

-- AddForeignKey
ALTER TABLE "PublicFaqEntry" ADD CONSTRAINT "PublicFaqEntry_sourceInquiryId_fkey" FOREIGN KEY ("sourceInquiryId") REFERENCES "StudentInquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Default singleton rows
INSERT INTO "ZoomLiveSettings" ("id", "zoomUrl", "timezone", "weeklyScheduleJson", "manualOverride", "showButton", "nextSessionMessageAr", "buttonLabelAr", "createdAt", "updatedAt")
VALUES (
    1,
    '',
    'Asia/Jerusalem',
    '[{"dayOfWeek":0,"start":"18:00","end":"22:00"},{"dayOfWeek":2,"start":"18:00","end":"22:00"}]',
    'AUTO',
    true,
    'البث المباشر متاح وفق الجدول المعلن مساءً أيام الأحد والثلاثاء (توقيت القدس). عند عدم كون الجلسة مفتوحة حالياً، تُرسل روابط الزووم عادةً عبر مجموعات الطلاب — ويسعدنا تواصلكم من صفحة «تواصل معنا» عند الحاجة.',
    'الدخول إلى البث المباشر',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

INSERT INTO "SiteContentSettings" ("id", "registrationUrl", "youtubeUrl", "mapsInfoUrl", "createdAt", "updatedAt")
VALUES (
    1,
    'https://sites.google.com/view/zad2023/home',
    'https://www.youtube.com/@amjadkeadan/playlists',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
