'use client';

import AllCoursesGradesView from '@/components/AllCoursesGradesView';

export default function AdminAllGradesPage() {
  return (
    <AllCoursesGradesView
      backHref="/admin/grades"
      courseDetailHrefPrefix="/admin/grades"
    />
  );
}
