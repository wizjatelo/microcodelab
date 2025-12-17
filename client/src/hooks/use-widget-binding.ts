import { useState, useEffect, useCallback, useMemo } from "react";
import {
  widgetBindingRegistry,
  parseBindings,
  validateBinding,
  generateBindingAnnotation,
  getRecommendedWidgetTypes,
  type WidgetBinding,
  type ParsedBinding,
  type BindingValidation,
} from "@/services/widget-binding";
import type { WidgetConfig } from "@shared/schema";

interface UseWidgetBindingOptions {
  code: string;
  language: "cpp" | "python";
  filePath: string;
  widgets: WidgetConfig[];
}

interface BindingError {
  line: number;
  message: string;
  severity: "error" | "warning";
  widgetId?: string;
}

interface UseWidgetBindingResult {
  bindings: WidgetBinding[];
  errors: BindingError[];
  warnings: BindingError[];
  getBindingAtLine: (line: number) => WidgetBinding | undefined;
  getBindingForWidget: (widgetId: string) => WidgetBinding | undefined;
  navigateToBinding: (widgetId: string) => { filePath: string; lineNumber: number } | undefined;
  generateAnnotation: (widgetId: string) => string;
  getRecommendedWidgets: (dataType: string, isFunction: boolean) => string[];
  refreshBindings: () => void;
}

export function useWidgetBinding({
  code,
  language,
  filePath,
  widgets,
}: UseWidgetBindingOptions): UseWidgetBindingResult {
  const [bindings, setBindings] = useState<WidgetBinding[]>([]);
  const [errors, setErrors] = useState<BindingError[]>([]);
  const [warnings, setWarnings] = useState<BindingError[]>([]);

  // Create widget registry map
  const widgetRegistry = useMemo(() => {
    const registry = new Map<string, { type: string; label: string }>();
    widgets.forEach((w) => {
      registry.set(w.id, { type: w.type, label: w.label });
    });
    return registry;
  }, [widgets]);

  // Parse and validate bindings when code changes
  const refreshBindings = useCallback(() => {
    const parsed = parseBindings(code, language, filePath);
    const { errors: validationErrors, warnings: validationWarnings } =
      widgetBindingRegistry.updateFromParsedBindings(parsed, filePath, widgetRegistry);

    // Convert validation results to binding errors
    const newErrors: BindingError[] = validationErrors.map((v) => {
      const lineMatch = v.message.match(/Line (\d+):/);
      return {
        line: lineMatch ? parseInt(lineMatch[1]) : 0,
        message: v.message.replace(/Line \d+: /, ""),
        severity: "error" as const,
      };
    });

    const newWarnings: BindingError[] = validationWarnings.map((v) => {
      const lineMatch = v.message.match(/Line (\d+):/);
      return {
        line: lineMatch ? parseInt(lineMatch[1]) : 0,
        message: v.message.replace(/Line \d+: /, ""),
        severity: "warning" as const,
      };
    });

    setErrors(newErrors);
    setWarnings(newWarnings);
    setBindings(widgetBindingRegistry.getByFile(filePath));
  }, [code, language, filePath, widgetRegistry]);

  // Refresh on code/widget changes
  useEffect(() => {
    refreshBindings();
  }, [refreshBindings]);

  // Subscribe to registry changes
  useEffect(() => {
    const unsubscribe = widgetBindingRegistry.subscribe((allBindings) => {
      setBindings(allBindings.filter((b) => b.filePath === filePath));
    });
    return unsubscribe;
  }, [filePath]);

  const getBindingAtLine = useCallback(
    (line: number): WidgetBinding | undefined => {
      return bindings.find((b) => b.lineNumber === line || b.lineNumber === line + 1);
    },
    [bindings]
  );

  const getBindingForWidget = useCallback(
    (widgetId: string): WidgetBinding | undefined => {
      return widgetBindingRegistry.getByWidgetId(widgetId);
    },
    []
  );

  const navigateToBinding = useCallback(
    (widgetId: string): { filePath: string; lineNumber: number } | undefined => {
      const binding = widgetBindingRegistry.getByWidgetId(widgetId);
      if (binding) {
        return { filePath: binding.filePath, lineNumber: binding.lineNumber };
      }
      return undefined;
    },
    []
  );

  const generateAnnotation = useCallback(
    (widgetId: string): string => {
      return generateBindingAnnotation(widgetId, language);
    },
    [language]
  );

  const getRecommendedWidgets = useCallback(
    (dataType: string, isFunction: boolean): string[] => {
      return getRecommendedWidgetTypes(dataType, isFunction);
    },
    []
  );

  return {
    bindings,
    errors,
    warnings,
    getBindingAtLine,
    getBindingForWidget,
    navigateToBinding,
    generateAnnotation,
    getRecommendedWidgets,
    refreshBindings,
  };
}

/**
 * Hook for widget-side binding management
 */
export function useWidgetCodeLink(widgetId: string) {
  const [binding, setBinding] = useState<WidgetBinding | undefined>();
  const [hasBinding, setHasBinding] = useState(false);

  useEffect(() => {
    const updateBinding = () => {
      const b = widgetBindingRegistry.getByWidgetId(widgetId);
      setBinding(b);
      setHasBinding(!!b);
    };

    updateBinding();
    const unsubscribe = widgetBindingRegistry.subscribe(updateBinding);
    return unsubscribe;
  }, [widgetId]);

  const navigateToCode = useCallback(() => {
    if (binding) {
      return {
        filePath: binding.filePath,
        lineNumber: binding.lineNumber,
      };
    }
    return undefined;
  }, [binding]);

  return {
    binding,
    hasBinding,
    navigateToCode,
    bindingTarget: binding?.bindingTarget,
    dataType: binding?.dataType,
  };
}
