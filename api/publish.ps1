# SpendTracker Windows Publishing Script
# This script builds a self-contained Windows executable

param(
    [string]$Configuration = "Release",
    [string]$OutputPath = ".\publish\win-x64"
)

Write-Host "=====================================" -ForegroundColor Green
Write-Host "  SpendTracker Windows Publisher" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Navigate to the API project directory
$ProjectPath = ".\src\SpendTracker.Api\SpendTracker.Api.csproj"

if (-not (Test-Path $ProjectPath)) {
    Write-Host "Error: Project file not found at $ProjectPath" -ForegroundColor Red
    exit 1
}

Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
dotnet clean $ProjectPath --configuration $Configuration

Write-Host ""
Write-Host "Restoring packages..." -ForegroundColor Yellow
dotnet restore $ProjectPath

Write-Host ""
Write-Host "Publishing self-contained Windows executable..." -ForegroundColor Yellow
dotnet publish $ProjectPath `
    --configuration $Configuration `
    --runtime win-x64 `
    --self-contained true `
    --output $OutputPath `
    /p:PublishSingleFile=true `
    /p:PublishReadyToRun=true `
    /p:IncludeNativeLibrariesForSelfExtract=true

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed! Check the errors above." -ForegroundColor Red
    exit 1
}

# Read version from csproj for Velopack packaging
$CsprojContent = Get-Content $ProjectPath -Raw
if ($CsprojContent -match '<Version>([\d.]+)</Version>') {
    $PackVersion = $Matches[1]
} else {
    $PackVersion = "1.0.0"
}

Write-Host ""
Write-Host "Packaging with Velopack (version $PackVersion)..." -ForegroundColor Yellow

$VpkAvailable = $null
try { $VpkAvailable = (Get-Command vpk -ErrorAction Stop).Source } catch {}

if ($null -eq $VpkAvailable) {
    Write-Host "vpk CLI not found. Install it with: dotnet tool install -g vpk" -ForegroundColor Yellow
    Write-Host "Skipping Velopack packaging — raw publish output is at: $OutputPath" -ForegroundColor Cyan
} else {
    vpk pack `
        --packId SpendTracker `
        --packVersion $PackVersion `
        --packDir $OutputPath `
        --mainExe SpendTracker.exe

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host "  Build & Package Successful!" -ForegroundColor Green
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Installer:  Releases\SpendTracker-$PackVersion-Setup.exe" -ForegroundColor Cyan
        Write-Host "Portable:   Releases\SpendTracker-$PackVersion-portable.zip" -ForegroundColor Cyan
    } else {
        Write-Host "Velopack packaging failed! Check the errors above." -ForegroundColor Red
        exit 1
    }
}
