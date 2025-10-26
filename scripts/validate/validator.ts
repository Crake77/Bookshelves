import fs from 'node:fs';
import path from 'node:path';

const ENRICHMENT_DIR = 'enrichment_data';
const TAXONOMY_PATH = 'bookshelves_complete_taxonomy.json';
const MIN_CROSS_TAGS = 10;

type Issue = {
  bookId: string;
  title: string;
  type: string;
  detail: string;
};

type EnrichmentFile = {
  format?: { slug?: string | null } | null;
  audience?: { slug?: string | null } | null;
  summary?: { title?: string | null } | null;
  taxonomy?: {
    cross_tags?: Array<{
      slug?: string;
      confidence?: string;
      method?: string | null;
      provenance_snapshot_ids?: string[];
    }> | null;
  } | null;
  evidence?: {
    work_title?: string | null;
  } | null;
};

const childFormats = new Set(['picture-book', 'early-reader']);
const childAudiences = new Set(['children', 'early-readers', 'middle-grade']);
const matureContentTags = new Set([
  'explicit-sex',
  'sexual-content-explicit',
  'sexual-violence',
  'graphic-violence',
  'violence-graphic',
  'sexual-assault',
]);
const confidenceWeights: Record<string, number> = {
  high: 0.9,
  medium: 0.75,
  low: 0.5,
};

function loadValidCrossTagSlugs(): Set<string> {
  const raw = JSON.parse(fs.readFileSync(TAXONOMY_PATH, 'utf8'));
  const slugs = new Set<string>();
  Object.values(raw.cross_tags?.by_group ?? {}).forEach((group: any) => {
    if (!Array.isArray(group)) return;
    group.forEach((tag) => {
      if (tag?.slug) slugs.add(tag.slug);
    });
  });
  return slugs;
}

function listEnrichmentFiles(): string[] {
  return fs
    .readdirSync(ENRICHMENT_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.join(ENRICHMENT_DIR, file));
}

function loadFile(filePath: string): EnrichmentFile {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectIssues(): Issue[] {
  const issues: Issue[] = [];
  const validSlugs = loadValidCrossTagSlugs();

  for (const filePath of listEnrichmentFiles()) {
    const bookId = path.basename(filePath, '.json');
    const data = loadFile(filePath);
    const title =
      data?.evidence?.work_title ??
      data?.taxonomy?.work_title ??
      data?.summary?.title ??
      '(unknown title)';
    const crossTags = data?.taxonomy?.cross_tags ?? [];
    const crossTagCount = Array.isArray(crossTags) ? crossTags.length : 0;
    const formatSlug = data?.format?.slug ?? null;
    const audienceSlug = data?.audience?.slug ?? null;

    if (!formatSlug) {
      issues.push({
        bookId,
        title,
        type: 'missing-format',
        detail: 'Format slug is missing',
      });
    }

    if (!audienceSlug) {
      issues.push({
        bookId,
        title,
        type: 'missing-audience',
        detail: 'Audience slug is missing',
      });
    }

    if (crossTagCount < MIN_CROSS_TAGS) {
      issues.push({
        bookId,
        title,
        type: 'low-cross-tags',
        detail: `Has ${crossTagCount} cross-tags (minimum ${MIN_CROSS_TAGS})`,
      });
    }

    const hasChildFocus = childFormats.has(formatSlug ?? '') || childAudiences.has(audienceSlug ?? '');
    const hasMatureContent = crossTags.some((tag) => (tag?.slug ? matureContentTags.has(tag.slug) : false));
    if (hasChildFocus && hasMatureContent) {
      issues.push({
        bookId,
        title,
        type: 'contradiction',
        detail: 'Child-focused format/audience combined with mature content warning tag',
      });
    }

    for (const tag of crossTags ?? []) {
      const slug = tag?.slug;
      if (!slug) {
        issues.push({
          bookId,
          title,
          type: 'invalid-cross-tag',
          detail: 'Cross-tag missing slug',
        });
        continue;
      }

      if (!validSlugs.has(slug)) {
        issues.push({
          bookId,
          title,
          type: 'unknown-cross-tag',
          detail: `Slug '${slug}' is not present in bookshelves_complete_taxonomy.json`,
        });
      }

      const method = tag?.method ?? '';
      const requiresProvenance =
        typeof method === 'string' &&
        (method.includes('llm') || method.includes('hybrid') || method.includes('pattern-match+evidence'));
      if (
        requiresProvenance &&
        (!Array.isArray(tag?.provenance_snapshot_ids) || tag?.provenance_snapshot_ids.length === 0)
      ) {
        issues.push({
          bookId,
          title,
          type: 'missing-provenance',
          detail: `Cross-tag '${slug}' uses method '${method}' but has no provenance_snapshot_ids`,
        });
      }

      const confidenceLabel = (tag?.confidence ?? '').toLowerCase();
      const confidenceScore = confidenceWeights[confidenceLabel];
      if (confidenceScore && confidenceScore < 0.7) {
        issues.push({
          bookId,
          title,
          type: 'low-confidence',
          detail: `Cross-tag '${slug}' confidence is '${tag?.confidence}'`,
        });
      }
    }
  }

  return issues;
}

function main() {
  if (!fs.existsSync(ENRICHMENT_DIR)) {
    console.error(`[validator] Directory not found: ${ENRICHMENT_DIR}`);
    process.exit(1);
  }
  if (!fs.existsSync(TAXONOMY_PATH)) {
    console.error(`[validator] Taxonomy file missing: ${TAXONOMY_PATH}`);
    process.exit(1);
  }

  const issues = collectIssues();
  if (!issues.length) {
    console.log('[validator] All enrichment files passed validation');
    return;
  }

  const grouped = issues.reduce<Record<string, Issue[]>>((acc, issue) => {
    if (!acc[issue.bookId]) acc[issue.bookId] = [];
    acc[issue.bookId].push(issue);
    return acc;
  }, {});

  console.error(`[validator] Found ${issues.length} issues across ${Object.keys(grouped).length} books:`);
  for (const [bookId, bookIssues] of Object.entries(grouped)) {
    const title = bookIssues[0]?.title ?? '(unknown title)';
    console.error(`\n• ${title} (${bookId})`);
    bookIssues.forEach((issue) => {
      console.error(`  - [${issue.type}] ${issue.detail}`);
    });
  }

  process.exitCode = 1;
}

main();
