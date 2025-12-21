/**
 * Device Status Panel - Shows linked device info in editor/dashboard
 * Integrates with device configuration and real-time data
 */
import { useState } from 'react';
import { Cpu, Wifi, WifiOff, Activity, RefreshCw, Link2, Unlink, Settings, Zap, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeviceContext } from '@/hooks/use-device-context';
import { useDeviceIntegration } from '@/hooks/use-device-integration';
import { useWebSerial } from '@/hooks/use-web-serial';
import { HardwareIcon, getHardwareLabel } from '@/components/hardware-icon';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export function DeviceStatusPanel() {
  const { activeDevice, linkedDevice, isConnected, sensorData, getDeviceInfo, unlinkFromProject } = useDeviceContext();
  const { updateDevice, isUpdating, unlinkedDevices, linkDevice } = useDeviceIntegration();
  const { connectionState, ping } = useWebSerial();
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [config, setConfig] = useState({
    name: '',
    ipAddress: '',
    connectionType: 'wifi',
    role: 'primary',
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const device = activeDevice || linkedDevice;

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const info = await getDeviceInfo();
      setSystemInfo(info);
      await ping();
      toast({ title: "Refreshed", description: "Device info updated" });
    } catch (e) {
      console.error('Failed to refresh:', e);
      toast({ title: "Error", description: "Failed to refresh device info", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleOpenConfig = () => {
    if (device) {
      setConfig({
        name: device.name,
        ipAddress: device.ipAddress || '',
        connectionType: (device as any).connectionType || 'wifi',
        role: (device as any).role || 'primary',
      });
      setConfigOpen(true);
    }
  };

  const handleSaveConfig = () => {
    if (!device) return;
    updateDevice(device.id, {
      name: config.name,
      ipAddress: config.ipAddress || null,
      connectionType: config.connectionType,
      role: config.role,
    });
    setConfigOpen(false);
    toast({ title: "Saved", description: "Device configuration updated" });
  };

  const handleUnlink = () => {
    if (device) {
      unlinkFromProject(device.id);
      toast({ title: "Unlinked", description: "Device unlinked from project" });
    }
  };

  const handleLinkDevice = (deviceId: string, projectId: string) => {
    linkDevice(deviceId, projectId);
    setLinkDialogOpen(false);
    toast({ title: "Linked", description: "Device linked to project" });
  };

  if (!device) {
    return (
      <>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              No Device
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72">
            <div className="space-y-3">
              <div className="text-center py-2">
                <Cpu className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">No device linked</p>
                <p className="text-xs text-muted-foreground mt-1">Link a device to enable live features</p>
              </div>
              
              {unlinkedDevices.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Available Devices</p>
                  {unlinkedDevices.slice(0, 3).map((dev) => (
                    <Button
                      key={dev.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => setLinkDialogOpen(true)}
                    >
                      <HardwareIcon hardware={dev.hardware} className="h-4 w-4" />
                      {dev.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setLocation('/devices')}
                >
                  <Cpu className="h-4 w-4 mr-2" />
                  Go to Devices
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Link Device Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Device</DialogTitle>
              <DialogDescription>Select a device to link to this project</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              {unlinkedDevices.map((dev) => (
                <Button
                  key={dev.id}
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    const projectId = window.location.pathname.includes('editor') || window.location.pathname.includes('dashboard')
                      ? localStorage.getItem('currentProjectId') || ''
                      : '';
                    if (projectId) handleLinkDevice(dev.id, projectId);
                  }}
                >
                  <HardwareIcon hardware={dev.hardware} className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">{dev.name}</p>
                    <p className="text-xs text-muted-foreground">{getHardwareLabel(dev.hardware)}</p>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <HardwareIcon hardware={device.hardware} className="h-4 w-4" />
            <span className="max-w-[100px] truncate">{device.name}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardwareIcon hardware={device.hardware} className="h-5 w-5" />
                <div>
                  <p className="font-medium text-sm">{device.name}</p>
                  <p className="text-xs text-muted-foreground">{getHardwareLabel(device.hardware)}</p>
                </div>
              </div>
              <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
                {isConnected ? 'Connected' : connectionState}
              </Badge>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">
                {isConnected ? 'Serial Connected' : 'Not Connected'}
              </span>
              {device.ipAddress && (
                <span className="text-xs text-muted-foreground ml-auto font-mono">
                  {device.ipAddress}
                </span>
              )}
            </div>

            {/* System Info */}
            {isConnected && systemInfo && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Memory</span>
                  <span>{Math.round(systemInfo.free_memory / 1024)} KB free</span>
                </div>
                <Progress value={(systemInfo.free_memory / systemInfo.total_memory) * 100} className="h-1" />
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">CPU</span>
                  <span>{systemInfo.freq_mhz} MHz</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uptime</span>
                  <span>{Math.round(systemInfo.uptime_ms / 1000)}s</span>
                </div>
              </div>
            )}

            {/* Sensor Data */}
            {Object.keys(sensorData).length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Live Data</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(sensorData).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-1 text-xs bg-muted/50 rounded px-2 py-1">
                      <Activity className="h-3 w-3 text-blue-500" />
                      <span className="truncate">{key}:</span>
                      <span className="font-mono">{typeof value === 'number' ? value.toFixed(2) : String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={!isConnected || loading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenConfig}>
                <Settings className="h-3 w-3 mr-1" />
                Configure
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation('/devices')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Devices
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleUnlink}
                className="text-destructive hover:text-destructive"
              >
                <Unlink className="h-3 w-3 mr-1" />
                Unlink
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Configuration Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Device</DialogTitle>
            <DialogDescription>Update device settings and connection parameters</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="config-name">Device Name</Label>
              <Input
                id="config-name"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="config-ip">IP Address</Label>
              <Input
                id="config-ip"
                placeholder="192.168.1.100"
                value={config.ipAddress}
                onChange={(e) => setConfig({ ...config, ipAddress: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Connection Type</Label>
              <Select
                value={config.connectionType}
                onValueChange={(value) => setConfig({ ...config, connectionType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wifi">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      WiFi
                    </div>
                  </SelectItem>
                  <SelectItem value="serial">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Serial (USB)
                    </div>
                  </SelectItem>
                  <SelectItem value="mqtt">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      MQTT
                    </div>
                  </SelectItem>
                  <SelectItem value="websocket">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      WebSocket
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Device Role</Label>
              <Select
                value={config.role}
                onValueChange={(value) => setConfig({ ...config, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary Controller</SelectItem>
                  <SelectItem value="secondary">Secondary Controller</SelectItem>
                  <SelectItem value="sensor">Sensor Node</SelectItem>
                  <SelectItem value="actuator">Actuator Node</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConfig} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Compact version for toolbar
export function DeviceStatusBadge() {
  const { activeDevice, linkedDevice, isConnected } = useDeviceContext();
  const device = activeDevice || linkedDevice;

  if (!device) {
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <Cpu className="h-3 w-3" />
        No Device
      </Badge>
    );
  }

  return (
    <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`} />
      {device.name}
    </Badge>
  );
}
