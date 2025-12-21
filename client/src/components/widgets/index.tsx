import { useState, useEffect, useRef, useCallback } from "react";
import {
  Power, ToggleLeft, Gauge, BarChart3, Type, Terminal, Sliders, MousePointer2,
  ChevronDown, Palette, Circle, AlignLeft, BarChart2, TrendingUp, BarChart,
  ScatterChart, Grid3x3, Box, Video, Image, Music, Square, Layers, ChevronsUpDown,
  Navigation, Cpu, Activity, Eye, Zap, Code2, Link2, Thermometer, Droplets,
  Wind, Sun, Cloud, Battery, BatteryCharging, Wifi, WifiOff, Signal, AlertTriangle,
  AlertCircle, Bell, Clock, Calendar, MapPin, Map, Lock, Unlock, Home, Lightbulb,
  Fan, Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, Camera, Mic,
  Settings, RefreshCw, Download, Upload, Database, Server, HardDrive, Monitor,
  Smartphone, Tablet, Watch, Car, Truck, Plane, Ship, Train, Bike, Footprints,
  Heart, HeartPulse, Stethoscope, Pill, Syringe, Leaf, Flower2, TreeDeciduous,
  Factory, Warehouse, Package, ShoppingCart, CreditCard, DollarSign, TrendingDown,
  ArrowUp, ArrowDown, ArrowRight, ArrowLeft, RotateCw, RotateCcw, Maximize2,
  Minimize2, Move, Grip, MoreHorizontal, MoreVertical, Menu, X, Check, Plus,
  Minus, Hash, Percent, Timer, Hourglass, Gauge as GaugeIcon, Compass, Target,
  Crosshair, Radio, Podcast, Rss, Share2, Globe, Network, Router, Plug, PlugZap,
  Flame, Snowflake, CloudRain, CloudSnow, CloudSun, Sunrise, Sunset, Moon,
  Star, Sparkles, Waves, Anchor, Shield, ShieldCheck, ShieldAlert, Key, Fingerprint,
  ScanLine, QrCode, Barcode, FileText, FileCode, Table, PieChart, LineChart,
  AreaChart, Activity as ActivityIcon, Layers as LayersIcon, Layout, LayoutGrid,
  LayoutList, List, ListOrdered, CheckSquare, Square as SquareIcon, CircleDot,
  Disc, Loader2, AlertOctagon, Info, HelpCircle, MessageSquare, Send, Mail,
  Phone, PhoneCall, Video as VideoIcon, Users, User, UserCheck, Building,
  Building2, Store, Briefcase, Wrench, Hammer, Scissors, Ruler, Scale,
  Beaker, FlaskConical, Microscope, Atom, Dna, Brain, Bot, Cpu as CpuIcon,
  CircuitBoard, Binary, Code, Terminal as TerminalIcon, Command, Hash as HashIcon,
  Columns2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs as TabsComponent, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WidgetConfig, WidgetType } from "@shared/schema";

// Widget category type
type WidgetCategory = "control" | "display" | "visualization" | "media" | "layout" | "device" | "status" | "environmental" | "energy" | "industrial" | "smartHome" | "data" | "ai" | "system" | "map";

export const widgetDefinitions: Record<WidgetType, {
  name: string;
  icon: typeof Power;
  category: WidgetCategory;
  defaultSize: { w: number; h: number };
  description: string;
}> = {
  // ==================== CONTROL WIDGETS ====================
  button: { name: "Button", icon: Power, category: "control", defaultSize: { w: 2, h: 1 }, description: "Push button for actions" },
  slider: { name: "Slider", icon: Sliders, category: "control", defaultSize: { w: 3, h: 1 }, description: "Range slider for numeric control" },
  toggle: { name: "Toggle Switch", icon: ToggleLeft, category: "control", defaultSize: { w: 2, h: 1 }, description: "On/off switch" },
  joystick: { name: "Joystick", icon: Navigation, category: "control", defaultSize: { w: 3, h: 3 }, description: "2D directional control" },
  dropdown: { name: "Dropdown Menu", icon: ChevronDown, category: "control", defaultSize: { w: 3, h: 1 }, description: "Selection from list" },
  colorPicker: { name: "Color Picker", icon: Palette, category: "control", defaultSize: { w: 2, h: 2 }, description: "RGB color selection" },
  buttonGroup: { name: "Button Group", icon: LayoutGrid, category: "control", defaultSize: { w: 4, h: 1 }, description: "Group of related buttons" },
  rangeSlider: { name: "Range Slider", icon: Sliders, category: "control", defaultSize: { w: 4, h: 1 }, description: "Two-handle min/max slider" },
  radioGroup: { name: "Radio Group", icon: CircleDot, category: "control", defaultSize: { w: 3, h: 2 }, description: "Mutually exclusive options" },
  textInput: { name: "Text Input", icon: Type, category: "control", defaultSize: { w: 3, h: 1 }, description: "Text/number input field" },
  dateTimePicker: { name: "Date/Time Picker", icon: Calendar, category: "control", defaultSize: { w: 3, h: 1 }, description: "Date/time selection" },

  // ==================== DISPLAY WIDGETS ====================
  gauge: { name: "Gauge", icon: Gauge, category: "display", defaultSize: { w: 3, h: 3 }, description: "Circular gauge with needle" },
  valueDisplay: { name: "Value Display", icon: Type, category: "display", defaultSize: { w: 2, h: 1 }, description: "Large numeric display" },
  ledIndicator: { name: "LED Indicator", icon: Circle, category: "display", defaultSize: { w: 1, h: 1 }, description: "Status indicator light" },
  textDisplay: { name: "Text Display", icon: AlignLeft, category: "display", defaultSize: { w: 4, h: 2 }, description: "Multi-line text output" },
  progressBar: { name: "Progress Bar", icon: BarChart2, category: "display", defaultSize: { w: 4, h: 1 }, description: "Linear progress indicator" },
  sparklineNumber: { name: "Sparkline Number", icon: TrendingUp, category: "display", defaultSize: { w: 3, h: 2 }, description: "Number with tiny trend line" },
  deltaIndicator: { name: "Delta Indicator", icon: ArrowUp, category: "display", defaultSize: { w: 2, h: 1 }, description: "Shows change from previous value" },
  semicircularGauge: { name: "Semicircular Gauge", icon: Gauge, category: "display", defaultSize: { w: 3, h: 2 }, description: "180-degree gauge" },
  speedometer: { name: "Speedometer", icon: Gauge, category: "display", defaultSize: { w: 4, h: 4 }, description: "Car-style speedometer" },
  thermometer: { name: "Thermometer", icon: Thermometer, category: "display", defaultSize: { w: 2, h: 4 }, description: "Vertical temperature gauge" },
  tankGauge: { name: "Tank Gauge", icon: Droplets, category: "display", defaultSize: { w: 2, h: 4 }, description: "Fill level visualization" },
  batteryIndicator: { name: "Battery Indicator", icon: Battery, category: "display", defaultSize: { w: 2, h: 1 }, description: "Battery level visualization" },
  signalStrength: { name: "Signal Strength", icon: Signal, category: "display", defaultSize: { w: 2, h: 1 }, description: "WiFi/cellular signal bars" },

  // ==================== VISUALIZATION WIDGETS ====================
  lineChart: { name: "Line Chart", icon: TrendingUp, category: "visualization", defaultSize: { w: 6, h: 4 }, description: "Time-series line graph" },
  barChart: { name: "Bar Chart", icon: BarChart, category: "visualization", defaultSize: { w: 6, h: 4 }, description: "Categorical bar graph" },
  scatterPlot: { name: "Scatter Plot", icon: ScatterChart, category: "visualization", defaultSize: { w: 6, h: 4 }, description: "XY scatter plot" },
  heatmap: { name: "Heatmap", icon: Grid3x3, category: "visualization", defaultSize: { w: 6, h: 4 }, description: "2D color-coded grid" },
  "3dModel": { name: "3D Model", icon: Box, category: "visualization", defaultSize: { w: 6, h: 6 }, description: "Three.js 3D visualization" },
  areaChart: { name: "Area Chart", icon: AreaChart, category: "visualization", defaultSize: { w: 6, h: 4 }, description: "Filled area under line" },
  radarChart: { name: "Radar Chart", icon: Target, category: "visualization", defaultSize: { w: 4, h: 4 }, description: "Spider web chart" },
  pieChart: { name: "Pie Chart", icon: PieChart, category: "visualization", defaultSize: { w: 4, h: 4 }, description: "Circular proportion chart" },
  donutChart: { name: "Donut Chart", icon: Disc, category: "visualization", defaultSize: { w: 4, h: 4 }, description: "Ring-shaped pie chart" },
  treeMap: { name: "Tree Map", icon: LayoutGrid, category: "visualization", defaultSize: { w: 6, h: 4 }, description: "Hierarchical nested rectangles" },

  // ==================== STATUS & ALERT WIDGETS ====================
  statusLight: { name: "Status Light", icon: Circle, category: "status", defaultSize: { w: 1, h: 1 }, description: "Color-coded status indicator" },
  alertBanner: { name: "Alert Banner", icon: AlertTriangle, category: "status", defaultSize: { w: 6, h: 1 }, description: "Top-of-screen alert" },
  alertList: { name: "Alert List", icon: Bell, category: "status", defaultSize: { w: 4, h: 4 }, description: "List of active alerts" },
  thresholdIndicator: { name: "Threshold Indicator", icon: AlertCircle, category: "status", defaultSize: { w: 2, h: 1 }, description: "High/medium/low indicators" },
  trendArrow: { name: "Trend Arrow", icon: TrendingUp, category: "status", defaultSize: { w: 1, h: 1 }, description: "Up/down/stable arrow" },

  // ==================== ENVIRONMENTAL WIDGETS ====================
  weatherStation: { name: "Weather Station", icon: Cloud, category: "environmental", defaultSize: { w: 4, h: 3 }, description: "Multi-weather parameter display" },
  temperatureCard: { name: "Temperature Card", icon: Thermometer, category: "environmental", defaultSize: { w: 3, h: 2 }, description: "Current temperature with trend" },
  humidityDisplay: { name: "Humidity Display", icon: Droplets, category: "environmental", defaultSize: { w: 3, h: 2 }, description: "Humidity with comfort zone" },
  airQualityIndex: { name: "Air Quality Index", icon: Wind, category: "environmental", defaultSize: { w: 3, h: 2 }, description: "AQI with health recommendations" },
  co2Monitor: { name: "CO2 Monitor", icon: Cloud, category: "environmental", defaultSize: { w: 3, h: 2 }, description: "Carbon dioxide levels" },
  lightLevel: { name: "Light Level", icon: Sun, category: "environmental", defaultSize: { w: 2, h: 2 }, description: "Lux/lumen measurement" },
  soundLevel: { name: "Sound Level", icon: Volume2, category: "environmental", defaultSize: { w: 2, h: 2 }, description: "Decibel meter" },
  windDirection: { name: "Wind Direction", icon: Compass, category: "environmental", defaultSize: { w: 3, h: 3 }, description: "Wind rose or arrow" },

  // ==================== ENERGY WIDGETS ====================
  powerMeter: { name: "Power Meter", icon: Zap, category: "energy", defaultSize: { w: 3, h: 2 }, description: "Real-time power consumption" },
  energyUsage: { name: "Energy Usage", icon: BarChart, category: "energy", defaultSize: { w: 6, h: 3 }, description: "kWh usage over time" },
  solarProduction: { name: "Solar Production", icon: Sun, category: "energy", defaultSize: { w: 3, h: 2 }, description: "Solar panel output" },
  batteryLevel: { name: "Battery Level", icon: BatteryCharging, category: "energy", defaultSize: { w: 3, h: 2 }, description: "Battery state of charge" },
  costCalculator: { name: "Cost Calculator", icon: DollarSign, category: "energy", defaultSize: { w: 3, h: 2 }, description: "Real-time cost display" },

  // ==================== INDUSTRIAL WIDGETS ====================
  flowMeter: { name: "Flow Meter", icon: Waves, category: "industrial", defaultSize: { w: 3, h: 2 }, description: "Liquid/gas flow rate" },
  levelIndicator: { name: "Level Indicator", icon: Droplets, category: "industrial", defaultSize: { w: 2, h: 4 }, description: "Tank/silo level" },
  valvePosition: { name: "Valve Position", icon: Settings, category: "industrial", defaultSize: { w: 2, h: 2 }, description: "Valve open/close status" },
  motorStatus: { name: "Motor Status", icon: RotateCw, category: "industrial", defaultSize: { w: 3, h: 2 }, description: "Motor RPM, torque" },
  vibrationMonitor: { name: "Vibration Monitor", icon: Activity, category: "industrial", defaultSize: { w: 4, h: 3 }, description: "Vibration frequency analysis" },
  pressureGauge: { name: "Pressure Gauge", icon: Gauge, category: "industrial", defaultSize: { w: 3, h: 3 }, description: "Multi-zone pressure" },
  oeeCalculator: { name: "OEE Calculator", icon: Target, category: "industrial", defaultSize: { w: 4, h: 3 }, description: "Overall Equipment Effectiveness" },
  emergencyStop: { name: "Emergency Stop", icon: AlertOctagon, category: "industrial", defaultSize: { w: 2, h: 2 }, description: "E-stop status indicator" },

  // ==================== SMART HOME WIDGETS ====================
  thermostatControl: { name: "Thermostat Control", icon: Thermometer, category: "smartHome", defaultSize: { w: 4, h: 4 }, description: "Temperature setpoint" },
  blindController: { name: "Blind Controller", icon: Layers, category: "smartHome", defaultSize: { w: 3, h: 2 }, description: "Window covering control" },
  doorLock: { name: "Door Lock", icon: Lock, category: "smartHome", defaultSize: { w: 2, h: 2 }, description: "Lock/unlock status and control" },
  securityPanel: { name: "Security Panel", icon: Shield, category: "smartHome", defaultSize: { w: 4, h: 3 }, description: "Arm/disarm system" },
  sceneController: { name: "Scene Controller", icon: Sparkles, category: "smartHome", defaultSize: { w: 4, h: 2 }, description: "Pre-set scene activation" },

  // ==================== MEDIA WIDGETS ====================
  videoStream: { name: "Video Stream", icon: Video, category: "media", defaultSize: { w: 6, h: 4 }, description: "Live video feed" },
  imageDisplay: { name: "Image Display", icon: Image, category: "media", defaultSize: { w: 4, h: 4 }, description: "Static or updated image" },
  audioPlayer: { name: "Audio Player", icon: Music, category: "media", defaultSize: { w: 4, h: 1 }, description: "Audio playback control" },
  cameraGrid: { name: "Camera Grid", icon: LayoutGrid, category: "media", defaultSize: { w: 8, h: 6 }, description: "Multiple camera feeds" },
  imageGallery: { name: "Image Gallery", icon: Image, category: "media", defaultSize: { w: 6, h: 4 }, description: "Scrollable image collection" },

  // ==================== DATA WIDGETS ====================
  dataTable: { name: "Data Table", icon: Table, category: "data", defaultSize: { w: 8, h: 4 }, description: "Sortable, filterable table" },
  kpiCard: { name: "KPI Card", icon: Target, category: "data", defaultSize: { w: 3, h: 2 }, description: "Single KPI with target" },
  statisticsCard: { name: "Statistics Card", icon: BarChart3, category: "data", defaultSize: { w: 4, h: 2 }, description: "Min, max, mean, median" },
  eventTimeline: { name: "Event Timeline", icon: Clock, category: "data", defaultSize: { w: 4, h: 4 }, description: "Chronological event display" },
  logViewer: { name: "Log Viewer", icon: Terminal, category: "data", defaultSize: { w: 6, h: 4 }, description: "Scrollable log display" },

  // ==================== AI WIDGETS ====================
  forecastDisplay: { name: "Forecast Display", icon: TrendingUp, category: "ai", defaultSize: { w: 6, h: 3 }, description: "Future value predictions" },
  anomalyIndicator: { name: "Anomaly Indicator", icon: AlertTriangle, category: "ai", defaultSize: { w: 3, h: 2 }, description: "Statistical anomaly detection" },
  insightCard: { name: "Insight Card", icon: Sparkles, category: "ai", defaultSize: { w: 4, h: 2 }, description: "AI-generated insight" },
  predictionChart: { name: "Prediction Chart", icon: LineChart, category: "ai", defaultSize: { w: 6, h: 4 }, description: "Prediction with confidence" },

  // ==================== SYSTEM WIDGETS ====================
  resourceMonitor: { name: "Resource Monitor", icon: Monitor, category: "system", defaultSize: { w: 4, h: 3 }, description: "CPU, memory, storage" },
  networkTopology: { name: "Network Topology", icon: Network, category: "system", defaultSize: { w: 6, h: 4 }, description: "Device connection map" },
  uptimeDisplay: { name: "Uptime Display", icon: Clock, category: "system", defaultSize: { w: 2, h: 1 }, description: "Time since last restart" },
  latencyDisplay: { name: "Latency Display", icon: Activity, category: "system", defaultSize: { w: 3, h: 2 }, description: "Response times" },

  // ==================== LAYOUT WIDGETS ====================
  container: { name: "Container", icon: Square, category: "layout", defaultSize: { w: 6, h: 4 }, description: "Group widgets together" },
  tabs: { name: "Tab Container", icon: Layers, category: "layout", defaultSize: { w: 8, h: 6 }, description: "Tabbed widget container" },
  accordion: { name: "Accordion", icon: ChevronsUpDown, category: "layout", defaultSize: { w: 6, h: 4 }, description: "Collapsible sections" },
  carousel: { name: "Carousel", icon: RotateCw, category: "layout", defaultSize: { w: 6, h: 4 }, description: "Rotating widget display" },
  splitPanel: { name: "Split Panel", icon: Columns2, category: "layout", defaultSize: { w: 8, h: 4 }, description: "Resizable split views" },

  // ==================== DEVICE WIDGETS ====================
  deviceStatus: { name: "Device Status", icon: Cpu, category: "device", defaultSize: { w: 4, h: 2 }, description: "Show linked device status" },
  gpioControl: { name: "GPIO Control", icon: Zap, category: "device", defaultSize: { w: 4, h: 3 }, description: "Control GPIO pins directly" },
  sensorMonitor: { name: "Sensor Monitor", icon: Activity, category: "device", defaultSize: { w: 4, h: 3 }, description: "Monitor sensor values" },
  variableWatch: { name: "Variable Watch", icon: Eye, category: "device", defaultSize: { w: 3, h: 2 }, description: "Watch code variables" },
  functionTrigger: { name: "Function Trigger", icon: Zap, category: "device", defaultSize: { w: 3, h: 2 }, description: "Trigger code functions" },
  codeSnippet: { name: "Code Snippet", icon: Code2, category: "device", defaultSize: { w: 6, h: 4 }, description: "Display linked code" },

  // ==================== MAP WIDGETS ====================
  deviceMap: { name: "Device Map", icon: Map, category: "map", defaultSize: { w: 6, h: 4 }, description: "Devices plotted on map" },
  gpsCoordinates: { name: "GPS Coordinates", icon: MapPin, category: "map", defaultSize: { w: 3, h: 2 }, description: "Lat/long display" },
};

interface BaseWidgetProps {
  config: WidgetConfig;
  value?: any;
  onChange?: (value: any) => void;
  isEditing?: boolean;
}


// ==================== CONTROL WIDGET COMPONENTS ====================

export function ButtonWidget({ config, onChange, isEditing }: BaseWidgetProps) {
  return (
    <div className="flex items-center justify-center h-full p-2">
      <Button className="w-full h-full min-h-10" variant="default" onClick={() => !isEditing && onChange?.(true)} disabled={isEditing}>
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
        <span className="text-muted-foreground">{numValue}{config.unit || ""}</span>
      </div>
      <Slider value={[numValue]} min={config.min || 0} max={config.max || 100} step={config.step || 1} onValueChange={([v]) => !isEditing && onChange?.(v)} disabled={isEditing} className="flex-1" />
    </div>
  );
}

export function ToggleWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const boolValue = typeof value === "boolean" ? value : false;
  return (
    <div className="flex items-center justify-between h-full p-3">
      <span className="font-medium text-sm">{config.label || "Toggle"}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{boolValue ? "ON" : "OFF"}</span>
        <Switch checked={boolValue} onCheckedChange={(checked) => !isEditing && onChange?.(checked)} disabled={isEditing} />
      </div>
    </div>
  );
}

export function JoystickWidget({ config, onChange, isEditing }: BaseWidgetProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !joystickRef.current || isEditing) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2 - 16;
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
    onChange?.({ x: newPosition.x - 50, y: newPosition.y - 50 });
  }, [isDragging, isEditing, onChange]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (config.returnToCenter !== false) {
      setPosition({ x: 50, y: 50 });
      onChange?.({ x: 0, y: 0 });
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
    <div className="flex flex-col items-center justify-center h-full p-3">
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Joystick"}</span>
      <div ref={joystickRef} className="relative w-24 h-24 rounded-full bg-muted border-2 select-none" onMouseDown={() => !isEditing && setIsDragging(true)}>
        <div className={`absolute w-8 h-8 rounded-full bg-primary -translate-x-1/2 -translate-y-1/2 transition-all duration-100 ${isEditing ? 'cursor-not-allowed' : 'cursor-grab'}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} />
      </div>
      <span className="text-xs text-muted-foreground mt-1 font-mono">X: {Math.round(position.x - 50)} Y: {Math.round(position.y - 50)}</span>
    </div>
  );
}

export function DropdownWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const options = config.options || ["Option 1", "Option 2", "Option 3"];
  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <span className="text-sm font-medium">{config.label || "Dropdown"}</span>
      <Select value={String(value || "")} onValueChange={(v) => !isEditing && onChange?.(v)} disabled={isEditing}>
        <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
        <SelectContent>
          {options.map((opt: string, i: number) => <SelectItem key={i} value={opt}>{opt}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ColorPickerWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const colorValue = typeof value === "string" ? value : "#3b82f6";
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Color Picker"}</span>
      <input type="color" value={colorValue} onChange={(e) => !isEditing && onChange?.(e.target.value)} disabled={isEditing} className="w-16 h-16 rounded-lg border-2 cursor-pointer disabled:cursor-not-allowed" />
      <div className="mt-2 text-xs font-mono">{colorValue}</div>
    </div>
  );
}

export function ButtonGroupWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const options = config.options || ["A", "B", "C"];
  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <span className="text-sm font-medium">{config.label || "Button Group"}</span>
      <div className="flex gap-1 flex-1">
        {options.map((opt: string, i: number) => (
          <Button key={i} variant={value === opt ? "default" : "outline"} size="sm" className="flex-1" onClick={() => !isEditing && onChange?.(opt)} disabled={isEditing}>{opt}</Button>
        ))}
      </div>
    </div>
  );
}

export function RangeSliderWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const rangeValue = Array.isArray(value) ? value : [config.min || 0, config.max || 100];
  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{config.label || "Range"}</span>
        <span className="text-muted-foreground">{rangeValue[0]} - {rangeValue[1]}{config.unit || ""}</span>
      </div>
      <Slider value={rangeValue} min={config.min || 0} max={config.max || 100} step={config.step || 1} onValueChange={(v) => !isEditing && onChange?.(v)} disabled={isEditing} />
    </div>
  );
}

export function RadioGroupWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const options = config.options || ["Option 1", "Option 2", "Option 3"];
  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <span className="text-sm font-medium">{config.label || "Radio Group"}</span>
      <div className="space-y-1">
        {options.map((opt: string, i: number) => (
          <label key={i} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={value === opt} onChange={() => !isEditing && onChange?.(opt)} disabled={isEditing} className="w-4 h-4" />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function TextInputWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <span className="text-sm font-medium">{config.label || "Input"}</span>
      <Input value={String(value || "")} onChange={(e) => !isEditing && onChange?.(e.target.value)} disabled={isEditing} placeholder="Enter value..." />
    </div>
  );
}

export function DateTimePickerWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <span className="text-sm font-medium">{config.label || "Date/Time"}</span>
      <Input type="datetime-local" value={String(value || "")} onChange={(e) => !isEditing && onChange?.(e.target.value)} disabled={isEditing} />
    </div>
  );
}


// ==================== DISPLAY WIDGET COMPONENTS ====================

export function GaugeWidget({ config, value }: BaseWidgetProps) {
  const numValue = typeof value === "number" ? value : 0;
  const min = config.min || 0;
  const max = config.max || 100;
  const percentage = ((numValue - min) / (max - min)) * 100;
  const getColor = () => percentage < 33 ? "text-green-500" : percentage < 66 ? "text-yellow-500" : "text-red-500";
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Gauge"}</span>
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${percentage * 2.51} 251`} className={getColor()} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{Math.round(numValue)}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground mt-1">{config.unit || ""}</span>
    </div>
  );
}

export function ValueDisplayWidget({ config, value }: BaseWidgetProps) {
  const displayValue = value !== undefined ? String(value) : "--";
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <span className="text-xs text-muted-foreground">{config.label || "Value"}</span>
      <span className="text-3xl font-bold">{displayValue}</span>
      {config.unit && <span className="text-sm text-muted-foreground">{config.unit}</span>}
    </div>
  );
}

export function LedIndicatorWidget({ config, value }: BaseWidgetProps) {
  const isOn = typeof value === "boolean" ? value : false;
  const colorOn = config.color || "#10B981";
  return (
    <div className="flex flex-col items-center justify-center h-full p-2">
      <div className="w-8 h-8 rounded-full border-2 shadow-inner transition-all duration-200" style={{ backgroundColor: isOn ? colorOn : "#6B7280", boxShadow: isOn ? `0 0 10px ${colorOn}` : "inset 0 2px 4px rgba(0,0,0,0.2)" }} />
      <span className="text-xs text-muted-foreground mt-1">{config.label || "LED"}</span>
    </div>
  );
}

export function TextDisplayWidget({ config, value }: BaseWidgetProps) {
  const textValue = typeof value === "string" ? value : "No data";
  return (
    <div className="flex flex-col h-full p-2">
      <span className="text-sm font-medium mb-1 px-1">{config.label || "Text Display"}</span>
      <div className="flex-1 overflow-auto bg-muted/50 rounded p-2 text-sm whitespace-pre-wrap">{textValue}</div>
    </div>
  );
}

export function ProgressBarWidget({ config, value }: BaseWidgetProps) {
  const numValue = typeof value === "number" ? value : 0;
  const min = config.min || 0;
  const max = config.max || 100;
  const percentage = Math.max(0, Math.min(100, ((numValue - min) / (max - min)) * 100));
  return (
    <div className="flex flex-col justify-center h-full p-3 gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{config.label || "Progress"}</span>
        <span className="text-muted-foreground">{config.unit ? `${numValue}${config.unit}` : `${Math.round(percentage)}%`}</span>
      </div>
      <Progress value={percentage} />
    </div>
  );
}

export function SparklineNumberWidget({ config, value }: BaseWidgetProps) {
  const numValue = typeof value === "number" ? value : 0;
  const history = Array.isArray(config.history) ? config.history : [30, 45, 35, 50, 40, 55, numValue];
  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = max - min || 1;
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-xs text-muted-foreground">{config.label || "Value"}</span>
      <span className="text-2xl font-bold">{numValue}{config.unit || ""}</span>
      <svg className="w-full h-8 mt-1" viewBox="0 0 100 30">
        <polyline fill="none" stroke={config.color || "#3b82f6"} strokeWidth="2" points={history.map((v: number, i: number) => `${(i / (history.length - 1)) * 100},${30 - ((v - min) / range) * 28}`).join(" ")} />
      </svg>
    </div>
  );
}

export function DeltaIndicatorWidget({ config, value }: BaseWidgetProps) {
  const numValue = typeof value === "number" ? value : 0;
  const previousValue = config.previousValue || 0;
  const delta = numValue - previousValue;
  const isPositive = delta >= 0;
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div>
        <span className="text-xs text-muted-foreground">{config.label || "Delta"}</span>
        <div className="text-xl font-bold">{numValue}{config.unit || ""}</div>
      </div>
      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        <span className="font-medium">{Math.abs(delta).toFixed(1)}</span>
      </div>
    </div>
  );
}

export function SemicircularGaugeWidget({ config, value }: BaseWidgetProps) {
  const numValue = typeof value === "number" ? value : 0;
  const min = config.min || 0;
  const max = config.max || 100;
  const percentage = ((numValue - min) / (max - min)) * 100;
  const angle = (percentage / 100) * 180;
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <span className="text-xs text-muted-foreground mb-1">{config.label || "Gauge"}</span>
      <div className="relative w-32 h-16 overflow-hidden">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" strokeLinecap="round" />
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={config.color || "#3b82f6"} strokeWidth="8" strokeDasharray={`${(angle / 180) * 125.6} 125.6`} strokeLinecap="round" />
        </svg>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <span className="text-lg font-bold">{Math.round(numValue)}</span>
          <span className="text-xs text-muted-foreground ml-1">{config.unit || ""}</span>
        </div>
      </div>
    </div>
  );
}

export function SpeedometerWidget({ config, value }: BaseWidgetProps) {
  const numValue = typeof value === "number" ? value : 0;
  const min = config.min || 0;
  const max = config.max || 200;
  const percentage = ((numValue - min) / (max - min)) * 100;
  const angle = -135 + (percentage / 100) * 270;
  return (
    <div className="flex flex-col items-center justify-center h-full p-3 bg-gray-900 rounded-lg">
      <span className="text-xs text-gray-400 mb-1">{config.label || "Speed"}</span>
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#374151" strokeWidth="3" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270].map((deg, i) => (
            <line key={i} x1="50" y1="10" x2="50" y2="15" stroke="#6B7280" strokeWidth="2" transform={`rotate(${deg - 135} 50 50)`} />
          ))}
          <line x1="50" y1="50" x2="50" y2="20" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" transform={`rotate(${angle} 50 50)`} />
          <circle cx="50" cy="50" r="5" fill="#EF4444" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pt-8">
          <span className="text-2xl font-bold text-white">{Math.round(numValue)}</span>
        </div>
      </div>
      <span className="text-xs text-gray-400">{config.unit || "km/h"}</span>
    </div>
  );
}

export function ThermometerWidget({ config, value }: BaseWidgetProps) {
  const numValue = typeof value === "number" ? value : 20;
  const min = config.min || -20;
  const max = config.max || 50;
  const percentage = Math.max(0, Math.min(100, ((numValue - min) / (max - min)) * 100));
  const getColor = () => numValue < 10 ? "#3B82F6" : numValue < 30 ? "#10B981" : "#EF4444";
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Temperature"}</span>
      <div className="relative w-8 h-32 bg-muted rounded-full overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-b-full" style={{ height: `${percentage}%`, backgroundColor: getColor() }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full" style={{ backgroundColor: getColor() }} />
      </div>
      <span className="text-lg font-bold mt-2">{numValue}°{config.unit || "C"}</span>
    </div>
  );
}

export function TankGaugeWidget({ config, value }: BaseWidgetProps) {
  const numValue = typeof value === "number" ? value : 50;
  const percentage = Math.max(0, Math.min(100, numValue));
  const getColor = () => percentage < 20 ? "#EF4444" : percentage < 50 ? "#F59E0B" : "#10B981";
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Tank Level"}</span>
      <div className="relative w-16 h-32 border-2 border-muted rounded-lg overflow-hidden bg-muted/30">
        <div className="absolute bottom-0 left-0 right-0 transition-all duration-500" style={{ height: `${percentage}%`, backgroundColor: getColor() }}>
          <div className="absolute top-0 left-0 right-0 h-2 bg-white/20 animate-pulse" />
        </div>
        {[25, 50, 75].map(level => (
          <div key={level} className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/30" style={{ bottom: `${level}%` }}>
            <span className="absolute -right-6 -top-2 text-[10px] text-muted-foreground">{level}%</span>
          </div>
        ))}
      </div>
      <span className="text-lg font-bold mt-2">{percentage}%</span>
    </div>
  );
}

export function BatteryIndicatorWidget({ config, value }: BaseWidgetProps) {
  const percentage = typeof value === "number" ? Math.max(0, Math.min(100, value)) : 75;
  const getColor = () => percentage < 20 ? "bg-red-500" : percentage < 50 ? "bg-yellow-500" : "bg-green-500";
  const isCharging = config.charging || false;
  return (
    <div className="flex items-center justify-center h-full p-3 gap-2">
      <div className="relative flex items-center">
        <div className="w-12 h-6 border-2 border-current rounded-sm relative overflow-hidden">
          <div className={`absolute left-0 top-0 bottom-0 transition-all ${getColor()}`} style={{ width: `${percentage}%` }} />
        </div>
        <div className="w-1 h-3 bg-current rounded-r-sm" />
        {isCharging && <Zap className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-white" />}
      </div>
      <span className="text-sm font-medium">{percentage}%</span>
    </div>
  );
}

export function SignalStrengthWidget({ config, value }: BaseWidgetProps) {
  const strength = typeof value === "number" ? Math.max(0, Math.min(4, Math.round(value / 25))) : 3;
  return (
    <div className="flex items-center justify-center h-full p-3 gap-2">
      <div className="flex items-end gap-0.5 h-6">
        {[1, 2, 3, 4].map(bar => (
          <div key={bar} className={`w-2 rounded-sm transition-colors ${bar <= strength ? 'bg-green-500' : 'bg-muted'}`} style={{ height: `${bar * 25}%` }} />
        ))}
      </div>
      <span className="text-sm font-medium">{config.label || "Signal"}</span>
    </div>
  );
}


// ==================== VISUALIZATION WIDGET COMPONENTS ====================

export function LineChartWidget({ config, value }: BaseWidgetProps) {
  const [dataPoints, setDataPoints] = useState<number[]>([]);
  useEffect(() => {
    if (typeof value === "number") {
      setDataPoints(prev => [...prev.slice(-(config.maxDataPoints || 50) + 1), value]);
    }
  }, [value, config.maxDataPoints]);
  const maxValue = Math.max(...dataPoints, 1);
  const minValue = Math.min(...dataPoints, 0);
  const range = maxValue - minValue || 1;
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Line Chart"}</span>
      <div className="flex-1 relative bg-muted/30 rounded">
        <svg className="w-full h-full" viewBox="0 0 400 200">
          {config.showGrid && <g className="opacity-20">{[0,1,2,3,4].map(i => <line key={i} x1="0" y1={i*50} x2="400" y2={i*50} stroke="currentColor" />)}</g>}
          {dataPoints.length > 1 && <polyline fill="none" stroke={config.color || "#3b82f6"} strokeWidth="2" points={dataPoints.map((p, i) => `${(i / (dataPoints.length - 1)) * 400},${200 - ((p - minValue) / range) * 200}`).join(" ")} />}
        </svg>
      </div>
    </div>
  );
}

export function BarChartWidget({ config, value }: BaseWidgetProps) {
  const bars = Array.isArray(value) ? value : [40, 65, 35, 80, 55, 70, 45];
  const maxValue = Math.max(...bars);
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Bar Chart"}</span>
      <div className="flex-1 flex items-end gap-1">
        {bars.map((height: number, i: number) => (
          <div key={i} className="flex-1 rounded-t transition-all duration-300" style={{ height: `${(height / maxValue) * 100}%`, backgroundColor: config.color || "#3b82f6" }} />
        ))}
      </div>
    </div>
  );
}

export function ScatterPlotWidget({ config, value }: BaseWidgetProps) {
  const points = Array.isArray(value) ? value : [{x:10,y:20},{x:30,y:40},{x:50,y:30},{x:70,y:60},{x:90,y:80}];
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Scatter Plot"}</span>
      <div className="flex-1 relative bg-muted/30 rounded">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {points.map((point: any, i: number) => <circle key={i} cx={point.x} cy={100 - point.y} r="3" fill={config.color || "#3b82f6"} />)}
        </svg>
      </div>
    </div>
  );
}

export function HeatmapWidget({ config, value }: BaseWidgetProps) {
  const data: number[] = Array.isArray(value) ? value : Array(64).fill(0).map(() => Math.random());
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Heatmap"}</span>
      <div className="flex-1 grid grid-cols-8 gap-1">
        {data.slice(0, 64).map((val: number, i: number) => (
          <div key={i} className="aspect-square rounded-sm" style={{ backgroundColor: `hsl(${240 - val * 120}, 70%, ${50 + val * 30}%)` }} />
        ))}
      </div>
    </div>
  );
}

export function ThreeDModelWidget({ config }: BaseWidgetProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-3 bg-gray-900 rounded">
      <span className="text-sm font-medium mb-2 text-white">{config.label || "3D Model"}</span>
      <div className="flex-1 flex items-center justify-center">
        <Box className="h-16 w-16 text-gray-400" />
        <span className="text-xs text-gray-400 ml-2">3D View</span>
      </div>
    </div>
  );
}

export function AreaChartWidget({ config, value }: BaseWidgetProps) {
  const data = Array.isArray(value) ? value : [20, 40, 30, 50, 45, 60, 55, 70];
  const max = Math.max(...data);
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Area Chart"}</span>
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.color || "#3b82f6"} stopOpacity="0.5" />
              <stop offset="100%" stopColor={config.color || "#3b82f6"} stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path d={`M 0 50 ${data.map((v: number, i: number) => `L ${(i / (data.length - 1)) * 100} ${50 - (v / max) * 45}`).join(" ")} L 100 50 Z`} fill="url(#areaGradient)" />
          <polyline fill="none" stroke={config.color || "#3b82f6"} strokeWidth="2" points={data.map((v: number, i: number) => `${(i / (data.length - 1)) * 100},${50 - (v / max) * 45}`).join(" ")} />
        </svg>
      </div>
    </div>
  );
}

export function RadarChartWidget({ config, value }: BaseWidgetProps) {
  const data = Array.isArray(value) ? value : [80, 65, 90, 70, 85];
  const labels = config.options || ["A", "B", "C", "D", "E"];
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Radar Chart"}</span>
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="-60 -60 120 120" className="w-full h-full max-w-[200px]">
          {[20, 40, 60, 80, 100].map(r => <polygon key={r} points={Array(n).fill(0).map((_, i) => `${Math.cos(i * angleStep - Math.PI/2) * r * 0.4},${Math.sin(i * angleStep - Math.PI/2) * r * 0.4}`).join(" ")} fill="none" stroke="currentColor" className="text-muted" strokeWidth="0.5" />)}
          <polygon points={data.map((v: number, i: number) => `${Math.cos(i * angleStep - Math.PI/2) * v * 0.4},${Math.sin(i * angleStep - Math.PI/2) * v * 0.4}`).join(" ")} fill={config.color || "#3b82f6"} fillOpacity="0.3" stroke={config.color || "#3b82f6"} strokeWidth="2" />
          {labels.map((label: string, i: number) => <text key={i} x={Math.cos(i * angleStep - Math.PI/2) * 50} y={Math.sin(i * angleStep - Math.PI/2) * 50} textAnchor="middle" className="text-[8px] fill-current">{label}</text>)}
        </svg>
      </div>
    </div>
  );
}

export function PieChartWidget({ config, value }: BaseWidgetProps) {
  const data = Array.isArray(value) ? value : [30, 25, 20, 15, 10];
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  const total = data.reduce((a: number, b: number) => a + b, 0);
  let currentAngle = 0;
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Pie Chart"}</span>
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="-50 -50 100 100" className="w-full h-full max-w-[200px]">
          {data.map((v: number, i: number) => {
            const angle = (v / total) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;
            const x1 = Math.cos((startAngle - 90) * Math.PI / 180) * 40;
            const y1 = Math.sin((startAngle - 90) * Math.PI / 180) * 40;
            const x2 = Math.cos((currentAngle - 90) * Math.PI / 180) * 40;
            const y2 = Math.sin((currentAngle - 90) * Math.PI / 180) * 40;
            const largeArc = angle > 180 ? 1 : 0;
            return <path key={i} d={`M 0 0 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={colors[i % colors.length]} />;
          })}
        </svg>
      </div>
    </div>
  );
}

export function DonutChartWidget({ config, value }: BaseWidgetProps) {
  const data = Array.isArray(value) ? value : [30, 25, 20, 15, 10];
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  const total = data.reduce((a: number, b: number) => a + b, 0);
  let offset = 0;
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Donut Chart"}</span>
      <div className="flex-1 flex items-center justify-center relative">
        <svg viewBox="0 0 100 100" className="w-full h-full max-w-[200px]">
          {data.map((v: number, i: number) => {
            const percentage = (v / total) * 100;
            const strokeDasharray = `${percentage * 2.51} ${251 - percentage * 2.51}`;
            const strokeDashoffset = -offset * 2.51;
            offset += percentage;
            return <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={colors[i % colors.length]} strokeWidth="15" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} transform="rotate(-90 50 50)" />;
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{total}</span>
        </div>
      </div>
    </div>
  );
}

export function TreeMapWidget({ config, value }: BaseWidgetProps) {
  const data = Array.isArray(value) ? value : [{ name: "A", value: 30 }, { name: "B", value: 25 }, { name: "C", value: 20 }, { name: "D", value: 15 }, { name: "E", value: 10 }];
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  const total = data.reduce((a: number, b: any) => a + b.value, 0);
  let x = 0;
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Tree Map"}</span>
      <div className="flex-1 flex gap-1">
        {data.map((item: any, i: number) => {
          const width = (item.value / total) * 100;
          return (
            <div key={i} className="h-full rounded flex items-center justify-center text-white text-xs font-medium" style={{ width: `${width}%`, backgroundColor: colors[i % colors.length] }}>
              {item.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ==================== STATUS & ALERT WIDGET COMPONENTS ====================

export function StatusLightWidget({ config, value }: BaseWidgetProps) {
  const status = typeof value === "string" ? value : "ok";
  const colors: Record<string, string> = { ok: "#10B981", warning: "#F59E0B", error: "#EF4444", offline: "#6B7280" };
  return (
    <div className="flex flex-col items-center justify-center h-full p-2">
      <div className="w-6 h-6 rounded-full animate-pulse" style={{ backgroundColor: colors[status] || colors.offline, boxShadow: `0 0 10px ${colors[status] || colors.offline}` }} />
      <span className="text-xs text-muted-foreground mt-1 capitalize">{status}</span>
    </div>
  );
}

export function AlertBannerWidget({ config, value }: BaseWidgetProps) {
  const alert = value || { type: "warning", message: "System alert message" };
  const colors: Record<string, string> = { info: "bg-blue-500", warning: "bg-yellow-500", error: "bg-red-500", success: "bg-green-500" };
  return (
    <div className={`flex items-center gap-2 h-full p-3 rounded ${colors[alert.type] || colors.warning} text-white`}>
      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm font-medium flex-1">{alert.message || config.label}</span>
      <X className="h-4 w-4 cursor-pointer hover:opacity-70" />
    </div>
  );
}

export function AlertListWidget({ config, value }: BaseWidgetProps) {
  const alerts = Array.isArray(value) ? value : [
    { id: 1, type: "error", message: "High temperature detected", time: "2m ago" },
    { id: 2, type: "warning", message: "Battery low", time: "5m ago" },
    { id: 3, type: "info", message: "System update available", time: "1h ago" },
  ];
  const icons: Record<string, any> = { error: AlertCircle, warning: AlertTriangle, info: Info };
  const colors: Record<string, string> = { error: "text-red-500", warning: "text-yellow-500", info: "text-blue-500" };
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{config.label || "Alerts"}</span>
        <Badge variant="secondary">{alerts.length}</Badge>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {alerts.map((alert: any) => {
            const Icon = icons[alert.type] || Info;
            return (
              <div key={alert.id} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                <Icon className={`h-4 w-4 mt-0.5 ${colors[alert.type]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">{alert.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export function ThresholdIndicatorWidget({ config, value }: BaseWidgetProps) {
  const numValue = typeof value === "number" ? value : 50;
  const low = config.thresholds?.low?.value || 30;
  const high = config.thresholds?.high?.value || 70;
  const status = numValue < low ? "low" : numValue > high ? "high" : "normal";
  const colors: Record<string, string> = { low: "text-blue-500", normal: "text-green-500", high: "text-red-500" };
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div>
        <span className="text-xs text-muted-foreground">{config.label || "Threshold"}</span>
        <div className="text-xl font-bold">{numValue}{config.unit || ""}</div>
      </div>
      <Badge className={colors[status]}>{status.toUpperCase()}</Badge>
    </div>
  );
}

export function TrendArrowWidget({ config, value }: BaseWidgetProps) {
  const trend = typeof value === "string" ? value : typeof value === "number" ? (value > 0 ? "up" : value < 0 ? "down" : "stable") : "stable";
  const icons: Record<string, any> = { up: ArrowUp, down: ArrowDown, stable: ArrowRight };
  const colors: Record<string, string> = { up: "text-green-500", down: "text-red-500", stable: "text-gray-500" };
  const Icon = icons[trend] || ArrowRight;
  return (
    <div className="flex items-center justify-center h-full p-2">
      <Icon className={`h-8 w-8 ${colors[trend]}`} />
    </div>
  );
}

// ==================== ENVIRONMENTAL WIDGET COMPONENTS ====================

export function WeatherStationWidget({ config, value }: BaseWidgetProps) {
  const data = value || { temp: 22, humidity: 65, pressure: 1013, wind: 12 };
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Weather Station"}</span>
      <div className="grid grid-cols-2 gap-2 flex-1">
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
          <Thermometer className="h-4 w-4 text-red-500" />
          <div><div className="text-lg font-bold">{data.temp}°C</div><div className="text-xs text-muted-foreground">Temperature</div></div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
          <Droplets className="h-4 w-4 text-blue-500" />
          <div><div className="text-lg font-bold">{data.humidity}%</div><div className="text-xs text-muted-foreground">Humidity</div></div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
          <Gauge className="h-4 w-4 text-purple-500" />
          <div><div className="text-lg font-bold">{data.pressure}</div><div className="text-xs text-muted-foreground">hPa</div></div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
          <Wind className="h-4 w-4 text-cyan-500" />
          <div><div className="text-lg font-bold">{data.wind}</div><div className="text-xs text-muted-foreground">km/h</div></div>
        </div>
      </div>
    </div>
  );
}

export function TemperatureCardWidget({ config, value }: BaseWidgetProps) {
  const temp = typeof value === "number" ? value : 22;
  const trend = config.trend || "up";
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
          <Thermometer className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <span className="text-xs text-muted-foreground">{config.label || "Temperature"}</span>
          <div className="text-2xl font-bold">{temp}°C</div>
        </div>
      </div>
      {trend === "up" ? <ArrowUp className="h-5 w-5 text-red-500" /> : <ArrowDown className="h-5 w-5 text-blue-500" />}
    </div>
  );
}

export function HumidityDisplayWidget({ config, value }: BaseWidgetProps) {
  const humidity = typeof value === "number" ? value : 65;
  const comfort = humidity >= 30 && humidity <= 60 ? "Comfortable" : humidity < 30 ? "Too Dry" : "Too Humid";
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <Droplets className="h-6 w-6 text-blue-500" />
        </div>
        <div>
          <span className="text-xs text-muted-foreground">{config.label || "Humidity"}</span>
          <div className="text-2xl font-bold">{humidity}%</div>
        </div>
      </div>
      <Badge variant={comfort === "Comfortable" ? "default" : "secondary"}>{comfort}</Badge>
    </div>
  );
}

export function AirQualityIndexWidget({ config, value }: BaseWidgetProps) {
  const aqi = typeof value === "number" ? value : 42;
  const getLevel = () => aqi <= 50 ? { label: "Good", color: "bg-green-500" } : aqi <= 100 ? { label: "Moderate", color: "bg-yellow-500" } : aqi <= 150 ? { label: "Unhealthy for Sensitive", color: "bg-orange-500" } : { label: "Unhealthy", color: "bg-red-500" };
  const level = getLevel();
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-xs text-muted-foreground">{config.label || "Air Quality"}</span>
      <div className="flex items-center gap-3 mt-2">
        <div className={`w-16 h-16 rounded-full ${level.color} flex items-center justify-center`}>
          <span className="text-2xl font-bold text-white">{aqi}</span>
        </div>
        <div>
          <div className="font-medium">{level.label}</div>
          <div className="text-xs text-muted-foreground">AQI Index</div>
        </div>
      </div>
    </div>
  );
}

export function Co2MonitorWidget({ config, value }: BaseWidgetProps) {
  const ppm = typeof value === "number" ? value : 450;
  const getLevel = () => ppm < 800 ? { label: "Good", color: "text-green-500" } : ppm < 1000 ? { label: "Fair", color: "text-yellow-500" } : { label: "Poor", color: "text-red-500" };
  const level = getLevel();
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div>
        <span className="text-xs text-muted-foreground">{config.label || "CO₂ Level"}</span>
        <div className="text-2xl font-bold">{ppm} <span className="text-sm font-normal">ppm</span></div>
      </div>
      <div className={`text-right ${level.color}`}>
        <Cloud className="h-8 w-8" />
        <div className="text-xs font-medium">{level.label}</div>
      </div>
    </div>
  );
}

export function LightLevelWidget({ config, value }: BaseWidgetProps) {
  const lux = typeof value === "number" ? value : 500;
  const percentage = Math.min(100, (lux / 1000) * 100);
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <Sun className={`h-10 w-10 ${lux > 500 ? 'text-yellow-500' : 'text-gray-400'}`} style={{ opacity: 0.3 + (percentage / 100) * 0.7 }} />
      <div className="text-xl font-bold mt-2">{lux}</div>
      <span className="text-xs text-muted-foreground">lux</span>
    </div>
  );
}

export function SoundLevelWidget({ config, value }: BaseWidgetProps) {
  const db = typeof value === "number" ? value : 45;
  const getLevel = () => db < 40 ? "Quiet" : db < 70 ? "Normal" : db < 85 ? "Loud" : "Very Loud";
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <Volume2 className={`h-8 w-8 ${db > 70 ? 'text-red-500' : 'text-blue-500'}`} />
      <div className="text-xl font-bold mt-2">{db} dB</div>
      <span className="text-xs text-muted-foreground">{getLevel()}</span>
    </div>
  );
}

export function WindDirectionWidget({ config, value }: BaseWidgetProps) {
  const direction = typeof value === "number" ? value : 45;
  const speed = config.speed || 12;
  const getCardinal = () => {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(direction / 45) % 8];
  };
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Wind"}</span>
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-muted" strokeWidth="2" />
          {["N", "E", "S", "W"].map((d, i) => (
            <text key={d} x={50 + Math.sin(i * Math.PI / 2) * 38} y={50 - Math.cos(i * Math.PI / 2) * 38} textAnchor="middle" dominantBaseline="middle" className="text-xs fill-current">{d}</text>
          ))}
          <polygon points="50,15 45,35 50,30 55,35" fill="#3b82f6" transform={`rotate(${direction} 50 50)`} />
        </svg>
      </div>
      <div className="text-center mt-1">
        <span className="font-bold">{getCardinal()}</span>
        <span className="text-sm text-muted-foreground ml-2">{speed} km/h</span>
      </div>
    </div>
  );
}


// ==================== ENERGY WIDGET COMPONENTS ====================

export function PowerMeterWidget({ config, value }: BaseWidgetProps) {
  const watts = typeof value === "number" ? value : 1250;
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
          <Zap className="h-6 w-6 text-yellow-500" />
        </div>
        <div>
          <span className="text-xs text-muted-foreground">{config.label || "Power"}</span>
          <div className="text-2xl font-bold">{watts.toLocaleString()} <span className="text-sm font-normal">W</span></div>
        </div>
      </div>
    </div>
  );
}

export function EnergyUsageWidget({ config, value }: BaseWidgetProps) {
  const data = Array.isArray(value) ? value : [2.1, 2.5, 1.8, 3.2, 2.9, 2.4, 2.8];
  const total = data.reduce((a: number, b: number) => a + b, 0);
  const max = Math.max(...data);
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{config.label || "Energy Usage"}</span>
        <span className="text-lg font-bold">{total.toFixed(1)} kWh</span>
      </div>
      <div className="flex-1 flex items-end gap-1">
        {data.map((v: number, i: number) => (
          <div key={i} className="flex-1 bg-yellow-500 rounded-t transition-all" style={{ height: `${(v / max) * 100}%` }} />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>Mon</span><span>Sun</span>
      </div>
    </div>
  );
}

export function SolarProductionWidget({ config, value }: BaseWidgetProps) {
  const watts = typeof value === "number" ? value : 3200;
  const capacity = config.max || 5000;
  const percentage = (watts / capacity) * 100;
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sun className="h-5 w-5 text-yellow-500" />
        <span className="text-sm font-medium">{config.label || "Solar"}</span>
      </div>
      <div className="text-2xl font-bold">{(watts / 1000).toFixed(1)} kW</div>
      <Progress value={percentage} className="mt-2" />
      <span className="text-xs text-muted-foreground mt-1">{percentage.toFixed(0)}% of capacity</span>
    </div>
  );
}

export function BatteryLevelWidget({ config, value }: BaseWidgetProps) {
  const percentage = typeof value === "number" ? value : 75;
  const charging = config.charging || false;
  const power = config.power || 500;
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 mb-2">
        {charging ? <BatteryCharging className="h-5 w-5 text-green-500" /> : <Battery className="h-5 w-5" />}
        <span className="text-sm font-medium">{config.label || "Battery"}</span>
      </div>
      <div className="text-2xl font-bold">{percentage}%</div>
      <Progress value={percentage} className="mt-2" />
      <span className="text-xs text-muted-foreground mt-1">{charging ? `Charging ${power}W` : `${power}W discharge`}</span>
    </div>
  );
}

export function CostCalculatorWidget({ config, value }: BaseWidgetProps) {
  const cost = typeof value === "number" ? value : 12.50;
  const rate = config.rate || 0.15;
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div>
        <span className="text-xs text-muted-foreground">{config.label || "Energy Cost"}</span>
        <div className="text-2xl font-bold">${cost.toFixed(2)}</div>
        <span className="text-xs text-muted-foreground">Today</span>
      </div>
      <div className="text-right">
        <DollarSign className="h-8 w-8 text-green-500" />
        <div className="text-xs text-muted-foreground">${rate}/kWh</div>
      </div>
    </div>
  );
}

// ==================== INDUSTRIAL WIDGET COMPONENTS ====================

export function FlowMeterWidget({ config, value }: BaseWidgetProps) {
  const flow = typeof value === "number" ? value : 125;
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
          <Waves className="h-6 w-6 text-cyan-500 animate-pulse" />
        </div>
        <div>
          <span className="text-xs text-muted-foreground">{config.label || "Flow Rate"}</span>
          <div className="text-2xl font-bold">{flow} <span className="text-sm font-normal">{config.unit || "L/min"}</span></div>
        </div>
      </div>
    </div>
  );
}

export function LevelIndicatorWidget({ config, value }: BaseWidgetProps) {
  const level = typeof value === "number" ? value : 65;
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Level"}</span>
      <div className="relative w-12 h-32 border-2 border-muted rounded-lg overflow-hidden bg-muted/30">
        <div className="absolute bottom-0 left-0 right-0 bg-cyan-500 transition-all" style={{ height: `${level}%` }}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
        </div>
      </div>
      <span className="text-lg font-bold mt-2">{level}%</span>
    </div>
  );
}

export function ValvePositionWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const position = typeof value === "number" ? value : 50;
  const isOpen = position > 0;
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Valve"}</span>
      <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-colors ${isOpen ? 'border-green-500 bg-green-100 dark:bg-green-900' : 'border-red-500 bg-red-100 dark:bg-red-900'}`}>
        <Settings className={`h-8 w-8 ${isOpen ? 'text-green-500' : 'text-red-500'}`} style={{ transform: `rotate(${position * 0.9}deg)` }} />
      </div>
      <span className="text-sm font-medium mt-2">{position}% {isOpen ? 'Open' : 'Closed'}</span>
    </div>
  );
}

export function MotorStatusWidget({ config, value }: BaseWidgetProps) {
  const data = value || { rpm: 1450, torque: 85, status: "running" };
  const isRunning = data.status === "running";
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{config.label || "Motor"}</span>
        <Badge variant={isRunning ? "default" : "secondary"}>{data.status}</Badge>
      </div>
      <div className="flex items-center gap-3">
        <RotateCw className={`h-10 w-10 ${isRunning ? 'text-green-500 animate-spin' : 'text-gray-400'}`} style={{ animationDuration: '2s' }} />
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-sm"><span>RPM</span><span className="font-bold">{data.rpm}</span></div>
          <div className="flex justify-between text-sm"><span>Torque</span><span className="font-bold">{data.torque}%</span></div>
        </div>
      </div>
    </div>
  );
}

export function VibrationMonitorWidget({ config, value }: BaseWidgetProps) {
  const data = Array.isArray(value) ? value : Array(20).fill(0).map(() => Math.random() * 10);
  const max = Math.max(...data);
  const status = max > 8 ? "warning" : max > 5 ? "elevated" : "normal";
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{config.label || "Vibration"}</span>
        <Badge variant={status === "normal" ? "default" : "destructive"}>{status}</Badge>
      </div>
      <div className="flex-1 flex items-center">
        <svg className="w-full h-full" viewBox="0 0 100 40">
          <polyline fill="none" stroke={status === "normal" ? "#10b981" : "#ef4444"} strokeWidth="1.5" points={data.map((v: number, i: number) => `${(i / (data.length - 1)) * 100},${20 - v + 20}`).join(" ")} />
        </svg>
      </div>
      <div className="text-center text-xs text-muted-foreground">Peak: {max.toFixed(1)} mm/s</div>
    </div>
  );
}

export function PressureGaugeWidget({ config, value }: BaseWidgetProps) {
  const pressure = typeof value === "number" ? value : 2.5;
  const min = config.min || 0;
  const max = config.max || 10;
  const percentage = ((pressure - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Pressure"}</span>
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray={`${percentage * 2.51} 251`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold">{pressure.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">{config.unit || "bar"}</span>
        </div>
      </div>
    </div>
  );
}

export function OeeCalculatorWidget({ config, value }: BaseWidgetProps) {
  const data = value || { availability: 92, performance: 88, quality: 97 };
  const oee = (data.availability * data.performance * data.quality) / 10000;
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{config.label || "OEE"}</span>
        <span className="text-2xl font-bold">{oee.toFixed(1)}%</span>
      </div>
      <div className="space-y-2 flex-1">
        {[{ label: "Availability", value: data.availability, color: "bg-blue-500" }, { label: "Performance", value: data.performance, color: "bg-green-500" }, { label: "Quality", value: data.quality, color: "bg-purple-500" }].map(item => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1"><span>{item.label}</span><span>{item.value}%</span></div>
            <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmergencyStopWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const isActive = typeof value === "boolean" ? value : false;
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <button onClick={() => !isEditing && onChange?.(!isActive)} disabled={isEditing} className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${isActive ? 'bg-red-600 border-red-800 shadow-lg shadow-red-500/50' : 'bg-red-500 border-red-700 hover:bg-red-600'}`}>
        <AlertOctagon className="h-10 w-10 text-white" />
      </button>
      <span className="text-sm font-bold mt-2 text-red-500">{isActive ? "STOPPED" : "E-STOP"}</span>
    </div>
  );
}


// ==================== SMART HOME WIDGET COMPONENTS ====================

export function ThermostatControlWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const temp = typeof value === "number" ? value : 22;
  const mode = config.mode || "heat";
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <span className="text-xs text-muted-foreground mb-2">{config.label || "Thermostat"}</span>
      <div className="relative w-28 h-28 rounded-full border-4 border-muted flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold">{temp}°</div>
          <div className="text-xs text-muted-foreground capitalize">{mode}</div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="outline" onClick={() => !isEditing && onChange?.(temp - 1)} disabled={isEditing}><Minus className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" onClick={() => !isEditing && onChange?.(temp + 1)} disabled={isEditing}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export function BlindControllerWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const position = typeof value === "number" ? value : 50;
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Blinds"}</span>
      <div className="flex items-center gap-3 flex-1">
        <div className="w-16 h-24 border-2 border-muted rounded relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 bg-gray-400 transition-all" style={{ height: `${100 - position}%` }}>
            {Array(5).fill(0).map((_, i) => <div key={i} className="h-1 bg-gray-500 mt-1 mx-1" />)}
          </div>
        </div>
        <Slider orientation="vertical" value={[position]} min={0} max={100} onValueChange={([v]) => !isEditing && onChange?.(v)} disabled={isEditing} className="h-24" />
      </div>
      <span className="text-xs text-muted-foreground text-center mt-2">{position}% Open</span>
    </div>
  );
}

export function DoorLockWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const isLocked = typeof value === "boolean" ? value : true;
  return (
    <div className="flex flex-col items-center justify-center h-full p-3">
      <button onClick={() => !isEditing && onChange?.(!isLocked)} disabled={isEditing} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isLocked ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
        {isLocked ? <Lock className="h-8 w-8 text-green-500" /> : <Unlock className="h-8 w-8 text-red-500" />}
      </button>
      <span className="text-sm font-medium mt-2">{config.label || "Door"}</span>
      <span className="text-xs text-muted-foreground">{isLocked ? "Locked" : "Unlocked"}</span>
    </div>
  );
}

export function SecurityPanelWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const status = typeof value === "string" ? value : "armed";
  const modes = ["disarmed", "armed", "away", "night"];
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">{config.label || "Security"}</span>
        <Shield className={`h-5 w-5 ${status === "disarmed" ? "text-gray-400" : "text-green-500"}`} />
      </div>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {modes.map(mode => (
          <Button key={mode} size="sm" variant={status === mode ? "default" : "outline"} onClick={() => !isEditing && onChange?.(mode)} disabled={isEditing} className="capitalize">{mode}</Button>
        ))}
      </div>
    </div>
  );
}

export function SceneControllerWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const scenes = config.options || ["Morning", "Day", "Evening", "Night"];
  const activeScene = typeof value === "string" ? value : scenes[0];
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Scenes"}</span>
      <div className="flex gap-2 flex-wrap flex-1">
        {scenes.map((scene: string) => (
          <Button key={scene} size="sm" variant={activeScene === scene ? "default" : "outline"} onClick={() => !isEditing && onChange?.(scene)} disabled={isEditing} className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />{scene}
          </Button>
        ))}
      </div>
    </div>
  );
}


// ==================== MEDIA WIDGET COMPONENTS ====================

export function VideoStreamWidget({ config }: BaseWidgetProps) {
  const streamUrl = config.streamUrl || "";
  return (
    <div className="flex flex-col h-full p-2">
      <span className="text-sm font-medium mb-2">{config.label || "Video Stream"}</span>
      <div className="flex-1 bg-gray-900 rounded flex items-center justify-center">
        {streamUrl ? (
          <video src={streamUrl} autoPlay={config.autoPlay} loop={config.loop} muted className="w-full h-full object-contain" />
        ) : (
          <div className="text-center text-gray-400">
            <Video className="h-12 w-12 mx-auto mb-2" />
            <span className="text-sm">No stream URL</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ImageDisplayWidget({ config }: BaseWidgetProps) {
  const imageUrl = config.imageUrl || "";
  return (
    <div className="flex flex-col h-full p-2">
      <span className="text-sm font-medium mb-2">{config.label || "Image"}</span>
      <div className="flex-1 bg-muted rounded flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={config.label} className="w-full h-full object-contain" />
        ) : (
          <div className="text-center text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-2" />
            <span className="text-sm">No image</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function AudioPlayerWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const isPlaying = typeof value === "boolean" ? value : false;
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="outline" onClick={() => !isEditing && onChange?.(!isPlaying)} disabled={isEditing}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div>
          <div className="text-sm font-medium">{config.label || "Audio"}</div>
          <div className="text-xs text-muted-foreground">{isPlaying ? "Playing" : "Paused"}</div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <SkipBack className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
        <SkipForward className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
      </div>
    </div>
  );
}

export function CameraGridWidget({ config }: BaseWidgetProps) {
  const cameras = config.options || ["Camera 1", "Camera 2", "Camera 3", "Camera 4"];
  return (
    <div className="flex flex-col h-full p-2">
      <span className="text-sm font-medium mb-2">{config.label || "Cameras"}</span>
      <div className="flex-1 grid grid-cols-2 gap-1">
        {cameras.slice(0, 4).map((cam: string, i: number) => (
          <div key={i} className="bg-gray-900 rounded flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Camera className="h-6 w-6 mx-auto" />
              <span className="text-xs">{cam}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ImageGalleryWidget({ config }: BaseWidgetProps) {
  const images = config.options || ["Image 1", "Image 2", "Image 3"];
  return (
    <div className="flex flex-col h-full p-2">
      <span className="text-sm font-medium mb-2">{config.label || "Gallery"}</span>
      <div className="flex-1 flex gap-1 overflow-x-auto">
        {images.map((img: string, i: number) => (
          <div key={i} className="w-24 h-full flex-shrink-0 bg-muted rounded flex items-center justify-center">
            <Image className="h-8 w-8 text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}


// ==================== DATA WIDGET COMPONENTS ====================

export function DataTableWidget({ config, value }: BaseWidgetProps) {
  const data = Array.isArray(value) ? value : [
    { id: 1, name: "Sensor A", value: 25.4, status: "OK" },
    { id: 2, name: "Sensor B", value: 18.2, status: "OK" },
    { id: 3, name: "Sensor C", value: 32.1, status: "Warning" },
  ];
  const columns = Object.keys(data[0] || {});
  return (
    <div className="flex flex-col h-full p-2">
      <span className="text-sm font-medium mb-2">{config.label || "Data Table"}</span>
      <ScrollArea className="flex-1">
        <table className="w-full text-sm">
          <thead><tr className="border-b">{columns.map(col => <th key={col} className="text-left p-2 font-medium capitalize">{col}</th>)}</tr></thead>
          <tbody>{data.map((row: any, i: number) => <tr key={i} className="border-b">{columns.map(col => <td key={col} className="p-2">{row[col]}</td>)}</tr>)}</tbody>
        </table>
      </ScrollArea>
    </div>
  );
}

export function KpiCardWidget({ config, value }: BaseWidgetProps) {
  const current = typeof value === "number" ? value : 85;
  const target = config.max || 100;
  const percentage = (current / target) * 100;
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-xs text-muted-foreground">{config.label || "KPI"}</span>
      <div className="text-2xl font-bold">{current}{config.unit || ""}</div>
      <Progress value={percentage} className="mt-2" />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>Target: {target}</span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
    </div>
  );
}

export function StatisticsCardWidget({ config, value }: BaseWidgetProps) {
  const data = Array.isArray(value) ? value : [10, 25, 15, 30, 20, 35, 28];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const mean = data.reduce((a: number, b: number) => a + b, 0) / data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Statistics"}</span>
      <div className="grid grid-cols-2 gap-2 flex-1">
        <div className="bg-muted/50 rounded p-2"><div className="text-xs text-muted-foreground">Min</div><div className="font-bold">{min.toFixed(1)}</div></div>
        <div className="bg-muted/50 rounded p-2"><div className="text-xs text-muted-foreground">Max</div><div className="font-bold">{max.toFixed(1)}</div></div>
        <div className="bg-muted/50 rounded p-2"><div className="text-xs text-muted-foreground">Mean</div><div className="font-bold">{mean.toFixed(1)}</div></div>
        <div className="bg-muted/50 rounded p-2"><div className="text-xs text-muted-foreground">Median</div><div className="font-bold">{median.toFixed(1)}</div></div>
      </div>
    </div>
  );
}

export function EventTimelineWidget({ config, value }: BaseWidgetProps) {
  const events = Array.isArray(value) ? value : [
    { time: "10:30", event: "System started", type: "info" },
    { time: "10:45", event: "Sensor connected", type: "success" },
    { time: "11:00", event: "High temp alert", type: "warning" },
  ];
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Timeline"}</span>
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {events.map((e: any, i: number) => (
            <div key={i} className="flex gap-2">
              <div className="text-xs text-muted-foreground w-12">{e.time}</div>
              <div className={`w-2 h-2 rounded-full mt-1 ${e.type === "success" ? "bg-green-500" : e.type === "warning" ? "bg-yellow-500" : "bg-blue-500"}`} />
              <div className="text-sm flex-1">{e.event}</div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function LogViewerWidget({ config, value }: BaseWidgetProps) {
  const logs = Array.isArray(value) ? value : [
    "[INFO] System initialized",
    "[DEBUG] Connecting to device...",
    "[INFO] Device connected",
    "[WARN] High memory usage",
  ];
  return (
    <div className="flex flex-col h-full p-2">
      <span className="text-sm font-medium mb-2">{config.label || "Logs"}</span>
      <ScrollArea className="flex-1 bg-gray-900 rounded p-2">
        <pre className="text-xs text-green-400 font-mono">{logs.join("\n")}</pre>
      </ScrollArea>
    </div>
  );
}


// ==================== AI WIDGET COMPONENTS ====================

export function ForecastDisplayWidget({ config, value }: BaseWidgetProps) {
  const forecast = Array.isArray(value) ? value : [22, 24, 23, 25, 26, 24, 23];
  const max = Math.max(...forecast);
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">{config.label || "Forecast"}</span>
      </div>
      <div className="flex-1 flex items-end gap-1">
        {forecast.map((v: number, i: number) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="w-full bg-blue-500/30 rounded-t" style={{ height: `${(v / max) * 100}%` }}>
              <div className="w-full bg-blue-500 rounded-t h-1/2" />
            </div>
            <span className="text-xs text-muted-foreground mt-1">{i + 1}d</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnomalyIndicatorWidget({ config, value }: BaseWidgetProps) {
  const anomaly = value || { detected: false, confidence: 0, message: "No anomalies" };
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div>
        <span className="text-xs text-muted-foreground">{config.label || "Anomaly Detection"}</span>
        <div className="text-sm font-medium">{anomaly.message}</div>
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${anomaly.detected ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}`}>
        {anomaly.detected ? <AlertTriangle className="h-5 w-5 text-red-500" /> : <Check className="h-5 w-5 text-green-500" />}
      </div>
    </div>
  );
}

export function InsightCardWidget({ config, value }: BaseWidgetProps) {
  const insight = typeof value === "string" ? value : "AI analysis suggests optimal performance during morning hours.";
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium">{config.label || "AI Insight"}</span>
      </div>
      <div className="flex-1 text-sm text-muted-foreground">{insight}</div>
    </div>
  );
}

export function PredictionChartWidget({ config, value }: BaseWidgetProps) {
  const actual = Array.isArray(value) ? value.slice(0, 5) : [20, 25, 22, 28, 30];
  const predicted = config.predicted || [32, 35, 33, 36];
  const all = [...actual, ...predicted];
  const max = Math.max(...all);
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Prediction"}</span>
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
          <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={actual.map((v: number, i: number) => `${(i / (all.length - 1)) * 100},${50 - (v / max) * 45}`).join(" ")} />
          <polyline fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 2" points={[actual[actual.length - 1], ...predicted].map((v: number, i: number) => `${((actual.length - 1 + i) / (all.length - 1)) * 100},${50 - (v / max) * 45}`).join(" ")} />
        </svg>
      </div>
      <div className="flex gap-4 text-xs mt-2">
        <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-blue-500" />Actual</div>
        <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-purple-500" style={{ borderStyle: 'dashed' }} />Predicted</div>
      </div>
    </div>
  );
}


// ==================== SYSTEM WIDGET COMPONENTS ====================

export function ResourceMonitorWidget({ config, value }: BaseWidgetProps) {
  const data = value || { cpu: 45, memory: 62, storage: 78 };
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Resources"}</span>
      <div className="space-y-2 flex-1">
        {[{ label: "CPU", value: data.cpu, color: "bg-blue-500" }, { label: "Memory", value: data.memory, color: "bg-green-500" }, { label: "Storage", value: data.storage, color: "bg-purple-500" }].map(item => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1"><span>{item.label}</span><span>{item.value}%</span></div>
            <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NetworkTopologyWidget({ config }: BaseWidgetProps) {
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Network"}</span>
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center"><Router className="h-6 w-6 text-blue-500" /></div>
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <div key={i} className="absolute w-8 h-8 rounded-full bg-muted flex items-center justify-center" style={{ transform: `rotate(${angle}deg) translate(50px) rotate(-${angle}deg)` }}>
              <Cpu className="h-4 w-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function UptimeDisplayWidget({ config, value }: BaseWidgetProps) {
  const seconds = typeof value === "number" ? value : 86400;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div>
        <span className="text-xs text-muted-foreground">{config.label || "Uptime"}</span>
        <div className="text-xl font-bold">{days}d {hours}h {mins}m</div>
      </div>
      <Clock className="h-6 w-6 text-green-500" />
    </div>
  );
}

export function LatencyDisplayWidget({ config, value }: BaseWidgetProps) {
  const latency = typeof value === "number" ? value : 45;
  const getColor = () => latency < 50 ? "text-green-500" : latency < 100 ? "text-yellow-500" : "text-red-500";
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div>
        <span className="text-xs text-muted-foreground">{config.label || "Latency"}</span>
        <div className={`text-2xl font-bold ${getColor()}`}>{latency} ms</div>
      </div>
      <Activity className={`h-6 w-6 ${getColor()}`} />
    </div>
  );
}


// ==================== LAYOUT WIDGET COMPONENTS ====================

export function ContainerWidget({ config }: BaseWidgetProps) {
  return (
    <div className={`h-full ${config.border ? 'border-2 border-dashed border-muted' : ''} rounded-lg`} style={{ padding: config.padding || 8 }}>
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <span className="text-sm">{config.label || "Container"}</span>
      </div>
    </div>
  );
}

export function TabsWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const tabs = config.options || ["Tab 1", "Tab 2", "Tab 3"];
  const activeTab = typeof value === "string" ? value : tabs[0];
  return (
    <div className="flex flex-col h-full">
      <TabsComponent value={activeTab} onValueChange={(v) => !isEditing && onChange?.(v)}>
        <TabsList className="w-full">
          {tabs.map((tab: string) => <TabsTrigger key={tab} value={tab} disabled={isEditing}>{tab}</TabsTrigger>)}
        </TabsList>
        {tabs.map((tab: string) => <TabsContent key={tab} value={tab} className="flex-1 p-2"><div className="h-full bg-muted/30 rounded flex items-center justify-center text-muted-foreground">{tab} content</div></TabsContent>)}
      </TabsComponent>
    </div>
  );
}

export function AccordionWidget({ config }: BaseWidgetProps) {
  const sections = config.options || ["Section 1", "Section 2", "Section 3"];
  return (
    <div className="flex flex-col h-full p-2">
      <span className="text-sm font-medium mb-2">{config.label || "Accordion"}</span>
      <div className="space-y-1 flex-1">
        {sections.map((section: string, i: number) => (
          <Collapsible key={i}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded hover:bg-muted">
              <span className="text-sm">{section}</span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="p-2 text-sm text-muted-foreground">Content for {section}</CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}

export function CarouselWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const items = config.options || ["Slide 1", "Slide 2", "Slide 3"];
  const currentIndex = typeof value === "number" ? value : 0;
  return (
    <div className="flex flex-col h-full p-2">
      <div className="flex-1 bg-muted/30 rounded flex items-center justify-center">
        <span className="text-lg font-medium">{items[currentIndex]}</span>
      </div>
      <div className="flex items-center justify-center gap-2 mt-2">
        <Button size="icon" variant="ghost" onClick={() => !isEditing && onChange?.((currentIndex - 1 + items.length) % items.length)} disabled={isEditing}><ChevronDown className="h-4 w-4 rotate-90" /></Button>
        <div className="flex gap-1">{items.map((_: string, i: number) => <div key={i} className={`w-2 h-2 rounded-full ${i === currentIndex ? 'bg-primary' : 'bg-muted'}`} />)}</div>
        <Button size="icon" variant="ghost" onClick={() => !isEditing && onChange?.((currentIndex + 1) % items.length)} disabled={isEditing}><ChevronDown className="h-4 w-4 -rotate-90" /></Button>
      </div>
    </div>
  );
}

export function SplitPanelWidget({ config }: BaseWidgetProps) {
  return (
    <div className="flex h-full gap-1 p-2">
      <div className="flex-1 bg-muted/30 rounded flex items-center justify-center text-muted-foreground text-sm">Panel 1</div>
      <div className="w-1 bg-muted cursor-col-resize hover:bg-primary/50" />
      <div className="flex-1 bg-muted/30 rounded flex items-center justify-center text-muted-foreground text-sm">Panel 2</div>
    </div>
  );
}


// ==================== DEVICE WIDGET COMPONENTS ====================

export function DeviceStatusWidget({ config, value }: BaseWidgetProps) {
  const device = value || { name: "ESP32", status: "online", ip: "192.168.1.100" };
  const isOnline = device.status === "online";
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOnline ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
          <Cpu className={`h-5 w-5 ${isOnline ? 'text-green-500' : 'text-gray-400'}`} />
        </div>
        <div>
          <div className="font-medium">{device.name}</div>
          <div className="text-xs text-muted-foreground">{device.ip}</div>
        </div>
      </div>
      <Badge variant={isOnline ? "default" : "secondary"}>{device.status}</Badge>
    </div>
  );
}

export function GpioControlWidget({ config, value, onChange, isEditing }: BaseWidgetProps) {
  const pins = config.gpioPins || [2, 4, 5, 12, 13, 14, 15, 16];
  const pinStates = Array.isArray(value) ? value : pins.map(() => false);
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "GPIO Control"}</span>
      <div className="grid grid-cols-4 gap-2 flex-1">
        {pins.map((pin: number, i: number) => (
          <button key={pin} onClick={() => { if (!isEditing) { const newStates = [...pinStates]; newStates[i] = !newStates[i]; onChange?.(newStates); } }} disabled={isEditing} className={`rounded p-2 text-xs font-mono transition-colors ${pinStates[i] ? 'bg-green-500 text-white' : 'bg-muted hover:bg-muted/80'}`}>
            GPIO{pin}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SensorMonitorWidget({ config, value }: BaseWidgetProps) {
  const sensors = Array.isArray(value) ? value : [
    { name: "Temperature", value: 25.4, unit: "°C" },
    { name: "Humidity", value: 65, unit: "%" },
    { name: "Pressure", value: 1013, unit: "hPa" },
  ];
  return (
    <div className="flex flex-col h-full p-3">
      <span className="text-sm font-medium mb-2">{config.label || "Sensors"}</span>
      <div className="space-y-2 flex-1">
        {sensors.map((sensor: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <span className="text-sm">{sensor.name}</span>
            <span className="font-mono font-bold">{sensor.value}{sensor.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VariableWatchWidget({ config, value }: BaseWidgetProps) {
  const variables = Array.isArray(value) ? value : [
    { name: "counter", value: 42, type: "int" },
    { name: "temperature", value: 25.5, type: "float" },
    { name: "isRunning", value: true, type: "bool" },
  ];
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 mb-2">
        <Eye className="h-4 w-4" />
        <span className="text-sm font-medium">{config.label || "Variables"}</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {variables.map((v: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-1 font-mono text-xs">
              <span className="text-blue-500">{v.name}</span>
              <span className={typeof v.value === "boolean" ? (v.value ? "text-green-500" : "text-red-500") : ""}>{String(v.value)}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function FunctionTriggerWidget({ config, onChange, isEditing }: BaseWidgetProps) {
  const functions = config.functions || [
    { name: "readSensor", params: [] },
    { name: "setLED", params: ["state"] },
    { name: "calibrate", params: [] },
  ];
  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4" />
        <span className="text-sm font-medium">{config.label || "Functions"}</span>
      </div>
      <div className="space-y-1 flex-1">
        {functions.map((fn: any, i: number) => (
          <Button key={i} size="sm" variant="outline" className="w-full justify-start font-mono text-xs" onClick={() => !isEditing && onChange?.(fn.name)} disabled={isEditing}>
            {fn.name}({fn.params.join(", ")})
          </Button>
        ))}
      </div>
    </div>
  );
}

export function CodeSnippetWidget({ config }: BaseWidgetProps) {
  const code = config.codeContent || "// No code linked\nfunction example() {\n  return 42;\n}";
  const language = config.codeLanguage || "javascript";
  return (
    <div className="flex flex-col h-full p-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4" />
          <span className="text-sm font-medium">{config.label || "Code"}</span>
        </div>
        <Badge variant="secondary">{language}</Badge>
      </div>
      <ScrollArea className="flex-1 bg-gray-900 rounded p-2">
        <pre className="text-xs text-gray-300 font-mono">{code}</pre>
      </ScrollArea>
    </div>
  );
}


// ==================== MAP WIDGET COMPONENTS ====================

export function DeviceMapWidget({ config }: BaseWidgetProps) {
  return (
    <div className="flex flex-col h-full p-2">
      <span className="text-sm font-medium mb-2">{config.label || "Device Map"}</span>
      <div className="flex-1 bg-muted/30 rounded flex items-center justify-center relative">
        <Map className="h-16 w-16 text-muted-foreground/30" />
        <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
        <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

export function GpsCoordinatesWidget({ config, value }: BaseWidgetProps) {
  const coords = value || { lat: 37.7749, lng: -122.4194 };
  return (
    <div className="flex items-center justify-between h-full p-3">
      <div>
        <span className="text-xs text-muted-foreground">{config.label || "GPS"}</span>
        <div className="font-mono text-sm">
          <div>Lat: {coords.lat.toFixed(4)}°</div>
          <div>Lng: {coords.lng.toFixed(4)}°</div>
        </div>
      </div>
      <MapPin className="h-8 w-8 text-red-500" />
    </div>
  );
}


// ==================== RENDER WIDGET FUNCTION ====================

export function renderWidget(config: WidgetConfig, value: any, onChange?: (value: any) => void, isEditing?: boolean): React.ReactNode {
  const props: BaseWidgetProps = { config, value, onChange, isEditing };
  
  switch (config.type) {
    // Control widgets
    case "button": return <ButtonWidget {...props} />;
    case "slider": return <SliderWidget {...props} />;
    case "toggle": return <ToggleWidget {...props} />;
    case "joystick": return <JoystickWidget {...props} />;
    case "dropdown": return <DropdownWidget {...props} />;
    case "colorPicker": return <ColorPickerWidget {...props} />;
    case "buttonGroup": return <ButtonGroupWidget {...props} />;
    case "rangeSlider": return <RangeSliderWidget {...props} />;
    case "radioGroup": return <RadioGroupWidget {...props} />;
    case "textInput": return <TextInputWidget {...props} />;
    case "dateTimePicker": return <DateTimePickerWidget {...props} />;
    
    // Display widgets
    case "gauge": return <GaugeWidget {...props} />;
    case "valueDisplay": return <ValueDisplayWidget {...props} />;
    case "ledIndicator": return <LedIndicatorWidget {...props} />;
    case "textDisplay": return <TextDisplayWidget {...props} />;
    case "progressBar": return <ProgressBarWidget {...props} />;
    case "sparklineNumber": return <SparklineNumberWidget {...props} />;
    case "deltaIndicator": return <DeltaIndicatorWidget {...props} />;
    case "semicircularGauge": return <SemicircularGaugeWidget {...props} />;
    case "speedometer": return <SpeedometerWidget {...props} />;
    case "thermometer": return <ThermometerWidget {...props} />;
    case "tankGauge": return <TankGaugeWidget {...props} />;
    case "batteryIndicator": return <BatteryIndicatorWidget {...props} />;
    case "signalStrength": return <SignalStrengthWidget {...props} />;
    
    // Visualization widgets
    case "lineChart": return <LineChartWidget {...props} />;
    case "barChart": return <BarChartWidget {...props} />;
    case "scatterPlot": return <ScatterPlotWidget {...props} />;
    case "heatmap": return <HeatmapWidget {...props} />;
    case "3dModel": return <ThreeDModelWidget {...props} />;
    case "areaChart": return <AreaChartWidget {...props} />;
    case "radarChart": return <RadarChartWidget {...props} />;
    case "pieChart": return <PieChartWidget {...props} />;
    case "donutChart": return <DonutChartWidget {...props} />;
    case "treeMap": return <TreeMapWidget {...props} />;
    
    // Status & Alert widgets
    case "statusLight": return <StatusLightWidget {...props} />;
    case "alertBanner": return <AlertBannerWidget {...props} />;
    case "alertList": return <AlertListWidget {...props} />;
    case "thresholdIndicator": return <ThresholdIndicatorWidget {...props} />;
    case "trendArrow": return <TrendArrowWidget {...props} />;
    
    // Environmental widgets
    case "weatherStation": return <WeatherStationWidget {...props} />;
    case "temperatureCard": return <TemperatureCardWidget {...props} />;
    case "humidityDisplay": return <HumidityDisplayWidget {...props} />;
    case "airQualityIndex": return <AirQualityIndexWidget {...props} />;
    case "co2Monitor": return <Co2MonitorWidget {...props} />;
    case "lightLevel": return <LightLevelWidget {...props} />;
    case "soundLevel": return <SoundLevelWidget {...props} />;
    case "windDirection": return <WindDirectionWidget {...props} />;
    
    // Energy widgets
    case "powerMeter": return <PowerMeterWidget {...props} />;
    case "energyUsage": return <EnergyUsageWidget {...props} />;
    case "solarProduction": return <SolarProductionWidget {...props} />;
    case "batteryLevel": return <BatteryLevelWidget {...props} />;
    case "costCalculator": return <CostCalculatorWidget {...props} />;
    
    // Industrial widgets
    case "flowMeter": return <FlowMeterWidget {...props} />;
    case "levelIndicator": return <LevelIndicatorWidget {...props} />;
    case "valvePosition": return <ValvePositionWidget {...props} />;
    case "motorStatus": return <MotorStatusWidget {...props} />;
    case "vibrationMonitor": return <VibrationMonitorWidget {...props} />;
    case "pressureGauge": return <PressureGaugeWidget {...props} />;
    case "oeeCalculator": return <OeeCalculatorWidget {...props} />;
    case "emergencyStop": return <EmergencyStopWidget {...props} />;
    
    // Smart Home widgets
    case "thermostatControl": return <ThermostatControlWidget {...props} />;
    case "blindController": return <BlindControllerWidget {...props} />;
    case "doorLock": return <DoorLockWidget {...props} />;
    case "securityPanel": return <SecurityPanelWidget {...props} />;
    case "sceneController": return <SceneControllerWidget {...props} />;
    
    // Media widgets
    case "videoStream": return <VideoStreamWidget {...props} />;
    case "imageDisplay": return <ImageDisplayWidget {...props} />;
    case "audioPlayer": return <AudioPlayerWidget {...props} />;
    case "cameraGrid": return <CameraGridWidget {...props} />;
    case "imageGallery": return <ImageGalleryWidget {...props} />;
    
    // Data widgets
    case "dataTable": return <DataTableWidget {...props} />;
    case "kpiCard": return <KpiCardWidget {...props} />;
    case "statisticsCard": return <StatisticsCardWidget {...props} />;
    case "eventTimeline": return <EventTimelineWidget {...props} />;
    case "logViewer": return <LogViewerWidget {...props} />;
    
    // AI widgets
    case "forecastDisplay": return <ForecastDisplayWidget {...props} />;
    case "anomalyIndicator": return <AnomalyIndicatorWidget {...props} />;
    case "insightCard": return <InsightCardWidget {...props} />;
    case "predictionChart": return <PredictionChartWidget {...props} />;
    
    // System widgets
    case "resourceMonitor": return <ResourceMonitorWidget {...props} />;
    case "networkTopology": return <NetworkTopologyWidget {...props} />;
    case "uptimeDisplay": return <UptimeDisplayWidget {...props} />;
    case "latencyDisplay": return <LatencyDisplayWidget {...props} />;
    
    // Layout widgets
    case "container": return <ContainerWidget {...props} />;
    case "tabs": return <TabsWidget {...props} />;
    case "accordion": return <AccordionWidget {...props} />;
    case "carousel": return <CarouselWidget {...props} />;
    case "splitPanel": return <SplitPanelWidget {...props} />;
    
    // Device widgets
    case "deviceStatus": return <DeviceStatusWidget {...props} />;
    case "gpioControl": return <GpioControlWidget {...props} />;
    case "sensorMonitor": return <SensorMonitorWidget {...props} />;
    case "variableWatch": return <VariableWatchWidget {...props} />;
    case "functionTrigger": return <FunctionTriggerWidget {...props} />;
    case "codeSnippet": return <CodeSnippetWidget {...props} />;
    
    // Map widgets
    case "deviceMap": return <DeviceMapWidget {...props} />;
    case "gpsCoordinates": return <GpsCoordinatesWidget {...props} />;
    
    default:
      return (
        <div className="flex items-center justify-center h-full p-3 text-muted-foreground">
          <span className="text-sm">Unknown widget: {config.type}</span>
        </div>
      );
  }
}
