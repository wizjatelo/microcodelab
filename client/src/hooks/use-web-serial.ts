import { useState, useEffect, useCallback, useMemo } from 'react';
import { WebSerialService, ConnectionState } from '@/services/web-serial';
import type { SerialMessage, AdcReadResponse } from '@/services/web-serial';
import { useAppStore } from '@/lib/store';

// Create a singleton instance
let serialInstance: WebSerialService | null = null;

function getSerialInstance(): WebSerialService {
  if (!serialInstance) {
    serialInstance = new WebSerialService();
  }
  return serialInstance;
}

export function useWebSerial() {
  const serial = useMemo(() => getSerialInstance(), []);
  const [isConnected, setIsConnected] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isSecure, setIsSecure] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [messages, setMessages] = useState<SerialMessage[]>([]);
  const [variables, setVariables] = useState<Record<string, unknown>>({});
  const [adcStreamData, setAdcStreamData] = useState<AdcReadResponse | null>(null);
  const { addLog } = useAppStore();

  useEffect(() => {
    if (!serial) return;
    setIsSupported(serial.isSupported());
    setIsSecure(serial.isSecureContext());
    setIsConnected(serial.getConnectionStatus());
    setConnectionState(serial.getConnectionState());

    const unsubscribe = serial.subscribe((message) => {
      setMessages(prev => [...prev.slice(-99), message]);
      
      if (message.type === 'connected') {
        setIsConnected(true);
      } else if (message.type === 'disconnected') {
        setIsConnected(false);
      }
    });

    const unsubscribeLogs = serial.subscribeToLogs((log) => {
      addLog(log);
    });

    const unsubscribeState = serial.subscribeToStateChanges((state) => {
      setConnectionState(state);
      setIsConnected(state === 'connected');
    });

    const handleVariableUpdate = (event: CustomEvent) => {
      const { name, value } = event.detail;
      setVariables(prev => ({ ...prev, [name]: value }));
    };

    const handleAdcStream = (event: CustomEvent) => {
      setAdcStreamData(event.detail as AdcReadResponse);
    };

    window.addEventListener('serial-variable-update', handleVariableUpdate as EventListener);
    window.addEventListener('esp32-adc-stream', handleAdcStream as EventListener);

    return () => {
      unsubscribe();
      unsubscribeLogs();
      unsubscribeState();
      window.removeEventListener('serial-variable-update', handleVariableUpdate as EventListener);
      window.removeEventListener('esp32-adc-stream', handleAdcStream as EventListener);
    };
  }, [addLog, serial]);

  // Connection
  const connect = useCallback(async (baudRate: number = 115200) => serial.connect(baudRate), [serial]);
  const disconnect = useCallback(async () => serial.disconnect(), [serial]);
  const send = useCallback(async (data: string) => serial.send(data), [serial]);
  const sendCommand = useCallback(async (command: string, params?: Record<string, unknown>) => serial.sendCommand(command, params), [serial]);

  // Browser compatibility
  const getBrowserCompatibility = useCallback(() => serial.getBrowserCompatibility(), [serial]);

  // Auto-reconnect
  const setAutoReconnect = useCallback((enabled: boolean, maxAttempts?: number, delayMs?: number) => {
    serial.setAutoReconnect(enabled, maxAttempts, delayMs);
  }, [serial]);

  // Heartbeat
  const startHeartbeat = useCallback((intervalMs?: number) => serial.startHeartbeat(intervalMs), [serial]);
  const stopHeartbeat = useCallback(() => serial.stopHeartbeat(), [serial]);
  const getLastHeartbeat = useCallback(() => serial.getLastHeartbeat(), [serial]);

  // ADC Streaming
  const startAdcStream = useCallback((pin?: number, intervalMs?: number) => {
    serial.startAdcStream(pin, intervalMs);
  }, [serial]);
  const stopAdcStream = useCallback(() => serial.stopAdcStream(), [serial]);

  // Rate limiting
  const setRateLimit = useCallback((enabled: boolean, commandsPerSecond?: number) => {
    serial.setRateLimit(enabled, commandsPerSecond);
  }, [serial]);

  // MicroPython commands
  const ping = useCallback(async () => serial.ping(), [serial]);
  const getVersion = useCallback(async () => serial.getVersion(), [serial]);
  const getSystemInfo = useCallback(async () => serial.getSystemInfo(), [serial]);
  const gpioRead = useCallback(async (pin: number) => serial.gpioRead(pin), [serial]);
  const gpioWrite = useCallback(async (pin: number, value: number) => serial.gpioWrite(pin, value), [serial]);
  const adcRead = useCallback(async (pin: number = 36) => serial.adcRead(pin), [serial]);
  const i2cScan = useCallback(async (scl: number = 22, sda: number = 21) => serial.i2cScan(scl, sda), [serial]);
  const wifiScan = useCallback(async () => serial.wifiScan(), [serial]);
  const wifiConnect = useCallback(async (ssid: string, password: string) => serial.wifiConnect(ssid, password), [serial]);
  const fileList = useCallback(async (path: string = '/') => serial.fileList(path), [serial]);
  const fileRead = useCallback(async (filename: string) => serial.fileRead(filename), [serial]);
  const fileWrite = useCallback(async (filename: string, content: string) => serial.fileWrite(filename, content), [serial]);
  const fileDelete = useCallback(async (path: string) => serial.fileDelete(path), [serial]);
  const fileMkdir = useCallback(async (path: string) => serial.fileMkdir(path), [serial]);
  const reboot = useCallback(async () => serial.reboot(), [serial]);

  // Batch commands
  const batchCommands = useCallback(async (commands: Array<{ command: string; [key: string]: unknown }>) => 
    serial.batchCommands(commands), [serial]);
  const batchGpioRead = useCallback(async (pins: number[]) => serial.batchGpioRead(pins), [serial]);
  const batchGpioWrite = useCallback(async (pinValues: Array<{ pin: number; value: number }>) => 
    serial.batchGpioWrite(pinValues), [serial]);

  // Binary protocol
  const sendBinary = useCallback(async (data: Uint8Array) => serial.sendBinary(data), [serial]);

  // OTA
  const otaUpdate = useCallback(async (filename: string, content: string | Uint8Array, onProgress?: (progress: number) => void) => 
    serial.otaUpdate(filename, content, onProgress), [serial]);
  const otaAbort = useCallback(async () => serial.otaAbort(), [serial]);
  const getOtaProgress = useCallback(() => serial.getOtaProgress(), [serial]);
  const isOtaInProgress = useCallback(() => serial.isOtaInProgress(), [serial]);

  // Multi-device
  const getDeviceId = useCallback(() => serial.getDeviceId(), [serial]);
  const getDeviceName = useCallback(() => serial.getDeviceName(), [serial]);
  const setDeviceName = useCallback((name: string) => serial.setDeviceName(name), [serial]);

  // Log export
  const getLogHistory = useCallback(() => serial.getLogHistory(), [serial]);
  const clearLogHistory = useCallback(() => serial.clearLogHistory(), [serial]);
  const exportLogsAsText = useCallback(() => serial.exportLogsAsText(), [serial]);
  const exportLogsAsJson = useCallback(() => serial.exportLogsAsJson(), [serial]);
  const exportLogsAsCsv = useCallback(() => serial.exportLogsAsCsv(), [serial]);
  const downloadLogs = useCallback((format?: 'text' | 'json' | 'csv') => serial.downloadLogs(format), [serial]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    // State
    isConnected,
    isSupported,
    isSecure,
    connectionState,
    messages,
    variables,
    adcStreamData,
    
    // Connection
    connect,
    disconnect,
    send,
    sendCommand,
    clearMessages,
    
    // Browser compatibility
    getBrowserCompatibility,
    
    // Auto-reconnect
    setAutoReconnect,
    
    // Heartbeat
    startHeartbeat,
    stopHeartbeat,
    getLastHeartbeat,
    
    // ADC Streaming
    startAdcStream,
    stopAdcStream,
    
    // Rate limiting
    setRateLimit,
    
    // MicroPython commands
    ping,
    getVersion,
    getSystemInfo,
    gpioRead,
    gpioWrite,
    adcRead,
    i2cScan,
    wifiScan,
    wifiConnect,
    fileList,
    fileRead,
    fileWrite,
    fileDelete,
    fileMkdir,
    reboot,

    // Batch commands
    batchCommands,
    batchGpioRead,
    batchGpioWrite,

    // Binary protocol
    sendBinary,

    // OTA firmware update
    otaUpdate,
    otaAbort,
    getOtaProgress,
    isOtaInProgress,

    // Multi-device
    getDeviceId,
    getDeviceName,
    setDeviceName,

    // Log export
    getLogHistory,
    clearLogHistory,
    exportLogsAsText,
    exportLogsAsJson,
    exportLogsAsCsv,
    downloadLogs,
  };
}
