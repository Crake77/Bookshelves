#!/usr/bin/env node

/**
 * Archive Old Documentation Script
 * 
 * Safely moves completed/old documentation to organized archive structure.
 * Creates timestamped backup before moving files.
 * 
 * Usage: node archive-old-docs.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const ARCHIVE_BASE = path.join(__dirname, 'archives');

// Define archive categories and files to move
const ARCHIVE_PLAN = {
  'sessions': {
    description: 'Old session handoffs and summaries',
    files: [
      'SESSION_2_HANDOFF.md',
      'SESSION_2025-10-23_HANDOFF.md',
      'SESSION_3_HANDOFF.md',
      'SESSION_COMPLETE_2025-01-24.md',
      'SESSION_COMPLETE_V2.1.md',
      'SESSION_HANDOFF_PHASE5.md',
      'SESSION_HANDOFF.md',
      'SESSION_LOG_BROWSE_SCROLL.md',
      'SESSION_SUMMARY_PHASE5_FINAL.md',
      'HANDOFF_BATCH_ENRICHMENT_SESSION.md',
    ]
  },
  'batch_work': {
    description: 'Completed batch enrichment documentation',
    files: [
      'BATCH_1_STATUS.md',
      'BATCH_001_COMPLETE.md',
      'BATCH_001_QUALITY_ISSUES.md',
      'BATCH_002_IMPROVEMENTS.md',
      'batch_reports/batch_001_final_report.md',
    ]
  },
  'cross_tag_batches': {
    description: 'Individual cross-tag batch files (merged into v1)',
    files: [
      'cross_tag_patterns.json',
      'cross_tag_patterns_batch_02.json',
      'cross_tag_patterns_batch_03.json',
      'cross_tag_patterns_batch_04.json',
      'cross_tag_patterns_batch_05.json',
      'cross_tag_patterns_batch_06.json',
      'cross_tag_patterns_batch_07.json',
    ]
  },
  'completed_workflows': {
    description: 'Completed workflow and fix documentation',
    files: [
      'WORKFLOW_FIXES_COMPLETED.md',
      'WORKFLOW_FIXES_v2.md',
      'GPT_GUIDE_COMPLETE_PATCH.md',
      'GPT_GUIDE_REMAINING_FIXES.md',
      'GPT_GUIDE_V2.1_STATUS.md',
    ]
  },
  'old_handoffs': {
    description: 'Old task handoffs (superseded)',
    files: [
      'CROSS_TAG_HANDOFF.md',
      'TAXONOMY_PATTERNS_HANDOFF.md',
    ]
  },
  'deprecated': {
    description: 'Deprecated/redundant files',
    files: [
      'BOOKSHELVES_TAXONOMY_REFERENCE.md', // Superseded by docs/taxonomy-reference.md
      'SCHEMA_REFERENCE.md', // Superseded by DATABASE_SCHEMA_REFERENCE.md
      'TAXONOMY_REFERENCE.json', // Superseded by bookshelves_complete_taxonomy.json
      '.refresh_1.json',
      '.refresh_2.json',
      '.refresh_3.json',
      '.refresh_4.json',
    ]
  }
};

// Create archive manifest
function createManifest(archivedFiles) {
  const manifest = {
    archived_at: new Date().toISOString(),
    total_files: archivedFiles.length,
    total_size_bytes: archivedFiles.reduce((sum, f) => sum + f.size, 0),
    categories: {},
  };

  for (const [category, info] of Object.entries(ARCHIVE_PLAN)) {
    const categoryFiles = archivedFiles.filter(f => 
      info.files.includes(f.original_path)
    );
    
    manifest.categories[category] = {
      description: info.description,
      file_count: categoryFiles.length,
      total_size_bytes: categoryFiles.reduce((sum, f) => sum + f.size, 0),
      files: categoryFiles.map(f => ({
        name: f.name,
        original_path: f.original_path,
        archived_path: f.archived_path,
        size_bytes: f.size,
      })),
    };
  }

  return manifest;
}

// Main archive function
async function archiveFiles() {
  console.log('🗄️  Bookshelves Documentation Archive Script\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no files will be moved)' : 'LIVE (files will be moved)'}\n`);

  const archivedFiles = [];
  let totalSize = 0;

  // Create archive directories
  for (const category of Object.keys(ARCHIVE_PLAN)) {
    const categoryPath = path.join(ARCHIVE_BASE, category);
    
    if (!DRY_RUN) {
      if (!fs.existsSync(categoryPath)) {
        fs.mkdirSync(categoryPath, { recursive: true });
        console.log(`✅ Created archive directory: archives/${category}/`);
      }
    } else {
      console.log(`[DRY RUN] Would create: archives/${category}/`);
    }
  }

  console.log('');

  // Process each category
  for (const [category, info] of Object.entries(ARCHIVE_PLAN)) {
    console.log(`📁 ${category.toUpperCase()}: ${info.description}`);
    
    for (const file of info.files) {
      const sourcePath = path.join(__dirname, file);
      const fileName = path.basename(file);
      const targetPath = path.join(ARCHIVE_BASE, category, fileName);

      // Check if file exists
      if (!fs.existsSync(sourcePath)) {
        console.log(`   ⚠️  SKIP: ${file} (not found)`);
        continue;
      }

      // Get file size
      const stats = fs.statSync(sourcePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      totalSize += stats.size;

      if (!DRY_RUN) {
        // Move file
        fs.renameSync(sourcePath, targetPath);
        console.log(`   ✅ MOVED: ${file} (${sizeKB} KB) → archives/${category}/${fileName}`);
      } else {
        console.log(`   [DRY RUN] Would move: ${file} (${sizeKB} KB) → archives/${category}/${fileName}`);
      }

      archivedFiles.push({
        name: fileName,
        original_path: file,
        archived_path: `archives/${category}/${fileName}`,
        size: stats.size,
      });
    }
    
    console.log('');
  }

  // Create manifest
  const manifest = createManifest(archivedFiles);
  const manifestPath = path.join(ARCHIVE_BASE, 'ARCHIVE_MANIFEST.json');

  if (!DRY_RUN) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`📋 Created archive manifest: archives/ARCHIVE_MANIFEST.json\n`);
  } else {
    console.log(`[DRY RUN] Would create manifest: archives/ARCHIVE_MANIFEST.json\n`);
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('📊 ARCHIVE SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total files: ${archivedFiles.length}`);
  console.log(`Total size: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log('');
  
  for (const [category, info] of Object.entries(manifest.categories)) {
    const sizeKB = (info.total_size_bytes / 1024).toFixed(2);
    console.log(`  ${category}: ${info.file_count} files (${sizeKB} KB)`);
  }
  
  console.log('═'.repeat(60));

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. No files were actually moved.');
    console.log('Run without --dry-run to perform the archive.\n');
  } else {
    console.log('\n✅ Archive complete! Files moved to archives/ directory.\n');
  }
}

// Run the archive
archiveFiles().catch(err => {
  console.error('❌ Error during archive:', err);
  process.exit(1);
});
