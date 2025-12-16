import { useRef, useEffect } from "react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { useAppStore } from "@/lib/store";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "cpp" | "python";
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, language, readOnly = false }: CodeEditorProps) {
  const { darkMode } = useAppStore();
  const editorRef = useRef<any>(null);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Define Arduino C++ snippets
    monaco.languages.registerCompletionItemProvider("cpp", {
      provideCompletionItems: (model, position) => {
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
      provideCompletionItems: (model, position) => {
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

  const getLanguageId = () => {
    return language === "cpp" ? "cpp" : "python";
  };

  return (
    <div className="h-full w-full" data-testid="code-editor">
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
          readOnly,
          wordWrap: "on",
          padding: { top: 16 },
        }}
      />
    </div>
  );
}
