'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function TeacherCoursePage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (courseId) {
      router.replace(`/teacher/courses/${courseId}/edit`);
    }
  }, [params.id, router]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a3a2f]"></div>
    </div>
  );
}
