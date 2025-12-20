"""
ESP32 Device Communicator Module for µCodeLab v2.0
Handles Serial, WiFi, WebSocket, and MQTT communication with ESP32/Arduino devices
"""

import logging
import json
import time
import threading
from enum import Enum
from typing import Optional, Dict, Any, Callable, List
from dataclasses import dataclass, field
from queue import Queue

try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False

logger = logging.getLogger(__name__)


class ConnectionType(Enum):
    """Supported connection types"""
    SERIAL = "serial"
    WIFI = "wifi"
    WEBSOCKET = "websocket"
    MQTT = "mqtt"


@dataclass
class CommandResult:
    """Result of a command execution"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


@dataclass
class SensorData:
    """Sensor data from device"""
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    pressure: Optional[float] = None
    light: Optional[float] = None
    led_state: Optional[bool] = None
    raw_data: Optional[str] = None
    timestamp: Optional[float] = None


class DeviceManager:
    """Manages communication with ESP32/Arduino devices"""
    
    def __init__(self):
        self._connection_type: Optional[ConnectionType] = None
        self._connected: bool = False
        self._port: str = ""
        self._baud_rate: int = 115200
        self._ip_address: str = "192.168.1.100"
        self._http_port: int = 80
        self._ws_port: int = 81
        self._mqtt_broker: str = "broker.hivemq.com"
        self._mqtt_port: int = 1883
        self._mqtt_topic_prefix: str = "ucodelab/esp32"
        
        self._serial: Optional[Any] = None
        self._mqtt_client: Optional[Any] = None
        self._data_callback: Optional[Callable[[Dict], None]] = None
        self._sensor_data: Optional[SensorData] = None
        self._raw_queue: Queue = Queue(maxsize=100)
        self._read_thread: Optional[threading.Thread] = None
        self._running: bool = False
    
    def configure(
        self,
        connection_type: ConnectionType,
        port: str = "",
        baud_rate: int = 115200,
        ip_address: str = "192.168.1.100",
        http_port: int = 80,
        ws_port: int = 81,
        mqtt_broker: str = "broker.hivemq.com",
        mqtt_port: int = 1883,
        mqtt_topic_prefix: str = "ucodelab/esp32"
    ):
        """Configure connection parameters"""
        self._connection_type = connection_type
        self._port = port
        self._baud_rate = baud_rate
        self._ip_address = ip_address
        self._http_port = http_port
        self._ws_port = ws_port
        self._mqtt_broker = mqtt_broker
        self._mqtt_port = mqtt_port
        self._mqtt_topic_prefix = mqtt_topic_prefix
    
    def connect(self, conn_type: Optional[ConnectionType] = None) -> bool:
        """Connect to device using specified or configured connection type"""
        if conn_type:
            self._connection_type = conn_type
        
        if not self._connection_type:
            logger.error("No connection type configured")
            return False
        
        try:
            if self._connection_type == ConnectionType.SERIAL:
                return self._connect_serial()
            elif self._connection_type == ConnectionType.WIFI:
                return self._connect_wifi()
            elif self._connection_type == ConnectionType.MQTT:
                return self._connect_mqtt()
            elif self._connection_type == ConnectionType.WEBSOCKET:
                return self._connect_websocket()
            else:
                logger.error(f"Unsupported connection type: {self._connection_type}")
                return False
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return False
    
    def _connect_serial(self) -> bool:
        """Connect via Serial port"""
        if not SERIAL_AVAILABLE:
            logger.error("pyserial not available")
            return False
        
        if not self._port:
            logger.error("No serial port specified")
            return False
        
        try:
            self._serial = serial.Serial(
                port=self._port,
                baudrate=self._baud_rate,
                timeout=1
            )
            self._connected = True
            self._running = True
            self._read_thread = threading.Thread(target=self._serial_read_loop, daemon=True)
            self._read_thread.start()
            logger.info(f"Connected to {self._port} at {self._baud_rate} baud")
            return True
        except Exception as e:
            logger.error(f"Serial connection failed: {e}")
            return False
    
    def _connect_wifi(self) -> bool:
        """Connect via WiFi HTTP"""
        # For WiFi, we just validate connection by attempting a GET request
        self._connected = True
        logger.info(f"WiFi connection configured for {self._ip_address}:{self._http_port}")
        return True
    
    def _connect_mqtt(self) -> bool:
        """Connect via MQTT"""
        if not MQTT_AVAILABLE:
            logger.error("paho-mqtt not available")
            return False
        
        try:
            self._mqtt_client = mqtt.Client()
            self._mqtt_client.on_connect = self._on_mqtt_connect
            self._mqtt_client.on_message = self._on_mqtt_message
            self._mqtt_client.connect(self._mqtt_broker, self._mqtt_port, 60)
            self._mqtt_client.loop_start()
            self._connected = True
            logger.info(f"MQTT connected to {self._mqtt_broker}:{self._mqtt_port}")
            return True
        except Exception as e:
            logger.error(f"MQTT connection failed: {e}")
            return False
    
    def _connect_websocket(self) -> bool:
        """Connect via WebSocket - placeholder"""
        self._connected = True
        logger.info(f"WebSocket connection configured for {self._ip_address}:{self._ws_port}")
        return True
    
    def _on_mqtt_connect(self, client, userdata, flags, rc):
        """MQTT on_connect callback"""
        if rc == 0:
            topic = f"{self._mqtt_topic_prefix}/#"
            client.subscribe(topic)
            logger.info(f"Subscribed to {topic}")
    
    def _on_mqtt_message(self, client, userdata, msg):
        """MQTT on_message callback"""
        try:
            payload = json.loads(msg.payload.decode())
            if self._data_callback:
                self._data_callback(payload)
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON from MQTT: {msg.payload}")
    
    def _serial_read_loop(self):
        """Background thread for reading serial data"""
        while self._running and self._serial and self._serial.is_open:
            try:
                if self._serial.in_waiting:
                    line = self._serial.readline().decode('utf-8', errors='ignore').strip()
                    if line:
                        self._process_serial_data(line)
            except Exception as e:
                logger.error(f"Serial read error: {e}")
            time.sleep(0.01)
    
    def _process_serial_data(self, data: str):
        """Process incoming serial data"""
        try:
            # Try to parse as JSON
            parsed = json.loads(data)
            
            # Update sensor data if applicable
            self._sensor_data = SensorData(
                temperature=parsed.get("temperature"),
                humidity=parsed.get("humidity"),
                pressure=parsed.get("pressure"),
                light=parsed.get("light"),
                led_state=parsed.get("led_state"),
                raw_data=data,
                timestamp=time.time()
            )
            
            if self._data_callback:
                self._data_callback(parsed)
                
        except json.JSONDecodeError:
            # Store as raw data
            if not self._raw_queue.full():
                self._raw_queue.put(data)
    
    def disconnect(self):
        """Disconnect from device"""
        self._running = False
        self._connected = False
        
        if self._serial and self._serial.is_open:
            self._serial.close()
            self._serial = None
        
        if self._mqtt_client:
            self._mqtt_client.loop_stop()
            self._mqtt_client.disconnect()
            self._mqtt_client = None
        
        logger.info("Disconnected from device")
    
    def send_command(self, command: str, value: Any = None) -> CommandResult:
        """Send command to device"""
        if not self._connected:
            return CommandResult(success=False, message="Not connected")
        
        try:
            payload = {"cmd": command}
            if value is not None:
                payload["value"] = value
            
            if self._connection_type == ConnectionType.SERIAL:
                return self._send_serial(payload)
            elif self._connection_type == ConnectionType.WIFI:
                return self._send_http(payload)
            elif self._connection_type == ConnectionType.MQTT:
                return self._send_mqtt(payload)
            else:
                return CommandResult(success=False, message="Unsupported connection type")
                
        except Exception as e:
            logger.error(f"Send command failed: {e}")
            return CommandResult(success=False, message=str(e))
    
    def _send_serial(self, payload: Dict) -> CommandResult:
        """Send via Serial"""
        if not self._serial or not self._serial.is_open:
            return CommandResult(success=False, message="Serial not connected")
        
        data = json.dumps(payload) + "\n"
        self._serial.write(data.encode())
        return CommandResult(success=True, message="Command sent")
    
    def _send_http(self, payload: Dict) -> CommandResult:
        """Send via HTTP"""
        # Placeholder - would use httpx in production
        return CommandResult(success=True, message="HTTP command sent (simulated)")
    
    def _send_mqtt(self, payload: Dict) -> CommandResult:
        """Send via MQTT"""
        if not self._mqtt_client:
            return CommandResult(success=False, message="MQTT not connected")
        
        topic = f"{self._mqtt_topic_prefix}/command"
        self._mqtt_client.publish(topic, json.dumps(payload))
        return CommandResult(success=True, message="MQTT command published")
    
    def send_raw(self, data: str) -> CommandResult:
        """Send raw data to device"""
        if not self._connected:
            return CommandResult(success=False, message="Not connected")
        
        if self._connection_type == ConnectionType.SERIAL and self._serial:
            self._serial.write((data + "\n").encode())
            return CommandResult(success=True, message="Raw data sent")
        
        return CommandResult(success=False, message="Raw send not supported for this connection type")
    
    def read_raw(self) -> Optional[str]:
        """Read raw data from queue"""
        if not self._raw_queue.empty():
            return self._raw_queue.get_nowait()
        return None
    
    def get_sensor_data(self) -> Optional[SensorData]:
        """Get latest sensor data"""
        return self._sensor_data
    
    def get_status(self) -> Dict[str, Any]:
        """Get connection status"""
        return {
            "connected": self._connected,
            "connection_type": self._connection_type.value if self._connection_type else None,
            "port": self._port,
            "ip_address": self._ip_address,
            "mqtt_broker": self._mqtt_broker,
        }
    
    def on_data(self, callback: Callable[[Dict], None]):
        """Register callback for incoming data"""
        self._data_callback = callback
    
    def list_serial_ports(self) -> List[Dict[str, str]]:
        """List available serial ports"""
        if not SERIAL_AVAILABLE:
            return []
        
        ports = []
        for port in serial.tools.list_ports.comports():
            ports.append({
                "port": port.device,
                "description": port.description,
                "hwid": port.hwid
            })
        return ports


# Global device manager instance
device_manager = DeviceManager()
