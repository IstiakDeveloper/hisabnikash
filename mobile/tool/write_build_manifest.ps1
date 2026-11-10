$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$apkPath = Join-Path $projectRoot 'build/app/outputs/flutter-apk/app-debug.apk'
if (-not (Test-Path -LiteralPath $apkPath)) { throw 'Build the debug APK first.' }
$sourceFiles = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'lib') -Recurse -File)
foreach ($relative in @('pubspec.yaml', 'pubspec.lock', 'android/app/build.gradle', 'android/settings.gradle', 'android/gradle/wrapper/gradle-wrapper.properties')) {
    $sourceFiles += Get-Item -LiteralPath (Join-Path $projectRoot $relative)
}
$sourceHashes = @{}
foreach ($sourceFile in ($sourceFiles | Sort-Object FullName)) {
    $relativePath = $sourceFile.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
    $sourceHashes[$relativePath] = (Get-FileHash -LiteralPath $sourceFile.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
}
$manifest = [ordered]@{
    generatedAtUtc = [DateTime]::UtcNow.ToString('o')
    artifact = 'build/app/outputs/flutter-apk/app-debug.apk'
    artifactSha256 = (Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash.ToLowerInvariant()
    bytes = (Get-Item -LiteralPath $apkPath).Length
    build = 'debug; local verification only'
    sourceSha256 = $sourceHashes
}
$artifactDirectory = Join-Path $projectRoot 'artifacts'
New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $artifactDirectory 'android-debug-manifest.json') -Encoding UTF8
Write-Output "Build manifest: $artifactDirectory/android-debug-manifest.json"
