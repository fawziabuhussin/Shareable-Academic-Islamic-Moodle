/**
 * Shared enrollment utilities.
 */

/** Minimal shape needed for completion checks. */
export interface EnrollmentCompletionFields {
  finalScore: number | null;
  overrideScore: number | null;
  finalizedAt: string | null;
}

export type EnrollmentStatus = 'enrolled' | 'completed' | null;

/**
 * A course is completed only when grades have been finalized
 * (i.e. `finalizedAt`, `finalScore`, or `overrideScore` is set).
 */
export function isEnrollmentCompleted(enrollment: EnrollmentCompletionFields): boolean {
  return !!(enrollment.finalizedAt || enrollment.finalScore !== null || enrollment.overrideScore !== null);
}

/**
 * Returns the enrollment status for display purposes.
 * Returns `null` if the enrollment is falsy.
 */
export function getEnrollmentStatus(enrollment: EnrollmentCompletionFields | null | undefined): EnrollmentStatus {
  if (!enrollment) return null;
  return isEnrollmentCompleted(enrollment) ? 'completed' : 'enrolled';
}
