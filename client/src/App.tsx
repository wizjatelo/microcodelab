import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWebSocket } from "@/hooks/use-websocket";
import NotFound from "@/pages/not-found";
import ProjectsPage from "@/pages/projects";
import EditorPage from "@/pages/editor";
import DashboardPage from "@/pages/dashboard";
import DevicesPage from "@/pages/devices";
import SettingsPage from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ProjectsPage} />
      <Route path="/editor" component={EditorPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/devices" component={DevicesPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  useWebSocket();

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <header className="flex h-14 items-center justify-between gap-4 px-4 border-b bg-background sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
