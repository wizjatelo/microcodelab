import { useState, useRef, useEffect } from "react";
import { Trash2, Filter, Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/store";
import type { LogEntry, LogLevel } from "@shared/schema";

function getLogLevelColor(level: LogLevel): string {
  switch (level) {
    case "error":
      return "text-red-500";
    case "warning":
      return "text-yellow-500";
    case "info":
      return "text-blue-500";
    case "debug":
      return "text-gray-500";
    default:
      return "text-foreground";
  }
}

function getLogLevelBadgeColor(level: LogLevel): string {
  switch (level) {
    case "error":
      return "bg-red-500/10 text-red-500";
    case "warning":
      return "bg-yellow-500/10 text-yellow-500";
    case "info":
      return "bg-blue-500/10 text-blue-500";
    case "debug":
      return "bg-gray-500/10 text-gray-500";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

interface SerialConsoleProps {
  className?: string;
}

export function SerialConsole({ className }: SerialConsoleProps) {
  const { logs, clearLogs } = useAppStore();
  const [filter, setFilter] = useState("");
  const [visibleLevels, setVisibleLevels] = useState<Set<LogLevel>>(
    new Set(["info", "warning", "error", "debug"])
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (!visibleLevels.has(log.level)) return false;
    if (filter && !log.message.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const toggleLevel = (level: LogLevel) => {
    const newLevels = new Set(visibleLevels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    setVisibleLevels(newLevels);
  };

  const downloadLogs = () => {
    const content = filteredLogs
      .map((log) => `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `console-logs-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-col h-full bg-card border rounded-lg ${className}`} data-testid="serial-console">
      <div className="flex items-center gap-2 p-2 border-b">
        <Input
          placeholder="Filter logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-8 text-sm flex-1"
          data-testid="input-log-filter"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-log-level-filter">
              <Filter className="h-4 w-4 mr-1" />
              Levels
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {(["info", "warning", "error", "debug"] as LogLevel[]).map((level) => (
              <DropdownMenuCheckboxItem
                key={level}
                checked={visibleLevels.has(level)}
                onCheckedChange={() => toggleLevel(level)}
              >
                <span className={getLogLevelColor(level)}>{level.toUpperCase()}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" onClick={downloadLogs} data-testid="button-download-logs">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={clearLogs} data-testid="button-clear-logs">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="font-mono text-xs p-2 space-y-1">
          {filteredLogs.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              No logs to display
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 py-0.5 hover:bg-muted/50 rounded px-1"
              >
                <span className="text-muted-foreground shrink-0">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span
                  className={`shrink-0 px-1 rounded text-[10px] uppercase font-semibold ${getLogLevelBadgeColor(log.level)}`}
                >
                  {log.level}
                </span>
                <span className="text-muted-foreground shrink-0">[{log.source}]</span>
                <span className={getLogLevelColor(log.level)}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      <div className="flex items-center justify-between px-2 py-1 border-t text-xs text-muted-foreground">
        <span>{filteredLogs.length} entries</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => setAutoScroll(!autoScroll)}
        >
          Auto-scroll: {autoScroll ? "On" : "Off"}
        </Button>
      </div>
    </div>
  );
}
