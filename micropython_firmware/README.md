# MicroPython Web Serial Firmware for ESP32

Complete MicroPython implementation for ESP32 Web Serial communication.

## ESP32 Compatibility

| Model | MicroPython Support | Native USB | Recommended Version |
|-------|---------------------|------------|---------------------|
| ESP32 (Generic) | Excellent | No | v1.22+ |
| ESP32-S2 | Good | Yes (CDC) | v1.22+ |
| ESP32-S3 | Excellent | Yes (CDC+JTAG) | v1.22+ |
| ESP32-C3 | Good | Yes (CDC) | v1.22+ |
| ESP32-C6 | Experimental | Yes | Latest daily |

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Flash MicroPython Firmware

**Windows:**
```powershell
.\flash_micropython.ps1 -Port COM3 -FirmwarePath firmware.bin
```

**Linux/Mac:**
```bash
# Erase flash
esptool.py --chip esp32 --port /dev/ttyUSB0 erase_flash

# Flash firmware
esptool.py --chip esp32 --port /dev/ttyUSB0 --baud 460800 write_flash -z 0x1000 firmware.bin
```

Download firmware from: https://micropython.org/download/ESP32_GENERIC/

### 3. Deploy Application Files

**Windows:**
```powershell
.\deploy_firmware.ps1 -Port COM3
```

**Linux/Mac:**
```bash
chmod +x deploy_firmware.sh
./deploy_firmware.sh /dev/ttyUSB0
```

### 4. Test Connection

```bash
python autoconnect.py
```

## Files

| File | Description |
|------|-------------|
| `main.py` | Main MicroPython application with Web Serial handler |
| `boot.py` | Boot configuration (runs on startup) |
| `webserial_web.py` | Optional web interface module |
| `backend_server.py` | Python backend server for bridging Web Serial |
| `autoconnect.py` | Auto-detect and connect script |

## Supported Commands

### Text Commands
- `help` - List available commands
- `version` - Show MicroPython version
- `gpio <pin> <0/1>` - Set GPIO pin value
- `reboot` - Restart ESP32

### JSON Commands

```json
{"command": "ping"}
{"command": "version"}
{"command": "system_info"}
{"command": "gpio_read", "pin": 2}
{"command": "gpio_write", "pin": 2, "value": 1}
{"command": "adc_read", "pin": 36}
{"command": "i2c_scan", "scl": 22, "sda": 21}
{"command": "wifi_scan"}
{"command": "wifi_connect", "ssid": "MyNetwork", "password": "secret"}
{"command": "file_list", "path": "/"}
{"command": "file_read", "filename": "main.py"}
{"command": "reboot"}
```

## Architecture

```
USB Serial (115200 baud)
         ↓
MicroPython on ESP32
         ↓
JSON Protocol over UART
         ↓
Python Backend Server
         ↓
REST API / WebSockets
         ↓
Web Frontend
```

## Running the Backend Server

```bash
# Auto-detect ESP32 and start server
python backend_server.py

# Or specify port
python backend_server.py COM3
```

The server runs on `http://localhost:5000` with these endpoints:

- `POST /api/connect` - Connect to ESP32
- `POST /api/command` - Send command
- `GET /api/ports` - List serial ports
- `GET /api/stream` - SSE stream for real-time data

## Troubleshooting

### Port Not Found
- Check USB cable is data-capable (not charge-only)
- Install drivers for your USB-Serial chip (CP210x, CH340, FTDI)
- Check Device Manager (Windows) or `ls /dev/tty*` (Linux)

### Connection Failed
- Close Arduino IDE Serial Monitor
- Close any other program using the port
- Try unplugging and replugging the USB cable

### Boot Loop
- Hold BOOT button while pressing RESET
- Flash firmware again with `erase_flash` first
