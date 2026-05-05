#!/usr/bin/env node
/**
 * Load DIRECT_URL (from DATABASE_URL when using Neon pooler) then run a command.
 * Usage: node scripts/prisma-env-exec.js -- npx prisma generate
 */
const { execSync } = require('child_process');
require('./ensure-direct-url.js');

const dash = process.argv.indexOf('--');
const cmd = dash === -1 ? process.argv.slice(2).join(' ') : process.argv.slice(dash + 1).join(' ');
if (!cmd.trim()) {
  console.error('Usage: node scripts/prisma-env-exec.js -- <command>');
  process.exit(1);
}
execSync(cmd, { stdio: 'inherit', env: process.env, shell: true });
