/**
 * ESP32 Code Templates for Different Communication Protocols
 * These templates can be deployed to ESP32 devices
 */

export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: 'arduino' | 'micropython';
  protocol: 'serial' | 'wifi' | 'websocket' | 'mqtt' | 'ble';
  code: string;
}

export const esp32Templates: CodeTemplate[] = [
  // ============== SERIAL TEMPLATES ==============
  {
    id: 'serial-json-arduino',
    name: 'Serial JSON Communication',
    description: 'Arduino code for JSON-based serial communication',
    language: 'arduino',
    protocol: 'serial',
    code: `// ESP32 Serial JSON Communication
// Compatible with µCodeLab Serial Connection

#include <ArduinoJson.h>

const int LED_PIN = 2;
const int SENSOR_PIN = 34;

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);
  
  pinMode(LED_PIN, OUTPUT);
  pinMode(SENSOR_PIN, INPUT);
  
  Serial.println("{\\"status\\":\\"ready\\",\\"device\\":\\"ESP32\\"}");
}

void loop() {
  // Handle incoming commands
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\\n');
    input.trim();
    handleCommand(input);
  }
  
  // Send periodic sensor data
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 2000) {
    sendSensorData();
    lastUpdate = millis();
  }
}

void handleCommand(String input) {
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, input);
  
  if (error) {
    Serial.println("{\\"error\\":\\"Invalid JSON\\"}");
    return;
  }
  
  String command = doc["command"] | "";
  int value = doc["value"] | 0;
  
  if (command == "led") {
    digitalWrite(LED_PIN, value ? HIGH : LOW);
    Serial.print("{\\"status\\":\\"OK\\",\\"led\\":");
    Serial.print(value);
    Serial.println("}");
  }
  else if (command == "read") {
    sendSensorData();
  }
  else if (command == "ping") {
    Serial.println("{\\"status\\":\\"pong\\"}");
  }
  else {
    Serial.println("{\\"error\\":\\"Unknown command\\"}");
  }
}

void sendSensorData() {
  int sensorValue = analogRead(SENSOR_PIN);
  float voltage = sensorValue * (3.3 / 4095.0);
  float temperature = voltage * 100; // Example conversion
  
  StaticJsonDocument<128> doc;
  doc["temperature"] = temperature;
  doc["humidity"] = random(40, 60);
  doc["sensor_raw"] = sensorValue;
  doc["led_state"] = digitalRead(LED_PIN);
  
  serializeJson(doc, Serial);
  Serial.println();
}`,
  },

  {
    id: 'serial-json-micropython',
    name: 'Serial JSON Communication',
    description: 'MicroPython code for JSON-based serial communication',
    language: 'micropython',
    protocol: 'serial',
    code: `# ESP32 MicroPython Serial JSON Communication
# Compatible with µCodeLab Serial Connection

import json
import time
from machine import Pin, ADC

# Setup
led = Pin(2, Pin.OUT)
sensor = ADC(Pin(34))
sensor.atten(ADC.ATTN_11DB)

def send_json(data):
    """Send JSON data over serial"""
    print(json.dumps(data))

def handle_command(cmd_str):
    """Handle incoming JSON command"""
    try:
        cmd = json.loads(cmd_str)
        command = cmd.get('command', '')
        value = cmd.get('value', 0)
        
        if command == 'led':
            led.value(1 if value else 0)
            send_json({'status': 'OK', 'led': value})
        elif command == 'read':
            send_sensor_data()
        elif command == 'ping':
            send_json({'status': 'pong'})
        else:
            send_json({'error': 'Unknown command'})
    except Exception as e:
        send_json({'error': str(e)})

def send_sensor_data():
    """Send current sensor readings"""
    raw = sensor.read()
    voltage = raw * 3.3 / 4095
    temp = voltage * 100  # Example conversion
    
    send_json({
        'temperature': round(temp, 1),
        'humidity': 50 + (raw % 20),
        'sensor_raw': raw,
        'led_state': led.value()
    })

# Main loop
send_json({'status': 'ready', 'device': 'ESP32-MicroPython'})

last_update = time.ticks_ms()

while True:
    # Check for incoming data
    import sys
    if sys.stdin in select.select([sys.stdin], [], [], 0)[0]:
        line = sys.stdin.readline().strip()
        if line:
            handle_command(line)
    
    # Send periodic updates
    if time.ticks_diff(time.ticks_ms(), last_update) > 2000:
        send_sensor_data()
        last_update = time.ticks_ms()
    
    time.sleep_ms(10)`,
  },

  // ============== WIFI HTTP TEMPLATES ==============
  {
    id: 'wifi-http-arduino',
    name: 'WiFi HTTP REST API',
    description: 'Arduino code for WiFi HTTP REST API server',
    language: 'arduino',
    protocol: 'wifi',
    code: `// ESP32 WiFi HTTP REST API Server
// Compatible with µCodeLab WiFi Connection

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// WiFi credentials - CHANGE THESE
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

WebServer server(80);
const int LED_PIN = 2;
const int SENSOR_PIN = 34;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected! IP: ");
  Serial.println(WiFi.localIP());
  
  // Setup REST endpoints
  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/data", HTTP_GET, handleGetData);
  server.on("/api/control", HTTP_POST, handleControl);
  server.on("/api/status", HTTP_GET, handleStatus);
  
  // Enable CORS
  server.enableCORS(true);
  server.begin();
}

void loop() {
  server.handleClient();
}

void handleRoot() {
  server.send(200, "text/plain", "ESP32 REST API Server");
}

void handleGetData() {
  StaticJsonDocument<256> doc;
  
  int sensorValue = analogRead(SENSOR_PIN);
  float voltage = sensorValue * (3.3 / 4095.0);
  
  doc["temperature"] = voltage * 100;
  doc["humidity"] = random(40, 60);
  doc["sensor_raw"] = sensorValue;
  doc["led_state"] = digitalRead(LED_PIN);
  doc["uptime"] = millis() / 1000;
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleControl() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\\"error\\":\\"No body\\"}");
    return;
  }
  
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  
  if (error) {
    server.send(400, "application/json", "{\\"error\\":\\"Invalid JSON\\"}");
    return;
  }
  
  String command = doc["command"] | "";
  int value = doc["value"] | 0;
  
  if (command == "led") {
    digitalWrite(LED_PIN, value ? HIGH : LOW);
    server.send(200, "application/json", "{\\"status\\":\\"OK\\"}");
  } else {
    server.send(400, "application/json", "{\\"error\\":\\"Unknown command\\"}");
  }
}

void handleStatus() {
  StaticJsonDocument<128> doc;
  doc["status"] = "online";
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}`,
  },

  {
    id: 'wifi-http-micropython',
    name: 'WiFi HTTP REST API',
    description: 'MicroPython code for WiFi HTTP REST API server',
    language: 'micropython',
    protocol: 'wifi',
    code: `# ESP32 MicroPython WiFi HTTP REST API Server
# Compatible with µCodeLab WiFi Connection

import network
import socket
import json
import time
from machine import Pin, ADC

# WiFi credentials - CHANGE THESE
SSID = 'YOUR_WIFI_SSID'
PASSWORD = 'YOUR_WIFI_PASSWORD'

# Setup hardware
led = Pin(2, Pin.OUT)
sensor = ADC(Pin(34))
sensor.atten(ADC.ATTN_11DB)

def connect_wifi():
    """Connect to WiFi network"""
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    
    if not wlan.isconnected():
        print('Connecting to WiFi...')
        wlan.connect(SSID, PASSWORD)
        
        timeout = 20
        while not wlan.isconnected() and timeout > 0:
            time.sleep(1)
            timeout -= 1
            print('.', end='')
    
    if wlan.isconnected():
        print('\\nConnected! IP:', wlan.ifconfig()[0])
        return wlan.ifconfig()[0]
    else:
        print('\\nFailed to connect')
        return None

def get_sensor_data():
    """Get current sensor readings"""
    raw = sensor.read()
    voltage = raw * 3.3 / 4095
    return {
        'temperature': round(voltage * 100, 1),
        'humidity': 50 + (raw % 20),
        'sensor_raw': raw,
        'led_state': led.value(),
        'uptime': time.ticks_ms() // 1000
    }

def handle_request(client, request):
    """Handle HTTP request"""
    try:
        lines = request.split('\\r\\n')
        method, path, _ = lines[0].split(' ')
        
        # CORS headers
        headers = 'HTTP/1.1 200 OK\\r\\n'
        headers += 'Content-Type: application/json\\r\\n'
        headers += 'Access-Control-Allow-Origin: *\\r\\n'
        headers += 'Access-Control-Allow-Methods: GET, POST, OPTIONS\\r\\n'
        headers += 'Access-Control-Allow-Headers: Content-Type\\r\\n'
        headers += '\\r\\n'
        
        if method == 'OPTIONS':
            client.send(headers)
            return
        
        if path == '/' or path == '/api/status':
            response = json.dumps({'status': 'online'})
        elif path == '/api/data':
            response = json.dumps(get_sensor_data())
        elif path == '/api/control' and method == 'POST':
            # Parse body
            body_start = request.find('\\r\\n\\r\\n') + 4
            body = request[body_start:]
            cmd = json.loads(body)
            
            if cmd.get('command') == 'led':
                led.value(1 if cmd.get('value') else 0)
                response = json.dumps({'status': 'OK'})
            else:
                response = json.dumps({'error': 'Unknown command'})
        else:
            headers = 'HTTP/1.1 404 Not Found\\r\\n\\r\\n'
            response = json.dumps({'error': 'Not found'})
        
        client.send(headers + response)
    except Exception as e:
        client.send('HTTP/1.1 500 Error\\r\\n\\r\\n' + json.dumps({'error': str(e)}))

def start_server(ip):
    """Start HTTP server"""
    addr = socket.getaddrinfo(ip, 80)[0][-1]
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(addr)
    s.listen(5)
    print(f'HTTP server running on http://{ip}')
    
    while True:
        client, addr = s.accept()
        try:
            request = client.recv(1024).decode()
            handle_request(client, request)
        except Exception as e:
            print('Error:', e)
        finally:
            client.close()

# Main
ip = connect_wifi()
if ip:
    start_server(ip)`,
  },

  // ============== WEBSOCKET TEMPLATES ==============
  {
    id: 'websocket-arduino',
    name: 'WebSocket Server',
    description: 'Arduino code for WebSocket real-time communication',
    language: 'arduino',
    protocol: 'websocket',
    code: `// ESP32 WebSocket Server
// Compatible with µCodeLab WebSocket Connection

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

WebSocketsServer webSocket = WebSocketsServer(81);
const int LED_PIN = 2;
const int SENSOR_PIN = 34;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  
  Serial.println("WebSocket server started on port 81");
}

void loop() {
  webSocket.loop();
  
  // Broadcast sensor data every 2 seconds
  static unsigned long lastBroadcast = 0;
  if (millis() - lastBroadcast > 2000) {
    broadcastSensorData();
    lastBroadcast = millis();
  }
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected\\n", num);
      break;
      
    case WStype_CONNECTED:
      Serial.printf("[%u] Connected\\n", num);
      webSocket.sendTXT(num, "{\\"status\\":\\"connected\\"}");
      break;
      
    case WStype_TEXT:
      handleMessage(num, (char*)payload);
      break;
  }
}

void handleMessage(uint8_t num, char* payload) {
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload);
  
  if (error) {
    webSocket.sendTXT(num, "{\\"error\\":\\"Invalid JSON\\"}");
    return;
  }
  
  String command = doc["command"] | "";
  int value = doc["value"] | 0;
  
  if (command == "led") {
    digitalWrite(LED_PIN, value ? HIGH : LOW);
    webSocket.sendTXT(num, "{\\"status\\":\\"OK\\",\\"led\\":" + String(value) + "}");
  }
  else if (command == "read") {
    String data = getSensorDataJson();
    webSocket.sendTXT(num, data);
  }
}

void broadcastSensorData() {
  String data = getSensorDataJson();
  webSocket.broadcastTXT(data);
}

String getSensorDataJson() {
  StaticJsonDocument<256> doc;
  int sensorValue = analogRead(SENSOR_PIN);
  
  doc["temperature"] = (sensorValue * 3.3 / 4095.0) * 100;
  doc["humidity"] = random(40, 60);
  doc["led_state"] = digitalRead(LED_PIN);
  doc["timestamp"] = millis();
  
  String output;
  serializeJson(doc, output);
  return output;
}`,
  },

  // ============== MQTT TEMPLATES ==============
  {
    id: 'mqtt-arduino',
    name: 'MQTT Client',
    description: 'Arduino code for MQTT pub/sub communication',
    language: 'arduino',
    protocol: 'mqtt',
    code: `// ESP32 MQTT Client
// Compatible with µCodeLab MQTT Connection

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

// MQTT Topics
const char* TOPIC_SENSOR = "ucodelab/esp32/sensor";
const char* TOPIC_CONTROL = "ucodelab/esp32/control";
const char* TOPIC_STATUS = "ucodelab/esp32/status";

WiFiClient espClient;
PubSubClient client(espClient);

const int LED_PIN = 2;
const int SENSOR_PIN = 34;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  
  setupWiFi();
  
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Publish sensor data every 5 seconds
  static unsigned long lastPublish = 0;
  if (millis() - lastPublish > 5000) {
    publishSensorData();
    lastPublish = millis();
  }
}

void setupWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    String clientId = "ESP32-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.subscribe(TOPIC_CONTROL);
      client.publish(TOPIC_STATUS, "{\\"status\\":\\"online\\"}");
    } else {
      Serial.print("failed, rc=");
      Serial.println(client.state());
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("Message on ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(message);
  
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (!error) {
    String command = doc["command"] | "";
    int value = doc["value"] | 0;
    
    if (command == "led") {
      digitalWrite(LED_PIN, value ? HIGH : LOW);
      client.publish(TOPIC_STATUS, "{\\"led_changed\\":true}");
    }
  }
}

void publishSensorData() {
  StaticJsonDocument<256> doc;
  int sensorValue = analogRead(SENSOR_PIN);
  
  doc["temperature"] = (sensorValue * 3.3 / 4095.0) * 100;
  doc["humidity"] = random(40, 60);
  doc["led_state"] = digitalRead(LED_PIN);
  doc["rssi"] = WiFi.RSSI();
  
  String output;
  serializeJson(doc, output);
  client.publish(TOPIC_SENSOR, output.c_str());
}`,
  },

  {
    id: 'mqtt-micropython',
    name: 'MQTT Client',
    description: 'MicroPython code for MQTT pub/sub communication',
    language: 'micropython',
    protocol: 'mqtt',
    code: `# ESP32 MicroPython MQTT Client
# Compatible with µCodeLab MQTT Connection

import network
import time
import json
from machine import Pin, ADC
from umqtt.simple import MQTTClient

# Configuration
SSID = 'YOUR_WIFI_SSID'
PASSWORD = 'YOUR_WIFI_PASSWORD'
MQTT_BROKER = 'broker.hivemq.com'
MQTT_PORT = 1883
CLIENT_ID = 'esp32_' + str(time.ticks_ms())

# Topics
TOPIC_SENSOR = b'ucodelab/esp32/sensor'
TOPIC_CONTROL = b'ucodelab/esp32/control'
TOPIC_STATUS = b'ucodelab/esp32/status'

# Hardware
led = Pin(2, Pin.OUT)
sensor = ADC(Pin(34))
sensor.atten(ADC.ATTN_11DB)

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print('Connecting to WiFi...')
        wlan.connect(SSID, PASSWORD)
        while not wlan.isconnected():
            time.sleep(1)
    print('WiFi connected:', wlan.ifconfig()[0])

def mqtt_callback(topic, msg):
    """Handle incoming MQTT messages"""
    print(f'Message on {topic}: {msg}')
    try:
        data = json.loads(msg)
        command = data.get('command', '')
        value = data.get('value', 0)
        
        if command == 'led':
            led.value(1 if value else 0)
            client.publish(TOPIC_STATUS, json.dumps({'led_changed': True}))
    except Exception as e:
        print('Error:', e)

def get_sensor_data():
    raw = sensor.read()
    voltage = raw * 3.3 / 4095
    return {
        'temperature': round(voltage * 100, 1),
        'humidity': 50 + (raw % 20),
        'led_state': led.value()
    }

def publish_sensor_data():
    data = json.dumps(get_sensor_data())
    client.publish(TOPIC_SENSOR, data)
    print('Published:', data)

# Connect
connect_wifi()

client = MQTTClient(CLIENT_ID, MQTT_BROKER, port=MQTT_PORT)
client.set_callback(mqtt_callback)
client.connect()
client.subscribe(TOPIC_CONTROL)
client.publish(TOPIC_STATUS, json.dumps({'status': 'online'}))

print('MQTT connected to', MQTT_BROKER)

# Main loop
last_publish = time.ticks_ms()

while True:
    client.check_msg()
    
    if time.ticks_diff(time.ticks_ms(), last_publish) > 5000:
        publish_sensor_data()
        last_publish = time.ticks_ms()
    
    time.sleep_ms(100)`,
  },
];

/**
 * Get templates by protocol
 */
export function getTemplatesByProtocol(protocol: string): CodeTemplate[] {
  return esp32Templates.filter(t => t.protocol === protocol);
}

/**
 * Get templates by language
 */
export function getTemplatesByLanguage(language: 'arduino' | 'micropython'): CodeTemplate[] {
  return esp32Templates.filter(t => t.language === language);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): CodeTemplate | undefined {
  return esp32Templates.find(t => t.id === id);
}
