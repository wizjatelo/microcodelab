import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Thermometer,
  Home,
  Bot,
  Gauge,
  BarChart3,
  Zap,
  Wifi,
  Car,
} from "lucide-react";
import type { WidgetConfig, WidgetLayout, WidgetType } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof Thermometer;
  category: "iot" | "home" | "industrial" | "automotive";
  widgets: Omit<WidgetConfig, "id">[];
  layout: Omit<WidgetLayout, "i">[];
  previewImage?: string;
}

interface DashboardTemplatesProps {
  onApplyTemplate: (widgets: WidgetConfig[], layout: WidgetLayout[]) => void;
}

const templates: DashboardTemplate[] = [
  {
    id: "iot-sensor-monitor",
    name: "IoT Sensor Monitor",
    description: "Temperature, humidity, and pressure monitoring dashboard",
    icon: Thermometer,
    category: "iot",
    widgets: [
      {
        type: "gauge",
        label: "Temperature",
        variableName: "temperature",
        min: -20,
        max: 50,
        unit: "°C",
        color: "#ef4444"
      },
      {
        type: "gauge", 
        label: "Humidity",
        variableName: "humidity",
        min: 0,
        max: 100,
        unit: "%",
        color: "#3b82f6"
      },
      {
        type: "gauge",
        label: "Pressure", 
        variableName: "pressure",
        min: 900,
        max: 1100,
        unit: "hPa",
        color: "#10b981"
      },
      {
        type: "lineChart",
        label: "Temperature Trend",
        variableName: "temperature",
        maxDataPoints: 100,
        showGrid: true,
        color: "#ef4444"
      },
      {
        type: "lineChart",
        label: "Humidity Trend", 
        variableName: "humidity",
        maxDataPoints: 100,
        showGrid: true,
        color: "#3b82f6"
      },
    ],
    layout: [
      { x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 2 }, // Temperature gauge
      { x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 2 }, // Humidity gauge  
      { x: 6, y: 0, w: 3, h: 3, minW: 2, minH: 2 }, // Pressure gauge
      { x: 0, y: 3, w: 6, h: 4, minW: 4, minH: 3 }, // Temperature chart
      { x: 6, y: 3, w: 6, h: 4, minW: 4, minH: 3 }, // Humidity chart
    ]
  },
  {
    id: "smart-home-control",
    name: "Smart Home Control",
    description: "Light, thermostat, and security control panel",
    icon: Home,
    category: "home",
    widgets: [
      {
        type: "toggle",
        label: "Living Room Light",
        variableName: "living_room_light",
      },
      {
        type: "toggle", 
        label: "Kitchen Light",
        variableName: "kitchen_light",
      },
      {
        type: "toggle",
        label: "Bedroom Light",
        variableName: "bedroom_light", 
      },
      {
        type: "slider",
        label: "Thermostat",
        variableName: "thermostat_temp",
        min: 15,
        max: 30,
        unit: "°C"
      },
      {
        type: "ledIndicator",
        label: "Security System",
        variableName: "security_armed",
        color: "#ef4444"
      },
      {
        type: "button",
        label: "Arm Security",
        functionName: "armSecurity"
      },
      {
        type: "valueDisplay",
        label: "Energy Usage",
        variableName: "energy_usage",
        unit: "kWh"
      },
      {
        type: "progressBar",
        label: "WiFi Signal",
        variableName: "wifi_strength",
        min: 0,
        max: 100,
        unit: "%"
      }
    ],
    layout: [
      { x: 0, y: 0, w: 2, h: 1, minW: 2, minH: 1 }, // Living room light
      { x: 2, y: 0, w: 2, h: 1, minW: 2, minH: 1 }, // Kitchen light
      { x: 4, y: 0, w: 2, h: 1, minW: 2, minH: 1 }, // Bedroom light
      { x: 0, y: 1, w: 4, h: 1, minW: 3, minH: 1 }, // Thermostat
      { x: 4, y: 1, w: 1, h: 1, minW: 1, minH: 1 }, // Security LED
      { x: 5, y: 1, w: 2, h: 1, minW: 2, minH: 1 }, // Arm button
      { x: 0, y: 2, w: 3, h: 1, minW: 2, minH: 1 }, // Energy usage
      { x: 3, y: 2, w: 4, h: 1, minW: 3, minH: 1 }, // WiFi signal
    ]
  },
  {
    id: "robot-control-panel", 
    name: "Robot Control Panel",
    description: "Motor control, sensor feedback, and navigation",
    icon: Bot,
    category: "industrial",
    widgets: [
      {
        type: "joystick",
        label: "Movement Control",
        xVariable: "robot_x",
        yVariable: "robot_y",
        returnToCenter: true
      },
      {
        type: "slider",
        label: "Left Motor Speed",
        variableName: "left_motor_speed", 
        min: -100,
        max: 100,
        unit: "%"
      },
      {
        type: "slider",
        label: "Right Motor Speed",
        variableName: "right_motor_speed",
        min: -100, 
        max: 100,
        unit: "%"
      },
      {
        type: "gauge",
        label: "Battery Level",
        variableName: "battery_level",
        min: 0,
        max: 100,
        unit: "%",
        color: "#10b981"
      },
      {
        type: "valueDisplay",
        label: "Distance Sensor",
        variableName: "distance_cm",
        unit: "cm"
      },
      {
        type: "button",
        label: "Emergency Stop",
        functionName: "emergencyStop",
        color: "#ef4444"
      },
      {
        type: "textDisplay",
        label: "Robot Status",
        variableName: "robot_status"
      },
      {
        type: "lineChart",
        label: "Sensor History",
        variableName: "distance_cm",
        maxDataPoints: 50,
        showGrid: true
      }
    ],
    layout: [
      { x: 0, y: 0, w: 3, h: 3, minW: 3, minH: 3 }, // Joystick
      { x: 3, y: 0, w: 3, h: 1, minW: 3, minH: 1 }, // Left motor
      { x: 3, y: 1, w: 3, h: 1, minW: 3, minH: 1 }, // Right motor  
      { x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 }, // Battery gauge
      { x: 9, y: 0, w: 2, h: 1, minW: 2, minH: 1 }, // Distance sensor
      { x: 9, y: 1, w: 2, h: 1, minW: 2, minH: 1 }, // Emergency stop
      { x: 0, y: 3, w: 6, h: 2, minW: 4, minH: 2 }, // Status display
      { x: 6, y: 2, w: 6, h: 3, minW: 4, minH: 3 }, // Sensor chart
    ]
  },
  {
    id: "automotive-dashboard",
    name: "Automotive Dashboard", 
    description: "Vehicle monitoring and diagnostics",
    icon: Car,
    category: "automotive",
    widgets: [
      {
        type: "gauge",
        label: "Speed",
        variableName: "vehicle_speed",
        min: 0,
        max: 200,
        unit: "km/h",
        color: "#3b82f6"
      },
      {
        type: "gauge",
        label: "RPM", 
        variableName: "engine_rpm",
        min: 0,
        max: 8000,
        unit: "RPM",
        color: "#ef4444"
      },
      {
        type: "gauge",
        label: "Fuel Level",
        variableName: "fuel_level",
        min: 0,
        max: 100,
        unit: "%",
        color: "#f59e0b"
      },
      {
        type: "valueDisplay",
        label: "Engine Temp",
        variableName: "engine_temp",
        unit: "°C"
      },
      {
        type: "valueDisplay", 
        label: "Oil Pressure",
        variableName: "oil_pressure",
        unit: "PSI"
      },
      {
        type: "ledIndicator",
        label: "Check Engine",
        variableName: "check_engine",
        color: "#ef4444"
      },
      {
        type: "ledIndicator",
        label: "Turn Signal L",
        variableName: "turn_left",
        color: "#f59e0b"
      },
      {
        type: "ledIndicator", 
        label: "Turn Signal R",
        variableName: "turn_right",
        color: "#f59e0b"
      }
    ],
    layout: [
      { x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 }, // Speed gauge (large)
      { x: 4, y: 0, w: 3, h: 3, minW: 2, minH: 2 }, // RPM gauge
      { x: 7, y: 0, w: 3, h: 3, minW: 2, minH: 2 }, // Fuel gauge
      { x: 4, y: 3, w: 2, h: 1, minW: 2, minH: 1 }, // Engine temp
      { x: 6, y: 3, w: 2, h: 1, minW: 2, minH: 1 }, // Oil pressure
      { x: 8, y: 3, w: 1, h: 1, minW: 1, minH: 1 }, // Check engine
      { x: 9, y: 3, w: 1, h: 1, minW: 1, minH: 1 }, // Turn left
      { x: 10, y: 3, w: 1, h: 1, minW: 1, minH: 1 }, // Turn right
    ]
  }
];

export function DashboardTemplates({ onApplyTemplate }: DashboardTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", name: "All Templates", icon: BarChart3 },
    { id: "iot", name: "IoT Sensors", icon: Thermometer },
    { id: "home", name: "Smart Home", icon: Home },
    { id: "industrial", name: "Industrial", icon: Bot },
    { id: "automotive", name: "Automotive", icon: Car },
  ];

  const filteredTemplates = selectedCategory === "all" 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const handleApplyTemplate = (template: DashboardTemplate) => {
    // Generate IDs for widgets and layout
    const widgets: WidgetConfig[] = template.widgets.map(widget => ({
      ...widget,
      id: uuidv4()
    }));

    const layout: WidgetLayout[] = template.layout.map((layoutItem, index) => ({
      ...layoutItem,
      i: widgets[index].id
    }));

    onApplyTemplate(widgets, layout);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Dashboard Templates
          </DialogTitle>
          <DialogDescription>
            Choose from pre-built dashboard templates to get started quickly
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="gap-2"
              >
                <category.icon className="h-4 w-4" />
                {category.name}
              </Button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <template.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {template.widgets.length} widgets
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                  
                  {/* Widget Preview */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Includes:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.widgets.slice(0, 6).map((widget, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {widget.type}
                        </Badge>
                      ))}
                      {template.widgets.length > 6 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.widgets.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button 
                    className="w-full"
                    onClick={() => handleApplyTemplate(template)}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates found for this category</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}