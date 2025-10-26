import 'dotenv/config';
import { desc, eq } from 'drizzle-orm';
import type { SourceSnapshot, Work } from '@shared/schema';
import { db } from '../../db/index.js';
import { sourceSnapshots, works } from '@shared/schema';

export type EvidenceSource = Pick<
  SourceSnapshot,
  'id' | 'source' | 'sourceKey' | 'revision' | 'url' | 'license' | 'fetchedAt' | 'sha256' | 'extract'
>;

export type EvidencePack = {
  workId: string;
  workTitle: string;
  workRefType: Work['workRefType'];
  workRefValue: Work['workRefValue'];
  sources: EvidenceSource[];
  fetchedAt?: string;
};

export async function loadEvidencePack(workId: string): Promise<EvidencePack | null> {
  const work = await db.query.works.findFirst({ where: eq(works.id, workId) });
  if (!work) {
    return null;
  }

  const snapshots = await db
    .select()
    .from(sourceSnapshots)
    .where(eq(sourceSnapshots.workId, workId))
    .orderBy(desc(sourceSnapshots.fetchedAt));

  const sources: EvidenceSource[] = snapshots.map((snapshot) => ({
    id: snapshot.id,
    source: snapshot.source,
    sourceKey: snapshot.sourceKey,
    revision: snapshot.revision,
    url: snapshot.url,
    license: snapshot.license,
    fetchedAt: snapshot.fetchedAt?.toISOString(),
    sha256: snapshot.sha256,
    extract: snapshot.extract,
  }));

  return {
    workId,
    workTitle: work.title,
    workRefType: work.workRefType,
    workRefValue: work.workRefValue,
    sources,
    fetchedAt: sources[0]?.fetchedAt,
  };
}
