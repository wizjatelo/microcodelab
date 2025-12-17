import { useState, useEffect, useRef, useCallback } from "react";
import {
  Power,
  ToggleLeft,
  Gauge,
  BarChart3,
  Type,
  Terminal,
  Sliders,
  MousePointer2,
  ChevronDown,
  Palette,
  Circle,
  AlignLeft,
  BarChart2,
  TrendingUp,
  BarChart,
  ScatterChart,
  Grid3x3,
  Box,
  Video,
  Image,
  Music,
  Square,
  Layers,
  ChevronsUpDown,
  Navigation,
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
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs as TabsComponent, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { WidgetConfig, WidgetType } from "@shared/schema";

export const widgetDefinitions: Record<WidgetType, {
  name: string;
  icon: typeof Power;
  category: "control" | "display" | "visualization" | "media" | "layout";
  defaultSize: { w: number; h: number };
  description: string;
}> = {
  // Control widgets
  button: { 
    name: "Button", 
    icon: Power, 
    category: "control", 
    defaultSize: { w: 2, h: 1 },
    description: "Push button for actions"
  },
  slider: { 
    name: "Slider", 
    icon: Sliders, 
    category: "control", 
    defaultSize: { w: 3, h: 1 },
    description: "Range slider for numeric control"
  },
  toggle: { 
    name: "Toggle Switch", 
    icon: ToggleLeft, 
    category: "control", 
    defaultSize: { w: 2, h: 1 },
    description: "On/off switch"
  },
  joystick: { 
    name: "Joystick", 
    icon: Navigation, 
    category: "control", 
    defaultSize: { w: 3, h: 3 },
    description: "2D directional control"
  },
  dropdown: { 
    name: "Dropdown Menu", 
    icon: ChevronDown, 
    category: "control", 
    defaultSize: { w: 3, h: 1 },
    description: "Selection from list"
  },
  colorPicker: { 
    name: "Color Picker", 
    icon: Palette, 
    category: "control", 
    defaultSize: { w: 2, h: 2 },
    description: "RGB color selection"
  },
  
  // Display widgets
  gauge: { 
    name: "Gauge", 
    icon: Gauge, 
    category: "display", 
    defaultSize: { w: 3, h: 3 },
    description: "Circular or linear gauge"
  },
  valueDisplay: { 
    name: "Value Display", 
    icon: Type, 
    category: "display", 
    defaultSize: { w: 2, h: 1 },
    description: "Show numeric or text value"
  },
  ledIndicator: { 
    name: "LED Indicator", 
    icon: Circle, 
    category: "display", 
    defaultSize: { w: 1, h: 1 },
    description: "Status indicator light"
  },
  textDisplay: { 
    name: "Text Display", 
    icon: AlignLeft, 
    category: "display", 
    defaultSize: { w: 4, h: 2 },
    description: "Multi-line text output"
  },
  progressBar: { 
    name: "Progress Bar", 
    icon: BarChart2, 
    category: "display", 
    defaultSize: { w: 4, h: 1 },
    description: "Linear progress indicator"
  },
  
  // Visualization widgets
  lineChart: { 
    name: "Line Chart", 
    icon: TrendingUp, 
    category: "visualization", 
    defaultSize: { w: 6, h: 4 },
    description: "Time-series line graph"
  },
  barChart: { 
    name: "Bar Chart", 
    icon: BarChart, 
    category: "visualization", 
    defaultSize: { w: 6, h: 4 },
    description: "Categorical bar graph"
  },
  scatterPlot: { 
    name: "Scatter Plot", 
    icon: ScatterChart, 
    category: "visualization", 
    defaultSize: { w: 6, h: 4 },
    description: "XY scatter plot"
  },
  heatmap: { 
    name: "Heatmap", 
    icon: Grid3x3, 
    category: "visualization", 
    defaultSize: { w: 6, h: 4 },
    description: "2D color-coded grid"
  },
  "3dModel": { 
    name: "3D Model", 
    icon: Box, 
    category: "visualization", 
    defaultSize: { w: 6, h: 6 },
    description: "Three.js 3D visualization"
  },
  
  // Media widgets
  videoStream: { 
    name: "Video Stream", 
    icon: Video, 
    category: "media", 
    defaultSize: { w: 6, h: 4 },
    description: "Live video feed"
  },
  imageDisplay: { 
    name: "Image Display", 
    icon: Image, 
    category: "media", 
    defaultSize: { w: 4, h: 4 },
    description: "Static or updated image"
  },
  audioPlayer: { 
    name: "Audio Player", 
    icon: Music, 
    category: "media", 
    defaultSize: { w: 4, h: 1 },
    description: "Audio playback control"
  },
  
  // Layout widgets
  container: { 
    name: "Container", 
    icon: Square, 
    category: "layout", 
    defaultSize: { w: 6, h: 4 },
    description: "Group widgets together"
  },
  tabs: { 
    name: "Tab Container", 
    icon: Layers, 
    category: "layout", 
    defaultSize: { w: 8, h: 6 },
    description: "Tabbed widget container"
  },
  accordion: { 
    name: "Accordion", 
    icon: ChevronsUpDown, 
    category: "layout", 
    defaultSize: { w: 6, h: 4 },
    description: "Collapsible sections"
  },
};

interface BaseWidgetProps {
  config: WidgetConfig;
  value?: any;
  onChange?: (value: any) => void;
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
  const [isDragging, setIsDragging] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    setIsDragging(true);
    e.preventDefault();
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !joystickRef.current || isEditing) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2 - 16; // Account for knob size
    
    let x, y;
    if (distance <= maxDistance) {
      x = 50 + (deltaX / maxDistance) * 50;
      y = 50 + (deltaY / maxDistance) * 50;
    } else {
      const angle = Math.atan2(deltaY, deltaX);
      x = 50 + Math.cos(angle) * 50;
      y = 50 + Math.sin(angle) * 50;
    }
    
    const newPosition = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    setPosition(newPosition);
    
    if (onChange) {
      onChange({ x: newPosition.x - 50, y: newPosition.y - 50 });
    }
  }, [isDragging, isEditing, onChange]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (config.returnToCenter !== false) {
      setPosition({ x: 50, y: 50 });
      if (onChange) {
        onChange({ x: 0, y: 0 });
      }
    }
  }, [config.returnToCenter, onChange]);
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-3" data-testid={`widget-joystick-${config.id}`}>
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Joystick"}</span>
      <div 
        ref={joystickRef}
        className="relative w-24 h-24 rounded-full bg-muted border-2 select-none"
        onMouseDown={handleMouseDown}
      >
        <div
          className={`absolute w-8 h-8 rounded-full bg-primary -translate-x-1/2 -translate-y-1/2 transition-all duration-100 ${
            isEditing ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
          } ${isDragging ? 'scale-110 shadow-lg' : ''}`}
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground mt-1 font-mono">
        X: {Math.round(position.x - 50)} Y: {Math.round(position.y - 50)}
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

// Color Picker Widget
export function ColorPickerWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const colorValue = typeof value === "string" ? value : "#3b82f6";
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-3" data-testid={`widget-colorpicker-${config.id}`}>
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Color Picker"}</span>
      <div className="relative">
        <input
          type="color"
          value={colorValue}
          onChange={(e) => !isEditing && onChange?.(e.target.value)}
          disabled={isEditing}
          className="w-16 h-16 rounded-lg border-2 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="mt-2 text-xs text-center font-mono">{colorValue}</div>
      </div>
    </div>
  );
}

// LED Indicator Widget
export function LedIndicatorWidget({ config, value, isEditing }: BaseWidgetProps) {
  const isOn = typeof value === "boolean" ? value : false;
  const colorOn = config.color || "#10B981";
  const colorOff = "#6B7280";
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-2" data-testid={`widget-led-${config.id}`}>
      <div
        className="w-8 h-8 rounded-full border-2 shadow-inner transition-all duration-200"
        style={{
          backgroundColor: isOn ? colorOn : colorOff,
          boxShadow: isOn ? `0 0 10px ${colorOn}` : "inset 0 2px 4px rgba(0,0,0,0.2)",
        }}
      />
      <span className="text-xs text-muted-foreground mt-1">{config.label || "LED"}</span>
    </div>
  );
}

// Text Display Widget
export function TextDisplayWidget({ config, value, isEditing }: BaseWidgetProps) {
  const textValue = typeof value === "string" ? value : "No data";
  const lines = textValue.split('\n');
  const maxLines = config.maxDataPoints || 10;
  
  return (
    <div className="flex flex-col h-full p-2" data-testid={`widget-text-${config.id}`}>
      <span className="text-sm font-medium mb-1 px-1">{config.label || "Text Display"}</span>
      <div className="flex-1 overflow-auto bg-muted/50 rounded p-2 text-sm">
        {lines.slice(-maxLines).map((line, i) => (
          <div key={i} className="text-foreground whitespace-pre-wrap">{line}</div>
        ))}
      </div>
    </div>
  );
}

// Progress Bar Widget
export function ProgressBarWidget({ config, value, isEditing }: BaseWidgetProps) {
  const numValue = typeof value === "number" ? value : 0;
  const min = config.min || 0;
  const max = config.max || 100;
  const percentage = Math.max(0, Math.min(100, ((numValue - min) / (max - min)) * 100));
  
  return (
    <div className="flex flex-col justify-center h-full p-3 gap-2" data-testid={`widget-progress-${config.id}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{config.label || "Progress"}</span>
        <span className="text-muted-foreground">
          {config.unit ? `${numValue}${config.unit}` : `${Math.round(percentage)}%`}
        </span>
      </div>
      <Progress value={percentage} className="flex-1" />
    </div>
  );
}

// Line Chart Widget
export function LineChartWidget({ config, value, isEditing }: BaseWidgetProps) {
  const [dataPoints, setDataPoints] = useState<number[]>([]);
  
  useEffect(() => {
    if (typeof value === "number") {
      setDataPoints(prev => {
        const newPoints = [...prev, value];
        const maxPoints = config.maxDataPoints || 50;
        return newPoints.slice(-maxPoints);
      });
    }
  }, [value, config.maxDataPoints]);
  
  const maxValue = Math.max(...dataPoints, 1);
  const minValue = Math.min(...dataPoints, 0);
  const range = maxValue - minValue || 1;
  
  return (
    <div className="flex flex-col h-full p-3" data-testid={`widget-linechart-${config.id}`}>
      <span className="text-sm font-medium mb-2">{config.label || "Line Chart"}</span>
      <div className="flex-1 relative bg-muted/30 rounded">
        <svg className="w-full h-full" viewBox="0 0 400 200">
          {config.showGrid && (
            <g className="opacity-20">
              {[0, 1, 2, 3, 4].map(i => (
                <line key={i} x1="0" y1={i * 50} x2="400" y2={i * 50} stroke="currentColor" strokeWidth="1" />
              ))}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <line key={i} x1={i * 50} y1="0" x2={i * 50} y2="200" stroke="currentColor" strokeWidth="1" />
              ))}
            </g>
          )}
          {dataPoints.length > 1 && (
            <polyline
              fill="none"
              stroke={config.color || "#3b82f6"}
              strokeWidth="2"
              points={dataPoints.map((point, i) => {
                const x = (i / (dataPoints.length - 1)) * 400;
                const y = 200 - ((point - minValue) / range) * 200;
                return `${x},${y}`;
              }).join(" ")}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

// Bar Chart Widget
export function BarChartWidget({ config, value, isEditing }: BaseWidgetProps) {
  // Simple bar chart with sample data
  const bars = Array.isArray(value) ? value : [40, 65, 35, 80, 55, 70, 45];
  const maxValue = Math.max(...bars);
  
  return (
    <div className="flex flex-col h-full p-3" data-testid={`widget-barchart-${config.id}`}>
      <span className="text-sm font-medium mb-2">{config.label || "Bar Chart"}</span>
      <div className="flex-1 flex items-end gap-1">
        {bars.map((height, i) => (
          <div
            key={i}
            className="flex-1 rounded-t transition-all duration-300"
            style={{ 
              height: `${(height / maxValue) * 100}%`,
              backgroundColor: config.color || "#3b82f6"
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Scatter Plot Widget
export function ScatterPlotWidget({ config, value, isEditing }: BaseWidgetProps) {
  const points = Array.isArray(value) ? value : [
    {x: 10, y: 20}, {x: 30, y: 40}, {x: 50, y: 30}, {x: 70, y: 60}, {x: 90, y: 80}
  ];
  
  return (
    <div className="flex flex-col h-full p-3" data-testid={`widget-scatter-${config.id}`}>
      <span className="text-sm font-medium mb-2">{config.label || "Scatter Plot"}</span>
      <div className="flex-1 relative bg-muted/30 rounded">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={100 - point.y}
              r="2"
              fill={config.color || "#3b82f6"}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

// Heatmap Widget
export function HeatmapWidget({ config, value, isEditing }: BaseWidgetProps) {
  const rows = 8;
  const cols = 8;
  const data: number[] = Array.isArray(value) ? value : Array(rows * cols).fill(0).map(() => Math.random());
  
  return (
    <div className="flex flex-col h-full p-3" data-testid={`widget-heatmap-${config.id}`}>
      <span className="text-sm font-medium mb-2">{config.label || "Heatmap"}</span>
      <div className="flex-1 grid grid-cols-8 gap-1">
        {data.slice(0, rows * cols).map((val: number, i: number) => (
          <div
            key={i}
            className="aspect-square rounded-sm"
            style={{
              backgroundColor: `hsl(${240 - val * 120}, 70%, ${50 + val * 30}%)`
            }}
          />
        ))}
      </div>
    </div>
  );
}

// 3D Model Widget
export function ThreeDModelWidget({ config, value, isEditing }: BaseWidgetProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-3 bg-gray-900 rounded" data-testid={`widget-3d-${config.id}`}>
      <span className="text-sm font-medium mb-2 text-white">{config.label || "3D Model"}</span>
      <div className="flex-1 flex items-center justify-center">
        <Box className="h-16 w-16 text-gray-400" />
        <span className="text-xs text-gray-400 ml-2">3D View</span>
      </div>
    </div>
  );
}

// Video Stream Widget
export function VideoStreamWidget({ config, value, isEditing }: BaseWidgetProps) {
  return (
    <div className="flex flex-col h-full p-2" data-testid={`widget-video-${config.id}`}>
      <span className="text-sm font-medium mb-1 px-1">{config.label || "Video Stream"}</span>
      <div className="flex-1 bg-black rounded flex items-center justify-center">
        {config.streamUrl ? (
          <video
            src={config.streamUrl}
            controls={!isEditing}
            className="w-full h-full object-contain rounded"
            autoPlay={config.autoPlay}
            loop={config.loop}
          />
        ) : (
          <div className="text-white/60 text-center">
            <Video className="h-8 w-8 mx-auto mb-2" />
            <span className="text-xs">No stream</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Image Display Widget
export function ImageDisplayWidget({ config, value, isEditing }: BaseWidgetProps) {
  const imageUrl = typeof value === "string" ? value : config.imageUrl;
  
  return (
    <div className="flex flex-col h-full p-2" data-testid={`widget-image-${config.id}`}>
      <span className="text-sm font-medium mb-1 px-1">{config.label || "Image"}</span>
      <div className="flex-1 bg-muted/30 rounded flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={config.label || "Image"}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-muted-foreground text-center">
            <Image className="h-8 w-8 mx-auto mb-2" />
            <span className="text-xs">No image</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Audio Player Widget
export function AudioPlayerWidget({ config, value, isEditing }: BaseWidgetProps) {
  return (
    <div className="flex items-center h-full p-3 gap-3" data-testid={`widget-audio-${config.id}`}>
      <Music className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <span className="text-sm font-medium block">{config.label || "Audio Player"}</span>
        {config.audioUrl ? (
          <audio
            src={config.audioUrl}
            controls={!isEditing}
            className="w-full mt-1"
            autoPlay={config.autoPlay}
            loop={config.loop}
          />
        ) : (
          <span className="text-xs text-muted-foreground">No audio source</span>
        )}
      </div>
    </div>
  );
}

// Container Widget
export function ContainerWidget({ config, isEditing }: BaseWidgetProps) {
  return (
    <div 
      className="h-full p-4 rounded border-2 border-dashed border-muted-foreground/30" 
      data-testid={`widget-container-${config.id}`}
      style={{ 
        backgroundColor: config.backgroundColor || "transparent",
        padding: config.padding || 16
      }}
    >
      <span className="text-sm font-medium text-muted-foreground">{config.label || "Container"}</span>
      <div className="mt-2 text-xs text-muted-foreground">
        Drop widgets here to group them
      </div>
    </div>
  );
}

// Tabs Widget
export function TabsWidget({ config, isEditing }: BaseWidgetProps) {
  const tabs = [
    { name: "Tab 1", content: "Content 1" },
    { name: "Tab 2", content: "Content 2" }
  ];
  
  return (
    <div className="h-full p-2" data-testid={`widget-tabs-${config.id}`}>
      <span className="text-sm font-medium mb-2 block">{config.label || "Tabs"}</span>
      <TabsComponent defaultValue="tab1" className="h-full">
        <TabsList className="grid w-full grid-cols-2">
          {tabs.map((tab, i) => (
            <TabsTrigger key={i} value={`tab${i + 1}`}>{tab.name}</TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab, i) => (
          <TabsContent key={i} value={`tab${i + 1}`} className="mt-2 p-2 bg-muted/30 rounded">
            {tab.content}
          </TabsContent>
        ))}
      </TabsComponent>
    </div>
  );
}

// Accordion Widget
export function AccordionWidget({ config, isEditing }: BaseWidgetProps) {
  const sections = [
    { title: "Section 1", content: "Content for section 1" },
    { title: "Section 2", content: "Content for section 2" }
  ];
  
  return (
    <div className="h-full p-2" data-testid={`widget-accordion-${config.id}`}>
      <span className="text-sm font-medium mb-2 block">{config.label || "Accordion"}</span>
      <div className="space-y-2">
        {sections.map((section, i) => (
          <Collapsible key={i}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded text-sm">
              {section.title}
              <ChevronsUpDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="p-2 text-sm text-muted-foreground">
              {section.content}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}

export function renderWidget(config: WidgetConfig, value?: any, onChange?: (value: any) => void, isEditing?: boolean) {
  const props = { config, value, onChange, isEditing };
  
  switch (config.type) {
    // Control widgets
    case "button":
      return <ButtonWidget {...props} />;
    case "slider":
      return <SliderWidget {...props} />;
    case "toggle":
      return <ToggleWidget {...props} />;
    case "joystick":
      return <JoystickWidget {...props} />;
    case "dropdown":
      return <DropdownWidget {...props} />;
    case "colorPicker":
      return <ColorPickerWidget {...props} />;
    
    // Display widgets
    case "gauge":
      return <GaugeWidget {...props} />;
    case "valueDisplay":
      return <ValueDisplayWidget {...props} />;
    case "ledIndicator":
      return <LedIndicatorWidget {...props} />;
    case "textDisplay":
      return <TextDisplayWidget {...props} />;
    case "progressBar":
      return <ProgressBarWidget {...props} />;
    
    // Visualization widgets
    case "lineChart":
      return <LineChartWidget {...props} />;
    case "barChart":
      return <BarChartWidget {...props} />;
    case "scatterPlot":
      return <ScatterPlotWidget {...props} />;
    case "heatmap":
      return <HeatmapWidget {...props} />;
    case "3dModel":
      return <ThreeDModelWidget {...props} />;
    
    // Media widgets
    case "videoStream":
      return <VideoStreamWidget {...props} />;
    case "imageDisplay":
      return <ImageDisplayWidget {...props} />;
    case "audioPlayer":
      return <AudioPlayerWidget {...props} />;
    
    // Layout widgets
    case "container":
      return <ContainerWidget {...props} />;
    case "tabs":
      return <TabsWidget {...props} />;
    case "accordion":
      return <AccordionWidget {...props} />;
    
    default:
      return <div className="p-3 text-muted-foreground">Unknown widget: {config.type}</div>;
  }
}
