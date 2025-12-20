# webserial_web.py - Web-based interface (optional)
"""
This module provides a web interface that can be served
when WiFi is connected, but the primary communication
is still via USB serial.
"""

import socket
import network
import ujson


class WebSerialWeb:
    def __init__(self, serial_handler, port=80):
        self.serial = serial_handler
        self.port = port
        self.socket = None

    def start(self):
        # Start WiFi AP
        ap = network.WLAN(network.AP_IF)
        ap.active(True)
        ap.config(essid='ESP32-WebSerial', password='esp32serial')

        # Create socket
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.bind(('', self.port))
        self.socket.listen(5)

        print(f"Web interface: http://{ap.ifconfig()[0]}")

        # Accept connections
        while True:
            conn, addr = self.socket.accept()
            self.handle_client(conn, addr)

    def handle_client(self, conn, addr):
        try:
            request = conn.recv(1024).decode()

            # Simple HTTP response
            response = """HTTP/1.1 200 OK
Content-Type: text/html

<!DOCTYPE html>
<html>
<head>
    <title>ESP32 Web Serial</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        .terminal { background: #000; color: #0f0; padding: 10px; }
    </style>
</head>
<body>
    <h1>ESP32 Web Serial Interface</h1>
    <p>Connect via USB Serial for full control</p>
    <div class="terminal">Web interface is read-only. Use USB serial for commands.</div>
</body>
</html>"""

            conn.send(response)
        except Exception as e:
            print(f"Web error: {e}")
        finally:
            conn.close()
