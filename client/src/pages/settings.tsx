import { useState } from "react";
import {
  Moon,
  Sun,
  Monitor,
  Wifi,
  Bell,
  Palette,
  Code,
  Info,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAppStore } from "@/lib/store";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const [autoConnect, setAutoConnect] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState("arduino");
  const [defaultBoard, setDefaultBoard] = useState("esp32");

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 p-6 border-b">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your µCodeLab preferences
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
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
                  checked={autoConnect}
                  onCheckedChange={setAutoConnect}
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
                  checked={notifications}
                  onCheckedChange={setNotifications}
                  data-testid="switch-notifications"
                />
              </SettingRow>
            </CardContent>
          </Card>

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
                <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
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
                <Select value={defaultBoard} onValueChange={setDefaultBoard}>
                  <SelectTrigger className="w-40" data-testid="select-default-board">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="esp32">ESP32</SelectItem>
                    <SelectItem value="esp8266">ESP8266</SelectItem>
                    <SelectItem value="arduino_uno">Arduino Uno</SelectItem>
                    <SelectItem value="rpi_pico">Raspberry Pi Pico</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About</CardTitle>
              <CardDescription>
                Application information
              </CardDescription>
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
                    Complete IoT platform with Arduino/MicroPython development
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
