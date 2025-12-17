import { useRef, useEffect, useState, useCallback } from "react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { widgetBindingRegistry } from "@/services/widget-binding";
import {
  Command,
  Search,
  Settings,
  Maximize2,
  Minimize2,
  GitBranch,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Lightbulb,
  Play,
  Bug,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WidgetInfo {
  id: string;
  type: string;
  label: string;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "cpp" | "python";
  readOnly?: boolean;
  onSave?: () => void;
  fileName?: string;
  filePath?: string;
  widgets?: WidgetInfo[];
  onNavigateToWidget?: (widgetId: string) => void;
}

interface Problem {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info" | "hint";
  source: string;
  quickFix?: string;
}

interface EditorTheme {
  id: string;
  name: string;
  type: "dark" | "light";
}


const EDITOR_THEMES: EditorTheme[] = [
  { id: "vs-dark", name: "Dark (Default)", type: "dark" },
  { id: "vs", name: "Light", type: "light" },
  { id: "hc-black", name: "High Contrast", type: "dark" },
];

// Arduino/C++ snippets and completions
const ARDUINO_SNIPPETS = [
  {
    label: "@bind_widget",
    kind: 15, // Snippet
    insertText: '//@bind_widget(id="${1:widget_id}")',
    insertTextRules: 4, // InsertAsSnippet
    detail: "Bind variable/function to dashboard widget",
    documentation: "Link this variable or function to a UI widget for bidirectional control. The widget_id must match a widget in the dashboard designer.",
  },
  {
    label: "@remote_access",
    kind: 15, // Snippet
    insertText: "@remote_access",
    detail: "Expose variable for monitoring/control",
    documentation: "Mark a variable to be accessible from the dashboard",
  },
  {
    label: "@remote_function",
    kind: 15,
    insertText: "@remote_function",
    detail: "Make function callable from dashboard",
    documentation: "Mark a function to be callable from the React dashboard",
  },
  {
    label: "@sensor_data",
    kind: 15,
    insertText: "@sensor_data",
    detail: "Mark variable for automatic transmission",
    documentation: "Automatically transmit variable updates to dashboard",
  },
  {
    label: "@watch",
    kind: 15,
    insertText: "@watch",
    detail: "Watch variable in debugger",
    documentation: "Monitor this variable during debugging",
  },
  {
    label: "@expose",
    kind: 15,
    insertText: "@expose",
    detail: "Expose via MQTT",
    documentation: "Expose this variable/function via MQTT protocol",
  },
  {
    label: "setup",
    kind: 15,
    insertText: "void setup() {\n  ${1:// initialization code}\n}",
    insertTextRules: 4, // InsertAsSnippet
    detail: "Arduino setup function",
  },
  {
    label: "loop",
    kind: 15,
    insertText: "void loop() {\n  ${1:// main code}\n}",
    insertTextRules: 4,
    detail: "Arduino loop function",
  },
  {
    label: "pinMode",
    kind: 3, // Function
    insertText: "pinMode(${1:pin}, ${2|INPUT,OUTPUT,INPUT_PULLUP|});",
    insertTextRules: 4,
    detail: "Configure pin mode",
  },
  {
    label: "digitalWrite",
    kind: 3,
    insertText: "digitalWrite(${1:pin}, ${2|HIGH,LOW|});",
    insertTextRules: 4,
    detail: "Write digital value to pin",
  },
  {
    label: "digitalRead",
    kind: 3,
    insertText: "digitalRead(${1:pin})",
    insertTextRules: 4,
    detail: "Read digital value from pin",
  },
  {
    label: "analogRead",
    kind: 3,
    insertText: "analogRead(${1:pin})",
    insertTextRules: 4,
    detail: "Read analog value from pin",
  },
  {
    label: "analogWrite",
    kind: 3,
    insertText: "analogWrite(${1:pin}, ${2:value});",
    insertTextRules: 4,
    detail: "Write PWM value to pin",
  },
  {
    label: "Serial.begin",
    kind: 3,
    insertText: "Serial.begin(${1|9600,115200,57600,38400|});",
    insertTextRules: 4,
    detail: "Initialize serial communication",
  },
  {
    label: "Serial.println",
    kind: 3,
    insertText: "Serial.println(${1:message});",
    insertTextRules: 4,
    detail: "Print line to serial",
  },
  {
    label: "delay",
    kind: 3,
    insertText: "delay(${1:milliseconds});",
    insertTextRules: 4,
    detail: "Pause execution (blocking)",
  },
  {
    label: "millis",
    kind: 3,
    insertText: "millis()",
    detail: "Get milliseconds since start (non-blocking)",
  },
  {
    label: "WiFi.begin",
    kind: 3,
    insertText: 'WiFi.begin("${1:ssid}", "${2:password}");',
    insertTextRules: 4,
    detail: "Connect to WiFi network",
  },
];


// MicroPython snippets
const MICROPYTHON_SNIPPETS = [
  {
    label: "@bind_widget",
    kind: 15,
    insertText: '# @bind_widget(id="${1:widget_id}")',
    insertTextRules: 4,
    detail: "Bind variable/function to dashboard widget",
    documentation: "Link this variable or function to a UI widget for bidirectional control.",
  },
  {
    label: "@remote_access",
    kind: 15,
    insertText: "# @remote_access",
    detail: "Expose variable for monitoring/control",
  },
  {
    label: "@remote_function",
    kind: 15,
    insertText: "# @remote_function",
    detail: "Make function callable from dashboard",
  },
  {
    label: "@watch",
    kind: 15,
    insertText: "# @watch",
    detail: "Watch variable in debugger",
  },
  {
    label: "import machine",
    kind: 15,
    insertText: "import machine\nfrom machine import Pin, ADC, PWM",
    detail: "Import MicroPython machine module",
  },
  {
    label: "Pin",
    kind: 6, // Class
    insertText: "Pin(${1:pin_number}, Pin.${2|OUT,IN,IN_PULL_UP|})",
    insertTextRules: 4,
    detail: "Create GPIO pin object",
  },
  {
    label: "ADC",
    kind: 6,
    insertText: "ADC(Pin(${1:pin_number}))",
    insertTextRules: 4,
    detail: "Create ADC object",
  },
  {
    label: "PWM",
    kind: 6,
    insertText: "PWM(Pin(${1:pin_number}), freq=${2:1000})",
    insertTextRules: 4,
    detail: "Create PWM object",
  },
  {
    label: "time.sleep",
    kind: 3,
    insertText: "time.sleep(${1:seconds})",
    insertTextRules: 4,
    detail: "Sleep for seconds",
  },
  {
    label: "time.sleep_ms",
    kind: 3,
    insertText: "time.sleep_ms(${1:milliseconds})",
    insertTextRules: 4,
    detail: "Sleep for milliseconds",
  },
  {
    label: "network.WLAN",
    kind: 6,
    insertText: "wlan = network.WLAN(network.STA_IF)\nwlan.active(True)\nwlan.connect('${1:ssid}', '${2:password}')",
    insertTextRules: 4,
    detail: "Connect to WiFi",
  },
];

// Quick fixes for common issues
const QUICK_FIXES: Record<string, { pattern: RegExp; fix: string; description: string }[]> = {
  cpp: [
    {
      pattern: /delay\((\d+)\)/g,
      fix: "// Non-blocking alternative:\nunsigned long previousMillis = 0;\nif (millis() - previousMillis >= $1) {\n  previousMillis = millis();\n  // Your code here\n}",
      description: "Convert delay() to millis() (non-blocking)",
    },
    {
      pattern: /#include\s*<(\w+)\.h>/g,
      fix: '#include <$1.h>',
      description: "Fix include statement",
    },
  ],
  python: [
    {
      pattern: /time\.sleep\((\d+)\)/g,
      fix: "import uasyncio\nawait uasyncio.sleep($1)",
      description: "Convert to async sleep",
    },
  ],
};


// Command Palette commands
const COMMANDS = [
  { id: "save", label: "Save File", shortcut: "Ctrl+S", icon: "💾" },
  { id: "format", label: "Format Document", shortcut: "Shift+Alt+F", icon: "📝" },
  { id: "find", label: "Find", shortcut: "Ctrl+F", icon: "🔍" },
  { id: "replace", label: "Find and Replace", shortcut: "Ctrl+H", icon: "🔄" },
  { id: "goto", label: "Go to Line", shortcut: "Ctrl+G", icon: "📍" },
  { id: "fold", label: "Fold All", shortcut: "Ctrl+K Ctrl+0", icon: "📁" },
  { id: "unfold", label: "Unfold All", shortcut: "Ctrl+K Ctrl+J", icon: "📂" },
  { id: "comment", label: "Toggle Comment", shortcut: "Ctrl+/", icon: "💬" },
  { id: "zen", label: "Toggle Zen Mode", shortcut: "Ctrl+K Z", icon: "🧘" },
  { id: "minimap", label: "Toggle Minimap", shortcut: "", icon: "🗺️" },
  { id: "wordwrap", label: "Toggle Word Wrap", shortcut: "Alt+Z", icon: "↩️" },
  { id: "problems", label: "Show Problems", shortcut: "Ctrl+Shift+M", icon: "⚠️" },
  { id: "ai_explain", label: "AI: Explain Code", shortcut: "", icon: "🤖" },
  { id: "ai_fix", label: "AI: Fix Error", shortcut: "", icon: "🔧" },
  { id: "ai_optimize", label: "AI: Optimize for Board", shortcut: "", icon: "⚡" },
];

export function CodeEditor({ 
  value, 
  onChange, 
  language, 
  readOnly = false,
  onSave,
  fileName,
  filePath = "main",
  widgets = [],
  onNavigateToWidget,
}: CodeEditorProps) {
  const { darkMode } = useAppStore();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  
  // Editor state
  const [zenMode, setZenMode] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [showProblems, setShowProblems] = useState(true);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [selectedTheme, setSelectedTheme] = useState("vs-dark");
  const [liveValues, setLiveValues] = useState<Record<string, any>>({});
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [widgetBindings, setWidgetBindings] = useState<Map<number, { widgetId: string; widgetType?: string; bindingTarget: string }>>(new Map());
  const decorationsRef = useRef<string[]>([]);

  // Analyze code for problems
  const analyzeCode = useCallback((code: string) => {
    const newProblems: Problem[] = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      // Check for common issues
      if (language === "cpp") {
        // Missing semicolon (simple check)
        if (line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('#') &&
            !line.trim().endsWith(';') && !line.trim().endsWith('{') && !line.trim().endsWith('}') &&
            !line.includes('if') && !line.includes('for') && !line.includes('while') &&
            !line.includes('else') && !line.includes('void') && !line.includes('int') &&
            line.trim().length > 0 && line.includes('=')) {
          // This is a very simplified check
        }
        
        // Blocking delay warning
        if (line.includes('delay(') && !line.trim().startsWith('//')) {
          newProblems.push({
            line: index + 1,
            column: line.indexOf('delay(') + 1,
            message: "Consider using millis() for non-blocking delays",
            severity: "warning",
            source: "µCodeLab",
            quickFix: "Convert to millis()",
          });
        }
        
        // Missing Serial.begin
        if (line.includes('Serial.print') && !code.includes('Serial.begin')) {
          newProblems.push({
            line: index + 1,
            column: 1,
            message: "Serial.begin() should be called in setup() before using Serial",
            severity: "warning",
            source: "µCodeLab",
          });
        }
      }
      
      if (language === "python") {
        // Blocking sleep warning
        if (line.includes('time.sleep(') && !line.trim().startsWith('#')) {
          newProblems.push({
            line: index + 1,
            column: line.indexOf('time.sleep(') + 1,
            message: "Consider using uasyncio for non-blocking delays",
            severity: "info",
            source: "µCodeLab",
          });
        }
      }
    });
    
    setProblems(newProblems);
  }, [language]);

  useEffect(() => {
    analyzeCode(value);
  }, [value, analyzeCode]);

  // Analyze widget bindings
  useEffect(() => {
    console.log('[CodeEditor] Analyzing bindings, widgets:', widgets.length, widgets);
    const newBindings = new Map<number, { widgetId: string; widgetType?: string; bindingTarget: string }>();
    const lines = value.split('\n');
    const bindPattern = language === "cpp" 
      ? /@bind_widget\s*\(\s*id\s*=\s*["']([^"']+)["']\s*\)/
      : /@bind_widget\s*\(\s*id\s*=\s*["']([^"']+)["']\s*\)/;
    const varPattern = language === "cpp"
      ? /^\s*(int|float|double|bool|boolean|String|char\*?|long|unsigned\s+\w+)\s+(\w+)/
      : /^\s*(\w+)\s*(?::\s*(\w+))?\s*=/;
    const funcPattern = language === "cpp"
      ? /^\s*(void|int|float|double|bool|String)\s+(\w+)\s*\(/
      : /^\s*def\s+(\w+)\s*\(/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const bindMatch = line.match(bindPattern);
      
      if (bindMatch) {
        const widgetId = bindMatch[1];
        const nextLine = lines[i + 1] || "";
        let bindingTarget = "";
        
        const varMatch = nextLine.match(varPattern);
        const funcMatch = nextLine.match(funcPattern);
        
        if (varMatch) {
          bindingTarget = language === "cpp" ? varMatch[2] : varMatch[1];
        } else if (funcMatch) {
          bindingTarget = language === "cpp" ? funcMatch[2] : funcMatch[1];
        }
        
        const widget = widgets.find(w => w.id === widgetId);
        newBindings.set(i + 1, { 
          widgetId, 
          widgetType: widget?.type,
          bindingTarget 
        });
        
        // Add problem if widget not found
        if (!widget && widgets.length > 0) {
          setProblems(prev => {
            const exists = prev.some(p => p.line === i + 1 && p.message.includes("Widget ID"));
            if (exists) return prev;
            return [...prev, {
              line: i + 1,
              column: 1,
              message: `Widget ID '${widgetId}' not found in UI designer`,
              severity: "error",
              source: "Widget Binding",
            }];
          });
        }
      }
    }
    
    setWidgetBindings(newBindings);
    
    // Register bindings in the shared registry for dashboard access
    // Clear old bindings for this file first
    const oldBindings = widgetBindingRegistry.getByFile(filePath);
    oldBindings.forEach(b => widgetBindingRegistry.removeByWidgetId(b.widgetId));
    
    // Register new bindings
    newBindings.forEach((binding, lineNumber) => {
      const widget = widgets.find(w => w.id === binding.widgetId);
      if (widget) {
        widgetBindingRegistry.register({
          widgetId: binding.widgetId,
          bindingType: binding.bindingTarget.includes('(') ? 'function' : 'variable',
          bindingTarget: binding.bindingTarget,
          dataType: widget.type === 'button' ? 'function' : 'variable',
          filePath: filePath,
          lineNumber: lineNumber,
          annotation: `@bind_widget(id="${binding.widgetId}")`,
        });
      }
    });
  }, [value, language, widgets, filePath]);

  // Update editor decorations for widget bindings
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const decorations: any[] = [];
    
    widgetBindings.forEach((binding, lineNumber) => {
      const widget = widgets.find(w => w.id === binding.widgetId);
      const isValid = !!widget;
      
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: isValid ? "widget-binding-glyph" : "widget-binding-glyph-error",
          glyphMarginHoverMessage: { 
            value: isValid 
              ? `🔗 **Bound to Widget**\n\n**ID:** \`${binding.widgetId}\`\n**Type:** ${binding.widgetType || "unknown"}\n**Target:** \`${binding.bindingTarget}\`\n\n*Click to navigate to widget*`
              : `⚠️ **Widget Not Found**\n\n**ID:** \`${binding.widgetId}\`\n\nThis widget ID does not exist in the dashboard designer.`
          },
        },
      });
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
  }, [widgetBindings, widgets]);


  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({ line: e.position.lineNumber, column: e.position.column });
    });

    // Register Arduino/C++ completions
    monaco.languages.registerCompletionItemProvider("cpp", {
      provideCompletionItems: (model: any, position: any) => {
        return { suggestions: ARDUINO_SNIPPETS.map(s => ({ ...s, range: undefined })) as any };
      },
    });

    // Register MicroPython completions
    monaco.languages.registerCompletionItemProvider("python", {
      provideCompletionItems: (model: any, position: any) => {
        return { suggestions: MICROPYTHON_SNIPPETS.map(s => ({ ...s, range: undefined })) as any };
      },
    });

    // Register hover provider for annotations
    monaco.languages.registerHoverProvider("cpp", {
      provideHover: (model: any, position: any) => {
        const line = model.getLineContent(position.lineNumber);
        
        // @bind_widget annotation hover
        const bindWidgetMatch = line.match(/@bind_widget\s*\(\s*id\s*=\s*["']([^"']+)["']\s*\)/);
        if (bindWidgetMatch) {
          const widgetId = bindWidgetMatch[1];
          return {
            contents: [
              { value: "**@bind_widget** - Widget-Code Binding" },
              { value: `🔗 **Widget ID:** \`${widgetId}\`` },
              { value: "This annotation creates a bidirectional link between this code element and a dashboard widget." },
              { value: "**Binding Rules:**\n- `button` → function only\n- `toggle` → bool/int\n- `slider` → int/float\n- `gauge/display` → read-only variable" },
              { value: "```cpp\n//@bind_widget(id=\"led_toggle\")\nint ledState;  // Linked to toggle widget\n```" },
              { value: "💡 Click the gutter icon to navigate to the widget in the dashboard." },
            ],
          };
        }
        
        if (line.includes("@remote_access")) {
          return {
            contents: [
              { value: "**@remote_access**" },
              { value: "This variable will be exposed to the dashboard for monitoring and control." },
              { value: "```cpp\n// Example:\n// @remote_access\nint ledState = LOW;\n```" },
            ],
          };
        }
        
        if (line.includes("@remote_function")) {
          return {
            contents: [
              { value: "**@remote_function**" },
              { value: "This function can be called from the dashboard interface." },
              { value: "```cpp\n// Example:\n// @remote_function\nvoid toggleLED() { ... }\n```" },
            ],
          };
        }
        
        if (line.includes("@sensor_data")) {
          return {
            contents: [
              { value: "**@sensor_data**" },
              { value: "This variable will be automatically transmitted to the dashboard." },
            ],
          };
        }
        
        return null;
      },
    });

    // Register code actions (quick fixes)
    monaco.languages.registerCodeActionProvider("cpp", {
      provideCodeActions: (model: any, range: any, context: any) => {
        const actions: any[] = [];
        const line = model.getLineContent(range.startLineNumber);
        
        if (line.includes("delay(")) {
          actions.push({
            title: "Convert delay() to millis() (non-blocking)",
            kind: "quickfix",
            edit: {
              edits: [{
                resource: model.uri,
                textEdit: {
                  range: range,
                  text: "// TODO: Convert to millis() pattern",
                },
              }],
            },
          });
        }
        
        return { actions, dispose: () => {} };
      },
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
      setCommandPaletteOpen(true);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      // Zen mode toggle (Ctrl+K Z)
    });
  };

  const executeCommand = (commandId: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    switch (commandId) {
      case "save":
        onSave?.();
        break;
      case "format":
        editor.getAction("editor.action.formatDocument")?.run();
        break;
      case "find":
        editor.getAction("actions.find")?.run();
        break;
      case "replace":
        editor.getAction("editor.action.startFindReplaceAction")?.run();
        break;
      case "goto":
        editor.getAction("editor.action.gotoLine")?.run();
        break;
      case "fold":
        editor.getAction("editor.foldAll")?.run();
        break;
      case "unfold":
        editor.getAction("editor.unfoldAll")?.run();
        break;
      case "comment":
        editor.getAction("editor.action.commentLine")?.run();
        break;
      case "zen":
        setZenMode(!zenMode);
        break;
      case "minimap":
        setShowMinimap(!showMinimap);
        break;
      case "wordwrap":
        setWordWrap(!wordWrap);
        break;
      case "problems":
        setShowProblems(!showProblems);
        break;
      case "ai_explain":
      case "ai_fix":
      case "ai_optimize":
        setShowAIPanel(true);
        break;
    }
    setCommandPaletteOpen(false);
  };

  const filteredCommands = COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(commandSearch.toLowerCase())
  );

  const getLanguageId = () => language === "cpp" ? "cpp" : "python";

  const getSeverityIcon = (severity: Problem["severity"]) => {
    switch (severity) {
      case "error": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info": return <Info className="h-4 w-4 text-blue-500" />;
      case "hint": return <Lightbulb className="h-4 w-4 text-green-500" />;
    }
  };


  return (
    <div className={`flex flex-col h-full ${zenMode ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Editor Toolbar */}
      {!zenMode && (
        <div className="flex items-center justify-between px-2 py-1 border-b bg-muted/30 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {language === "cpp" ? "C++" : "Python"}
            </Badge>
            {fileName && (
              <span className="text-muted-foreground">{fileName}</span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Problems indicator */}
            {problems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 gap-1"
                onClick={() => setShowProblems(!showProblems)}
              >
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                <span>{problems.length}</span>
              </Button>
            )}
            
            {/* Command Palette */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => setCommandPaletteOpen(true)}
              title="Command Palette (Ctrl+Shift+P)"
            >
              <Command className="h-3 w-3" />
            </Button>
            
            {/* Search */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => editorRef.current?.getAction("actions.find")?.run()}
              title="Find (Ctrl+F)"
            >
              <Search className="h-3 w-3" />
            </Button>
            
            {/* AI Assistant */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => setShowAIPanel(!showAIPanel)}
              title="AI Assistant"
            >
              <Sparkles className="h-3 w-3" />
            </Button>
            
            {/* Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  <Settings className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowMinimap(!showMinimap)}>
                  {showMinimap ? "✓" : " "} Minimap
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setWordWrap(!wordWrap)}>
                  {wordWrap ? "✓" : " "} Word Wrap
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {EDITOR_THEMES.map(theme => (
                  <DropdownMenuItem 
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                  >
                    {selectedTheme === theme.id ? "✓" : " "} {theme.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Zen Mode */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => setZenMode(!zenMode)}
              title="Zen Mode"
            >
              {zenMode ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex">
        {/* Editor */}
        <div className="flex-1 relative">
          <Editor
            height="100%"
            language={getLanguageId()}
            value={value}
            onChange={(value) => onChange(value || "")}
            onMount={handleEditorMount}
            theme={darkMode ? selectedTheme : "vs"}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              fontLigatures: true,
              minimap: { enabled: showMinimap },
              lineNumbers: "on",
              glyphMargin: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              readOnly,
              wordWrap: wordWrap ? "on" : "off",
              padding: { top: 16, bottom: 16 },
              // VS Code-grade features
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true,
              },
              stickyScroll: { enabled: true },
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              smoothScrolling: true,
              folding: true,
              foldingStrategy: "indentation",
              showFoldingControls: "always",
              renderWhitespace: "selection",
              renderLineHighlight: "all",
              occurrencesHighlight: "singleFile",
              selectionHighlight: true,
              codeLens: true,
              lightbulb: { enabled: "on" as any },
              quickSuggestions: {
                other: true,
                comments: true,
                strings: true,
              },
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: "on",
              snippetSuggestions: "top",
              formatOnPaste: true,
              formatOnType: true,
              autoClosingBrackets: "always",
              autoClosingQuotes: "always",
              autoSurround: "languageDefined",
              linkedEditing: true,
              inlayHints: { enabled: "on" },
            }}
          />
          
          {/* Zen mode exit button */}
          {zenMode && (
            <Button
              variant="outline"
              size="sm"
              className="absolute top-4 right-4 z-10"
              onClick={() => setZenMode(false)}
            >
              <Minimize2 className="h-4 w-4 mr-2" />
              Exit Zen Mode
            </Button>
          )}
        </div>

        {/* AI Panel */}
        {showAIPanel && !zenMode && (
          <div className="w-80 border-l bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Assistant
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAIPanel(false)}>×</Button>
            </div>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Lightbulb className="h-4 w-4 mr-2" />
                Explain Selected Code
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Bug className="h-4 w-4 mr-2" />
                Fix Errors
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Play className="h-4 w-4 mr-2" />
                Optimize for Board
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <GitBranch className="h-4 w-4 mr-2" />
                Generate Remote API
              </Button>
            </div>
          </div>
        )}
      </div>


      {/* Problems Panel */}
      {showProblems && problems.length > 0 && !zenMode && (
        <div className="border-t bg-card">
          <div className="flex items-center justify-between px-3 py-1 border-b">
            <span className="text-xs font-medium">Problems ({problems.length})</span>
            <Button variant="ghost" size="sm" className="h-5 px-1" onClick={() => setShowProblems(false)}>×</Button>
          </div>
          <ScrollArea className="h-32">
            <div className="p-2 space-y-1">
              {problems.map((problem, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-xs"
                  onClick={() => {
                    editorRef.current?.setPosition({ lineNumber: problem.line, column: problem.column });
                    editorRef.current?.focus();
                  }}
                >
                  {getSeverityIcon(problem.severity)}
                  <div className="flex-1">
                    <p>{problem.message}</p>
                    <p className="text-muted-foreground">
                      [{problem.source}] Ln {problem.line}, Col {problem.column}
                    </p>
                  </div>
                  {problem.quickFix && (
                    <Button variant="ghost" size="sm" className="h-5 px-2 text-xs">
                      Quick Fix
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Status Bar */}
      {!zenMode && (
        <div className="flex items-center justify-between px-3 py-1 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
            <span>{language === "cpp" ? "C++ (Arduino)" : "Python (MicroPython)"}</span>
            <span>UTF-8</span>
          </div>
          <div className="flex items-center gap-4">
            {widgetBindings.size > 0 && (
              <span className="flex items-center gap-1 text-green-500" title="Widget bindings detected">
                🔗 {widgetBindings.size} binding{widgetBindings.size > 1 ? 's' : ''}
              </span>
            )}
            {widgets.length > 0 && widgetBindings.size === 0 && (
              <span className="flex items-center gap-1 text-muted-foreground" title="No bindings - use @bind_widget annotation">
                🔗 No bindings
              </span>
            )}
            {problems.filter(p => p.severity === "error").length > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle className="h-3 w-3" />
                {problems.filter(p => p.severity === "error").length}
              </span>
            )}
            {problems.filter(p => p.severity === "warning").length > 0 && (
              <span className="flex items-center gap-1 text-yellow-500">
                <AlertTriangle className="h-3 w-3" />
                {problems.filter(p => p.severity === "warning").length}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Ready
            </span>
          </div>
        </div>
      )}

      {/* Command Palette Dialog */}
      <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="sr-only">Command Palette</DialogTitle>
            <Input
              placeholder="Type a command..."
              value={commandSearch}
              onChange={(e) => setCommandSearch(e.target.value)}
              className="h-10"
              autoFocus
            />
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="p-2">
              {filteredCommands.map((cmd) => (
                <div
                  key={cmd.id}
                  className="flex items-center justify-between px-3 py-2 rounded hover:bg-muted cursor-pointer"
                  onClick={() => executeCommand(cmd.id)}
                >
                  <div className="flex items-center gap-3">
                    <span>{cmd.icon}</span>
                    <span className="text-sm">{cmd.label}</span>
                  </div>
                  {cmd.shortcut && (
                    <span className="text-xs text-muted-foreground font-mono">{cmd.shortcut}</span>
                  )}
                </div>
              ))}
              {filteredCommands.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No commands found</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}