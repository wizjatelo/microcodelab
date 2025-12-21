import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import GridLayoutBase from "react-grid-layout";
import "react-grid-layout/css/styles.css";
const GridLayout = GridLayoutBase as any;
import {
  Plus,
  Save,
  Eye,
  Edit3,
  Trash2,
  FolderOpen,
  LayoutGrid,
  Settings,
  GripVertical,
  Cpu,
  Link2,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAppStore } from "@/lib/store";
import { renderWidget, widgetDefinitions } from "@/components/widgets";
import { useDeviceIntegration } from "@/hooks/use-device-integration";
import { ConnectionIndicator } from "@/components/connection-status";
import { DashboardAIAssistant } from "@/components/dashboard-ai-assistant";
import { DashboardTemplates } from "@/components/dashboard-templates";
import { DashboardExport } from "@/components/dashboard-export";
import { WidgetCodeLink } from "@/components/widget-code-link";
import { useDeviceContext } from "@/hooks/use-device-context";
import { deviceLinking } from "@/services/device-linking";
import type { Dashboard, WidgetConfig, WidgetLayout, WidgetType, Project, Device } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

function WidgetPalette({
  onAddWidget,
}: {
  onAddWidget: (type: WidgetType) => void;
}) {
  const categories = {
    device: Object.entries(widgetDefinitions).filter(([_, d]) => d.category === "device"),
    control: Object.entries(widgetDefinitions).filter(([_, d]) => d.category === "control"),
    display: Object.entries(widgetDefinitions).filter(([_, d]) => d.category === "display"),
    visualization: Object.entries(widgetDefinitions).filter(([_, d]) => d.category === "visualization"),
    media: Object.entries(widgetDefinitions).filter(([_, d]) => d.category === "media"),
    layout: Object.entries(widgetDefinitions).filter(([_, d]) => d.category === "layout"),
  };

  const categoryColors = {
    device: "cyan",
    control: "blue",
    display: "green", 
    visualization: "purple",
    media: "red",
    layout: "gray"
  };

  return (
    <div className="space-y-4">
      {Object.entries(categories).map(([category, widgets]) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full bg-${categoryColors[category as keyof typeof categoryColors]}-500`} />
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">
              {category}
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {widgets.map(([type, def]) => (
              <Button
                key={type}
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-muted/50 transition-colors"
                onClick={() => onAddWidget(type as WidgetType)}
                data-testid={`button-add-widget-${type}`}
                title={def.description}
              >
                <def.icon className="h-4 w-4" />
                <span className="text-xs text-center leading-tight">{def.name}</span>
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WidgetPropertiesPanel({
  widget,
  devices,
  onUpdate,
  onDelete,
  onClose,
}: {
  widget: WidgetConfig | null;
  devices: Device[];
  onUpdate: (widget: WidgetConfig) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  if (!widget) return null;

  const widgetDef = widgetDefinitions[widget.type];
  const needsMinMax = ["slider", "gauge", "progressBar"].includes(widget.type);
  const needsOptions = ["dropdown"].includes(widget.type);
  const needsUrl = ["videoStream", "imageDisplay", "audioPlayer"].includes(widget.type);
  const needsColor = ["gauge", "ledIndicator", "colorPicker", "lineChart", "barChart"].includes(widget.type);

  return (
    <Sheet open={!!widget} onOpenChange={() => onClose()}>
      <SheetContent className="w-96 overflow-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <widgetDef.icon className="h-5 w-5" />
            Widget Properties
          </SheetTitle>
          <SheetDescription>
            Configure {widgetDef.name} - {widgetDef.description}
          </SheetDescription>
        </SheetHeader>
        
        <Tabs defaultValue="basic" className="py-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Widget ID</Label>
              <Input value={widget.id} disabled className="text-muted-foreground" />
            </div>
            
            {/* Code Binding Link */}
            <div className="space-y-2">
              <Label>Code Binding</Label>
              <WidgetCodeLink 
                widgetId={widget.id} 
                widgetType={widget.type}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Label/Title</Label>
              <Input
                value={widget.label}
                onChange={(e) => onUpdate({ ...widget, label: e.target.value })}
                data-testid="input-widget-label"
              />
            </div>

            {needsOptions && (
              <div className="space-y-2">
                <Label>Options (one per line)</Label>
                <Textarea
                  value={(widget.options || ["Option 1", "Option 2", "Option 3"]).join('\n')}
                  onChange={(e: any) => onUpdate({ 
                    ...widget, 
                    options: e.target.value.split('\n').filter((o: string) => o.trim()) 
                  })}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  rows={4}
                />
              </div>
            )}

            {needsUrl && (
              <div className="space-y-2">
                <Label>
                  {widget.type === "videoStream" ? "Stream URL" : 
                   widget.type === "imageDisplay" ? "Image URL" : "Audio URL"}
                </Label>
                <Input
                  value={widget.streamUrl || widget.imageUrl || widget.audioUrl || ""}
                  onChange={(e) => {
                    const urlProp = widget.type === "videoStream" ? "streamUrl" :
                                   widget.type === "imageDisplay" ? "imageUrl" : "audioUrl";
                    onUpdate({ ...widget, [urlProp]: e.target.value });
                  }}
                  placeholder="https://..."
                />
              </div>
            )}

            {(widget.type === "videoStream" || widget.type === "audioPlayer") && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoplay"
                  checked={widget.autoPlay || false}
                  onChange={(e) => onUpdate({ ...widget, autoPlay: e.target.checked })}
                />
                <Label htmlFor="autoplay">Auto Play</Label>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="data" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Device</Label>
              <Select
                value={widget.deviceId || "dev-1"}
                onValueChange={(value: string) => onUpdate({ ...widget, deviceId: value })}
              >
                <SelectTrigger data-testid="select-widget-device">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))}
                  {devices.length === 0 && (
                    <SelectItem value="dev-1">Default Device</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Variable/Sensor Name</Label>
              <Input
                value={widget.variableName || ""}
                onChange={(e) => onUpdate({ ...widget, variableName: e.target.value })}
                placeholder="e.g., temperature, led_state"
                data-testid="input-widget-variable"
              />
            </div>

            {widget.type === "button" && (
              <div className="space-y-2">
                <Label>Function Name</Label>
                <Input
                  value={widget.functionName || ""}
                  onChange={(e) => onUpdate({ ...widget, functionName: e.target.value })}
                  placeholder="e.g., toggleLED, setSpeed"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Update Interval (ms)</Label>
              <Input
                type="number"
                value={widget.updateInterval || 1000}
                onChange={(e) => onUpdate({ ...widget, updateInterval: Number(e.target.value) })}
                min={100}
                max={60000}
              />
            </div>

            {needsMinMax && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Min Value</Label>
                    <Input
                      type="number"
                      value={widget.min || 0}
                      onChange={(e) => onUpdate({ ...widget, min: Number(e.target.value) })}
                      data-testid="input-widget-min"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Value</Label>
                    <Input
                      type="number"
                      value={widget.max || 100}
                      onChange={(e) => onUpdate({ ...widget, max: Number(e.target.value) })}
                      data-testid="input-widget-max"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input
                    value={widget.unit || ""}
                    onChange={(e) => onUpdate({ ...widget, unit: e.target.value })}
                    placeholder="e.g., °C, %, V, RPM"
                    data-testid="input-widget-unit"
                  />
                </div>
              </>
            )}

            {["lineChart", "barChart"].includes(widget.type) && (
              <div className="space-y-2">
                <Label>Max Data Points</Label>
                <Input
                  type="number"
                  value={widget.maxDataPoints || 50}
                  onChange={(e) => onUpdate({ ...widget, maxDataPoints: Number(e.target.value) })}
                  min={10}
                  max={1000}
                />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="style" className="space-y-4 mt-4">
            {needsColor && (
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={widget.color || "#3b82f6"}
                    onChange={(e) => onUpdate({ ...widget, color: e.target.value })}
                    className="w-12 h-8 rounded border"
                  />
                  <Input
                    value={widget.color || "#3b82f6"}
                    onChange={(e) => onUpdate({ ...widget, color: e.target.value })}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={widget.backgroundColor || "#ffffff"}
                  onChange={(e) => onUpdate({ ...widget, backgroundColor: e.target.value })}
                  className="w-12 h-8 rounded border"
                />
                <Input
                  value={widget.backgroundColor || "#ffffff"}
                  onChange={(e) => onUpdate({ ...widget, backgroundColor: e.target.value })}
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Font Size</Label>
              <Select
                value={widget.fontSize || "medium"}
                onValueChange={(value: string) => onUpdate({ ...widget, fontSize: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="extra-large">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="border"
                checked={widget.border || false}
                onChange={(e) => onUpdate({ ...widget, border: e.target.checked })}
              />
              <Label htmlFor="border">Show Border</Label>
            </div>

            {["lineChart", "barChart"].includes(widget.type) && (
              <>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showGrid"
                    checked={widget.showGrid !== false}
                    onChange={(e) => onUpdate({ ...widget, showGrid: e.target.checked })}
                  />
                  <Label htmlFor="showGrid">Show Grid</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showLegend"
                    checked={widget.showLegend !== false}
                    onChange={(e) => onUpdate({ ...widget, showLegend: e.target.checked })}
                  />
                  <Label htmlFor="showLegend">Show Legend</Label>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t">
          <Button
            variant="destructive"
            className="w-full"
            onClick={onDelete}
            data-testid="button-delete-widget"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Widget
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NoDashboard({ onCreateNew }: { onCreateNew: () => void }) {
  const [, setLocation] = useLocation();
  const { currentProjectId } = useAppStore();

  if (!currentProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
          <FolderOpen className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No project selected</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Open a project to access its dashboard
        </p>
        <Button onClick={() => setLocation("/")} data-testid="button-open-projects">
          <FolderOpen className="h-4 w-4 mr-2" />
          Open Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <LayoutGrid className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No dashboard yet</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        Create a dashboard to build your device control interface
      </p>
      <Button onClick={onCreateNew} data-testid="button-create-dashboard">
        <Plus className="h-4 w-4 mr-2" />
        Create Dashboard
      </Button>
    </div>
  );
}

type DashboardMode = "edit" | "preview" | "live";

export default function DashboardPage() {
  const { currentProjectId, currentDashboardId, setCurrentDashboard, deviceData, wsConnected } = useAppStore();
  const [mode, setMode] = useState<DashboardMode>("edit");
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("Main Dashboard");
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>([]);
  const [localLayout, setLocalLayout] = useState<WidgetLayout[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [layoutLocked, setLayoutLocked] = useState(false);
  const { toast } = useToast();
  const { sendCommand } = useWebSocket();
  const { setCurrentProject } = useAppStore();
  
  // Device linking integration
  const { 
    linkedDevice, 
    unlinkedDevices, 
    isConnected: deviceConnected,
    sensorData,
    linkToProject,
    unlinkFromProject 
  } = useDeviceContext();

  // Enhanced device integration for widgets
  const deviceIntegration = useDeviceIntegration();

  // Fetch all projects to auto-select one if needed
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Auto-select first project if none selected
  useEffect(() => {
    if (!currentProjectId && projects && projects.length > 0) {
      setCurrentProject(projects[0].id);
    }
  }, [currentProjectId, projects, setCurrentProject]);

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", currentProjectId],
    enabled: !!currentProjectId,
  });

  const { data: dashboards, isLoading } = useQuery<Dashboard[]>({
    queryKey: ["/api/projects", currentProjectId, "dashboards"],
    enabled: !!currentProjectId,
  });

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  const currentDashboard = dashboards?.find((d) => d.id === currentDashboardId);
  
  // Listen for device link events
  useEffect(() => {
    const unsubscribe = deviceLinking.on('device_state_change', (event) => {
      // Update widget data when device state changes
      if (event.deviceId === linkedDevice?.id) {
        toast({
          title: "Device Update",
          description: `Received data from ${linkedDevice?.name}`,
        });
      }
    });
    return unsubscribe;
  }, [linkedDevice?.id, linkedDevice?.name, toast]);

  // Initialize local state when dashboard loads
  useMemo(() => {
    if (currentDashboard) {
      setLocalWidgets(currentDashboard.widgets);
      setLocalLayout(currentDashboard.layout);
      setHasChanges(false);
    }
  }, [currentDashboard?.id]);

  // Auto-select first dashboard
  useMemo(() => {
    if (dashboards && dashboards.length > 0 && !currentDashboardId) {
      setCurrentDashboard(dashboards[0].id);
    }
  }, [dashboards, currentDashboardId, setCurrentDashboard]);

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest(`/api/projects/${currentProjectId}/dashboards`, {
        method: "POST",
        body: {
          name,
          widgets: [],
          layout: [],
        },
      });
      return response as unknown as Dashboard;
    },
    onSuccess: (data: Dashboard) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProjectId, "dashboards"] });
      setCurrentDashboard(data.id);
      setCreateDialogOpen(false);
      toast({ title: "Dashboard created", description: "Your new dashboard is ready." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create dashboard.", variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/projects/${currentProjectId}/dashboards/${currentDashboardId}`, {
        method: "PATCH",
        body: {
          widgets: localWidgets,
          layout: localLayout,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProjectId, "dashboards"] });
      setHasChanges(false);
      toast({ title: "Saved", description: "Dashboard saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save dashboard.", variant: "destructive" });
    },
  });

  const handleAddWidget = useCallback((type: WidgetType) => {
    const def = widgetDefinitions[type];
    const id = uuidv4();
    
    const newWidget: WidgetConfig = {
      id,
      type,
      label: def.name,
    };
    
    const newLayoutItem: WidgetLayout = {
      i: id,
      x: 0,
      y: Infinity,
      w: def.defaultSize.w,
      h: def.defaultSize.h,
      minW: 1,
      minH: 1,
    };
    
    setLocalWidgets((prev) => [...prev, newWidget]);
    setLocalLayout((prev) => [...prev, newLayoutItem]);
    setHasChanges(true);
  }, []);

  const handleLayoutChange = useCallback((newLayout: any[]) => {
    setLocalLayout(newLayout.map((item) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW,
      minH: item.minH,
    })));
    setHasChanges(true);
  }, []);

  const handleUpdateWidget = useCallback((updated: WidgetConfig) => {
    setLocalWidgets((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    setHasChanges(true);
  }, []);

  const handleDeleteWidget = useCallback(() => {
    if (!selectedWidgetId) return;
    setLocalWidgets((prev) => prev.filter((w) => w.id !== selectedWidgetId));
    setLocalLayout((prev) => prev.filter((l) => l.i !== selectedWidgetId));
    setSelectedWidgetId(null);
    setHasChanges(true);
  }, [selectedWidgetId]);

  const handleWidgetChange = useCallback((widget: WidgetConfig, value: number | string | boolean) => {
    if (mode !== "live") return;

    // Use device integration for sending data
    const deviceId = widget.deviceId || linkedDevice?.id || "dev-1";

    // Handle different widget types
    switch (widget.type) {
      case "button":
        if (widget.functionName) {
          // Try device integration first, fall back to WebSocket
          if (deviceIntegration.isConnected) {
            deviceIntegration.callFunction(widget.functionName);
          } else if (wsConnected) {
            sendCommand("call_function", {
              function: widget.functionName,
              deviceId
            });
          }
        }
        break;
      
      case "functionTrigger":
        // Handle function trigger widget
        if (typeof value === 'object' && value !== null && 'function' in value) {
          const funcName = (value as any).function;
          if (deviceIntegration.isConnected) {
            deviceIntegration.callFunction(funcName);
          } else if (wsConnected) {
            sendCommand("call_function", { function: funcName, deviceId });
          }
        }
        break;
      
      case "gpioControl":
        // Handle GPIO control widget
        if (typeof value === 'object' && value !== null) {
          Object.entries(value as Record<number, boolean>).forEach(([pin, state]) => {
            if (deviceIntegration.isConnected) {
              deviceIntegration.writeGPIO(Number(pin), state ? 1 : 0);
            }
          });
        }
        break;
      
      case "slider":
      case "toggle":
      case "colorPicker":
      case "dropdown":
        if (widget.variableName) {
          // Try device integration first, fall back to WebSocket
          if (deviceIntegration.isConnected) {
            deviceIntegration.sendToDevice(widget.variableName, value);
          } else if (wsConnected) {
            sendCommand("update_variable", {
              variable: widget.variableName,
              value: value,
              deviceId
            });
          }
        }
        break;
      
      case "joystick":
        if (widget.xVariable && widget.yVariable && typeof value === "object" && value !== null) {
          const coords = value as { x: number; y: number };
          if (deviceIntegration.isConnected) {
            deviceIntegration.sendToDevice(widget.xVariable, coords.x);
            deviceIntegration.sendToDevice(widget.yVariable, coords.y);
          } else if (wsConnected) {
            sendCommand("update_variable", {
              variable: widget.xVariable,
              value: coords.x,
              deviceId
            });
            sendCommand("update_variable", {
              variable: widget.yVariable,
              value: coords.y,
              deviceId
            });
          }
        }
        break;
    }
  }, [mode, wsConnected, sendCommand, linkedDevice?.id, deviceIntegration]);

  const handleAutoLayout = useCallback(() => {
    if (localWidgets.length === 0) return;

    // AI-powered auto-layout algorithm
    const newLayout: WidgetLayout[] = [];
    let currentX = 0;
    let currentY = 0;
    const maxCols = 12;

    // Sort widgets by category and importance
    const sortedWidgets = [...localWidgets].sort((a, b) => {
      const categoryOrder: Record<string, number> = { device: 0, control: 1, display: 2, visualization: 3, media: 4, layout: 5 };
      const aCat = widgetDefinitions[a.type]?.category || "layout";
      const bCat = widgetDefinitions[b.type]?.category || "layout";
      return (categoryOrder[aCat] || 5) - (categoryOrder[bCat] || 5);
    });

    sortedWidgets.forEach((widget) => {
      const def = widgetDefinitions[widget.type];
      const widgetWidth = def.defaultSize.w;
      const widgetHeight = def.defaultSize.h;

      // Check if widget fits in current row
      if (currentX + widgetWidth > maxCols) {
        currentX = 0;
        currentY += Math.max(2, widgetHeight); // Add some vertical spacing
      }

      newLayout.push({
        i: widget.id,
        x: currentX,
        y: currentY,
        w: widgetWidth,
        h: widgetHeight,
        minW: 1,
        minH: 1,
      });

      currentX += widgetWidth;
    });

    setLocalLayout(newLayout);
    setHasChanges(true);
    toast({ title: "Layout optimized", description: "Widgets arranged using AI recommendations." });
  }, [localWidgets, toast]);

  const handleApplyTemplate = useCallback((widgets: WidgetConfig[], layout: WidgetLayout[]) => {
    setLocalWidgets(widgets);
    setLocalLayout(layout);
    setHasChanges(true);
    toast({ 
      title: "Template applied", 
      description: `Dashboard loaded with ${widgets.length} widgets.` 
    });
  }, [toast]);

  const selectedWidget = localWidgets.find((w) => w.id === selectedWidgetId);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[calc(100%-40px)] w-full" />
      </div>
    );
  }

  if (!currentProjectId || !dashboards || dashboards.length === 0) {
    return (
      <>
        <NoDashboard onCreateNew={() => setCreateDialogOpen(true)} />
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Dashboard</DialogTitle>
              <DialogDescription>
                Create a new dashboard for your project
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label>Dashboard Name</Label>
                <Input
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  placeholder="Main Dashboard"
                  data-testid="input-dashboard-name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newDashboardName)}
                disabled={createMutation.isPending}
                data-testid="button-confirm-create-dashboard"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-sm">{currentDashboard?.name || "Dashboard"}</h1>
          <Badge variant="outline" className="text-xs">
            {project?.name}
          </Badge>
          
          {/* Device Link Status */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                <Cpu className={`h-3 w-3 ${linkedDevice ? (deviceConnected ? 'text-green-500' : 'text-yellow-500') : 'text-muted-foreground'}`} />
                {linkedDevice ? linkedDevice.name : 'No Device'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Device Link</h4>
                  {linkedDevice && (
                    <Badge variant={deviceConnected ? "default" : "secondary"} className="text-xs">
                      {deviceConnected ? "Connected" : "Offline"}
                    </Badge>
                  )}
                </div>
                
                {linkedDevice ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <Cpu className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{linkedDevice.name}</p>
                        <p className="text-xs text-muted-foreground">{linkedDevice.hardware || 'ESP32'}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => unlinkFromProject(linkedDevice.id)}
                      >
                        <Unlink className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Sensor Data Preview */}
                    {Object.keys(sensorData).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Live Data</p>
                        <div className="grid grid-cols-2 gap-1">
                          {Object.entries(sensorData).slice(0, 4).map(([key, value]) => (
                            <div key={key} className="text-xs bg-muted/50 rounded px-2 py-1">
                              <span className="text-muted-foreground">{key}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Link a device to enable live dashboard control
                    </p>
                    {unlinkedDevices.length > 0 ? (
                      <div className="space-y-1">
                        {unlinkedDevices.slice(0, 3).map((device) => (
                          <Button
                            key={device.id}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={() => currentProjectId && linkToProject(device.id, currentProjectId)}
                          >
                            <Link2 className="h-3 w-3" />
                            {device.name}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No available devices. Add a device first.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionIndicator status={wsConnected ? "online" : "offline"} />
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">Unsaved</Badge>
          )}
          
          {/* Dashboard Mode Selector */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={mode === "edit" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("edit")}
              className="h-7 px-2"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant={mode === "preview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("preview")}
              className="h-7 px-2"
            >
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </Button>
            <Button
              variant={mode === "live" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("live")}
              className="h-7 px-2"
              disabled={!wsConnected}
              title={wsConnected ? "Live mode - real device control" : "Requires device connection"}
            >
              <Settings className="h-3 w-3 mr-1" />
              Live
            </Button>
          </div>

          {/* Toolbar for Edit Mode */}
          {mode === "edit" && (
            <div className="flex items-center gap-1 border-l pl-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
                className="h-7 px-2"
                title="Toggle Grid"
              >
                <LayoutGrid className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLayoutLocked(!layoutLocked)}
                className="h-7 px-2"
                title="Lock Layout"
              >
                <GripVertical className="h-3 w-3" />
              </Button>
              <DashboardTemplates onApplyTemplate={handleApplyTemplate} />
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
            data-testid="button-save-dashboard"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          
          {currentDashboard && (
            <DashboardExport
              dashboard={currentDashboard}
              widgets={localWidgets}
              layout={localLayout}
            />
          )}
          
          {/* AI Assistant - Extreme Right */}
          <DashboardAIAssistant
            widgets={localWidgets}
            onAddWidget={handleAddWidget}
            onAutoLayout={handleAutoLayout}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {mode === "edit" && (
          <div className="w-64 border-r bg-card p-4 overflow-auto">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Widget Palette
            </h3>
            <WidgetPalette onAddWidget={handleAddWidget} />
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 bg-muted/30 relative">
          {/* Grid Background */}
          {mode === "edit" && showGrid && (
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />
          )}

          {localWidgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <LayoutGrid className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm mb-2">
                {mode === "edit" 
                  ? "Drag widgets from the palette to build your dashboard"
                  : "No widgets in this dashboard"
                }
              </p>
              {mode !== "edit" && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setMode("edit")}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Switch to Edit Mode
                </Button>
              )}
            </div>
          ) : (
            <GridLayout
              className="layout"
              layout={localLayout}
              cols={12}
              rowHeight={60}
              width={mode === "edit" ? 900 : 1200}
              isDraggable={mode === "edit" && !layoutLocked}
              isResizable={mode === "edit" && !layoutLocked}
              onLayoutChange={(layout: any) => handleLayoutChange([...layout])}
              draggableHandle=".drag-handle"
              margin={[8, 8]}
            >
              {localWidgets.map((widget) => (
                <div
                  key={widget.id}
                  className={`group bg-card border rounded-lg overflow-hidden transition-all duration-200 ${
                    selectedWidgetId === widget.id ? "ring-2 ring-primary shadow-lg" : ""
                  } ${mode === "edit" ? "cursor-move hover:shadow-md" : ""}`}
                  onClick={() => mode === "edit" && setSelectedWidgetId(widget.id)}
                  data-testid={`widget-container-${widget.id}`}
                  style={{
                    backgroundColor: widget.backgroundColor || undefined,
                    borderWidth: widget.border ? 2 : 1,
                  }}
                >
                  {mode === "edit" && !layoutLocked && (
                    <div className="drag-handle absolute top-0 left-0 right-0 h-6 flex items-center justify-center bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Mode indicator for preview/live */}
                  {mode !== "edit" && (
                    <div className="absolute top-1 right-1 z-10">
                      <Badge 
                        variant={mode === "live" ? "default" : "secondary"} 
                        className="text-xs px-1 py-0"
                      >
                        {mode === "live" ? "LIVE" : "PREVIEW"}
                      </Badge>
                    </div>
                  )}
                  
                  {renderWidget(
                    widget,
                    mode === "preview" 
                      ? Math.random() * 100 // Mock data for preview
                      : widget.type === 'deviceStatus' 
                        ? { name: linkedDevice?.name || 'No Device', status: deviceConnected ? 'online' : 'offline', hardware: linkedDevice?.hardware || 'Unknown' }
                        : widget.type === 'sensorMonitor'
                          ? sensorData
                          : widget.type === 'variableWatch'
                            ? Object.entries(sensorData).map(([name, value]) => ({ name, value, type: typeof value }))
                            : deviceData[widget.deviceId || linkedDevice?.id || "dev-1"]?.[widget.variableName || ""] ?? sensorData[widget.variableName || ""],
                    mode === "live" ? (value) => handleWidgetChange(widget, value) : undefined,
                    mode === "edit"
                  )}
                </div>
              ))}
            </GridLayout>
          )}
        </div>
      </div>

      <WidgetPropertiesPanel
        widget={selectedWidget || null}
        devices={devices}
        onUpdate={handleUpdateWidget}
        onDelete={handleDeleteWidget}
        onClose={() => setSelectedWidgetId(null)}
      />

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Dashboard</DialogTitle>
            <DialogDescription>
              Create a new dashboard for your project
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>Dashboard Name</Label>
              <Input
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                placeholder="Main Dashboard"
                data-testid="input-dashboard-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newDashboardName)}
              disabled={createMutation.isPending}
              data-testid="button-confirm-create-dashboard"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
