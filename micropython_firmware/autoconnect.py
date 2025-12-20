# autoconnect.py - Auto-detect and connect to ESP32
import serial.tools.list_ports
import serial
import time
import json


def find_esp32():
    """Find ESP32 serial port"""
    for port in serial.tools.list_ports.comports():
        # Check by VID/PID
        if port.vid:
            vid_hex = f"{port.vid:04X}"
            # Common ESP32 USB-Serial chips
            if vid_hex in ['10C4', '1A86', '0403', '303A']:
                return port.device

        # Check by description
        desc = port.description.lower()
        if any(x in desc for x in ['cp210', 'ch340', 'ftdi', 'usb serial', 'esp32']):
            return port.device

    return None


def main():
    # Find and connect
    port = find_esp32()

    if not port:
        print("No ESP32 found. Please connect device.")
        return

    print(f"Found ESP32 on {port}")

    try:
        # Connect
        ser = serial.Serial(port, 115200, timeout=1)
        time.sleep(2)  # Wait for boot

        # Send test command
        ser.write(b'\n')  # Clear any pending input
        ser.write(b'version\n')

        # Read response
        time.sleep(0.5)
        while ser.in_waiting:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if line:
                print(f"ESP32: {line}")

        # Interactive mode
        print("\nInteractive mode. Type commands or 'exit' to quit.")

        while True:
            try:
                cmd = input(">>> ")
                if cmd.lower() == 'exit':
                    break

                ser.write((cmd + '\n').encode())

                # Read response
                time.sleep(0.1)
                while ser.in_waiting:
                    line = ser.readline().decode('utf-8', errors='ignore').strip()
                    if line:
                        print(f"  {line}")

            except KeyboardInterrupt:
                break

        ser.close()

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
