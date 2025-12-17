import { useState, useEffect, useCallback } from 'react';
import { webSerial, SerialMessage } from '@/services/web-serial';
import { useAppStore } from '@/lib/store';

export function useWebSerial() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [messages, setMessages] = useState<SerialMessage[]>([]);
  const [variables, setVariables] = useState<Record<string, any>>({});
  const { addLog } = useAppStore();

  useEffect(() => {
    setIsSupported(webSerial.isSupported());
    setIsConnected(webSerial.getConnectionStatus());

    // Subscribe to serial messages
    const unsubscribe = webSerial.subscribe((message) => {
      setMessages(prev => [...prev.slice(-99), message]);
      
      if (message.type === 'connected') {
        setIsConnected(true);
      } else if (message.type === 'disconnected') {
        setIsConnected(false);
      }
    });

    // Subscribe to detailed logs for the console
    const unsubscribeLogs = webSerial.subscribeToLogs((log) => {
      addLog(log);
    });

    // Listen for variable updates
    const handleVariableUpdate = (event: CustomEvent) => {
      const { name, value } = event.detail;
      setVariables(prev => ({ ...prev, [name]: value }));
    };

    window.addEventListener('serial-variable-update', handleVariableUpdate as EventListener);

    return () => {
      unsubscribe();
      unsubscribeLogs();
      window.removeEventListener('serial-variable-update', handleVariableUpdate as EventListener);
    };
  }, [addLog]);

  const connect = useCallback(async (baudRate?: number) => {
    return webSerial.connect(baudRate);
  }, []);

  const disconnect = useCallback(async () => {
    return webSerial.disconnect();
  }, []);

  const send = useCallback(async (data: string) => {
    return webSerial.send(data);
  }, []);

  const sendCommand = useCallback(async (command: string, params?: Record<string, any>) => {
    return webSerial.sendCommand(command, params);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    isConnected,
    isSupported,
    messages,
    variables,
    connect,
    disconnect,
    send,
    sendCommand,
    clearMessages,
  };
}
