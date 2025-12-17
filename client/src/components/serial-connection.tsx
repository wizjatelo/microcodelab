import { useState } from 'react';
import { Usb, Unplug, Loader2, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { useWebSerial } from '@/hooks/use-web-serial';
import { useToast } from '@/hooks/use-toast';

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200];

export function SerialConnection() {
  const { isConnected, isSupported, messages, connect, disconnect, send } = useWebSerial();
  const [isConnecting, setIsConnecting] = useState(false);
  const [baudRate, setBaudRate] = useState(9600);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const { toast } = useToast();

  const handleSendCommand = async () => {
    if (!commandInput.trim()) return;
    const success = await send(commandInput.trim());
    if (success) {
      setCommandInput('');
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await connect(baudRate);
      if (success) {
        toast({ title: 'Connected', description: `Serial port connected at ${baudRate} baud` });
      }
    } catch (error) {
      toast({ title: 'Connection Failed', description: 'Could not connect to serial port', variant: 'destructive' });
    }
    setIsConnecting(false);
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast({ title: 'Disconnected', description: 'Serial port disconnected' });
  };

  if (!isSupported) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <AlertCircle className="h-4 w-4" />
        Serial Not Supported
      </Button>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isConnected ? "default" : "outline"} 
          size="sm" 
          className="gap-2"
        >
          {isConnected ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Connected
            </>
          ) : (
            <>
              <Usb className="h-4 w-4" />
              Connect USB
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Usb className="h-5 w-5" />
            USB Serial Connection
          </DialogTitle>
          <DialogDescription>
            Connect to your Arduino Uno via USB serial port
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Status</span>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          {/* Baud Rate Selection */}
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
                      {rate} baud
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Connect/Disconnect Button */}
          <div className="flex gap-2">
            {isConnected ? (
              <Button variant="destructive" className="flex-1" onClick={handleDisconnect}>
                <Unplug className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Usb className="h-4 w-4 mr-2" />
                )}
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            )}
          </div>

          {/* Send Command */}
          {isConnected && (
            <div className="space-y-2">
              <Label>Send Command</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="TOGGLE, ON, OFF, STATUS..."
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                  className="flex-1"
                />
                <Button size="icon" onClick={handleSendCommand}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Recent Messages */}
          {messages.length > 0 && (
            <div className="space-y-2">
              <Label>Recent Messages</Label>
              <ScrollArea className="h-32 rounded border bg-zinc-950 p-2">
                <div className="font-mono text-xs space-y-1">
                  {messages.slice(-10).map((msg, i) => (
                    <div 
                      key={i} 
                      className={
                        msg.type === 'error' ? 'text-red-400' :
                        msg.type === 'tx' ? 'text-cyan-400' :
                        msg.type === 'rx' ? 'text-green-400' :
                        msg.type === 'connected' ? 'text-green-400' :
                        msg.type === 'disconnected' ? 'text-yellow-400' :
                        'text-foreground'
                      }
                    >
                      [{msg.timestamp.toLocaleTimeString()}] {msg.type === 'tx' ? '→ TX: ' : msg.type === 'rx' ? '← RX: ' : ''}{msg.data}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>1. Connect your Arduino Uno via USB cable</p>
            <p>2. Click "Connect" and select the COM port</p>
            <p>3. Make sure your Arduino code uses Serial.begin({baudRate})</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
