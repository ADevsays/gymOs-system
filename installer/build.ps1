# GymOS Installer Build Script
# Usage: powershell -ExecutionPolicy Bypass -File installer/build.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$NuxtApp = Join-Path $ProjectRoot "nuxt-app"
$DistDir = Join-Path $ProjectRoot "installer\dist"
$InstallerDir = Join-Path $ProjectRoot "installer"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GymOS Installer Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Build Nuxt ---
Write-Host "[1/6] Building Nuxt application..." -ForegroundColor Yellow
Push-Location $NuxtApp
$RuntimeNode = (Get-Command node).Source
$AbiCheck = & $RuntimeNode -e "try { const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.close(); console.log('better-sqlite3 ABI compatible'); } catch (error) { console.error(error.message); process.exit(1); }"
if ($LASTEXITCODE -ne 0) {
    Write-Host "      Rebuilding better-sqlite3 for the Node.js runtime bundled with GymOS..." -ForegroundColor Yellow
    $BetterSqlitePackage = Get-ChildItem (Join-Path $ProjectRoot "node_modules\.pnpm") -Directory -Filter "better-sqlite3@*" | Select-Object -First 1
    if (-not $BetterSqlitePackage) {
        Pop-Location
        throw "better-sqlite3 package was not found in node_modules."
    }

    Push-Location (Join-Path $BetterSqlitePackage.FullName "node_modules\better-sqlite3")
    npm rebuild --foreground-scripts
    $RebuildExitCode = $LASTEXITCODE
    Pop-Location
    if ($RebuildExitCode -ne 0) {
        Pop-Location
        throw "Could not rebuild better-sqlite3 for the bundled Node.js runtime."
    }

    $AbiCheck = & $RuntimeNode -e "const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.close(); console.log('better-sqlite3 ABI compatible');"
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        throw "better-sqlite3 remains incompatible with the bundled Node.js runtime."
    }
}
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Nuxt build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "[1/6] Nuxt build complete." -ForegroundColor Green

# --- Step 2: Clean and create dist ---
Write-Host "[2/6] Preparing dist directory..." -ForegroundColor Yellow
if (Test-Path $DistDir) { Remove-Item -Recurse -Force $DistDir }
New-Item -ItemType Directory -Force $DistDir | Out-Null

# --- Step 3: Copy server output ---
Write-Host "[3/6] Copying server and public output..." -ForegroundColor Yellow
Copy-Item -Recurse (Join-Path $NuxtApp ".output\server") (Join-Path $DistDir "server")
Copy-Item -Recurse (Join-Path $NuxtApp ".output\public") (Join-Path $DistDir "public")

# User uploads belong in %APPDATA% and must never be shipped in the installer.
$BundledUploads = Join-Path $DistDir "public\uploads"
if (Test-Path $BundledUploads) { Remove-Item -Recurse -Force $BundledUploads }

# Copy WASM dependencies that Nitro bundles skip
Write-Host "      Copying WASM binaries (Tesseract 5.1.1 and libheif)..." -ForegroundColor Yellow
$TesseractCoreDest = Join-Path $DistDir "server\node_modules\tesseract.js-core"
if (Test-Path $TesseractCoreDest) {
    $TesseractWasmFiles = Get-ChildItem (Join-Path $ProjectRoot "node_modules\.pnpm") -Filter "tesseract-core*.wasm" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match "5\.1\.1" }
    if (-not $TesseractWasmFiles) {
        $TesseractWasmFiles = Get-ChildItem (Join-Path $ProjectRoot "node_modules") -Filter "tesseract-core*.wasm" -Recurse -ErrorAction SilentlyContinue
    }
    foreach ($wasm in $TesseractWasmFiles) {
        Copy-Item $wasm.FullName $TesseractCoreDest -Force
    }
}
$LibheifWasm = Get-ChildItem (Join-Path $ProjectRoot "node_modules") -Filter "libheif.wasm" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if ($LibheifWasm) {
    $LibheifDest = Join-Path $DistDir "server\node_modules\libheif-js\libheif-wasm"
    New-Item -ItemType Directory -Force $LibheifDest | Out-Null
    Copy-Item $LibheifWasm.FullName $LibheifDest -Force
}

# --- Step 4: Copy resources ---
Write-Host "[4/6] Copying resources (OCR model, launcher)..." -ForegroundColor Yellow
$ResourcesDir = Join-Path $DistDir "resources\tessdata"
New-Item -ItemType Directory -Force $ResourcesDir | Out-Null
Copy-Item (Join-Path $NuxtApp "ocrb.traineddata") (Join-Path $ResourcesDir "ocrb.traineddata")

# Copy launcher, vbs script and icon
Copy-Item (Join-Path $InstallerDir "launcher.mjs") (Join-Path $DistDir "launcher.mjs")
Copy-Item (Join-Path $InstallerDir "GymOS.vbs") (Join-Path $DistDir "GymOS.vbs")
$IconSource = Join-Path $InstallerDir "assets\icon.ico"
if (-not (Test-Path $IconSource)) {
    node (Join-Path $InstallerDir "generate-icon.mjs")
}
if (Test-Path $IconSource) {
    Copy-Item $IconSource (Join-Path $DistDir "icon.ico")
}

# Compile native GymOS.exe window with embedded WebView2, icon, and AppUserModelID
Write-Host "      Compiling native GymOS.exe (WebView2 standalone window)..." -ForegroundColor Yellow
$AppProj = Join-Path $InstallerDir "GymOS-App\GymOS.csproj"
if (Test-Path $AppProj) {
    dotnet publish $AppProj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=false -o $DistDir
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      Native GymOS.exe published successfully." -ForegroundColor Green
        $NativeExe = Join-Path $DistDir "GymOS.exe"
        if (Test-Path $NativeExe) {
            & (Join-Path $InstallerDir "sign.ps1") -FilePath $NativeExe
        }
    }
}

# Remove build-only artifacts that the desktop host does not need at runtime.
Get-ChildItem $DistDir -Filter "*.pdb" -File -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem $DistDir -Filter "*.xml" -File -ErrorAction SilentlyContinue | Remove-Item -Force

# --- Step 5: Copy Node.js portable ---
Write-Host "[5/6] Copying Node.js portable..." -ForegroundColor Yellow
$NodeExe = (Get-Command node).Source
Copy-Item $NodeExe (Join-Path $DistDir "node.exe")

# Fail the release instead of shipping a server that starts but cannot open SQLite.
Push-Location $DistDir
& .\node.exe -e "const Database = require('./server/node_modules/better-sqlite3'); const db = new Database(':memory:'); db.close(); console.log('Bundled Node.js and better-sqlite3 are compatible.');"
$BundledAbiExitCode = $LASTEXITCODE
Pop-Location
if ($BundledAbiExitCode -ne 0) {
    throw "The bundled Node.js runtime is incompatible with better-sqlite3. Installer build aborted."
}

# --- Step 6: Create .bat launcher (simple fallback) ---
Write-Host "[6/6] Creating launcher batch file..." -ForegroundColor Yellow
$BatContent = @'
@echo off
title GymOS
cd /d "%~dp0"
node.exe launcher.mjs
'@
Set-Content -Path (Join-Path $DistDir "GymOS.bat") -Value $BatContent -Encoding ASCII

# --- Summary ---
$TotalSize = (Get-ChildItem -Recurse $DistDir | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Dist Build Complete!" -ForegroundColor Green
Write-Host "  Output: $DistDir" -ForegroundColor White
Write-Host "  Total size: $([math]::Round($TotalSize, 1)) MB" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

# --- Automatic Inno Setup Compilation & Signing ---
$IsccCandidates = @(
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe"
)
$IsccExe = $IsccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($IsccExe) {
    Write-Host ""
    Write-Host "Compiling Inno Setup installer..." -ForegroundColor Yellow
    $IssPath = Join-Path $InstallerDir "gymos.iss"
    & $IsccExe $IssPath
    if ($LASTEXITCODE -eq 0) {
        $SetupExe = Get-ChildItem (Join-Path $InstallerDir "output") -Filter "GymOS-Setup*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($SetupExe) {
            Write-Host "Signing final setup executable: $($SetupExe.Name)..." -ForegroundColor Yellow
            & (Join-Path $InstallerDir "sign.ps1") -FilePath $SetupExe.FullName
            Write-Host "$($SetupExe.Name) signed successfully!" -ForegroundColor Green
        }
    }
} else {
    Write-Host ""
    Write-Host "Inno Setup compiler not found automatically. Compile manually with installer\gymos.iss" -ForegroundColor Yellow
}

