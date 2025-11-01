import fs from 'node:fs/promises';
import path from 'node:path';
import { metadataConfig } from '../config.js';
import type { AdapterId, CacheClient, CacheEntry } from '../types.js';

function sanitizeSegment(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function cachePath(source: AdapterId, key: string): string {
  const safeKey = sanitizeSegment(key);
  return path.join(metadataConfig.cacheDir, source, `${safeKey}.json`);
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export class FileCache implements CacheClient {
  async read<T>(source: AdapterId, key: string): Promise<CacheEntry<T> | null> {
    const filePath = cachePath(source, key);
    try {
      const contents = await fs.readFile(filePath, 'utf8');
      return JSON.parse(contents) as CacheEntry<T>;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async write<T>(source: AdapterId, key: string, value: CacheEntry<T>): Promise<void> {
    const filePath = cachePath(source, key);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
  }
}

export function buildCacheKey({
  isbn13,
  isbn10,
  doi,
  oclc,
  title,
  authors = [],
}: {
  isbn13?: string | null;
  isbn10?: string | null;
  doi?: string | null;
  oclc?: string | null;
  title?: string | null;
  authors?: string[];
}): string {
  if (isbn13) return `isbn13-${sanitizeSegment(isbn13)}`;
  if (isbn10) return `isbn10-${sanitizeSegment(isbn10)}`;
  if (doi) return `doi-${sanitizeSegment(doi)}`;
  if (oclc) return `oclc-${sanitizeSegment(oclc)}`;
  const authorKey = authors.length ? authors.slice(0, 3).map(sanitizeSegment).join('_') : 'na';
  const titleKey = title ? sanitizeSegment(title) : 'untitled';
  return `title-${titleKey}-auth-${authorKey}`;
}
