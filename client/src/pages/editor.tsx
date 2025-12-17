import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Play,
  Upload,
  Save,
  FileCode,
  FolderOpen,
  Plus,
  X,
  ChevronLeft,
  MoreVertical,
  Trash2,
  File,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAppStore } from "@/lib/store";
import { AICodeEditor } from "@/components/ai-code-editor";
import { SerialConsole } from "@/components/serial-console";
import { DeployDialog } from "@/components/deploy-dialog";
import { AIAssistant } from "@/components/ai-assistant";
import { getHardwareLabel, getLanguageLabel } from "@/components/hardware-icon";
import type { Project, CodeFile } from "@shared/schema";

const DEFAULT_ARDUINO_CODE = `// µCodeLab - Arduino Sketch
// @remote_access variables can be monitored/controlled from dashboard
// @remote_function functions can be called from dashboard

#include <WiFi.h>

// @remote_access
int ledState = LOW;

// @sensor_data
float temperature = 0.0;

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  
  // Initialize µCodeLab connection
  Serial.println("µCodeLab device ready!");
}

void loop() {
  // Read temperature sensor
  temperature = analogRead(A0) * 0.1;
  
  // Update LED
  digitalWrite(LED_BUILTIN, ledState);
  
  delay(100);
}

// @remote_function
void toggleLED() {
  ledState = !ledState;
  Serial.println("LED toggled!");
}
`;

const DEFAULT_MICROPYTHON_CODE = `# µCodeLab - MicroPython Script
# @remote_access variables can be monitored/controlled from dashboard
# @remote_function functions can be called from dashboard

from machine import Pin, ADC
import time

# @remote_access
led_state = False

# @sensor_data
temperature = 0.0

led = Pin(2, Pin.OUT)
adc = ADC(Pin(34))

def setup():
    print("µCodeLab device ready!")

# @remote_function
def toggle_led():
    global led_state
    led_state = not led_state
    led.value(led_state)
    print("LED toggled!")

def loop():
    global temperature
    temperature = adc.read() * 0.1
    led.value(led_state)
    time.sleep(0.1)

# Main
setup()
while True:
    loop()
`;

function FileTab({
  file,
  isActive,
  onSelect,
  onClose,
}: {
  file: CodeFile;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 cursor-pointer border-r ${
        isActive ? "bg-background" : "bg-muted/50 hover:bg-muted"
      }`}
      onClick={onSelect}
      data-testid={`tab-file-${file.id}`}
    >
      <FileCode className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{file.name}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        data-testid={`button-close-file-${file.id}`}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function NoProjectSelected() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <FolderOpen className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No project selected</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        Open a project from the projects page to start editing code
      </p>
      <Button onClick={() => setLocation("/")} data-testid="button-go-to-projects">
        <FolderOpen className="h-4 w-4 mr-2" />
        Open Projects
      </Button>
    </div>
  );
}

export default function EditorPage() {
  const { currentProjectId, currentFileId, setCurrentFile } = useAppStore();
  const [deployOpen, setDeployOpen] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [localContent, setLocalContent] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", currentProjectId],
    enabled: !!currentProjectId,
  });

  const { data: files, isLoading: filesLoading } = useQuery<CodeFile[]>({
    queryKey: ["/api/projects", currentProjectId, "files"],
    enabled: !!currentProjectId,
  });

  const currentFile = files?.find((f) => f.id === currentFileId);

  useEffect(() => {
    if (files && files.length > 0 && !currentFileId) {
      setCurrentFile(files[0].id);
    }
  }, [files, currentFileId, setCurrentFile]);

  useEffect(() => {
    if (currentFile && localContent[currentFile.id] === undefined) {
      setLocalContent((prev) => ({ ...prev, [currentFile.id]: currentFile.content }));
    }
  }, [currentFile]);

  const createFileMutation = useMutation({
    mutationFn: async (data: { name: string; language: "arduino" | "micropython" }) => {
      const content = data.language === "arduino" ? DEFAULT_ARDUINO_CODE : DEFAULT_MICROPYTHON_CODE;
      return apiRequest(`/api/projects/${currentProjectId}/files`, {
        method: "POST",
        body: {
          name: data.name,
          content,
          language: data.language,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProjectId, "files"] });
      setNewFileOpen(false);
      setNewFileName("");
      toast({ title: "File created", description: "New file has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create file.", variant: "destructive" });
    },
  });

  const saveFileMutation = useMutation({
    mutationFn: async ({ fileId, content }: { fileId: string; content: string }) => {
      return apiRequest(`/api/projects/${currentProjectId}/files/${fileId}`, { method: "PATCH", body: { content } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProjectId, "files"] });
      setHasUnsavedChanges(false);
      toast({ title: "Saved", description: "File saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save file.", variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest(`/api/projects/${currentProjectId}/files/${fileId}`, { method: "DELETE" });
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProjectId, "files"] });
      if (currentFileId === deletedId) {
        setCurrentFile(null);
      }
      toast({ title: "File deleted", description: "File has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete file.", variant: "destructive" });
    },
  });

  const handleContentChange = (content: string) => {
    if (currentFile) {
      setLocalContent((prev) => ({ ...prev, [currentFile.id]: content }));
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = () => {
    if (currentFile && localContent[currentFile.id] !== undefined) {
      saveFileMutation.mutate({ fileId: currentFile.id, content: localContent[currentFile.id] });
    }
  };

  const handleCreateFile = () => {
    if (!newFileName.trim()) {
      toast({ title: "Error", description: "Please enter a file name.", variant: "destructive" });
      return;
    }
    const language = project?.language === "micropython" ? "micropython" : "arduino";
    const extension = language === "micropython" ? ".py" : ".ino";
    const name = newFileName.endsWith(extension) ? newFileName : `${newFileName}${extension}`;
    createFileMutation.mutate({ name, language });
  };

  if (!currentProjectId) {
    return <NoProjectSelected />;
  }

  if (projectLoading || filesLoading) {
    return (
      <div className="flex flex-col h-full p-4 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[calc(100%-40px)] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => useAppStore.getState().setCurrentProject(null)}
            data-testid="button-back-to-projects"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">{project?.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{getHardwareLabel(project?.hardware || "esp32")}</span>
              <span className="text-muted">|</span>
              <span>{getLanguageLabel(project?.language || "arduino")}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="text-xs">Unsaved changes</Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saveFileMutation.isPending}
            data-testid="button-save-file"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setDeployOpen(true)}
            data-testid="button-deploy"
          >
            <Upload className="h-4 w-4 mr-2" />
            Deploy
          </Button>
        </div>
      </header>

      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={60} minSize={30}>
          <div className="flex flex-col h-full">
            <div className="flex items-center border-b bg-muted/30">
              <div className="flex items-center flex-1 overflow-x-auto">
                {files?.map((file) => (
                  <FileTab
                    key={file.id}
                    file={file}
                    isActive={file.id === currentFileId}
                    onSelect={() => setCurrentFile(file.id)}
                    onClose={() => deleteFileMutation.mutate(file.id)}
                  />
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 ml-1"
                  onClick={() => setNewFileOpen(true)}
                  data-testid="button-new-file"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {/* Main Editor Area */}
              <div className="flex-1 overflow-hidden">
                {currentFile ? (
                  <AICodeEditor
                    value={localContent[currentFile.id] ?? currentFile.content}
                    onChange={handleContentChange}
                    language={currentFile.language === "micropython" ? "python" : "cpp"}
                    fileName={currentFile.name}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No file selected</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setNewFileOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create File
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Fixed AI Assistant Panel - Kiro AI Style */}
              <div className="w-[420px] flex-shrink-0 overflow-hidden">
                {currentFile ? (
                  <AIAssistant
                    code={localContent[currentFile.id] ?? currentFile.content}
                    language={currentFile.language === "micropython" ? "python" : "cpp"}
                    fileName={currentFile.name}
                  />
                ) : (
                  <div className="flex flex-col h-full bg-background border-l">
                    <div className="flex items-center gap-2 px-4 py-3 border-b">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <h3 className="font-semibold text-sm">AI Assistant</h3>
                    </div>
                    <div className="flex items-center justify-center flex-1 text-muted-foreground">
                      <p className="text-sm">Open a file to use AI Assistant</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ResizablePanel>
        
        <ResizableHandle />
        
        <ResizablePanel defaultSize={40} minSize={20}>
          <SerialConsole />
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog open={newFileOpen} onOpenChange={setNewFileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              Enter a name for your new {project?.language === "micropython" ? "Python" : "Arduino"} file.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="filename">File Name</Label>
              <Input
                id="filename"
                placeholder={project?.language === "micropython" ? "main.py" : "main.ino"}
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                data-testid="input-new-file-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFileOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFile}
              disabled={createFileMutation.isPending}
              data-testid="button-create-file"
            >
              {createFileMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeployDialog
        open={deployOpen}
        onOpenChange={setDeployOpen}
        projectId={currentProjectId}
        projectName={project?.name || ""}
      />
    </div>
  );
}
