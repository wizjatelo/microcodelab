import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ConnectionStatus } from "@shared/schema";

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
  className?: string;
}

export function ConnectionStatusBadge({ status, className }: ConnectionStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "online":
        return {
          icon: Wifi,
          label: "Online",
          className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
        };
      case "connecting":
        return {
          icon: Loader2,
          label: "Connecting",
          className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
          animate: true,
        };
      case "offline":
      default:
        return {
          icon: WifiOff,
          label: "Offline",
          className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      <Icon className={`h-3 w-3 mr-1 ${config.animate ? "animate-spin" : ""}`} />
      {config.label}
    </Badge>
  );
}

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  showLabel?: boolean;
}

export function ConnectionIndicator({ status, showLabel = true }: ConnectionIndicatorProps) {
  const getColor = () => {
    switch (status) {
      case "online":
        return "bg-status-online";
      case "connecting":
        return "bg-status-away animate-pulse";
      case "offline":
      default:
        return "bg-status-offline";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${getColor()}`} />
      {showLabel && (
        <span className="text-xs text-muted-foreground capitalize">{status}</span>
      )}
    </div>
  );
}
