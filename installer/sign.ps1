# Digital signing script for GymOS
param (
    [string]$FilePath
)

$ErrorActionPreference = "Stop"

# Retrieve or generate CodeSigning certificate
$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -like "*Gym AGOD*" } | Select-Object -First 1

if (-not $cert) {
    Write-Host "Creating self-signed code signing certificate for Gym AGOD..." -ForegroundColor Cyan
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Gym AGOD, O=Gym AGOD, C=CO" -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(5)
}

# Export public certificate (.cer) so it can be installed on destination computers
$CertDir = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "output"
if (-not (Test-Path $CertDir)) {
    New-Item -ItemType Directory -Force $CertDir | Out-Null
}
$CerPath = Join-Path $CertDir "GymAGOD-Certificate.cer"
Export-Certificate -Cert $cert -FilePath $CerPath -Force | Out-Null

if ($FilePath -and (Test-Path $FilePath)) {
    Write-Host "Signing: $FilePath..." -ForegroundColor Yellow
    Set-AuthenticodeSignature -FilePath $FilePath -Certificate $cert -TimestampServer "http://timestamp.digicert.com" | Out-Null
    Write-Host "Successfully signed: $FilePath" -ForegroundColor Green
}
