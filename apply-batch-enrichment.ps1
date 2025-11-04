# Apply enrichment data to database for all books in batch 001
# Usage: .\apply-batch-enrichment.ps1

$books = Get-Content books_batch_001.json | ConvertFrom-Json
$env:DATABASE_URL = "postgresql://neondb_owner:npg_9LouUjhcil4Q@ep-orange-sound-adb604h5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

Write-Host "🚀 Applying enrichment data for $($books.Count) books..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($book in $books) {
    Write-Host "📖 Processing: $($book.title)" -ForegroundColor Yellow
    Write-Host "   ID: $($book.id)"
    
    try {
        npm run enrichment:apply -- $book.id 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Success" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "   ❌ Failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "   ❌ Error: $_" -ForegroundColor Red
        $failCount++
    }
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Successful: $successCount" -ForegroundColor Green
Write-Host "   ❌ Failed: $failCount" -ForegroundColor Red
Write-Host "   📚 Total: $($books.Count)" -ForegroundColor Cyan
Write-Host ""

