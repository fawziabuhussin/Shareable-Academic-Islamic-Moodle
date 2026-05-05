/**
 * Grade Manager — Computation Service
 * Computes grades on-the-fly from ExamAttempt, HomeworkSubmission, and QuizAttempt.
 * No Grade table — scores are never duplicated.
 */
import { prisma } from '../utils/prisma';
import { enrollmentRepository } from '../repositories/enrollment.repository';
import {
  getLetterGrade,
  computeWeightedGrade,
  computeFinalScore,
  getEffectiveEnrollmentScore,
  validateCourseWeights,
  computeAverage,
  GradeItem,
} from '../utils/grading';
import { AuthContext } from '../types/common.types';
import {
  AssessmentScore,
  StudentCourseBreakdown,
  StudentGradeRow,
  StudentGradesSummary,
  CourseWeightSummary,
  CrossCourseGradeRow,
  CrossCourseGradesResponse,
} from '../types/grade.types';

/**
 * Result types for manager operations
 */
export interface GradeResult {
  success: boolean;
  data?: any;
  error?: { status: number; message: string };
}

/**
 * Gather assessment scores for a student in a course.
 */
async function gatherAssessmentScores(userId: string, courseId: string): Promise<AssessmentScore[]> {
  const scores: AssessmentScore[] = [];

  // Exams
  const exams = await prisma.exam.findMany({
    where: { courseId },
    select: { id: true, title: true, maxScore: true, weightPercent: true },
  });
  for (const exam of exams) {
    const attempt = await prisma.examAttempt.findFirst({
      where: { examId: exam.id, userId },
      orderBy: { attemptNumber: 'desc' },
      select: { score: true, effectiveScore: true, isRetake: true },
    });
    scores.push({
      id: exam.id,
      type: 'EXAM',
      title: exam.title,
      score: attempt?.score ?? null,
      effectiveScore: attempt?.effectiveScore ?? null,
      maxScore: exam.maxScore,
      weightPercent: exam.weightPercent,
      isRetake: attempt?.isRetake ?? false,
    });
  }

  // Homeworks
  const homeworks = await prisma.homework.findMany({
    where: { courseId },
    select: { id: true, title: true, maxScore: true, weightPercent: true },
  });
  for (const hw of homeworks) {
    const submission = await prisma.homeworkSubmission.findFirst({
      where: { homeworkId: hw.id, userId },
      select: { score: true },
    });
    scores.push({
      id: hw.id,
      type: 'HOMEWORK',
      title: hw.title,
      score: submission?.score ?? null,
      maxScore: hw.maxScore,
      weightPercent: hw.weightPercent,
    });
  }

  // Quizzes
  const quizzes = await prisma.quiz.findMany({
    where: { courseId },
    select: { id: true, title: true, weightPercent: true, questions: { select: { id: true } } },
  });
  for (const quiz of quizzes) {
    const attempt = await prisma.quizAttempt.findFirst({
      where: { quizId: quiz.id, userId },
      orderBy: { score: 'desc' },
      select: { score: true },
    });
    const maxScore = 100; // Quiz scores are already percentages (0-100)
    scores.push({
      id: quiz.id,
      type: 'QUIZ',
      title: quiz.title,
      score: attempt?.score ?? null,
      maxScore,
      weightPercent: quiz.weightPercent,
    });
  }

  return scores;
}

/**
 * Compute lesson completion percentage for a user in a course.
 */
async function computeLessonCompletion(userId: string, courseId: string): Promise<number> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        include: { lessons: { select: { id: true } } },
      },
    },
  });
  if (!course) return 0;

  const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  if (allLessonIds.length === 0) return 100; // No lessons = 100% complete

  const completed = await prisma.lessonProgress.count({
    where: { userId, lessonId: { in: allLessonIds } },
  });

  return (completed / allLessonIds.length) * 100;
}

/**
 * Convert assessment scores to GradeItems for the grading utility.
 * For exams, use effectiveScore; for others, use score directly.
 */
function toGradeItems(assessments: AssessmentScore[]): GradeItem[] {
  return assessments
    .filter((a) => a.score !== null)
    .map((a) => ({
      score: a.type === 'EXAM' && a.effectiveScore != null ? a.effectiveScore : (a.score as number),
      maxScore: a.maxScore,
      weightPercent: a.weightPercent,
    }));
}

export class GradeManager {
  /**
   * Get a student's breakdown for a single course (student view — no projected grade).
   */
  async getStudentCourseBreakdown(
    auth: AuthContext,
    userId: string,
    courseId: string
  ): Promise<GradeResult> {
    // Authorization: student can view own, admin can view any
    if (userId !== auth.userId && auth.role !== 'ADMIN') {
      return { success: false, error: { status: 403, message: 'غير مسموح بالوصول' } };
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, teacherId: true, readingWeight: true },
    });
    if (!course) {
      return { success: false, error: { status: 404, message: 'الدورة غير موجودة' } };
    }

    const assessments = await gatherAssessmentScores(userId, courseId);
    const lessonCompletionPercent = await computeLessonCompletion(userId, courseId);

    // Check if enrollment is finalized
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { finalScore: true, overrideScore: true, finalizedAt: true },
    });

    let finalGrade: StudentCourseBreakdown['finalGrade'] | undefined;
    if (enrollment?.finalizedAt) {
      const effectiveScore = getEffectiveEnrollmentScore(enrollment.finalScore, enrollment.overrideScore);
      finalGrade = {
        finalScore: effectiveScore!,
        overrideScore: null,
        effectiveScore: effectiveScore!,
        letterGrade: getLetterGrade(effectiveScore!),
        finalizedAt: enrollment.finalizedAt,
      };
    }

    const breakdown: StudentCourseBreakdown = {
      courseId,
      courseTitle: course.title,
      readingWeight: course.readingWeight,
      lessonCompletionPercent,
      assessments,
      finalGrade,
    };

    return { success: true, data: breakdown };
  }

  /**
   * Get all students' grades for a course (teacher/admin view).
   */
  async getTeacherCourseGrades(
    auth: AuthContext,
    courseId: string
  ): Promise<GradeResult> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, teacherId: true, readingWeight: true },
    });
    if (!course) {
      return { success: false, error: { status: 404, message: 'الدورة غير موجودة' } };
    }

    const isTeacher = course.teacherId === auth.userId;
    const isAdmin = auth.role === 'ADMIN';
    if (!isTeacher && !isAdmin) {
      return { success: false, error: { status: 403, message: 'غير مسموح بالوصول' } };
    }

    // Get enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const readingWeight = course.readingWeight;

    // Weight validation
    const [examsAll, homeworksAll, quizzesAll] = await Promise.all([
      prisma.exam.findMany({ where: { courseId }, select: { id: true, title: true, weightPercent: true } }),
      prisma.homework.findMany({ where: { courseId }, select: { id: true, title: true, weightPercent: true } }),
      prisma.quiz.findMany({ where: { courseId }, select: { id: true, title: true, weightPercent: true } }),
    ]);
    const allAssessments = [
      ...examsAll.map(e => ({ ...e, type: 'EXAM' as const })),
      ...homeworksAll.map(h => ({ ...h, type: 'HOMEWORK' as const })),
      ...quizzesAll.map(q => ({ ...q, type: 'QUIZ' as const })),
    ];
    const weightValidation = validateCourseWeights(readingWeight, allAssessments);

    const rows: StudentGradeRow[] = [];
    for (const enrollment of enrollments) {
      const userId = enrollment.userId;
      const assessments = await gatherAssessmentScores(userId, courseId);
      const lessonCompletionPercent = await computeLessonCompletion(userId, courseId);
      const gradeItems = toGradeItems(assessments);
      const projectedGrade = computeWeightedGrade(gradeItems, readingWeight, lessonCompletionPercent);

      const effectiveScore = getEffectiveEnrollmentScore(enrollment.finalScore, enrollment.overrideScore);

      rows.push({
        userId,
        studentName: enrollment.user.name,
        studentEmail: enrollment.user.email,
        enrollmentId: enrollment.id,
        assessments,
        lessonCompletionPercent,
        projectedGrade,
        finalScore: enrollment.finalScore,
        overrideScore: enrollment.overrideScore,
        effectiveScore,
        letterGrade: effectiveScore != null ? getLetterGrade(effectiveScore) : null,
        finalizedAt: enrollment.finalizedAt,
      });
    }

    return {
      success: true,
      data: {
        students: rows,
        weightSummary: {
          readingWeight,
          assessments: allAssessments.map(a => ({
            id: a.id,
            type: a.type,
            title: a.title,
            weightPercent: a.weightPercent,
          })),
          total: weightValidation.total,
          isValid: weightValidation.isValid,
          remaining: weightValidation.remaining,
        },
      },
    };
  }

  /**
   * Finalize grades for all enrolled students in a course.
   */
  async finalizeCourseGrades(
    auth: AuthContext,
    courseId: string
  ): Promise<GradeResult> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true, readingWeight: true },
    });
    if (!course) {
      return { success: false, error: { status: 404, message: 'الدورة غير موجودة' } };
    }

    const isTeacher = course.teacherId === auth.userId;
    const isAdmin = auth.role === 'ADMIN';
    if (!isTeacher && !isAdmin) {
      return { success: false, error: { status: 403, message: 'غير مسموح بالوصول' } };
    }

    const readingWeight = course.readingWeight;

    // Validate weights sum to 100%
    const [examsW, homeworksW, quizzesW] = await Promise.all([
      prisma.exam.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.homework.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.quiz.findMany({ where: { courseId }, select: { weightPercent: true } }),
    ]);
    const weightValidation = validateCourseWeights(readingWeight, [...examsW, ...homeworksW, ...quizzesW]);
    if (!weightValidation.isValid) {
      return {
        success: false,
        error: {
          status: 400,
          message: `لا يمكن اعتماد الدرجات: إجمالي الأوزان ${weightValidation.total}% (يجب أن يكون 100%)`,
        },
      };
    }

    // Get all active enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
      select: { id: true, userId: true },
    });

    let finalizedCount = 0;
    for (const enrollment of enrollments) {
      const assessments = await gatherAssessmentScores(enrollment.userId, courseId);
      const lessonCompletionPercent = await computeLessonCompletion(enrollment.userId, courseId);

      // Build grade items — use effectiveScore for exams, score (or 0) for others
      const items: GradeItem[] = assessments.map((a) => ({
        score: a.type === 'EXAM'
          ? (a.effectiveScore ?? a.score ?? 0)
          : (a.score ?? 0),
        maxScore: a.maxScore,
        weightPercent: a.weightPercent,
      }));

      const finalScore = computeFinalScore(items, readingWeight, lessonCompletionPercent);

      await enrollmentRepository.finalizeStudentGrade(enrollment.id, finalScore, auth.userId);
      finalizedCount++;
    }

    return {
      success: true,
      data: { finalizedCount, courseId },
    };
  }

  /**
   * Finalize grade for a single student in a course.
   */
  async finalizeStudentGrade(
    auth: AuthContext,
    courseId: string,
    userId: string
  ): Promise<GradeResult> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true, readingWeight: true },
    });
    if (!course) {
      return { success: false, error: { status: 404, message: 'الدورة غير موجودة' } };
    }

    const isTeacher = course.teacherId === auth.userId;
    const isAdmin = auth.role === 'ADMIN';
    if (!isTeacher && !isAdmin) {
      return { success: false, error: { status: 403, message: 'غير مسموح بالوصول' } };
    }

    const readingWeight = course.readingWeight;

    // Validate weights sum to 100%
    const [examsW, homeworksW, quizzesW] = await Promise.all([
      prisma.exam.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.homework.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.quiz.findMany({ where: { courseId }, select: { weightPercent: true } }),
    ]);
    const weightValidation = validateCourseWeights(readingWeight, [...examsW, ...homeworksW, ...quizzesW]);
    if (!weightValidation.isValid) {
      return {
        success: false,
        error: {
          status: 400,
          message: `لا يمكن اعتماد الدرجة: إجمالي الأوزان ${weightValidation.total}% (يجب أن يكون 100%)`,
        },
      };
    }

    // Find the student's enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, userId: true, status: true },
    });
    if (!enrollment) {
      return { success: false, error: { status: 404, message: 'الطالب غير مسجل في هذه الدورة' } };
    }
    if (enrollment.status !== 'ACTIVE') {
      return { success: false, error: { status: 400, message: 'تسجيل الطالب غير فعّال' } };
    }

    const assessments = await gatherAssessmentScores(userId, courseId);
    const lessonCompletionPercent = await computeLessonCompletion(userId, courseId);

    const items: GradeItem[] = assessments.map((a) => ({
      score: a.type === 'EXAM'
        ? (a.effectiveScore ?? a.score ?? 0)
        : (a.score ?? 0),
      maxScore: a.maxScore,
      weightPercent: a.weightPercent,
    }));

    const finalScore = computeFinalScore(items, readingWeight, lessonCompletionPercent);

    await enrollmentRepository.finalizeStudentGrade(enrollment.id, finalScore, auth.userId);

    return {
      success: true,
      data: { userId, courseId, finalScore },
    };
  }

  /**
   * Override a student's grade for a course.
   */
  async overrideStudentGrade(
    auth: AuthContext,
    userId: string,
    courseId: string,
    overrideScore: number
  ): Promise<GradeResult> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });
    if (!course) {
      return { success: false, error: { status: 404, message: 'الدورة غير موجودة' } };
    }

    const isTeacher = course.teacherId === auth.userId;
    const isAdmin = auth.role === 'ADMIN';
    if (!isTeacher && !isAdmin) {
      return { success: false, error: { status: 403, message: 'غير مسموح بالوصول' } };
    }

    if (overrideScore < 0 || overrideScore > 100) {
      return { success: false, error: { status: 400, message: 'الدرجة يجب أن تكون بين 0 و 100' } };
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, finalScore: true },
    });
    if (!enrollment) {
      return { success: false, error: { status: 404, message: 'الطالب غير مسجل في هذه الدورة' } };
    }

    // If the student has no finalized grade yet, add grade (populate all fields atomically)
    if (enrollment.finalScore === null) {
      await enrollmentRepository.addStudentGrade(enrollment.id, overrideScore, auth.userId);
    } else {
      await enrollmentRepository.setStudentGradeOverride(enrollment.id, overrideScore);
    }

    return { success: true, data: { userId, courseId, overrideScore } };
  }

  /**
   * Reopen (clear finalization) for all students in a course.
   */
  async reopenCourseGrades(
    auth: AuthContext,
    courseId: string
  ): Promise<GradeResult> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });
    if (!course) {
      return { success: false, error: { status: 404, message: 'الدورة غير موجودة' } };
    }

    const isTeacher = course.teacherId === auth.userId;
    const isAdmin = auth.role === 'ADMIN';
    if (!isTeacher && !isAdmin) {
      return { success: false, error: { status: 403, message: 'غير مسموح بالوصول' } };
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      select: { id: true },
    });

    for (const enrollment of enrollments) {
      await enrollmentRepository.clearStudentGradeFinalization(enrollment.id);
    }

    return { success: true, data: { courseId, reopenedCount: enrollments.length } };
  }

  /**
   * Insert a manual final grade for a student.
   * If the student is not enrolled, auto-enroll them.
   * Warns (but does not block) if prerequisites are not met.
   */
  async insertManualGrade(
    auth: AuthContext,
    courseId: string,
    userId: string,
    score: number
  ): Promise<GradeResult> {
    // 1. Validate course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        teacherId: true,
        prerequisites: {
          include: {
            prerequisite: { select: { id: true, title: true } },
          },
        },
      },
    });
    if (!course) {
      return { success: false, error: { status: 404, message: 'الدورة غير موجودة' } };
    }

    // 2. Auth check
    const isTeacher = course.teacherId === auth.userId;
    const isAdmin = auth.role === 'ADMIN';
    if (!isTeacher && !isAdmin) {
      return { success: false, error: { status: 403, message: 'غير مسموح بالوصول' } };
    }

    // 3. Validate target user exists and is a student
    const student = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, idNumber: true, role: true },
    });
    if (!student) {
      return { success: false, error: { status: 404, message: 'الطالب غير موجود' } };
    }
    if (student.role !== 'STUDENT') {
      return { success: false, error: { status: 400, message: 'المستخدم ليس طالباً' } };
    }

    // 4. Check enrollment
    let enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, status: true, finalScore: true },
    });

    let enrolled = false;
    let prerequisiteWarning: string | undefined;

    if (!enrollment) {
      // Check prerequisites (warn but don't block)
      if (course.prerequisites.length > 0) {
        const prereqCourseIds = course.prerequisites.map(p => p.prerequisite.id);
        const prereqGrades = await enrollmentRepository.findFinalizedGradesByUserAndCourses(
          userId,
          prereqCourseIds
        );

        const unmetPrereqs = course.prerequisites.filter(p => {
          const grade = prereqGrades.find(g => g.courseId === p.prerequisite.id);
          if (!grade) return true;
          const effective = grade.overrideScore ?? grade.finalScore ?? 0;
          return effective < 60;
        });

        if (unmetPrereqs.length > 0) {
          const names = unmetPrereqs.map(p => p.prerequisite.title).join('، ');
          prerequisiteWarning = `الطالب لم يجتز المتطلبات السابقة: ${names}`;
        }
      }

      // Auto-enroll
      const newEnrollment = await enrollmentRepository.create({
        userId,
        courseId,
        status: 'ACTIVE',
      });
      enrollment = { id: newEnrollment.id, status: 'ACTIVE', finalScore: null };
      enrolled = true;
    } else if (enrollment.status === 'CANCELED') {
      // Reactivate
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { status: 'ACTIVE' },
      });
      enrollment.status = 'ACTIVE';
      enrolled = true;
    }

    // 5. Set the grade (both overrideScore and finalScore atomically)
    await enrollmentRepository.addStudentGrade(enrollment.id, score, auth.userId);

    return {
      success: true,
      data: {
        enrolled,
        prerequisiteWarning,
        student: { name: student.name, idNumber: student.idNumber },
        score,
      },
    };
  }

  /**
   * Get summary of a student's grades across all courses.
   */
  async getStudentGradesSummary(
    auth: AuthContext,
    userId: string
  ): Promise<GradeResult> {
    if (userId !== auth.userId && auth.role !== 'ADMIN') {
      return { success: false, error: { status: 403, message: 'غير مسموح بالوصول' } };
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            readingWeight: true,
          },
        },
      },
    });

    const courses: StudentGradesSummary['courses'] = [];
    const finalizedPercentages: number[] = [];

    for (const enrollment of enrollments) {
      const courseId = enrollment.courseId;
      const assessments = await gatherAssessmentScores(userId, courseId);
      const lessonCompletionPercent = await computeLessonCompletion(userId, courseId);
      const isFinalized = enrollment.finalizedAt != null;
      const effectiveScore = getEffectiveEnrollmentScore(enrollment.finalScore, enrollment.overrideScore);

      if (isFinalized && effectiveScore != null) {
        finalizedPercentages.push(effectiveScore);
      }

      courses.push({
        courseId,
        courseTitle: enrollment.course.title,
        coverImage: enrollment.course.coverImage,
        finalScore: effectiveScore,
        overrideScore: null,
        effectiveScore,
        letterGrade: effectiveScore != null ? getLetterGrade(effectiveScore) : null,
        isFinalized,
        assessments,
        readingWeight: enrollment.course.readingWeight,
        lessonCompletionPercent,
      });
    }

    const average = computeAverage(finalizedPercentages);

    const summary: StudentGradesSummary = {
      courses,
      average,
      averageFormatted: average.toFixed(2) + '%',
      finalizedCourseCount: finalizedPercentages.length,
    };

    return { success: true, data: summary };
  }

  /**
   * Get grades overview across all courses (admin sees all, teacher sees own courses).
   * Returns a matrix of students × courses with effective scores.
   */
  async getAllCoursesGrades(auth: AuthContext): Promise<GradeResult> {
    if (auth.role !== 'ADMIN' && auth.role !== 'TEACHER') {
      return { success: false, error: { status: 403, message: 'غير مسموح بالوصول' } };
    }

    // Determine which courses to include
    const courseWhere: any = {};
    if (auth.role === 'TEACHER') {
      courseWhere.teacherId = auth.userId;
    }

    const courses = await prisma.course.findMany({
      where: courseWhere,
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    });

    if (courses.length === 0) {
      const response: CrossCourseGradesResponse = { courses: [], students: [] };
      return { success: true, data: response };
    }

    const courseIds = courses.map((c) => c.id);

    // Fetch all ACTIVE enrollments for these courses in one query
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: { in: courseIds },
        status: 'ACTIVE',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Group by student
    const studentMap = new Map<string, CrossCourseGradeRow>();

    for (const enrollment of enrollments) {
      const uid = enrollment.userId;
      if (!studentMap.has(uid)) {
        studentMap.set(uid, {
          userId: uid,
          studentName: enrollment.user.name,
          studentEmail: enrollment.user.email,
          courseGrades: {},
        });
      }

      const effectiveScore = getEffectiveEnrollmentScore(
        enrollment.finalScore,
        enrollment.overrideScore
      );
      const isFinalized = enrollment.finalizedAt != null;

      studentMap.get(uid)!.courseGrades[enrollment.courseId] = {
        effectiveScore,
        letterGrade: effectiveScore != null ? getLetterGrade(effectiveScore) : null,
        isFinalized,
      };
    }

    // Sort students by name
    const students = Array.from(studentMap.values()).sort((a, b) =>
      a.studentName.localeCompare(b.studentName, 'ar')
    );

    const response: CrossCourseGradesResponse = { courses, students };
    return { success: true, data: response };
  }
}

/**
 * Singleton instance
 */
export const gradeManager = new GradeManager();
