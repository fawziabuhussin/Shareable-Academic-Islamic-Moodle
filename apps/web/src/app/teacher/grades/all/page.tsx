'use client';

import AllCoursesGradesView from '@/components/AllCoursesGradesView';

export default function TeacherAllGradesPage() {
  return (
    <AllCoursesGradesView
      backHref="/teacher/grades"
      courseDetailHrefPrefix="/teacher/grades"
    />
  );
}
