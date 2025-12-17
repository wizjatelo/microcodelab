/**
 * Widget-Code Link Component
 * Shows binding status and enables navigation between widgets and code
 */

import { useState } from "react";
import { Link2, Link2Off, Code, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useWidgetCodeLink } from "@/hooks/use-widget-binding";

// Helper to get recommended variable type based on widget type
function getRecommendedCode(widgetType: string, widgetId: string): { annotation: string; example: string } {
  const annotation = `//@bind_widget(id="${widgetId}")`;
  
  switch (widgetType) {
    case "button":
      return { annotation, example: "void myFunction() {\n  // Your code here\n}" };
    case "toggle":
    case "ledIndicator":
      return { annotation, example: "bool myVariable = false;" };
    case "slider":
    case "gauge":
    case "progressBar":
      return { annotation, example: "int myVariable = 0;" };
    case "valueDisplay":
    case "textDisplay":
      return { annotation, example: "String myVariable = \"\";" };
    default:
      return { annotation, example: "int myVariable = 0;" };
  }
}

// Component for generating and copying binding code
function LinkToCodeSection({ widgetId, widgetType }: { widgetId: string; widgetType: string }) {
  const [copied, setCopied] = useState(false);
  const { annotation, example } = getRecommendedCode(widgetType, widgetId);
  const fullCode = `${annotation}\n${example}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAnnotationOnly = async () => {
    await navigator.clipboard.writeText(annotation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-sm space-y-3">
      <p className="text-muted-foreground">
        Link this widget to your code by adding the annotation.
      </p>
      
      <div className="bg-zinc-900 rounded-lg p-3 font-mono text-xs">
        <div className="text-green-400">{annotation}</div>
        <div className="text-foreground whitespace-pre">{example}</div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
          {copied ? "Copied!" : "Copy Full Code"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyAnnotationOnly}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Paste this in your code editor above your variable or function, then save.
      </p>
    </div>
  );
}

interface WidgetCodeLinkProps {
  widgetId: string;
  widgetType: string;
  onNavigateToCode?: (filePath: string, lineNumber: number) => void;
  compact?: boolean;
}

export function WidgetCodeLink({
  widgetId,
  widgetType,
  onNavigateToCode,
  compact = false,
}: WidgetCodeLinkProps) {
  const { binding, hasBinding, navigateToCode, bindingTarget, dataType } =
    useWidgetCodeLink(widgetId);
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = () => {
    const location = navigateToCode();
    if (location && onNavigateToCode) {
      onNavigateToCode(location.filePath, location.lineNumber);
      setIsOpen(false);
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-5 w-5 ${hasBinding ? "text-green-500" : "text-muted-foreground"}`}
              onClick={hasBinding ? handleNavigate : undefined}
              disabled={!hasBinding}
            >
              {hasBinding ? (
                <Link2 className="h-3 w-3" />
              ) : (
                <Link2Off className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {hasBinding ? (
              <div className="text-xs">
                <p className="font-medium">Bound to: {bindingTarget}</p>
                <p className="text-muted-foreground">Click to view code</p>
              </div>
            ) : (
              <p className="text-xs">No code binding</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-7 gap-1.5 ${hasBinding ? "border-green-500/50" : ""}`}
        >
          {hasBinding ? (
            <Link2 className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Link2Off className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-xs">
            {hasBinding ? "Linked" : "Not Linked"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Code Binding</h4>
            <Badge variant={hasBinding ? "default" : "secondary"} className="text-xs">
              {hasBinding ? "Active" : "Inactive"}
            </Badge>
          </div>

          {hasBinding && binding ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Target:</span>
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  {binding.bindingTarget}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span>{binding.bindingType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Data Type:</span>
                <span>{binding.dataType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">File:</span>
                <span className="text-xs truncate max-w-[120px]">
                  {binding.filePath}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Line:</span>
                <span>{binding.lineNumber}</span>
              </div>

              <Button
                variant="default"
                size="sm"
                className="w-full mt-2"
                onClick={handleNavigate}
              >
                <Code className="h-3.5 w-3.5 mr-1.5" />
                Go to Code
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Button>
            </div>
          ) : (
            <LinkToCodeSection widgetId={widgetId} widgetType={widgetType} />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Binding status indicator for widget headers
 */
export function BindingStatusIndicator({
  widgetId,
  size = "sm",
}: {
  widgetId: string;
  size?: "sm" | "md";
}) {
  const { hasBinding, bindingTarget } = useWidgetCodeLink(widgetId);

  if (!hasBinding) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div
            className={`flex items-center gap-1 ${
              size === "sm" ? "text-xs" : "text-sm"
            }`}
          >
            <Link2 className={`${size === "sm" ? "h-3 w-3" : "h-4 w-4"} text-green-500`} />
            <span className="text-green-500 font-mono">{bindingTarget}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Bound to code variable: {bindingTarget}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
