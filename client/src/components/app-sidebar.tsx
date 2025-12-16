import { useLocation, Link } from "wouter";
import {
  FolderOpen,
  Code,
  LayoutDashboard,
  Cpu,
  Settings,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";

const mainNavItems = [
  {
    title: "Projects",
    url: "/",
    icon: FolderOpen,
  },
  {
    title: "Code Editor",
    url: "/editor",
    icon: Code,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Devices",
    url: "/devices",
    icon: Cpu,
  },
];

const settingsNavItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { wsConnected } = useAppStore();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/">
          <div className="flex items-center gap-3 hover-elevate active-elevate-2 rounded-md p-2 -m-2 cursor-pointer" data-testid="link-home">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">µCodeLab</span>
              <span className="text-xs text-muted-foreground">IoT Platform</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-nav-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div
            className={`h-2 w-2 rounded-full ${
              wsConnected ? "bg-status-online animate-pulse" : "bg-status-offline"
            }`}
          />
          <span>{wsConnected ? "Connected" : "Disconnected"}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
