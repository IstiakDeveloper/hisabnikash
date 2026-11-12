param(
    [ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version = '0.3.1',
    [string]$SdkRoot = $env:ANDROID_SDK_ROOT,
    [string]$JavaPath = ''
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseDirectory = Join-Path $projectRoot "artifacts/releases/$Version"
$buildDirectory = Join-Path $projectRoot 'build/app/outputs/flutter-apk'
if (-not $SdkRoot) { $SdkRoot = Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
$toolsDirectory = Get-ChildItem -LiteralPath (Join-Path $sdkRoot 'build-tools') -Directory |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'lib/apksigner.jar') } |
    Sort-Object Name -Descending | Select-Object -First 1
if (-not $toolsDirectory) { throw 'Android build tools with apksigner are required.' }
$javaCommand = if ($JavaPath) { $JavaPath } elseif ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin/java.exe' } else { 'java' }
$signer = Join-Path $toolsDirectory.FullName 'lib/apksigner.jar'
$aapt = Join-Path $toolsDirectory.FullName 'aapt.exe'
$packages = @{
    'arm64' = 'app-arm64-v8a-release.apk'
    'armv7' = 'app-armeabi-v7a-release.apk'
    'x64' = 'app-x86_64-release.apk'
}
New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null
$artifacts = [ordered]@{}
foreach ($architecture in ($packages.Keys | Sort-Object)) {
    $source = Join-Path $buildDirectory $packages[$architecture]
    if (-not (Test-Path -LiteralPath $source)) { throw "Build the release split APKs first: missing $source" }
    $verification = & $javaCommand -jar $signer verify --verbose $source 2>&1
    if ($LASTEXITCODE -ne 0) { throw "APK signature failed for $architecture : $verification" }
    $badging = & $aapt dump badging $source 2>&1
    if ($LASTEXITCODE -ne 0 -or ($badging -join "`n") -notmatch "versionName='$([regex]::Escape($Version))'") {
        throw "APK version does not match $Version for $architecture"
    }
    if (($badging -join "`n") -match 'application-debuggable') { throw 'Release APK must not be debuggable.' }
    $name = "hisabnikash-$Version-$architecture.apk"
    $target = Join-Path $releaseDirectory $name
    Copy-Item -LiteralPath $source -Destination $target -Force
    $artifacts[$architecture] = [ordered]@{
        file = $name
        bytes = (Get-Item -LiteralPath $target).Length
        sha256 = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
        signatureVerified = $true
        debuggable = $false
    }
}
$sourceHashes = [ordered]@{}
$sourceFiles = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'lib') -Recurse -File)
foreach ($relative in @('pubspec.yaml', 'pubspec.lock', 'android/app/src/main/AndroidManifest.xml', 'android/app/build.gradle')) {
    $sourceFiles += Get-Item -LiteralPath (Join-Path $projectRoot $relative)
}
foreach ($sourceFile in ($sourceFiles | Sort-Object FullName)) {
    $relative = $sourceFile.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
    $sourceHashes[$relative] = (Get-FileHash -LiteralPath $sourceFile.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
}
$manifest = [ordered]@{
    version = $Version
    generatedAtUtc = [DateTime]::UtcNow.ToString('o')
    build = 'signed Android release; physical-device notification delivery not verified'
    artifacts = $artifacts
    sourceSha256 = $sourceHashes
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $releaseDirectory 'manifest.json') -Encoding UTF8
Write-Output "Verified release packages: $releaseDirectory"
