// Task 0: Collect external subject metadata (LoC, FAST, Wikidata)
// Usage: node task-00-external-metadata.js <book_id> [--sources=loc,fast,wikidata] [--dry-run]
// Delegates to scripts/enrichment/collect-metadata.ts (TypeScript via tsx)

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function collectExternalMetadata(bookId, extraArgs = []) {
  const argsSegment = extraArgs.length ? ` ${extraArgs.join(' ')}` : '';
  const command = `node --dns-result-order=ipv4first --import tsx scripts/enrichment/collect-metadata.ts ${bookId}${argsSegment}`;
  console.log(`🛰️  Task 0: Collecting external metadata for ${bookId}`);
  try {
    const { stdout, stderr } = await execAsync(command, { env: process.env });
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    console.log(`✅ Task 0: External metadata updated for ${bookId}`);
  } catch (error) {
    console.error(`❌ Task 0 failed for ${bookId}:`, error.message);
    throw error;
  }
}

async function main() {
  const [bookId, ...extra] = process.argv.slice(2);
  if (!bookId) {
    console.error('Usage: node task-00-external-metadata.js <book_id> [--sources=loc,fast,wikidata] [--dry-run]');
    process.exit(1);
  }
  await collectExternalMetadata(bookId, extra);
}

main().catch((error) => {
  console.error('Task 0 encountered a fatal error:', error);
  process.exit(1);
});
