import { z } from "zod";

// Hardware types supported
export const hardwareTypes = ["esp32", "esp8266", "arduino_uno", "arduino_nano_33_iot", "rpi_pico"] as const;
export type HardwareType = typeof hardwareTypes[number];

// Programming languages
export const programmingLanguages = ["arduino", "micropython", "both"] as const;
export type ProgrammingLanguage = typeof programmingLanguages[number];

// Device connection status
export const connectionStatuses = ["online", "offline", "connecting"] as const;
export type ConnectionStatus = typeof connectionStatuses[number];

// Deployment methods
export const deploymentMethods = ["wifi_ota", "usb_serial", "cloud_ota"] as const;
export type DeploymentMethod = typeof deploymentMethods[number];

// Widget types for dashboard builder
export const widgetTypes = [
  "button", "slider", "toggle", "joystick", "dropdown",
  "gauge", "chart", "value_display", "log_console", "map"
] as const;
export type WidgetType = typeof widgetTypes[number];

// Log levels
export const logLevels = ["info", "warning", "error", "debug"] as const;
export type LogLevel = typeof logLevels[number];

// Project schema
export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  hardware: z.enum(hardwareTypes),
  language: z.enum(programmingLanguages),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertProjectSchema = projectSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Project = z.infer<typeof projectSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;

// Code file schema
export const codeFileSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  content: z.string(),
  language: z.enum(["arduino", "micropython"]),
});

export const insertCodeFileSchema = codeFileSchema.omit({ id: true });
export type CodeFile = z.infer<typeof codeFileSchema>;
export type InsertCodeFile = z.infer<typeof insertCodeFileSchema>;

// Device schema
export const deviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  hardware: z.enum(hardwareTypes),
  ipAddress: z.string().optional(),
  status: z.enum(connectionStatuses),
  lastSeen: z.string().optional(),
  projectId: z.string().optional(),
});

export const insertDeviceSchema = deviceSchema.omit({ id: true, lastSeen: true });
export type Device = z.infer<typeof deviceSchema>;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

// Widget configuration schema
export const widgetConfigSchema = z.object({
  id: z.string(),
  type: z.enum(widgetTypes),
  label: z.string(),
  deviceId: z.string().optional(), // Device to bind this widget to
  variableName: z.string().optional(),
  functionName: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  unit: z.string().optional(),
  color: z.string().optional(),
});

export type WidgetConfig = z.infer<typeof widgetConfigSchema>;

// Widget position and size for grid layout
export const widgetLayoutSchema = z.object({
  i: z.string(), // widget id
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
});

export type WidgetLayout = z.infer<typeof widgetLayoutSchema>;

// Dashboard schema
export const dashboardSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  widgets: z.array(widgetConfigSchema),
  layout: z.array(widgetLayoutSchema),
});

export const insertDashboardSchema = dashboardSchema.omit({ id: true });
export type Dashboard = z.infer<typeof dashboardSchema>;
export type InsertDashboard = z.infer<typeof insertDashboardSchema>;

// Remote variable schema (parsed from annotations)
export const remoteVariableSchema = z.object({
  name: z.string(),
  type: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  annotation: z.enum(["remote_access", "sensor_data", "critical", "dashboard_only"]),
});

export type RemoteVariable = z.infer<typeof remoteVariableSchema>;

// Remote function schema (parsed from annotations)
export const remoteFunctionSchema = z.object({
  name: z.string(),
  returnType: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.string(),
  })),
});

export type RemoteFunction = z.infer<typeof remoteFunctionSchema>;

// Deployment status
export const deploymentStatusSchema = z.object({
  status: z.enum(["idle", "compiling", "uploading", "verifying", "complete", "error"]),
  progress: z.number().min(0).max(100),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type DeploymentStatus = z.infer<typeof deploymentStatusSchema>;

// Log entry schema
export const logEntrySchema = z.object({
  id: z.string(),
  level: z.enum(logLevels),
  message: z.string(),
  source: z.string(),
  timestamp: z.string(),
});

export type LogEntry = z.infer<typeof logEntrySchema>;

// Sensor data point
export const sensorDataPointSchema = z.object({
  sensor: z.string(),
  value: z.union([z.number(), z.string(), z.boolean()]),
  timestamp: z.number(),
  unit: z.string().optional(),
});

export type SensorDataPoint = z.infer<typeof sensorDataPointSchema>;

// WebSocket message types
export const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("command"),
    cmd: z.string(),
    params: z.record(z.unknown()).optional(),
    id: z.string(),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("data"),
    sensor: z.string(),
    value: z.union([z.number(), z.string(), z.boolean()]),
    timestamp: z.number(),
    unit: z.string().optional(),
  }),
  z.object({
    type: z.literal("variable_update"),
    name: z.string(),
    value: z.union([z.number(), z.string(), z.boolean()]),
    oldValue: z.union([z.number(), z.string(), z.boolean()]).optional(),
  }),
  z.object({
    type: z.literal("log"),
    level: z.enum(logLevels),
    message: z.string(),
    source: z.string(),
    timestamp: z.number(),
  }),
]);

export type WsMessage = z.infer<typeof wsMessageSchema>;

// User schema (keeping existing)
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string(),
});

export const insertUserSchema = userSchema.omit({ id: true });
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
