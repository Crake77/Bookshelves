# Apply Batch 002 Enrichment Data to Database
# This script iterates through the book IDs in books_batch_002.json
# and runs the enrichment:apply command for each.

# Ensure DATABASE_URL is set in your environment or .env.local

$bookIds = @(
    "42b1a772-97a1-4777-97cb-ae30b66feab8",  # The Eye of the World
    "a22d3173-56b0-4aaf-850e-d594a74741d3",  # The Great Hunt
    "13e4fad3-10ac-4d50-92e8-96e52827dec3",  # Ender's Game
    "6f3452c6-e8c5-4328-941d-4992b401e7fe",  # Speaker for the Dead
    "60eab8a3-98c7-4f63-8b81-208dd9fc8d86",  # Defiance of the Fall
    "661d7f73-dc36-4fd7-94c8-5fd6bba9bf16",  # Ascendance of a Bookworm: Part 1 Volume 1
    "aafd33c5-f1ee-4da5-ae61-7df49eed6b0f",  # Delve (Path of the Deathless)
    "f8486671-601d-4267-9347-8e859a7cc35a",  # World of Cultivation
    "25722ee3-1244-4d3d-bf6b-6d1af5a0e8d1",  # Tower of God Volume One
    "a5630692-6cf1-4d8c-b834-970b18fbabe5"   # Dune
)

Write-Host "🚀 Applying enrichment data for $($bookIds.Length) books from Batch 002..."
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($bookId in $bookIds) {
    # Get book title from enrichment_data JSON if available, otherwise use ID
    $enrichmentFilePath = "enrichment_data\$bookId.json"
    $bookTitle = $bookId
    if (Test-Path $enrichmentFilePath) {
        try {
            $enrichmentData = Get-Content $enrichmentFilePath | ConvertFrom-Json
            $bookTitle = $enrichmentData.input_snapshot.title
        } catch {
            # Fallback to ID if JSON parsing fails
        }
    }

    Write-Host "📖 Processing: $bookTitle"
    Write-Host "   ID: $bookId"

    try {
        npm run enrichment:apply -- $bookId | Out-Null # Suppress verbose output
        Write-Host "   ✅ Success"
        $successCount++
    } catch {
        Write-Host "   ❌ Failed"
        $failCount++
    }
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "📊 Summary:"
Write-Host "   ✅ Successful: $successCount"
Write-Host "   ❌ Failed: $failCount"
Write-Host "   📚 Total: $($bookIds.Length)"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

