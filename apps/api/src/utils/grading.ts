/**
 * Grading utility functions for Zad Al-Hidaya Academy Platform.
 * All functions are pure, deterministic, and have no database dependencies.
 */

/**
 * Convert a percentage score to a letter grade.
 */
export function getLetterGrade(percentage: number): string {
  if (percentage >= 90) return 'ممتاز';
  if (percentage >= 80) return 'جيد جدا';
  if (percentage >= 70) return 'جيد';
  if (percentage >= 60) return 'مقبول';
  return 'راسب';
}

/**
 * Compute the effective score after applying retake penalty.
 * First attempt: returns rawScore unchanged.
 * Retake: returns rawScore * (retakeScorePercent / 100).
 */
export function computeEffectiveScore(
  rawScore: number,
  isRetake: boolean,
  retakeScorePercent: number
): number {
  if (!isRetake) return rawScore;
  return rawScore * (retakeScorePercent / 100);
}

export interface GradeItem {
  score: number;
  maxScore: number;
  weightPercent: number;
}

export interface WeightedGradeResult {
  /** Weighted percentage based on graded items only (0-100 scale) */
  percentage: number;
  /** How much of the total 100% weight has been graded so far */
  weightCovered: number;
}

/**
 * Compute the weighted average from ONLY graded items.
 * Returns both the projected percentage and how much of the total weight has been graded.
 * The percentage is normalized to the weight covered, NOT the total 100%.
 */
export function computeWeightedGrade(
  items: GradeItem[],
  readingWeight: number,
  lessonCompletionPercent: number
): WeightedGradeResult {
  let totalWeightedScore = 0;
  let weightCovered = 0;

  // Add reading/progress component (always "graded" — it's the lesson completion %)
  if (readingWeight > 0) {
    totalWeightedScore += (lessonCompletionPercent / 100) * readingWeight;
    weightCovered += readingWeight;
  }

  // Add graded assessment items
  for (const item of items) {
    if (item.maxScore > 0 && item.weightPercent > 0) {
      const itemPercentage = (item.score / item.maxScore) * 100;
      totalWeightedScore += (itemPercentage / 100) * item.weightPercent;
      weightCovered += item.weightPercent;
    }
  }

  // The percentage is relative to the total weight covered
  // If only 60% of weight is covered, we scale proportionally
  const percentage = weightCovered > 0 ? (totalWeightedScore / weightCovered) * 100 : 0;

  return { percentage, weightCovered };
}

/**
 * Compute the absolute final weighted score.
 * This should only be used when all weights sum to 100% (at finalization time).
 * Returns the final percentage (0-100).
 */
export function computeFinalScore(
  items: GradeItem[],
  readingWeight: number,
  lessonCompletionPercent: number
): number {
  let totalWeightedScore = 0;

  if (readingWeight > 0) {
    totalWeightedScore += (lessonCompletionPercent / 100) * readingWeight;
  }

  for (const item of items) {
    if (item.maxScore > 0 && item.weightPercent > 0) {
      const itemPercentage = (item.score / item.maxScore) * 100;
      totalWeightedScore += (itemPercentage / 100) * item.weightPercent;
    }
  }

  return totalWeightedScore;
}

/**
 * Get the effective score for an enrollment, preferring override over computed final score.
 */
export function getEffectiveEnrollmentScore(
  finalScore: number | null,
  overrideScore: number | null
): number | null {
  if (overrideScore !== null && overrideScore !== undefined) return overrideScore;
  return finalScore;
}

export interface WeightValidationResult {
  total: number;
  isValid: boolean;
  remaining: number;
}

/**
 * Validate that course weights (reading + all assessments) sum to 100%.
 */
export function validateCourseWeights(
  readingWeight: number,
  assessments: { weightPercent: number }[]
): WeightValidationResult {
  const assessmentTotal = assessments.reduce((sum, a) => sum + a.weightPercent, 0);
  const total = readingWeight + assessmentTotal;
  return {
    total,
    isValid: Math.abs(total - 100) < 0.01, // floating point tolerance
    remaining: 100 - total,
  };
}

/**
 * Compute the arithmetic average from an array of finalized enrollment percentages.
 * Returns a value between 0 and 100.
 */
export function computeAverage(percentages: number[]): number {
  if (percentages.length === 0) return 0;
  const total = percentages.reduce((sum, pct) => sum + pct, 0);
  return total / percentages.length;
}
