import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import type { LogEntry, SensorDataPoint } from "@shared/schema";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const { setWsConnected, addLog, addSensorDataPoint, updateDeviceData } = useAppStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case "log":
            addLog({
              id: message.id,
              level: message.level,
              message: message.message,
              source: message.source,
              timestamp: message.timestamp,
            });
            break;
            
          case "data":
            const dataDeviceId = message.deviceId || "dev-1";
            addSensorDataPoint(dataDeviceId, {
              sensor: message.sensor,
              value: message.value,
              timestamp: message.timestamp,
              unit: message.unit,
            });
            updateDeviceData(dataDeviceId, message.sensor, message.value);
            break;
            
          case "variable_update":
            const updateDeviceId = message.deviceId || "dev-1";
            updateDeviceData(updateDeviceId, message.name, message.value);
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setWsConnected(false);
      
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, [setWsConnected, addLog, addSensorDataPoint, updateDeviceData]);

  const sendCommand = useCallback((cmd: string, params?: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "command",
        cmd,
        params,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { sendCommand, disconnect, reconnect: connect };
}
