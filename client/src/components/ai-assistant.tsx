<<<<<<< HEAD
import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  Zap,
  Code2,
  CheckCircle2,
  RotateCcw,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAIChat, useCodeAnalysis } from "@/hooks/use-ai";
import { AIContextData } from "@/lib/ai-service";

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
  const [selectedTab, setSelectedTab] = useState<"chat" | "analysis">("chat");
  const { messages, isLoading, error, sendMessage, clearHistory } = useAIChat();
  const { analysis, isLoading: analysisLoading, analyze } = useCodeAnalysis();
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

    const context: AIContextData = {
      code,
      language,
      fileName,
      errorMessage,
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
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <Zap className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div
                    className={`flex-1 rounded-lg px-3 py-2.5 text-sm ${
                      msg.role === "assistant"
                        ? "bg-muted/50"
                        : "bg-blue-600 text-white max-w-[85%] ml-auto"
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {msg.content}
                    </div>
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
        ) : (
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
        )}
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
=======
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Layout,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import type { WidgetConfig, WidgetType } from "@shared/schema";
import { widgetDefinitions } from "@/components/widgets";

interface AIAssistantProps {
  widgets: WidgetConfig[];
  onAddWidget: (type: WidgetType) => void;
  onAutoLayout: () => void;
}

interface WidgetRecommendation {
  type: WidgetType;
  reason: string;
  confidence: number;
}

interface DataInsight {
  type: "anomaly" | "trend" | "correlation" | "alert";
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: Date;
}

export function AIAssistant({ widgets, onAddWidget, onAutoLayout }: AIAssistantProps) {
  const [query, setQuery] = useState("");
  const [insights, setInsights] = useState<DataInsight[]>([
    {
      type: "trend",
      message: "Temperature has been steadily increasing over the last hour",
      severity: "medium",
      timestamp: new Date(Date.now() - 1000 * 60 * 30)
    },
    {
      type: "anomaly",
      message: "Humidity sensor showing unusual spike at 14:23",
      severity: "high",
      timestamp: new Date(Date.now() - 1000 * 60 * 15)
    }
  ]);

  // Analyze device variables and suggest widgets
  const getWidgetRecommendations = (): WidgetRecommendation[] => {
    const recommendations: WidgetRecommendation[] = [];
    
    // Mock analysis - in real implementation, this would analyze device code annotations
    const mockVariables = [
      { name: "temperature", type: "float", annotation: "sensor_data" },
      { name: "led_state", type: "boolean", annotation: "remote_access" },
      { name: "motor_speed", type: "int", annotation: "remote_access" },
      { name: "humidity", type: "float", annotation: "sensor_data" }
    ];

    mockVariables.forEach(variable => {
      if (variable.type === "float" && variable.annotation === "sensor_data") {
        recommendations.push({
          type: "gauge",
          reason: `${variable.name} is a sensor value - perfect for gauge display`,
          confidence: 0.9
        });
        recommendations.push({
          type: "lineChart",
          reason: `Track ${variable.name} trends over time`,
          confidence: 0.8
        });
      }
      
      if (variable.type === "boolean" && variable.annotation === "remote_access") {
        recommendations.push({
          type: "toggle",
          reason: `${variable.name} is controllable boolean - use toggle switch`,
          confidence: 0.95
        });
        recommendations.push({
          type: "ledIndicator",
          reason: `Visual indicator for ${variable.name} status`,
          confidence: 0.7
        });
      }
      
      if (variable.type === "int" && variable.annotation === "remote_access") {
        recommendations.push({
          type: "slider",
          reason: `${variable.name} is controllable number - use slider`,
          confidence: 0.85
        });
      }
    });

    return recommendations.slice(0, 6); // Limit to top 6 recommendations
  };

  const recommendations = getWidgetRecommendations();

  const handleNaturalLanguageQuery = () => {
    // Mock natural language processing
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes("temperature") && lowerQuery.includes("chart")) {
      onAddWidget("lineChart");
      setQuery("");
    } else if (lowerQuery.includes("led") && lowerQuery.includes("control")) {
      onAddWidget("toggle");
      setQuery("");
    } else if (lowerQuery.includes("gauge") || lowerQuery.includes("meter")) {
      onAddWidget("gauge");
      setQuery("");
    }
  };

  const getSeverityColor = (severity: DataInsight["severity"]) => {
    switch (severity) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
    }
  };

  const getInsightIcon = (type: DataInsight["type"]) => {
    switch (type) {
      case "trend": return TrendingUp;
      case "anomaly": return AlertTriangle;
      case "correlation": return Sparkles;
      case "alert": return AlertTriangle;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Assistant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Dashboard Assistant
          </DialogTitle>
          <DialogDescription>
            Get intelligent suggestions for your dashboard layout and widgets
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Auto Layout */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Auto Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                AI will analyze your widgets and arrange them optimally
              </p>
              <Button onClick={onAutoLayout} className="w-full">
                <Layout className="h-4 w-4 mr-2" />
                Arrange Widgets
              </Button>
            </CardContent>
          </Card>

          {/* Widget Recommendations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Widget Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Based on your device variables and code annotations
              </p>
              <div className="space-y-2 max-h-48 overflow-auto">
                {recommendations.map((rec, i) => {
                  const def = widgetDefinitions[rec.type];
                  return (
                    <div key={i} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <def.icon className="h-4 w-4" />
                        <div>
                          <div className="text-sm font-medium">{def.name}</div>
                          <div className="text-xs text-muted-foreground">{rec.reason}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {Math.round(rec.confidence * 100)}%
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAddWidget(rec.type)}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Natural Language Queries */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Ask AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ask questions about your dashboard or request widgets
              </p>
              <div className="space-y-2">
                <Textarea
                  placeholder="e.g., 'Create a temperature chart' or 'Add LED control'"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={handleNaturalLanguageQuery}
                  disabled={!query.trim()}
                  className="w-full"
                >
                  Process Query
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Try asking:</p>
                <ul className="space-y-1">
                  <li>• "Show me temperature over time"</li>
                  <li>• "Add a control for the LED"</li>
                  <li>• "Create a gauge for humidity"</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Data Insights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Data Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                AI-detected patterns and anomalies in your sensor data
              </p>
              <div className="space-y-2 max-h-48 overflow-auto">
                {insights.map((insight, i) => {
                  const Icon = getInsightIcon(insight.type);
                  return (
                    <div key={i} className="flex items-start gap-2 p-2 border rounded">
                      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getSeverityColor(insight.severity)} className="text-xs">
                            {insight.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {insight.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{insight.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
>>>>>>> f5a981abfafe4a30b888b46195df96434a84f2e8
