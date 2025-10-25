import 'dotenv/config';
import pLimit from 'p-limit';
import { desc } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { works, type Work } from '@shared/schema';
import {
  buildAndPersistEvidence,
  needsReharvest,
  DEFAULT_REQUIRED_SOURCES,
  type BuildEvidenceResult,
} from './buildEvidence.js';

const DEFAULT_BATCH = Number(process.argv[2] ?? process.env.HARVEST_BATCH_SIZE ?? '10');
const CONCURRENCY = Math.max(1, Number(process.env.HARVEST_CONCURRENCY ?? '3'));

async function selectCandidateWorks(target: number): Promise<Work[]> {
  if (target <= 0) return [];
  const pageSize = Math.max(target * 4, target + 5);
  const pool = await db
    .select()
    .from(works)
    .orderBy(desc(works.updatedAt))
    .limit(pageSize);

  const candidates: Work[] = [];
  for (const work of pool) {
    if (await needsReharvest(work.id, DEFAULT_REQUIRED_SOURCES)) {
      candidates.push(work);
    }
    if (candidates.length >= target) break;
  }

  return candidates;
}

type HarvestOutcome = {
  work: Work;
  result: BuildEvidenceResult;
};

async function run() {
  const target = DEFAULT_BATCH;
  console.log(`\n[harvest] starting evidence harvest for ${target} works (concurrency=${CONCURRENCY})`);

  const candidates = await selectCandidateWorks(target);
  if (candidates.length === 0) {
    console.log('[harvest] no works require harvesting.');
    return;
  }

  if (candidates.length < target) {
    console.log(`[harvest] only ${candidates.length} works require updates (target was ${target}).`);
  }

  const limiter = pLimit(CONCURRENCY);
  let processed = 0;

  const tasks = candidates.map((work, index) =>
    limiter(async (): Promise<HarvestOutcome> => {
      const result = await buildAndPersistEvidence({ workId: work.id, force: true });
      processed += 1;
      console.log(
        `[harvest] ${processed}/${candidates.length} :: ${work.title} => ` +
          (result.updatedSources.length ? `updated ${result.updatedSources.join(', ')}` : 'no changes'),
      );
      return { work, result };
    }),
  );

  const settled = await Promise.allSettled(tasks);

  let success = 0;
  let failures = 0;

  for (const entry of settled) {
    if (entry.status === 'fulfilled') {
      success += 1;
    } else {
      failures += 1;
      console.error('[harvest] failed to process work:', entry.reason);
    }
  }

  console.log('\n[harvest] complete');
  console.log(` - processed: ${settled.length}`);
  console.log(` - successful: ${success}`);
  console.log(` - failed: ${failures}`);
}

run().catch((error) => {
  console.error('[harvest] fatal error', error);
  process.exit(1);
});
