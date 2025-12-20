#!/bin/bash
# deploy_firmware.sh - Deploy MicroPython firmware to ESP32 (Linux/Mac)

PORT=${1:-/dev/ttyUSB0}
BAUD=${2:-115200}

echo "Deploying MicroPython firmware to $PORT..."

# Install mpremote if not available
pip install mpremote --upgrade

# Copy files to ESP32
echo "Copying files..."
mpremote connect $PORT cp main.py :
mpremote connect $PORT cp boot.py :
mpremote connect $PORT cp webserial_web.py :

# Test connection
echo "Testing connection..."
mpremote connect $PORT exec "import machine; print('Machine:', machine.unique_id())"

echo "Deployment complete!"
