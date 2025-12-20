# flash_micropython.ps1 - Flash MicroPython firmware to ESP32 (Windows)
param(
    [string]$Port = "COM3",
    [string]$Chip = "esp32",
    [string]$FirmwarePath = ""
)

Write-Host "=== MicroPython Firmware Flasher ===" -ForegroundColor Cyan

# Check if esptool is installed
$esptool = Get-Command esptool.py -ErrorAction SilentlyContinue
if (-not $esptool) {
    Write-Host "Installing esptool..." -ForegroundColor Yellow
    pip install esptool
}

# Download firmware if not provided
if (-not $FirmwarePath) {
    Write-Host "`nNo firmware path provided." -ForegroundColor Yellow
    Write-Host "Download the latest MicroPython firmware from:" -ForegroundColor White
    Write-Host "  ESP32: https://micropython.org/download/ESP32_GENERIC/" -ForegroundColor Green
    Write-Host "  ESP32-S3: https://micropython.org/download/ESP32_GENERIC_S3/" -ForegroundColor Green
    Write-Host "`nThen run: .\flash_micropython.ps1 -Port COM3 -FirmwarePath firmware.bin" -ForegroundColor White
    exit 0
}

# Erase flash
Write-Host "`nStep 1: Erasing flash..." -ForegroundColor Cyan
esptool.py --chip $Chip --port $Port erase_flash

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to erase flash. Check connection and try again." -ForegroundColor Red
    exit 1
}

# Flash firmware
Write-Host "`nStep 2: Flashing firmware..." -ForegroundColor Cyan

$flashAddress = "0x1000"
if ($Chip -eq "esp32s3" -or $Chip -eq "esp32s2" -or $Chip -eq "esp32c3") {
    $flashAddress = "0x0"
}

esptool.py --chip $Chip --port $Port --baud 460800 write_flash -z $flashAddress $FirmwarePath

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to flash firmware." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Firmware flashed successfully! ===" -ForegroundColor Green
Write-Host "Your ESP32 will now restart with MicroPython." -ForegroundColor White
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Run: .\deploy_firmware.ps1 -Port $Port" -ForegroundColor White
Write-Host "  2. Or connect with: python autoconnect.py" -ForegroundColor White
