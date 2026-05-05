/**
 * OldGrade Repository
 * Data access layer for querying old student grades imported from CSV
 */
import { prisma } from '../utils/prisma';

export interface OldGradeRecord {
  id: number;
  grade: number;
  courseNumber: string;
  studentIdNumber: string;
  bonus: number;
  finalGrade: number;
  courseId: string;
}

export class OldGradeRepository {
  /**
   * Find old grade records by matching the last 6 digits of the student's idNumber.
   * The CSV IDs may be shorter than the 9-digit idNumber used in the platform,
   * so we match by suffix (endsWith).
   */
  async findByIdNumberSuffix(idNumber: string): Promise<OldGradeRecord[]> {
    // Extract last 6 digits for suffix matching
    const suffix = idNumber.slice(-6);

    return prisma.oldGrade.findMany({
      where: {
        studentIdNumber: {
          endsWith: suffix,
        },
      },
    });
  }
}

/**
 * Singleton instance
 */
export const oldGradeRepository = new OldGradeRepository();
