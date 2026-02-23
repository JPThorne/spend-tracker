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

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "  Build Successful!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Output location: $OutputPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Files created:" -ForegroundColor Yellow
    Get-ChildItem -Path $OutputPath -Filter "SpendTracker.*" | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  - $($_.Name) ($size MB)" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "To run the application, double-click: SpendTracker.exe" -ForegroundColor Green
    Write-Host ""
    
    # Check if database exists
    $dbPath = Join-Path $OutputPath "spendtracker.db"
    if (Test-Path $dbPath) {
        Write-Host "Note: Existing database found and will be included." -ForegroundColor Yellow
    }
    else {
        Write-Host "Note: Database will be created on first run." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "Build failed! Check the errors above." -ForegroundColor Red
    exit 1
}
