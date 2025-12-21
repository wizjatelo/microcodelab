// NVIDIA AI API Service
import { apiRequest } from "./queryClient";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIContextData {
  code: string;
  language: "cpp" | "python";
  fileName?: string;
  errorMessage?: string;
  selectedText?: string;
  projectContext?: string;
  deviceContext?: {
    deviceName: string;
    deviceType: string;
    isConnected: boolean;
    sensorValues: Record<string, number | string | boolean>;
    capabilities: {
      gpio: boolean;
      adc: boolean;
      wifi: boolean;
      i2c: boolean;
      spi: boolean;
    } | null;
  };
}

export interface CodeCompletion {
  suggestion: string;
  confidence: number;
  explanation?: string;
}

export interface CodeAnalysisResult {
  issues: Array<{
    severity: "error" | "warning" | "info";
    line?: number;
    message: string;
    suggestion?: string;
  }>;
  summary: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  context?: AIContextData;
}

export interface CodeEditResult {
  modifiedCode: string;
  changes: Array<{
    type: "addition" | "modification" | "deletion";
    lineStart: number;
    lineEnd: number;
    description: string;
  }>;
  explanation: string;
}

export interface RefactorResult {
  refactoredCode: string;
  changes: Array<{
    type: string;
    description: string;
    benefit: string;
  }>;
  summary: string;
}

export interface ApplySuggestionResult {
  modifiedCode: string;
  appliedAt: {
    lineStart: number;
    lineEnd: number;
    originalText: string;
    newText: string;
  } | null;
}

export type RefactorType = "optimize" | "cleanup" | "modernize" | "extract_function" | "rename_variable";

class AIService {
  private conversationHistory: AIMessage[] = [];
  private systemPrompt = `You are an expert IoT and embedded systems developer specializing in microcontroller programming. 
You help developers write better code for Arduino, ESP32, ESP8266, and Raspberry Pi Pico devices.
You provide:
- Code suggestions and completions for both Arduino C++ and MicroPython
- Debugging help and error analysis
- Best practices for embedded systems and IoT
- Performance optimization tips
- Security recommendations
When analyzing code, be concise but thorough. Always consider hardware constraints and real-time requirements.`;

  /**
   * Get code completion suggestions
   */
  async getCodeCompletion(
    code: string,
    language: "cpp" | "python",
    cursorPosition: number,
    fileName?: string
  ): Promise<CodeCompletion[]> {
    try {
      const response = await apiRequest<{
        suggestions: CodeCompletion[];
      }>("/api/ai/complete", {
        method: "POST",
        body: {
          code,
          language,
          cursorPosition,
          fileName,
        },
      });
      return response.suggestions || [];
    } catch (error) {
      console.error("Error getting code completion:", error);
      return [];
    }
  }

  /**
   * Analyze code for errors, warnings, and suggestions
   */
  async analyzeCode(
    code: string,
    language: "cpp" | "python"
  ): Promise<CodeAnalysisResult> {
    try {
      const response = await apiRequest<CodeAnalysisResult>(
        "/api/ai/analyze",
        {
          method: "POST",
          body: { code, language },
        }
      );
      return response;
    } catch (error) {
      console.error("Error analyzing code:", error);
      return {
        issues: [],
        summary: "Unable to analyze code at this time",
      };
    }
  }

  /**
   * Chat with AI about code/debugging
   */
  async chat(
    userMessage: string,
    context?: AIContextData
  ): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: "user",
        content: userMessage,
      });

      const response = await apiRequest<{ message: string }>(
        "/api/ai/chat",
        {
          method: "POST",
          body: {
            message: userMessage,
            history: this.conversationHistory,
            context,
            systemPrompt: this.systemPrompt,
          },
        }
      );

      const assistantMessage = response.message;

      // Add assistant response to history
      this.conversationHistory.push({
        role: "assistant",
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error("Error in chat:", error);
      throw error;
    }
  }

  /**
   * Generate code based on description
   */
  async generateCode(
    description: string,
    language: "cpp" | "python",
    context?: string
  ): Promise<string> {
    try {
      const response = await apiRequest<{ code: string }>(
        "/api/ai/generate",
        {
          method: "POST",
          body: {
            description,
            language,
            context,
          },
        }
      );
      return response.code;
    } catch (error) {
      console.error("Error generating code:", error);
      throw error;
    }
  }

  /**
   * Review code for improvements
   */
  async reviewCode(
    code: string,
    language: "cpp" | "python",
    context?: string
  ): Promise<string> {
    try {
      const response = await apiRequest<{ review: string }>(
        "/api/ai/review",
        {
          method: "POST",
          body: {
            code,
            language,
            context,
          },
        }
      );
      return response.review;
    } catch (error) {
      console.error("Error reviewing code:", error);
      throw error;
    }
  }

  /**
   * Debug error message
   */
  async debugError(
    errorMessage: string,
    code: string,
    language: "cpp" | "python"
  ): Promise<string> {
    try {
      const response = await apiRequest<{ solution: string }>(
        "/api/ai/debug",
        {
          method: "POST",
          body: {
            errorMessage,
            code,
            language,
          },
        }
      );
      return response.solution;
    } catch (error) {
      console.error("Error in debug:", error);
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): AIMessage[] {
    return this.conversationHistory;
  }

  /**
   * Edit code with AI assistance
   */
  async editCode(
    code: string,
    language: "cpp" | "python",
    instruction: string,
    fileName?: string,
    selectionStart?: number,
    selectionEnd?: number
  ): Promise<CodeEditResult> {
    try {
      const response = await apiRequest<CodeEditResult>(
        "/api/ai/edit-code",
        {
          method: "POST",
          body: {
            code,
            language,
            instruction,
            fileName,
            selectionStart,
            selectionEnd,
          },
        }
      );
      return response;
    } catch (error) {
      console.error("Error editing code:", error);
      throw error;
    }
  }

  /**
   * Refactor code with AI
   */
  async refactorCode(
    code: string,
    language: "cpp" | "python",
    refactorType: RefactorType,
    fileName?: string,
    targetElement?: string
  ): Promise<RefactorResult> {
    try {
      const response = await apiRequest<RefactorResult>(
        "/api/ai/refactor",
        {
          method: "POST",
          body: {
            code,
            language,
            refactorType,
            fileName,
            targetElement,
          },
        }
      );
      return response;
    } catch (error) {
      console.error("Error refactoring code:", error);
      throw error;
    }
  }

  /**
   * Apply AI suggestion to code
   */
  async applySuggestion(
    code: string,
    language: "cpp" | "python",
    suggestion: string,
    lineNumber?: number
  ): Promise<ApplySuggestionResult> {
    try {
      const response = await apiRequest<ApplySuggestionResult>(
        "/api/ai/apply-suggestion",
        {
          method: "POST",
          body: {
            code,
            language,
            suggestion,
            lineNumber,
          },
        }
      );
      return response;
    } catch (error) {
      console.error("Error applying suggestion:", error);
      throw error;
    }
  }
}

export const aiService = new AIService();
