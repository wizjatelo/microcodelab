import { useState, useCallback } from "react";
import { aiService, type CodeEditResult, type RefactorResult, type RefactorType, type ApplySuggestionResult } from "@/lib/ai-service";

export interface AIEditorState {
  isEditing: boolean;
  isRefactoring: boolean;
  isApplying: boolean;
  error: string | null;
  lastEdit: CodeEditResult | null;
  lastRefactor: RefactorResult | null;
}

export function useAIEditor() {
  const [state, setState] = useState<AIEditorState>({
    isEditing: false,
    isRefactoring: false,
    isApplying: false,
    error: null,
    lastEdit: null,
    lastRefactor: null,
  });

  const editCode = useCallback(async (
    code: string,
    language: "cpp" | "python",
    instruction: string,
    fileName?: string,
    selectionStart?: number,
    selectionEnd?: number
  ): Promise<CodeEditResult | null> => {
    setState(prev => ({ ...prev, isEditing: true, error: null }));
    
    try {
      const result = await aiService.editCode(
        code,
        language,
        instruction,
        fileName,
        selectionStart,
        selectionEnd
      );
      
      setState(prev => ({ 
        ...prev, 
        isEditing: false, 
        lastEdit: result 
      }));
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to edit code";
      setState(prev => ({ 
        ...prev, 
        isEditing: false, 
        error: errorMessage 
      }));
      return null;
    }
  }, []);

  const refactorCode = useCallback(async (
    code: string,
    language: "cpp" | "python",
    refactorType: RefactorType,
    fileName?: string,
    targetElement?: string
  ): Promise<RefactorResult | null> => {
    setState(prev => ({ ...prev, isRefactoring: true, error: null }));
    
    try {
      const result = await aiService.refactorCode(
        code,
        language,
        refactorType,
        fileName,
        targetElement
      );
      
      setState(prev => ({ 
        ...prev, 
        isRefactoring: false, 
        lastRefactor: result 
      }));
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to refactor code";
      setState(prev => ({ 
        ...prev, 
        isRefactoring: false, 
        error: errorMessage 
      }));
      return null;
    }
  }, []);

  const applySuggestion = useCallback(async (
    code: string,
    language: "cpp" | "python",
    suggestion: string,
    lineNumber?: number
  ): Promise<ApplySuggestionResult | null> => {
    setState(prev => ({ ...prev, isApplying: true, error: null }));
    
    try {
      const result = await aiService.applySuggestion(
        code,
        language,
        suggestion,
        lineNumber
      );
      
      setState(prev => ({ ...prev, isApplying: false }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to apply suggestion";
      setState(prev => ({ 
        ...prev, 
        isApplying: false, 
        error: errorMessage 
      }));
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearHistory = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      lastEdit: null, 
      lastRefactor: null 
    }));
  }, []);

  return {
    ...state,
    editCode,
    refactorCode,
    applySuggestion,
    clearError,
    clearHistory,
  };
}