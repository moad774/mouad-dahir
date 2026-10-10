$landingDir = "C:\Users\Ibtis\.gemini\antigravity\scratch\cellulite-massager-landing"
$imgPath = Join-Path $landingDir "images\product-main.jpg"
$lifePath = Join-Path $landingDir "images\lifestyle.jpg"
$usagePath = Join-Path $landingDir "images\usage.jpg"

$mainBytes = [System.IO.File]::ReadAllBytes($imgPath)
$mainB64 = "data:image/jpeg;base64," + [System.Convert]::ToBase64String($mainBytes)

$lifeBytes = [System.IO.File]::ReadAllBytes($lifePath)
$lifeB64 = "data:image/jpeg;base64," + [System.Convert]::ToBase64String($lifeBytes)

$usageBytes = [System.IO.File]::ReadAllBytes($usagePath)
$usageB64 = "data:image/jpeg;base64," + [System.Convert]::ToBase64String($usageBytes)

$cssContent = [System.IO.File]::ReadAllText((Join-Path $landingDir "style.css"), [System.Text.Encoding]::UTF8)
$jsContent = [System.IO.File]::ReadAllText((Join-Path $landingDir "app.js"), [System.Text.Encoding]::UTF8)
$htmlContent = [System.IO.File]::ReadAllText((Join-Path $landingDir "index.html"), [System.Text.Encoding]::UTF8)

# Replace css link with style tag
$htmlContent = $htmlContent.Replace('<link rel="stylesheet" href="style.css">', "<style>`n$cssContent`n</style>")

# Replace script tag with inline script
$htmlContent = $htmlContent.Replace('<script src="app.js"></script>', "<script>`n$jsContent`n</script>")

# Replace image paths with base64 data URIs
$htmlContent = $htmlContent.Replace('images/product-main.jpg', $mainB64)
$htmlContent = $htmlContent.Replace('images/lifestyle.jpg', $lifeB64)
$htmlContent = $htmlContent.Replace('images/usage.jpg', $usageB64)

$outPath = Join-Path $landingDir "youcan-shopify-code.html"
[System.IO.File]::WriteAllText($outPath, $htmlContent, [System.Text.Encoding]::UTF8)
Write-Output "Successfully generated $outPath. Size: $( (Get-Item $outPath).Length ) bytes"
