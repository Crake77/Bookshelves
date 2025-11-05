# Apply all 20 book enrichments to database
# Usage: .\apply-all-enrichments.ps1

$bookIds = @(
    "00df7f2a-9ba5-4835-a09a-2b87c50c81ec",
    "02901e6f-94d3-4104-9fd8-e609e75b6af0",
    "02bd1dc8-22dd-4727-b837-ea1096cc97d6",
    "03082e3d-3058-471b-a901-2956c1856f1e",
    "033508ff-bb34-41d9-aef2-141f4ed8dc84",
    "04537132-0262-4928-90cc-3b1abdbf04c4",
    "0482d088-1b9f-44c1-93d3-0678504c6e1b",
    "04b43824-68d4-4ccb-bc3e-48570d9de19a",
    "05eaef7d-9e38-4e02-8fec-358dd2b16ed8",
    "068a9286-750d-489b-8d68-b56825151747",
    "13e4fad3-10ac-4d50-92e8-96e52827dec3",
    "25722ee3-1244-4d3d-bf6b-6d1af5a0e8d1",
    "42b1a772-97a1-4777-97cb-ae30b66feab8",
    "60eab8a3-98c7-4f63-8b81-208dd9fc8d86",
    "661d7f73-dc36-4fd7-94c8-5fd6bba9bf16",
    "6f3452c6-e8c5-4328-941d-4992b401e7fe",
    "a22d3173-56b0-4aaf-850e-d594a74741d3",
    "a5630692-6cf1-4d8c-b834-970b18fbabe5",
    "aafd33c5-f1ee-4da5-ae61-7df49eed6b0f",
    "f8486671-601d-4267-9347-8e859a7cc35a"
)

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Applying Enrichments to Database" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total books: $($bookIds.Count)" -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$failCount = 0
$bookIndex = 0

foreach ($bookId in $bookIds) {
    $bookIndex++
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "[$bookIndex/$($bookIds.Count)] Applying enrichment for: $bookId" -ForegroundColor Cyan
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host ""
    
    npm run enrichment:apply -- $bookId
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Successfully applied!" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  ❌ Failed to apply" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Total books: $($bookIds.Count)" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host ""
Write-Host "✅ Database enrichment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Deploy to Vercel to see changes in production" -ForegroundColor Yellow
Write-Host "  npx vercel@latest --prod" -ForegroundColor Yellow
Write-Host ""

