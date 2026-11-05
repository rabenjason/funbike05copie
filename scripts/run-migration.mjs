#!/usr/bin/env node
/** Safe local orchestrator: checks PHP first, snapshots the existing TS data, then runs the PHP CLI. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const dryRun = args.includes('--dry-run');
const retryImages = args.includes('--retry-images');
if (apply === dryRun || (retryImages && !apply) || args.some((arg) => !['--apply', '--dry-run', '--retry-images'].includes(arg))) {
  console.error('Usage: node scripts/run-migration.mjs --dry-run | --apply [--retry-images]');
  process.exit(2);
}

const phpVersion = spawnSync('php', ['-r', 'echo PHP_VERSION;'], { cwd: root, encoding: 'utf8' });
if (phpVersion.error?.code === 'ENOENT') {
  console.error('PHP CLI was not found in this environment. Install PHP 8.1+ or run this command on the host where PHP is installed. No snapshot or migration was started.');
  process.exit(127);
}
if (phpVersion.status !== 0) {
  console.error(`PHP CLI check failed: ${phpVersion.stderr || phpVersion.error?.message || 'unknown error'}`);
  process.exit(1);
}
const [major, minor] = phpVersion.stdout.trim().split('.').map(Number);
if (major < 8 || (major === 8 && minor < 1)) {
  console.error(`PHP ${phpVersion.stdout.trim()} detected; PHP 8.1+ is required.`);
  process.exit(1);
}
console.log(`Using PHP ${phpVersion.stdout.trim()}.`);

const exporter = spawnSync(process.execPath, ['scripts/export-static-data.mjs'], { cwd: root, stdio: 'inherit' });
if (exporter.status !== 0) process.exit(exporter.status ?? 1);
const migrationArgs = ['server/bin/migrate.php', apply ? '--apply' : '--dry-run'];
if (retryImages) migrationArgs.push('--retry-images');
const migration = spawnSync('php', migrationArgs, { cwd: root, stdio: 'inherit' });
if (migration.error) {
  console.error(migration.error.message);
  process.exit(1);
}
process.exit(migration.status ?? 1);
