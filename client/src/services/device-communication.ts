/**
 * ESP32/MicroPython Device Communication Service
 * All communication is handled by Python backend
 * Frontend connects via WebSocket for real-time data
 */

export type ConnectionType = "wifi" | "serial" | "websocket" | "mqtt";

export interface DeviceConfig {
  type: ConnectionType;
  pythonBackendUrl: string;
  // Serial config
  serialPort?: string;
  baudRate?: number;
  // WiFi/WebSocket config
  ipAddress?: string;
  port?: number;
  // MQTT config
  broker?: string;
  mqttPort?: number;
  topic?: string;
}

export interface SensorData {
  temperature?: number;
  humidity?: number;
  pressure?: number;
  light?: number;
  led_state?: boolean;
  [key: string]: number | string | boolean | undefined;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export interface ConnectionStatus {
  connected: boolean;
  type: ConnectionType | null;
  deviceInfo?: string;
  error?: string;
}

export interface SerialPortInfo {
  port: string;
  description: string;
  hwid: string;
}

type DataCallback = (data: SensorData) => void;
type StatusCallback = (status: ConnectionStatus) => void;
type LogCallback = (message: string, level: "info" | "warn" | "error") => void;

/**
 * Device Communication Manager
 * Uses Python backend for all device communication
 * Real-time data via WebSocket
 */
class DeviceCommunicationManager {
  private pythonBackendUrl = "http://localhost:8001";
  private ws: WebSocket | null = null;
  private connected = false;
  private connectionType: ConnectionType | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private dataCallbacks: Set<DataCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private logCallbacks: Set<LogCallback> = new Set();

  private config: DeviceConfig = {
    type: "serial",
    pythonBackendUrl: "http://localhost:8001",
    baudRate: 115200,
    ipAddress: "192.168.1.100",
    port: 80,
  };

  /**
   * Set Python backend URL
   */
  setBackendUrl(url: string): void {
    this.pythonBackendUrl = url;
    this.config.pythonBackendUrl = url;
  }

  /**
   * Configure communication settings
   */
  configure(config: Partial<DeviceConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.pythonBackendUrl) {
      this.pythonBackendUrl = config.pythonBackendUrl;
    }
    this.log(`Configuration updated: ${config.type || this.config.type}`, "info");
  }

  /**
   * Check if Python backend is available
   */
  async checkPythonBackend(): Promise<boolean> {
    try {
      const response = await fetch(`${this.pythonBackendUrl}/`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get available serial ports from Python backend
   */
  async listSerialPorts(): Promise<SerialPortInfo[]> {
    try {
      const response = await fetch(`${this.pythonBackendUrl}/api/serial/ports`);
      if (response.ok) {
        const data = await response.json();
        return data.ports || [];
      }
      return [];
    } catch (error) {
      this.log(`Failed to list serial ports: ${error}`, "error");
      return [];
    }
  }

  /**
   * Connect to device via Python backend
   */
  async connect(type?: ConnectionType): Promise<boolean> {
    const connectionType = type || this.config.type;

    try {
      this.log(`Connecting via ${connectionType}...`, "info");

      const payload: Record<string, unknown> = {
        connection_type: connectionType,
      };

      // Add protocol-specific config
      switch (connectionType) {
        case "serial":
          payload.port = this.config.serialPort || "";
          payload.baud_rate = this.config.baudRate || 115200;
          break;
        case "wifi":
          payload.ip_address = this.config.ipAddress || "192.168.1.100";
          payload.http_port = this.config.port || 80;
          break;
        case "websocket":
          payload.ip_address = this.config.ipAddress || "192.168.1.100";
          payload.http_port = this.config.port || 81;
          break;
        case "mqtt":
          payload.mqtt_broker = this.config.broker || "broker.hivemq.com";
          payload.mqtt_port = this.config.mqttPort || 1883;
          payload.mqtt_topic_prefix = this.config.topic || "ucodelab/esp32";
          break;
      }

      const response = await fetch(`${this.pythonBackendUrl}/api/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.connected = true;
          this.connectionType = connectionType;
          this.updateStatus({
            connected: true,
            type: connectionType,
            deviceInfo: `${connectionType.toUpperCase()} via Python`,
          });
          this.log(`Connected via ${connectionType}`, "info");

          // Connect WebSocket for real-time data
          this.connectWebSocket();

          return true;
        }
      }

      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || "Connection failed");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.log(`Connection failed: ${message}`, "error");
      this.updateStatus({ connected: false, type: null, error: message });
      return false;
    }
  }

  /**
   * Disconnect from device
   */
  async disconnect(): Promise<void> {
    this.log("Disconnecting...", "info");

    try {
      await fetch(`${this.pythonBackendUrl}/api/disconnect`, {
        method: "POST",
      });
    } catch {
      // Ignore errors
    }

    this.disconnectWebSocket();
    this.connected = false;
    this.connectionType = null;
    this.updateStatus({ connected: false, type: null });
    this.log("Disconnected", "info");
  }

  /**
   * Send command to device
   */
  async sendCommand(command: string, value?: unknown): Promise<CommandResult> {
    if (!this.connected) {
      return { success: false, message: "Not connected" };
    }

    try {
      const response = await fetch(`${this.pythonBackendUrl}/api/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, value }),
      });

      if (response.ok) {
        const result = await response.json();
        this.log(`Command sent: ${command}`, "info");
        return result;
      }

      return { success: false, message: `HTTP ${response.status}` };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, message };
    }
  }

  /**
   * Get sensor data from device
   */
  async readSensorData(): Promise<SensorData | null> {
    if (!this.connected) return null;

    try {
      const response = await fetch(`${this.pythonBackendUrl}/api/sensor-data`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return result.data;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Connect WebSocket for real-time data
   */
  private connectWebSocket(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = this.pythonBackendUrl.replace("http", "ws") + "/ws";

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.log("Real-time connection established", "info");
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "data") {
            this.emitData(message.payload);
          } else if (message.type === "status") {
            this.connected = message.payload.connected;
            this.connectionType = message.payload.connection_type;
            this.updateStatus({
              connected: message.payload.connected,
              type: message.payload.connection_type,
            });
          } else if (message.type === "log") {
            this.log(message.payload.message, message.payload.level || "info");
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.onerror = () => {
        this.log("Real-time connection error", "error");
      };

      this.ws.onclose = () => {
        this.log("Real-time connection closed", "warn");
        this.attemptReconnect();
      };
    } catch (error) {
      this.log(`WebSocket connection failed: ${error}`, "error");
    }
  }

  /**
   * Disconnect WebSocket
   */
  private disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.connected) {
      return;
    }

    this.reconnectAttempts++;
    this.log(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`, "info");

    setTimeout(() => {
      this.connectWebSocket();
    }, 2000 * this.reconnectAttempts);
  }

  /**
   * Subscribe to data updates
   */
  onData(callback: DataCallback): () => void {
    this.dataCallbacks.add(callback);
    return () => this.dataCallbacks.delete(callback);
  }

  /**
   * Subscribe to status updates
   */
  onStatus(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * Subscribe to log messages
   */
  onLog(callback: LogCallback): () => void {
    this.logCallbacks.add(callback);
    return () => this.logCallbacks.delete(callback);
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return {
      connected: this.connected,
      type: this.connectionType,
    };
  }

  private emitData(data: SensorData): void {
    this.dataCallbacks.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error("Data callback error:", e);
      }
    });
  }

  private updateStatus(status: ConnectionStatus): void {
    this.statusCallbacks.forEach((cb) => {
      try {
        cb(status);
      } catch (e) {
        console.error("Status callback error:", e);
      }
    });
  }

  private log(message: string, level: "info" | "warn" | "error"): void {
    const timestamp = new Date().toLocaleTimeString();
    console[level](`[DeviceComm ${timestamp}] ${message}`);

    this.logCallbacks.forEach((cb) => {
      try {
        cb(message, level);
      } catch (e) {
        console.error("Log callback error:", e);
      }
    });
  }
}

// Export singleton instance
export const deviceCommunication = new DeviceCommunicationManager();
