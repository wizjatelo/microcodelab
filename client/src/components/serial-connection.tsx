import { useState, useEffect } from 'react';
import { Usb, Unplug, Loader2, AlertCircle, Send, Cpu, HardDrive, RotateCcw, Activity, Heart, Radio, Shield, Gauge, Download, Upload, Trash2, FolderPlus, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useWebSerial } from '@/hooks/use-web-serial';
import { useToast } from '@/hooks/use-toast';

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800];

export function SerialConnection() {
  const { 
    isConnected, isSupported, isSecure, connectionState, messages, adcStreamData,
    connect, disconnect, send, getBrowserCompatibility,
    ping, getSystemInfo, gpioWrite, gpioRead, reboot,
    setAutoReconnect, startHeartbeat, stopHeartbeat,
    startAdcStream, stopAdcStream, setRateLimit,
    fileDelete, batchGpioRead, otaUpdate, isOtaInProgress, getOtaProgress,
    downloadLogs, clearLogHistory
  } = useWebSerial();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [baudRate, setBaudRate] = useState(115200);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [systemInfo, setSystemInfo] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Feature toggles
  const [autoReconnectEnabled, setAutoReconnectEnabled] = useState(true);
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(false);
  const [adcStreamEnabled, setAdcStreamEnabled] = useState(false);
  const [rateLimitEnabled, setRateLimitEnabled] = useState(true);

  // OTA state
  const [otaProgress, setOtaProgress] = useState(0);
  const [otaFile, setOtaFile] = useState<File | null>(null);
  
  const { toast } = useToast();
  const compatibility = getBrowserCompatibility();

  // Handle feature toggles
  useEffect(() => {
    setAutoReconnect(autoReconnectEnabled, 3, 2000);
  }, [autoReconnectEnabled, setAutoReconnect]);

  useEffect(() => {
    if (isConnected && heartbeatEnabled) {
      startHeartbeat(10000);
    } else {
      stopHeartbeat();
    }
  }, [isConnected, heartbeatEnabled, startHeartbeat, stopHeartbeat]);

  useEffect(() => {
    if (isConnected && adcStreamEnabled) {
      startAdcStream(36, 100);
    } else {
      stopAdcStream();
    }
  }, [isConnected, adcStreamEnabled, startAdcStream, stopAdcStream]);

  useEffect(() => {
    setRateLimit(rateLimitEnabled, 20);
  }, [rateLimitEnabled, setRateLimit]);

  const handleSendCommand = async () => {
    if (!commandInput.trim()) return;
    const success = await send(commandInput.trim());
    if (success) setCommandInput('');
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await connect(baudRate);
      if (success) {
        toast({ title: 'Connected', description: `ESP32 connected at ${baudRate} baud` });
      }
    } catch {
      toast({ title: 'Connection Failed', description: 'Could not connect to serial port', variant: 'destructive' });
    }
    setIsConnecting(false);
  };

  const handleDisconnect = async () => {
    await disconnect();
    setSystemInfo(null);
    toast({ title: 'Disconnected', description: 'Serial port disconnected' });
  };

  const handlePing = async () => {
    setIsLoading(true);
    try {
      const result = await ping();
      toast({ title: 'Pong!', description: `Uptime: ${Math.round(result.uptime / 1000)}s` });
    } catch (e) {
      toast({ title: 'Ping failed', description: String(e), variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleGetSystemInfo = async () => {
    setIsLoading(true);
    try {
      const info = await getSystemInfo();
      setSystemInfo(info);
      toast({ title: 'System Info', description: `Memory: ${Math.round(info.free_memory / 1024)}KB free` });
    } catch (e) {
      toast({ title: 'Failed', description: String(e), variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleToggleLED = async () => {
    setIsLoading(true);
    try {
      const current = await gpioRead(2);
      await gpioWrite(2, current.value ? 0 : 1);
      toast({ title: 'LED Toggled', description: `LED is now ${current.value ? 'OFF' : 'ON'}` });
    } catch (e) {
      toast({ title: 'Failed', description: String(e), variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleReboot = async () => {
    try {
      await reboot();
      toast({ title: 'Rebooting', description: 'ESP32 is rebooting...' });
      await disconnect();
    } catch (e) {
      toast({ title: 'Failed', description: String(e), variant: 'destructive' });
    }
  };

  const handleBatchGpioRead = async () => {
    setIsLoading(true);
    try {
      const results = await batchGpioRead([2, 4, 5, 12, 13]);
      const values = results.map(r => `GPIO${r.pin}=${r.value}`).join(', ');
      toast({ title: 'Batch GPIO Read', description: values });
    } catch (e) {
      toast({ title: 'Failed', description: String(e), variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleOtaUpdate = async () => {
    if (!otaFile) {
      toast({ title: 'No file', description: 'Select a file first', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    try {
      const content = await otaFile.text();
      await otaUpdate(otaFile.name, content, (progress) => {
        setOtaProgress(progress);
      });
      toast({ title: 'OTA Complete', description: `${otaFile.name} uploaded successfully` });
      setOtaFile(null);
      setOtaProgress(0);
    } catch (e) {
      toast({ title: 'OTA Failed', description: String(e), variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleExportLogs = (format: 'text' | 'json' | 'csv') => {
    downloadLogs(format);
    toast({ title: 'Logs Exported', description: `Downloaded as ${format.toUpperCase()}` });
  };

  const handleClearLogs = () => {
    clearLogHistory();
    toast({ title: 'Logs Cleared', description: 'Log history has been cleared' });
  };

  const getStateColor = () => {
    switch (connectionState) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'reconnecting': return 'bg-orange-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  // Show error if not supported
  if (!isSupported || !isSecure) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Serial Unavailable
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Shield className="h-5 w-5" />
              Web Serial Not Available
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-sm">
              <p className="font-medium text-red-700 dark:text-red-300">{compatibility.message}</p>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Browser:</strong> {compatibility.browser}</p>
              <p><strong>Secure Context:</strong> {compatibility.secure ? '✓ Yes' : '✗ No (requires HTTPS)'}</p>
              <p><strong>API Support:</strong> {compatibility.supported ? '✓ Yes' : '✗ No'}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant={isConnected ? "default" : "outline"} size="sm" className="gap-2">
          <div className={`w-2 h-2 rounded-full ${getStateColor()}`} />
          {isConnected ? 'ESP32 Connected' : connectionState === 'reconnecting' ? 'Reconnecting...' : 'Connect ESP32'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Usb className="h-5 w-5" />
            ESP32 Web Serial Connection
          </DialogTitle>
          <DialogDescription>
            Connect to ESP32 running MicroPython via USB
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="connection">Connect</TabsTrigger>
            <TabsTrigger value="commands" disabled={!isConnected}>Commands</TabsTrigger>
            <TabsTrigger value="advanced" disabled={!isConnected}>Advanced</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="console">Console</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={isConnected ? "default" : "secondary"} className="capitalize">
                <div className={`w-2 h-2 rounded-full mr-2 ${getStateColor()}`} />
                {connectionState}
              </Badge>
            </div>

            {!isConnected && (
              <div className="space-y-2">
                <Label>Baud Rate</Label>
                <Select value={String(baudRate)} onValueChange={(v) => setBaudRate(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BAUD_RATES.map((rate) => (
                      <SelectItem key={rate} value={String(rate)}>
                        {rate} baud {rate === 115200 && '(recommended)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2">
              {isConnected ? (
                <Button variant="destructive" className="flex-1" onClick={handleDisconnect}>
                  <Unplug className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleConnect} disabled={isConnecting || connectionState === 'reconnecting'}>
                  {isConnecting || connectionState === 'reconnecting' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Usb className="h-4 w-4 mr-2" />
                  )}
                  {isConnecting ? 'Connecting...' : connectionState === 'reconnecting' ? 'Reconnecting...' : 'Connect'}
                </Button>
              )}
            </div>

            {/* ADC Stream Display */}
            {adcStreamEnabled && adcStreamData && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    ADC Stream (Pin {adcStreamData.pin})
                  </span>
                  <span className="font-mono text-sm">{adcStreamData.voltage.toFixed(3)}V</span>
                </div>
                <Progress value={(adcStreamData.raw_value / 4095) * 100} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  Raw: {adcStreamData.raw_value} / 4095
                </div>
              </div>
            )}

            {systemInfo && (
              <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                <div className="font-medium">System Info</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-muted-foreground">Chip ID:</span>
                  <span className="font-mono">{String(systemInfo.chip_id).slice(0, 12)}...</span>
                  <span className="text-muted-foreground">Free Memory:</span>
                  <span>{Math.round(Number(systemInfo.free_memory) / 1024)} KB</span>
                  <span className="text-muted-foreground">CPU Freq:</span>
                  <span>{String(systemInfo.freq_mhz)} MHz</span>
                  <span className="text-muted-foreground">Uptime:</span>
                  <span>{Math.round(Number(systemInfo.uptime_ms) / 1000)}s</span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="commands" className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handlePing} disabled={isLoading}>
                <Activity className="h-4 w-4 mr-2" />
                Ping
              </Button>
              <Button variant="outline" size="sm" onClick={handleGetSystemInfo} disabled={isLoading}>
                <Cpu className="h-4 w-4 mr-2" />
                System Info
              </Button>
              <Button variant="outline" size="sm" onClick={handleToggleLED} disabled={isLoading}>
                <HardDrive className="h-4 w-4 mr-2" />
                Toggle LED
              </Button>
              <Button variant="outline" size="sm" onClick={handleReboot} disabled={isLoading}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reboot
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Send JSON Command</Label>
              <div className="flex gap-2">
                <Input
                  placeholder='{"command": "gpio_read", "pin": 2}'
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                  className="flex-1 font-mono text-xs"
                />
                <Button size="icon" onClick={handleSendCommand}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Available commands:</p>
              <p>ping, version, system_info, gpio_read, gpio_write, adc_read, i2c_scan, wifi_scan, file_list, reboot</p>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {/* Batch Commands */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Batch Commands
              </Label>
              <Button variant="outline" size="sm" className="w-full" onClick={handleBatchGpioRead} disabled={isLoading}>
                Read Multiple GPIOs (2,4,5,12,13)
              </Button>
            </div>

            {/* OTA Firmware Update */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                OTA Firmware Update
              </Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".py,.mpy"
                  onChange={(e) => setOtaFile(e.target.files?.[0] || null)}
                  className="flex-1 text-xs"
                />
                <Button 
                  size="sm" 
                  onClick={handleOtaUpdate} 
                  disabled={!otaFile || isLoading || isOtaInProgress()}
                >
                  {isOtaInProgress() ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
              </div>
              {otaProgress > 0 && (
                <div className="space-y-1">
                  <Progress value={otaProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">{otaProgress.toFixed(1)}%</p>
                </div>
              )}
            </div>

            {/* Log Export */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Logs
              </Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExportLogs('text')}>
                  TXT
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportLogs('json')}>
                  JSON
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportLogs('csv')}>
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearLogs}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
              <p className="font-medium">Advanced Features:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Batch commands reduce latency by sending multiple commands at once</li>
                <li>OTA updates allow uploading new firmware files wirelessly</li>
                <li>Log export saves communication history for debugging</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Radio className="h-4 w-4" />
                    Auto-Reconnect
                  </Label>
                  <p className="text-xs text-muted-foreground">Automatically reconnect on connection loss (3 attempts)</p>
                </div>
                <Switch checked={autoReconnectEnabled} onCheckedChange={setAutoReconnectEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Heartbeat
                  </Label>
                  <p className="text-xs text-muted-foreground">Send ping every 10s to detect connection loss</p>
                </div>
                <Switch checked={heartbeatEnabled} onCheckedChange={setHeartbeatEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    ADC Streaming
                  </Label>
                  <p className="text-xs text-muted-foreground">Continuous ADC reading (100ms interval)</p>
                </div>
                <Switch checked={adcStreamEnabled} onCheckedChange={setAdcStreamEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Rate Limiting
                  </Label>
                  <p className="text-xs text-muted-foreground">Limit to 20 commands/second</p>
                </div>
                <Switch checked={rateLimitEnabled} onCheckedChange={setRateLimitEnabled} />
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
              <p><strong>Browser:</strong> {compatibility.browser}</p>
              <p><strong>Secure Context:</strong> {compatibility.secure ? '✓' : '✗'}</p>
              <p><strong>Web Serial:</strong> {compatibility.supported ? '✓' : '✗'}</p>
            </div>
          </TabsContent>

          <TabsContent value="console" className="space-y-2">
            <ScrollArea className="h-64 rounded border bg-zinc-950 p-2">
              <div className="font-mono text-xs space-y-1">
                {messages.length === 0 ? (
                  <div className="text-muted-foreground text-center py-4">No messages yet</div>
                ) : (
                  messages.slice(-50).map((msg, i) => {
                    const msgAny = msg as { type: string; data?: string; jsonData?: unknown; timestamp: Date };
                    const colorClass = 
                      msgAny.type === 'error' ? 'text-red-400' :
                      msgAny.type === 'tx' ? 'text-cyan-400' :
                      msgAny.type === 'rx' ? 'text-green-400' :
                      msgAny.type === 'json' ? 'text-yellow-400' :
                      msgAny.type === 'connected' ? 'text-green-400' :
                      msgAny.type === 'disconnected' ? 'text-yellow-400' :
                      'text-foreground';
                    
                    const prefix = msgAny.type === 'tx' ? '→ ' : (msgAny.type === 'rx' || msgAny.type === 'json') ? '← ' : '';
                    const content = msgAny.jsonData ? JSON.stringify(msgAny.jsonData) : msgAny.data;
                    
                    return (
                      <div key={i} className={colorClass}>
                        <span className="text-zinc-500">[{msgAny.timestamp.toLocaleTimeString()}]</span>{' '}
                        {prefix}{content}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
