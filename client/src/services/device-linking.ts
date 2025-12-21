/**
 * Device Linking Service - Unified Link Model
 * Connects devices with projects, code editor, dashboard, and AI
 */

import { queryClient, apiRequest } from '@/lib/queryClient';

// Link Types
export interface DeviceLink {
  deviceId: string;
  projectId?: string;
  dashboardId?: string;
  codeVersionId?: string;
  aiModelIds?: string[];
  status: 'active' | 'inactive' | 'error';
  lastSync: string;
}

export interface ProjectDeviceLink {
  id: string;
  projectId: string;
  deviceId: string;
  role: 'primary' | 'secondary' | 'sensor' | 'actuator';
  settings: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardWidgetBinding {
  widgetId: string;
  deviceId: string;
  bindingType: 'variable' | 'function' | 'sensor';
  bindingTarget: string; // variable_name or function_name
  twoWaySync: boolean;
}

export interface CodeDeviceMapping {
  codeVersionId: string;
  deviceId: string;
  variables: Array<{ name: string; type: string; annotation: string }>;
  functions: Array<{ name: string; params: string[]; annotation: string }>;
  sensors: Array<{ name: string; pin: number; type: string }>;
}

export interface AIDeviceModel {
  id: string;
  deviceId: string;
  modelType: 'anomaly_detection' | 'pattern_recognition' | 'forecasting' | 'optimization';
  status: 'active' | 'training' | 'inactive';
  trainedAt?: string;
  accuracy?: number;
}

export interface LinkHealthReport {
  deviceId: string;
  projectLink: { status: 'ok' | 'broken' | 'degraded'; lastCheck: string };
  dashboardLinks: Array<{ widgetId: string; status: 'ok' | 'broken' }>;
  aiLinks: Array<{ modelId: string; status: 'ok' | 'outdated' | 'error' }>;
  codeLink: { status: 'ok' | 'stale' | 'missing'; lastDeploy?: string };
}

// Event types for cross-component sync
export type LinkEventType = 
  | 'device_state_change'
  | 'code_deployment'
  | 'variable_update'
  | 'function_call'
  | 'ai_insight'
  | 'link_created'
  | 'link_broken'
  | 'link_repaired';

export interface LinkEvent {
  type: LinkEventType;
  deviceId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

type LinkEventCallback = (event: LinkEvent) => void;

class DeviceLinkingService {
  private eventListeners: Map<LinkEventType, Set<LinkEventCallback>> = new Map();
  private deviceLinks: Map<string, DeviceLink> = new Map();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHealthMonitoring();
  }

  // ============== LINK MANAGEMENT ==============

  async linkDeviceToProject(deviceId: string, projectId: string, role: ProjectDeviceLink['role'] = 'primary'): Promise<boolean> {
    try {
      await apiRequest(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        body: { projectId, role }
      });

      // Trigger automatic link propagation
      await this.propagateDeviceLink(deviceId, projectId);
      
      this.emitEvent({
        type: 'link_created',
        deviceId,
        timestamp: new Date().toISOString(),
        data: { projectId, role }
      });

      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      
      return true;
    } catch (e) {
      console.error('Failed to link device to project:', e);
      return false;
    }
  }

  async unlinkDeviceFromProject(deviceId: string): Promise<boolean> {
    try {
      const link = this.deviceLinks.get(deviceId);
      
      await apiRequest(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        body: { projectId: null }
      });

      this.emitEvent({
        type: 'link_broken',
        deviceId,
        timestamp: new Date().toISOString(),
        data: { reason: 'user_unlink' }
      });

      if (link?.projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', link.projectId] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      
      return true;
    } catch (e) {
      console.error('Failed to unlink device:', e);
      return false;
    }
  }

  private async propagateDeviceLink(deviceId: string, projectId: string): Promise<void> {
    // Auto-create dashboard for device
    await this.initializeDashboardForDevice(deviceId, projectId);
    
    // Initialize AI monitoring
    await this.initializeAIMonitoring(deviceId);
    
    // Parse code annotations if code exists
    await this.parseCodeAnnotations(deviceId, projectId);
    
    // Subscribe to device data streams
    this.subscribeToDeviceStream(deviceId);
  }

  // ============== DASHBOARD LINKING ==============

  async bindWidgetToDevice(
    widgetId: string, 
    deviceId: string, 
    bindingType: DashboardWidgetBinding['bindingType'],
    bindingTarget: string,
    twoWaySync: boolean = false
  ): Promise<DashboardWidgetBinding> {
    const binding: DashboardWidgetBinding = {
      widgetId,
      deviceId,
      bindingType,
      bindingTarget,
      twoWaySync
    };

    // Store binding
    this.storeWidgetBinding(binding);

    // Set up real-time subscription
    if (bindingType === 'variable' || bindingType === 'sensor') {
      this.subscribeWidgetToVariable(widgetId, deviceId, bindingTarget);
    }

    return binding;
  }

  getWidgetBindingFormat(deviceId: string, type: 'variable' | 'function' | 'sensor', name: string): string {
    return `device:${deviceId}:${type}:${name}`;
  }

  parseBindingFormat(binding: string): { deviceId: string; type: string; name: string } | null {
    const match = binding.match(/^device:([^:]+):([^:]+):(.+)$/);
    if (!match) return null;
    return { deviceId: match[1], type: match[2], name: match[3] };
  }

  private storeWidgetBinding(binding: DashboardWidgetBinding): void {
    const key = `widget_binding_${binding.widgetId}`;
    localStorage.setItem(key, JSON.stringify(binding));
  }

  getWidgetBinding(widgetId: string): DashboardWidgetBinding | null {
    const key = `widget_binding_${widgetId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }

  private subscribeWidgetToVariable(widgetId: string, deviceId: string, variableName: string): void {
    // This will be handled by WebSocket subscription
    window.addEventListener('serial-variable-update', ((event: CustomEvent) => {
      if (event.detail.name === variableName) {
        window.dispatchEvent(new CustomEvent('widget-data-update', {
          detail: { widgetId, value: event.detail.value, deviceId }
        }));
      }
    }) as EventListener);
  }

  // ============== CODE EDITOR LINKING ==============

  async parseCodeAnnotations(deviceId: string, projectId: string): Promise<CodeDeviceMapping | null> {
    try {
      // Fetch project files
      const files = await apiRequest<Array<{ content: string; language: string }>>(`/api/projects/${projectId}/files`, { method: 'GET' });
      if (!files || files.length === 0) return null;

      const mapping: CodeDeviceMapping = {
        codeVersionId: `${projectId}-${Date.now()}`,
        deviceId,
        variables: [],
        functions: [],
        sensors: []
      };

      for (const file of files) {
        const parsed = this.parseAnnotationsFromCode(file.content, file.language);
        mapping.variables.push(...parsed.variables);
        mapping.functions.push(...parsed.functions);
        mapping.sensors.push(...parsed.sensors);
      }

      // Store mapping
      this.storeCodeMapping(mapping);

      return mapping;
    } catch (e) {
      console.error('Failed to parse code annotations:', e);
      return null;
    }
  }

  private parseAnnotationsFromCode(code: string, _language: string): Omit<CodeDeviceMapping, 'codeVersionId' | 'deviceId'> {
    const result = {
      variables: [] as CodeDeviceMapping['variables'],
      functions: [] as CodeDeviceMapping['functions'],
      sensors: [] as CodeDeviceMapping['sensors']
    };

    const lines = code.split('\n');
    let currentAnnotation = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for annotations
      if (line.includes('@remote_access') || line.includes('@device_variable')) {
        currentAnnotation = 'variable';
      } else if (line.includes('@remote_function') || line.includes('@device_function')) {
        currentAnnotation = 'function';
      } else if (line.includes('@sensor_data')) {
        currentAnnotation = 'sensor';
      } else if (currentAnnotation) {
        // Parse the next line based on annotation
        if (currentAnnotation === 'variable') {
          const varMatch = language === 'python' 
            ? line.match(/^(\w+)\s*=\s*(.+)/)
            : line.match(/(?:int|float|bool|String)\s+(\w+)\s*=/);
          if (varMatch) {
            result.variables.push({
              name: varMatch[1],
              type: this.inferType(varMatch[2] || '', language),
              annotation: '@remote_access'
            });
          }
        } else if (currentAnnotation === 'function') {
          const funcMatch = language === 'python'
            ? line.match(/^def\s+(\w+)\s*\(([^)]*)\)/)
            : line.match(/^(?:void|int|float|bool|String)\s+(\w+)\s*\(([^)]*)\)/);
          if (funcMatch) {
            result.functions.push({
              name: funcMatch[1],
              params: funcMatch[2] ? funcMatch[2].split(',').map(p => p.trim()) : [],
              annotation: '@remote_function'
            });
          }
        } else if (currentAnnotation === 'sensor') {
          const sensorMatch = language === 'python'
            ? line.match(/^(\w+)\s*=/)
            : line.match(/(?:int|float)\s+(\w+)\s*=/);
          if (sensorMatch) {
            result.sensors.push({
              name: sensorMatch[1],
              pin: 0, // Would need more parsing to get pin
              type: 'analog'
            });
          }
        }
        currentAnnotation = '';
      }
    }

    return result;
  }

  private inferType(value: string, language: string): string {
    if (value.includes('true') || value.includes('false') || value.includes('True') || value.includes('False')) {
      return 'boolean';
    }
    if (value.includes('.')) return 'float';
    if (/^\d+$/.test(value.trim())) return 'int';
    if (value.includes('"') || value.includes("'")) return 'string';
    return 'unknown';
  }

  private storeCodeMapping(mapping: CodeDeviceMapping): void {
    const key = `code_mapping_${mapping.deviceId}`;
    localStorage.setItem(key, JSON.stringify(mapping));
  }

  getCodeMapping(deviceId: string): CodeDeviceMapping | null {
    const key = `code_mapping_${deviceId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }

  // ============== AI LINKING ==============

  async initializeAIMonitoring(deviceId: string): Promise<AIDeviceModel[]> {
    const models: AIDeviceModel[] = [
      {
        id: `${deviceId}-anomaly`,
        deviceId,
        modelType: 'anomaly_detection',
        status: 'active'
      },
      {
        id: `${deviceId}-pattern`,
        deviceId,
        modelType: 'pattern_recognition',
        status: 'active'
      }
    ];

    // Store AI models
    const key = `ai_models_${deviceId}`;
    localStorage.setItem(key, JSON.stringify(models));

    return models;
  }

  getAIModels(deviceId: string): AIDeviceModel[] {
    const key = `ai_models_${deviceId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  async feedDataToAI(deviceId: string, data: Record<string, number>): Promise<void> {
    // Store data for AI training
    const key = `ai_training_data_${deviceId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push({ timestamp: Date.now(), data });
    
    // Keep last 1000 data points
    if (existing.length > 1000) existing.shift();
    localStorage.setItem(key, JSON.stringify(existing));

    // Check for anomalies
    await this.checkForAnomalies(deviceId, data);
  }

  private async checkForAnomalies(deviceId: string, data: Record<string, number>): Promise<void> {
    // Simple anomaly detection - check if values are outside normal range
    const key = `ai_training_data_${deviceId}`;
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    
    if (history.length < 10) return;

    for (const [variable, value] of Object.entries(data)) {
      const historicalValues = history
        .map((h: { data: Record<string, number> }) => h.data[variable])
        .filter((v: number | undefined) => v !== undefined);
      
      if (historicalValues.length < 5) continue;

      const mean = historicalValues.reduce((a: number, b: number) => a + b, 0) / historicalValues.length;
      const stdDev = Math.sqrt(
        historicalValues.reduce((sq: number, n: number) => sq + Math.pow(n - mean, 2), 0) / historicalValues.length
      );

      // If value is more than 3 standard deviations from mean, it's an anomaly
      if (Math.abs(value - mean) > 3 * stdDev) {
        this.emitEvent({
          type: 'ai_insight',
          deviceId,
          timestamp: new Date().toISOString(),
          data: {
            type: 'anomaly',
            variable,
            value,
            expected: { mean, stdDev },
            severity: 'warning'
          }
        });
      }
    }
  }

  // ============== DASHBOARD INITIALIZATION ==============

  private async initializeDashboardForDevice(_deviceId: string, projectId: string): Promise<void> {
    // Check if dashboard exists
    try {
      const dashboards = await apiRequest<Array<{ id: string }>>(`/api/projects/${projectId}/dashboards`, { method: 'GET' });
      if (!dashboards || dashboards.length === 0) {
        // Create default dashboard
        await apiRequest(`/api/projects/${projectId}/dashboards`, {
          method: 'POST',
          body: {
            name: 'Device Dashboard',
            widgets: [],
            layout: []
          }
        });
      }
    } catch (e) {
      console.error('Failed to initialize dashboard:', e);
    }
  }

  // ============== REAL-TIME SYNC ==============

  private subscribeToDeviceStream(deviceId: string): void {
    // Listen for device data events
    window.addEventListener('esp32-sensor-data', ((event: CustomEvent) => {
      this.handleDeviceData(deviceId, event.detail);
    }) as EventListener);

    window.addEventListener('serial-variable-update', ((event: CustomEvent) => {
      this.handleVariableUpdate(deviceId, event.detail);
    }) as EventListener);
  }

  private handleDeviceData(deviceId: string, data: Record<string, unknown>): void {
    // Feed to AI
    const numericData: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'number') {
        numericData[key] = value;
      }
    }
    if (Object.keys(numericData).length > 0) {
      this.feedDataToAI(deviceId, numericData);
    }

    // Emit for dashboard updates
    this.emitEvent({
      type: 'device_state_change',
      deviceId,
      timestamp: new Date().toISOString(),
      data
    });
  }

  private handleVariableUpdate(deviceId: string, detail: { name: string; value: unknown }): void {
    this.emitEvent({
      type: 'variable_update',
      deviceId,
      timestamp: new Date().toISOString(),
      data: detail
    });
  }

  // ============== HEALTH MONITORING ==============

  private startHealthMonitoring(): void {
    // Check link health every 5 minutes
    this.healthCheckInterval = setInterval(() => {
      this.checkAllLinksHealth();
    }, 5 * 60 * 1000);
  }

  async checkAllLinksHealth(): Promise<void> {
    const entries = Array.from(this.deviceLinks.entries());
    for (const [deviceId] of entries) {
      const health = await this.checkDeviceLinkHealth(deviceId);
      if (health.projectLink.status === 'broken') {
        this.emitEvent({
          type: 'link_broken',
          deviceId,
          timestamp: new Date().toISOString(),
          data: { component: 'project' }
        });
      }
    }
  }

  async checkDeviceLinkHealth(deviceId: string): Promise<LinkHealthReport> {
    const report: LinkHealthReport = {
      deviceId,
      projectLink: { status: 'ok', lastCheck: new Date().toISOString() },
      dashboardLinks: [],
      aiLinks: [],
      codeLink: { status: 'ok' }
    };

    // Check project link
    try {
      const devices = await apiRequest<Array<{ id: string; projectId?: string }>>('/api/devices', { method: 'GET' });
      const device = devices.find(d => d.id === deviceId);
      if (!device?.projectId) {
        report.projectLink.status = 'broken';
      }
    } catch {
      report.projectLink.status = 'broken';
    }

    // Check AI models
    const aiModels = this.getAIModels(deviceId);
    for (const model of aiModels) {
      report.aiLinks.push({
        modelId: model.id,
        status: model.status === 'active' ? 'ok' : 'error'
      });
    }

    // Check code mapping
    const codeMapping = this.getCodeMapping(deviceId);
    if (!codeMapping) {
      report.codeLink.status = 'missing';
    }

    return report;
  }

  // ============== EVENT SYSTEM ==============

  on(eventType: LinkEventType, callback: LinkEventCallback): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);
    return () => this.eventListeners.get(eventType)?.delete(callback);
  }

  private emitEvent(event: LinkEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }

    // Also emit to window for cross-component communication
    window.dispatchEvent(new CustomEvent('device-link-event', { detail: event }));
  }

  // ============== BULK OPERATIONS ==============

  async bulkLinkDevice(
    deviceId: string,
    projectId: string,
    options: {
      createDashboard?: boolean;
      enableAI?: boolean;
      parseCode?: boolean;
    } = {}
  ): Promise<{
    dashboardCreated: boolean;
    aiInitialized: boolean;
    codeParsed: boolean;
  }> {
    const result = {
      dashboardCreated: false,
      aiInitialized: false,
      codeParsed: false
    };

    // Link to project first
    await this.linkDeviceToProject(deviceId, projectId);

    if (options.createDashboard !== false) {
      await this.initializeDashboardForDevice(deviceId, projectId);
      result.dashboardCreated = true;
    }

    if (options.enableAI !== false) {
      await this.initializeAIMonitoring(deviceId);
      result.aiInitialized = true;
    }

    if (options.parseCode !== false) {
      const mapping = await this.parseCodeAnnotations(deviceId, projectId);
      result.codeParsed = !!mapping;
    }

    return result;
  }

  async syncAllLinks(deviceId: string): Promise<void> {
    const link = this.deviceLinks.get(deviceId);
    if (!link?.projectId) return;

    // Re-parse code annotations
    await this.parseCodeAnnotations(deviceId, link.projectId);

    // Refresh AI models
    await this.initializeAIMonitoring(deviceId);

    // Emit sync event
    this.emitEvent({
      type: 'link_repaired',
      deviceId,
      timestamp: new Date().toISOString(),
      data: { action: 'full_sync' }
    });
  }

  // ============== CLEANUP ==============

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.eventListeners.clear();
    this.deviceLinks.clear();
  }
}

// Singleton instance
export const deviceLinking = new DeviceLinkingService();
