import { useState, useCallback, useRef } from "react";
import { aiService, ChatMessage, AIContextData, CodeAnalysisResult } from "@/lib/ai-service";

interface UseAIChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export function useAIChat() {
  const [state, setState] = useState<UseAIChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const messagesRef = useRef<ChatMessage[]>([]);

  const addMessage = useCallback(
    (role: "user" | "assistant", content: string, context?: AIContextData) => {
      const message: ChatMessage = {
        id: `msg-${Date.now()}`,
        role,
        content,
        timestamp: Date.now(),
        context,
      };
      messagesRef.current.push(message);
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, message],
      }));
      return message;
    },
    []
  );

  const sendMessage = useCallback(
    async (userMessage: string, context?: AIContextData) => {
      setState((prev) => ({ ...prev, error: null }));
      addMessage("user", userMessage, context);

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const response = await aiService.chat(userMessage, context);
        addMessage("assistant", response);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to send message";
        setState((prev) => ({ ...prev, error: errorMessage }));
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [addMessage]
  );

  const clearHistory = useCallback(() => {
    aiService.clearHistory();
    messagesRef.current = [];
    setState({
      messages: [],
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    sendMessage,
    clearHistory,
    addMessage,
  };
}

interface UseCodeCompletionState {
  suggestions: Array<{
    suggestion: string;
    confidence: number;
    explanation?: string;
  }>;
  isLoading: boolean;
  error: string | null;
}

export function useCodeCompletion() {
  const [state, setState] = useState<UseCodeCompletionState>({
    suggestions: [],
    isLoading: false,
    error: null,
  });

  const getCompletions = useCallback(
    async (
      code: string,
      language: "cpp" | "python",
      cursorPosition: number,
      fileName?: string
    ) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const suggestions = await aiService.getCodeCompletion(
          code,
          language,
          cursorPosition,
          fileName
        );
        setState((prev) => ({ ...prev, suggestions }));
        return suggestions;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get completions";
        setState((prev) => ({ ...prev, error: errorMessage }));
        return [];
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    []
  );

  return {
    ...state,
    getCompletions,
  };
}

interface UseCodeAnalysisState {
  analysis: CodeAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useCodeAnalysis() {
  const [state, setState] = useState<UseCodeAnalysisState>({
    analysis: null,
    isLoading: false,
    error: null,
  });

  const analyze = useCallback(
    async (code: string, language: "cpp" | "python") => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const analysis = await aiService.analyzeCode(code, language);
        setState((prev) => ({ ...prev, analysis }));
        return analysis;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to analyze code";
        setState((prev) => ({ ...prev, error: errorMessage }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    []
  );

  return {
    ...state,
    analyze,
  };
}

interface UseCodeGenerationState {
  code: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useCodeGeneration() {
  const [state, setState] = useState<UseCodeGenerationState>({
    code: null,
    isLoading: false,
    error: null,
  });

  const generate = useCallback(
    async (
      description: string,
      language: "cpp" | "python",
      context?: string
    ) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const code = await aiService.generateCode(description, language, context);
        setState((prev) => ({ ...prev, code }));
        return code;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to generate code";
        setState((prev) => ({ ...prev, error: errorMessage }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    []
  );

  return {
    ...state,
    generate,
  };
}

interface UseCodeReviewState {
  review: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useCodeReview() {
  const [state, setState] = useState<UseCodeReviewState>({
    review: null,
    isLoading: false,
    error: null,
  });

  const review = useCallback(
    async (
      code: string,
      language: "cpp" | "python",
      context?: string
    ) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const reviewResult = await aiService.reviewCode(code, language, context);
        setState((prev) => ({ ...prev, review: reviewResult }));
        return reviewResult;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to review code";
        setState((prev) => ({ ...prev, error: errorMessage }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    []
  );

  return {
    ...state,
    review,
  };
}

interface UseDebuggerState {
  solution: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useDebugger() {
  const [state, setState] = useState<UseDebuggerState>({
    solution: null,
    isLoading: false,
    error: null,
  });

  const debug = useCallback(
    async (
      errorMessage: string,
      code: string,
      language: "cpp" | "python"
    ) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const solution = await aiService.debugError(errorMessage, code, language);
        setState((prev) => ({ ...prev, solution }));
        return solution;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to debug";
        setState((prev) => ({ ...prev, error: errorMessage }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    []
  );

  return {
    ...state,
    debug,
  };
}
