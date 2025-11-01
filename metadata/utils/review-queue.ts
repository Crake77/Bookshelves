import fs from 'node:fs/promises';
import path from 'node:path';
import type { AdapterId } from '../types.js';

type QueueEntry = {
  source: AdapterId;
  id: string | null;
  label: string;
  firstSeenAt: string;
  occurrences: number;
};

async function ensureFile(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify([], null, 2), 'utf8');
      return;
    }
    throw error;
  }
}

export async function queueUnknownSubject({
  source,
  id,
  label,
  cachePath,
}: {
  source: AdapterId;
  id: string | null;
  label: string;
  cachePath: string;
}): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) return;
  await ensureFile(cachePath);
  const raw = await fs.readFile(cachePath, 'utf8');
  const entries = (JSON.parse(raw) as QueueEntry[]) ?? [];
  const key = `${source}:${(id ?? '').toLowerCase()}:${trimmed.toLowerCase()}`;
  const existing = entries.find(
    (entry) =>
      `${entry.source}:${(entry.id ?? '').toLowerCase()}:${entry.label.toLowerCase()}` === key,
  );
  if (existing) {
    existing.occurrences += 1;
    await fs.writeFile(cachePath, JSON.stringify(entries, null, 2), 'utf8');
    return;
  }
  const entry: QueueEntry = {
    source,
    id,
    label: trimmed,
    firstSeenAt: new Date().toISOString(),
    occurrences: 1,
  };
  entries.push(entry);
  await fs.writeFile(cachePath, JSON.stringify(entries, null, 2), 'utf8');
}
