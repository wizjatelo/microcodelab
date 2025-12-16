import { useState } from "react";
import {
  Power,
  ToggleLeft,
  ToggleRight,
  Gauge,
  BarChart3,
  Type,
  Terminal,
  Sliders,
  MousePointer2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WidgetConfig, WidgetType } from "@shared/schema";

export const widgetDefinitions: Record<WidgetType, {
  name: string;
  icon: typeof Power;
  category: "control" | "display" | "visualization";
  defaultSize: { w: number; h: number };
}> = {
  button: { name: "Button", icon: Power, category: "control", defaultSize: { w: 2, h: 1 } },
  slider: { name: "Slider", icon: Sliders, category: "control", defaultSize: { w: 3, h: 1 } },
  toggle: { name: "Toggle", icon: ToggleLeft, category: "control", defaultSize: { w: 2, h: 1 } },
  joystick: { name: "Joystick", icon: MousePointer2, category: "control", defaultSize: { w: 2, h: 2 } },
  dropdown: { name: "Dropdown", icon: ChevronDown, category: "control", defaultSize: { w: 2, h: 1 } },
  gauge: { name: "Gauge", icon: Gauge, category: "display", defaultSize: { w: 2, h: 2 } },
  chart: { name: "Chart", icon: BarChart3, category: "visualization", defaultSize: { w: 4, h: 2 } },
  value_display: { name: "Value", icon: Type, category: "display", defaultSize: { w: 2, h: 1 } },
  log_console: { name: "Console", icon: Terminal, category: "display", defaultSize: { w: 4, h: 2 } },
  map: { name: "Map", icon: MousePointer2, category: "visualization", defaultSize: { w: 4, h: 3 } },
};

interface BaseWidgetProps {
  config: WidgetConfig;
  value?: number | string | boolean;
  onChange?: (value: number | string | boolean) => void;
  isEditing?: boolean;
}

export function ButtonWidget({ config, onChange, isEditing }: BaseWidgetProps) {
  const handleClick = () => {
    if (!isEditing && onChange) {
      onChange(true);
    }
  };

  return (
    <div className="flex items-center justify-center h-full p-2">
      <Button
        className="w-full h-full min-h-10"
        variant="default"
        onClick={handleClick}
        disabled={isEditing}
        data-testid={`widget-button-${config.id}`}
      >
        {config.label || "Button"}
      </Button>
    </div>
  );
}

export function SliderWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const numValue = typeof value === "number" ? value : config.min || 0;
  
  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{config.label || "Slider"}</span>
        <span className="text-muted-foreground">
          {numValue}{config.unit || ""}
        </span>
      </div>
      <Slider
        value={[numValue]}
        min={config.min || 0}
        max={config.max || 100}
        step={config.step || 1}
        onValueChange={([v]) => !isEditing && onChange?.(v)}
        disabled={isEditing}
        className="flex-1"
        data-testid={`widget-slider-${config.id}`}
      />
    </div>
  );
}

export function ToggleWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const boolValue = typeof value === "boolean" ? value : false;
  
  return (
    <div className="flex items-center justify-between h-full p-3">
      <span className="font-medium text-sm">{config.label || "Toggle"}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {boolValue ? "ON" : "OFF"}
        </span>
        <Switch
          checked={boolValue}
          onCheckedChange={(checked) => !isEditing && onChange?.(checked)}
          disabled={isEditing}
          data-testid={`widget-toggle-${config.id}`}
        />
      </div>
    </div>
  );
}

export function GaugeWidget({ config, value, isEditing }: BaseWidgetProps) {
  const numValue = typeof value === "number" ? value : 0;
  const min = config.min || 0;
  const max = config.max || 100;
  const percentage = ((numValue - min) / (max - min)) * 100;
  
  const getColor = () => {
    if (percentage < 33) return "text-green-500";
    if (percentage < 66) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-3" data-testid={`widget-gauge-${config.id}`}>
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Gauge"}</span>
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${percentage * 2.51} 251`}
            className={getColor()}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{Math.round(numValue)}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground mt-1">{config.unit || ""}</span>
    </div>
  );
}

export function ValueDisplayWidget({ config, value, isEditing }: BaseWidgetProps) {
  const displayValue = value !== undefined ? String(value) : "--";
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-3" data-testid={`widget-value-${config.id}`}>
      <span className="text-xs text-muted-foreground">{config.label || "Value"}</span>
      <span className="text-3xl font-bold">{displayValue}</span>
      {config.unit && <span className="text-sm text-muted-foreground">{config.unit}</span>}
    </div>
  );
}

export function ChartWidget({ config, isEditing }: BaseWidgetProps) {
  // Simple placeholder chart
  const bars = [40, 65, 35, 80, 55, 70, 45];
  
  return (
    <div className="flex flex-col h-full p-3" data-testid={`widget-chart-${config.id}`}>
      <span className="text-sm font-medium mb-2">{config.label || "Chart"}</span>
      <div className="flex-1 flex items-end gap-1">
        {bars.map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-primary/80 rounded-t"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function JoystickWidget({ config, onChange, isEditing }: BaseWidgetProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-3" data-testid={`widget-joystick-${config.id}`}>
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Joystick"}</span>
      <div className="relative w-24 h-24 rounded-full bg-muted border-2">
        <div
          className="absolute w-8 h-8 rounded-full bg-primary -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground mt-1">
        X: {position.x - 50} Y: {position.y - 50}
      </span>
    </div>
  );
}

export function DropdownWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  return (
    <div className="flex flex-col h-full p-3 gap-2" data-testid={`widget-dropdown-${config.id}`}>
      <span className="text-sm font-medium">{config.label || "Dropdown"}</span>
      <Select
        value={String(value || "")}
        onValueChange={(v) => !isEditing && onChange?.(v)}
        disabled={isEditing}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
          <SelectItem value="option3">Option 3</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function LogConsoleWidget({ config, isEditing }: BaseWidgetProps) {
  const sampleLogs = [
    "[INFO] Device connected",
    "[DEBUG] Temperature: 24.5°C",
    "[INFO] LED state changed",
    "[WARN] Low battery: 15%",
  ];
  
  return (
    <div className="flex flex-col h-full p-2" data-testid={`widget-console-${config.id}`}>
      <span className="text-sm font-medium mb-1 px-1">{config.label || "Console"}</span>
      <div className="flex-1 overflow-auto bg-muted/50 rounded p-2 font-mono text-xs">
        {sampleLogs.map((log, i) => (
          <div key={i} className="text-muted-foreground">{log}</div>
        ))}
      </div>
    </div>
  );
}

export function MapWidget({ config, isEditing }: BaseWidgetProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-3 bg-muted/30" data-testid={`widget-map-${config.id}`}>
      <span className="text-sm text-muted-foreground">{config.label || "Map"}</span>
      <span className="text-xs text-muted-foreground mt-1">Location widget placeholder</span>
    </div>
  );
}

export function renderWidget(config: WidgetConfig, value?: number | string | boolean, onChange?: (value: number | string | boolean) => void, isEditing?: boolean) {
  const props = { config, value, onChange, isEditing };
  
  switch (config.type) {
    case "button":
      return <ButtonWidget {...props} />;
    case "slider":
      return <SliderWidget {...props} />;
    case "toggle":
      return <ToggleWidget {...props} />;
    case "gauge":
      return <GaugeWidget {...props} />;
    case "value_display":
      return <ValueDisplayWidget {...props} />;
    case "chart":
      return <ChartWidget {...props} />;
    case "joystick":
      return <JoystickWidget {...props} />;
    case "dropdown":
      return <DropdownWidget {...props} />;
    case "log_console":
      return <LogConsoleWidget {...props} />;
    case "map":
      return <MapWidget {...props} />;
    default:
      return <div className="p-3 text-muted-foreground">Unknown widget</div>;
  }
}
