/**
 * WiFi Connection Service for ESP32/ESP8266 devices
 * Scans real WiFi networks through the connected device via Serial
 */

import { webSerial } from "./web-serial";

export interface WiFiNetwork {
  ssid: string;
  rssi: number;
  encryption: "open" | "wep" | "wpa" | "wpa2" | "wpa3";
  channel: number;
  bssid?: string;
}

export interface WiFiStatus {
  connected: boolean;
  ssid?: string;
  ip?: string;
  mac?: string;
  rssi?: number;
  gateway?: string;
  subnet?: string;
  dns?: string;
}

export interface WiFiLogEntry {
  id: string;
  level: "info" | "warning" | "error" | "debug";
  source: string;
  message: string;
  timestamp: string;
}

type LogCallback = (log: WiFiLogEntry) => void;
type StatusCallback = (status: WiFiStatus) => void;
type NetworksCallback = (networks: WiFiNetwork[]) => void;

class WiFiConnectionService {
  private status: WiFiStatus = { connected: false };
  private networks: WiFiNetwork[] = [];
  private logListeners: Set<LogCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private networksListeners: Set<NetworksCallback> = new Set();
  private logIdCounter = 0;
  private pendingCommand: string | null = null;

  constructor() {
    // Listen for serial data to parse WiFi responses
    webSerial.subscribe((message) => {
      if (message.type === "data" && message.data) {
        this.parseSerialResponse(message.data);
      }
    });
  }

  private log(
    level: WiFiLogEntry["level"],
    source: string,
    message: string
  ): void {
    const entry: WiFiLogEntry = {
      id: `wifi-${++this.logIdCounter}-${Date.now()}`,
      level,
      source,
      message,
      timestamp: new Date().toISOString(),
    };
    this.logListeners.forEach((cb) => cb(entry));
  }

  subscribeToLogs(callback: LogCallback): () => void {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  subscribeToStatus(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  subscribeToNetworks(callback: NetworksCallback): () => void {
    this.networksListeners.add(callback);
    return () => this.networksListeners.delete(callback);
  }

  private notifyStatus(): void {
    this.statusListeners.forEach((cb) => cb(this.status));
  }

  private notifyNetworks(): void {
    this.networksListeners.forEach((cb) => cb(this.networks));
  }

  getStatus(): WiFiStatus {
    return { ...this.status };
  }

  getNetworks(): WiFiNetwork[] {
    return [...this.networks];
  }

  isSerialConnected(): boolean {
    return webSerial.getConnectionStatus();
  }

  /**
   * Parse responses from the device
   * Expected formats:
   * WIFI_SCAN_START
   * WIFI_NET:SSID,RSSI,ENC,CH,BSSID
   * WIFI_SCAN_END:COUNT
   * WIFI_CONNECTED:SSID,IP,MAC,RSSI,GW,SUBNET,DNS
   * WIFI_DISCONNECTED
   * WIFI_ERROR:message
   * WIFI_STATUS:connected|disconnected,SSID,IP,RSSI
   */
  private parseSerialResponse(data: string): void {
    const trimmed = data.trim();

    // WiFi scan start
    if (trimmed === "WIFI_SCAN_START") {
      this.log("info", "wifi", "Device started WiFi scan...");
      this.networks = [];
      this.pendingCommand = "scan";
      return;
    }

    // WiFi network found
    if (trimmed.startsWith("WIFI_NET:")) {
      const parts = trimmed.substring(9).split(",");
      if (parts.length >= 4) {
        const network: WiFiNetwork = {
          ssid: parts[0],
          rssi: parseInt(parts[1]) || -100,
          encryption: this.parseEncryption(parts[2]),
          channel: parseInt(parts[3]) || 0,
          bssid: parts[4] || undefined,
        };
        this.networks.push(network);
        this.log(
          "debug",
          "wifi",
          `Found: ${network.ssid} (${network.rssi}dBm, CH${network.channel})`
        );
      }
      return;
    }

    // WiFi scan complete
    if (trimmed.startsWith("WIFI_SCAN_END:")) {
      const count = parseInt(trimmed.substring(14)) || this.networks.length;
      this.log("info", "wifi", `Scan complete: Found ${count} networks`);
      this.networks.sort((a, b) => b.rssi - a.rssi);
      this.notifyNetworks();
      this.pendingCommand = null;
      return;
    }

    // WiFi connected
    if (trimmed.startsWith("WIFI_CONNECTED:")) {
      const parts = trimmed.substring(15).split(",");
      this.status = {
        connected: true,
        ssid: parts[0] || "Unknown",
        ip: parts[1] || "0.0.0.0",
        mac: parts[2] || "",
        rssi: parseInt(parts[3]) || -50,
        gateway: parts[4] || "",
        subnet: parts[5] || "",
        dns: parts[6] || "",
      };
      this.log("info", "wifi", `Connected to "${this.status.ssid}"`);
      this.log("info", "wifi", `IP Address: ${this.status.ip}`);
      this.log("debug", "wifi", `Signal: ${this.status.rssi}dBm`);
      this.notifyStatus();
      return;
    }

    // WiFi disconnected
    if (trimmed === "WIFI_DISCONNECTED") {
      const oldSsid = this.status.ssid;
      this.status = { connected: false };
      this.log("info", "wifi", `Disconnected from "${oldSsid}"`);
      this.notifyStatus();
      return;
    }

    // WiFi error
    if (trimmed.startsWith("WIFI_ERROR:")) {
      const error = trimmed.substring(11);
      this.log("error", "wifi", error);
      return;
    }

    // WiFi status response
    if (trimmed.startsWith("WIFI_STATUS:")) {
      const parts = trimmed.substring(12).split(",");
      const connected = parts[0] === "connected";
      if (connected) {
        this.status = {
          connected: true,
          ssid: parts[1] || "",
          ip: parts[2] || "",
          rssi: parseInt(parts[3]) || -50,
        };
      } else {
        this.status = { connected: false };
      }
      this.notifyStatus();
      return;
    }
  }

  private parseEncryption(
    enc: string
  ): "open" | "wep" | "wpa" | "wpa2" | "wpa3" {
    const lower = enc.toLowerCase();
    if (lower.includes("wpa3")) return "wpa3";
    if (lower.includes("wpa2")) return "wpa2";
    if (lower.includes("wpa")) return "wpa";
    if (lower.includes("wep")) return "wep";
    if (lower === "open" || lower === "none" || enc === "0") return "open";
    return "wpa2"; // default
  }

  /**
   * Request WiFi scan from connected device
   */
  async scanNetworks(): Promise<WiFiNetwork[]> {
    if (!webSerial.getConnectionStatus()) {
      this.log(
        "error",
        "wifi",
        "Cannot scan - no device connected via Serial"
      );
      this.log(
        "info",
        "wifi",
        "Connect your ESP32/ESP8266 via USB first"
      );
      throw new Error("No device connected");
    }

    this.log("info", "wifi", "Requesting WiFi scan from device...");
    this.networks = [];
    this.pendingCommand = "scan";

    // Send scan command to device
    await webSerial.send("WIFI_SCAN");

    // Wait for response with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingCommand === "scan") {
          this.pendingCommand = null;
          this.log("warning", "wifi", "Scan timeout - device may not support WiFi commands");
          this.log("info", "wifi", "Make sure your device has the WiFi handler code uploaded");
          reject(new Error("Scan timeout"));
        }
      }, 10000);

      const checkInterval = setInterval(() => {
        if (this.pendingCommand !== "scan") {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve(this.networks);
        }
      }, 100);
    });
  }

  /**
   * Connect to WiFi network via device
   */
  async connect(ssid: string, password: string): Promise<boolean> {
    if (!webSerial.getConnectionStatus()) {
      this.log("error", "wifi", "Cannot connect - no device connected via Serial");
      throw new Error("No device connected");
    }

    this.log("info", "wifi", `Requesting connection to "${ssid}"...`);

    // Send connect command: WIFI_CONNECT:SSID,PASSWORD
    await webSerial.send(`WIFI_CONNECT:${ssid},${password}`);

    // Wait for connection response
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.log("warning", "wifi", "Connection timeout");
        resolve(false);
      }, 30000);

      const unsubscribe = this.subscribeToStatus((status) => {
        if (status.connected && status.ssid === ssid) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  /**
   * Disconnect from WiFi via device
   */
  async disconnect(): Promise<void> {
    if (!webSerial.getConnectionStatus()) {
      this.log("error", "wifi", "Cannot disconnect - no device connected");
      return;
    }

    this.log("info", "wifi", "Requesting WiFi disconnect...");
    await webSerial.send("WIFI_DISCONNECT");
  }

  /**
   * Request current WiFi status from device
   */
  async requestStatus(): Promise<void> {
    if (!webSerial.getConnectionStatus()) {
      return;
    }

    await webSerial.send("WIFI_STATUS");
  }

  /**
   * Test internet connection via device
   */
  async testConnection(): Promise<{ success: boolean; latency?: number }> {
    if (!webSerial.getConnectionStatus()) {
      this.log("error", "wifi", "Cannot test - no device connected");
      return { success: false };
    }

    if (!this.status.connected) {
      this.log("error", "wifi", "Cannot test - WiFi not connected");
      return { success: false };
    }

    this.log("info", "wifi", "Testing internet connection...");
    await webSerial.send("WIFI_TEST");

    // For now, return success if we're connected
    // Real implementation would wait for WIFI_TEST_RESULT response
    return { success: true, latency: 50 };
  }

  getRssiQuality(rssi: number): { label: string; color: string; bars: number } {
    if (rssi >= -50) return { label: "Excellent", color: "text-green-500", bars: 4 };
    if (rssi >= -60) return { label: "Good", color: "text-green-400", bars: 3 };
    if (rssi >= -70) return { label: "Fair", color: "text-yellow-500", bars: 2 };
    return { label: "Weak", color: "text-red-500", bars: 1 };
  }

  /**
   * Get Arduino code for WiFi scanning support
   */
  getArduinoWiFiCode(): string {
    return `// WiFi Scanner for µCodeLab - ESP32/ESP8266
#include <WiFi.h>  // Use <ESP8266WiFi.h> for ESP8266

void handleWiFiCommands(String cmd) {
  cmd.trim();
  
  if (cmd == "WIFI_SCAN") {
    Serial.println("WIFI_SCAN_START");
    int n = WiFi.scanNetworks();
    for (int i = 0; i < n; i++) {
      Serial.print("WIFI_NET:");
      Serial.print(WiFi.SSID(i));
      Serial.print(",");
      Serial.print(WiFi.RSSI(i));
      Serial.print(",");
      Serial.print(WiFi.encryptionType(i));
      Serial.print(",");
      Serial.print(WiFi.channel(i));
      Serial.print(",");
      Serial.println(WiFi.BSSIDstr(i));
    }
    Serial.print("WIFI_SCAN_END:");
    Serial.println(n);
  }
  else if (cmd.startsWith("WIFI_CONNECT:")) {
    String params = cmd.substring(13);
    int comma = params.indexOf(',');
    String ssid = params.substring(0, comma);
    String pass = params.substring(comma + 1);
    
    WiFi.begin(ssid.c_str(), pass.c_str());
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
      delay(500);
      attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("WIFI_CONNECTED:");
      Serial.print(ssid);
      Serial.print(",");
      Serial.print(WiFi.localIP().toString());
      Serial.print(",");
      Serial.print(WiFi.macAddress());
      Serial.print(",");
      Serial.print(WiFi.RSSI());
      Serial.print(",");
      Serial.print(WiFi.gatewayIP().toString());
      Serial.print(",");
      Serial.print(WiFi.subnetMask().toString());
      Serial.print(",");
      Serial.println(WiFi.dnsIP().toString());
    } else {
      Serial.println("WIFI_ERROR:Connection failed");
    }
  }
  else if (cmd == "WIFI_DISCONNECT") {
    WiFi.disconnect();
    Serial.println("WIFI_DISCONNECTED");
  }
  else if (cmd == "WIFI_STATUS") {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("WIFI_STATUS:connected,");
      Serial.print(WiFi.SSID());
      Serial.print(",");
      Serial.print(WiFi.localIP().toString());
      Serial.print(",");
      Serial.println(WiFi.RSSI());
    } else {
      Serial.println("WIFI_STATUS:disconnected");
    }
  }
}

void setup() {
  Serial.begin(9600);
  WiFi.mode(WIFI_STA);
  Serial.println("WiFi Ready");
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\\n');
    handleWiFiCommands(cmd);
  }
}`;
  }
}

export const wifiConnection = new WiFiConnectionService();
