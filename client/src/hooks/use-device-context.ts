/**
 * Device Context Hook - Links devices with projects, editor, dashboard, and AI
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store';
import { useWebSerial } from '@/hooks/use-web-serial';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Device, Project } from '@shared/schema';

export interface DeviceContext {
  device: Device | null;
  project: Project | null;
  isConnected: boolean;
  sensorData: Record<string, number | string | boolean>;
  variables: Record<string, unknown>;
}

export interface DeviceLinkOptions {
  deviceId: string;
  projectId: string;
}

export function useDeviceContext() {
  const { currentProjectId, deviceData } = useAppStore();
  const { isConnected, connectionState, gpioRead, gpioWrite, adcRead, getSystemInfo } = useWebSerial();
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [sensorData, setSensorData] = useState<Record<string, number | string | boolean>>({});

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

  // Active device (either linked or manually selected)
  const activeDevice = useMemo(() => {
    if (activeDeviceId) {
      return devices.find(d => d.id === activeDeviceId) || null;
    }
    return linkedDevice;
  }, [devices, activeDeviceId, linkedDevice]);

  // Link device to project mutation
  const linkDeviceMutation = useMutation({
    mutationFn: async ({ deviceId, projectId }: DeviceLinkOptions) => {
      return apiRequest(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        body: { projectId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
  });

  // Unlink device from project
  const unlinkDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return apiRequest(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        body: { projectId: null },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
  });

  // Update device status
  const updateDeviceStatus = useMutation({
    mutationFn: async ({ deviceId, status }: { deviceId: string; status: string }) => {
      return apiRequest(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        body: { status, lastSeen: new Date().toISOString() },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
  });

  // Sync connection state with device status
  useEffect(() => {
    if (activeDevice && isConnected) {
      updateDeviceStatus.mutate({ deviceId: activeDevice.id, status: 'online' });
    } else if (activeDevice && !isConnected && connectionState === 'disconnected') {
      updateDeviceStatus.mutate({ deviceId: activeDevice.id, status: 'offline' });
    }
  }, [isConnected, connectionState, activeDevice?.id]);

  // Listen for sensor data updates
  useEffect(() => {
    const handleSensorData = (event: CustomEvent) => {
      const { type, ...data } = event.detail;
      if (type === 'gpio_read' || type === 'adc_read') {
        setSensorData(prev => ({
          ...prev,
          [`pin_${data.pin}`]: data.value ?? data.raw_value,
          ...(data.voltage !== undefined && { [`voltage_${data.pin}`]: data.voltage }),
        }));
      }
    };

    const handleVariableUpdate = (event: CustomEvent) => {
      const { name, value } = event.detail;
      setSensorData(prev => ({ ...prev, [name]: value }));
    };

    window.addEventListener('esp32-sensor-data', handleSensorData as EventListener);
    window.addEventListener('serial-variable-update', handleVariableUpdate as EventListener);

    return () => {
      window.removeEventListener('esp32-sensor-data', handleSensorData as EventListener);
      window.removeEventListener('serial-variable-update', handleVariableUpdate as EventListener);
    };
  }, []);

  // Read sensor value
  const readSensor = useCallback(async (pin: number, type: 'gpio' | 'adc' = 'gpio') => {
    if (!isConnected) return null;
    try {
      if (type === 'adc') {
        const result = await adcRead(pin);
        setSensorData(prev => ({
          ...prev,
          [`pin_${pin}`]: result.raw_value,
          [`voltage_${pin}`]: result.voltage,
        }));
        return result;
      } else {
        const result = await gpioRead(pin);
        setSensorData(prev => ({ ...prev, [`pin_${pin}`]: result.value }));
        return result;
      }
    } catch (e) {
      console.error('Failed to read sensor:', e);
      return null;
    }
  }, [isConnected, gpioRead, adcRead]);

  // Write to actuator
  const writeActuator = useCallback(async (pin: number, value: number) => {
    if (!isConnected) return false;
    try {
      await gpioWrite(pin, value);
      setSensorData(prev => ({ ...prev, [`pin_${pin}`]: value }));
      return true;
    } catch (e) {
      console.error('Failed to write actuator:', e);
      return false;
    }
  }, [isConnected, gpioWrite]);

  // Get device system info
  const getDeviceInfo = useCallback(async () => {
    if (!isConnected) return null;
    try {
      return await getSystemInfo();
    } catch (e) {
      console.error('Failed to get system info:', e);
      return null;
    }
  }, [isConnected, getSystemInfo]);

  // Link device to project
  const linkToProject = useCallback((deviceId: string, projectId: string) => {
    linkDeviceMutation.mutate({ deviceId, projectId });
  }, [linkDeviceMutation]);

  // Unlink device from project
  const unlinkFromProject = useCallback((deviceId: string) => {
    unlinkDeviceMutation.mutate(deviceId);
  }, [unlinkDeviceMutation]);

  // Select active device
  const selectDevice = useCallback((deviceId: string | null) => {
    setActiveDeviceId(deviceId);
  }, []);

  // Get devices for current project
  const projectDevices = useMemo(() => {
    if (!currentProjectId) return [];
    return devices.filter(d => d.projectId === currentProjectId);
  }, [devices, currentProjectId]);

  // Get unlinked devices
  const unlinkedDevices = useMemo(() => {
    return devices.filter(d => !d.projectId);
  }, [devices]);

  return {
    // State
    devices,
    activeDevice,
    linkedDevice,
    project,
    projectDevices,
    unlinkedDevices,
    isConnected,
    connectionState,
    sensorData,
    
    // Actions
    selectDevice,
    linkToProject,
    unlinkFromProject,
    readSensor,
    writeActuator,
    getDeviceInfo,
    
    // Mutation states
    isLinking: linkDeviceMutation.isPending,
    isUnlinking: unlinkDeviceMutation.isPending,
  };
}

// Hook for AI to access device context
export function useDeviceAIContext() {
  const { activeDevice, sensorData, isConnected, project } = useDeviceContext();

  const contextForAI = useMemo(() => {
    return {
      hasDevice: !!activeDevice,
      deviceName: activeDevice?.name || 'No device',
      deviceType: activeDevice?.hardware || 'unknown',
      isConnected,
      projectName: project?.name || 'No project',
      projectLanguage: project?.language || 'arduino',
      sensorValues: sensorData,
      capabilities: activeDevice ? {
        gpio: true,
        adc: activeDevice.hardware?.includes('esp') || false,
        wifi: activeDevice.hardware?.includes('esp') || false,
        i2c: true,
        spi: true,
      } : null,
    };
  }, [activeDevice, sensorData, isConnected, project]);

  return contextForAI;
}
