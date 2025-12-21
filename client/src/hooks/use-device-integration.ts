/**
 * Device Integration Hook - Unified device management across all tabs
 * Links devices with projects, code editor, dashboard widgets, and AI assistant
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store';
import { useWebSerial } from '@/hooks/use-web-serial';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { deviceLinking, LinkEvent } from '@/services/device-linking';
import type { Device, Project, WidgetConfig } from '@shared/schema';

export interface DeviceIntegrationState {
  device: Device | null;
  project: Project | null;
  isConnected: boolean;
  connectionType: 'serial' | 'wifi' | 'mqtt' | 'websocket' | 'none';
  sensorData: Record<string, number | string | boolean>;
  variables: Record<string, unknown>;
  functions: string[];
  lastSync: Date | null;
}

export interface WidgetDeviceBinding {
  widgetId: string;
  deviceId: string;
  variableName?: string;
  functionName?: string;
  pinNumber?: number;
  bindingType: 'read' | 'write' | 'bidirectional';
}

// Global event bus for cross-component communication
const deviceEventBus = new EventTarget();

export function emitDeviceEvent(type: string, data: any) {
  deviceEventBus.dispatchEvent(new CustomEvent(type, { detail: data }));
}

export function onDeviceEvent(type: string, callback: (data: any) => void) {
  const handler = (e: Event) => callback((e as CustomEvent).detail);
  deviceEventBus.addEventListener(type, handler);
  return () => deviceEventBus.removeEventListener(type, handler);
}

export function useDeviceIntegration() {
  const { currentProjectId, deviceData, wsConnected } = useAppStore();
  const webSerial = useWebSerial();
  const [sensorData, setSensorData] = useState<Record<string, number | string | boolean>>({});
  const [variables, setVariables] = useState<Record<string, unknown>>({});
  const [functions, setFunctions] = useState<string[]>([]);
  const [widgetBindings, setWidgetBindings] = useState<Map<string, WidgetDeviceBinding>>(new Map());
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Fetch devices
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  // Fetch current project
  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', currentProjectId],
    enabled: !!currentProjectId,
  });

  // Get device linked to current project
  const linkedDevice = useMemo(() => {
    if (!currentProjectId || !devices.length) return null;
    return devices.find(d => d.projectId === currentProjectId) || null;
  }, [devices, currentProjectId]);

  // Determine connection type
  const connectionType = useMemo(() => {
    if (!linkedDevice) return 'none';
    if (webSerial.isConnected) return 'serial';
    if (wsConnected) return 'websocket';
    const devConnectionType = (linkedDevice as any).connectionType;
    if (devConnectionType) return devConnectionType;
    return 'none';
  }, [linkedDevice, webSerial.isConnected, wsConnected]);

  const isConnected = connectionType !== 'none';

  // Link device mutation
  const linkDeviceMutation = useMutation({
    mutationFn: async ({ deviceId, projectId }: { deviceId: string; projectId: string }) => {
      const result = await apiRequest(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        body: { projectId },
      });
      // Also create device link in backend
      await apiRequest(`/api/devices/${deviceId}/links`, {
        method: 'POST',
        body: { projectId, linkType: 'project' },
      }).catch(() => {}); // Ignore if endpoint doesn't exist
      return result;
    },
    onSuccess: (_, { deviceId, projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      emitDeviceEvent('device-linked', { deviceId, projectId });
      setLastSync(new Date());
    },
  });

  // Unlink device mutation
  const unlinkDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return apiRequest(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        body: { projectId: null },
      });
    },
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      emitDeviceEvent('device-unlinked', { deviceId });
    },
  });

  // Update device configuration
  const updateDeviceMutation = useMutation({
    mutationFn: async ({ deviceId, updates }: { deviceId: string; updates: Record<string, any> }) => {
      return apiRequest(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        body: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      emitDeviceEvent('device-updated', {});
    },
  });

  // Listen for device link events from the linking service
  useEffect(() => {
    const unsubscribers = [
      deviceLinking.on('device_state_change', (event: LinkEvent) => {
        if (event.deviceId === linkedDevice?.id) {
          setSensorData(prev => ({ ...prev, ...event.data as Record<string, any> }));
          setLastSync(new Date());
        }
      }),
      deviceLinking.on('variable_update', (event: LinkEvent) => {
        if (event.deviceId === linkedDevice?.id) {
          const { name, value } = event.data as { name: string; value: unknown };
          setVariables(prev => ({ ...prev, [name]: value }));
          setSensorData(prev => ({ ...prev, [name]: value as any }));
          // Emit to widgets
          emitDeviceEvent('variable-update', { name, value, deviceId: event.deviceId });
        }
      }),
      deviceLinking.on('ai_insight', (event: LinkEvent) => {
        emitDeviceEvent('ai-insight', event.data);
      }),
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, [linkedDevice?.id]);

  // Listen for serial data
  useEffect(() => {
    const handleSerialData = (event: CustomEvent) => {
      const data = event.detail;
      if (data.type === 'gpio_read' || data.type === 'adc_read') {
        const key = `pin_${data.pin}`;
        setSensorData(prev => ({
          ...prev,
          [key]: data.value ?? data.raw_value,
          ...(data.voltage !== undefined && { [`voltage_${data.pin}`]: data.voltage }),
        }));
      }
    };

    const handleVariableUpdate = (event: CustomEvent) => {
      const { name, value } = event.detail;
      setVariables(prev => ({ ...prev, [name]: value }));
      setSensorData(prev => ({ ...prev, [name]: value }));
    };

    window.addEventListener('esp32-sensor-data', handleSerialData as EventListener);
    window.addEventListener('serial-variable-update', handleVariableUpdate as EventListener);

    return () => {
      window.removeEventListener('esp32-sensor-data', handleSerialData as EventListener);
      window.removeEventListener('serial-variable-update', handleVariableUpdate as EventListener);
    };
  }, []);

  // Parse code for functions and variables
  const parseCodeAnnotations = useCallback(async () => {
    if (!linkedDevice || !currentProjectId) return;
    
    const mapping = await deviceLinking.parseCodeAnnotations(linkedDevice.id, currentProjectId);
    if (mapping) {
      setFunctions(mapping.functions.map(f => f.name));
      // Initialize variables from code
      mapping.variables.forEach(v => {
        setVariables(prev => ({ ...prev, [v.name]: undefined }));
      });
    }
  }, [linkedDevice?.id, currentProjectId]);

  // Bind widget to device
  const bindWidget = useCallback((binding: WidgetDeviceBinding) => {
    setWidgetBindings(prev => {
      const newMap = new Map(prev);
      newMap.set(binding.widgetId, binding);
      return newMap;
    });
    
    // Store in device linking service
    if (binding.variableName) {
      deviceLinking.bindWidgetToDevice(
        binding.widgetId,
        binding.deviceId,
        'variable',
        binding.variableName,
        binding.bindingType === 'bidirectional'
      );
    }
  }, []);

  // Unbind widget
  const unbindWidget = useCallback((widgetId: string) => {
    setWidgetBindings(prev => {
      const newMap = new Map(prev);
      newMap.delete(widgetId);
      return newMap;
    });
  }, []);

  // Get widget value from device
  const getWidgetValue = useCallback((widget: WidgetConfig): any => {
    if (!linkedDevice) return undefined;
    
    // Check widget bindings first
    const binding = widgetBindings.get(widget.id);
    if (binding?.variableName) {
      return sensorData[binding.variableName] ?? variables[binding.variableName];
    }
    
    // Fall back to widget config
    if (widget.variableName) {
      return sensorData[widget.variableName] ?? variables[widget.variableName] ?? deviceData[linkedDevice.id]?.[widget.variableName];
    }
    
    return undefined;
  }, [linkedDevice, widgetBindings, sensorData, variables, deviceData]);

  // Send value to device
  const sendToDevice = useCallback(async (variableName: string, value: any) => {
    if (!linkedDevice || !isConnected) return false;

    try {
      if (connectionType === 'serial' && webSerial.isConnected) {
        // Send via serial
        await webSerial.sendCommand(`SET ${variableName} ${JSON.stringify(value)}`);
      } else {
        // Send via API
        await apiRequest(`/api/devices/${linkedDevice.id}/variables/${variableName}`, {
          method: 'POST',
          body: { value },
        });
      }
      
      // Update local state
      setVariables(prev => ({ ...prev, [variableName]: value }));
      setSensorData(prev => ({ ...prev, [variableName]: value }));
      emitDeviceEvent('variable-sent', { variableName, value, deviceId: linkedDevice.id });
      
      return true;
    } catch (e) {
      console.error('Failed to send to device:', e);
      return false;
    }
  }, [linkedDevice, isConnected, connectionType, webSerial]);

  // Call device function
  const callFunction = useCallback(async (functionName: string, args?: any[]) => {
    if (!linkedDevice || !isConnected) return false;

    try {
      if (connectionType === 'serial' && webSerial.isConnected) {
        const argsStr = args ? args.map(a => JSON.stringify(a)).join(' ') : '';
        await webSerial.sendCommand(`CALL ${functionName} ${argsStr}`);
      } else {
        await apiRequest(`/api/devices/${linkedDevice.id}/functions/${functionName}`, {
          method: 'POST',
          body: { args: args || [] },
        });
      }
      
      emitDeviceEvent('function-called', { functionName, args, deviceId: linkedDevice.id });
      return true;
    } catch (e) {
      console.error('Failed to call function:', e);
      return false;
    }
  }, [linkedDevice, isConnected, connectionType, webSerial]);

  // Read GPIO pin
  const readGPIO = useCallback(async (pin: number) => {
    if (!linkedDevice || !isConnected) return null;

    try {
      if (connectionType === 'serial' && webSerial.isConnected) {
        return await webSerial.gpioRead(pin);
      } else {
        const result = await apiRequest(`/api/devices/${linkedDevice.id}/gpio/${pin}`, { method: 'GET' });
        return result;
      }
    } catch (e) {
      console.error('Failed to read GPIO:', e);
      return null;
    }
  }, [linkedDevice, isConnected, connectionType, webSerial]);

  // Write GPIO pin
  const writeGPIO = useCallback(async (pin: number, value: number) => {
    if (!linkedDevice || !isConnected) return false;

    try {
      if (connectionType === 'serial' && webSerial.isConnected) {
        await webSerial.gpioWrite(pin, value);
      } else {
        await apiRequest(`/api/devices/${linkedDevice.id}/gpio/${pin}`, {
          method: 'POST',
          body: { value },
        });
      }
      
      setSensorData(prev => ({ ...prev, [`pin_${pin}`]: value }));
      return true;
    } catch (e) {
      console.error('Failed to write GPIO:', e);
      return false;
    }
  }, [linkedDevice, isConnected, connectionType, webSerial]);

  // Get unlinked devices
  const unlinkedDevices = useMemo(() => {
    return devices.filter(d => !d.projectId);
  }, [devices]);

  // Get all project devices
  const projectDevices = useMemo(() => {
    if (!currentProjectId) return [];
    return devices.filter(d => d.projectId === currentProjectId);
  }, [devices, currentProjectId]);

  return {
    // State
    linkedDevice,
    project,
    devices,
    unlinkedDevices,
    projectDevices,
    isConnected,
    connectionType,
    sensorData,
    variables,
    functions,
    widgetBindings,
    lastSync,
    
    // Actions
    linkDevice: (deviceId: string, projectId: string) => linkDeviceMutation.mutate({ deviceId, projectId }),
    unlinkDevice: (deviceId: string) => unlinkDeviceMutation.mutate(deviceId),
    updateDevice: (deviceId: string, updates: Record<string, any>) => updateDeviceMutation.mutate({ deviceId, updates }),
    bindWidget,
    unbindWidget,
    getWidgetValue,
    sendToDevice,
    callFunction,
    readGPIO,
    writeGPIO,
    parseCodeAnnotations,
    
    // Mutation states
    isLinking: linkDeviceMutation.isPending,
    isUnlinking: unlinkDeviceMutation.isPending,
    isUpdating: updateDeviceMutation.isPending,
  };
}

// Hook for widgets to get device data
export function useWidgetDeviceData(widget: WidgetConfig) {
  const { linkedDevice, sensorData, variables, isConnected, sendToDevice, callFunction } = useDeviceIntegration();
  const [localValue, setLocalValue] = useState<any>(undefined);

  // Get value from device data
  const deviceValue = useMemo(() => {
    if (!widget.variableName) return undefined;
    return sensorData[widget.variableName] ?? variables[widget.variableName];
  }, [widget.variableName, sensorData, variables]);

  // Listen for variable updates
  useEffect(() => {
    if (!widget.variableName) return;
    
    return onDeviceEvent('variable-update', (data) => {
      if (data.name === widget.variableName) {
        setLocalValue(data.value);
      }
    });
  }, [widget.variableName]);

  // Send value change to device
  const setValue = useCallback(async (value: any) => {
    setLocalValue(value);
    if (widget.variableName && isConnected) {
      await sendToDevice(widget.variableName, value);
    }
  }, [widget.variableName, isConnected, sendToDevice]);

  // Trigger function
  const triggerFunction = useCallback(async () => {
    if (widget.functionName && isConnected) {
      await callFunction(widget.functionName);
    }
  }, [widget.functionName, isConnected, callFunction]);

  return {
    value: localValue ?? deviceValue,
    setValue,
    triggerFunction,
    isConnected,
    deviceName: linkedDevice?.name,
  };
}

// Hook for AI to get device context
export function useDeviceAIIntegration() {
  const { linkedDevice, project, sensorData, variables, functions, isConnected, connectionType } = useDeviceIntegration();

  return useMemo(() => ({
    hasDevice: !!linkedDevice,
    deviceName: linkedDevice?.name || 'No device',
    deviceType: linkedDevice?.hardware || 'unknown',
    isConnected,
    connectionType,
    projectName: project?.name || 'No project',
    projectLanguage: project?.language || 'arduino',
    sensorValues: sensorData,
    variables,
    availableFunctions: functions,
    capabilities: linkedDevice ? {
      gpio: true,
      adc: linkedDevice.hardware?.includes('esp') || false,
      wifi: linkedDevice.hardware?.includes('esp') || false,
      i2c: true,
      spi: true,
      pwm: true,
    } : null,
  }), [linkedDevice, project, sensorData, variables, functions, isConnected, connectionType]);
}
