# Comprehensive re-enrichment script for all books
# Runs: external metadata collection, evidence sync, and enrichment tasks 4, 5, 6, 7, 8

Write-Host "🔄 Starting comprehensive re-enrichment for all books..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Collect external metadata (Google Books, OpenLibrary descriptions)
Write-Host "Step 1: Collecting external metadata..." -ForegroundColor Yellow
npm run metadata:collect-all
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ External metadata collection failed" -ForegroundColor Red
    exit 1
}

# Step 2: Sync evidence packs (already done, but ensure it's up to date)
Write-Host ""
Write-Host "Step 2: Syncing evidence packs..." -ForegroundColor Yellow
npm run evidence:sync-all
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Evidence sync failed" -ForegroundColor Red
    exit 1
}

# Step 3: Re-run enrichment tasks for all books
Write-Host ""
Write-Host "Step 3: Re-running enrichment tasks (4, 5, 6, 7, 8)..." -ForegroundColor Yellow

# Get all book IDs from database using a proper script
$booksJson = node --dns-result-order=ipv4first -r dotenv/config --import tsx scripts/get-all-book-ids.mjs

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to get book IDs from database" -ForegroundColor Red
    exit 1
}

$bookIds = $booksJson | ConvertFrom-Json

Write-Host "Found $($bookIds.Count) books to process" -ForegroundColor Cyan
Write-Host ""

$taskNum = 0
$totalTasks = $bookIds.Count * 5  # 5 tasks per book

foreach ($bookId in $bookIds) {
    $taskNum++
    Write-Host "[$taskNum/$($bookIds.Count)] Processing book: $bookId" -ForegroundColor Cyan
    
    # Task 4: Domain & Supergenres
    Write-Host "  Running task 4 (domain & supergenres)..." -ForegroundColor Gray
    node enrichment-tasks/task-04-domain-supergenres.js $bookId
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠️  Task 4 failed for $bookId" -ForegroundColor Yellow
    }
    
    # Task 5: Genres & Subgenres
    Write-Host "  Running task 5 (genres & subgenres)..." -ForegroundColor Gray
    node enrichment-tasks/task-05-genres-subgenres.js $bookId
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠️  Task 5 failed for $bookId" -ForegroundColor Yellow
    }
    
    # Task 6: Cross-tags (now with comprehensive pattern matching!)
    Write-Host "  Running task 6 (cross-tags with comprehensive matching)..." -ForegroundColor Gray
    node enrichment-tasks/task-06-cross-tags.js $bookId
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠️  Task 6 failed for $bookId" -ForegroundColor Yellow
    }
    
    # Task 7: Format & Audience
    Write-Host "  Running task 7 (format & audience)..." -ForegroundColor Gray
    node enrichment-tasks/task-07-format-audience.js $bookId
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠️  Task 7 failed for $bookId" -ForegroundColor Yellow
    }
    
    # Task 8: Generate SQL
    Write-Host "  Running task 8 (generate SQL)..." -ForegroundColor Gray
    node enrichment-tasks/task-08-generate-sql.js $bookId
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠️  Task 8 failed for $bookId" -ForegroundColor Yellow
    }
    
    Write-Host "  ✅ Completed enrichment for $bookId" -ForegroundColor Green
    Write-Host ""
}

Write-Host "✅ Comprehensive re-enrichment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review enrichment_data/*.json files" -ForegroundColor White
Write-Host "  2. Run: npm run enrichment:apply to push to database" -ForegroundColor White

