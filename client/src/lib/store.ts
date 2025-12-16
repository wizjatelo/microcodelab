import { create } from "zustand";
import type { Project, Device, Dashboard, CodeFile, LogEntry, SensorDataPoint, DeploymentStatus, ConnectionStatus } from "@shared/schema";

interface AppState {
  // Current selections
  currentProjectId: string | null;
  currentDeviceId: string | null;
  currentDashboardId: string | null;
  currentFileId: string | null;
  
  // UI state
  sidebarCollapsed: boolean;
  darkMode: boolean;
  editorSplitRatio: number;
  
  // Real-time data
  deviceData: Record<string, Record<string, number | string | boolean>>;
  sensorHistory: Record<string, SensorDataPoint[]>;
  logs: LogEntry[];
  
  // Deployment
  deploymentStatus: DeploymentStatus;
  
  // WebSocket connection status
  wsConnected: boolean;
  
  // Actions
  setCurrentProject: (id: string | null) => void;
  setCurrentDevice: (id: string | null) => void;
  setCurrentDashboard: (id: string | null) => void;
  setCurrentFile: (id: string | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setDarkMode: (dark: boolean) => void;
  setEditorSplitRatio: (ratio: number) => void;
  updateDeviceData: (deviceId: string, variable: string, value: number | string | boolean) => void;
  addSensorDataPoint: (deviceId: string, dataPoint: SensorDataPoint) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  setDeploymentStatus: (status: DeploymentStatus) => void;
  setWsConnected: (connected: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentProjectId: null,
  currentDeviceId: null,
  currentDashboardId: null,
  currentFileId: null,
  
  sidebarCollapsed: false,
  darkMode: localStorage.getItem("darkMode") === "true",
  editorSplitRatio: 0.6,
  
  deviceData: {},
  sensorHistory: {},
  logs: [],
  
  deploymentStatus: {
    status: "idle",
    progress: 0,
  },
  
  wsConnected: false,
  
  setCurrentProject: (id) => set({ currentProjectId: id }),
  setCurrentDevice: (id) => set({ currentDeviceId: id }),
  setCurrentDashboard: (id) => set({ currentDashboardId: id }),
  setCurrentFile: (id) => set({ currentFileId: id }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setDarkMode: (dark) => {
    localStorage.setItem("darkMode", String(dark));
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    set({ darkMode: dark });
  },
  setEditorSplitRatio: (ratio) => set({ editorSplitRatio: ratio }),
  updateDeviceData: (deviceId, variable, value) => set((state) => ({
    deviceData: {
      ...state.deviceData,
      [deviceId]: {
        ...state.deviceData[deviceId],
        [variable]: value,
      },
    },
  })),
  addSensorDataPoint: (deviceId, dataPoint) => set((state) => {
    const key = `${deviceId}:${dataPoint.sensor}`;
    const history = state.sensorHistory[key] || [];
    const newHistory = [...history, dataPoint].slice(-100); // Keep last 100 points
    return {
      sensorHistory: {
        ...state.sensorHistory,
        [key]: newHistory,
      },
    };
  }),
  addLog: (log) => set((state) => ({
    logs: [...state.logs, log].slice(-500), // Keep last 500 logs
  })),
  clearLogs: () => set({ logs: [] }),
  setDeploymentStatus: (status) => set({ deploymentStatus: status }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
}));

// Initialize dark mode on load
if (typeof window !== "undefined") {
  const darkMode = localStorage.getItem("darkMode") === "true";
  if (darkMode) {
    document.documentElement.classList.add("dark");
  }
}
