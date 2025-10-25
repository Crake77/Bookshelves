$total = 0
foreach ($file in @('cross_tag_patterns.json', 'cross_tag_patterns_batch_02.json', 'cross_tag_patterns_batch_03.json', 'cross_tag_patterns_batch_04.json', 'cross_tag_patterns_batch_05.json', 'cross_tag_patterns_batch_06.json', 'cross_tag_patterns_batch_07.json')) {
    $count = (Get-Content $file -Raw | ConvertFrom-Json).patterns.PSObject.Properties.Count
    Write-Host "$file : $count patterns"
    $total += $count
}
Write-Host "Total (with duplicates): $total patterns"
