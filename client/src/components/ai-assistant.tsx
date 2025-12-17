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
