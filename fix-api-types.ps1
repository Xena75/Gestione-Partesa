# Script per correggere i tipi dei parametri API per Next.js 15
$files = @(
    "src\app\api\employees\[id]\profile-image\route.ts",
    "src\app\api\employees\[id]\route.ts", 
    "src\app\api\employees\[id]\username\route.ts",
    "src\app\api\vehicles\quotes\[id]\invoice\route.ts",
    "src\app\api\vehicles\quotes\[id]\documents\route.ts",
    "src\app\api\monitoraggio\[id]\images\[imageId]\route.ts"
)

foreach ($file in $files) {
    $fullPath = "M:\Progetti\In produzione\gestione-partesa\$file"
    if (Test-Path $fullPath) {
        Write-Host "Correggendo $file..."
        $content = Get-Content $fullPath -Raw
        
        # Corregge i tipi dei parametri per Next.js 15
        $content = $content -replace '{ params }: { params: { id: string } }', '{ params }: { params: Promise<{ id: string }> }'
        $content = $content -replace '{ params }: { params: { id: string; imageId: string } }', '{ params }: { params: Promise<{ id: string; imageId: string }> }'
        
        Set-Content $fullPath $content -NoNewline
        Write-Host "Corretto $file"
    } else {
        Write-Host "File non trovato: $file"
    }
}

Write-Host "Correzioni completate