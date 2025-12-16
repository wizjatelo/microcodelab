import type {
  Project,
  InsertProject,
  Device,
  InsertDevice,
  CodeFile,
  InsertCodeFile,
  Dashboard,
  InsertDashboard,
  LogEntry,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Code Files
  getProjectFiles(projectId: string): Promise<CodeFile[]>;
  getCodeFile(id: string): Promise<CodeFile | undefined>;
  createCodeFile(file: InsertCodeFile): Promise<CodeFile>;
  updateCodeFile(id: string, updates: Partial<CodeFile>): Promise<CodeFile | undefined>;
  deleteCodeFile(id: string): Promise<boolean>;

  // Devices
  getDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined>;
  deleteDevice(id: string): Promise<boolean>;

  // Dashboards
  getProjectDashboards(projectId: string): Promise<Dashboard[]>;
  getDashboard(id: string): Promise<Dashboard | undefined>;
  createDashboard(dashboard: InsertDashboard): Promise<Dashboard>;
  updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard | undefined>;
  deleteDashboard(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project> = new Map();
  private codeFiles: Map<string, CodeFile> = new Map();
  private devices: Map<string, Device> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();

  constructor() {
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample project
    const project1: Project = {
      id: "proj-1",
      name: "Smart Home Sensor",
      description: "Temperature and humidity monitoring system",
      hardware: "esp32",
      language: "arduino",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    };
    this.projects.set(project1.id, project1);

    const project2: Project = {
      id: "proj-2",
      name: "LED Controller",
      description: "RGB LED strip controller with WiFi",
      hardware: "esp8266",
      language: "micropython",
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    };
    this.projects.set(project2.id, project2);

    // Sample code file
    const file1: CodeFile = {
      id: "file-1",
      projectId: "proj-1",
      name: "main.ino",
      language: "arduino",
      content: `// Smart Home Sensor - Main Sketch
#include <WiFi.h>
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

// @sensor_data
float temperature = 0.0;

// @sensor_data
float humidity = 0.0;

// @remote_access
bool ledState = false;

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.println("Smart Home Sensor Ready!");
}

void loop() {
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();
  
  digitalWrite(LED_BUILTIN, ledState);
  
  delay(2000);
}

// @remote_function
void toggleLED() {
  ledState = !ledState;
  Serial.println(ledState ? "LED ON" : "LED OFF");
}
`,
    };
    this.codeFiles.set(file1.id, file1);

    // Sample device
    const device1: Device = {
      id: "dev-1",
      name: "Living Room Sensor",
      hardware: "esp32",
      ipAddress: "192.168.1.101",
      status: "online",
      lastSeen: new Date().toISOString(),
      projectId: "proj-1",
    };
    this.devices.set(device1.id, device1);

    const device2: Device = {
      id: "dev-2",
      name: "Kitchen Controller",
      hardware: "esp8266",
      ipAddress: "192.168.1.102",
      status: "offline",
      lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    };
    this.devices.set(device2.id, device2);

    // Sample dashboard
    const dashboard1: Dashboard = {
      id: "dash-1",
      projectId: "proj-1",
      name: "Main Dashboard",
      widgets: [
        {
          id: "w1",
          type: "gauge",
          label: "Temperature",
          variableName: "temperature",
          min: 0,
          max: 50,
          unit: "°C",
        },
        {
          id: "w2",
          type: "gauge",
          label: "Humidity",
          variableName: "humidity",
          min: 0,
          max: 100,
          unit: "%",
        },
        {
          id: "w3",
          type: "toggle",
          label: "LED Control",
          variableName: "ledState",
        },
      ],
      layout: [
        { i: "w1", x: 0, y: 0, w: 2, h: 2 },
        { i: "w2", x: 2, y: 0, w: 2, h: 2 },
        { i: "w3", x: 4, y: 0, w: 2, h: 1 },
      ],
    };
    this.dashboards.set(dashboard1.id, dashboard1);
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(data: InsertProject): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      ...data,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    
    // Create default file for the project
    const language = data.language === "micropython" ? "micropython" : "arduino";
    const fileName = language === "micropython" ? "main.py" : "main.ino";
    const content = language === "micropython"
      ? `# ${data.name} - MicroPython Script
from machine import Pin
import time

# @remote_access
led_state = False

led = Pin(2, Pin.OUT)

def setup():
    print("Device ready!")

# @remote_function
def toggle_led():
    global led_state
    led_state = not led_state
    led.value(led_state)

setup()
while True:
    led.value(led_state)
    time.sleep(0.1)
`
      : `// ${data.name} - Arduino Sketch

// @remote_access
int ledState = LOW;

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.println("Device ready!");
}

void loop() {
  digitalWrite(LED_BUILTIN, ledState);
  delay(100);
}

// @remote_function
void toggleLED() {
  ledState = !ledState;
}
`;

    const file: CodeFile = {
      id: randomUUID(),
      projectId: project.id,
      name: fileName,
      language,
      content,
    };
    this.codeFiles.set(file.id, file);

    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updated = { ...project, ...updates, updatedAt: new Date().toISOString() };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    // Delete associated files and dashboards
    for (const [fileId, file] of this.codeFiles) {
      if (file.projectId === id) {
        this.codeFiles.delete(fileId);
      }
    }
    for (const [dashId, dash] of this.dashboards) {
      if (dash.projectId === id) {
        this.dashboards.delete(dashId);
      }
    }
    return this.projects.delete(id);
  }

  // Code Files
  async getProjectFiles(projectId: string): Promise<CodeFile[]> {
    return Array.from(this.codeFiles.values()).filter((f) => f.projectId === projectId);
  }

  async getCodeFile(id: string): Promise<CodeFile | undefined> {
    return this.codeFiles.get(id);
  }

  async createCodeFile(data: InsertCodeFile): Promise<CodeFile> {
    const file: CodeFile = {
      ...data,
      id: randomUUID(),
    };
    this.codeFiles.set(file.id, file);
    
    // Update project timestamp
    const project = this.projects.get(data.projectId);
    if (project) {
      this.projects.set(project.id, { ...project, updatedAt: new Date().toISOString() });
    }
    
    return file;
  }

  async updateCodeFile(id: string, updates: Partial<CodeFile>): Promise<CodeFile | undefined> {
    const file = this.codeFiles.get(id);
    if (!file) return undefined;
    
    const updated = { ...file, ...updates };
    this.codeFiles.set(id, updated);
    
    // Update project timestamp
    const project = this.projects.get(file.projectId);
    if (project) {
      this.projects.set(project.id, { ...project, updatedAt: new Date().toISOString() });
    }
    
    return updated;
  }

  async deleteCodeFile(id: string): Promise<boolean> {
    return this.codeFiles.delete(id);
  }

  // Devices
  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async createDevice(data: InsertDevice): Promise<Device> {
    const device: Device = {
      ...data,
      id: randomUUID(),
      lastSeen: new Date().toISOString(),
    };
    this.devices.set(device.id, device);
    return device;
  }

  async updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    
    const updated = { ...device, ...updates };
    this.devices.set(id, updated);
    return updated;
  }

  async deleteDevice(id: string): Promise<boolean> {
    return this.devices.delete(id);
  }

  // Dashboards
  async getProjectDashboards(projectId: string): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values()).filter((d) => d.projectId === projectId);
  }

  async getDashboard(id: string): Promise<Dashboard | undefined> {
    return this.dashboards.get(id);
  }

  async createDashboard(data: InsertDashboard): Promise<Dashboard> {
    const dashboard: Dashboard = {
      ...data,
      id: randomUUID(),
    };
    this.dashboards.set(dashboard.id, dashboard);
    return dashboard;
  }

  async updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard | undefined> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return undefined;
    
    const updated = { ...dashboard, ...updates };
    this.dashboards.set(id, updated);
    return updated;
  }

  async deleteDashboard(id: string): Promise<boolean> {
    return this.dashboards.delete(id);
  }
}

export const storage = new MemStorage();
