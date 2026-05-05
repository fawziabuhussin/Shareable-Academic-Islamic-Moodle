import { BookIcon } from '@/components/Icons';

export default function InstitutePage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <BookIcon className="text-white" size={20} />
            </div>
            <h1 className="text-2xl font-bold">مميزات</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-stone-200 p-8 sm:p-12 space-y-6 text-lg leading-loose text-stone-700">
          <p>
            تلتزم كلية زاد الهداية التابعة لنادي هداية بتقديم تعليم إسلامي عالي الجودة وفقًا للقرآن الكريم وسنة النبي محمد (صلى الله عليه وسلم) لمجموعة متنوعة من الطلاب في فلسطين الداخل.
          </p>
        </div>
      </div>
    </div>
  );
}
