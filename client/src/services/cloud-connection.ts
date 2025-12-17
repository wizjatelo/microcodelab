/**
 * Cloud Connection Service for IoT
 * Connect to devices via MQTT brokers (HiveMQ, Adafruit IO, custom)
 * Works from anywhere - no need to be on same network
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';

export interface CloudProvider {
  id: string;
  name: string;
  broker: string;
  port: number;
  protocol: 'wss' | 'ws' | 'mqtt' | 'mqtts';
  requiresAuth: boolean;
  description: string;
  signupUrl?: string;
}

export const CLOUD_PROVIDERS: CloudProvider[] = [
  {
    id: 'hivemq',
    name: 'HiveMQ Cloud',
    broker: 'broker.hivemq.com',
    port: 8884,
    protocol: 'wss',
    requiresAuth: false,
    description: 'Free public broker - great for testing',
    signupUrl: 'https://www.hivemq.com/mqtt-cloud-broker/',
  },
  {
    id: 'emqx',
    name: 'EMQX Public',
    broker: 'broker.emqx.io',
    port: 8084,
    protocol: 'wss',
    requiresAuth: false,
    description: 'Free public MQTT broker',
  },
  {
    id: 'mosquitto',
    name: 'Eclipse Mosquitto',
    broker: 'test.mosquitto.org',
    port: 8081,
    protocol: 'wss',
    requiresAuth: false,
    description: 'Eclipse test broker',
  },
  {
    id: 'adafruit',
    name: 'Adafruit IO',
    broker: 'io.adafruit.com',
    port: 443,
    protocol: 'wss',
    requiresAuth: true,
    description: 'IoT platform with dashboards',
    signupUrl: 'https://io.adafruit.com/',
  },
  {
    id: 'custom',
    name: 'Custom Broker',
    broker: '',
    port: 8883,
    protocol: 'wss',
    requiresAuth: false,
    description: 'Your own MQTT broker',
  },
];

export interface CloudConfig {
  provider: string;
  broker: string;
  port: number;
  protocol: 'wss' | 'ws';
  username?: string;
  password?: string;
  clientId: string;
  deviceTopic: string; // Topic prefix for device communication
}

export interface CloudLogEntry {
  id: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  timestamp: string;
}

export interface CloudStatus {
  connected: boolean;
  broker?: string;
  clientId?: string;
  deviceOnline?: boolean;
  lastMessage?: Date;
}

type LogCallback = (log: CloudLogEntry) => void;
type StatusCallback = (status: CloudStatus) => void;
type MessageCallback = (topic: string, message: string) => void;

class CloudConnectionService {
  private client: MqttClient | null = null;
  private config: CloudConfig | null = null;
  private status: CloudStatus = { connected: false };
  private logListeners: Set<LogCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private messageListeners: Set<MessageCallback> = new Set();
  private logIdCounter = 0;
  private subscribedTopics: Set<string> = new Set();

  private log(level: CloudLogEntry['level'], source: string, message: string): void {
    const entry: CloudLogEntry = {
      id: `cloud-${++this.logIdCounter}-${Date.now()}`,
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
    this.statusListeners.forEach(cb => cb(this.status));
  }

  private notifyMessage(topic: string, message: string): void {
    this.messageListeners.forEach(cb => cb(topic, message));
  }

  getStatus(): CloudStatus {
    return { ...this.status };
  }

  isConnected(): boolean {
    return this.status.connected;
  }

  /**
   * Connect to MQTT broker
   */
  async connect(config: CloudConfig): Promise<boolean> {
    if (this.client) {
      await this.disconnect();
    }

    this.config = config;
    const url = `${config.protocol}://${config.broker}:${config.port}/mqtt`;
    
    this.log('info', 'cloud', `Connecting to ${config.broker}...`);
    this.log('debug', 'cloud', `URL: ${url}`);
    this.log('debug', 'cloud', `Client ID: ${config.clientId}`);

    return new Promise((resolve) => {
      try {
        const options: IClientOptions = {
          clientId: config.clientId,
          clean: true,
          connectTimeout: 10000,
          reconnectPeriod: 5000,
        };

        if (config.username) {
          options.username = config.username;
          options.password = config.password;
          this.log('debug', 'cloud', 'Using authentication');
        }

        this.client = mqtt.connect(url, options);

        this.client.on('connect', () => {
          this.log('info', 'cloud', `Connected to ${config.broker}`);
          this.status = {
            connected: true,
            broker: config.broker,
            clientId: config.clientId,
          };
          this.notifyStatus();

          // Subscribe to device topics
          this.subscribeToDeviceTopics();
          resolve(true);
        });

        this.client.on('message', (topic, payload) => {
          const message = payload.toString();
          this.log('debug', 'rx', `[${topic}] ${message}`);
          this.status.lastMessage = new Date();
          this.parseMessage(topic, message);
          this.notifyMessage(topic, message);
        });

        this.client.on('error', (error) => {
          this.log('error', 'cloud', `Error: ${error.message}`);
        });

        this.client.on('close', () => {
          this.log('info', 'cloud', 'Connection closed');
          this.status.connected = false;
          this.notifyStatus();
        });

        this.client.on('reconnect', () => {
          this.log('info', 'cloud', 'Reconnecting...');
        });

        // Timeout
        setTimeout(() => {
          if (!this.status.connected) {
            this.log('error', 'cloud', 'Connection timeout');
            this.client?.end();
            resolve(false);
          }
        }, 15000);

      } catch (error: any) {
        this.log('error', 'cloud', `Failed: ${error.message}`);
        resolve(false);
      }
    });
  }

  private subscribeToDeviceTopics(): void {
    if (!this.client || !this.config) return;

    const baseTopic = this.config.deviceTopic;
    const topics = [
      `${baseTopic}/status`,
      `${baseTopic}/data`,
      `${baseTopic}/response`,
      `${baseTopic}/+/state`, // Wildcard for all variables
    ];

    topics.forEach(topic => {
      this.client?.subscribe(topic, (err) => {
        if (err) {
          this.log('error', 'cloud', `Failed to subscribe to ${topic}`);
        } else {
          this.log('debug', 'cloud', `Subscribed to ${topic}`);
          this.subscribedTopics.add(topic);
        }
      });
    });
  }

  private parseMessage(topic: string, message: string): void {
    const baseTopic = this.config?.deviceTopic || '';

    // Device status (online/offline)
    if (topic === `${baseTopic}/status`) {
      this.status.deviceOnline = message === 'online';
      this.log('info', 'device', `Device is ${message}`);
      this.notifyStatus();
      return;
    }

    // Variable state update
    if (topic.includes('/state')) {
      const varName = topic.split('/').slice(-2, -1)[0];
      window.dispatchEvent(new CustomEvent('cloud-variable-update', {
        detail: { name: varName, value: this.parseValue(message) }
      }));
      return;
    }

    // JSON data
    if (topic === `${baseTopic}/data`) {
      try {
        const data = JSON.parse(message);
        Object.entries(data).forEach(([key, value]) => {
          window.dispatchEvent(new CustomEvent('cloud-variable-update', {
            detail: { name: key, value }
          }));
        });
      } catch {
        // Not JSON, treat as raw data
      }
    }
  }

  private parseValue(value: string): any {
    if (value === 'true' || value === '1' || value === 'ON') return true;
    if (value === 'false' || value === '0' || value === 'OFF') return false;
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
    return value;
  }

  /**
   * Publish message to topic
   */
  async publish(topic: string, message: string, retain: boolean = false): Promise<boolean> {
    if (!this.client || !this.status.connected) {
      this.log('error', 'cloud', 'Not connected');
      return false;
    }

    return new Promise((resolve) => {
      this.client!.publish(topic, message, { retain }, (err) => {
        if (err) {
          this.log('error', 'tx', `Failed to publish: ${err.message}`);
          resolve(false);
        } else {
          this.log('debug', 'tx', `[${topic}] ${message}`);
          resolve(true);
        }
      });
    });
  }

  /**
   * Send command to device
   */
  async sendCommand(command: string, value?: any): Promise<boolean> {
    if (!this.config) return false;
    const topic = `${this.config.deviceTopic}/command`;
    const message = value !== undefined ? `${command}:${value}` : command;
    return this.publish(topic, message);
  }

  /**
   * Set variable on device
   */
  async setVariable(name: string, value: any): Promise<boolean> {
    if (!this.config) return false;
    const topic = `${this.config.deviceTopic}/${name}/set`;
    return this.publish(topic, String(value));
  }

  /**
   * Disconnect from broker
   */
  async disconnect(): Promise<void> {
    if (!this.client) return;

    this.log('info', 'cloud', 'Disconnecting...');
    
    return new Promise((resolve) => {
      this.client?.end(false, {}, () => {
        this.client = null;
        this.config = null;
        this.status = { connected: false };
        this.subscribedTopics.clear();
        this.notifyStatus();
        this.log('info', 'cloud', 'Disconnected');
        resolve();
      });
    });
  }

  /**
   * Generate unique client ID
   */
  generateClientId(): string {
    return `ucodelab_${Math.random().toString(16).substring(2, 10)}`;
  }

  /**
   * Get Arduino code for MQTT
   */
  getArduinoCode(config: Partial<CloudConfig>): string {
    const broker = config.broker || 'broker.hivemq.com';
    const port = config.port || 1883;
    const topic = config.deviceTopic || 'ucodelab/device1';

    return `// MQTT Cloud Connection for µCodeLab - ESP32
// Connect to your device from anywhere via cloud broker

#include <WiFi.h>
#include <PubSubClient.h>

// WiFi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// MQTT Broker settings
const char* MQTT_BROKER = "${broker}";
const int MQTT_PORT = ${port};
const char* MQTT_CLIENT_ID = "esp32_ucodelab";
${config.username ? `const char* MQTT_USER = "${config.username}";\nconst char* MQTT_PASS = "YOUR_MQTT_PASSWORD";` : '// No authentication required for public broker'}

// Topic prefix - must match µCodeLab settings
const char* TOPIC_PREFIX = "${topic}";

WiFiClient espClient;
PubSubClient mqtt(espClient);

// Variables that can be controlled from dashboard
bool ledState = false;
int brightness = 128;
float temperature = 0.0;

void publishState() {
  String topic;
  
  // Publish LED state
  topic = String(TOPIC_PREFIX) + "/ledState/state";
  mqtt.publish(topic.c_str(), ledState ? "1" : "0");
  
  // Publish brightness
  topic = String(TOPIC_PREFIX) + "/brightness/state";
  mqtt.publish(topic.c_str(), String(brightness).c_str());
  
  // Publish temperature
  topic = String(TOPIC_PREFIX) + "/temperature/state";
  mqtt.publish(topic.c_str(), String(temperature, 1).c_str());
  
  // Publish all data as JSON
  topic = String(TOPIC_PREFIX) + "/data";
  String json = "{\\"ledState\\":" + String(ledState ? "true" : "false");
  json += ",\\"brightness\\":" + String(brightness);
  json += ",\\"temperature\\":" + String(temperature, 1) + "}";
  mqtt.publish(topic.c_str(), json.c_str());
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.printf("[MQTT] %s: %s\\n", topic, message.c_str());
  
  String topicStr = String(topic);
  
  // Handle commands
  if (topicStr.endsWith("/command")) {
    if (message == "TOGGLE") {
      ledState = !ledState;
      digitalWrite(LED_BUILTIN, ledState);
      publishState();
    }
  }
  // Handle variable set
  else if (topicStr.endsWith("/ledState/set")) {
    ledState = (message == "1" || message == "true" || message == "ON");
    digitalWrite(LED_BUILTIN, ledState);
    publishState();
  }
  else if (topicStr.endsWith("/brightness/set")) {
    brightness = message.toInt();
    brightness = constrain(brightness, 0, 255);
    analogWrite(LED_BUILTIN, brightness);
    publishState();
  }
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT...");
    
    String clientId = String(MQTT_CLIENT_ID) + "_" + String(random(0xffff), HEX);
    
    bool connected;
    ${config.username ? 
      'connected = mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);' : 
      'connected = mqtt.connect(clientId.c_str());'}
    
    if (connected) {
      Serial.println("connected!");
      
      // Publish online status
      String statusTopic = String(TOPIC_PREFIX) + "/status";
      mqtt.publish(statusTopic.c_str(), "online", true);
      
      // Subscribe to command topics
      String cmdTopic = String(TOPIC_PREFIX) + "/command";
      mqtt.subscribe(cmdTopic.c_str());
      
      String setTopic = String(TOPIC_PREFIX) + "/+/set";
      mqtt.subscribe(setTopic.c_str());
      
      Serial.println("Subscribed to topics");
      publishState();
    } else {
      Serial.printf("failed, rc=%d, retrying...\\n", mqtt.state());
      delay(5000);
    }
  }
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
  
  // Setup MQTT
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  
  connectMQTT();
}

void loop() {
  if (!mqtt.connected()) {
    connectMQTT();
  }
  mqtt.loop();
  
  // Read sensors and publish periodically
  static unsigned long lastPublish = 0;
  if (millis() - lastPublish > 5000) {
    lastPublish = millis();
    
    // Simulate temperature reading
    temperature = 20.0 + random(-50, 50) / 10.0;
    
    publishState();
  }
}`;
  }
}

export const cloudConnection = new CloudConnectionService();
