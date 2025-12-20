/**
 * Device Connection Panel Component
 * UI for connecting to ESP32/MicroPython devices via Python backend
 */

import { useState, useEffect } from "react";
import {
  Wifi,
  Usb,
  Radio,
  Cloud,
  Settings,
  Square,
  RefreshCw,
  Terminal,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useDeviceCommunication } from "@/hooks/use-device-communication";
import { ConnectionType } from "@/services/device-communication";

interface DeviceConnectionPanelProps {
  compact?: boolean;
}

export function DeviceConnectionPanel({ compact = false }: DeviceConnectionPanelProps) {
  const {
    connected,
    connectionType,
    status,
    pythonBackendAvailable,
    serialPorts,
    sensorData,
    logs,
    connect,
    disconnect,
    sendCommand,
    configure,
    refreshSerialPorts,
    checkPythonBackend,
    clearLogs,
  } = useDeviceCommunication();

  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<ConnectionType>("serial");
  const [showSettings, setShowSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(true);
  const [commandInput, setCommandInput] = useState("");

  // Settings state
  const [selectedPort, setSelectedPort] = useState("");
  const [ipAddress, setIpAddress] = useState("192.168.1.100");
  const [port, setPort] = useState("80");
  const [baudRate, setBaudRate] = useState("115200");
  const [mqttBroker, setMqttBroker] = useState("broker.hivemq.com");

  // Auto-select first serial port
  useEffect(() => {
    if (serialPorts.length > 0 && !selectedPort) {
      setSelectedPort(serialPorts[0].port);
    }
  }, [serialPorts, selectedPort]);

  const protocolIcons: Record<ConnectionType, React.ReactNode> = {
    serial: <Usb className="h-4 w-4" />,
    wifi: <Wifi className="h-4 w-4" />,
    websocket: <Radio className="h-4 w-4" />,
    mqtt: <Cloud className="h-4 w-4" />,
  };

  const protocolLabels: Record<ConnectionType, string> = {
    serial: "USB Serial",
    wifi: "WiFi (HTTP)",
    websocket: "WebSocket",
    mqtt: "MQTT",
  };

  const handleConnect = async () => {
    if (!pythonBackendAvailable) {
      toast({
        title: "Python Backend Not Available",
        description: "Start the Python backend server first",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    // Apply settings before connecting
    configure({
      type: selectedProtocol,
      serialPort: selectedPort,
      ipAddress,
      port: parseInt(port),
      baudRate: parseInt(baudRate),
      broker: mqttBroker,
    });

    try {
      const success = await connect(selectedProtocol);
      if (success) {
        toast({ title: "Connected!", description: `Connected via ${protocolLabels[selectedProtocol]}` });
      } else {
        toast({ title: "Connection failed", variant: "destructive" });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Connection error", description: message, variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast({ title: "Disconnected" });
  };

  const handleSendCommand = async () => {
    if (!commandInput.trim()) return;

    try {
      let command = commandInput;
      let value: unknown = undefined;

      try {
        const parsed = JSON.parse(commandInput);
        command = parsed.command || commandInput;
        value = parsed.value;
      } catch {
        // Not JSON, send as plain command
      }

      const result = await sendCommand(command, value);
      if (result.success) {
        toast({ title: "Command sent" });
      } else {
        toast({ title: "Command failed", description: result.message, variant: "destructive" });
      }
      setCommandInput("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-gray-400"}`} />
        <span className="text-sm">{connected ? `${protocolLabels[connectionType!]}` : "Disconnected"}</span>
        {!connected ? (
          <Button size="sm" variant="outline" onClick={handleConnect} disabled={isConnecting || !pythonBackendAvailable}>
            {isConnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Connect"}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={handleDisconnect}>
            <Square className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Device Connection
              {connected && (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Connect to ESP32/MicroPython device</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Python Backend Status */}
        {!pythonBackendAvailable && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Python backend not available. Start it with: <code className="text-xs">python python_backend/start.py</code>
              <Button variant="ghost" size="sm" className="ml-2 h-auto p-0 underline" onClick={checkPythonBackend}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {pythonBackendAvailable && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Python backend connected
          </div>
        )}

        {/* Protocol Selection */}
        <div className="space-y-2">
          <Label>Connection Protocol</Label>
          <Select value={selectedProtocol} onValueChange={(v) => setSelectedProtocol(v as ConnectionType)} disabled={connected}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="serial">
                <div className="flex items-center gap-2">
                  <Usb className="h-4 w-4" />
                  USB Serial
                </div>
              </SelectItem>
              <SelectItem value="wifi">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  WiFi (HTTP REST)
                </div>
              </SelectItem>
              <SelectItem value="websocket">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  WebSocket
                </div>
              </SelectItem>
              <SelectItem value="mqtt">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  MQTT
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Settings Panel */}
        <Collapsible open={showSettings} onOpenChange={setShowSettings}>
          <CollapsibleContent className="space-y-3 pt-2">
            <Separator />

            {selectedProtocol === "serial" && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Serial Port</Label>
                    <Button variant="ghost" size="sm" onClick={refreshSerialPorts}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  {serialPorts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No serial ports found</p>
                  ) : (
                    <Select value={selectedPort} onValueChange={setSelectedPort}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select port" />
                      </SelectTrigger>
                      <SelectContent>
                        {serialPorts.map((p) => (
                          <SelectItem key={p.port} value={p.port}>
                            {p.port} - {p.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Baud Rate</Label>
                  <Select value={baudRate} onValueChange={setBaudRate}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9600">9600</SelectItem>
                      <SelectItem value="115200">115200</SelectItem>
                      <SelectItem value="230400">230400</SelectItem>
                      <SelectItem value="460800">460800</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {(selectedProtocol === "wifi" || selectedProtocol === "websocket") && (
              <>
                <div className="space-y-2">
                  <Label>Device IP Address</Label>
                  <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="192.168.1.100" />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder={selectedProtocol === "websocket" ? "81" : "80"} />
                </div>
              </>
            )}

            {selectedProtocol === "mqtt" && (
              <div className="space-y-2">
                <Label>MQTT Broker</Label>
                <Input value={mqttBroker} onChange={(e) => setMqttBroker(e.target.value)} placeholder="broker.hivemq.com" />
              </div>
            )}

            <Separator />
          </CollapsibleContent>
        </Collapsible>

        {/* Connect/Disconnect Button */}
        <div className="flex gap-2">
          {!connected ? (
            <Button className="flex-1" onClick={handleConnect} disabled={isConnecting || !pythonBackendAvailable}>
              {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : protocolIcons[selectedProtocol]}
              <span className="ml-2">Connect</span>
            </Button>
          ) : (
            <Button className="flex-1" variant="destructive" onClick={handleDisconnect}>
              <Square className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>

        {/* Sensor Data Display */}
        {connected && sensorData && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="text-sm font-medium">Real-time Sensor Data</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(sensorData).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Command Input */}
        {connected && (
          <div className="flex gap-2">
            <Input
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder='{"command": "led", "value": 1}'
              onKeyDown={(e) => e.key === "Enter" && handleSendCommand()}
            />
            <Button size="icon" onClick={handleSendCommand}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Logs Panel */}
        <Collapsible open={showLogs} onOpenChange={setShowLogs}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Logs ({logs.length})
              </span>
              {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="relative">
              <ScrollArea className="h-32 rounded border bg-zinc-950 p-2">
                {logs.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">No logs yet</div>
                ) : (
                  <div className="space-y-1 font-mono text-xs">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className={`${log.level === "error" ? "text-red-400" : log.level === "warn" ? "text-yellow-400" : "text-green-400"}`}
                      >
                        <span className="text-zinc-500">[{log.timestamp.toLocaleTimeString()}]</span> {log.message}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {logs.length > 0 && (
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={clearLogs}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
