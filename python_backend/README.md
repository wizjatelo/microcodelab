# µCodeLab v2.0 - Python Backend

Complete Python backend for µCodeLab, handling all API endpoints including:
- Projects, Files, Devices, Dashboards (CRUD)
- AI Integration (NVIDIA API)
- Arduino CLI compilation and upload
- MicroPython mpy-cross compilation
- Device communication (Serial, WiFi, MQTT)
- Real-time WebSocket updates

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python start.py
# or
uvicorn main:app --reload --port 8000
```

The server runs on `http://localhost:8000`

## Environment Variables

Create a `.env` file or set these environment variables:

```env
# AI Integration (required for AI features)
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_API_ENDPOINT=https://integrate.api.nvidia.com/v1/chat/completions
NVIDIA_MODEL=deepseek-v3_2

# Compiler paths (optional, defaults to PATH lookup)
ARDUINO_CLI_PATH=arduino-cli
MPY_CROSS_PATH=mpy-cross
```

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/{id}` - Get project by ID
- `POST /api/projects` - Create project
- `PATCH /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

### Code Files
- `GET /api/projects/{id}/files` - List project files
- `POST /api/projects/{id}/files` - Create file
- `PATCH /api/projects/{id}/files/{fileId}` - Update file
- `DELETE /api/projects/{id}/files/{fileId}` - Delete file

### Devices
- `GET /api/devices` - List all devices
- `GET /api/devices/{id}` - Get device by ID
- `POST /api/devices` - Create device
- `PATCH /api/devices/{id}` - Update device
- `DELETE /api/devices/{id}` - Delete device

### Dashboards
- `GET /api/projects/{id}/dashboards` - List project dashboards
- `POST /api/projects/{id}/dashboards` - Create dashboard
- `PATCH /api/projects/{id}/dashboards/{dashId}` - Update dashboard
- `DELETE /api/projects/{id}/dashboards/{dashId}` - Delete dashboard

### AI
- `POST /api/ai/complete` - Code completion
- `POST /api/ai/analyze` - Code analysis
- `POST /api/ai/chat` - Chat with AI
- `POST /api/ai/generate` - Generate code
- `POST /api/ai/review` - Code review
- `POST /api/ai/debug` - Debug errors
- `POST /api/ai/edit-code` - AI code editing
- `POST /api/ai/refactor` - Code refactoring

### Compilers
- `GET /api/arduino/status` - Check Arduino CLI
- `GET /api/arduino/boards` - List connected boards
- `POST /api/arduino/compile` - Compile sketch
- `POST /api/arduino/upload` - Upload to board
- `GET /api/micropython/status` - Check mpy-cross
- `POST /api/micropython/compile` - Compile to .mpy
- `POST /api/micropython/validate` - Validate syntax

### Device Communication
- `GET /api/status` - Connection status
- `GET /api/serial/ports` - List serial ports
- `POST /api/connect` - Connect to device
- `POST /api/disconnect` - Disconnect
- `POST /api/command` - Send command
- `GET /api/sensor-data` - Get sensor data
- `POST /api/raw` - Send raw data
- `GET /api/raw` - Read raw data

### WebSocket
- `ws://localhost:8000/ws` - Real-time updates

## Running with Frontend

1. Start Python backend:
   ```bash
   cd python_backend
   python start.py
   ```

2. Start frontend (in another terminal):
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser
