import { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  Zap,
  Code2,
  CheckCircle2,
  RotateCcw,
  Copy,
  Check,
  Cpu,
  Activity,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAIChat, useCodeAnalysis } from "@/hooks/use-ai";
import { useDeviceAIContext } from "@/hooks/use-device-context";
import { useDeviceAIIntegration } from "@/hooks/use-device-integration";
import { AIContextData } from "@/lib/ai-service";

// Parse and render AI message with proper formatting
function AIMessageContent({ content }: { content: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const parts = useMemo(() => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const result: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        result.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      // Add code block
      result.push({ type: 'code', content: match[2].trim(), language: match[1] || 'cpp' });
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < content.length) {
      result.push({ type: 'text', content: content.slice(lastIndex) });
    }
    return result;
  }, [content]);

  let codeBlockIndex = 0;

  return (
    <div className="space-y-3">
      {parts.map((part, i) => {
        if (part.type === 'code') {
          const currentIndex = codeBlockIndex++;
          return (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border/50">
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted/80 border-b border-border/50">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {part.language === 'cpp' ? 'Arduino C++' : part.language === 'python' ? 'MicroPython' : part.language}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => handleCopy(part.content, currentIndex)}
                >
                  {copiedIndex === currentIndex ? (
                    <>
                      <Check className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
              <pre className="p-3 bg-zinc-950 dark:bg-zinc-900 overflow-x-auto">
                <code className="text-xs font-mono text-zinc-100 leading-relaxed whitespace-pre">
                  {part.content}
                </code>
              </pre>
            </div>
          );
        }
        
        // Render text with basic markdown
        return (
          <div key={i} className="text-sm leading-relaxed">
            {part.content.split('\n').map((line, j) => {
              // Bold text
              line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              // Inline code
              line = line.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-muted rounded text-xs font-mono">$1</code>');
              
              // Bullet points
              if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                return (
                  <div key={j} className="flex gap-2 ml-2 my-0.5">
                    <span className="text-blue-500">•</span>
                    <span dangerouslySetInnerHTML={{ __html: line.replace(/^[-•]\s*/, '') }} />
                  </div>
                );
              }
              
              // Empty lines
              if (!line.trim()) {
                return <div key={j} className="h-2" />;
              }
              
              return (
                <p key={j} className="my-1" dangerouslySetInnerHTML={{ __html: line }} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

interface AIAssistantProps {
  code: string;
  language: "cpp" | "python";
  fileName?: string;
  errorMessage?: string;
  isCollapsed?: boolean;
}

export function AIAssistant({
  code,
  language,
  fileName,
  errorMessage,
}: AIAssistantProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedTab, setSelectedTab] = useState<"chat" | "analysis" | "device">("chat");
  const { messages, isLoading, error, sendMessage, clearHistory } = useAIChat();
  const { analysis, isLoading: analysisLoading, analyze } = useCodeAnalysis();
  const deviceContext = useDeviceAIContext();
  const deviceIntegration = useDeviceAIIntegration();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-analyze on code change
  useEffect(() => {
    if (selectedTab === "analysis") {
      const timer = setTimeout(() => {
        analyze(code, language);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [code, language, selectedTab, analyze]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Include device context in AI requests
    const context: AIContextData = {
      code,
      language,
      fileName,
      errorMessage,
      deviceContext: deviceContext.hasDevice ? {
        deviceName: deviceContext.deviceName,
        deviceType: deviceContext.deviceType,
        isConnected: deviceContext.isConnected,
        sensorValues: deviceContext.sensorValues,
        capabilities: deviceContext.capabilities,
      } : undefined,
    };

    await sendMessage(inputValue, context);
    setInputValue("");
  };

  return (
    <div className="flex flex-col h-full bg-background border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-500" />
          <h3 className="font-semibold text-sm">AI Assistant</h3>
          {messages.length > 0 && (
            <Badge variant="secondary" className="text-xs h-5">
              {messages.length}
            </Badge>
          )}
          {deviceContext.hasDevice && (
            <Badge variant="outline" className="text-xs h-5 gap-1">
              <Cpu className="h-3 w-3" />
              {deviceContext.isConnected ? "Live" : "Offline"}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b">
        <button
          onClick={() => setSelectedTab("chat")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            selectedTab === "chat"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setSelectedTab("analysis")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            selectedTab === "analysis"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Analysis
        </button>
        <button
          onClick={() => setSelectedTab("device")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            selectedTab === "device"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Device
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedTab === "chat" ? (
          <>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <MessageSquare className="h-8 w-8 opacity-50" />
                <p className="text-sm">Start a conversation with AI assistant</p>
                <p className="text-xs">Ask for code help, debugging, or improvements</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${
                    msg.role === "assistant" ? "justify-start" : "justify-end"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                      <Zap className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg ${
                      msg.role === "assistant"
                        ? "flex-1 bg-card border border-border/50 px-4 py-3"
                        : "bg-blue-600 text-white max-w-[85%] ml-auto px-3 py-2.5 text-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <AIMessageContent content={msg.content} />
                    ) : (
                      <span>{msg.content}</span>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-2 items-center">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            {error && (
              <div className="flex gap-2 items-start bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        ) : selectedTab === "analysis" ? (
          <>
            {analysisLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : analysis && analysis.issues.length > 0 ? (
              <div className="space-y-3">
                {analysis.issues.map((issue, idx) => (
                  <Card key={idx} className="p-3 border">
                    <div className="flex items-start gap-2">
                      {issue.severity === "error" ? (
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      ) : issue.severity === "warning" ? (
                        <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {issue.severity}
                          </Badge>
                          {issue.line && (
                            <span className="text-xs text-muted-foreground">Line {issue.line}</span>
                          )}
                        </div>
                        <p className="text-sm mt-1">{issue.message}</p>
                        {issue.suggestion && (
                          <p className="text-xs text-muted-foreground mt-2">
                            <strong>Suggestion:</strong> {issue.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                  <strong>Summary:</strong> {analysis.summary}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <Code2 className="h-8 w-8 opacity-50" />
                <p className="text-sm">Code looks good!</p>
                <p className="text-xs">No issues found</p>
              </div>
            )}
          </>
        ) : selectedTab === "device" ? (
          <div className="space-y-4">
            {deviceIntegration.hasDevice ? (
              <>
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      deviceIntegration.isConnected ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <Cpu className={`h-5 w-5 ${deviceIntegration.isConnected ? 'text-green-600' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{deviceIntegration.deviceName}</h4>
                      <p className="text-xs text-muted-foreground">{deviceIntegration.deviceType}</p>
                    </div>
                    <Badge variant={deviceIntegration.isConnected ? "default" : "secondary"} className="ml-auto">
                      {deviceIntegration.isConnected ? "Connected" : "Offline"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-3 w-3" />
                      <span>Project: {deviceIntegration.projectName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Code2 className="h-3 w-3" />
                      <span>Language: {deviceIntegration.projectLanguage}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-3 w-3" />
                      <span>Connection: {deviceIntegration.connectionType}</span>
                    </div>
                  </div>
                </Card>

                {deviceIntegration.capabilities && (
                  <Card className="p-4">
                    <h4 className="font-medium text-sm mb-2">Capabilities</h4>
                    <div className="flex flex-wrap gap-1">
                      {deviceIntegration.capabilities.gpio && <Badge variant="outline" className="text-xs">GPIO</Badge>}
                      {deviceIntegration.capabilities.adc && <Badge variant="outline" className="text-xs">ADC</Badge>}
                      {deviceIntegration.capabilities.wifi && <Badge variant="outline" className="text-xs">WiFi</Badge>}
                      {deviceIntegration.capabilities.i2c && <Badge variant="outline" className="text-xs">I2C</Badge>}
                      {deviceIntegration.capabilities.spi && <Badge variant="outline" className="text-xs">SPI</Badge>}
                      {deviceIntegration.capabilities.pwm && <Badge variant="outline" className="text-xs">PWM</Badge>}
                    </div>
                  </Card>
                )}

                {deviceIntegration.availableFunctions.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-medium text-sm mb-2">Available Functions</h4>
                    <div className="space-y-1">
                      {deviceIntegration.availableFunctions.map((func) => (
                        <div key={func} className="flex items-center gap-2 text-xs font-mono bg-muted/50 rounded px-2 py-1">
                          <Zap className="h-3 w-3 text-orange-500" />
                          {func}()
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {Object.keys(deviceIntegration.sensorValues).length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-medium text-sm mb-2">Live Sensor Data</h4>
                    <div className="space-y-2">
                      {Object.entries(deviceIntegration.sensorValues).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{key}</span>
                          <span className="font-mono">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {Object.keys(deviceIntegration.variables).length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-medium text-sm mb-2">Code Variables</h4>
                    <div className="space-y-2">
                      {Object.entries(deviceIntegration.variables).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center text-sm font-mono">
                          <span className="text-blue-600">{key}</span>
                          <span>{value !== undefined ? String(value) : 'undefined'}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                  <strong>AI Tip:</strong> Ask me about your device! I can help with GPIO setup, sensor readings, code optimization, or troubleshooting connection issues.
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <Cpu className="h-8 w-8 opacity-50" />
                <p className="text-sm">No device linked</p>
                <p className="text-xs text-center">Link a device to your project to see device info and enable AI-assisted device control</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Input Footer */}
      {selectedTab === "chat" && (
        <div className="border-t p-3 bg-muted/30">
          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Ask AI for help..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="text-sm flex-1"
              />
              <Button
                size="icon"
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="h-9 w-9 flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {messages.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearHistory}
                className="w-full gap-2 text-xs h-7"
              >
                <RotateCcw className="h-3 w-3" />
                Clear History
              </Button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
