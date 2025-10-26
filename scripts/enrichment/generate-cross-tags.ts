import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';

const ENRICHMENT_DIR = 'enrichment_data';
const taxonomy = JSON.parse(fs.readFileSync('bookshelves_complete_taxonomy.json', 'utf8'));
const VALID_SLUGS = new Set<string>();
const TAG_LOOKUP = new Map<string, { name: string; group: string }>();
const TAG_CATALOG: Array<{ slug: string; group: string; name: string }> = [];
Object.entries(taxonomy.cross_tags.by_group || {}).forEach(([groupName, group]: [string, any]) => {
  if (Array.isArray(group)) {
    group.forEach((tag) => {
      if (tag?.slug) {
        VALID_SLUGS.add(tag.slug);
        TAG_LOOKUP.set(tag.slug, { name: tag.name ?? tag.slug, group: groupName });
        TAG_CATALOG.push({ slug: tag.slug, group: groupName, name: tag.name ?? tag.slug });
      }
    });
  }
});

type SuggestedTag = {
  slug: string;
  group?: string;
  confidence?: number;
  snapshot_ids?: string[];
  rationale?: string;
};

function loadEnrichment(bookId: string) {
  const filePath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Enrichment file not found: ${filePath}`);
  }
  return { filePath, data: JSON.parse(fs.readFileSync(filePath, 'utf8')) };
}

function summarizeEvidence(data: any) {
  const sources = data?.evidence?.sources ?? [];
  return sources.map((source: any) => ({
    snapshot_id: source.snapshot_id,
    source: source.source,
    license: source.license,
    extract: source.extract,
  }));
}

function toConfidenceLabel(value: number | undefined): 'high' | 'medium' | 'low' {
  if (!Number.isFinite(value)) return 'medium';
  if (value >= 0.9) return 'high';
  if (value >= 0.75) return 'medium';
  return 'low';
}

async function callLLM(bookId: string, enrichment: any, model: string) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not set. Cannot run LLM cross-tag generation.');
  }
  const client = new OpenAI({ apiKey: openaiApiKey });
  const payload = {
    book: {
      id: bookId,
      title: enrichment.title ?? enrichment?.taxonomy?.title ?? 'Unknown title',
      authors: enrichment.authors?.validated ?? [],
      summary: enrichment.summary?.new_summary ?? enrichment.summary?.original_description ?? '',
    },
    evidence: summarizeEvidence(enrichment),
    existing_tags: (enrichment.taxonomy?.cross_tags ?? []).map((tag: any) => tag.slug),
  };

  const tagCatalogSnippet = JSON.stringify(TAG_CATALOG);
  const userPrompt = `You are cataloguing cross-tags for a book. Use only the slugs listed below.\nAvailable tags (slug/group/name): ${tagCatalogSnippet}\nReturn STRICT JSON with this shape:\n{\n  "tags": [\n    {\n      "slug": "...",\n      "group": "...",\n      "confidence": 0.0-1.0,\n      "snapshot_ids": ["..."],\n      "rationale": "..."\n    }\n  ],\n  "notes": []\n}\nRules:\n1. Only use slugs from the provided catalog.\n2. Cite at least one snapshot_id per tag.\n3. Suggest enough tags so total (existing + new) is 10-20.\n4. Confidence must be between 0 and 1.`;

  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: 'You are a senior metadata editor producing cross-tags with provenance.' },
      { role: 'user', content: `${userPrompt}\n\nINPUT:\n${JSON.stringify(payload, null, 2)}` },
    ],
  });

  const raw = response.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error('LLM returned empty response');
  }
  const cleaned = raw.trim().startsWith('```')
    ? raw.trim().replace(/^```[a-zA-Z]*\n/, '').replace(/```\s*$/, '').trim()
    : raw;
  return JSON.parse(cleaned) as { tags?: SuggestedTag[] };
}

function mergeTags(enrichment: any, suggestions: SuggestedTag[]): void {
  if (!enrichment.taxonomy) enrichment.taxonomy = {};
  if (!Array.isArray(enrichment.taxonomy.cross_tags)) {
    enrichment.taxonomy.cross_tags = [];
  }
  const existingMap = new Map<string, any>();
  for (const tag of enrichment.taxonomy.cross_tags) {
    existingMap.set(tag.slug, tag);
  }

  for (const suggestion of suggestions) {
    if (!suggestion?.slug) continue;
    if (!VALID_SLUGS.has(suggestion.slug)) {
      console.warn(`[cross-tags] Skipping unknown slug ${suggestion.slug}`);
      continue;
    }
    const snapshotIds = Array.isArray(suggestion.snapshot_ids)
      ? suggestion.snapshot_ids.filter((id) => typeof id === 'string' && id.length > 0)
      : [];
    if (!snapshotIds.length) {
      console.warn(`[cross-tags] Skipping ${suggestion.slug} (no provenance provided)`);
      continue;
    }
    const entry = existingMap.get(suggestion.slug) ?? {
      slug: suggestion.slug,
      name: TAG_LOOKUP.get(suggestion.slug)?.name ?? suggestion.slug,
      group: TAG_LOOKUP.get(suggestion.slug)?.group ?? suggestion.group ?? 'trope',
    };
    entry.confidence = toConfidenceLabel(suggestion.confidence ?? 0.8);
    entry.method = entry.method === 'pattern-match+evidence' ? 'hybrid' : 'llm';
    entry.provenance_snapshot_ids = Array.from(new Set([...(entry.provenance_snapshot_ids ?? []), ...snapshotIds]));
    existingMap.set(suggestion.slug, entry);
  }

  enrichment.taxonomy.cross_tags = Array.from(existingMap.values()).slice(0, 20);
  enrichment.taxonomy.cross_tags_count = enrichment.taxonomy.cross_tags.length;
  enrichment.taxonomy.cross_tags_status = enrichment.taxonomy.cross_tags.length >= 10 ? 'sufficient' : 'needs_more';
  enrichment.last_updated = new Date().toISOString();
}

async function main() {
  const [bookId, ...rest] = process.argv.slice(2);
  if (!bookId) {
    console.error('Usage: node scripts/enrichment/generate-cross-tags.ts <book_id> [model]');
    process.exit(1);
  }
  const model = rest[0] || process.env.CROSS_TAG_MODEL || 'gpt-4o-mini';
  const { filePath, data } = loadEnrichment(bookId);
  const suggestions = await callLLM(bookId, data, model);
  mergeTags(data, suggestions.tags ?? []);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`[cross-tags] Updated ${filePath} with ${data.taxonomy.cross_tags.length} tags`);
}

main().catch((error) => {
  console.error('[cross-tags] generation failed:', error.message ?? error);
  process.exitCode = 1;
});
