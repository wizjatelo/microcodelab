import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { registerAIRoutes } from "./ai-routes";
import { arduinoCompiler } from "./arduino-compiler";
import { micropythonCompiler } from "./micropython-compiler";
import {
  insertProjectSchema,
  insertDeviceSchema,
  insertCodeFileSchema,
  insertDashboardSchema,
} from "@shared/schema";
import type { LogEntry, SensorDataPoint } from "@shared/schema";
import { randomUUID } from "crypto";

// Store connected WebSocket clients
const wsClients = new Set<WebSocket>();

// Simulated device data for demo
let simulatedData = {
  temperature: 22.5,
  humidity: 45.0,
  ledState: false,
};

// Simulate sensor data updates
function simulateSensorData() {
  setInterval(() => {
    // Simulate temperature fluctuation
    simulatedData.temperature = 20 + Math.random() * 10;
    simulatedData.humidity = 40 + Math.random() * 20;

    // Broadcast to all connected clients - use the seeded device ID
    const deviceId = "dev-1"; // Matches the seeded device in storage
    
    const message = JSON.stringify({
      type: "data",
      deviceId,
      sensor: "temperature",
      value: Math.round(simulatedData.temperature * 10) / 10,
      timestamp: Date.now(),
      unit: "°C",
    });

    wsClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    const humidityMessage = JSON.stringify({
      type: "data",
      deviceId,
      sensor: "humidity",
      value: Math.round(simulatedData.humidity * 10) / 10,
      timestamp: Date.now(),
      unit: "%",
    });

    wsClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(humidityMessage);
      }
    });
  }, 3000);
}

// Send log messages periodically
function simulateLogs() {
  const logMessages = [
    { level: "info", message: "Device heartbeat received", source: "device" },
    { level: "debug", message: "Sensor reading completed", source: "sensor" },
    { level: "info", message: "WiFi connection stable", source: "network" },
  ];

  setInterval(() => {
    const randomLog = logMessages[Math.floor(Math.random() * logMessages.length)];
    const log: LogEntry = {
      id: randomUUID(),
      level: randomLog.level as LogEntry["level"],
      message: randomLog.message,
      source: randomLog.source,
      timestamp: new Date().toISOString(),
    };

    const message = JSON.stringify({
      type: "log",
      ...log,
    });

    wsClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }, 5000);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // WebSocket server on distinct path
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    wsClients.add(ws);

    // Send initial connection message
    ws.send(JSON.stringify({
      type: "log",
      id: randomUUID(),
      level: "info",
      message: "Connected to µCodeLab server",
      source: "server",
      timestamp: new Date().toISOString(),
    }));

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log("Received message:", message);

        // Handle commands from dashboard
        if (message.type === "command") {
          if (message.cmd === "toggleLED") {
            simulatedData.ledState = !simulatedData.ledState;
            
            // Broadcast variable update
            const update = JSON.stringify({
              type: "variable_update",
              deviceId: "dev-1",
              name: "ledState",
              value: simulatedData.ledState,
              oldValue: !simulatedData.ledState,
            });
            
            wsClients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(update);
              }
            });
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
      wsClients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      wsClients.delete(ws);
    });
  });

  // Start simulations
  simulateSensorData();
  simulateLogs();

  // ============== PROJECTS ==============
  app.get("/api/projects", async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const parsed = insertProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid project data", details: parsed.error });
      }
      const project = await storage.createProject(parsed.data);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // ============== CODE FILES ==============
  app.get("/api/projects/:projectId/files", async (req, res) => {
    try {
      const files = await storage.getProjectFiles(req.params.projectId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.post("/api/projects/:projectId/files", async (req, res) => {
    try {
      const data = { ...req.body, projectId: req.params.projectId };
      const parsed = insertCodeFileSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid file data", details: parsed.error });
      }
      const file = await storage.createCodeFile(parsed.data);
      res.status(201).json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to create file" });
    }
  });

  app.patch("/api/projects/:projectId/files/:fileId", async (req, res) => {
    try {
      const file = await storage.updateCodeFile(req.params.fileId, req.body);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to update file" });
    }
  });

  app.delete("/api/projects/:projectId/files/:fileId", async (req, res) => {
    try {
      const deleted = await storage.deleteCodeFile(req.params.fileId);
      if (!deleted) {
        return res.status(404).json({ error: "File not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // ============== DEVICES ==============
  app.get("/api/devices", async (_req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  });

  app.get("/api/devices/:id", async (req, res) => {
    try {
      const device = await storage.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch device" });
    }
  });

  app.post("/api/devices", async (req, res) => {
    try {
      const parsed = insertDeviceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid device data", details: parsed.error });
      }
      const device = await storage.createDevice(parsed.data);
      res.status(201).json(device);
    } catch (error) {
      res.status(500).json({ error: "Failed to create device" });
    }
  });

  app.patch("/api/devices/:id", async (req, res) => {
    try {
      const device = await storage.updateDevice(req.params.id, req.body);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ error: "Failed to update device" });
    }
  });

  app.delete("/api/devices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDevice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Device not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete device" });
    }
  });

  // ============== DASHBOARDS ==============
  app.get("/api/projects/:projectId/dashboards", async (req, res) => {
    try {
      const dashboards = await storage.getProjectDashboards(req.params.projectId);
      res.json(dashboards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboards" });
    }
  });

  app.post("/api/projects/:projectId/dashboards", async (req, res) => {
    try {
      const data = { ...req.body, projectId: req.params.projectId };
      const parsed = insertDashboardSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid dashboard data", details: parsed.error });
      }
      const dashboard = await storage.createDashboard(parsed.data);
      res.status(201).json(dashboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to create dashboard" });
    }
  });

  app.patch("/api/projects/:projectId/dashboards/:dashboardId", async (req, res) => {
    try {
      const dashboard = await storage.updateDashboard(req.params.dashboardId, req.body);
      if (!dashboard) {
        return res.status(404).json({ error: "Dashboard not found" });
      }
      res.json(dashboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to update dashboard" });
    }
  });

  app.delete("/api/projects/:projectId/dashboards/:dashboardId", async (req, res) => {
    try {
      const deleted = await storage.deleteDashboard(req.params.dashboardId);
      if (!deleted) {
        return res.status(404).json({ error: "Dashboard not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete dashboard" });
    }
  });

  // ============== ARDUINO COMPILER ==============
  
  // Check if Arduino CLI is installed
  app.get("/api/arduino/status", async (_req, res) => {
    try {
      const status = await arduinoCompiler.checkInstallation();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to check Arduino CLI status" });
    }
  });

  // List connected boards
  app.get("/api/arduino/boards", async (_req, res) => {
    try {
      const boards = await arduinoCompiler.listBoards();
      res.json({ boards });
    } catch (error) {
      res.status(500).json({ error: "Failed to list boards" });
    }
  });

  // Compile code (verify only)
  app.post("/api/arduino/compile", async (req, res) => {
    try {
      const { code, boardType, fileName } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      const result = await arduinoCompiler.compile(code, boardType, fileName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Compilation failed" });
    }
  });

  // Compile and upload to board
  app.post("/api/arduino/upload", async (req, res) => {
    try {
      const { code, port, boardType, fileName } = req.body;
      
      if (!code || !port) {
        return res.status(400).json({ error: "Code and port are required" });
      }

      // Send progress updates via SSE or just return final result
      const result = await arduinoCompiler.compileAndUpload(
        code,
        port,
        boardType,
        fileName,
        (stage, progress) => {
          console.log(`[arduino] ${stage}: ${progress}%`);
        }
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // ============== MICROPYTHON COMPILER ==============

  // Check if mpy-cross is installed
  app.get("/api/micropython/status", async (_req, res) => {
    try {
      const status = await micropythonCompiler.checkInstallation();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to check mpy-cross status" });
    }
  });

  // Compile Python to .mpy bytecode
  app.post("/api/micropython/compile", async (req, res) => {
    try {
      const { code, fileName } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      const result = await micropythonCompiler.compile(code, fileName || "main.py");
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Compilation failed" });
    }
  });

  // Validate Python syntax
  app.post("/api/micropython/validate", async (req, res) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      const result = await micropythonCompiler.validateSyntax(code);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Validation failed" });
    }
  });

  // Register AI routes
  registerAIRoutes(app);

  return httpServer;
}
