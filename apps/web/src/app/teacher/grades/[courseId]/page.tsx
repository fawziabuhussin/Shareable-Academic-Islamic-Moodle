'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { navigateTo } from '@/lib/navigation';
import CourseGradesView from '@/components/CourseGradesView';

export default function TeacherCourseGradesPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { navigateTo('/login', router); return; }
    const user = JSON.parse(userStr);
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') { navigateTo('/dashboard', router); return; }
  }, [router]);

  return (
    <CourseGradesView
      courseId={courseId}
      coursesListApi="/courses/teacher/my-courses"
      backHref="/teacher/grades"
      courseEditHref={"/teacher/courses/" + courseId + "/edit"}
    />
  );
}
