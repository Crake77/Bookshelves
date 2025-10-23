// Quality Validation: Check for common errors before SQL generation
// Usage: node validate-quality.js <book_id>

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';

function validateEnrichment(bookId) {
  console.log(`🔍 Validating enrichment quality for book ${bookId}...`);
  
  const enrichmentPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  if (!fs.existsSync(enrichmentPath)) {
    console.error(`❌ Enrichment file not found: ${enrichmentPath}`);
    process.exit(1);
  }
  
  const enrichment = JSON.parse(fs.readFileSync(enrichmentPath, 'utf8'));
  const issues = [];
  const warnings = [];
  
  // VALIDATION 1: Domain vs Genre consistency
  const domain = enrichment.taxonomy?.domain?.slug;
  const genres = enrichment.taxonomy?.genres || [];
  
  const fictionGenres = ['fantasy', 'science-fiction', 'mystery', 'thriller', 'romance', 'horror', 'literary-fiction'];
  const nonfictionGenres = ['history', 'biography', 'memoir', 'autobiography', 'business', 'economics', 'psychology', 'philosophy'];
  
  genres.forEach(genre => {
    if (domain === 'non-fiction' && fictionGenres.includes(genre.slug)) {
      issues.push(`Genre '${genre.slug}' is fiction but domain is non-fiction`);
    }
    if (domain === 'fiction' && nonfictionGenres.includes(genre.slug)) {
      issues.push(`Genre '${genre.slug}' is non-fiction but domain is fiction`);
    }
  });
  
  // VALIDATION 2: Excessive structure tags (likely false positives)
  const structureTags = ['flash-fiction', 'micro-fiction', 'hypertext-fiction', 'epistolary', 'anthology'];
  const crossTags = enrichment.taxonomy?.cross_tags || [];
  const structureTagCount = crossTags.filter(tag => structureTags.includes(tag.slug)).length;
  
  if (structureTagCount > 2) {
    warnings.push(`Book has ${structureTagCount} structure tags - likely false positives for academic books`);
  }
  
  // VALIDATION 3: Fairy tale tags on non-fairy-tale books
  const fairyTaleTags = ['fairy-tale', 'dark-fairy-tale', 'fairy-tale-retelling', 'fairy-tale-ending', 'twisted-fairy-tale'];
  const fairyTaleCount = crossTags.filter(tag => fairyTaleTags.includes(tag.slug)).length;
  
  if (fairyTaleCount > 3) {
    warnings.push(`Book has ${fairyTaleCount} fairy-tale tags - check if book is actually about fairy tales vs analyzing them`);
  }
  
  // VALIDATION 4: Fiction tropes on non-fiction books
  const fictionTropes = [
    'chosen-one', 'enemies-to-lovers', 'friends-to-lovers', 'love-triangle',
    'high-elves', 'dragons', 'magic-system', 'prophecy', 'portal'
  ];
  
  if (domain === 'non-fiction') {
    const fictionTropeCount = crossTags.filter(tag => fictionTropes.includes(tag.slug)).length;
    if (fictionTropeCount > 0) {
      issues.push(`Non-fiction book has ${fictionTropeCount} fiction trope tags: ${crossTags.filter(tag => fictionTropes.includes(tag.slug)).map(t => t.slug).join(', ')}`);
    }
  }
  
  // VALIDATION 5: Low cross-tag count
  if (crossTags.length < 10) {
    warnings.push(`Only ${crossTags.length} cross-tags assigned (minimum is 10)`);
  }
  
  // VALIDATION 6: Missing required fields
  if (!domain) {
    issues.push('Missing domain assignment');
  }
  
  if (!enrichment.taxonomy?.supergenres || enrichment.taxonomy.supergenres.length === 0) {
    warnings.push('No supergenres assigned');
  }
  
  if (genres.length === 0) {
    warnings.push('No genres assigned');
  }
  
  // VALIDATION 7: Summary quality
  if (!enrichment.summary?.new_summary) {
    issues.push('Missing summary');
  } else {
    const wordCount = enrichment.summary.word_count || 0;
    if (wordCount < 150 || wordCount > 300) {
      warnings.push(`Summary word count ${wordCount} outside 150-300 range`);
    }
  }
  
  // OUTPUT RESULTS
  console.log('');
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ All quality checks passed!');
    return 0;
  }
  
  if (issues.length > 0) {
    console.log('❌ CRITICAL ISSUES:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
    console.log('');
  }
  
  if (issues.length > 0) {
    console.log('❌ Quality validation FAILED');
    console.log('   Fix issues before generating SQL');
    return 1;
  } else {
    console.log('⚠️  Quality validation passed with warnings');
    console.log('   Review warnings but OK to proceed');
    return 0;
  }
}

const bookId = process.argv[2];
if (!bookId) {
  console.error('Usage: node validate-quality.js <book_id>');
  process.exit(1);
}

const exitCode = validateEnrichment(bookId);
process.exit(exitCode);
