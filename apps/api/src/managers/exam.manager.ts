/**
 * Exam Manager
 * Business logic layer for exam management
 */
import { examRepository } from '../repositories/exam.repository';
import { authorizationService } from '../services/authorization.service';
import { examSerializer } from '../services/exam.serializer';
import { AuthContext } from '../types/common.types';
import {
  CreateExamDTO,
  UpdateExamDTO,
  CreateExamQuestionDTO,
  UpdateExamQuestionDTO,
  SubmitExamAttemptDTO,
  GradeExamAttemptDTO,
  UpdateExamAttemptScoreDTO,
  ExamWithRelations,
  ExamQuestionWithParsedChoices,
  ExamAttemptResult,
  RetakeInfo,
} from '../types/exam.types';
import { getLetterGrade, computeEffectiveScore, validateCourseWeights } from '../utils/grading';
import { prisma } from '../utils/prisma';
import axios from 'axios';
import { googleFormJsonSchema } from '../schemas/exam.schema';

/**
 * Retake configuration defaults (used as fallbacks; per-exam settings take priority)
 */
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_RETAKE_SCORE_PERCENT = 75;

/**
 * Result types for manager operations
 */
export interface ExamListResult {
  success: boolean;
  data?: ExamWithRelations[];
  error?: { status: number; message: string };
}

export interface ExamResult {
  success: boolean;
  data?: any;
  error?: { status: number; message: string };
}

export interface QuestionResult {
  success: boolean;
  data?: ExamQuestionWithParsedChoices;
  error?: { status: number; message: string };
}

export interface DeleteResult {
  success: boolean;
  error?: { status: number; message: string };
}

export interface AttemptListResult {
  success: boolean;
  data?: any[];
  error?: { status: number; message: string };
}

export interface AttemptResult {
  success: boolean;
  data?: ExamAttemptResult;
  error?: { status: number; message: string };
}

export class ExamManager {
  /**
   * List all exams for a course (unpaginated for backward compatibility)
   * Note: Questions are serialized to hide answers for students
   * unless they passed AND it's after endDate
   */
  async listExams(auth: AuthContext, courseId: string): Promise<ExamListResult> {
    // Check authorization - read access required
    const access = await authorizationService.checkReadAccess(auth, {
      type: 'course',
      id: courseId,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    const exams = await examRepository.findByCourseIdUnpaginated(courseId, auth.userId);
    
    // Serialize exams to hide answers based on user context
    const serializedExams = examSerializer.serializeExams(exams, auth);
    
    return { success: true, data: serializedExams };
  }

  /**
   * List all exams for a course with pagination
   * Note: Questions are serialized to hide answers for students
   * unless they passed AND it's after endDate
   */
  async listExamsPaginated(
    auth: AuthContext,
    courseId: string,
    pagination?: { page?: number; limit?: number }
  ): Promise<{
    success: boolean;
    data?: {
      data: ExamWithRelations[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
    error?: { status: number; message: string };
  }> {
    // Check authorization - read access required
    const access = await authorizationService.checkReadAccess(auth, {
      type: 'course',
      id: courseId,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    const result = await examRepository.findByCourseId(courseId, auth.userId, pagination);
    
    // Serialize exams to hide answers based on user context
    const serializedExams = examSerializer.serializeExams(result.data, auth);
    
    return {
      success: true,
      data: {
        data: serializedExams,
        pagination: result.pagination,
      },
    };
  }

  /**
   * Get a single exam with full details
   * Note: Questions are serialized to hide answers for students
   * unless they passed AND it's after endDate
   */
  async getExam(auth: AuthContext, examId: string): Promise<ExamResult> {
    const exam = await examRepository.findById(examId, auth.userId);

    if (!exam) {
      return {
        success: false,
        error: { status: 404, message: 'Exam not found' },
      };
    }

    // Check authorization
    const access = await authorizationService.checkReadAccess(auth, {
      type: 'course',
      id: exam.courseId,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    // Check course completion for students
    let courseCompletionData: any = {};
    if (auth.role === 'STUDENT' && exam.course?.enrollments && exam.course.enrollments.length > 0) {
      const completion = await examRepository.checkCourseCompletion(exam.courseId, auth.userId);
      courseCompletionData = {
        courseCompletionRequired: true,
        allLessonsCompleted: completion.allLessonsCompleted,
        completedLessons: completion.completedLessons,
        totalLessons: completion.totalLessons,
      };
    }

    // Serialize exam to hide answers based on user context
    const serializedExam = examSerializer.serializeExam(exam, auth);

    // Build retake eligibility info for students
    let retakeInfo: RetakeInfo | undefined;
    if (auth.role === 'STUDENT' || auth.role === 'ADMIN') {
      const latestAttempt = exam.attempts && exam.attempts.length > 0 ? exam.attempts[0] : null; // ordered by attemptNumber desc
      const attemptCount = latestAttempt ? latestAttempt.attemptNumber : 0;
      const now = new Date();
      const withinWindow = now >= new Date(exam.startDate) && now <= new Date(exam.endDate);

      const previousFailed = latestAttempt !== null
        && latestAttempt.score !== null
        && latestAttempt.status !== 'PENDING'
        && latestAttempt.score < exam.passingScore;

      const maxAttempts = exam.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
      const retakePercent = exam.retakeScorePercent ?? DEFAULT_RETAKE_SCORE_PERCENT;

      retakeInfo = {
        canRetake: previousFailed && withinWindow && (maxAttempts === 0 || attemptCount < maxAttempts),
        previousAttemptFailed: previousFailed,
        previousScore: latestAttempt?.score ?? null,
        maxEffectiveScore: exam.maxScore * (retakePercent / 100),
        attemptNumber: attemptCount,
        retakeScorePercent: retakePercent,
      };
    }

    // Format response with parsed questions
    const response: any = {
      ...serializedExam,
      course: {
        id: exam.course?.id || exam.courseId,
        title: exam.course?.title || '',
      },
      questions: serializedExam.questions || [],
      ...courseCompletionData,
      ...(retakeInfo ? { retakeInfo } : {}),
    };

    return { success: true, data: response };
  }

  /**
   * Create a new exam
   */
  async createExam(auth: AuthContext, courseId: string, data: CreateExamDTO): Promise<ExamResult> {
    // Check authorization - write access required
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: courseId,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالإضافة' },
      };
    }

    // Verify course exists
    const course = await examRepository.getCourseById(courseId);
    if (!course) {
      return {
        success: false,
        error: { status: 404, message: 'Course not found' },
      };
    }

    const exam = await examRepository.create(data, courseId);

    // Validate total course weights (warning, not blocking)
    let weightWarning: string | undefined;
    const [exams, homeworks, quizzes, courseData] = await Promise.all([
      prisma.exam.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.homework.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.quiz.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.course.findUnique({ where: { id: courseId }, select: { readingWeight: true } }),
    ]);
    const validation = validateCourseWeights(courseData?.readingWeight || 0, [...exams, ...homeworks, ...quizzes]);
    if (!validation.isValid) {
      weightWarning = `إجمالي الأوزان: ${validation.total}% (المتبقي: ${validation.remaining}%)`;
    }

    return { success: true, data: { ...exam, weightWarning } };
  }

  /**
   * Import an exam from a Google Forms JSON file URL.
   * Supports direct URLs and Google Drive file links (auto-converted to download).
   */
  async importExamFromJson(
    auth: AuthContext,
    courseId: string,
    data: CreateExamDTO,
    jsonUrl: string
  ): Promise<ExamResult> {
    // Check authorization - write access required
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: courseId,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالإضافة' },
      };
    }

    // Verify course exists
    const course = await examRepository.getCourseById(courseId);
    if (!course) {
      return {
        success: false,
        error: { status: 404, message: 'Course not found' },
      };
    }

    // Convert Google Drive file URLs to direct download links
    let fetchUrl = jsonUrl;
    const driveFileMatch = jsonUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFileMatch) {
      fetchUrl = `https://drive.google.com/uc?export=download&id=${driveFileMatch[1]}`;
    }
    // Also handle drive.google.com/open?id=... format
    const driveOpenMatch = jsonUrl.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (driveOpenMatch) {
      fetchUrl = `https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`;
    }
    // Reject Drive folder URLs
    if (/drive\.google\.com\/drive\/folders\//i.test(jsonUrl)) {
      return {
        success: false,
        error: {
          status: 400,
          message: 'الرابط المُعطى هو لمجلد Google Drive وليس لملف. الرجاء تحديد رابط ملف JSON مباشرة.',
        },
      };
    }

    let jsonData: any;
    try {
      const response = await axios.get(fetchUrl, { timeout: 15000 });
      jsonData = response.data;
    } catch (fetchError: any) {
      return {
        success: false,
        error: {
          status: 400,
          message: `فشل تحميل ملف JSON: ${fetchError.message}`,
        },
      };
    }

    // Check if we got HTML instead of JSON (common with Drive links that need auth)
    if (typeof jsonData === 'string') {
      if (jsonData.includes('<!DOCTYPE') || jsonData.includes('<html')) {
        return {
          success: false,
          error: {
            status: 400,
            message: 'الرابط أعاد صفحة HTML بدلاً من ملف JSON. تأكد من أن الملف:\n• متاح للعامة (مشاركة عامة)\n• ليس ملفاً كبيراً يتطلب تأكيد التنزيل',
          },
        };
      }
      // Try to parse string as JSON
      try {
        jsonData = JSON.parse(jsonData);
      } catch {
        return {
          success: false,
          error: {
            status: 400,
            message: 'المحتوى المُحمّل ليس بتنسيق JSON صالح.',
          },
        };
      }
    }

    const parseResult = googleFormJsonSchema.safeParse(jsonData);
    if (!parseResult.success) {
      return {
        success: false,
        error: {
          status: 400,
          message: `تنسيق ملف JSON غير صالح: ${parseResult.error.errors.map(e => e.message).join('، ')}`,
        },
      };
    }

    return this._createExamFromFormData(courseId, data, parseResult.data);
  }

  /**
   * Create an exam and its questions from parsed Google Form data.
   * Shared by both JSON import and direct form URL parsing.
   */
  private async _createExamFromFormData(
    courseId: string,
    data: CreateExamDTO,
    formData: {
      formTitle?: string;
      description?: string;
      questions: Array<{
        title: string;
        type: string;
        points?: number;
        choices?: Array<{ text: string; isCorrect?: boolean }>;
      }>;
    }
  ): Promise<ExamResult> {
    // Use form title if no title is provided
    const examTitle = data.title || formData.formTitle || 'امتحان مستورد';
    const examDescription = data.description || formData.description || '';

    // Non-question item types to skip (from Google Forms export)
    const NON_QUESTION_TYPES = new Set([
      'IMAGE', 'VIDEO', 'PAGE_BREAK', 'SECTION_HEADER',
    ]);

    // Filter out non-question items and items without a title
    const importableQuestions = formData.questions.filter(q => {
      if (!q.title || !q.title.trim()) return false;
      if (NON_QUESTION_TYPES.has(q.type.toUpperCase())) return false;
      return true;
    });

    if (importableQuestions.length === 0) {
      return {
        success: false,
        error: {
          status: 400,
          message: 'لم يتم العثور على أسئلة قابلة للاستيراد في الملف.',
        },
      };
    }

    // Map Google Forms question types to our exam question types
    const mapQuestionType = (gType: string): 'MULTIPLE_CHOICE' | 'TEXT' | 'ESSAY' => {
      switch (gType.toUpperCase()) {
        case 'MULTIPLE_CHOICE':
        case 'CHECKBOX':
        case 'LIST':
          return 'MULTIPLE_CHOICE';
        case 'TEXT':
        case 'SHORT_ANSWER':
          return 'TEXT';
        case 'PARAGRAPH':
        case 'PARAGRAPH_TEXT':
          return 'ESSAY';
        default:
          return 'MULTIPLE_CHOICE';
      }
    };

    // Calculate maxScore from importable questions total points
    const totalPoints = importableQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

    // Create the exam
    const examData: CreateExamDTO = {
      ...data,
      title: examTitle,
      description: examDescription,
      maxScore: data.maxScore || totalPoints,
    };

    const exam = await examRepository.create(examData, courseId);

    // Create all questions
    const questionResults: ExamQuestionWithParsedChoices[] = [];
    for (let i = 0; i < importableQuestions.length; i++) {
      const gq = importableQuestions[i];
      const questionType = mapQuestionType(gq.type);

      let choices: string[] | undefined;
      let correctIndex: number | undefined;

      if (questionType === 'MULTIPLE_CHOICE' && gq.choices && gq.choices.length > 0) {
        choices = gq.choices.map(c => c.text);
        // Find the first correct answer
        const correctChoiceIdx = gq.choices.findIndex(c => c.isCorrect === true);
        correctIndex = correctChoiceIdx >= 0 ? correctChoiceIdx : 0;
      }

      const questionData: CreateExamQuestionDTO = {
        prompt: gq.title,
        type: questionType,
        choices,
        correctIndex,
        points: gq.points || 1,
        order: i,
      };

      const question = await examRepository.createQuestion(questionData, exam.id);
      questionResults.push(question);
    }

    // Validate total course weights (warning, not blocking)
    let weightWarning: string | undefined;
    const [allExams, allHomeworks, allQuizzes, courseWeightData] = await Promise.all([
      prisma.exam.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.homework.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.quiz.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.course.findUnique({ where: { id: courseId }, select: { readingWeight: true } }),
    ]);
    const validation = validateCourseWeights(courseWeightData?.readingWeight || 0, [...allExams, ...allHomeworks, ...allQuizzes]);
    if (!validation.isValid) {
      weightWarning = `إجمالي الأوزان: ${validation.total}% (المتبقي: ${validation.remaining}%)`;
    }

    return {
      success: true,
      data: {
        ...exam,
        questions: questionResults,
        importedCount: questionResults.length,
        weightWarning,
      },
    };
  }

  /**
   * Update an existing exam
   */
  async updateExam(
    auth: AuthContext,
    examId: string,
    data: UpdateExamDTO
  ): Promise<ExamResult> {
    const exam = await examRepository.findById(examId);

    if (!exam) {
      return {
        success: false,
        error: { status: 404, message: 'Exam not found' },
      };
    }

    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: exam.courseId,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالتعديل' },
      };
    }

    const updatedExam = await examRepository.update(examId, data);

    // Validate total course weights (warning, not blocking)
    let weightWarning: string | undefined;
    const courseId = exam.courseId;
    const [allExams, allHomeworks, allQuizzes, courseData] = await Promise.all([
      prisma.exam.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.homework.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.quiz.findMany({ where: { courseId }, select: { weightPercent: true } }),
      prisma.course.findUnique({ where: { id: courseId }, select: { readingWeight: true } }),
    ]);
    const validation = validateCourseWeights(courseData?.readingWeight || 0, [...allExams, ...allHomeworks, ...allQuizzes]);
    if (!validation.isValid) {
      weightWarning = `إجمالي الأوزان: ${validation.total}% (المتبقي: ${validation.remaining}%)`;
    }

    return { success: true, data: { ...updatedExam, weightWarning } };
  }

  /**
   * Delete an exam
   */
  async deleteExam(auth: AuthContext, examId: string): Promise<DeleteResult> {
    const exam = await examRepository.findById(examId);

    if (!exam) {
      return {
        success: false,
        error: { status: 404, message: 'Exam not found' },
      };
    }

    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: exam.courseId,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالحذف' },
      };
    }

    // Clean up related records and delete exam
    await examRepository.delete(examId);
    return { success: true };
  }

  /**
   * Add a question to an exam
   */
  async addQuestion(
    auth: AuthContext,
    examId: string,
    data: CreateExamQuestionDTO,
    allowBonus?: boolean
  ): Promise<QuestionResult> {
    const exam = await examRepository.findExamWithQuestions(examId);

    if (!exam) {
      return {
        success: false,
        error: { status: 404, message: 'Exam not found' },
      };
    }

    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: exam.courseId,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالإضافة' },
      };
    }

    // Calculate total points
    const currentTotal = exam.questions?.reduce((sum, q) => sum + q.points, 0) || 0;
    const newTotal = currentTotal + data.points;

    // Warn if total exceeds maxScore (but allow it for bonus questions)
    if (newTotal > exam.maxScore && !allowBonus) {
      return {
        success: false,
        error: {
          status: 400,
          message: `Total points (${newTotal}) exceeds max score (${exam.maxScore}). Set allowBonus to true to allow bonus questions.`,
        },
      };
    }

    // Set order if not provided
    if (data.order === undefined) {
      data.order = await examRepository.getNextQuestionOrder(examId);
    }

    const question = await examRepository.createQuestion(data, examId);
    return { success: true, data: question };
  }

  /**
   * Update an exam question
   */
  async updateQuestion(
    auth: AuthContext,
    examId: string,
    questionId: string,
    data: UpdateExamQuestionDTO,
    allowBonus?: boolean
  ): Promise<QuestionResult> {
    const exam = await examRepository.findExamWithQuestions(examId);

    if (!exam) {
      return {
        success: false,
        error: { status: 404, message: 'Exam not found' },
      };
    }

    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: exam.courseId,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالتعديل' },
      };
    }

    // Verify question exists
    const currentQuestion = exam.questions?.find((q) => q.id === questionId);
    if (!currentQuestion) {
      return {
        success: false,
        error: { status: 404, message: 'Question not found' },
      };
    }

    // Calculate new total if points changed
    if (data.points !== undefined) {
      const currentTotal = exam.questions?.reduce(
        (sum, q) => sum + (q.id === questionId ? 0 : q.points),
        0
      ) || 0;
      const newTotal = currentTotal + data.points;

      if (newTotal > exam.maxScore && !allowBonus) {
        return {
          success: false,
          error: {
            status: 400,
            message: `Total points (${newTotal}) exceeds max score (${exam.maxScore}). Set allowBonus to true to allow bonus questions.`,
          },
        };
      }
    }

    const question = await examRepository.updateQuestion(questionId, data);
    return { success: true, data: question };
  }

  /**
   * Delete an exam question
   */
  async deleteQuestion(
    auth: AuthContext,
    examId: string,
    questionId: string
  ): Promise<DeleteResult> {
    const exam = await examRepository.findById(examId);

    if (!exam) {
      return {
        success: false,
        error: { status: 404, message: 'Exam not found' },
      };
    }

    // Check authorization
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: exam.courseId,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالحذف' },
      };
    }

    await examRepository.deleteQuestion(questionId);
    return { success: true };
  }

  /**
   * Reorder a question to a new position (1-based).
   * Shifts other questions accordingly.
   */
  async reorderQuestion(
    auth: AuthContext,
    examId: string,
    questionId: string,
    newPosition: number
  ): Promise<ExamResult> {
    const exam = await examRepository.findExamWithQuestions(examId);

    if (!exam) {
      return { success: false, error: { status: 404, message: 'Exam not found' } };
    }

    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: exam.courseId,
    });

    if (!access.allowed) {
      return { success: false, error: { status: 403, message: 'غير مسموح بالتعديل' } };
    }

    const questions = [...(exam.questions || [])].sort((a, b) => a.order - b.order);
    const currentIndex = questions.findIndex(q => q.id === questionId);

    if (currentIndex === -1) {
      return { success: false, error: { status: 404, message: 'Question not found' } };
    }

    const targetIndex = Math.max(0, Math.min(newPosition - 1, questions.length - 1));

    if (currentIndex === targetIndex) {
      return { success: true, data: { message: 'No change needed' } };
    }

    // Remove the question from current position and insert at target
    const [moved] = questions.splice(currentIndex, 1);
    questions.splice(targetIndex, 0, moved);

    // Batch update all orders
    await examRepository.batchUpdateQuestionOrders(
      questions.map((q, i) => ({ id: q.id, order: i }))
    );

    return { success: true, data: { message: 'Question reordered successfully' } };
  }

  /**
   * Get all attempts for an exam (Teacher/Admin only)
   */
  async getExamAttempts(auth: AuthContext, examId: string): Promise<AttemptListResult> {
    const exam = await examRepository.findById(examId);

    if (!exam) {
      return {
        success: false,
        error: { status: 404, message: 'Exam not found' },
      };
    }

    // Check authorization - only teachers and admins
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: exam.courseId,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    const attempts = await examRepository.findAttemptsByExamId(examId);
    return { success: true, data: attempts };
  }

  /**
   * Submit an exam attempt
   */
  async submitExamAttempt(
    auth: AuthContext,
    examId: string,
    data: SubmitExamAttemptDTO
  ): Promise<AttemptResult> {
    const exam = await examRepository.findById(examId, auth.userId);

    if (!exam) {
      return {
        success: false,
        error: { status: 404, message: 'Exam not found' },
      };
    }

    // Validate exam time window
    const now = new Date();
    const startDate = new Date(exam.startDate);
    const endDate = new Date(exam.endDate);

    if (now < startDate) {
      return {
        success: false,
        error: { status: 400, message: 'الامتحان لم يبدأ بعد' },
      };
    }

    if (now > endDate) {
      return {
        success: false,
        error: { status: 400, message: 'انتهى وقت الامتحان' },
      };
    }

    // Check if enrolled (for students)
    if (auth.role === 'STUDENT') {
      const isEnrolled = await examRepository.isUserEnrolled(auth.userId, exam.courseId);
      if (!isEnrolled) {
        return {
          success: false,
          error: { status: 403, message: 'Not enrolled in this course' },
        };
      }

      // Check course completion
      const completion = await examRepository.checkCourseCompletion(exam.courseId, auth.userId);
      if (!completion.allLessonsCompleted) {
        return {
          success: false,
          error: {
            status: 403,
            message: 'يجب إكمال جميع دروس الدورة قبل إجراء الامتحان',
          },
        };
      }
    }

    // Check attempt eligibility (supports retakes for failed students)
    const latestAttempt = await examRepository.findLatestAttempt(examId, auth.userId);
    const attemptCount = latestAttempt ? latestAttempt.attemptNumber : 0;

    if (latestAttempt) {
      // Already passed -- no retake needed
      if (latestAttempt.score !== null && latestAttempt.score >= exam.passingScore) {
        return {
          success: false,
          error: { status: 400, message: 'Exam already attempted' },
        };
      }
      // Max retakes reached
      const maxAttempts = exam.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
      if (maxAttempts !== 0 && attemptCount >= maxAttempts) {
        return {
          success: false,
          error: { status: 400, message: 'Exam already attempted' },
        };
      }
      // Pending grading -- can't retake yet
      if (latestAttempt.status === 'PENDING') {
        return {
          success: false,
          error: { status: 400, message: 'Exam already attempted' },
        };
      }
    }

    const isRetake = attemptCount > 0;
    const attemptNumber = attemptCount + 1;

    // Get questions
    const examWithQuestions = await examRepository.findExamWithQuestions(examId);
    if (!examWithQuestions || !examWithQuestions.questions) {
      return {
        success: false,
        error: { status: 500, message: 'Failed to load exam questions' },
      };
    }

    // Check if exam has open-ended questions
    const hasOpenQuestions = examWithQuestions.questions.some(
      (q) => q.type === 'TEXT' || q.type === 'ESSAY'
    );

    // Calculate raw score for multiple choice questions
    let rawScore = 0;
    let autoGraded = true;

    examWithQuestions.questions.forEach((question) => {
      if (question.type === 'MULTIPLE_CHOICE') {
        const userAnswer = data.answers[question.id];
        if (userAnswer !== undefined && userAnswer === question.correctIndex) {
          rawScore += question.points;
        }
      } else {
        // TEXT or ESSAY questions need manual grading
        autoGraded = false;
      }
    });

    // Determine status
    let status = 'AUTO_GRADED';
    if (hasOpenQuestions) {
      status = 'PENDING'; // Needs manual grading
    }

    // Create attempt
    if (autoGraded) {
      // Fully auto-graded
      rawScore = Math.min(rawScore, exam.maxScore);

      // Apply retake penalty using exam-level setting
      const retakeMultiplier = (exam.retakeScorePercent ?? DEFAULT_RETAKE_SCORE_PERCENT) / 100;
      const effectiveScore = computeEffectiveScore(rawScore, isRetake, exam.retakeScorePercent ?? DEFAULT_RETAKE_SCORE_PERCENT);
      const percentage = (effectiveScore / exam.maxScore) * 100;
      const letterGrade = getLetterGrade(percentage);

      // Store raw score and effective score in attempt
      const attempt = await examRepository.createAttempt(
        examId, auth.userId, data.answers, rawScore, status, attemptNumber, isRetake, effectiveScore
      );

      return {
        success: true,
        data: {
          attempt,
          score: rawScore,
          effectiveScore: isRetake ? effectiveScore : undefined,
          percentage,
          letterGrade,
          status,
          isRetake,
        },
      };
    } else {
      // Needs manual grading
      const attempt = await examRepository.createAttempt(
        examId, auth.userId, data.answers, null, status, attemptNumber, isRetake
      );

      return {
        success: true,
        data: {
          attempt,
          score: null,
          status,
          isRetake,
          message: 'Exam submitted. Awaiting manual grading.',
        },
      };
    }
  }

  /**
   * Grade an exam attempt (for pending attempts with open-ended questions)
   */
  async gradeExamAttempt(
    auth: AuthContext,
    examId: string,
    attemptId: string,
    data: GradeExamAttemptDTO
  ): Promise<AttemptResult> {
    const exam = await examRepository.findExamWithQuestions(examId);

    if (!exam) {
      return {
        success: false,
        error: { status: 404, message: 'Exam not found' },
      };
    }

    // Check authorization - only teachers and admins
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: exam.courseId,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالوصول' },
      };
    }

    const attempt = await examRepository.findAttemptById(attemptId);

    if (!attempt) {
      return {
        success: false,
        error: { status: 404, message: 'Attempt not found' },
      };
    }

    if (attempt.status !== 'PENDING') {
      return {
        success: false,
        error: { status: 400, message: 'This attempt has already been graded' },
      };
    }

    // Calculate score
    let calculatedScore = 0;
    if (data.questionScores && exam.questions) {
      // Calculate from individual question scores
      const answerObj = JSON.parse(attempt.answers);
      exam.questions.forEach((question) => {
        if (question.type === 'MULTIPLE_CHOICE') {
          // Already graded automatically
          const userAnswer = answerObj[question.id];
          if (userAnswer !== undefined && userAnswer === question.correctIndex) {
            calculatedScore += question.points;
          }
        } else {
          // TEXT or ESSAY - use provided score
          const questionScore = data.questionScores![question.id] || 0;
          calculatedScore += Math.min(questionScore, question.points);
        }
      });
    } else if (data.finalScore !== undefined) {
      calculatedScore = data.finalScore;
    } else {
      return {
        success: false,
        error: { status: 400, message: 'Either questionScores or finalScore must be provided' },
      };
    }

    // Add bonus if provided
    const rawScore = Math.min(calculatedScore + (data.bonus || 0), exam.maxScore * 1.5);

    // Apply retake penalty for grade record using exam-level setting
    const retakeMultiplier = (exam.retakeScorePercent ?? DEFAULT_RETAKE_SCORE_PERCENT) / 100;
    const effectiveScore = computeEffectiveScore(rawScore, attempt.isRetake, exam.retakeScorePercent ?? DEFAULT_RETAKE_SCORE_PERCENT);
    const percentage = (effectiveScore / exam.maxScore) * 100;
    const letterGrade = getLetterGrade(percentage);

    // Store raw score and effective score in attempt
    const updated = await examRepository.updateAttemptScore(attemptId, rawScore, 'GRADED', effectiveScore);

    return {
      success: true,
      data: {
        attempt: updated,
        score: rawScore,
        effectiveScore: attempt.isRetake ? effectiveScore : undefined,
        percentage,
        letterGrade,
        status: 'GRADED',
        isRetake: attempt.isRetake,
      },
    };
  }

  /**
   * Update exam attempt score with bonus
   */
  async updateExamAttemptScore(
    auth: AuthContext,
    examId: string,
    attemptId: string,
    data: UpdateExamAttemptScoreDTO
  ): Promise<AttemptResult> {
    const exam = await examRepository.findById(examId);

    if (!exam) {
      return {
        success: false,
        error: { status: 404, message: 'Exam not found' },
      };
    }

    // Check authorization - only teachers and admins
    const access = await authorizationService.checkWriteAccess(auth, {
      type: 'course',
      id: exam.courseId,
    });

    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالتعديل' },
      };
    }

    const attempt = await examRepository.findAttemptById(attemptId);

    if (!attempt) {
      return {
        success: false,
        error: { status: 404, message: 'Attempt not found' },
      };
    }

    const newScore =
      data.finalScore !== undefined
        ? data.finalScore
        : (attempt.score || 0) + (data.bonus || 0);

    // Don't allow raw score to exceed maxScore * 1.5
    const rawScore =
      data.finalScore !== undefined
        ? Math.min(data.finalScore, exam.maxScore * 1.5)
        : Math.min(newScore, exam.maxScore * 1.5);

    // Apply retake penalty for grade record using exam-level setting
    const retakeMultiplier = (exam.retakeScorePercent ?? DEFAULT_RETAKE_SCORE_PERCENT) / 100;
    const effectiveScore = computeEffectiveScore(rawScore, attempt.isRetake, exam.retakeScorePercent ?? DEFAULT_RETAKE_SCORE_PERCENT);
    const percentage = (effectiveScore / exam.maxScore) * 100;
    const letterGrade = getLetterGrade(percentage);

    // Store raw score and effective score in attempt
    const updated = await examRepository.updateAttemptScore(attemptId, rawScore, 'GRADED', effectiveScore);

    return {
      success: true,
      data: {
        attempt: updated,
        score: rawScore,
        effectiveScore: attempt.isRetake ? effectiveScore : undefined,
        percentage,
        letterGrade,
        status: 'GRADED',
        isRetake: attempt.isRetake,
      },
    };
  }
}

/**
 * Singleton instance
 */
export const examManager = new ExamManager();
