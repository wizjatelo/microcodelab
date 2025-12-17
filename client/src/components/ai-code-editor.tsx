import { useRef, useEffect, useState, useCallback } from "react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { useAppStore } from "@/lib/store";
import { useAIEditor } from "@/hooks/use-ai-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, RefreshCw, Lightbulb, Code, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface AICodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "cpp" | "python";
  fileName?: string;
  readOnly?: boolean;
}

export function AICodeEditor({ 
  value, 
  onChange, 
  language, 
  fileName,
  readOnly = false 
}: AICodeEditorProps) {
  const { darkMode } = useAppStore();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  
  const [editInstruction, setEditInstruction] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{start: number, end: number} | null>(null);
  
  const {
    isEditing,
    isRefactoring,
    isApplying,
    error,
    editCode,
    refactorCode,
    applySuggestion,
    clearError,
  } = useAIEditor();
  
  const { toast } = useToast();

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Track text selection
    editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel();
      if (!model) return;
      
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const selectedText = model.getValueInRange(selection);
        setSelectedText(selectedText);
        setSelectionRange({
          start: selection.startLineNumber - 1,
          end: selection.endLineNumber - 1
        });
      } else {
        setSelectedText("");
        setSelectionRange(null);
      }
    });

    // Add AI editing commands
    editor.addAction({
      id: 'ai-edit-selection',
      label: 'AI: Edit Selection',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE],
      contextMenuGroupId: 'ai',
      contextMenuOrder: 1,
      run: () => {
        if (selectedText) {
          handleQuickEdit();
        } else {
          toast({
            title: "Error",
            description: "Please select some code to edit",
            variant: "destructive"
          });
        }
      }
    });

    editor.addAction({
      id: 'ai-optimize-code',
      label: 'AI: Optimize Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO],
      contextMenuGroupId: 'ai',
      contextMenuOrder: 2,
      run: () => handleRefactor('optimize')
    });

    // Define Arduino C++ snippets
    monaco.languages.registerCompletionItemProvider("cpp", {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: "@remote_access",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "@remote_access",
            detail: "Expose variable for monitoring/control",
            documentation: "Mark a variable to be accessible from the dashboard",
          },
          {
            label: "@remote_function",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "@remote_function",
            detail: "Make function callable from dashboard",
            documentation: "Mark a function to be callable from the React dashboard",
          },
          {
            label: "@sensor_data",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "@sensor_data",
            detail: "Mark variable for automatic transmission",
            documentation: "Automatically transmit variable updates to dashboard",
          },
          {
            label: "setup",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "void setup() {\n  ${1:// initialization code}\n}",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Arduino setup function",
          },
          {
            label: "loop",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "void loop() {\n  ${1:// main code}\n}",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Arduino loop function",
          },
        ];
        return { suggestions };
      },
    });

    // Define MicroPython snippets
    monaco.languages.registerCompletionItemProvider("python", {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: "@remote_access",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "# @remote_access",
            detail: "Expose variable for monitoring/control",
          },
          {
            label: "@remote_function",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "# @remote_function",
            detail: "Make function callable from dashboard",
          },
          {
            label: "import machine",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "import machine\nfrom machine import Pin, ADC",
            detail: "Import MicroPython machine module",
          },
        ];
        return { suggestions };
      },
    });
  };

  const handleQuickEdit = useCallback(async () => {
    if (!editInstruction.trim()) {
      toast({
        title: "Error",
        description: "Please enter an editing instruction",
        variant: "destructive"
      });
      return;
    }

    const result = await editCode(
      value,
      language,
      editInstruction,
      fileName,
      selectionRange?.start,
      selectionRange?.end
    );

    if (result) {
      onChange(result.modifiedCode);
      toast({
        title: "Code Edited",
        description: result.explanation
      });
      setEditInstruction("");
      
      // Show changes summary
      if (result.changes.length > 0) {
        const changesSummary = result.changes
          .map(c => `${c.type}: ${c.description}`)
          .join(", ");
        toast({
          title: "Changes Applied",
          description: changesSummary
        });
      }
    }
  }, [editInstruction, value, language, fileName, selectionRange, editCode, onChange, toast]);

  const handleRefactor = useCallback(async (type: "optimize" | "cleanup" | "modernize" | "extract_function") => {
    const result = await refactorCode(value, language, type, fileName);
    
    if (result) {
      onChange(result.refactoredCode);
      toast({
        title: "Code Refactored",
        description: result.summary
      });
      
      // Show benefits
      if (result.changes.length > 0) {
        const benefits = result.changes
          .map(c => c.benefit)
          .join(", ");
        toast({
          title: "Refactoring Benefits",
          description: benefits
        });
      }
    }
  }, [value, language, fileName, refactorCode, onChange, toast]);

  const getLanguageId = () => {
    return language === "cpp" ? "cpp" : "python";
  };

  const isLoading = isEditing || isRefactoring || isApplying;

  return (
    <div className="h-full w-full flex flex-col" data-testid="ai-code-editor">
      {/* AI Controls Bar */}
      {!readOnly && (
        <div className="flex items-center gap-2 p-2 border-b bg-muted/50">
          <div className="flex items-center gap-2 flex-1">
            <Input
              placeholder="Tell AI how to edit your code..."
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuickEdit();
                }
              }}
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleQuickEdit}
              disabled={!editInstruction.trim() || isLoading}
              size="sm"
            >
              {isEditing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Edit
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {selectedText && (
              <Badge variant="secondary" className="text-xs">
                {selectedText.split('\n').length} lines selected
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoading}>
                  {isRefactoring ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refactor
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleRefactor('optimize')}>
                  <Zap className="h-4 w-4 mr-2" />
                  Optimize Performance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRefactor('cleanup')}>
                  <Code className="h-4 w-4 mr-2" />
                  Clean Up Code
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRefactor('modernize')}>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Modernize Code
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRefactor('extract_function')}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Extract Functions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-2 bg-destructive/10 border-b border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearError}
            className="mt-1 h-6 px-2 text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguageId()}
          value={value}
          onChange={(value) => onChange(value || "")}
          onMount={handleEditorMount}
          theme={darkMode ? "vs-dark" : "light"}
          options={{
            fontSize: 14,
            fontFamily: "JetBrains Mono, monospace",
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            readOnly: readOnly || isLoading,
            wordWrap: "on",
            padding: { top: 16 },
            contextmenu: true,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
          }}
        />
      </div>
    </div>
  );
}