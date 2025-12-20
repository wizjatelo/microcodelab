# backend_server.py - Python backend to bridge Web Serial
import serial
import json
import time
import threading
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import logging


class ESP32WebSerialBackend:
    def __init__(self, port=None, baudrate=115200):
        self.port = port
        self.baudrate = baudrate
        self.serial = None
        self.running = False
        self.callbacks = []
        self.logger = logging.getLogger(__name__)

        # Auto-detect port if not specified
        if not port:
            self.port = self.autodetect_port()

        self.connect()

    def autodetect_port(self):
        """Auto-detect ESP32 serial port"""
        import serial.tools.list_ports

        # Common USB-Serial vendor IDs
        vendor_ids = {
            '10C4': 'CP210x',
            '1A86': 'CH340',
            '0403': 'FTDI',
            '303A': 'ESP32-Sx USB'
        }

        for port in serial.tools.list_ports.comports():
            if port.vid:
                vid_hex = f"{port.vid:04X}"
                if vid_hex in vendor_ids:
                    print(f"Found {vendor_ids[vid_hex]} on {port.device}")
                    return port.device

        raise Exception("No ESP32 found. Connect device and try again.")

    def connect(self):
        """Connect to ESP32"""
        try:
            self.serial = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=1,
                write_timeout=1
            )

            # Flush buffers
            self.serial.reset_input_buffer()
            self.serial.reset_output_buffer()

            print(f"Connected to {self.port} at {self.baudrate} baud")
            self.start_reading()

        except Exception as e:
            print(f"Connection failed: {e}")
            raise

    def start_reading(self):
        """Start background reading thread"""
        self.running = True
        self.thread = threading.Thread(target=self.read_loop, daemon=True)
        self.thread.start()

    def read_loop(self):
        """Background thread for reading serial data"""
        buffer = ""

        while self.running and self.serial:
            try:
                # Read available data
                if self.serial.in_waiting:
                    data = self.serial.read(self.serial.in_waiting).decode('utf-8', errors='ignore')
                    buffer += data

                    # Process complete lines
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        line = line.strip()
                        if line:
                            self.process_line(line)

                time.sleep(0.01)  # Small delay

            except Exception as e:
                self.logger.error(f"Read error: {e}")
                time.sleep(1)

    def process_line(self, line):
        """Process received line"""
        try:
            # Try to parse as JSON
            if line.startswith('{') or line.startswith('['):
                data = json.loads(line)
                self.notify_callbacks('json', data)
            else:
                self.notify_callbacks('text', line)
        except json.JSONDecodeError:
            # Not JSON, treat as text
            self.notify_callbacks('text', line)

    def send_command(self, command):
        """Send command to ESP32"""
        try:
            if isinstance(command, dict):
                # JSON command
                json_str = json.dumps(command)
                self.serial.write((json_str + '\n').encode('utf-8'))
            else:
                # Text command
                self.serial.write((str(command) + '\n').encode('utf-8'))
            return True
        except Exception as e:
            self.logger.error(f"Send error: {e}")
            return False

    def add_callback(self, callback):
        """Add callback for received data"""
        self.callbacks.append(callback)

    def notify_callbacks(self, type, data):
        """Notify all callbacks"""
        for callback in self.callbacks:
            try:
                callback(type, data)
            except Exception as e:
                self.logger.error(f"Callback error: {e}")

    def close(self):
        """Close connection"""
        self.running = False
        if self.serial:
            self.serial.close()


# Flask REST API
app = Flask(__name__)
CORS(app)

# Global ESP32 instance
esp32 = None


@app.route('/api/connect', methods=['POST'])
def connect():
    """Connect to ESP32"""
    global esp32

    try:
        data = request.json
        port = data.get('port')
        baudrate = data.get('baudrate', 115200)

        if esp32:
            esp32.close()

        esp32 = ESP32WebSerialBackend(port, baudrate)

        return jsonify({
            'success': True,
            'message': f'Connected to {esp32.port}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400


@app.route('/api/command', methods=['POST'])
def send_command():
    """Send command to ESP32"""
    if not esp32:
        return jsonify({
            'success': False,
            'error': 'Not connected'
        }), 400

    try:
        data = request.json
        command = data.get('command')

        if not command:
            return jsonify({
                'success': False,
                'error': 'No command specified'
            }), 400

        success = esp32.send_command(command)

        return jsonify({
            'success': success,
            'message': 'Command sent' if success else 'Failed to send'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400


@app.route('/api/ports', methods=['GET'])
def list_ports():
    """List available serial ports"""
    import serial.tools.list_ports

    ports = []
    for port in serial.tools.list_ports.comports():
        ports.append({
            'device': port.device,
            'description': port.description,
            'manufacturer': port.manufacturer,
            'vid': f"{port.vid:04X}" if port.vid else None,
            'pid': f"{port.pid:04X}" if port.pid else None
        })

    return jsonify({'ports': ports})


@app.route('/api/stream', methods=['GET'])
def stream_data():
    """SSE stream for real-time data"""
    def generate():
        if not esp32:
            yield 'data: {"error": "Not connected"}\n\n'
            return

        def callback(type, data):
            if type == 'json':
                yield f"data: {json.dumps(data)}\n\n"
            else:
                yield f"data: {json.dumps({'text': data})}\n\n"

        # Add callback
        esp32.add_callback(callback)

        # Keep connection alive
        while True:
            time.sleep(1)
            yield ': keepalive\n\n'

    return Response(generate(), mimetype='text/event-stream')


if __name__ == '__main__':
    # Configure logging
    logging.basicConfig(level=logging.INFO)

    # Auto-connect if port specified
    import sys
    if len(sys.argv) > 1:
        port = sys.argv[1]
        try:
            esp32 = ESP32WebSerialBackend(port)
            print(f"Auto-connected to {port}")
        except Exception as e:
            print(f"Auto-connect failed: {e}")

    # Start Flask server
    app.run(host='0.0.0.0', port=5000, debug=True)
