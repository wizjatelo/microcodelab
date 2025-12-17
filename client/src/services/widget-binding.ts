/**
 * Widget-Code Binding Service
 * Implements bidirectional linking between UI widgets and code editor variables/functions
 * using @bind_widget annotations.
 */

export interface WidgetBinding {
  widgetId: string;
  bindingType: "variable" | "function";
  bindingTarget: string; // variable or function name
  dataType: string; // bool, int, float, string
  filePath: string;
  lineNumber: number;
  annotation: string; // raw annotation text
}

export interface WidgetCompatibility {
  button: "function";
  toggle: "bool" | "int";
  slider: "int" | "float";
  dropdown: "string" | "int";
  gauge: "int" | "float";
  valueDisplay: "int" | "float" | "string" | "bool";
  ledIndicator: "bool" | "int";
  progressBar: "int" | "float";
  lineChart: "int" | "float";
  colorPicker: "string";
  joystick: "int" | "float";
}

// Widget type to compatible data types mapping
export const WIDGET_COMPATIBILITY: Record<string, string[]> = {
  button: ["function"],
  toggle: ["bool", "int", "boolean"],
  slider: ["int", "float", "number"],
  dropdown: ["string", "int"],
  gauge: ["int", "float", "number"],
  valueDisplay: ["int", "float", "string", "bool", "number", "boolean"],
  ledIndicator: ["bool", "int", "boolean"],
  progressBar: ["int", "float", "number"],
  lineChart: ["int", "float", "number"],
  barChart: ["int", "float", "number"],
  colorPicker: ["string"],
  joystick: ["int", "float", "number"],
  textDisplay: ["string"],
  scatterPlot: ["int", "float", "number"],
  heatmap: ["int", "float", "number"],
};

// Annotation regex patterns
const BIND_WIDGET_PATTERN = /\/\/@bind_widget\s*\(\s*id\s*=\s*["']([^"']+)["']\s*\)/;
const BIND_WIDGET_PATTERN_PY = /#\s*@bind_widget\s*\(\s*id\s*=\s*["']([^"']+)["']\s*\)/;

// Variable declaration patterns
const CPP_VAR_PATTERN = /^\s*(int|float|double|bool|boolean|String|char\*?|long|unsigned\s+\w+)\s+(\w+)\s*(?:=|;)/;
const CPP_FUNC_PATTERN = /^\s*(void|int|float|double|bool|String)\s+(\w+)\s*\(/;
const PY_VAR_PATTERN = /^\s*(\w+)\s*(?::\s*(\w+))?\s*=/;
const PY_FUNC_PATTERN = /^\s*def\s+(\w+)\s*\(/;

export interface ParsedBinding {
  widgetId: string;
  bindingType: "variable" | "function";
  bindingTarget: string;
  dataType: string;
  lineNumber: number;
}

export interface BindingValidation {
  isValid: boolean;
  severity: "error" | "warning" | "info";
  message: string;
}

/**
 * Parse code to extract @bind_widget annotations
 */
export function parseBindings(
  code: string,
  language: "cpp" | "python",
  filePath: string
): ParsedBinding[] {
  const bindings: ParsedBinding[] = [];
  const lines = code.split("\n");
  
  const bindPattern = language === "cpp" ? BIND_WIDGET_PATTERN : BIND_WIDGET_PATTERN_PY;
  const varPattern = language === "cpp" ? CPP_VAR_PATTERN : PY_VAR_PATTERN;
  const funcPattern = language === "cpp" ? CPP_FUNC_PATTERN : PY_FUNC_PATTERN;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bindMatch = line.match(bindPattern);
    
    if (bindMatch) {
      const widgetId = bindMatch[1];
      const nextLine = lines[i + 1] || "";
      
      // Check if next line is a variable declaration
      const varMatch = nextLine.match(varPattern);
      if (varMatch) {
        bindings.push({
          widgetId,
          bindingType: "variable",
          bindingTarget: language === "cpp" ? varMatch[2] : varMatch[1],
          dataType: language === "cpp" ? varMatch[1] : (varMatch[2] || "any"),
          lineNumber: i + 2, // 1-indexed, pointing to the variable line
        });
        continue;
      }
      
      // Check if next line is a function declaration
      const funcMatch = nextLine.match(funcPattern);
      if (funcMatch) {
        bindings.push({
          widgetId,
          bindingType: "function",
          bindingTarget: language === "cpp" ? funcMatch[2] : funcMatch[1],
          dataType: "function",
          lineNumber: i + 2,
        });
      }
    }
  }
  
  return bindings;
}


/**
 * Validate widget-binding compatibility
 */
export function validateBinding(
  widgetType: string,
  bindingType: "variable" | "function",
  dataType: string
): BindingValidation {
  // Button must bind to function
  if (widgetType === "button") {
    if (bindingType !== "function") {
      return {
        isValid: false,
        severity: "error",
        message: `Button widget must bind to a function, not a ${bindingType}`,
      };
    }
    return { isValid: true, severity: "info", message: "Valid binding" };
  }

  // Other widgets must bind to variables
  if (bindingType === "function" && widgetType !== "button") {
    return {
      isValid: false,
      severity: "error",
      message: `${widgetType} widget cannot bind to a function`,
    };
  }

  // Check data type compatibility
  const compatibleTypes = WIDGET_COMPATIBILITY[widgetType];
  if (!compatibleTypes) {
    return {
      isValid: true,
      severity: "warning",
      message: `Unknown widget type: ${widgetType}`,
    };
  }

  const normalizedType = dataType.toLowerCase().replace("boolean", "bool");
  const isCompatible = compatibleTypes.some(
    (t) => normalizedType.includes(t) || t === "function"
  );

  if (!isCompatible) {
    return {
      isValid: false,
      severity: "warning",
      message: `Widget type '${widgetType}' may not be compatible with data type '${dataType}'. Expected: ${compatibleTypes.join(", ")}`,
    };
  }

  return { isValid: true, severity: "info", message: "Valid binding" };
}

/**
 * Widget Binding Registry - manages all active bindings
 */
class WidgetBindingRegistry {
  private bindings: Map<string, WidgetBinding> = new Map();
  private widgetToBinding: Map<string, string> = new Map(); // widgetId -> bindingKey
  private listeners: Set<(bindings: WidgetBinding[]) => void> = new Set();

  /**
   * Register a new binding
   */
  register(binding: WidgetBinding): void {
    const key = `${binding.filePath}:${binding.lineNumber}`;
    this.bindings.set(key, binding);
    this.widgetToBinding.set(binding.widgetId, key);
    this.notifyListeners();
  }

  /**
   * Remove a binding by widget ID
   */
  removeByWidgetId(widgetId: string): void {
    const key = this.widgetToBinding.get(widgetId);
    if (key) {
      this.bindings.delete(key);
      this.widgetToBinding.delete(widgetId);
      this.notifyListeners();
    }
  }

  /**
   * Get binding by widget ID
   */
  getByWidgetId(widgetId: string): WidgetBinding | undefined {
    const key = this.widgetToBinding.get(widgetId);
    return key ? this.bindings.get(key) : undefined;
  }

  /**
   * Get binding by file path and line number
   */
  getByLocation(filePath: string, lineNumber: number): WidgetBinding | undefined {
    const key = `${filePath}:${lineNumber}`;
    return this.bindings.get(key);
  }

  /**
   * Get all bindings for a file
   */
  getByFile(filePath: string): WidgetBinding[] {
    return Array.from(this.bindings.values()).filter(
      (b) => b.filePath === filePath
    );
  }

  /**
   * Get all bindings
   */
  getAll(): WidgetBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * Clear all bindings
   */
  clear(): void {
    this.bindings.clear();
    this.widgetToBinding.clear();
    this.notifyListeners();
  }

  /**
   * Update bindings from parsed code
   */
  updateFromParsedBindings(
    parsedBindings: ParsedBinding[],
    filePath: string,
    widgetRegistry: Map<string, { type: string; label: string }>
  ): { errors: BindingValidation[]; warnings: BindingValidation[] } {
    const errors: BindingValidation[] = [];
    const warnings: BindingValidation[] = [];

    // Remove old bindings for this file
    const oldBindings = this.getByFile(filePath);
    oldBindings.forEach((b) => this.removeByWidgetId(b.widgetId));

    // Add new bindings
    parsedBindings.forEach((parsed) => {
      const widget = widgetRegistry.get(parsed.widgetId);
      
      if (!widget) {
        errors.push({
          isValid: false,
          severity: "error",
          message: `Widget ID '${parsed.widgetId}' not found in UI designer (line ${parsed.lineNumber})`,
        });
        return;
      }

      const validation = validateBinding(
        widget.type,
        parsed.bindingType,
        parsed.dataType
      );

      if (!validation.isValid) {
        if (validation.severity === "error") {
          errors.push({ ...validation, message: `Line ${parsed.lineNumber}: ${validation.message}` });
        } else {
          warnings.push({ ...validation, message: `Line ${parsed.lineNumber}: ${validation.message}` });
        }
      }

      // Register the binding even if there are warnings
      if (validation.severity !== "error") {
        this.register({
          widgetId: parsed.widgetId,
          bindingType: parsed.bindingType,
          bindingTarget: parsed.bindingTarget,
          dataType: parsed.dataType,
          filePath,
          lineNumber: parsed.lineNumber,
          annotation: `@bind_widget(id="${parsed.widgetId}")`,
        });
      }
    });

    return { errors, warnings };
  }

  /**
   * Subscribe to binding changes
   */
  subscribe(listener: (bindings: WidgetBinding[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const bindings = this.getAll();
    this.listeners.forEach((listener) => listener(bindings));
  }
}

// Singleton instance
export const widgetBindingRegistry = new WidgetBindingRegistry();

/**
 * Generate binding annotation snippet
 */
export function generateBindingAnnotation(
  widgetId: string,
  language: "cpp" | "python"
): string {
  if (language === "cpp") {
    return `//@bind_widget(id="${widgetId}")`;
  }
  return `# @bind_widget(id="${widgetId}")`;
}

/**
 * Get widget type recommendation based on data type
 */
export function getRecommendedWidgetTypes(
  dataType: string,
  isFunction: boolean
): string[] {
  if (isFunction) {
    return ["button"];
  }

  const normalizedType = dataType.toLowerCase();
  const recommendations: string[] = [];

  if (normalizedType.includes("bool")) {
    recommendations.push("toggle", "ledIndicator", "valueDisplay");
  }
  if (normalizedType.includes("int") || normalizedType.includes("float") || normalizedType.includes("double")) {
    recommendations.push("slider", "gauge", "valueDisplay", "progressBar", "lineChart");
  }
  if (normalizedType.includes("string") || normalizedType.includes("char")) {
    recommendations.push("valueDisplay", "textDisplay", "dropdown");
  }

  return recommendations.length > 0 ? recommendations : ["valueDisplay"];
}
