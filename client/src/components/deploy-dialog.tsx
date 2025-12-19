import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Copy,
  Download,
  Terminal,
  CheckCircle2,
  ExternalLink,
  FileCode,
  Info,
  Usb,
  Loader2,
  XCircle,
  RefreshCw,
  Cpu,
  Play,
  Upload,
  Binary,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { webSerial } from "@/services/web-serial";
import { micropythonDeploy } from "@/services/micropython-deploy";
import type { CodeFile, Project } from "@shared/schema";

interface DeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

interface BoardInfo {
  fqbn: string;
  name: string;
  port: string;
}

interface ArduinoStatus {
  installed: boolean;
  version?: string;
}

interface CompileResult {
  success: boolean;
  errors: string[];
  binarySize?: number;
}

interface UploadResult {
  success: boolean;
  error?: string;
}

export function DeployDialog({ open, onOpenChange, projectId, projectName }: DeployDialogProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPort, setSelectedPort] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [isSerialConnected, setIsSerialConnected] = useState(false);
  const [useBinaryUpload, setUseBinaryUpload] = useState(false);
  const [mpyCompilerAvailable, setMpyCompilerAvailable] = useState(false);
  const { toast } = useToast();
  const { addLog } = useAppStore();

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId && open,
  });

  const { data: files } = useQuery<CodeFile[]>({
    queryKey: ["/api/projects", projectId, "files"],
    enabled: !!projectId && open,
  });

  const isMicroPython = project?.language === "micropython";
  const mainFile = files?.[0];
  const code = mainFile?.content || "";
  const fileName = mainFile?.name || (isMicroPython ? "main.py" : "sketch.ino");

  const { data: arduinoStatus } = useQuery<ArduinoStatus>({
    queryKey: ["/api/arduino/status"],
    enabled: open && !isMicroPython,
  });

  const { data: boardsData, refetch: refetchBoards } = useQuery<{ boards: BoardInfo[] }>({
    queryKey: ["/api/arduino/boards"],
    enabled: open && !isMicroPython && arduinoStatus?.installed,
    refetchInterval: open && !isMicroPython ? 3000 : false,
  });

  const boards = boardsData?.boards || [];

  useEffect(() => {
    if (open && isMicroPython) {
      setIsSerialConnected(webSerial.getConnectionStatus());
      const unsubscribe = webSerial.subscribe((msg) => {
        if (msg.type === "connected") setIsSerialConnected(true);
        if (msg.type === "disconnected") setIsSerialConnected(false);
      });
      
      // Check if mpy-cross compiler is available
      micropythonDeploy.checkCompilerStatus().then((status) => {
        setMpyCompilerAvailable(status.installed);
      });
      
      return unsubscribe;
    }
  }, [open, isMicroPython]);

  useEffect(() => {
    if (boards.length > 0 && !selectedPort) {
      setSelectedPort(boards[0].port);
    }
  }, [boards, selectedPort]);

  const compileMutation = useMutation({
    mutationFn: () => apiRequest<CompileResult>("/api/arduino/compile", { method: "POST", body: { code, boardType: "arduino_uno", fileName } }),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "Compilation successful!", description: `Size: ${result.binarySize || "unknown"} bytes` });
      } else {
        toast({ title: "Compilation failed", description: result.errors[0], variant: "destructive" });
      }
    },
  });

  const arduinoUploadMutation = useMutation({
    mutationFn: () => {
      setUploadProgress(10);
      setUploadStage("Compiling...");
      return apiRequest<UploadResult>("/api/arduino/upload", { method: "POST", body: { code, port: selectedPort, boardType: "arduino_uno", fileName } });
    },
    onSuccess: (result) => {
      setUploadProgress(100);
      setUploadStage(result.success ? "Complete!" : "Failed");
      toast({ title: result.success ? "Upload successful!" : "Upload failed", description: result.error, variant: result.success ? "default" : "destructive" });
    },
  });

  const micropythonUploadMutation = useMutation({
    mutationFn: () => {
      if (useBinaryUpload) {
        return micropythonDeploy.compileAndUpload(fileName, code, (stage, progress) => { 
          setUploadStage(stage); 
          setUploadProgress(progress); 
        });
      }
      return micropythonDeploy.uploadSourceFile(fileName, code, (stage, progress) => { 
        setUploadStage(stage); 
        setUploadProgress(progress); 
      });
    },
    onSuccess: (result) => {
      toast({ title: result.success ? "Upload successful!" : "Upload failed", description: result.message, variant: result.success ? "default" : "destructive" });
    },
  });

  const micropythonRunMutation = useMutation({
    mutationFn: () => micropythonDeploy.uploadAndRun(fileName, code, useBinaryUpload, (stage, progress) => { 
      setUploadStage(stage); 
      setUploadProgress(progress); 
    }),
    onSuccess: (result) => {
      toast({ title: result.success ? "Running!" : "Run failed", description: result.message, variant: result.success ? "default" : "destructive" });
    },
  });

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Code copied!" });
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "File downloaded!" });
  };

  const handleConnectSerial = async () => {
    const connected = await webSerial.connect(115200);
    if (connected) toast({ title: "Connected!" });
  };

  const isUploading = arduinoUploadMutation.isPending || micropythonUploadMutation.isPending || micropythonRunMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Deploy to Device
            <span className={`text-xs px-2 py-0.5 rounded-full ${isMicroPython ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`}>
              {isMicroPython ? "MicroPython" : "Arduino C++"}
            </span>
          </DialogTitle>
          <DialogDescription>
            Upload "{projectName}" • Detected: {isMicroPython ? "Python (.py)" : "Arduino (.ino)"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="direct" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="direct"><Usb className="h-3 w-3 mr-1" />Upload</TabsTrigger>
            <TabsTrigger value="copy"><Copy className="h-3 w-3 mr-1" />Copy</TabsTrigger>
            <TabsTrigger value="cli"><Terminal className="h-3 w-3 mr-1" />CLI</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4 mt-4">
            {isMicroPython ? (
              <>
                {!isSerialConnected ? (
                  <Alert><Info className="h-4 w-4" /><AlertDescription>Connect via Serial to upload</AlertDescription></Alert>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" />Connected</div>
                )}
                
                {/* Binary upload toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Binary className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="binary-upload" className="text-sm font-medium">Upload as binary (.mpy)</Label>
                      <p className="text-xs text-muted-foreground">Compile to bytecode for faster execution</p>
                    </div>
                  </div>
                  <Switch
                    id="binary-upload"
                    checked={useBinaryUpload}
                    onCheckedChange={setUseBinaryUpload}
                    disabled={!mpyCompilerAvailable}
                  />
                </div>
                {!mpyCompilerAvailable && useBinaryUpload === false && (
                  <p className="text-xs text-muted-foreground">mpy-cross not installed on server. Install with: pip install mpy-cross</p>
                )}
                
                {isUploading && <div className="space-y-2"><div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{uploadStage}</div><Progress value={uploadProgress} /></div>}
                <div className="flex gap-2">
                  {!isSerialConnected ? (
                    <Button className="flex-1" onClick={handleConnectSerial}><Usb className="h-4 w-4 mr-2" />Connect</Button>
                  ) : (
                    <>
                      <Button variant="outline" className="flex-1" onClick={() => micropythonUploadMutation.mutate()} disabled={isUploading}>
                        {useBinaryUpload ? <Binary className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        Upload {useBinaryUpload ? ".mpy" : ".py"}
                      </Button>
                      <Button className="flex-1" onClick={() => micropythonRunMutation.mutate()} disabled={isUploading}><Play className="h-4 w-4 mr-2" />Run</Button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                {!arduinoStatus?.installed ? (
                  <Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertTitle>Arduino CLI Not Found</AlertTitle></Alert>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" />CLI v{arduinoStatus.version}</div>
                    <div className="flex items-center justify-between"><span className="text-sm">Board</span><Button variant="ghost" size="sm" onClick={() => refetchBoards()}><RefreshCw className="h-3 w-3" /></Button></div>
                    {boards.length === 0 ? <Alert><Info className="h-4 w-4" /><AlertDescription>No boards detected</AlertDescription></Alert> : (
                      <Select value={selectedPort} onValueChange={setSelectedPort}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{boards.map((b) => <SelectItem key={b.port} value={b.port}><Cpu className="h-4 w-4 mr-2 inline" />{b.name} ({b.port})</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                    {isUploading && <div className="space-y-2"><div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{uploadStage}</div><Progress value={uploadProgress} /></div>}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => compileMutation.mutate()} disabled={compileMutation.isPending}><CheckCircle2 className="h-4 w-4 mr-2" />Verify</Button>
                      <Button className="flex-1" onClick={() => arduinoUploadMutation.mutate()} disabled={isUploading || !selectedPort}><Usb className="h-4 w-4 mr-2" />Upload</Button>
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="copy" className="space-y-4 mt-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg"><FileCode className="h-5 w-5" /><div><p className="text-sm font-medium">{fileName}</p><p className="text-xs text-muted-foreground">{code.length} chars</p></div></div>
            <div className="flex gap-2">
              <Button onClick={handleCopyCode} variant="outline" className="flex-1">{copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}{copied ? "Copied!" : "Copy"}</Button>
              <Button onClick={handleDownload} className="flex-1"><Download className="h-4 w-4 mr-2" />Download</Button>
            </div>
          </TabsContent>

          <TabsContent value="cli" className="space-y-4 mt-4">
            <div className="bg-zinc-900 text-zinc-100 p-3 rounded-lg text-xs font-mono">
              {isMicroPython ? <><code>pip install mpremote</code><br /><code>mpremote cp {fileName} :</code></> : <><code>arduino-cli compile --fqbn arduino:avr:uno {fileName}</code><br /><code>arduino-cli upload -p COM3 --fqbn arduino:avr:uno</code></>}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
