/**
 * React Hook for Python Backend Communication
 * Provides easy-to-use interface for connecting to ESP32 devices via Python backend
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  pythonBackend,
  ConnectionType,
  ConnectionConfig,
  ConnectionStatus,
  SerialPort,
  CommandResult,
  SensorData,
} from "@/services/python-backend-client";

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  level: "info" | "warn" | "error";
}

export interface UsePythonBackendReturn {
  // Backend status
  backendAvailable: boolean;
  checkingBackend: boolean;

  // Connection state
  connected: boolean;
  connectionType: ConnectionType | null;
  status: ConnectionStatus;

  // Data
  sensorData: SensorData | null;
  serialPorts: SerialPort[];
  logs: LogEntry[];

  // Actions
  checkBackend: () => Promise<boolean>;
  refreshSerialPorts: () => Promise<void>;
  connect: (config: ConnectionConfig) => Promise<boolean>;
  disconnect: () => Promise<void>;
  sendCommand: (command: string, value?: unknown) => Promise<CommandResult>;
  getSensorData: () => Promise<SensorData | null>;
  clearLogs: () => void;

  // Config
  setBackendUrl: (url: string) => void;
}

export function usePythonBackend(): UsePythonBackendReturn {
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<ConnectionType | null>(
    null
  );
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    connection_type: null,
  });
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const logIdCounter = useRef(0);

  // Subscribe to backend events
  useEffect(() => {
    const unsubData = pythonBackend.onData((data) => {
      setSensorData(data as SensorData);
    });

    const unsubStatus = pythonBackend.onStatus((newStatus) => {
      setStatus(newStatus);
      setConnected(newStatus.connected);
      setConnectionType(newStatus.connection_type);
    });

    const unsubLog = pythonBackend.onLog((message, level) => {
      const entry: LogEntry = {
        id: `log-${++logIdCounter.current}`,
        timestamp: new Date(),
        message,
        level,
      };
      setLogs((prev) => [...prev.slice(-99), entry]);
    });

    // Check backend availability on mount
    checkBackendHealth();

    return () => {
      unsubData();
      unsubStatus();
      unsubLog();
    };
  }, []);

  const checkBackendHealth = async (): Promise<boolean> => {
    setCheckingBackend(true);
    const available = await pythonBackend.checkBackendHealth();
    setBackendAvailable(available);
    setCheckingBackend(false);

    if (available) {
      // Get initial status
      const currentStatus = await pythonBackend.getStatus();
      setStatus(currentStatus);
      setConnected(currentStatus.connected);
      setConnectionType(currentStatus.connection_type);

      // Get serial ports
      await refreshSerialPorts();
    }

    return available;
  };

  const refreshSerialPorts = useCallback(async (): Promise<void> => {
    const ports = await pythonBackend.listSerialPorts();
    setSerialPorts(ports);
  }, []);

  const connect = useCallback(
    async (config: ConnectionConfig): Promise<boolean> => {
      return pythonBackend.connect(config);
    },
    []
  );

  const disconnect = useCallback(async (): Promise<void> => {
    return pythonBackend.disconnect();
  }, []);

  const sendCommand = useCallback(
    async (command: string, value?: unknown): Promise<CommandResult> => {
      return pythonBackend.sendCommand(command, value);
    },
    []
  );

  const getSensorData = useCallback(async (): Promise<SensorData | null> => {
    const data = await pythonBackend.getSensorData();
    if (data) {
      setSensorData(data);
    }
    return data;
  }, []);

  const clearLogs = useCallback((): void => {
    setLogs([]);
  }, []);

  const setBackendUrl = useCallback((url: string): void => {
    pythonBackend.setBackendUrl(url);
    checkBackendHealth();
  }, []);

  return {
    backendAvailable,
    checkingBackend,
    connected,
    connectionType,
    status,
    sensorData,
    serialPorts,
    logs,
    checkBackend: checkBackendHealth,
    refreshSerialPorts,
    connect,
    disconnect,
    sendCommand,
    getSensorData,
    clearLogs,
    setBackendUrl,
  };
}
