import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Cpu,
  MoreVertical,
  Trash2,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  Settings,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAppStore } from "@/lib/store";
import { ConnectionStatusBadge, ConnectionIndicator } from "@/components/connection-status";
import { HardwareIcon, getHardwareLabel } from "@/components/hardware-icon";
import type { Device, HardwareType, ConnectionStatus, Project } from "@shared/schema";
import { hardwareTypes } from "@shared/schema";

function formatLastSeen(lastSeen?: string): string {
  if (!lastSeen) return "Never";
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function DeviceRow({ device, projects, onDelete }: { device: Device; projects: Project[]; onDelete: () => void }) {
  const linkedProject = projects.find((p) => p.id === device.projectId);

  return (
    <TableRow className="h-16" data-testid={`row-device-${device.id}`}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <HardwareIcon hardware={device.hardware} className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">{device.name}</p>
            <p className="text-xs text-muted-foreground">{getHardwareLabel(device.hardware)}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <ConnectionStatusBadge status={device.status} />
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground font-mono">
          {device.ipAddress || "—"}
        </span>
      </TableCell>
      <TableCell>
        {linkedProject ? (
          <Badge variant="outline" className="text-xs">
            <Link2 className="h-3 w-3 mr-1" />
            {linkedProject.name}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Not linked</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {formatLastSeen(device.lastSeen)}
        </span>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-device-menu-${device.id}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </DropdownMenuItem>
            <DropdownMenuItem>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restart
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={onDelete}
              data-testid={`button-delete-device-${device.id}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function DeviceTableSkeleton() {
  return (
    <TableBody>
      {[1, 2, 3].map((i) => (
        <TableRow key={i} className="h-16">
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

function EmptyDevices({ onAddNew, onScan }: { onAddNew: () => void; onScan: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <Cpu className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No devices found</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        Add your first IoT device to start monitoring and controlling
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onScan} data-testid="button-scan-devices">
          <Search className="h-4 w-4 mr-2" />
          Scan Network
        </Button>
        <Button onClick={onAddNew} data-testid="button-add-device-empty">
          <Plus className="h-4 w-4 mr-2" />
          Add Device
        </Button>
      </div>
    </div>
  );
}

export default function DevicesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: "",
    hardware: "esp32" as HardwareType,
    ipAddress: "",
    status: "offline" as ConnectionStatus,
  });
  const { toast } = useToast();

  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newDevice) => {
      return apiRequest("POST", "/api/devices", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      setDialogOpen(false);
      setNewDevice({
        name: "",
        hardware: "esp32",
        ipAddress: "",
        status: "offline",
      });
      toast({
        title: "Device added",
        description: "Your device has been registered.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add device.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/devices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({
        title: "Device removed",
        description: "The device has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove device.",
        variant: "destructive",
      });
    },
  });

  const handleScan = async () => {
    setScanning(true);
    // Simulate network scan
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setScanning(false);
    toast({
      title: "Scan complete",
      description: "No new devices found on the network.",
    });
  };

  const handleCreate = () => {
    if (!newDevice.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a device name.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newDevice);
  };

  const onlineCount = devices?.filter((d) => d.status === "online").length || 0;
  const totalCount = devices?.length || 0;

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 p-6 border-b">
        <div>
          <h1 className="text-2xl font-semibold">Devices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount > 0
              ? `${onlineCount} of ${totalCount} devices online`
              : "Manage your IoT devices"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleScan}
            disabled={scanning}
            data-testid="button-scan-network"
          >
            <Search className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning..." : "Scan Network"}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-device">
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
                <DialogDescription>
                  Register a new IoT device to your platform.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="device-name">Device Name</Label>
                  <Input
                    id="device-name"
                    placeholder="Living Room Sensor"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    data-testid="input-device-name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Hardware Type</Label>
                  <Select
                    value={newDevice.hardware}
                    onValueChange={(value: HardwareType) => setNewDevice({ ...newDevice, hardware: value })}
                  >
                    <SelectTrigger data-testid="select-device-hardware">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hardwareTypes.map((hw) => (
                        <SelectItem key={hw} value={hw}>
                          {getHardwareLabel(hw)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ip-address">IP Address (optional)</Label>
                  <Input
                    id="ip-address"
                    placeholder="192.168.1.100"
                    value={newDevice.ipAddress}
                    onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                    data-testid="input-device-ip"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  data-testid="button-confirm-add-device"
                >
                  {createMutation.isPending ? "Adding..." : "Add Device"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <DeviceTableSkeleton />
            </Table>
          </Card>
        ) : !devices || devices.length === 0 ? (
          <EmptyDevices onAddNew={() => setDialogOpen(true)} onScan={handleScan} />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <DeviceRow
                    key={device.id}
                    device={device}
                    projects={projects || []}
                    onDelete={() => deleteMutation.mutate(device.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
