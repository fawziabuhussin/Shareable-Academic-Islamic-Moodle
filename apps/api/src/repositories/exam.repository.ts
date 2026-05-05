/**
 * Exam Repository
 * Data access layer for Exam-related database operations
 */
import { prisma } from '../utils/prisma';
import {
  ExamWithRelations,
  CreateExamDTO,
  UpdateExamDTO,
  CreateExamQuestionDTO,
  UpdateExamQuestionDTO,
  SubmitExamAttemptDTO,
  ExamAttemptWithRelations,
  ExamQuestionWithParsedChoices,
  CourseCompletionStatus,
} from '../types/exam.types';
import { PaginationParams, PaginatedResponse } from '../types/common.types';

/**
 * Include configuration for fetching exams with relations
 */
const examInclude = {
  course: {
    select: {
      id: true,
      title: true,
      description: true,
      teacherId: true,
    },
  },
  questions: {
    orderBy: { order: 'asc' as const },
    include: {
      images: { orderBy: { order: 'asc' as const } },
    },
  },
  _count: {
    select: { attempts: true },
  },
};

/**
 * Include configuration for fetching exam attempts
 */
const examAttemptInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

export class ExamRepository {
  /**
   * Parse question choices from JSON string
   */
  private parseQuestionChoices(question: any): ExamQuestionWithParsedChoices {
    let choices: string[] = [];
    if (typeof question.choices === 'string') {
      try {
        choices = JSON.parse(question.choices);
      } catch (e) {
        console.error('Failed to parse choices:', e);
        choices = [];
      }
    } else if (Array.isArray(question.choices)) {
      choices = question.choices;
    }

    return {
      id: question.id,
      prompt: question.prompt,
      type: question.type || 'MULTIPLE_CHOICE',
      choices: choices || [],
      correctIndex: question.correctIndex,
      explanation: question.explanation || null,
      images: (question.images || []).map((img: any) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        order: img.order,
      })),
      points: question.points,
      order: question.order,
    };
  }

  /**
   * Find all exams for a course with pagination
   */
  async findByCourseId(
    courseId: string,
    userId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<ExamWithRelations>> {
    const where = { courseId };

    // Pagination defaults
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    // Execute count and data queries in parallel
    const [total, exams] = await Promise.all([
      prisma.exam.count({ where }),
      prisma.exam.findMany({
        where,
        include: {
          ...examInclude,
          questions: {
            orderBy: { order: 'asc' },
            include: { images: { orderBy: { order: 'asc' } } },
          },
          attempts: {
            where: { userId },
            orderBy: { attemptNumber: 'desc' },
          },
          _count: { select: { attempts: true } },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const data = exams.map((exam) => ({
      ...exam,
      questions: exam.questions.map((q) => this.parseQuestionChoices(q)),
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find all exams for a course without pagination (for backward compatibility)
   */
  async findByCourseIdUnpaginated(courseId: string, userId: string): Promise<ExamWithRelations[]> {
    const exams = await prisma.exam.findMany({
      where: { courseId },
      include: {
        ...examInclude,
        questions: {
          orderBy: { order: 'asc' },
          include: { images: { orderBy: { order: 'asc' } } },
        },
        attempts: {
          where: { userId },
          orderBy: { attemptNumber: 'desc' },
        },
        _count: { select: { attempts: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    return exams.map((exam) => ({
      ...exam,
      questions: exam.questions.map((q) => this.parseQuestionChoices(q)),
    }));
  }

  /**
   * Find a single exam by ID with full details
   */
  async findById(id: string, userId?: string): Promise<ExamWithRelations | null> {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  select: { id: true },
                },
              },
            },
            enrollments: userId
              ? {
                  where: { userId, status: 'ACTIVE' },
                }
              : false,
            teacher: true,
          },
        },
        questions: {
          orderBy: { order: 'asc' },
          include: { images: { orderBy: { order: 'asc' } } },
        },
        attempts: userId
          ? {
              where: { userId },
              orderBy: { attemptNumber: 'desc' as const },
            }
          : false,
      },
    });

    if (!exam) return null;

    return {
      ...exam,
      questions: exam.questions.map((q) => this.parseQuestionChoices(q)),
    };
  }

  /**
   * Create a new exam
   */
  async create(data: CreateExamDTO, courseId: string): Promise<ExamWithRelations> {
    const examData: any = {
      title: data.title,
      durationMinutes: data.durationMinutes,
      courseId: courseId,
      startDate: data.startDate,
      endDate: data.endDate,
      maxScore: data.maxScore,
      passingScore: data.passingScore,
      maxAttempts: data.maxAttempts,
      retakeScorePercent: data.retakeScorePercent,
      weightPercent: data.weightPercent,
    };
    examData.description = data.description || '';

    const exam = await prisma.exam.create({
      data: examData,
      include: examInclude,
    });

    return {
      ...exam,
      questions: exam.questions?.map((q) => this.parseQuestionChoices(q)) || [],
    };
  }

  /**
   * Update an existing exam
   */
  async update(id: string, data: UpdateExamDTO): Promise<ExamWithRelations> {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.maxScore !== undefined) updateData.maxScore = data.maxScore;
    if (data.passingScore !== undefined) updateData.passingScore = data.passingScore;
    if (data.maxAttempts !== undefined) updateData.maxAttempts = data.maxAttempts;
    if (data.retakeScorePercent !== undefined) updateData.retakeScorePercent = data.retakeScorePercent;
    if (data.weightPercent !== undefined) updateData.weightPercent = data.weightPercent;

    const exam = await prisma.exam.update({
      where: { id },
      data: updateData,
      include: examInclude,
    });

    return {
      ...exam,
      questions: exam.questions?.map((q: any) => this.parseQuestionChoices(q)) || [],
    };
  }

  /**
   * Delete an exam
   */
  async delete(id: string): Promise<void> {
    await prisma.exam.delete({ where: { id } });
  }

  /**
   * Check if exam exists and belongs to course
   */
  async existsInCourse(id: string, courseId: string): Promise<boolean> {
    const exam = await prisma.exam.findFirst({
      where: { id, courseId },
    });
    return !!exam;
  }

  /**
   * Create a new exam question
   */
  async createQuestion(
    data: CreateExamQuestionDTO,
    examId: string
  ): Promise<ExamQuestionWithParsedChoices> {
    const question = await prisma.examQuestion.create({
      data: {
        examId: examId,
        prompt: data.prompt,
        type: data.type,
        choices: data.choices ? JSON.stringify(data.choices) : null,
        correctIndex: data.correctIndex,
        explanation: data.explanation || null,
        points: data.points,
        order: data.order || 0,
        ...(data.images && data.images.length > 0 ? {
          images: {
            create: data.images.map((img, i) => ({
              imageUrl: img.imageUrl,
              order: img.order ?? i,
            })),
          },
        } : {}),
      },
      include: { images: { orderBy: { order: 'asc' } } },
    });

    return this.parseQuestionChoices(question);
  }

  /**
   * Update an exam question
   */
  async updateQuestion(
    questionId: string,
    data: UpdateExamQuestionDTO
  ): Promise<ExamQuestionWithParsedChoices> {
    const updateData: any = {};
    if (data.prompt) updateData.prompt = data.prompt;
    if (data.type) updateData.type = data.type;
    if (data.choices) updateData.choices = JSON.stringify(data.choices);
    if (data.correctIndex !== undefined) updateData.correctIndex = data.correctIndex;
    if (data.explanation !== undefined) updateData.explanation = data.explanation || null;
    if (data.points !== undefined) updateData.points = data.points;
    if (data.order !== undefined) updateData.order = data.order;

    // If images are provided, replace all existing images
    if (data.images !== undefined) {
      await prisma.examQuestionImage.deleteMany({ where: { questionId } });
      if (data.images.length > 0) {
        await prisma.examQuestionImage.createMany({
          data: data.images.map((img, i) => ({
            questionId,
            imageUrl: img.imageUrl,
            order: img.order ?? i,
          })),
        });
      }
    }

    const question = await prisma.examQuestion.update({
      where: { id: questionId },
      data: updateData,
      include: { images: { orderBy: { order: 'asc' } } },
    });

    return this.parseQuestionChoices(question);
  }

  /**
   * Delete an exam question
   */
  async deleteQuestion(questionId: string): Promise<void> {
    await prisma.examQuestion.delete({ where: { id: questionId } });
  }

  /**
   * Batch update question orders
   */
  async batchUpdateQuestionOrders(updates: { id: string; order: number }[]): Promise<void> {
    await prisma.$transaction(
      updates.map(u => prisma.examQuestion.update({
        where: { id: u.id },
        data: { order: u.order },
      }))
    );
  }

  /**
   * Get the next order value for a question
   */
  async getNextQuestionOrder(examId: string): Promise<number> {
    const maxOrder = await prisma.examQuestion.findFirst({
      where: { examId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (maxOrder?.order ?? -1) + 1;
  }

  /**
   * Find question by ID
   */
  async findQuestionById(questionId: string): Promise<ExamQuestionWithParsedChoices | null> {
    const question = await prisma.examQuestion.findUnique({
      where: { id: questionId },
      include: { images: { orderBy: { order: 'asc' } } },
    });

    return question ? this.parseQuestionChoices(question) : null;
  }

  /**
   * Get exam with questions
   */
  async findExamWithQuestions(examId: string): Promise<ExamWithRelations | null> {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        course: true,
        questions: {
          orderBy: { order: 'asc' },
          include: { images: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!exam) return null;

    return {
      ...exam,
      questions: exam.questions.map((q) => this.parseQuestionChoices(q)),
    };
  }

  /**
   * Find all attempts for an exam
   */
  async findAttemptsByExamId(examId: string): Promise<ExamAttemptWithRelations[]> {
    return prisma.examAttempt.findMany({
      where: { examId },
      include: examAttemptInclude,
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Find exam attempt by ID
   */
  async findAttemptById(attemptId: string): Promise<ExamAttemptWithRelations | null> {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        ...examAttemptInclude,
        exam: {
          include: {
            questions: {
              include: { images: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    });

    if (!attempt) return null;

    return {
      ...attempt,
      exam: attempt.exam
        ? {
            id: attempt.exam.id,
            courseId: attempt.exam.courseId,
            maxScore: attempt.exam.maxScore,
            questions: attempt.exam.questions?.map((q: any) => this.parseQuestionChoices(q)),
          }
        : undefined,
    };
  }

  /**
   * Find the latest attempt for a user on an exam (highest attemptNumber)
   */
  async findLatestAttempt(examId: string, userId: string): Promise<ExamAttemptWithRelations | null> {
    return prisma.examAttempt.findFirst({
      where: { examId, userId },
      orderBy: { attemptNumber: 'desc' },
      include: examAttemptInclude,
    });
  }

  /**
   * Count attempts for a user on an exam
   */
  async countAttempts(examId: string, userId: string): Promise<number> {
    return prisma.examAttempt.count({
      where: { examId, userId },
    });
  }

  /**
   * Create exam attempt
   */
  async createAttempt(
    examId: string,
    userId: string,
    answers: Record<string, number | string>,
    score: number | null,
    status: string,
    attemptNumber: number = 1,
    isRetake: boolean = false,
    effectiveScore: number | null = null
  ): Promise<ExamAttemptWithRelations> {
    return prisma.examAttempt.create({
      data: {
        examId,
        userId,
        answers: JSON.stringify(answers),
        score,
        effectiveScore,
        status,
        attemptNumber,
        isRetake,
      },
      include: examAttemptInclude,
    });
  }

  /**
   * Update exam attempt score
   */
  async updateAttemptScore(
    attemptId: string,
    score: number,
    status: string,
    effectiveScore?: number | null
  ): Promise<ExamAttemptWithRelations> {
    const data: any = { score, status };
    if (effectiveScore !== undefined) {
      data.effectiveScore = effectiveScore;
    }
    return prisma.examAttempt.update({
      where: { id: attemptId },
      data,
      include: examAttemptInclude,
    });
  }

  /**
   * Check course completion status for a user
   */
  async checkCourseCompletion(courseId: string, userId: string): Promise<CourseCompletionStatus> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!course) {
      return {
        allLessonsCompleted: false,
        completedLessons: 0,
        totalLessons: 0,
      };
    }

    const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const totalLessons = allLessonIds.length;

    const completedLessons = await prisma.lessonProgress.findMany({
      where: {
        userId,
        lessonId: { in: allLessonIds },
      },
    });

    const completedLessonsCount = completedLessons.length;
    const allLessonsCompleted = completedLessonsCount >= totalLessons;

    return {
      allLessonsCompleted,
      completedLessons: completedLessonsCount,
      totalLessons,
    };
  }

  /**
   * Check if user is enrolled in course
   */
  async isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: 'ACTIVE',
      },
    });
    return !!enrollment;
  }

  /**
   * Get course by ID
   */
  async getCourseById(courseId: string) {
    return prisma.course.findUnique({
      where: { id: courseId },
      include: { teacher: true },
    });
  }
}

/**
 * Singleton instance
 */
export const examRepository = new ExamRepository();
