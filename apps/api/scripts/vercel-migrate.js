const { execSync } = require('child_process');
require('./ensure-direct-url.js');

/**
 * Prisma migrate waits ~10s for pg_advisory_lock; Neon/serverless often hits P1002 anyway.
 * PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK is supported by Prisma (see env vars reference).
 * Only safe if migrations do not run in parallel — limit concurrent Production deploys on Vercel.
 * To keep locking: set PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=0 in Vercel env.
 */
if (
  process.env.VERCEL_ENV === 'production' &&
  process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK === undefined
) {
  process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = '1';
  console.log(
    '[migrate] PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 for Vercel production (override with =0 if needed)'
  );
}

const sleepSync = (ms) => {
  const sec = Math.max(1, Math.ceil(ms / 1000));
  try {
    if (process.platform === 'win32') {
      execSync(`powershell -Command "Start-Sleep -Seconds ${sec}"`);
    } else {
      execSync(`sleep ${sec}`);
    }
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      /* fallback */
    }
  }
};

function migrateDeployWithRetry(maxAttempts = 4, delayMs = 12000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: process.env,
      });
      return;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        console.warn(
          `[migrate] attempt ${attempt}/${maxAttempts} failed; waiting ${Math.ceil(delayMs / 1000)}s before retry (advisory lock / Neon timeout)...`
        );
        sleepSync(delayMs);
      }
    }
  }
  throw lastError;
}

if (process.env.VERCEL_ENV === 'production') {
  migrateDeployWithRetry();
  console.log('Seeding courses...');
  execSync('npx tsx prisma/old-grades-migrations/seed-courses.ts', { stdio: 'inherit', env: process.env });
  console.log('Seeding old grades...');
  execSync('npx tsx prisma/old-grades-migrations/seed-old-grades.ts', { stdio: 'inherit', env: process.env });
} else {
  console.log('Skipping prisma migrate deploy for non-production Vercel env.');
}

execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
