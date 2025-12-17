import { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Lock,
  Unlock,
  CheckCircle2,
  Globe,
  Copy,
  ExternalLink,
  Smartphone,
  Router,
  Code,
  Network,
  Plug,
  Signal,
  Cloud,
  CloudOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import {
  wifiConnection,
  WiFiNetwork,
  WiFiStatus,
} from "@/services/wifi-connection";
import { networkDevice, DeviceInfo } from "@/services/network-device";
import {
  cloudConnection,
  CloudStatus,
  CLOUD_PROVIDERS,
  CloudConfig,
} from "@/services/cloud-connection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SignalBars({ bars }: { bars: number }) {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-1 rounded-sm ${i <= bars ? "bg-current" : "bg-muted"}`}
          style={{ height: `${i * 25}%` }}
        />
      ))}
    </div>
  );
}

const CAPTIVE_PORTAL_CODE = `// WiFi Captive Portal for µCodeLab
// Upload this to your ESP32/ESP8266 to configure WiFi via web browser

#include <WiFi.h>          // ESP32
// #include <ESP8266WiFi.h> // ESP8266
#include <WebServer.h>     // ESP32
// #include <ESP8266WebServer.h> // ESP8266
#include <DNSServer.h>
#include <EEPROM.h>

const char* AP_SSID = "uCodeLab-Setup";
const char* AP_PASS = "12345678";
const byte DNS_PORT = 53;

WebServer server(80);
DNSServer dnsServer;
bool portalActive = false;

String savedSSID = "";
String savedPass = "";

const char* portalHTML = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>uCodeLab WiFi Setup</title>
  <style>
    *{box-sizing:border-box;font-family:system-ui,sans-serif}
    body{margin:0;padding:20px;background:#1a1a2e;color:#fff;min-height:100vh}
    .card{background:#16213e;border-radius:12px;padding:20px;max-width:400px;margin:0 auto}
    h1{margin:0 0 20px;font-size:1.5rem;text-align:center}
    .logo{text-align:center;font-size:2rem;margin-bottom:10px}
    label{display:block;margin-bottom:5px;font-size:0.9rem;color:#a0a0a0}
    input{width:100%;padding:12px;border:1px solid #333;border-radius:8px;background:#0f0f23;color:#fff;margin-bottom:15px;font-size:1rem}
    input:focus{outline:none;border-color:#4f46e5}
    button{width:100%;padding:14px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer}
    button:hover{background:#4338ca}
    .networks{margin:15px 0;max-height:200px;overflow-y:auto}
    .network{padding:10px;background:#0f0f23;border-radius:6px;margin-bottom:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center}
    .network:hover{background:#1e1e3f}
    .rssi{font-size:0.8rem;color:#888}
    .status{text-align:center;padding:10px;border-radius:8px;margin-top:15px}
    .success{background:#065f46;color:#6ee7b7}
    .error{background:#7f1d1d;color:#fca5a5}
    .scanning{color:#888;text-align:center;padding:20px}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">⚡</div>
    <h1>µCodeLab WiFi Setup</h1>
    <div id="content">
      <button onclick="scan()">Scan Networks</button>
      <div id="networks" class="networks"></div>
      <form onsubmit="connect(event)">
        <label>WiFi Network (SSID)</label>
        <input type="text" id="ssid" placeholder="Enter network name" required>
        <label>Password</label>
        <input type="password" id="pass" placeholder="Enter password">
        <button type="submit">Connect</button>
      </form>
      <div id="status"></div>
    </div>
  </div>
  <script>
    function scan(){
      document.getElementById('networks').innerHTML='<div class="scanning">Scanning...</div>';
      fetch('/scan').then(r=>r.json()).then(nets=>{
        let html='';
        nets.forEach(n=>{
          html+='<div class="network" onclick="selectNet(\\''+n.ssid+'\\')"><span>'+n.ssid+(n.enc!='0'?' 🔒':'')+'</span><span class="rssi">'+n.rssi+'dBm</span></div>';
        });
        document.getElementById('networks').innerHTML=html||'<div class="scanning">No networks found</div>';
      });
    }
    function selectNet(ssid){document.getElementById('ssid').value=ssid;}
    function connect(e){
      e.preventDefault();
      document.getElementById('status').innerHTML='<div class="scanning">Connecting...</div>';
      fetch('/connect?ssid='+encodeURIComponent(document.getElementById('ssid').value)+'&pass='+encodeURIComponent(document.getElementById('pass').value))
        .then(r=>r.json()).then(res=>{
          if(res.success){
            document.getElementById('status').innerHTML='<div class="status success">Connected! IP: '+res.ip+'</div>';
          }else{
            document.getElementById('status').innerHTML='<div class="status error">Failed: '+res.error+'</div>';
          }
        });
    }
    scan();
  </script>
</body>
</html>
)rawliteral";

void setupAP() {
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("AP IP: ");
  Serial.println(WiFi.softAPIP());
  
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());
  
  server.on("/", []() {
    server.send(200, "text/html", portalHTML);
  });
  
  server.on("/scan", []() {
    int n = WiFi.scanNetworks();
    String json = "[";
    for(int i = 0; i < n; i++) {
      if(i > 0) json += ",";
      json += "{\\"ssid\\":\\"" + WiFi.SSID(i) + "\\",";
      json += "\\"rssi\\":" + String(WiFi.RSSI(i)) + ",";
      json += "\\"enc\\":\\"" + String(WiFi.encryptionType(i)) + "\\"}";
    }
    json += "]";
    server.send(200, "application/json", json);
  });
  
  server.on("/connect", []() {
    String ssid = server.arg("ssid");
    String pass = server.arg("pass");
    
    WiFi.begin(ssid.c_str(), pass.c_str());
    int attempts = 0;
    while(WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      attempts++;
    }
    
    if(WiFi.status() == WL_CONNECTED) {
      // Save credentials
      savedSSID = ssid;
      savedPass = pass;
      String json = "{\\"success\\":true,\\"ip\\":\\"" + WiFi.localIP().toString() + "\\"}";
      server.send(200, "application/json", json);
      Serial.println("WIFI_CONNECTED:" + ssid + "," + WiFi.localIP().toString());
    } else {
      server.send(200, "application/json", "{\\"success\\":false,\\"error\\":\\"Connection failed\\"}");
    }
  });
  
  server.onNotFound([]() {
    server.sendHeader("Location", "http://192.168.4.1/");
    server.send(302, "text/plain", "");
  });
  
  server.begin();
  portalActive = true;
  Serial.println("Captive portal started");
  Serial.println("Connect to WiFi: " + String(AP_SSID));
  Serial.println("Password: " + String(AP_PASS));
  Serial.println("Open http://192.168.4.1");
}

void setup() {
  Serial.begin(9600);
  EEPROM.begin(512);
  
  // Try to connect with saved credentials first
  // (Add EEPROM read logic here if needed)
  
  setupAP();
}

void loop() {
  if(portalActive) {
    dnsServer.processNextRequest();
    server.handleClient();
  }
  
  // Your main code here
  // Once connected, you can disable the portal:
  // if(WiFi.status() == WL_CONNECTED && portalActive) {
  //   portalActive = false;
  //   WiFi.softAPdisconnect(true);
  // }
}`;

export function WiFiConnection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState<WiFiStatus>({ connected: false });
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("ip");
  const [deviceIp, setDeviceIp] = useState("");
  const [devicePort, setDevicePort] = useState("81");
  const [networkDevice_, setNetworkDevice] = useState<DeviceInfo | null>(null);
  // Cloud state
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({ connected: false });
  const [cloudProvider, setCloudProvider] = useState("hivemq");
  const [cloudBroker, setCloudBroker] = useState("");
  const [cloudPort, setCloudPort] = useState("8884");
  const [cloudUsername, setCloudUsername] = useState("");
  const [cloudPassword, setCloudPassword] = useState("");
  const [cloudTopic, setCloudTopic] = useState("ucodelab/device1");
  const { toast } = useToast();
  const { addLog } = useAppStore();

  useEffect(() => {
    const unsubscribeLogs = wifiConnection.subscribeToLogs((log) => {
      addLog(log);
    });
    const unsubscribeStatus = wifiConnection.subscribeToStatus((newStatus) => {
      setStatus(newStatus);
    });
    const unsubscribeNetworks = wifiConnection.subscribeToNetworks((nets) => {
      setNetworks(nets);
      setScanning(false);
    });
    const unsubscribeNetDevice = networkDevice.subscribeToLogs((log) => {
      addLog(log);
    });
    const unsubscribeNetDeviceStatus = networkDevice.subscribeToStatus((device) => {
      setNetworkDevice(device);
    });
    const unsubscribeCloudLogs = cloudConnection.subscribeToLogs((log) => {
      addLog(log);
    });
    const unsubscribeCloudStatus = cloudConnection.subscribeToStatus((status) => {
      setCloudStatus(status);
    });
    setStatus(wifiConnection.getStatus());
    setNetworkDevice(networkDevice.getDevice());
    setCloudStatus(cloudConnection.getStatus());
    return () => {
      unsubscribeLogs();
      unsubscribeStatus();
      unsubscribeNetworks();
      unsubscribeNetDevice();
      unsubscribeNetDeviceStatus();
      unsubscribeCloudLogs();
      unsubscribeCloudStatus();
    };
  }, [addLog]);

  const handleScan = async () => {
    setScanning(true);
    try {
      await wifiConnection.scanNetworks();
    } catch {
      toast({
        title: "Scan Failed",
        description: "Connect device via USB Serial first",
        variant: "destructive",
      });
      setScanning(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedNetwork) return;
    setConnecting(true);
    try {
      const success = await wifiConnection.connect(selectedNetwork, password);
      if (success) {
        toast({ title: "Connected", description: `Connected to ${selectedNetwork}` });
        setPassword("");
        setSelectedNetwork(null);
      }
    } catch {
      toast({ title: "Connection Failed", variant: "destructive" });
    }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    await wifiConnection.disconnect();
    toast({ title: "Disconnected" });
  };

  const handleTest = async () => {
    setTesting(true);
    const result = await wifiConnection.testConnection();
    toast({
      title: result.success ? "Connection OK" : "Connection Issue",
      description: result.success ? `Latency: ${result.latency}ms` : "Check your connection",
      variant: result.success ? "default" : "destructive",
    });
    setTesting(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Arduino code copied to clipboard" });
  };

  const handleIpConnect = async () => {
    if (!deviceIp) {
      toast({ title: "Error", description: "Enter device IP address", variant: "destructive" });
      return;
    }
    setConnecting(true);
    try {
      const success = await networkDevice.connect(deviceIp, parseInt(devicePort) || 81);
      if (success) {
        toast({ title: "Connected!", description: `Connected to ${deviceIp}` });
      } else {
        toast({ title: "Failed", description: "Could not connect to device", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Connection failed", variant: "destructive" });
    }
    setConnecting(false);
  };

  const handleIpDisconnect = () => {
    networkDevice.disconnect();
    toast({ title: "Disconnected" });
  };

  const handleIpTest = async () => {
    if (!deviceIp) return;
    setTesting(true);
    const result = await networkDevice.pingDevice(deviceIp);
    toast({
      title: result.success ? "Device Reachable" : "No Response",
      description: result.success ? `Latency: ${result.latency}ms` : "Check IP and network",
      variant: result.success ? "default" : "destructive",
    });
    setTesting(false);
  };

  // Cloud handlers
  const handleCloudConnect = async () => {
    const provider = CLOUD_PROVIDERS.find((p) => p.id === cloudProvider);
    if (!provider) return;

    setConnecting(true);
    const config: CloudConfig = {
      provider: cloudProvider,
      broker: cloudProvider === "custom" ? cloudBroker : provider.broker,
      port: parseInt(cloudPort) || provider.port,
      protocol: "wss",
      username: cloudUsername || undefined,
      password: cloudPassword || undefined,
      clientId: cloudConnection.generateClientId(),
      deviceTopic: cloudTopic,
    };

    try {
      const success = await cloudConnection.connect(config);
      if (success) {
        toast({ title: "Connected to Cloud", description: `Broker: ${config.broker}` });
      } else {
        toast({ title: "Connection Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Cloud connection failed", variant: "destructive" });
    }
    setConnecting(false);
  };

  const handleCloudDisconnect = async () => {
    await cloudConnection.disconnect();
    toast({ title: "Disconnected from Cloud" });
  };

  const handleProviderChange = (providerId: string) => {
    setCloudProvider(providerId);
    const provider = CLOUD_PROVIDERS.find((p) => p.id === providerId);
    if (provider && providerId !== "custom") {
      setCloudPort(String(provider.port));
    }
  };

  const quality = status.rssi ? wifiConnection.getRssiQuality(status.rssi) : null;
  const selectedProvider = CLOUD_PROVIDERS.find((p) => p.id === cloudProvider);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant={status.connected ? "default" : "outline"} size="sm" className="gap-2">
          {status.connected ? (
            <>
              <Wifi className="h-4 w-4" />
              {status.ssid?.substring(0, 10)}
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              WiFi
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            WiFi Configuration
          </DialogTitle>
          <DialogDescription>
            Configure WiFi for your ESP32/ESP8266 device
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ip" className="text-xs gap-1">
              <Network className="h-3 w-3" />
              IP
            </TabsTrigger>
            <TabsTrigger value="cloud" className="text-xs gap-1">
              <Cloud className="h-3 w-3" />
              Cloud
            </TabsTrigger>
            <TabsTrigger value="portal" className="text-xs gap-1">
              <Smartphone className="h-3 w-3" />
              Portal
            </TabsTrigger>
            <TabsTrigger value="serial" className="text-xs gap-1">
              <Router className="h-3 w-3" />
              Serial
            </TabsTrigger>
            <TabsTrigger value="code" className="text-xs gap-1">
              <Code className="h-3 w-3" />
              Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ip" className="flex-1 overflow-auto space-y-4 mt-4">
            {/* IP Connection - Same Network */}
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <h4 className="font-medium text-sm mb-1">🌐 Direct IP Connection</h4>
              <p className="text-xs text-muted-foreground">
                Connect to your ESP when both devices are on the same WiFi network
              </p>
            </div>

            {/* Connected Device Status */}
            {networkDevice_?.connected && (
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{networkDevice_.name}</span>
                  </div>
                  <Badge variant="outline" className="text-green-500">Connected</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>IP: {networkDevice_.ip}</div>
                  <div>Type: {networkDevice_.type}</div>
                  {networkDevice_.rssi && <div>RSSI: {networkDevice_.rssi}dBm</div>}
                  {networkDevice_.firmware && <div>FW: {networkDevice_.firmware}</div>}
                </div>
                <Button size="sm" variant="destructive" onClick={handleIpDisconnect} className="w-full mt-2">
                  <Plug className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            )}

            {/* Connection Form */}
            {!networkDevice_?.connected && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Device IP Address</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="192.168.1.100"
                      value={deviceIp}
                      onChange={(e) => setDeviceIp(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="81"
                      value={devicePort}
                      onChange={(e) => setDevicePort(e.target.value)}
                      className="w-20"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the IP shown in Serial Monitor when ESP connects to WiFi
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleIpTest}
                    disabled={testing || !deviceIp}
                    className="flex-1"
                  >
                    {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Signal className="h-4 w-4 mr-2" />}
                    Test
                  </Button>
                  <Button
                    onClick={handleIpConnect}
                    disabled={connecting || !deviceIp}
                    className="flex-1"
                  >
                    {connecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plug className="h-4 w-4 mr-2" />}
                    Connect
                  </Button>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium">How to get the IP:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Upload the WebSocket code (see Code tab)</li>
                <li>Open Serial Monitor at 115200 baud</li>
                <li>ESP will print its IP after connecting to WiFi</li>
                <li>Enter that IP above and click Connect</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="cloud" className="flex-1 overflow-auto space-y-4 mt-4">
            {/* Cloud Connection */}
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <h4 className="font-medium text-sm mb-1">☁️ Cloud MQTT Connection</h4>
              <p className="text-xs text-muted-foreground">
                Connect from anywhere via MQTT broker - no same network required
              </p>
            </div>

            {/* Connected Status */}
            {cloudStatus.connected && (
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Connected</span>
                  </div>
                  <Badge variant={cloudStatus.deviceOnline ? "default" : "secondary"}>
                    Device {cloudStatus.deviceOnline ? "Online" : "Offline"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>Broker: {cloudStatus.broker}</div>
                  <div>Client: {cloudStatus.clientId}</div>
                </div>
                <Button size="sm" variant="destructive" onClick={handleCloudDisconnect} className="w-full mt-2">
                  <CloudOff className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            )}

            {/* Connection Form */}
            {!cloudStatus.connected && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>MQTT Broker</Label>
                  <Select value={cloudProvider} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLOUD_PROVIDERS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex flex-col">
                            <span>{p.name}</span>
                            <span className="text-xs text-muted-foreground">{p.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {cloudProvider === "custom" && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Broker URL</Label>
                      <Input
                        placeholder="broker.example.com"
                        value={cloudBroker}
                        onChange={(e) => setCloudBroker(e.target.value)}
                      />
                    </div>
                    <div className="w-20">
                      <Label className="text-xs">Port</Label>
                      <Input
                        placeholder="8883"
                        value={cloudPort}
                        onChange={(e) => setCloudPort(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {selectedProvider?.requiresAuth && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Username</Label>
                      <Input
                        placeholder="Username"
                        value={cloudUsername}
                        onChange={(e) => setCloudUsername(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Password/Key</Label>
                      <Input
                        type="password"
                        placeholder="API Key"
                        value={cloudPassword}
                        onChange={(e) => setCloudPassword(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Device Topic</Label>
                  <Input
                    placeholder="ucodelab/device1"
                    value={cloudTopic}
                    onChange={(e) => setCloudTopic(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must match the topic in your Arduino code
                  </p>
                </div>

                <Button onClick={handleCloudConnect} disabled={connecting} className="w-full">
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Cloud className="h-4 w-4 mr-2" />
                  )}
                  Connect to Cloud
                </Button>

                {selectedProvider?.signupUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-primary"
                    onClick={() => window.open(selectedProvider.signupUrl, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Sign up for {selectedProvider.name}
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="portal" className="flex-1 overflow-auto space-y-4 mt-4">
            {/* Captive Portal Instructions */}
            <div className="space-y-3">
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <h4 className="font-medium text-sm mb-2">📱 Captive Portal Setup</h4>
                <p className="text-xs text-muted-foreground">
                  Your ESP creates a WiFi hotspot. Connect to it and configure the real WiFi through a web page.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-3 p-2 rounded bg-muted/50">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="text-sm font-medium">Upload the Captive Portal code</p>
                    <p className="text-xs text-muted-foreground">Go to "Arduino Code" tab and copy the code</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2 rounded bg-muted/50">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="text-sm font-medium">Connect to the ESP's WiFi</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="font-mono text-xs">uCodeLab-Setup</Badge>
                      <span className="text-xs text-muted-foreground">Password:</span>
                      <Badge variant="outline" className="font-mono text-xs">12345678</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2 rounded bg-muted/50">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="text-sm font-medium">Open the configuration page</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="font-mono text-xs">http://192.168.4.1</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={() => window.open("http://192.168.4.1", "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2 rounded bg-muted/50">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <p className="text-sm font-medium">Select your WiFi and enter password</p>
                    <p className="text-xs text-muted-foreground">The ESP will connect and show the IP address</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="serial" className="flex-1 overflow-auto space-y-4 mt-4">
            {/* Connection Status */}
            {status.connected && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{status.ssid}</span>
                  </div>
                  {quality && (
                    <div className={`flex items-center gap-1 ${quality.color}`}>
                      <SignalBars bars={quality.bars} />
                      <span className="text-xs">{quality.label}</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>IP: {status.ip}</div>
                  <div>RSSI: {status.rssi}dBm</div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={handleTest} disabled={testing} className="flex-1">
                    {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                    Test
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleDisconnect} className="flex-1">
                    <WifiOff className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </div>
              </div>
            )}

            {/* Serial-based scanning */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Scan via Serial</Label>
                <Button size="sm" variant="ghost" onClick={handleScan} disabled={scanning}>
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Requires device connected via USB with WiFi handler code
              </p>

              <ScrollArea className="h-40 rounded border">
                {networks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                    <Wifi className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Click refresh to scan</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {networks.map((network) => {
                      const netQuality = wifiConnection.getRssiQuality(network.rssi);
                      const isSelected = selectedNetwork === network.ssid;
                      return (
                        <div
                          key={network.ssid}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10 border border-primary" : "hover:bg-muted"
                          }`}
                          onClick={() => setSelectedNetwork(network.ssid)}
                        >
                          <div className="flex items-center gap-2">
                            {network.encryption === "open" ? (
                              <Unlock className="h-3 w-3 text-yellow-500" />
                            ) : (
                              <Lock className="h-3 w-3 text-green-500" />
                            )}
                            <span className="text-sm">{network.ssid}</span>
                          </div>
                          <div className={`flex items-center gap-1 ${netQuality.color}`}>
                            <SignalBars bars={netQuality.bars} />
                            <span className="text-xs">{network.rssi}dBm</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {selectedNetwork && !status.connected && (
              <div className="space-y-2">
                <Label>Password for "{selectedNetwork}"</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter WiFi password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                  />
                  <Button onClick={handleConnect} disabled={connecting}>
                    {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="code" className="flex-1 overflow-hidden flex flex-col mt-4">
            <Tabs defaultValue="mqtt" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="mqtt" className="text-xs">MQTT Cloud</TabsTrigger>
                <TabsTrigger value="websocket" className="text-xs">WebSocket</TabsTrigger>
                <TabsTrigger value="captive" className="text-xs">Portal</TabsTrigger>
              </TabsList>
              <TabsContent value="mqtt" className="flex-1 flex flex-col mt-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">MQTT Cloud Code</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyCode(cloudConnection.getArduinoCode({ broker: selectedProvider?.broker, port: selectedProvider?.port, deviceTopic: cloudTopic, username: cloudUsername }))}
                    className="gap-1 h-7"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
                <ScrollArea className="flex-1 rounded border bg-zinc-950">
                  <pre className="p-3 text-xs font-mono text-green-400 whitespace-pre-wrap">
                    {cloudConnection.getArduinoCode({ broker: selectedProvider?.broker, port: selectedProvider?.port, deviceTopic: cloudTopic, username: cloudUsername })}
                  </pre>
                </ScrollArea>
                <p className="text-xs text-muted-foreground mt-2">
                  Control your device from anywhere. Update WiFi credentials and topic.
                </p>
              </TabsContent>
              <TabsContent value="websocket" className="flex-1 flex flex-col mt-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">WebSocket Server Code</Label>
                  <Button size="sm" variant="outline" onClick={() => copyCode(networkDevice.getArduinoCode())} className="gap-1 h-7">
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
                <ScrollArea className="flex-1 rounded border bg-zinc-950">
                  <pre className="p-3 text-xs font-mono text-green-400 whitespace-pre-wrap">
                    {networkDevice.getArduinoCode()}
                  </pre>
                </ScrollArea>
                <p className="text-xs text-muted-foreground mt-2">
                  Real-time bidirectional communication. Change WIFI_SSID and WIFI_PASS.
                </p>
              </TabsContent>
              <TabsContent value="captive" className="flex-1 flex flex-col mt-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Captive Portal Code</Label>
                  <Button size="sm" variant="outline" onClick={() => copyCode(CAPTIVE_PORTAL_CODE)} className="gap-1 h-7">
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
                <ScrollArea className="flex-1 rounded border bg-zinc-950">
                  <pre className="p-3 text-xs font-mono text-green-400 whitespace-pre-wrap">
                    {CAPTIVE_PORTAL_CODE}
                  </pre>
                </ScrollArea>
                <p className="text-xs text-muted-foreground mt-2">
                  For initial WiFi setup via phone/browser.
                </p>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
