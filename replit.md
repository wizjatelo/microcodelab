# µCodeLab v2.0 - IoT Microcontroller Development Platform

## Overview
µCodeLab is a complete IoT development platform that combines Arduino/MicroPython code editing with a React-based dashboard builder for real-time device control and monitoring.

## Current State
- **Version**: 2.0.0 (MVP)
- **Status**: Functional with simulated device data
- **Last Updated**: December 2024

## Project Architecture

### Frontend (client/)
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: Zustand + TanStack Query
- **UI Components**: shadcn/ui (Radix primitives)
- **Code Editor**: Monaco Editor
- **Dashboard Builder**: React Grid Layout
- **Styling**: Tailwind CSS

### Backend (server/)
- **Framework**: Express.js with TypeScript
- **Real-time**: WebSocket (ws library)
- **Storage**: In-memory (MemStorage)
- **Data Simulation**: Simulated sensor data for demo

### Shared (shared/)
- **Schema**: Zod schemas for type safety
- **Types**: TypeScript interfaces for all data models

## Key Features

### 1. Project Management
- Create projects with hardware selection (ESP32, ESP8266, Arduino, RPi Pico)
- Choose programming language (Arduino C++, MicroPython, or both)
- Automatic file creation with starter templates

### 2. Code Editor
- Monaco Editor with syntax highlighting
- Arduino and MicroPython support
- Code annotation parsing (@remote_access, @remote_function, @sensor_data)
- File management with tabs

### 3. Dashboard Builder
- Drag-and-drop widget placement
- Widget types: Button, Slider, Toggle, Gauge, Chart, Value Display, Console
- Grid-based layout system
- Properties panel for widget configuration

### 4. Device Management
- Device registry with status tracking
- Network scanning (simulated)
- Hardware type identification

### 5. Real-time Communication
- WebSocket connection for live data
- Sensor data streaming
- Log message display
- Variable updates

### 6. Deployment (Simulated)
- WiFi OTA deployment workflow
- USB Serial deployment option
- Cloud OTA option
- Progress tracking

## File Structure
```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # shadcn components
│   │   │   ├── widgets/     # Dashboard widgets
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── code-editor.tsx
│   │   │   ├── serial-console.tsx
│   │   │   └── deploy-dialog.tsx
│   │   ├── hooks/
│   │   │   └── use-websocket.ts
│   │   ├── lib/
│   │   │   ├── store.ts     # Zustand store
│   │   │   └── queryClient.ts
│   │   ├── pages/
│   │   │   ├── projects.tsx
│   │   │   ├── editor.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── devices.tsx
│   │   │   └── settings.tsx
│   │   └── App.tsx
├── server/
│   ├── routes.ts            # API + WebSocket
│   └── storage.ts           # In-memory storage
└── shared/
    └── schema.ts            # Zod schemas
```

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Code Files
- `GET /api/projects/:projectId/files` - List project files
- `POST /api/projects/:projectId/files` - Create file
- `PATCH /api/projects/:projectId/files/:fileId` - Update file
- `DELETE /api/projects/:projectId/files/:fileId` - Delete file

### Devices
- `GET /api/devices` - List all devices
- `GET /api/devices/:id` - Get device details
- `POST /api/devices` - Register device
- `PATCH /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Remove device

### Dashboards
- `GET /api/projects/:projectId/dashboards` - List dashboards
- `POST /api/projects/:projectId/dashboards` - Create dashboard
- `PATCH /api/projects/:projectId/dashboards/:dashboardId` - Update dashboard
- `DELETE /api/projects/:projectId/dashboards/:dashboardId` - Delete dashboard

## WebSocket Messages

### From Server
- `{ type: "log", level, message, source, timestamp }` - Log entries
- `{ type: "data", sensor, value, timestamp, unit }` - Sensor readings
- `{ type: "variable_update", name, value, oldValue }` - Variable changes

### To Server
- `{ type: "command", cmd, params, id, timestamp }` - Execute command

## User Preferences
- Dark mode toggle (persisted to localStorage)
- Auto-connect to devices setting
- Default language and board selection

## Development Commands
- `npm run dev` - Start development server (frontend + backend)
- Frontend runs on port 5000
- WebSocket endpoint: `/ws`

## Next Steps / Future Enhancements
1. Integrate actual Arduino-CLI compilation via WebAssembly
2. Add WebSerial API for real USB device programming
3. PostgreSQL database for persistent storage
4. MQTT broker integration for cloud device communication
5. Library/module manager for Arduino and MicroPython packages
6. Multi-device deployment for batch OTA updates
7. Project sharing and export functionality
