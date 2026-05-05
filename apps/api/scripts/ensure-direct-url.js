const path = require('path');
const fs = require('fs');

// Prisma CLI loads .env from apps/api; plain Node scripts do not — load so DATABASE_URL is visible.
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
} catch {
  /* optional */
}

/**
 * Prisma migrations use PostgreSQL advisory locks; Neon pooler often cannot acquire them in time.
 * Set DIRECT_URL to a non-pooler host for migrate/generate when only DATABASE_URL (pooled) is set.
 * @see https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#direct-database-url
 */
function ensureDirectUrl() {
  if (process.env.DIRECT_URL && process.env.DIRECT_URL.trim() !== '') {
    return;
  }
  const u = process.env.DATABASE_URL;
  if (!u || u.trim() === '') {
    return;
  }
  if (u.includes('-pooler.')) {
    process.env.DIRECT_URL = u.replace('-pooler.', '.');
    console.log('[prisma] DIRECT_URL derived from DATABASE_URL (non-pooler host for migrations).');
    return;
  }
  // Local / non-Neon: same connection string is fine for migrate + generate
  process.env.DIRECT_URL = u;
}

ensureDirectUrl();

module.exports = { ensureDirectUrl };
