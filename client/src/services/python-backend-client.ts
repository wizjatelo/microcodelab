/**
 * Python Backend Client
 * Communicates with the Python FastAPI backend for device communication
 */

export type ConnectionType = "serial" | "wifi" | "websocket" | "mqtt";

export interface ConnectionConfig {
  connection_type: ConnectionType;
  port?: string;
  baud_rate?: number;
  ip_address?: string;
  http_port?: number;
  mqtt_broker?: string;
  mqtt_port?: number;
  mqtt_topic_prefix?: string;
}

export interface SerialPort {
  port: string;
  description: string;
  hwid: string;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export interface SensorData {
  temperature?: number;
  humidity?: number;
  pressure?: number;
  light?: number;
  led_state?: boolean;
  raw?: Record<string, unknown>;
  timestamp?: number;
}

export interface ConnectionStatus {
  connected: boolean;
  connection_type: ConnectionType | null;
  config?: {
    port?: string;
    ip_address?: string;
    mqtt_broker?: string;
  };
}

type DataCallback = (data: Record<string, unknown>) => void;
type StatusCallback = (status: ConnectionStatus) => void;
type LogCallback = (message: string, level: "info" | "warn" | "error") => void;

/**
 * Client for Python Backend Communication
 */
class PythonBackendClient {
  private baseUrl: string;
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  private dataCallbacks: Set<DataCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private logCallbacks: Set<LogCallback> = new Set();

  private currentStatus: ConnectionStatus = {
    connected: false,
    connection_type: null,
  };

  constructor(baseUrl: string = "http://localhost:8000") {
    this.baseUrl = baseUrl;
    this.wsUrl = baseUrl.replace("http", "ws") + "/ws";
  }

  /**
   * Set the backend URL
   */
  setBackendUrl(url: string): void {
    this.baseUrl = url;
    this.wsUrl = url.replace("http", "ws") + "/ws";
  }

  /**
   * Check if Python backend is available
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available serial ports
   */
  async listSerialPorts(): Promise<SerialPort[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/serial/ports`);
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
   * Get supported protocols
   */
  async getSupportedProtocols(): Promise<
    Array<{ id: string; name: string; description: string; requires: string[] }>
  > {
    try {
      const response = await fetch(`${this.baseUrl}/api/protocols`);
      if (response.ok) {
        const data = await response.json();
        return data.protocols || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Connect to device via Python backend
   */
  async connect(config: ConnectionConfig): Promise<boolean> {
    try {
      this.log(`Connecting via ${config.connection_type}...`, "info");

      const response = await fetch(`${this.baseUrl}/api/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.currentStatus = data.status;
          this.emitStatus(this.currentStatus);
          this.log(`Connected via ${config.connection_type}`, "info");

          // Connect WebSocket for real-time updates
          this.connectWebSocket();

          return true;
        }
      }

      const error = await response.json().catch(() => ({}));
      this.log(`Connection failed: ${error.detail || "Unknown error"}`, "error");
      return false;
    } catch (error) {
      this.log(`Connection error: ${error}`, "error");
      return false;
    }
  }

  /**
   * Disconnect from device
   */
  async disconnect(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/disconnect`, { method: "POST" });
      this.disconnectWebSocket();
      this.currentStatus = { connected: false, connection_type: null };
      this.emitStatus(this.currentStatus);
      this.log("Disconnected", "info");
    } catch (error) {
      this.log(`Disconnect error: ${error}`, "warn");
    }
  }

  /**
   * Send command to device
   */
  async sendCommand(
    command: string,
    value?: unknown
  ): Promise<CommandResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, value }),
      });

      if (response.ok) {
        return await response.json();
      }

      return { success: false, message: `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, message: String(error) };
    }
  }

  /**
   * Get sensor data (for WiFi HTTP connections)
   */
  async getSensorData(): Promise<SensorData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sensor-data`);
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
   * Get current connection status
   */
  async getStatus(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`);
      if (response.ok) {
        this.currentStatus = await response.json();
        return this.currentStatus;
      }
    } catch {
      // Ignore
    }
    return this.currentStatus;
  }

  /**
   * Connect WebSocket for real-time updates
   */
  private connectWebSocket(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.log("WebSocket connected to Python backend", "info");
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "data") {
            this.emitData(message.payload);
          } else if (message.type === "status") {
            this.currentStatus = message.payload;
            this.emitStatus(this.currentStatus);
          } else if (message.type === "command_result") {
            this.log(
              `Command result: ${message.payload.message}`,
              message.payload.success ? "info" : "warn"
            );
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.onerror = () => {
        this.log("WebSocket error", "error");
      };

      this.ws.onclose = () => {
        this.log("WebSocket disconnected", "warn");
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
    if (
      this.reconnectAttempts >= this.maxReconnectAttempts ||
      !this.currentStatus.connected
    ) {
      return;
    }

    this.reconnectAttempts++;
    this.log(
      `Reconnecting WebSocket (attempt ${this.reconnectAttempts})...`,
      "info"
    );

    setTimeout(() => {
      this.connectWebSocket();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Send message via WebSocket
   */
  sendWebSocketMessage(type: string, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
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

  private emitData(data: Record<string, unknown>): void {
    this.dataCallbacks.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error("Data callback error:", e);
      }
    });
  }

  private emitStatus(status: ConnectionStatus): void {
    this.statusCallbacks.forEach((cb) => {
      try {
        cb(status);
      } catch (e) {
        console.error("Status callback error:", e);
      }
    });
  }

  private log(message: string, level: "info" | "warn" | "error"): void {
    console[level](`[PythonBackend] ${message}`);
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
export const pythonBackend = new PythonBackendClient();
