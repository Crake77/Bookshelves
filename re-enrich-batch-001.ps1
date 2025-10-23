# Re-enrich Batch 001 with Fixed Scripts
# This will overwrite existing enrichment data

$bookIds = @(
    "00df7f2a-9ba5-4835-a09a-2b87c50c81ec",  # (Eco)Anxiety
    "02901e6f-94d3-4104-9fd8-e609e75b6af0",  # Summer of Lovecraft
    "02bd1dc8-22dd-4727-b837-ea1096cc97d6",  # Blue-Green Rehabilitation
    "03082e3d-3058-471b-a901-2956c1856f1e",  # Justice in YA Speculative Fiction
    "033508ff-bb34-41d9-aef2-141f4ed8dc84",  # Complete Nebula Award-winning Fiction
    "04537132-0262-4928-90cc-3b1abdbf04c4",  # Invisible Life of Addie LaRue
    "0482d088-1b9f-44c1-93d3-0678504c6e1b",  # Fantasy and Necessity of Solidarity
    "04b43824-68d4-4ccb-bc3e-48570d9de19a",  # When I'm Gone
    "05eaef7d-9e38-4e02-8fec-358dd2b16ed8",  # Nebula Award Stories Five
    "068a9286-750d-489b-8d68-b56825151747"   # Science Fiction
)

Write-Host "==================================="
Write-Host "RE-ENRICHING BATCH 001 (10 BOOKS)"
Write-Host "==================================="
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($bookId in $bookIds) {
    Write-Host "Processing book: $bookId" -ForegroundColor Cyan
    Write-Host ""
    
    # Task 4: Domain + Supergenres
    Write-Host "  Running Task 4 (Domain + Supergenres)..."
    node enrichment-tasks/task-04-domain-supergenres.js $bookId
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR in Task 4" -ForegroundColor Red
        $failCount++
        continue
    }
    
    # Task 5: Genres + Subgenres
    Write-Host "  Running Task 5 (Genres + Subgenres)..."
    node enrichment-tasks/task-05-genres-subgenres.js $bookId
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR in Task 5" -ForegroundColor Red
        $failCount++
        continue
    }
    
    # Task 6: Cross-Tags
    Write-Host "  Running Task 6 (Cross-Tags)..."
    node enrichment-tasks/task-06-cross-tags.js $bookId
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR in Task 6" -ForegroundColor Red
        $failCount++
        continue
    }
    
    # Task 7: Format + Audience
    Write-Host "  Running Task 7 (Format + Audience)..."
    node enrichment-tasks/task-07-format-audience.js $bookId
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR in Task 7" -ForegroundColor Red
        $failCount++
        continue
    }
    
    # Validate Quality
    Write-Host "  Running Quality Validation..."
    node enrichment-tasks/validate-quality.js $bookId
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: Quality validation failed - review needed" -ForegroundColor Yellow
    }
    
    # Regenerate SQL
    Write-Host "  Regenerating SQL..."
    node enrichment-tasks/task-08-generate-sql.js $bookId
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR in SQL generation" -ForegroundColor Red
        $failCount++
        continue
    }
    
    Write-Host "  SUCCESS!" -ForegroundColor Green
    Write-Host ""
    $successCount++
}

Write-Host "==================================="
Write-Host "RE-ENRICHMENT COMPLETE"
Write-Host "==================================="
Write-Host "Success: $successCount / 10" -ForegroundColor Green
Write-Host "Failed: $failCount / 10" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review enrichment_data/*.json files for any warnings"
Write-Host "2. Run: node execute-batch-sql.js to import to database"
Write-Host "3. Deploy to verify changes"
