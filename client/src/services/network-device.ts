/**
 * Network Device Service
 * Connect to ESP32/ESP8266 over WiFi using IP address
 * Both devices must be on the same network
 */

export interface DeviceInfo {
  ip: string;
  name: string;
  type: 'esp32' | 'esp8266' | 'arduino' | 'unknown';
  connected: boolean;
  lastSeen?: Date;
  rssi?: number;
  firmware?: string;
}

export interface NetworkLogEntry {
  id: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  timestamp: string;
}

type LogCallback = (log: NetworkLogEntry) => void;
type StatusCallback = (device: DeviceInfo | null) => void;
type MessageCallback = (data: string) => void;

class NetworkDeviceService {
  private device: DeviceInfo | null = null;
  private ws: WebSocket | null = null;
  private logListeners: Set<LogCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private messageListeners: Set<MessageCallback> = new Set();
  private logIdCounter = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  private log(level: NetworkLogEntry['level'], source: string, message: string): void {
    const entry: NetworkLogEntry = {
      id: `net-${++this.logIdCounter}-${Date.now()}`,
      level,
      source,
      message,
      timestamp: new Date().toISOString(),
    };
    this.logListeners.forEach(cb => cb(entry));
  }

  subscribeToLogs(callback: LogCallback): () => void {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  subscribeToStatus(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  subscribeToMessages(callback: MessageCallback): () => void {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  private notifyStatus(): void {
    this.statusListeners.forEach(cb => cb(this.device));
  }

  private notifyMessage(data: string): void {
    this.messageListeners.forEach(cb => cb(data));
  }

  getDevice(): DeviceInfo | null {
    return this.device ? { ...this.device } : null;
  }

  isConnected(): boolean {
    return this.device?.connected ?? false;
  }

  /**
   * Ping device to check if it's reachable
   */
  async pingDevice(ip: string): Promise<{ success: boolean; latency?: number }> {
    this.log('debug', 'network', `Pinging ${ip}...`);
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`http://${ip}/ping`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        this.log('info', 'network', `Device at ${ip} responded in ${latency}ms`);
        return { success: true, latency };
      }
      return { success: false };
    } catch (error) {
      this.log('debug', 'network', `No response from ${ip}`);
      return { success: false };
    }
  }

  /**
   * Scan local network for devices (checks common IPs)
   */
  async scanNetwork(baseIp: string = '192.168.1'): Promise<DeviceInfo[]> {
    this.log('info', 'network', `Scanning network ${baseIp}.x for devices...`);
    const devices: DeviceInfo[] = [];
    const promises: Promise<void>[] = [];

    // Scan common IP ranges (1-254)
    // For speed, we'll check a subset first
    const priorityIps = [1, 100, 101, 102, 103, 104, 105, 150, 200];
    
    for (const lastOctet of priorityIps) {
      const ip = `${baseIp}.${lastOctet}`;
      promises.push(
        this.pingDevice(ip).then(result => {
          if (result.success) {
            devices.push({
              ip,
              name: `Device at ${ip}`,
              type: 'unknown',
              connected: false,
            });
          }
        })
      );
    }

    await Promise.all(promises);
    this.log('info', 'network', `Found ${devices.length} potential devices`);
    return devices;
  }

  /**
   * Connect to device via WebSocket
   */
  async connect(ip: string, port: number = 81): Promise<boolean> {
    if (this.ws) {
      this.disconnect();
    }

    this.log('info', 'network', `Connecting to ws://${ip}:${port}...`);

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(`ws://${ip}:${port}`);

        const timeout = setTimeout(() => {
          this.log('error', 'network', 'Connection timeout');
          this.ws?.close();
          resolve(false);
        }, 5000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.log('info', 'network', `Connected to ${ip}:${port}`);
          
          this.device = {
            ip,
            name: `ESP Device`,
            type: 'esp32',
            connected: true,
            lastSeen: new Date(),
          };
          
          this.notifyStatus();
          this.startPingInterval();
          
          // Request device info
          this.send('GET_INFO');
          
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          const data = event.data.toString();
          this.log('debug', 'rx', `Received: ${data}`);
          this.parseMessage(data);
          this.notifyMessage(data);
          
          if (this.device) {
            this.device.lastSeen = new Date();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          this.log('error', 'network', `WebSocket error`);
          resolve(false);
        };

        this.ws.onclose = () => {
          this.log('info', 'network', 'Connection closed');
          this.handleDisconnect();
        };

      } catch (error: any) {
        this.log('error', 'network', `Failed to connect: ${error.message}`);
        resolve(false);
      }
    });
  }

  /**
   * Connect via HTTP polling (fallback if WebSocket not available)
   */
  async connectHttp(ip: string, port: number = 80): Promise<boolean> {
    this.log('info', 'network', `Connecting to http://${ip}:${port}...`);

    try {
      const response = await fetch(`http://${ip}:${port}/info`, {
        method: 'GET',
      });

      if (response.ok) {
        const info = await response.json();
        
        this.device = {
          ip,
          name: info.name || `ESP Device`,
          type: info.type || 'esp32',
          connected: true,
          lastSeen: new Date(),
          firmware: info.firmware,
        };

        this.log('info', 'network', `Connected to ${this.device.name} at ${ip}`);
        this.notifyStatus();
        this.startHttpPolling(ip, port);
        
        return true;
      }
    } catch (error: any) {
      this.log('error', 'network', `HTTP connection failed: ${error.message}`);
    }

    return false;
  }

  private startHttpPolling(ip: string, port: number): void {
    this.pingInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://${ip}:${port}/status`, {
          method: 'GET',
        });
        
        if (response.ok) {
          const data = await response.json();
          this.parseMessage(JSON.stringify(data));
          if (this.device) {
            this.device.lastSeen = new Date();
          }
        } else {
          this.handleDisconnect();
        }
      } catch {
        this.handleDisconnect();
      }
    }, 1000);
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('PING');
      }
    }, 5000);
  }

  private parseMessage(data: string): void {
    // Parse device info response
    if (data.startsWith('INFO:')) {
      const parts = data.substring(5).split(',');
      if (this.device && parts.length >= 2) {
        this.device.name = parts[0];
        this.device.type = parts[1] as DeviceInfo['type'];
        this.device.firmware = parts[2];
        this.log('info', 'network', `Device: ${this.device.name} (${this.device.type})`);
        this.notifyStatus();
      }
      return;
    }

    // Parse RSSI update
    if (data.startsWith('RSSI:')) {
      const rssi = parseInt(data.substring(5));
      if (this.device && !isNaN(rssi)) {
        this.device.rssi = rssi;
        this.notifyStatus();
      }
      return;
    }

    // Parse PONG response
    if (data === 'PONG') {
      this.log('debug', 'network', 'Heartbeat OK');
      return;
    }

    // Parse variable updates (VAR:name=value)
    if (data.startsWith('VAR:')) {
      const [name, value] = data.substring(4).split('=');
      window.dispatchEvent(new CustomEvent('device-variable-update', {
        detail: { name, value: this.parseValue(value) }
      }));
      return;
    }
  }

  private parseValue(value: string): any {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
    return value;
  }

  /**
   * Send data to device
   */
  async send(data: string): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.log('debug', 'tx', `Sending: ${data}`);
      this.ws.send(data);
      return true;
    }

    // Fallback to HTTP POST
    if (this.device?.ip) {
      try {
        await fetch(`http://${this.device.ip}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: data,
        });
        this.log('debug', 'tx', `Sent via HTTP: ${data}`);
        return true;
      } catch {
        this.log('error', 'tx', 'Failed to send command');
      }
    }

    return false;
  }

  /**
   * Send command to control a variable
   */
  async setVariable(name: string, value: any): Promise<boolean> {
    return this.send(`SET:${name}=${value}`);
  }

  /**
   * Call a function on the device
   */
  async callFunction(name: string, ...args: any[]): Promise<boolean> {
    const argsStr = args.length > 0 ? `:${args.join(',')}` : '';
    return this.send(`CALL:${name}${argsStr}`);
  }

  /**
   * Disconnect from device
   */
  disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.handleDisconnect();
  }

  private handleDisconnect(): void {
    if (this.device) {
      this.device.connected = false;
      this.notifyStatus();
      this.device = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Get Arduino code for network communication
   */
  getArduinoCode(): string {
    return `// Network Communication for µCodeLab - ESP32
// Allows browser to connect via WebSocket over WiFi

#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

WebServer server(80);
WebSocketsServer webSocket(81);

// Variables that can be controlled from dashboard
//@bind_widget(id="led-toggle")
bool ledState = false;

//@bind_widget(id="brightness-slider")  
int brightness = 128;

void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch(type) {
    case WStype_CONNECTED:
      Serial.printf("[WS] Client %u connected\\n", num);
      webSocket.sendTXT(num, "INFO:uCodeLab-Device,esp32,1.0.0");
      break;
      
    case WStype_DISCONNECTED:
      Serial.printf("[WS] Client %u disconnected\\n", num);
      break;
      
    case WStype_TEXT: {
      String msg = String((char*)payload);
      Serial.printf("[WS] Received: %s\\n", msg.c_str());
      
      if (msg == "PING") {
        webSocket.sendTXT(num, "PONG");
      }
      else if (msg == "GET_INFO") {
        webSocket.sendTXT(num, "INFO:uCodeLab-Device,esp32,1.0.0");
        String rssi = "RSSI:" + String(WiFi.RSSI());
        webSocket.sendTXT(num, rssi.c_str());
      }
      else if (msg.startsWith("SET:")) {
        // Parse SET:varName=value
        String params = msg.substring(4);
        int eq = params.indexOf('=');
        String varName = params.substring(0, eq);
        String value = params.substring(eq + 1);
        
        if (varName == "ledState") {
          ledState = (value == "true" || value == "1");
          digitalWrite(LED_BUILTIN, ledState);
          broadcastVariable("ledState", ledState ? "1" : "0");
        }
        else if (varName == "brightness") {
          brightness = value.toInt();
          analogWrite(LED_BUILTIN, brightness);
          broadcastVariable("brightness", String(brightness));
        }
      }
      else if (msg.startsWith("CALL:")) {
        String funcName = msg.substring(5);
        if (funcName == "toggleLED") {
          ledState = !ledState;
          digitalWrite(LED_BUILTIN, ledState);
          broadcastVariable("ledState", ledState ? "1" : "0");
        }
      }
      break;
    }
  }
}

void broadcastVariable(String name, String value) {
  String msg = "VAR:" + name + "=" + value;
  webSocket.broadcastTXT(msg.c_str());
}

void setupServer() {
  server.on("/", []() {
    String html = "<h1>uCodeLab Device</h1>";
    html += "<p>IP: " + WiFi.localIP().toString() + "</p>";
    html += "<p>RSSI: " + String(WiFi.RSSI()) + " dBm</p>";
    html += "<p>WebSocket: ws://" + WiFi.localIP().toString() + ":81</p>";
    server.send(200, "text/html", html);
  });
  
  server.on("/ping", []() {
    server.send(200, "text/plain", "pong");
  });
  
  server.on("/info", []() {
    String json = "{\\"name\\":\\"uCodeLab-Device\\",";
    json += "\\"type\\":\\"esp32\\",";
    json += "\\"ip\\":\\"" + WiFi.localIP().toString() + "\\",";
    json += "\\"rssi\\":" + String(WiFi.RSSI()) + "}";
    server.send(200, "application/json", json);
  });
  
  server.begin();
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  
  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected! IP: ");
  Serial.println(WiFi.localIP());
  
  // Start servers
  setupServer();
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  
  Serial.println("WebSocket server started on port 81");
}

void loop() {
  server.handleClient();
  webSocket.loop();
  
  // Broadcast variable updates periodically
  static unsigned long lastBroadcast = 0;
  if (millis() - lastBroadcast > 1000) {
    lastBroadcast = millis();
    broadcastVariable("ledState", ledState ? "1" : "0");
    broadcastVariable("brightness", String(brightness));
  }
}`;
  }
}

export const networkDevice = new NetworkDeviceService();
