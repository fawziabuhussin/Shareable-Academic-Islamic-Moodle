import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const courses = [
  { number: '001', title: 'تصويب مفاهيم إسلامية (1)', description: 'فصل 1 - سنة 1' },
  { number: '002', title: 'تصويب مفاهيم إسلامية (2)', description: 'فصل 2 - سنة 1' },
  { number: '003', title: 'تصويب مفاهيم إسلامية (3)', description: 'فصل 1 - سنة 2' },
  { number: '004', title: 'العقيدة الإسلامية (1)', description: 'فصل 1 - سنة 1' },
  { number: '005', title: 'العقيدة الإسلامية (2)', description: 'فصل 2 - سنة 1' },
  { number: '006', title: 'العقيدة الإسلامية (3)', description: 'فصل 1 - سنة 2' },
  { number: '007', title: 'العقيدة الإسلامية (4)', description: 'فصل 4 - سنة 2' },
  { number: '008', title: 'الفقه على مذهب الإمام الشافعي (1)', description: 'فصل 1 - سنة 1' },
  { number: '009', title: 'الفقه على مذهب الإمام الشافعي (2)', description: 'فصل 2 - سنة 1' },
  { number: '010', title: 'الفقه على مذهب الإمام الشافعي (3)', description: 'فصل 1 - سنة 2' },
  { number: '011', title: 'أخلاق أهل القرآن', description: 'فصل 1 - سنة 1' },
  { number: '012', title: 'تفسير القرآن الكريم (1)', description: 'فصل 2 - سنة 1' },
  { number: '013', title: 'تفسير القرآن الكريم (2)', description: 'فصل 2 - سنة 2' },
  { number: '014', title: 'أسماء الله الحسنى (1)', description: 'فصل 1 - سنة 2' },
  { number: '015', title: 'أسماء الله الحسنى (2)', description: 'فصل 2 - سنة 2' },
  { number: '016', title: 'أسماء الله الحسنى (3)', description: 'فصل 3 - سنة 2' },
  { number: '017', title: 'التربية الإسلامية (1)', description: 'فصل 3 - سنة 1' },
  { number: '018', title: 'التربية الإسلامية (2)', description: 'فصل 2 - سنة 2' },
  { number: '019', title: 'السيرة النبوية (1)', description: 'فصل 3 - سنة 1' },
  { number: '020', title: 'السيرة النبوية (2) - وفاة النبي ﷺ', description: 'فصل 3 - سنة 2' },
  { number: '021', title: 'الحديث الشريف (1)', description: 'فصل 3 - سنة 1' },
  { number: '022', title: 'الحديث الشريف (2)', description: 'فصل 2 - سنة 2' },
  { number: '023', title: 'مصطلح الحديث', description: 'فصل 3 - سنة 1' },
  { number: '024', title: 'علوم القرآن الكريم', description: 'فصل 3 - سنة 1' },
  { number: '025', title: 'الخطة البراقة', description: 'فصل 2 - سنة 1' },
  { number: '026', title: 'زاد المربي', description: 'فصل 4 - سنة 1' },
  { number: '027', title: 'فقه الدعوة', description: 'فصل 4 - سنة 1' },
  { number: '028', title: 'الإيمان وشُعَبِهِ', description: 'فصل 3 - سنة 2' },
  { number: '029', title: 'العقيدة الإسلامية (5)', description: 'فصل 4 - سنة 2' },
  { number: '030', title: 'مقارنة أديان', description: 'فصل 4 - سنة 2' },
];

async function main() {
  console.log('🌱 Seeding courses...\n');

  // Find a teacher to assign courses to
  let teacher = await prisma.user.findFirst({
    where: { role: 'TEACHER' },
  });

  if (!teacher) {
    // Fall back to admin if no teacher exists
    teacher = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });
  }

  if (!teacher) {
    console.error('❌ No teacher or admin user found. Please seed users first.');
    process.exit(1);
  }

  console.log(`📌 Using teacher: ${teacher.name} (${teacher.email})\n`);

  // Create a dedicated category for these courses
  let category = await prisma.category.findFirst({
    where: { title: 'العلوم الشرعية' },
  });

  if (!category) {
    // Get the max order to place the new category at the end
    const maxOrder = await prisma.category.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? 0) + 1;

    category = await prisma.category.create({
      data: {
        title: 'العلوم الشرعية',
        description: 'دورات في العلوم الشرعية',
        order: nextOrder,
      },
    });
    console.log('📁 Created category: العلوم الشرعية\n');
  } else {
    console.log('📁 Category already exists: العلوم الشرعية\n');
  }

  let created = 0;
  let skipped = 0;
  const csvRows: string[] = ['CourseNumber,CourseName,Id'];

  for (const course of courses) {
    // Check if course already exists by title
    const existing = await prisma.course.findFirst({
      where: { title: course.title },
    });

    if (existing) {
      console.log(`⏭️  Skipped (already exists): ${course.number} - ${course.title}`);
      csvRows.push(`${course.number},${course.title},${existing.id}`);
      skipped++;
      continue;
    }

    const created_course = await prisma.course.create({
      data: {
        title: course.title,
        description: course.description,
        categoryId: category.id,
        teacherId: teacher.id,
        status: 'DRAFT',
        price: 0,
      },
    });

    console.log(`✅ Created (draft): ${course.number} - ${course.title}`);
    csvRows.push(`${course.number},${course.title},${created_course.id}`);
    created++;
  }

  // Write CSV file
  const csvPath = path.join(__dirname, 'courses-output.csv');
  // Add BOM for proper Arabic display in Excel
  const bom = '\uFEFF';
  fs.writeFileSync(csvPath, bom + csvRows.join('\n'), 'utf-8');
  console.log(`\n📄 CSV written to: ${csvPath}`);

  console.log(`\n🎉 Done! Created ${created} courses, skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
