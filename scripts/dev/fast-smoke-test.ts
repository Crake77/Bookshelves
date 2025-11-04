#!/usr/bin/env node
/**
 * FAST Adapter Smoke Test
 * 
 * Tests the FAST adapter with a simple query to verify connectivity and response parsing.
 * 
 * Usage:
 *   node --dns-result-order=ipv4first --import tsx scripts/dev/fast-smoke-test.ts [query]
 * 
 * Example:
 *   node --dns-result-order=ipv4first --import tsx scripts/dev/fast-smoke-test.ts "cats"
 */

import 'dotenv/config';
import { MetadataOrchestrator } from '../../metadata/index.js';
import type { AdapterInput } from '../../metadata/types.js';

const DEFAULT_QUERY = 'cats';

async function main() {
  const query = process.argv[2] || DEFAULT_QUERY;
  console.log(`🔍 FAST Adapter Smoke Test`);
  console.log(`Query: "${query}"\n`);

  const orchestrator = new MetadataOrchestrator();
  const availableSources = orchestrator.availableSources;
  
  console.log(`Available sources: ${availableSources.join(', ')}`);
  
  // Check if FAST is available
  if (!availableSources.includes('fast')) {
    console.error('❌ FAST adapter is not available in the orchestrator');
    process.exit(1);
  }

  // Check environment config
  const fastEnabled = process.env.METADATA_SOURCES?.split(',').includes('fast') ?? true;
  if (!fastEnabled) {
    console.warn('⚠️  FAST is not enabled in METADATA_SOURCES, but testing anyway...\n');
  }

  const input: AdapterInput = {
    title: query,
    authors: [],
    isbn10: null,
    isbn13: null,
    oclc: null,
    doi: null,
  };

  console.log(`📡 Calling FAST adapter...\n`);
  
  try {
    const result = await orchestrator.lookupAll(input, { sources: ['fast'] });
    
    console.log(`✅ FAST adapter responded successfully\n`);
    console.log(`📊 Results Summary:`);
    console.log(`   Total labels: ${result.labels.length}`);
    console.log(`   FAST-specific labels: ${result.bySource.fast.length}\n`);

    if (result.notes?.fast?.length) {
      console.log(`📝 FAST Adapter Notes:`);
      result.notes.fast.forEach((note) => {
        console.log(`   - ${note}`);
      });
      console.log();
    }

    if (result.bySource.fast.length > 0) {
      console.log(`🏷️  FAST Labels (first 10):`);
      result.bySource.fast.slice(0, 10).forEach((label, i) => {
        console.log(`   ${i + 1}. ${label.name} (${label.slug})`);
        console.log(`      Kind: ${label.kind}, Confidence: ${label.confidence}`);
        if (label.id) {
          console.log(`      FAST ID: ${label.id}`);
        }
        if (label.url) {
          console.log(`      URL: ${label.url}`);
        }
      });
      console.log();
    }

    if (result.labels.length > 0) {
      console.log(`🔗 Aggregated Labels (first 10):`);
      result.labels.slice(0, 10).forEach((label, i) => {
        console.log(`   ${i + 1}. ${label.name} (${label.slug})`);
        console.log(`      Confidence: ${label.confidence}, Sources: ${label.sources.map(s => s.source).join(', ')}`);
        if (label.taxonomyType !== 'unknown') {
          console.log(`      Taxonomy: ${label.taxonomyType}${label.taxonomyGroup ? ` (${label.taxonomyGroup})` : ''}`);
        }
      });
    } else {
      console.log(`⚠️  No labels returned for query "${query}"`);
    }

    console.log(`\n✅ Smoke test completed successfully`);
  } catch (error: any) {
    console.error(`❌ Smoke test failed:`, error.message ?? error);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

