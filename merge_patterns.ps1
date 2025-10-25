$allPatterns = @{}
$metadata = @{
    version = '1.0.0'
    generated_date = (Get-Date -Format 'yyyy-MM-dd')
    batches_merged = 7
    total_patterns = 0
    coverage_note = '800 cross-tag patterns covering highest-priority tropes, themes, settings, characters, and content elements across fiction genres'
}

# Read all batch files
$batchFiles = @(
    'cross_tag_patterns.json',
    'cross_tag_patterns_batch_02.json',
    'cross_tag_patterns_batch_03.json',
    'cross_tag_patterns_batch_04.json',
    'cross_tag_patterns_batch_05.json',
    'cross_tag_patterns_batch_06.json',
    'cross_tag_patterns_batch_07.json'
)

foreach ($file in $batchFiles) {
    Write-Host "Reading $file..."
    $content = Get-Content $file -Raw | ConvertFrom-Json
    foreach ($prop in $content.patterns.PSObject.Properties) {
        $allPatterns[$prop.Name] = $prop.Value
    }
}

$metadata.total_patterns = $allPatterns.Count

# Create merged structure
$merged = @{
    metadata = $metadata
    patterns = $allPatterns
}

# Write to new file
Write-Host "Writing merged file with $($allPatterns.Count) patterns..."
$merged | ConvertTo-Json -Depth 10 | Set-Content 'cross_tag_patterns_MERGED.json' -Encoding UTF8

Write-Host "✓ Successfully merged $($allPatterns.Count) patterns from 7 batch files"
