import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Parse a CSV file and return rows as arrays of strings.
 * Handles BOM (byte order mark) in the first header field.
 */
function parseCsv(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
  return lines.map((line) => line.split(',').map((cell) => cell.replace(/^\uFEFF/, '').trim()));
}

async function main() {
  console.log('🌱 Seeding old grades...\n');

  // 1. Parse courses-output.csv to build courseNumber → courseId map
  const coursesOutputPath = path.join(__dirname, 'courses-output.csv');
  if (!fs.existsSync(coursesOutputPath)) {
    console.error('❌ courses-output.csv not found. Please run seed-courses.ts first.');
    process.exit(1);
  }

  const coursesRows = parseCsv(coursesOutputPath);
  const courseMap = new Map<string, string>(); // courseNumber → courseId
  // Skip header row
  for (let i = 1; i < coursesRows.length; i++) {
    const [courseNumber, , courseId] = coursesRows[i];
    if (courseNumber && courseId) {
      courseMap.set(courseNumber, courseId);
    }
  }
  console.log(`📚 Loaded ${courseMap.size} course mappings from courses-output.csv`);

  // 2. Parse OldGrades.csv
  const oldGradesPath = path.join(__dirname, 'OldGrades.csv');
  if (!fs.existsSync(oldGradesPath)) {
    console.error('❌ OldGrades.csv not found.');
    process.exit(1);
  }

  const gradesRows = parseCsv(oldGradesPath);
  // Header: Grade,CourseNumber,ID,Bonus,FinalGrade
  const gradeRecords: Array<{
    grade: number;
    courseNumber: string;
    studentIdNumber: string;
    bonus: number;
    finalGrade: number;
    courseId: string;
  }> = [];

  let skippedInvalid = 0;
  let skippedNoCourse = 0;

  for (let i = 1; i < gradesRows.length; i++) {
    const [gradeStr, courseNumber, studentId, bonusStr, finalGradeStr] = gradesRows[i];

    // Skip rows with empty or invalid grade/finalGrade
    const grade = parseInt(gradeStr, 10);
    const finalGrade = parseInt(finalGradeStr, 10);
    const bonus = parseInt(bonusStr, 10) || 0;

    if (isNaN(grade) || isNaN(finalGrade) || !studentId || !courseNumber) {
      console.warn(`⚠️  Invalid row ${i}: Grade=${gradeStr}, CourseNumber=${courseNumber}, ID=${studentId}, Bonus=${bonusStr}, FinalGrade=${finalGradeStr}`);
      skippedInvalid++;
      continue;
    }

    // Cap finalGrade at 100
    const cappedFinalGrade = Math.min(finalGrade, 100);

    const courseId = courseMap.get(courseNumber);
    if (!courseId) {
      skippedNoCourse++;
      continue;
    }

    gradeRecords.push({
      grade,
      courseNumber,
      studentIdNumber: studentId,
      bonus,
      finalGrade: cappedFinalGrade,
      courseId,
    });
  }

  console.log(`📊 Parsed ${gradeRecords.length} valid grade records`);
  if (skippedInvalid > 0) console.log(`⚠️  Skipped ${skippedInvalid} invalid rows`);
  if (skippedNoCourse > 0) console.log(`⚠️  Skipped ${skippedNoCourse} rows with unknown course numbers`);

  // 3. Insert into OldGrade table using createMany with skipDuplicates
  if (gradeRecords.length > 0) {
    // Batch in chunks of 100 to avoid overly large queries
    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let i = 0; i < gradeRecords.length; i += BATCH_SIZE) {
      const batch = gradeRecords.slice(i, i + BATCH_SIZE);
      const result = await prisma.oldGrade.createMany({
        data: batch,
        skipDuplicates: true,
      });
      inserted += result.count;
    }

    console.log(`\n✅ Inserted ${inserted} new old grade records (duplicates skipped)`);
  } else {
    console.log('\n⚠️  No valid grade records to insert');
  }

  // 4. Summary
  const total = await prisma.oldGrade.count();
  console.log(`📈 Total old grade records in database: ${total}`);
  console.log('\n🎉 Old grades seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
