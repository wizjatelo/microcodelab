import { useState, useEffect } from "react";
import {
  Moon,
  Sun,
  Monitor,
  Wifi,
  Bell,
  Code,
  Zap,
  Save,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";

// Settings type
interface AppSettings {
  autoConnect: boolean;
  notifications: boolean;
  defaultLanguage: "arduino" | "micropython";
  defaultBoard: string;
  serialBaudRate: number;
  editorFontSize: number;
  autoSave: boolean;
}

// Load settings from localStorage
function loadSettings(): AppSettings {
  const saved = localStorage.getItem("ucodelab-settings");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Invalid JSON, use defaults
    }
  }
  return {
    autoConnect: true,
    notifications: true,
    defaultLanguage: "arduino",
    defaultBoard: "esp32",
    serialBaudRate: 9600,
    editorFontSize: 14,
    autoSave: true,
  };
}

// Save settings to localStorage
function saveSettings(settings: AppSettings): void {
  localStorage.setItem("ucodelab-settings", JSON.stringify(settings));
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Moon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <Label className="text-sm font-medium">{title}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { darkMode, setDarkMode } = useAppStore();
  const { toast } = useToast();
  
  // Load initial settings
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);

  // Track changes
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaved(false);
  };

  // Save all settings
  const handleSave = () => {
    saveSettings(settings);
    setHasChanges(false);
    setSaved(true);
    
    toast({
      title: "Settings saved",
      description: "Your preferences have been saved successfully.",
    });

    // Reset saved indicator after 2 seconds
    setTimeout(() => setSaved(false), 2000);
  };

  // Reset to defaults
  const handleReset = () => {
    const defaults: AppSettings = {
      autoConnect: true,
      notifications: true,
      defaultLanguage: "arduino",
      defaultBoard: "esp32",
      serialBaudRate: 9600,
      editorFontSize: 14,
      autoSave: true,
    };
    setSettings(defaults);
    setHasChanges(true);
    toast({
      title: "Settings reset",
      description: "Settings have been reset to defaults. Click Save to apply.",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 p-6 border-b">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your µCodeLab preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-muted-foreground">Unsaved changes</span>
          )}
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges && !saved}>
            {saved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Appearance</CardTitle>
              <CardDescription>
                Customize how µCodeLab looks on your device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <SettingRow
                icon={darkMode ? Moon : Sun}
                title="Dark Mode"
                description="Use dark theme for reduced eye strain"
              >
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  data-testid="switch-dark-mode"
                />
              </SettingRow>
            </CardContent>
          </Card>

          {/* Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Connection</CardTitle>
              <CardDescription>
                Device connection and network settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <SettingRow
                icon={Wifi}
                title="Auto-connect to Devices"
                description="Automatically connect to known devices when available"
              >
                <Switch
                  checked={settings.autoConnect}
                  onCheckedChange={(v) => updateSetting("autoConnect", v)}
                  data-testid="switch-auto-connect"
                />
              </SettingRow>
              <Separator />
              <SettingRow
                icon={Bell}
                title="Notifications"
                description="Receive notifications for device events and updates"
              >
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(v) => updateSetting("notifications", v)}
                  data-testid="switch-notifications"
                />
              </SettingRow>
              <Separator />
              <SettingRow
                icon={Wifi}
                title="Serial Baud Rate"
                description="Default baud rate for serial connections"
              >
                <Select
                  value={String(settings.serialBaudRate)}
                  onValueChange={(v) => updateSetting("serialBaudRate", parseInt(v))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9600">9600</SelectItem>
                    <SelectItem value="19200">19200</SelectItem>
                    <SelectItem value="38400">38400</SelectItem>
                    <SelectItem value="57600">57600</SelectItem>
                    <SelectItem value="115200">115200</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </CardContent>
          </Card>

          {/* Development Defaults */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Development Defaults</CardTitle>
              <CardDescription>
                Default settings for new projects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <SettingRow
                icon={Code}
                title="Default Language"
                description="Programming language for new projects"
              >
                <Select
                  value={settings.defaultLanguage}
                  onValueChange={(v) => updateSetting("defaultLanguage", v as "arduino" | "micropython")}
                >
                  <SelectTrigger className="w-40" data-testid="select-default-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arduino">Arduino C++</SelectItem>
                    <SelectItem value="micropython">MicroPython</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <Separator />
              <SettingRow
                icon={Monitor}
                title="Default Board"
                description="Target hardware for new projects"
              >
                <Select
                  value={settings.defaultBoard}
                  onValueChange={(v) => updateSetting("defaultBoard", v)}
                >
                  <SelectTrigger className="w-40" data-testid="select-default-board">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="esp32">ESP32</SelectItem>
                    <SelectItem value="esp8266">ESP8266</SelectItem>
                    <SelectItem value="arduino_uno">Arduino Uno</SelectItem>
                    <SelectItem value="arduino_nano">Arduino Nano</SelectItem>
                    <SelectItem value="arduino_mega">Arduino Mega</SelectItem>
                    <SelectItem value="raspberry_pi_pico">Raspberry Pi Pico</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <Separator />
              <SettingRow
                icon={Save}
                title="Auto-save"
                description="Automatically save code changes"
              >
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={(v) => updateSetting("autoSave", v)}
                />
              </SettingRow>
            </CardContent>
          </Card>

          {/* Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Editor</CardTitle>
              <CardDescription>Code editor preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <SettingRow
                icon={Code}
                title="Font Size"
                description="Code editor font size in pixels"
              >
                <Select
                  value={String(settings.editorFontSize)}
                  onValueChange={(v) => updateSetting("editorFontSize", parseInt(v))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12px</SelectItem>
                    <SelectItem value="14">14px</SelectItem>
                    <SelectItem value="16">16px</SelectItem>
                    <SelectItem value="18">18px</SelectItem>
                    <SelectItem value="20">20px</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About</CardTitle>
              <CardDescription>Application information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">µCodeLab</h3>
                  <p className="text-sm text-muted-foreground">Version 2.0.0</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Complete IoT platform for Arduino & MicroPython development
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
