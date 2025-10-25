import { createHash } from 'crypto';

/**
 * Compute SHA-256 hash of a string
 * Used for fingerprinting source snapshot extracts
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Compute fingerprint from array of source revisions
 * Used to detect if re-tagging is needed
 */
export function computeHarvestFingerprint(
  sources: Array<{ source: string; revision: string | null }>
): string {
  const sorted = sources
    .map(s => `${s.source}:${s.revision || 'null'}`)
    .sort()
    .join(',');
  return sha256(sorted);
}
