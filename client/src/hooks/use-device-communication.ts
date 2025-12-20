/**
 * React Hook for Device Communication
 * Uses Python backend for all device communication
 * Real-time data via WebSocket
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  deviceCommunication,
  ConnectionType,
  DeviceConfig,
  SensorData,
  ConnectionStatus,
  CommandResult,
  SerialPortInfo,
} from "@/services/device-communication";

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  level: "info" | "warn" | "error";
}

export interface UseDeviceCommunicationReturn {
  // Connection state
  connected: boolean;
  connectionType: ConnectionType | null;
  status: ConnectionStatus;

  // Python backend state
  pythonBackendAvailable: boolean;
  serialPorts: SerialPortInfo[];

  // Data
  sensorData: SensorData | null;
  logs: LogEntry[];

  // Actions
  connect: (type?: ConnectionType) => Promise<boolean>;
  disconnect: () => Promise<void>;
  sendCommand: (command: string, value?: unknown) => Promise<CommandResult>;
  configure: (config: Partial<DeviceConfig>) => void;
  refreshSerialPorts: () => Promise<void>;
  checkPythonBackend: () => Promise<boolean>;
  clearLogs: () => void;
}

export function useDeviceCommunication(): UseDeviceCommunicationReturn {
  const [connected, setConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<ConnectionType | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false, type: null });
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pythonBackendAvailable, setPythonBackendAvailable] = useState(false);
  const [serialPorts, setSerialPorts] = useState<SerialPortInfo[]>([]);

  const logIdCounter = useRef(0);

  // Subscribe to device events
  useEffect(() => {
    const unsubData = deviceCommunication.onData((data) => {
      setSensorData(data);
    });

    const unsubStatus = deviceCommunication.onStatus((newStatus) => {
      setStatus(newStatus);
      setConnected(newStatus.connected);
      setConnectionType(newStatus.type);
    });

    const unsubLog = deviceCommunication.onLog((message, level) => {
      const entry: LogEntry = {
        id: `log-${++logIdCounter.current}`,
        timestamp: new Date(),
        message,
        level,
      };
      setLogs((prev) => [...prev.slice(-99), entry]);
    });

    // Get initial status
    const initialStatus = deviceCommunication.getStatus();
    setStatus(initialStatus);
    setConnected(initialStatus.connected);
    setConnectionType(initialStatus.type);

    // Check Python backend availability
    checkPythonBackendAvailability();

    return () => {
      unsubData();
      unsubStatus();
      unsubLog();
    };
  }, []);

  const checkPythonBackendAvailability = async () => {
    const available = await deviceCommunication.checkPythonBackend();
    setPythonBackendAvailable(available);
    if (available) {
      const ports = await deviceCommunication.listSerialPorts();
      setSerialPorts(ports);
    }
    return available;
  };

  const connect = useCallback(async (type?: ConnectionType): Promise<boolean> => {
    return deviceCommunication.connect(type);
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    return deviceCommunication.disconnect();
  }, []);

  const sendCommand = useCallback(async (command: string, value?: unknown): Promise<CommandResult> => {
    return deviceCommunication.sendCommand(command, value);
  }, []);

  const configure = useCallback((config: Partial<DeviceConfig>): void => {
    deviceCommunication.configure(config);
  }, []);

  const refreshSerialPorts = useCallback(async (): Promise<void> => {
    const ports = await deviceCommunication.listSerialPorts();
    setSerialPorts(ports);
  }, []);

  const checkPythonBackend = useCallback(async (): Promise<boolean> => {
    return checkPythonBackendAvailability();
  }, []);

  const clearLogs = useCallback((): void => {
    setLogs([]);
  }, []);

  return {
    connected,
    connectionType,
    status,
    pythonBackendAvailable,
    serialPorts,
    sensorData,
    logs,
    connect,
    disconnect,
    sendCommand,
    configure,
    refreshSerialPorts,
    checkPythonBackend,
    clearLogs,
  };
}
