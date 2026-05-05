import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

const firstNames = [
  'أحمد', 'محمد', 'يوسف', 'عمر', 'خالد', 'إبراهيم', 'حسن', 'علي', 'سعيد', 'عبدالله',
  'فاطمة', 'عائشة', 'زينب', 'مريم', 'نور', 'سارة', 'هدى', 'ليلى', 'أمينة', 'رقية',
  'عبدالرحمن', 'طارق', 'ياسر', 'بلال', 'أنس', 'زيد', 'حمزة', 'سلمان', 'ماجد', 'فيصل',
];

const fatherNames = [
  'محمد', 'عبدالله', 'أحمد', 'عمر', 'خالد', 'حسن', 'إبراهيم', 'سعيد', 'علي', 'يوسف',
  'عبدالعزيز', 'عبدالرحمن', 'صالح', 'ناصر', 'سليمان',
];

const familyNames = [
  'الحسن', 'العمري', 'الخطيب', 'السعيد', 'الأحمد', 'الشيخ', 'النجار', 'القاسم', 'البكري', 'العلي',
  'المنصور', 'الحربي', 'الغامدي', 'الدوسري', 'الشمري', 'العتيبي', 'المطيري', 'الزهراني', 'القحطاني', 'الرشيدي',
];

const professions = [
  'طالب جامعي', 'مهندس', 'طبيب', 'معلم', 'محاسب',
  'موظف حكومي', 'طالب ثانوي', 'تاجر', 'مبرمج', 'صيدلي',
];

const locations = [
  'الأردن', 'فلسطين', 'مصر', 'السعودية', 'العراق',
  'سوريا', 'لبنان', 'الإمارات', 'الكويت', 'تونس',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(startYear: number, endYear: number): Date {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start));
}

function randomPhone(): string {
  const prefix = '+9725';
  const rest = String(Math.floor(Math.random() * 90000000) + 10000000);
  return prefix + rest;
}

async function main() {
  console.log('🌱 Seeding 60 random students...');

  const password = await hashPassword('student123');

  for (let i = 1; i <= 60; i++) {
    const firstName = pick(firstNames);
    const fatherName = pick(fatherNames);
    const familyName = pick(familyNames);
    const gender = ['فاطمة', 'عائشة', 'زينب', 'مريم', 'نور', 'سارة', 'هدى', 'ليلى', 'أمينة', 'رقية'].includes(firstName)
      ? 'FEMALE'
      : 'MALE';

    const email = `student${i}@example.com`;

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${firstName} ${fatherName} ${familyName}`,
        firstName,
        fatherName,
        familyName,
        email,
        passwordHash: password,
        role: 'STUDENT',
        dateOfBirth: randomDate(1990, 2005),
        phone: randomPhone(),
        profession: pick(professions),
        gender,
        idNumber: String(Math.floor(Math.random() * 900000000) + 100000000),
        location: pick(locations),
        profileComplete: true,
      },
    });

    process.stdout.write(`\r  Created ${i}/60`);
  }

  console.log('\n✅ 60 students seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
