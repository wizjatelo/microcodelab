import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
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
  X,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAppStore } from "@/lib/store";
import { renderWidget, widgetDefinitions } from "@/components/widgets";
import { ConnectionIndicator } from "@/components/connection-status";
import type { Dashboard, WidgetConfig, WidgetLayout, WidgetType, Project, Device } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

function WidgetPalette({
  onAddWidget,
}: {
  onAddWidget: (type: WidgetType) => void;
}) {
  const categories = {
    control: Object.entries(widgetDefinitions).filter(([_, d]) => d.category === "control"),
    display: Object.entries(widgetDefinitions).filter(([_, d]) => d.category === "display"),
    visualization: Object.entries(widgetDefinitions).filter(([_, d]) => d.category === "visualization"),
  };

  return (
    <div className="space-y-4">
      {Object.entries(categories).map(([category, widgets]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            {category}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {widgets.map(([type, def]) => (
              <Button
                key={type}
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => onAddWidget(type as WidgetType)}
                data-testid={`button-add-widget-${type}`}
              >
                <def.icon className="h-5 w-5" />
                <span className="text-xs">{def.name}</span>
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

  return (
    <Sheet open={!!widget} onOpenChange={() => onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Widget Properties</SheetTitle>
          <SheetDescription>
            Configure the selected widget
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={widget.label}
              onChange={(e) => onUpdate({ ...widget, label: e.target.value })}
              data-testid="input-widget-label"
            />
          </div>
          <div className="space-y-2">
            <Label>Device</Label>
            <select
              className="w-full h-9 px-3 rounded-md border bg-background text-sm"
              value={widget.deviceId || "dev-1"}
              onChange={(e) => onUpdate({ ...widget, deviceId: e.target.value })}
              data-testid="select-widget-device"
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
              {devices.length === 0 && (
                <option value="dev-1">Default Device</option>
              )}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Variable Name</Label>
            <Input
              value={widget.variableName || ""}
              onChange={(e) => onUpdate({ ...widget, variableName: e.target.value })}
              placeholder="e.g., temperature"
              data-testid="input-widget-variable"
            />
          </div>
          {(widget.type === "slider" || widget.type === "gauge") && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Min</Label>
                  <Input
                    type="number"
                    value={widget.min || 0}
                    onChange={(e) => onUpdate({ ...widget, min: Number(e.target.value) })}
                    data-testid="input-widget-min"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max</Label>
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
                  placeholder="e.g., °C, %, V"
                  data-testid="input-widget-unit"
                />
              </div>
            </>
          )}
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

export default function DashboardPage() {
  const { currentProjectId, currentDashboardId, setCurrentDashboard, deviceData } = useAppStore();
  const [isEditing, setIsEditing] = useState(true);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("Main Dashboard");
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>([]);
  const [localLayout, setLocalLayout] = useState<WidgetLayout[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

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
      return apiRequest("POST", `/api/projects/${currentProjectId}/dashboards`, {
        name,
        widgets: [],
        layout: [],
      });
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
      return apiRequest("PATCH", `/api/projects/${currentProjectId}/dashboards/${currentDashboardId}`, {
        widgets: localWidgets,
        layout: localLayout,
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

  const handleLayoutChange = useCallback((newLayout: GridLayout.Layout[]) => {
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
    return <NoDashboard onCreateNew={() => setCreateDialogOpen(true)} />;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-sm">{currentDashboard?.name || "Dashboard"}</h1>
          <Badge variant="outline" className="text-xs">
            {project?.name}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionIndicator status="offline" />
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">Unsaved</Badge>
          )}
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            data-testid="button-toggle-edit-mode"
          >
            {isEditing ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </>
            )}
          </Button>
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
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {isEditing && (
          <div className="w-60 border-r bg-card p-4 overflow-auto">
            <h3 className="font-semibold text-sm mb-4">Widgets</h3>
            <WidgetPalette onAddWidget={handleAddWidget} />
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 bg-muted/30">
          {localWidgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <LayoutGrid className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Drag widgets from the palette to build your dashboard</p>
            </div>
          ) : (
            <GridLayout
              className="layout"
              layout={localLayout}
              cols={12}
              rowHeight={60}
              width={isEditing ? 900 : 1100}
              isDraggable={isEditing}
              isResizable={isEditing}
              onLayoutChange={handleLayoutChange}
              draggableHandle=".drag-handle"
            >
              {localWidgets.map((widget) => (
                <div
                  key={widget.id}
                  className={`group bg-card border rounded-lg overflow-hidden ${
                    selectedWidgetId === widget.id ? "ring-2 ring-primary" : ""
                  } ${isEditing ? "cursor-move" : ""}`}
                  onClick={() => isEditing && setSelectedWidgetId(widget.id)}
                  data-testid={`widget-container-${widget.id}`}
                >
                  {isEditing && (
                    <div className="drag-handle absolute top-0 left-0 right-0 h-6 flex items-center justify-center bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  {renderWidget(
                    widget,
                    deviceData[widget.deviceId || "dev-1"]?.[widget.variableName || ""],
                    undefined,
                    isEditing
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
