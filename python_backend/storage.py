"""
In-Memory Storage for µCodeLab
Stores projects, files, devices, and dashboards
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


# ============== Pydantic Models ==============

class Project(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    hardware: str  # esp32, esp8266, arduino_uno, etc.
    language: str  # arduino, micropython, both
    createdAt: str
    updatedAt: str


class InsertProject(BaseModel):
    name: str
    description: Optional[str] = ""
    hardware: str
    language: str


class CodeFile(BaseModel):
    id: str
    projectId: str
    name: str
    content: str
    language: str  # arduino, micropython


class InsertCodeFile(BaseModel):
    projectId: str
    name: str
    content: str
    language: str


class Device(BaseModel):
    id: str
    name: str
    hardware: str
    ipAddress: Optional[str] = None
    status: str  # online, offline, connecting
    lastSeen: Optional[str] = None
    projectId: Optional[str] = None


class InsertDevice(BaseModel):
    name: str
    hardware: str
    ipAddress: Optional[str] = None
    status: str
    projectId: Optional[str] = None


class WidgetConfig(BaseModel):
    id: str
    type: str
    label: str
    deviceId: Optional[str] = None
    variableName: Optional[str] = None
    functionName: Optional[str] = None
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None
    value: Optional[Any] = None
    unit: Optional[str] = None
    color: Optional[str] = None
    # Add more fields as needed


class WidgetLayout(BaseModel):
    i: str
    x: int
    y: int
    w: int
    h: int
    minW: Optional[int] = None
    minH: Optional[int] = None


class Dashboard(BaseModel):
    id: str
    projectId: str
    name: str
    widgets: List[Dict[str, Any]] = []
    layout: List[Dict[str, Any]] = []


class InsertDashboard(BaseModel):
    projectId: str
    name: str
    widgets: List[Dict[str, Any]] = []
    layout: List[Dict[str, Any]] = []


# ============== Storage Class ==============

class MemStorage:
    def __init__(self):
        self.projects: Dict[str, Project] = {}
        self.code_files: Dict[str, CodeFile] = {}
        self.devices: Dict[str, Device] = {}
        self.dashboards: Dict[str, Dashboard] = {}
        self._initialize_sample_data()

    def _initialize_sample_data(self):
        """Initialize with sample data"""
        now = datetime.now()
        
        # Sample project 1
        project1 = Project(
            id="proj-1",
            name="Smart Home Sensor",
            description="Temperature and humidity monitoring system",
            hardware="esp32",
            language="arduino",
            createdAt=(now - timedelta(days=7)).isoformat(),
            updatedAt=(now - timedelta(days=1)).isoformat(),
        )
        self.projects[project1.id] = project1

        # Sample project 2
        project2 = Project(
            id="proj-2",
            name="LED Controller",
            description="RGB LED strip controller with WiFi",
            hardware="esp8266",
            language="micropython",
            createdAt=(now - timedelta(days=14)).isoformat(),
            updatedAt=(now - timedelta(days=3)).isoformat(),
        )
        self.projects[project2.id] = project2

        # Sample code file
        file1 = CodeFile(
            id="file-1",
            projectId="proj-1",
            name="main.ino",
            language="arduino",
            content='''// Smart Home Sensor - Main Sketch
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
''',
        )
        self.code_files[file1.id] = file1

        # Sample devices
        device1 = Device(
            id="dev-1",
            name="Living Room Sensor",
            hardware="esp32",
            ipAddress="192.168.1.101",
            status="online",
            lastSeen=now.isoformat(),
            projectId="proj-1",
        )
        self.devices[device1.id] = device1

        device2 = Device(
            id="dev-2",
            name="Kitchen Controller",
            hardware="esp8266",
            ipAddress="192.168.1.102",
            status="offline",
            lastSeen=(now - timedelta(hours=2)).isoformat(),
        )
        self.devices[device2.id] = device2

        # Sample dashboard
        dashboard1 = Dashboard(
            id="dash-1",
            projectId="proj-1",
            name="Main Dashboard",
            widgets=[
                {"id": "w1", "type": "gauge", "label": "Temperature", "variableName": "temperature", "min": 0, "max": 50, "unit": "°C"},
                {"id": "w2", "type": "gauge", "label": "Humidity", "variableName": "humidity", "min": 0, "max": 100, "unit": "%"},
                {"id": "w3", "type": "toggle", "label": "LED Control", "variableName": "ledState"},
            ],
            layout=[
                {"i": "w1", "x": 0, "y": 0, "w": 2, "h": 2},
                {"i": "w2", "x": 2, "y": 0, "w": 2, "h": 2},
                {"i": "w3", "x": 4, "y": 0, "w": 2, "h": 1},
            ],
        )
        self.dashboards[dashboard1.id] = dashboard1

    # ============== Projects ==============
    
    def get_projects(self) -> List[Project]:
        return sorted(
            self.projects.values(),
            key=lambda p: p.updatedAt,
            reverse=True
        )

    def get_project(self, id: str) -> Optional[Project]:
        return self.projects.get(id)

    def create_project(self, data: InsertProject) -> Project:
        now = datetime.now().isoformat()
        project = Project(
            id=str(uuid.uuid4()),
            name=data.name,
            description=data.description,
            hardware=data.hardware,
            language=data.language,
            createdAt=now,
            updatedAt=now,
        )
        self.projects[project.id] = project

        # Create default file
        language = "micropython" if data.language == "micropython" else "arduino"
        file_name = "main.py" if language == "micropython" else "main.ino"
        
        if language == "micropython":
            content = f'''# {data.name} - MicroPython Script
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
'''
        else:
            content = f'''// {data.name} - Arduino Sketch

// @remote_access
int ledState = LOW;

void setup() {{
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.println("Device ready!");
}}

void loop() {{
  digitalWrite(LED_BUILTIN, ledState);
  delay(100);
}}

// @remote_function
void toggleLED() {{
  ledState = !ledState;
}}
'''

        code_file = CodeFile(
            id=str(uuid.uuid4()),
            projectId=project.id,
            name=file_name,
            language=language,
            content=content,
        )
        self.code_files[code_file.id] = code_file

        return project

    def update_project(self, id: str, updates: dict) -> Optional[Project]:
        project = self.projects.get(id)
        if not project:
            return None
        
        updated_data = project.model_dump()
        updated_data.update(updates)
        updated_data["updatedAt"] = datetime.now().isoformat()
        
        updated_project = Project(**updated_data)
        self.projects[id] = updated_project
        return updated_project

    def delete_project(self, id: str) -> bool:
        if id not in self.projects:
            return False
        
        # Delete associated files
        files_to_delete = [fid for fid, f in self.code_files.items() if f.projectId == id]
        for fid in files_to_delete:
            del self.code_files[fid]
        
        # Delete associated dashboards
        dashboards_to_delete = [did for did, d in self.dashboards.items() if d.projectId == id]
        for did in dashboards_to_delete:
            del self.dashboards[did]
        
        del self.projects[id]
        return True

    # ============== Code Files ==============
    
    def get_project_files(self, project_id: str) -> List[CodeFile]:
        return [f for f in self.code_files.values() if f.projectId == project_id]

    def get_code_file(self, id: str) -> Optional[CodeFile]:
        return self.code_files.get(id)

    def create_code_file(self, data: InsertCodeFile) -> CodeFile:
        code_file = CodeFile(
            id=str(uuid.uuid4()),
            projectId=data.projectId,
            name=data.name,
            content=data.content,
            language=data.language,
        )
        self.code_files[code_file.id] = code_file
        
        # Update project timestamp
        if data.projectId in self.projects:
            self.update_project(data.projectId, {})
        
        return code_file

    def update_code_file(self, id: str, updates: dict) -> Optional[CodeFile]:
        code_file = self.code_files.get(id)
        if not code_file:
            return None
        
        updated_data = code_file.model_dump()
        updated_data.update(updates)
        
        updated_file = CodeFile(**updated_data)
        self.code_files[id] = updated_file
        
        # Update project timestamp
        if code_file.projectId in self.projects:
            self.update_project(code_file.projectId, {})
        
        return updated_file

    def delete_code_file(self, id: str) -> bool:
        if id not in self.code_files:
            return False
        del self.code_files[id]
        return True

    # ============== Devices ==============
    
    def get_devices(self) -> List[Device]:
        return list(self.devices.values())

    def get_device(self, id: str) -> Optional[Device]:
        return self.devices.get(id)

    def create_device(self, data: InsertDevice) -> Device:
        device = Device(
            id=str(uuid.uuid4()),
            name=data.name,
            hardware=data.hardware,
            ipAddress=data.ipAddress,
            status=data.status,
            lastSeen=datetime.now().isoformat(),
            projectId=data.projectId,
        )
        self.devices[device.id] = device
        return device

    def update_device(self, id: str, updates: dict) -> Optional[Device]:
        device = self.devices.get(id)
        if not device:
            return None
        
        updated_data = device.model_dump()
        updated_data.update(updates)
        
        updated_device = Device(**updated_data)
        self.devices[id] = updated_device
        return updated_device

    def delete_device(self, id: str) -> bool:
        if id not in self.devices:
            return False
        del self.devices[id]
        return True

    # ============== Dashboards ==============
    
    def get_project_dashboards(self, project_id: str) -> List[Dashboard]:
        return [d for d in self.dashboards.values() if d.projectId == project_id]

    def get_dashboard(self, id: str) -> Optional[Dashboard]:
        return self.dashboards.get(id)

    def create_dashboard(self, data: InsertDashboard) -> Dashboard:
        dashboard = Dashboard(
            id=str(uuid.uuid4()),
            projectId=data.projectId,
            name=data.name,
            widgets=data.widgets,
            layout=data.layout,
        )
        self.dashboards[dashboard.id] = dashboard
        return dashboard

    def update_dashboard(self, id: str, updates: dict) -> Optional[Dashboard]:
        dashboard = self.dashboards.get(id)
        if not dashboard:
            return None
        
        updated_data = dashboard.model_dump()
        updated_data.update(updates)
        
        updated_dashboard = Dashboard(**updated_data)
        self.dashboards[id] = updated_dashboard
        return updated_dashboard

    def delete_dashboard(self, id: str) -> bool:
        if id not in self.dashboards:
            return False
        del self.dashboards[id]
        return True


# Global storage instance
storage = MemStorage()
