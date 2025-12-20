# deploy_firmware.ps1 - Deploy MicroPython firmware to ESP32 (Windows PowerShell)
param(
    [string]$Port = "COM3",
    [int]$Baud = 115200
)

Write-Host "Deploying MicroPython firmware to $Port..." -ForegroundColor Cyan

# Check if mpremote is installed
$mpremote = Get-Command mpremote -ErrorAction SilentlyContinue
if (-not $mpremote) {
    Write-Host "Installing mpremote..." -ForegroundColor Yellow
    pip install mpremote --upgrade
}

# Copy files to ESP32
Write-Host "Copying files..." -ForegroundColor Green

try {
    mpremote connect $Port cp main.py :
    Write-Host "  - main.py copied" -ForegroundColor Green
    
    mpremote connect $Port cp boot.py :
    Write-Host "  - boot.py copied" -ForegroundColor Green
    
    mpremote connect $Port cp webserial_web.py :
    Write-Host "  - webserial_web.py copied" -ForegroundColor Green
}
catch {
    Write-Host "Error copying files: $_" -ForegroundColor Red
    exit 1
}

# Test connection
Write-Host "Testing connection..." -ForegroundColor Cyan
mpremote connect $Port exec "import machine; print('Machine ID:', machine.unique_id())"

Write-Host "`nDeployment complete!" -ForegroundColor Green
Write-Host "Restart your ESP32 to run the new firmware." -ForegroundColor Yellow
