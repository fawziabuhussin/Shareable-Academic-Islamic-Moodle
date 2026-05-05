import type { Metadata } from 'next';
import Link from 'next/link';
import { BookIcon } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'من نحن',
  description:
    'رسالة معهد زاد الهداية وأهدافه في نشر العلم الشرعي على منهج الكتاب والسنّة، والدعوة بالحكمة والموعظة الحسنة.',
  openGraph: {
    title: 'من نحن | زاد الهداية',
    description: 'رسالة المعهد وأهدافه في طلب العلم والدعوة',
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7]">
      <div className="relative bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'url(/islamic-bg.png)',
            backgroundSize: '380px',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center ring-1 ring-white/15 shrink-0">
                <BookIcon className="text-[#c9a227]" size={26} />
              </div>
              <div>
                <p className="text-[#c9a227]/90 text-sm font-medium mb-1">معهد زاد الهداية</p>
                <h1 className="text-2xl sm:text-3xl font-bold">من نحن</h1>
                <p className="mt-2 text-white/75 text-sm sm:text-base max-w-2xl leading-relaxed">
                  كلمة عن منهجنا في طلب العلم والدعوة، وما نصبو إليه من أهداف سامية بإذن الله.
                </p>
              </div>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center self-start sm:self-center px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 border border-white/20 transition"
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <article className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-10 md:p-12 space-y-6 text-[1.05rem] sm:text-lg leading-[1.9] text-stone-700">
            <p className="first-letter:text-3xl first-letter:font-bold first-letter:text-[#1a3a2f] first-letter:float-right first-letter:ml-2 first-letter:leading-none">
              إنّ الحمد لله نحمده ونستعينه ونستغفره، ونعوذ بالله من شرور أنفسنا، وسيّئات أعمالنا، من يهده الله فلا مضلّ له،
              ومن يضلل فلا هادي له، وأشهد أن لا إله إلا الله وحده لا شريك له، وأشهد أن محمداً عبده ورسوله.
            </p>

            <blockquote className="border-r-[3px] border-[#c9a227] pr-4 py-3 text-[#1a3a2f] bg-gradient-to-l from-[#1a3a2f]/[0.06] to-transparent rounded-r-lg rounded-l-md">
              &ldquo;يَا أَيُّهَا الَّذِينَ آمَنُواْ اتَّقُواْ اللّهَ حَقَّ تُقَاتِهِ وَلاَ تَمُوتُنَّ إِلاَّ وَأَنتُم مُّسْلِمُونَ&rdquo; — آل عمران (102).
            </blockquote>

            <blockquote className="border-r-[3px] border-[#c9a227] pr-4 py-3 text-[#1a3a2f] bg-gradient-to-l from-[#1a3a2f]/[0.06] to-transparent rounded-r-lg rounded-l-md">
              &ldquo;يَا أَيُّهَا النَّاسُ اتَّقُواْ رَبَّكُمُ الَّذِي خَلَقَكُم مِّن نَّفْسٍ وَاحِدَةٍ وَخَلَقَ مِنْهَا زَوْجَهَا وَبَثَّ
              مِنْهُمَا رِجَالاً كَثِيرًا وَنِسَاء وَاتَّقُواْ اللّهَ الَّذِي تَسَاءلُونَ بِهِ وَالأَرْحَامَ إِنَّ اللّهَ كَانَ
              عَلَيْكُمْ رَقِيبًا&rdquo; — النساء (1).
            </blockquote>

            <p>
              أمّا بعد، فإنّ أصدق الحديث كتاب الله تعالى، وخير الهَدي هَدي محمد صلى الله عليه وسلَّم، وشرّ الأمور محدثاتها،
              وكلّ محدثة بدعة، وكلّ بدعة ضلالة، وكلّ ضلالة في النار.
            </p>

            <p>
              فإنّ من أعظم نعم الله سبحانه على المسلمين نعمة الإسلام، فهي نعمة فوق كل نعمة، وفضل لا يساويه فضل، فبالإسلام
              نجاة الناس في الدنيا والآخرة، قال سبحانه:
            </p>

            <blockquote className="border-r-[3px] border-[#c9a227] pr-4 py-3 text-[#1a3a2f] bg-gradient-to-l from-[#1a3a2f]/[0.06] to-transparent rounded-r-lg rounded-l-md">
              &ldquo;يَا أَيُّهَا الَّذِينَ آمَنُواْ اسْتَجِيبُواْ لِلّهِ وَلِلرَّسُولِ إِذَا دَعَاكُم لِمَا يُحْيِيكُمْ
              وَاعْلَمُواْ أَنَّ اللّهَ يَحُولُ بَيْنَ الْمَرْءِ وَقَلْبِهِ وَأَنَّهُ إِلَيْهِ تُحْشَرُونَ&rdquo; — الأنفال (24).
            </blockquote>

            <p>
              فإن الحياة الحقة هي حياة القلوب بالإيمان، فبحياة القلب يستبصر الإنسان الحقائق حوله، ويعلم حقيقة وجوده على هذه
              الأرض، ومن غير حياة قلبه موته وهلاكه، قال تعالى:
            </p>

            <blockquote className="border-r-[3px] border-[#c9a227] pr-4 py-3 text-[#1a3a2f] bg-gradient-to-l from-[#1a3a2f]/[0.06] to-transparent rounded-r-lg rounded-l-md">
              &ldquo;أَفَلَمْ يَسِيرُوا فِي الْأَرْضِ فَتَكُونَ لَهُمْ قُلُوبٌ يَعْقِلُونَ بِهَا أَوْ آذَانٌ يَسْمَعُونَ بِهَا
              فَإِنَّهَا لَا تَعْمَى الْأَبْصَارُ وَلَكِن تَعْمَى الْقُلُوبُ الَّتِي فِي الصُّدُورِ&rdquo; — الحج (46).
            </blockquote>

            <p>
              فكم من حي قد عميت بصيرته، وتشتت مآربه، فأصبح أعمى وهو يظن نفسه بصيراً، وكم من تائه أرشد غيره إلى الغيّ
              والهوى، قال تعالى:
            </p>

            <blockquote className="border-r-[3px] border-[#c9a227] pr-4 py-3 text-[#1a3a2f] bg-gradient-to-l from-[#1a3a2f]/[0.06] to-transparent rounded-r-lg rounded-l-md">
              &ldquo;الَّذِينَ ضَلَّ سَعْيُهُمْ فِي الْحَيَاةِ الدُّنْيَا وَهُمْ يَحْسَبُونَ أَنَّهُمْ يُحْسِنُونَ
              صُنْعًا&rdquo; — الكهف (104).
            </blockquote>

            <p>
              وإن من أعظم النعم على المسلمين هي نعمة الفهم، إذ مَن فهم الإسلام وعمل وفق المشروع كان من الذين يدخلون الجنة من
              غير حساب ولا عذاب قال سبحانه:
            </p>

            <blockquote className="border-r-[3px] border-[#c9a227] pr-4 py-3 text-[#1a3a2f] bg-gradient-to-l from-[#1a3a2f]/[0.06] to-transparent rounded-r-lg rounded-l-md">
              &ldquo;الَّذِينَ آمَنُواْ وَلَمْ يَلْبِسُواْ إِيمَانَهُم بِظُلْمٍ أُوْلَئِكَ لَهُمُ الأَمْنُ وَهُم مُّهْتَدُونَ&rdquo;
              — الانعام (82).
            </blockquote>

            <p>
              على خلاف من أسلم ولم يلتزم حقيقة المراد، فقد يكون من الهالكين، خاصة إن كان ضلاله فيما يتعلق بأمور العقيدة
              والمنهج، لذا كان فهم الإسلام، والعمل بمقتضى هذا الفهم، من أبرز ما أنعم الله به على المؤمنين، وعليه تقوم الدعوة
              إلى الله سبحانه التي هي أصل في الإسلام، فالدعوة إلى الله عزَّ وجلَّ من آكد الواجبات، وأفضل القربات، إذ هي وظيفة
              الأنبياء، ومهمّة ورثتهم من العلماء، وبها يثبت الإيمان وتحفظ الأديان ويبلّغ القرآن، وهي الطريق إلى إصلاح
              البلاد، وصلاح العباد في المعاش والمعاد، وذلك بإخراجهم من عبادة الخلق إلى عبادة الحقّ، ومن ظلمات الشرك والعصيان إلى
              نور التوحيد والإيمان. وقد أمر الله تعالى بها في كتابه فقال:
            </p>

            <blockquote className="border-r-[3px] border-[#c9a227] pr-4 py-3 text-[#1a3a2f] bg-gradient-to-l from-[#1a3a2f]/[0.06] to-transparent rounded-r-lg rounded-l-md">
              &ldquo;ادْعُ إِلِى سَبِيلِ رَبِّكَ بِالْحِكْمَةِ وَالْمَوْعِظَةِ الْحَسَنَةِ وَجَادِلْهُم بِالَّتِي هِيَ أَحْسَنُ
              إِنَّ رَبَّكَ هُوَ أَعْلَمُ بِمَن ضَلَّ عَن سَبِيلِهِ وَهُوَ أَعْلَمُ بِالْمُهْتَدِينَ&rdquo; — النحل (125)
            </blockquote>

            <p>وقال تعالى:</p>

            <blockquote className="border-r-[3px] border-[#c9a227] pr-4 py-3 text-[#1a3a2f] bg-gradient-to-l from-[#1a3a2f]/[0.06] to-transparent rounded-r-lg rounded-l-md">
              &ldquo;وَلْتَكُن مِّنكُمْ أُمَّةٌ يَدْعُونَ إِلَى الْخَيْرِ وَيَأْمُرُونَ بِالْمَعْرُوفِ وَيَنْهَوْنَ عَنِ
              الْمُنكَرِ وَأُوْلَئِكَ هُمُ الْمُفْلِحُونَ&rdquo; — آل عمران (104)
            </blockquote>

            <p>وأمر سبحانه نبيّه محمداً أن يخبر أن سبيله الدعوة إلى الله، فقال:</p>

            <blockquote className="border-r-[3px] border-[#c9a227] pr-4 py-3 text-[#1a3a2f] bg-gradient-to-l from-[#1a3a2f]/[0.06] to-transparent rounded-r-lg rounded-l-md">
              &ldquo;قُلْ هَذِهِ سَبِيلِي أَدْعُو إِلَى اللّهِ عَلَى بَصِيرَةٍ أَنَاْ وَمَنِ اتَّبَعَنِي وَسُبْحَانَ اللّهِ وَمَا
              أَنَاْ مِنَ الْمُشْرِكِينَ&rdquo; — يوسف (108)
            </blockquote>

            <p>
              فمن دعا إلى الله تعالى فهو على سبيل رسوله صلى الله عليه وسلَّم، وهو على بصيرة، وهو من أتباعه.
            </p>

            <p>وأخبر تعالى أنّ الدعوة إلى الله من أفضل الأعمال وأعظمها نفعًا للعبد في الدنيا والآخرة فقال:</p>

            <blockquote className="border-r-[3px] border-[#c9a227] pr-4 py-3 text-[#1a3a2f] bg-gradient-to-l from-[#1a3a2f]/[0.06] to-transparent rounded-r-lg rounded-l-md">
              &ldquo;وَمَنْ أَحْسَنُ قَوْلًا مِّمَّن دَعَا إِلَى اللَّهِ وَعَمِلَ صَالِحًا وَقَالَ إِنَّنِي مِنَ
              الْمُسْلِمِينَ&rdquo; — فصلت (33).
            </blockquote>

            <p>وقد قال النبي صلى الله عليه وسلَّم لعلي بن أبي طالب رضي الله عنه:</p>

            <blockquote className="border-r-[3px] border-[#c9a227] pr-4 py-3 text-[#1a3a2f] bg-gradient-to-l from-[#1a3a2f]/[0.06] to-transparent rounded-r-lg rounded-l-md">
              &ldquo;فَوَالله لأَنْ يَهْدِيَ اللهُ بِكَ رَجُلاً وَاحِدًا خَيْرٌ لَكَ مِنْ أَنْ يَكُونَ لَكَ حُمْرُ
              النَّعَمِ&rdquo; <span className="text-stone-500 text-base not-italic">(متفق عليه)</span>
            </blockquote>

            <p>
              وهذا يدلّ على فضل الدعوة وشرف أهلها، بحيث إذا اهتدى رجل واحد على يد داعية كان ذلك خيرًا له من حمر النعم –وهي
              خيارها وأشرفها عند أهلها– فما بالك لو اهتدى على يديه جمع من الناس، وفي ذلك فليتنافس المتنافسون.
            </p>

            <p>وأخبر صلى الله عليه وسلم أنّ من دعى إلى هدى كان له مثل أجور متابعيه فقال:</p>

            <blockquote className="border-r-[3px] border-[#c9a227] pr-4 py-3 text-[#1a3a2f] bg-gradient-to-l from-[#1a3a2f]/[0.06] to-transparent rounded-r-lg rounded-l-md">
              &ldquo;مَنْ دَعَا إِلَى هُدًى كَانَ لَهُ مِنْ الأَجْرِ مِثْلُ أُجُورِ مَنْ تَبِعَهُ لا يَنْقُصُ ذَلِكَ مِنْ
              أُجُورِهِمْ شَيْئًا&rdquo; <span className="text-stone-500 text-base not-italic">[رواه مسلم]</span>
            </blockquote>

            <p>ونصوص الكتاب والسنّة في فضل الدعوة، والحثّ على القيام بها كثيرة ومعلومة.</p>

            <p>
              وممّا لاشكّ فيه أنّ للدعوة وسائل كثيرة وطرقًا متنوعة من الخطابة والتعليم والكتابة وغيرها، وقد يسّر الله تعالى
              لنا في الوقت الحاضر هذه الوسيلة وهي عبارة عن موقع هادف، هدفه: نشر رسالة الإسلام الصحيح بالدليل الصريح، وإصلاح
              ما علق به من الفساد والطلاح في مجال التوحيد والعبادة والمنهج والسلوك وغيرها، وقد أضحت اليوم من الضروري الاهتمام
              بها، وتسخيرها في خدمة الدعوة الصحيحة، لاسيما وقد اشتدّت حاجة الناس إلى فهم الإسلام فهماً سليماً من غير إفراط ولا
              تفريط، في ظلّ هذه الصحوة العلمية المباركة، وانتشار الإسلام ودخول الناس في دين الله أفواجاً.
            </p>

            <div className="pt-4 pb-2">
              <h2 className="text-xl font-bold text-[#1a3a2f] border-b border-[#c9a227]/50 pb-2 inline-block">
                أهدافنا في هذه المنصة
              </h2>
            </div>

            <p className="text-stone-600">وقد جعلنا نصب أعيننا أهدافاً منها:</p>

            <ol className="list-decimal list-outside pr-6 sm:pr-8 space-y-4 marker:text-[#c9a227] marker:font-bold">
              <li>
                الدعوة إلى الاعتصام بالكتاب والسنّة على فهم الصحابة والتابعين ومن تبعهم بإحسان إلى يوم الدين.
              </li>
              <li>
                إصلاح الشوائب التي علقت عند بعض المسلمين في العقائد والعبادات والأخلاق والمعاملات، بأسلوب علمي أصيل، وبتوجيه
                مبنيٍّ على قوله تعالى: &ldquo;ادْعُ إِلِى سَبِيلِ رَبِّكَ بِالْحِكْمَةِ وَالْمَوْعِظَةِ الْحَسَنَةِ وَجَادِلْهُم
                بِالَّتِي هِيَ أَحْسَنُ إِنَّ رَبَّكَ هُوَ أَعْلَمُ بِمَن ضَلَّ عَن سَبِيلِهِ وَهُوَ أَعْلَمُ بِالْمُهْتَدِينَ&rdquo;
                النحل (125).
              </li>
              <li>
                الحرص على تجسيد معنى الأمانة في العلم والعمل، وترسيخ مفهوم الاعتدال والوسطية من غير إفراط ولا تفريط.
              </li>
              <li>
                الدفاع عن دعوتنا المباركة بلسان صدق، يوضّح الحقّ، ويزهق الباطل بالحجّة والبرهان، عملا بقوله تعالى: &ldquo;قُلْ
                هَذِهِ سَبِيلِي أَدْعُو إِلَى اللّهِ عَلَى بَصِيرَةٍ أَنَاْ وَمَنِ اتَّبَعَنِي وَسُبْحَانَ اللّهِ وَمَا أَنَاْ مِنَ
                الْمُشْرِكِينَ&rdquo; يوسف (108).
              </li>
              <li>
                تبصير المسلمين عامه والشباب خاصة بمعنى الإسلام الصحيح، وذلك بتبصيرهم بأحكام الشريعة وتعاليمها الصحيحة،
                ومزاياها العظيمة؛ وحثّهم على التحلّي بفضائلها وآدابها.
              </li>
              <li>
                فتح المجال لكل الأقلام السوية لنشر ما جادت به قرائحهم من بحوث ودراسات ومقالات، ونشر محاضراتهم ودروسهم حتى
                يستفيد منها الجميع.
              </li>
              <li>
                جعل الموقع وسيلة لتأليف القلوب، وتوحيد الكلمة، ونبذ أسباب الفرقة والاختلاف، راجين من الله العليّ القدير أن
                نكون ممن قال جلّ وعلا في حقّهم: &ldquo;وَهُدُوا إِلَى الطَّيِّبِ مِنَ الْقَوْلِ وَهُدُوا إِلَى صِرَاطِ
                الْحَمِيدِ&rdquo; الحج (24).
              </li>
            </ol>

            <p className="pt-6 text-center font-semibold text-[#1a3a2f] text-lg leading-relaxed border-t border-stone-100 mt-8 pt-8">
              هذا ونسأل الله العظيم أن يلهمنا رشدنا ويسدد خُطانا ويقينا شر أنفسنا وآخر دعوانا أن الحمد لله رب العالمين.
            </p>
          </div>

          <div className="bg-gradient-to-l from-[#1a3a2f] to-[#0d2b24] px-6 py-8 sm:px-10 text-center">
            <p className="text-white/90 text-sm sm:text-base mb-5 max-w-lg mx-auto leading-relaxed">
              نرحب بأسئلتكم وملاحظاتكم. كما يمكنكم الاطلاع على دوراتنا والتسجيل عبر المنصة.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex justify-center px-6 py-3 rounded-xl bg-[#c9a227] text-white font-medium hover:bg-[#b08f20] transition"
              >
                تواصل معنا
              </Link>
              <Link
                href="/courses"
                className="inline-flex justify-center px-6 py-3 rounded-xl bg-white/10 text-white font-medium border border-white/25 hover:bg-white/20 transition"
              >
                استعرض الدورات
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
