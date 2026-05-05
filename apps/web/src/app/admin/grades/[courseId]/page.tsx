'use client';

import { useParams } from 'next/navigation';
import CourseGradesView from '@/components/CourseGradesView';

export default function AdminCourseGradesPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  return (
    <CourseGradesView
      courseId={courseId}
      coursesListApi="/courses/admin"
      backHref="/admin/grades"
      courseEditHref={"/admin/courses/" + courseId + "/edit"}
    />
  );
}
