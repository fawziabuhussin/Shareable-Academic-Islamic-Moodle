/**
 * OldGrade Manager
 * Handles importing old grades for newly registered users.
 * When a user signs up with an idNumber, this manager looks up their
 * old grades from the OldGrade table, enrolls them in the corresponding
 * courses, and finalizes their scores.
 *
 * Optimized: uses a single Prisma interactive transaction with batched
 * upserts instead of sequential per-record DB calls.
 */
import { oldGradeRepository, OldGradeRecord } from '../repositories/oldGrade.repository';
import { prisma } from '../utils/prisma';

export class OldGradeManager {
  /**
   * Import old grades for a newly registered user.
   * Matches by 6-digit suffix of the user's idNumber against old student IDs.
   *
   * This method is fire-and-forget safe — it catches all errors internally
   * so it never blocks the signup flow.
   *
   * DB calls: 1 READ (old grades) + 1 READ (admin) + 1 TRANSACTION (N upserts batched)
   * = 3 total round-trips regardless of how many grade records exist.
   */
  async importOldGradesForUser(userId: string, idNumber: string): Promise<void> {
    try {
      // 1. Find matching old grade records by suffix  (1 DB READ)
      const oldGrades = await oldGradeRepository.findByIdNumberSuffix(idNumber);
      if (oldGrades.length === 0) {
        return; // No old grades found — nothing to do
      }

      console.log(`[OldGrades] Found ${oldGrades.length} old grade records for user ${userId} (idNumber suffix: ${idNumber.slice(-6)})`);

      // 2. Find the first ADMIN user to use as finalizedById  (1 DB READ)
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      if (!adminUser) {
        console.error('[OldGrades] No ADMIN user found — cannot finalize grades');
        return;
      }

      // 3. Batch-upsert all enrollments + grades in a single transaction  (1 DB TRANSACTION)
      const now = new Date();

      const results = await prisma.$transaction(
        oldGrades.map((gradeRecord) =>
          prisma.enrollment.upsert({
            where: {
              userId_courseId: {
                userId,
                courseId: gradeRecord.courseId,
              },
            },
            // If enrollment already exists — just overwrite the grade fields
            update: {
              overrideScore: gradeRecord.finalGrade,
              finalScore: gradeRecord.finalGrade,
              finalizedAt: now,
              finalizedById: adminUser.id,
            },
            // If no enrollment — create it with ACTIVE status and the grade
            create: {
              userId,
              courseId: gradeRecord.courseId,
              status: 'ACTIVE',
              overrideScore: gradeRecord.finalGrade,
              finalScore: gradeRecord.finalGrade,
              finalizedAt: now,
              finalizedById: adminUser.id,
            },
          })
        )
      );

      console.log(`[OldGrades] Import complete for user ${userId}: ${results.length} courses processed in a single transaction`);
    } catch (err) {
      // Catch-all: never let old grade import break signup
      console.error('[OldGrades] Unexpected error during grade import:', err);
    }
  }

  /**
   * Check old grades sync status for a user.
   * Returns total old grade records found and how many already have
   * a finalized enrollment in the platform.
   *
   * DB calls: 1 READ (user) + 1 READ (old grades) + 1 READ (enrollments) = 3
   */
  async checkOldGradesSync(
    userId: string
  ): Promise<{
    totalOldGrades: number;
    syncedCount: number;
    unsyncedCount: number;
    details: Array<{
      courseNumber: string;
      courseId: string;
      finalGrade: number;
      synced: boolean;
    }>;
  }> {
    // 1. Get the user's idNumber
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { idNumber: true },
    });

    if (!user?.idNumber) {
      return { totalOldGrades: 0, syncedCount: 0, unsyncedCount: 0, details: [] };
    }

    // 2. Find matching old grade records
    const oldGrades = await oldGradeRepository.findByIdNumberSuffix(user.idNumber);
    if (oldGrades.length === 0) {
      return { totalOldGrades: 0, syncedCount: 0, unsyncedCount: 0, details: [] };
    }

    // 3. Find all finalized enrollments for this user in the matching courses
    const courseIds = oldGrades.map((g) => g.courseId);
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        courseId: { in: courseIds },
        finalizedAt: { not: null },
      },
      select: { courseId: true },
    });

    const syncedCourseIds = new Set(enrollments.map((e) => e.courseId));

    const details = oldGrades.map((g) => ({
      courseNumber: g.courseNumber,
      courseId: g.courseId,
      finalGrade: g.finalGrade,
      synced: syncedCourseIds.has(g.courseId),
    }));

    const syncedCount = details.filter((d) => d.synced).length;

    return {
      totalOldGrades: oldGrades.length,
      syncedCount,
      unsyncedCount: oldGrades.length - syncedCount,
      details,
    };
  }

  /**
   * Sync a single old grade for a user by courseId.
   * Upserts the enrollment and sets the finalized grade.
   *
   * DB calls: 1 READ (user) + 1 READ (old grade) + 1 READ (admin) + 1 WRITE (upsert) = 4
   */
  async syncSingleOldGrade(
    userId: string,
    courseId: string
  ): Promise<{ success: boolean; message: string }> {
    // 1. Get the user's idNumber
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { idNumber: true },
    });

    if (!user?.idNumber) {
      return { success: false, message: 'User has no idNumber' };
    }

    // 2. Find the matching old grade record
    const oldGrades = await oldGradeRepository.findByIdNumberSuffix(user.idNumber);
    const gradeRecord = oldGrades.find((g) => g.courseId === courseId);

    if (!gradeRecord) {
      return { success: false, message: 'No old grade found for this course' };
    }

    // 3. Find admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    if (!adminUser) {
      return { success: false, message: 'No ADMIN user found' };
    }

    // 4. Upsert enrollment with grade
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId, courseId },
      },
      update: {
        overrideScore: gradeRecord.finalGrade,
        finalScore: gradeRecord.finalGrade,
        finalizedAt: new Date(),
        finalizedById: adminUser.id,
      },
      create: {
        userId,
        courseId,
        status: 'ACTIVE',
        overrideScore: gradeRecord.finalGrade,
        finalScore: gradeRecord.finalGrade,
        finalizedAt: new Date(),
        finalizedById: adminUser.id,
      },
    });

    return { success: true, message: 'Grade synced successfully' };
  }
}

/**
 * Singleton instance
 */
export const oldGradeManager = new OldGradeManager();
