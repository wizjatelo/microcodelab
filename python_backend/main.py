"""
FastAPI Backend for µCodeLab v2.0
Complete Python backend with storage, AI, compilers, and device communication
"""

import asyncio
import json
import logging
import uuid
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from esp32_communicator import (
    device_manager,
    ConnectionType,
    CommandResult
)
from storage import (
    storage,
    InsertProject,
    InsertCodeFile,
    InsertDevice,
    InsertDashboard
)
from ai_routes import router as ai_router
from compiler_routes import router as compiler_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Store active WebSocket connections
websocket_clients: List[WebSocket] = []


# ============== Pydantic Models ==============

class ConnectionConfig(BaseModel):
    connection_type: str
    port: Optional[str] = None
    baud_rate: Optional[int] = 115200
    ip_address: Optional[str] = "192.168.1.100"
    http_port: Optional[int] = 80
    ws_port: Optional[int] = 81
    mqtt_broker: Optional[str] = "broker.hivemq.com"
    mqtt_port: Optional[int] = 1883
    mqtt_topic_prefix: Optional[str] = "ucodelab/esp32"


class RawDataRequest(BaseModel):
    data: str


class CommandRequest(BaseModel):
    command: str
    value: Optional[Any] = None


class CommandResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


# ============== WebSocket Broadcasting ==============

async def broadcast_to_websockets(data: Dict):
    """Broadcast data to all connected WebSocket clients"""
    if not websocket_clients:
        return
    
    message = json.dumps(data)
    disconnected = []
    
    for client in websocket_clients:
        try:
            await client.send_text(message)
        except Exception:
            disconnected.append(client)
    
    for client in disconnected:
        if client in websocket_clients:
            websocket_clients.remove(client)


def broadcast_device_data(device_id: str, sensor: str, value: float, unit: str):
    """Broadcast real device data"""
    asyncio.create_task(broadcast_to_websockets({
        "type": "data",
        "deviceId": device_id,
        "sensor": sensor,
        "value": value,
        "timestamp": int(datetime.now().timestamp() * 1000),
        "unit": unit,
    }))


def broadcast_device_log(level: str, message: str, source: str):
    """Broadcast real device log"""
    asyncio.create_task(broadcast_to_websockets({
        "type": "log",
        "id": str(uuid.uuid4()),
        "level": level,
        "message": message,
        "source": source,
        "timestamp": datetime.now().isoformat(),
    }))


# ============== Lifespan ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting µCodeLab Python Backend...")
    
    def on_device_data(data: Dict):
        asyncio.create_task(broadcast_to_websockets({"type": "data", "payload": data}))
    
    device_manager.on_data(on_device_data)
    
    yield
    
    logger.info("Shutting down...")
    device_manager.disconnect()


# ============== Create App ==============

app = FastAPI(
    title="µCodeLab API",
    description="Complete Python backend for µCodeLab v2.0",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ai_router)
app.include_router(compiler_router)


# ============== Health Check ==============

@app.get("/")
async def root():
    return {"status": "online", "service": "µCodeLab v2.0"}


# ============== Projects API ==============

@app.get("/api/projects")
async def get_projects():
    projects = storage.get_projects()
    return [p.model_dump() for p in projects]


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return project.model_dump()


@app.post("/api/projects", status_code=201)
async def create_project(data: InsertProject):
    project = storage.create_project(data)
    return project.model_dump()


@app.patch("/api/projects/{project_id}")
async def update_project(project_id: str, updates: dict):
    project = storage.update_project(project_id, updates)
    if not project:
        raise HTTPException(404, "Project not found")
    return project.model_dump()


@app.delete("/api/projects/{project_id}", status_code=204)
async def delete_project(project_id: str):
    deleted = storage.delete_project(project_id)
    if not deleted:
        raise HTTPException(404, "Project not found")
    return Response(status_code=204)


# ============== Code Files API ==============

@app.get("/api/projects/{project_id}/files")
async def get_project_files(project_id: str):
    files = storage.get_project_files(project_id)
    return [f.model_dump() for f in files]


@app.post("/api/projects/{project_id}/files", status_code=201)
async def create_code_file(project_id: str, data: dict):
    file_data = InsertCodeFile(
        projectId=project_id,
        name=data.get("name", "untitled"),
        content=data.get("content", ""),
        language=data.get("language", "arduino")
    )
    code_file = storage.create_code_file(file_data)
    return code_file.model_dump()


@app.patch("/api/projects/{project_id}/files/{file_id}")
async def update_code_file(project_id: str, file_id: str, updates: dict):
    code_file = storage.update_code_file(file_id, updates)
    if not code_file:
        raise HTTPException(404, "File not found")
    return code_file.model_dump()


@app.delete("/api/projects/{project_id}/files/{file_id}", status_code=204)
async def delete_code_file(project_id: str, file_id: str):
    deleted = storage.delete_code_file(file_id)
    if not deleted:
        raise HTTPException(404, "File not found")
    return Response(status_code=204)


# ============== Devices API ==============

@app.get("/api/devices")
async def get_devices():
    devices = storage.get_devices()
    return [d.model_dump() for d in devices]


@app.get("/api/devices/{device_id}")
async def get_device(device_id: str):
    device = storage.get_device(device_id)
    if not device:
        raise HTTPException(404, "Device not found")
    return device.model_dump()


@app.post("/api/devices", status_code=201)
async def create_device(data: InsertDevice):
    device = storage.create_device(data)
    return device.model_dump()


@app.patch("/api/devices/{device_id}")
async def update_device(device_id: str, updates: dict):
    device = storage.update_device(device_id, updates)
    if not device:
        raise HTTPException(404, "Device not found")
    return device.model_dump()


@app.delete("/api/devices/{device_id}", status_code=204)
async def delete_device(device_id: str):
    deleted = storage.delete_device(device_id)
    if not deleted:
        raise HTTPException(404, "Device not found")
    return Response(status_code=204)


# ============== Dashboards API ==============

@app.get("/api/projects/{project_id}/dashboards")
async def get_project_dashboards(project_id: str):
    dashboards = storage.get_project_dashboards(project_id)
    return [d.model_dump() for d in dashboards]


@app.post("/api/projects/{project_id}/dashboards", status_code=201)
async def create_dashboard(project_id: str, data: dict):
    dashboard_data = InsertDashboard(
        projectId=project_id,
        name=data.get("name", "Dashboard"),
        widgets=data.get("widgets", []),
        layout=data.get("layout", [])
    )
    dashboard = storage.create_dashboard(dashboard_data)
    return dashboard.model_dump()


@app.patch("/api/projects/{project_id}/dashboards/{dashboard_id}")
async def update_dashboard(project_id: str, dashboard_id: str, updates: dict):
    dashboard = storage.update_dashboard(dashboard_id, updates)
    if not dashboard:
        raise HTTPException(404, "Dashboard not found")
    return dashboard.model_dump()


@app.delete("/api/projects/{project_id}/dashboards/{dashboard_id}", status_code=204)
async def delete_dashboard(project_id: str, dashboard_id: str):
    deleted = storage.delete_dashboard(dashboard_id)
    if not deleted:
        raise HTTPException(404, "Dashboard not found")
    return Response(status_code=204)


# ============== Device Communication API ==============

@app.get("/api/status")
async def get_connection_status():
    return device_manager.get_status()


@app.get("/api/serial/ports")
async def list_serial_ports():
    ports = device_manager.list_serial_ports()
    return {"ports": ports}


@app.post("/api/connect")
async def connect_device(config: ConnectionConfig):
    try:
        conn_type_map = {
            "serial": ConnectionType.SERIAL,
            "wifi": ConnectionType.WIFI,
            "websocket": ConnectionType.WEBSOCKET,
            "mqtt": ConnectionType.MQTT
        }
        
        conn_type = conn_type_map.get(config.connection_type.lower())
        if not conn_type:
            raise HTTPException(400, f"Invalid connection type: {config.connection_type}")
        
        device_manager.configure(
            connection_type=conn_type,
            port=config.port or "",
            baud_rate=config.baud_rate or 115200,
            ip_address=config.ip_address or "192.168.1.100",
            http_port=config.http_port or 80,
            ws_port=config.ws_port or 81,
            mqtt_broker=config.mqtt_broker or "broker.hivemq.com",
            mqtt_port=config.mqtt_port or 1883,
            mqtt_topic_prefix=config.mqtt_topic_prefix or "ucodelab/esp32"
        )
        
        success = device_manager.connect(conn_type)
        
        if success:
            return {
                "success": True,
                "message": f"Connected via {config.connection_type}",
                "status": device_manager.get_status()
            }
        else:
            raise HTTPException(500, "Connection failed")
            
    except Exception as e:
        logger.error(f"Connection error: {e}")
        raise HTTPException(500, str(e))


@app.post("/api/disconnect")
async def disconnect_device():
    device_manager.disconnect()
    return {"success": True, "message": "Disconnected"}


@app.post("/api/command", response_model=CommandResponse)
async def send_command(request: CommandRequest):
    result = device_manager.send_command(request.command, request.value)
    return CommandResponse(
        success=result.success,
        message=result.message,
        data=result.data
    )


@app.get("/api/sensor-data")
async def get_sensor_data():
    data = device_manager.get_sensor_data()
    if data:
        return {
            "success": True,
            "data": {
                "temperature": data.temperature,
                "humidity": data.humidity,
                "pressure": data.pressure,
                "light": data.light,
                "led_state": data.led_state,
                "raw": data.raw_data,
                "timestamp": data.timestamp
            }
        }
    return {"success": False, "message": "No data available"}


@app.post("/api/raw")
async def send_raw_data(request: RawDataRequest):
    result = device_manager.send_raw(request.data)
    return CommandResponse(success=result.success, message=result.message)


@app.get("/api/raw")
async def read_raw_data():
    data = device_manager.read_raw()
    if data:
        return {"success": True, "data": data}
    return {"success": False, "message": "No data in queue"}


@app.get("/api/protocols")
async def get_supported_protocols():
    return {
        "protocols": [
            {"id": "serial", "name": "USB Serial", "description": "Direct USB/UART connection", "requires": ["port", "baud_rate"]},
            {"id": "wifi", "name": "WiFi (HTTP)", "description": "HTTP REST API over WiFi", "requires": ["ip_address", "http_port"]},
            {"id": "mqtt", "name": "MQTT", "description": "MQTT publish/subscribe", "requires": ["mqtt_broker", "mqtt_port", "mqtt_topic_prefix"]}
        ]
    }


# ============== WebSocket Endpoint ==============

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    websocket_clients.append(websocket)
    logger.info(f"WebSocket client connected. Total: {len(websocket_clients)}")
    
    try:
        # Send initial connection message
        await websocket.send_json({
            "type": "log",
            "id": str(uuid.uuid4()),
            "level": "info",
            "message": "Connected to µCodeLab server - waiting for device connection",
            "source": "server",
            "timestamp": datetime.now().isoformat(),
        })
        
        # Send current status
        await websocket.send_json({
            "type": "status",
            "payload": device_manager.get_status()
        })
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            msg_type = message.get("type")
            payload = message.get("payload", {})
            
            if msg_type == "command":
                result = device_manager.send_command(
                    payload.get("command"),
                    payload.get("value")
                )
                await websocket.send_json({
                    "type": "command_result",
                    "payload": {
                        "success": result.success,
                        "message": result.message,
                        "data": result.data
                    }
                })
            
            elif msg_type == "get_status":
                await websocket.send_json({
                    "type": "status",
                    "payload": device_manager.get_status()
                })
            
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if websocket in websocket_clients:
            websocket_clients.remove(websocket)


# ============== Run ==============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
