import type { Express, Request, Response } from "express";

// Types for AI requests and responses
interface CompleteRequest {
  code: string;
  language: "cpp" | "python";
  cursorPosition: number;
  fileName?: string;
}

interface AnalyzeRequest {
  code: string;
  language: "cpp" | "python";
}

interface ChatRequest {
  message: string;
  history: Array<{ role: string; content: string }>;
  context?: {
    code?: string;
    language?: string;
    fileName?: string;
    errorMessage?: string;
  };
  systemPrompt?: string;
}

interface GenerateRequest {
  description: string;
  language: "cpp" | "python";
  context?: string;
}

interface ReviewRequest {
  code: string;
  language: "cpp" | "python";
  context?: string;
}

interface DebugRequest {
  errorMessage: string;
  code: string;
  language: "cpp" | "python";
}

interface EditCodeRequest {
  code: string;
  language: "cpp" | "python";
  instruction: string;
  fileName?: string;
  selectionStart?: number;
  selectionEnd?: number;
}

interface RefactorRequest {
  code: string;
  language: "cpp" | "python";
  refactorType: "optimize" | "cleanup" | "modernize" | "extract_function" | "rename_variable";
  fileName?: string;
  targetElement?: string;
}

// ============== RECOMMENDED UPDATES START ==============
// NVIDIA API interaction - reading from environment variables with sensible defaults.
// Default model set to the user's chosen model `deepseek-v3_2` (see https://build.nvidia.com/deepseek-ai/deepseek-v3_2)
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_ENDPOINT = process.env.NVIDIA_API_ENDPOINT || "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "deepseek-v3_2";
// ============== RECOMMENDED UPDATES END ================

async function callNvidiaAPI(
  systemPrompt: string,
  userMessage: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<string> {
  if (!NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY not configured");
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...(conversationHistory || []),
    { role: "user", content: userMessage },
  ];

  try {
    const response = await fetch(NVIDIA_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL, // Updated to use the variable
        messages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("NVIDIA API error:", errorData);
      throw new Error(
        `NVIDIA API error: ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response from AI";
  } catch (error) {
    console.error("Error calling NVIDIA API:", error);
    throw error;
  }
}

export function registerAIRoutes(app: Express): void {
  /**
   * POST /api/ai/complete - Get code completion suggestions
   */
  app.post("/api/ai/complete", async (req: Request, res: Response) => {
    try {
      const { code, language, cursorPosition, fileName }: CompleteRequest =
        req.body;

      if (!code || !language) {
        return res
          .status(400)
          .json({ error: "Missing required parameters" });
      }

      const systemPrompt = `You are a code completion expert for embedded systems. 
Analyze the code and suggest the next 3-5 lines of code that would logically follow at the cursor position.
Respond in JSON format: [{"suggestion": "...", "confidence": 0.95, "explanation": "..."}, ...]
Only return the JSON array, no other text.`;

      const userMessage = `Complete this ${language === "cpp" ? "Arduino/C++" : "MicroPython"} code at cursor position ${cursorPosition}:
\`\`\`${language}
${code}
\`\`\`
${fileName ? `File: ${fileName}` : ""}

Provide exactly 3-5 intelligent suggestions.`;

      const response = await callNvidiaAPI(systemPrompt, userMessage);

      let suggestions = [];
      try {
        suggestions = JSON.parse(response);
      } catch {
        suggestions = [
          {
            suggestion: response.substring(0, 100),
            confidence: 0.5,
            explanation: response,
          },
        ];
      }

      res.json({ suggestions });
    } catch (error) {
      console.error("Error in code completion:", error);
      res.status(500).json({
        error: "Failed to generate code completions",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/ai/analyze - Analyze code for issues
   */
  app.post("/api/ai/analyze", async (req: Request, res: Response) => {
    try {
      const { code, language }: AnalyzeRequest = req.body;

      if (!code || !language) {
        return res
          .status(400)
          .json({ error: "Missing required parameters" });
      }

      const systemPrompt = `You are an expert code analyzer for embedded systems and IoT.
Analyze the code and identify:
1. Errors and bugs
2. Performance issues
3. Security concerns
4. Best practice violations
5. Potential hardware limitations

Respond in JSON format:
{
  "issues": [
    {"severity": "error|warning|info", "line": 10, "message": "...", "suggestion": "..."},
    ...
  ],
  "summary": "Brief summary of findings"
}
Only return the JSON, no other text.`;

      const userMessage = `Analyze this ${language === "cpp" ? "Arduino/C++" : "MicroPython"} code for issues, bugs, and best practice violations:
\`\`\`${language}
${code}
\`\`\``;

      const response = await callNvidiaAPI(systemPrompt, userMessage);

      let analysis;
      try {
        analysis = JSON.parse(response);
      } catch {
        analysis = {
          issues: [],
          summary: "Code analysis completed. Check the AI response for details.",
        };
      }

      res.json(analysis);
    } catch (error) {
      console.error("Error in code analysis:", error);
      res.status(500).json({
        error: "Failed to analyze code",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/ai/chat - Chat with AI about code
   */
  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    try {
      const { message, history, context, systemPrompt }: ChatRequest =
        req.body;

      if (!message) {
        return res.status(400).json({ error: "Missing message" });
      }

      let fullMessage = message;

      if (context?.code) {
        fullMessage += `\n\nContext - ${context.fileName || "Code"}:\n\`\`\`${context.language || "code"}\n${context.code}\n\`\`\``;
      }

      if (context?.errorMessage) {
        fullMessage += `\n\nError: ${context.errorMessage}`;
      }

      const defaultSystemPrompt = `You are a conversational AI assistant designed to produce clear, structured, and user-friendly outputs for IoT and embedded systems development.

**Output Structure (STRICT FORMATTING)**:

1. **Response Text**: Begin with your conversational explanation, analysis, or answer in plain, well-formatted sentences or paragraphs. Use proper markdown formatting with **bold** for key terms and bullet points for lists.

2. **Visual Separator**: After the text explanation, place a clean horizontal separator line (---).

3. **Code Block**: After the separator, place ALL code inside a dedicated, labeled code fence.

**Code Block Requirements**:
- **Label**: Start with a brief descriptive label (e.g., "Solution Code", "Arduino Sketch", "MicroPython Script")
- **Fence**: Use triple backticks (\`\`\`) to open and close the block
- **Language**: Immediately after opening backticks, specify the language (cpp for Arduino, python for MicroPython)
- **Copy-Friendly**: Ensure code is free of leading/trailing text, line numbers, or annotations that would hinder copying
- **Complete**: Provide full, working code that can be directly copied and used

**Response Pattern**:
\`\`\`
[Conversational explanation with context and reasoning]

**Key Points**:
- Point 1
- Point 2
- Point 3

---

**[Descriptive Label]**
\`\`\`language
[Clean, copy-ready code here]
\`\`\`

**Next Steps**: [Proactive suggestions]
\`\`\`

**Technical Focus**: Arduino, ESP32, ESP8266, Raspberry Pi Pico. Always consider hardware constraints, memory efficiency, and real-time requirements.`;

      const response = await callNvidiaAPI(
        systemPrompt || defaultSystemPrompt,
        fullMessage,
        history || []
      );

      res.json({ message: response });
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({
        error: "Failed to process chat message",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/ai/generate - Generate code from description
   */
  app.post("/api/ai/generate", async (req: Request, res: Response) => {
    try {
      const { description, language, context }: GenerateRequest = req.body;

      if (!description || !language) {
        return res
          .status(400)
          .json({ error: "Missing required parameters" });
      }

      const systemPrompt = `You are a conversational AI assistant specializing in embedded systems code generation.

**STRICT OUTPUT FORMAT**:

1. **Explanation**: Brief overview of the approach and design decisions (2-3 sentences)

2. **Separator**: Place --- after explanation

3. **Code Block**: Complete, production-ready code with this format:
   - Label: **[Descriptive Name]** (e.g., "Arduino Temperature Sensor", "ESP32 WiFi Setup")
   - Fence: \`\`\`${language}
   - Content: Clean, well-commented, copy-ready code
   - Fence close: \`\`\`

4. **Key Features**: Bulleted list of important aspects

5. **Next Steps**: Testing or deployment suggestions

**Example Format**:
\`\`\`
This code implements [feature] using [approach]. It's optimized for [hardware] with [key benefit].

---

**Arduino Temperature Monitor**
\`\`\`cpp
// Complete working code here
\`\`\`

**Key Features**:
- Feature 1
- Feature 2

**Next Steps**: Upload to your board and test with serial monitor.
\`\`\`

**Requirements**: Production-ready, well-commented, hardware-optimized code for embedded systems.`;

      let userMessage = `Generate ${language === "cpp" ? "Arduino/C++" : "MicroPython"} code for the following:
${description}`;

      if (context) {
        userMessage += `\n\nContext: ${context}`;
      }

      const response = await callNvidiaAPI(systemPrompt, userMessage);

      const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
      const code = codeMatch ? codeMatch[1].trim() : response;

      res.json({ code });
    } catch (error) {
      console.error("Error in code generation:", error);
      res.status(500).json({
        error: "Failed to generate code",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/ai/review - Review code for improvements
   */
  app.post("/api/ai/review", async (req: Request, res: Response) => {
    try {
      const { code, language, context }: ReviewRequest = req.body;

      if (!code || !language) {
        return res
          .status(400)
          .json({ error: "Missing required parameters" });
      }

      const systemPrompt = `You are a conversational AI assistant specializing in embedded systems code review.

**STRICT OUTPUT FORMAT**:

1. **Overview**: Brief assessment of the code's purpose and current state (2-3 sentences)

2. **Analysis**: Organized findings by category:
   - **Performance**: Optimization opportunities
   - **Memory**: Efficiency improvements
   - **Security**: Potential vulnerabilities
   - **Best Practices**: Code quality issues

3. **Separator**: Place --- before improved code

4. **Improved Code** (if applicable):
   - Label: **Refactored Code**
   - Fence: \`\`\`${language}
   - Content: Clean, improved version
   - Fence close: \`\`\`

5. **Key Improvements**: Bulleted list of changes made

6. **Next Steps**: Testing recommendations

**Example Format**:
\`\`\`
Your code implements [feature] but has opportunities for improvement in [areas].

**Performance**: [findings]
**Memory**: [findings]
**Best Practices**: [findings]

---

**Refactored Code**
\`\`\`cpp
// Improved code here
\`\`\`

**Key Improvements**:
- Improvement 1
- Improvement 2

**Next Steps**: Test with [specific scenarios]
\`\`\`

**Focus**: Microcontroller optimization, memory efficiency, embedded best practices.`;

      let userMessage = `Review this ${language === "cpp" ? "Arduino/C++" : "MicroPython"} code and suggest improvements:
\`\`\`${language}
${code}
\`\`\``;

      if (context) {
        userMessage += `\n\nContext: ${context}`;
      }

      const response = await callNvidiaAPI(systemPrompt, userMessage);

      res.json({ review: response });
    } catch (error) {
      console.error("Error in code review:", error);
      res.status(500).json({
        error: "Failed to review code",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/ai/debug - Debug error messages
   */
  app.post("/api/ai/debug", async (req: Request, res: Response) => {
    try {
      const { errorMessage, code, language }: DebugRequest = req.body;

      if (!errorMessage) {
        return res.status(400).json({ error: "Missing error message" });
      }

      const systemPrompt = `You are a conversational AI assistant specializing in embedded systems debugging.

**STRICT OUTPUT FORMAT**:

1. **Problem Analysis**: Clear explanation of what's causing the error and why (2-3 sentences)

2. **Root Cause**: Specific technical reason for the failure
   - Hardware considerations (if applicable)
   - Timing issues
   - Memory problems
   - Logic errors

3. **Separator**: Place --- before solution code

4. **Fixed Code**:
   - Label: **Corrected Code**
   - Fence: \`\`\`${language}
   - Content: Complete working fix
   - Fence close: \`\`\`

5. **What Changed**: Bulleted list of specific fixes applied

6. **Prevention**: How to avoid this error in the future

**Example Format**:
\`\`\`
The error occurs because [specific reason]. This is common in [context] when [condition].

**Root Cause**: [Technical explanation]

---

**Corrected Code**
\`\`\`cpp
// Fixed code here
\`\`\`

**What Changed**:
- Fixed [issue 1]
- Added [safeguard 2]

**Prevention**: Always [best practice] to avoid this issue.

**Next Steps**: Test with [specific scenarios]
\`\`\`

**Focus**: Hardware constraints, timing issues, memory management, embedded debugging.`;

      let userMessage = `Debug this ${language === "cpp" ? "Arduino/C++" : "MicroPython"} error:
Error: ${errorMessage}`;

      if (code) {
        userMessage += `\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``;
      }

      const response = await callNvidiaAPI(systemPrompt, userMessage);

      res.json({ solution: response });
    } catch (error) {
      console.error("Error in debugging:", error);
      res.status(500).json({
        error: "Failed to debug error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/ai/edit-code - AI-powered real-time code editing
   */
  app.post("/api/ai/edit-code", async (req: Request, res: Response) => {
    try {
      const { code, language, instruction, fileName, selectionStart, selectionEnd }: EditCodeRequest = req.body;

      if (!code || !language || !instruction) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const systemPrompt = `You are an AI code editor specializing in embedded systems. Modify code according to user instructions while maintaining functionality and best practices.

**CRITICAL**: Return ONLY a valid JSON object. No markdown, no explanations outside the JSON.

**Required JSON Structure**:
{
  "modifiedCode": "complete modified code with proper formatting",
  "changes": [
    {
      "type": "addition|modification|deletion",
      "lineStart": number,
      "lineEnd": number,
      "description": "clear description of what changed"
    }
  ],
  "explanation": "Brief, conversational explanation of changes (2-3 sentences)"
}

**Code Modification Rules**:
- Preserve existing functionality unless explicitly requested to change
- Follow embedded systems best practices (memory efficiency, hardware constraints)
- Maintain proper indentation and formatting
- Only modify what's necessary to fulfill the instruction
- Ensure code is production-ready and copy-friendly
- Consider microcontroller limitations (RAM, Flash, processing power)

**Example Response**:
{
  "modifiedCode": "// Complete working code here\\nvoid setup() {\\n  // code\\n}",
  "changes": [
    {"type": "addition", "lineStart": 5, "lineEnd": 7, "description": "Added error handling for sensor readings"}
  ],
  "explanation": "Added robust error handling to prevent crashes when sensor fails. The code now checks for valid readings before processing."
}`;

      let userMessage = `Edit this ${language === "cpp" ? "Arduino/C++" : "MicroPython"} code according to the instruction:

**Instruction**: ${instruction}

**Current Code**:
\`\`\`${language}
${code}
\`\`\``;

      if (fileName) {
        userMessage += `\n**File**: ${fileName}`;
      }

      if (selectionStart !== undefined && selectionEnd !== undefined) {
        const lines = code.split('\n');
        const selectedLines = lines.slice(selectionStart, selectionEnd + 1);
        userMessage += `\n**Selected Lines** (${selectionStart + 1}-${selectionEnd + 1}):\n\`\`\`${language}\n${selectedLines.join('\n')}\n\`\`\``;
      }

      const response = await callNvidiaAPI(systemPrompt, userMessage);

      let result;
      try {
        // Try to parse JSON response
        result = JSON.parse(response);
      } catch {
        // Fallback if AI doesn't return proper JSON
        result = {
          modifiedCode: code,
          changes: [],
          explanation: "Unable to parse AI response. Please try again."
        };
      }

      res.json(result);
    } catch (error) {
      console.error("Error in code editing:", error);
      res.status(500).json({
        error: "Failed to edit code",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/ai/refactor - AI-powered code refactoring
   */
  app.post("/api/ai/refactor", async (req: Request, res: Response) => {
    try {
      const { code, language, refactorType, fileName, targetElement }: RefactorRequest = req.body;

      if (!code || !language || !refactorType) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const refactorInstructions = {
        optimize: "Optimize the code for better performance and memory efficiency on microcontrollers",
        cleanup: "Clean up the code by removing unused variables, improving naming, and organizing structure",
        modernize: "Modernize the code using current best practices and language features",
        extract_function: "Extract repeated code into reusable functions",
        rename_variable: `Rename the variable/function '${targetElement}' to a more descriptive name`
      };

      const systemPrompt = `You are an AI code refactoring specialist for embedded systems.

**CRITICAL**: Return ONLY a valid JSON object. No markdown, no explanations outside the JSON.

**Required JSON Structure**:
{
  "refactoredCode": "complete refactored code with proper formatting",
  "changes": [
    {
      "type": "optimization|cleanup|modernization|extraction",
      "description": "specific change made",
      "benefit": "concrete improvement gained"
    }
  ],
  "summary": "Conversational summary of overall improvements (2-3 sentences)"
}

**Refactoring Priorities**:
1. **Memory Efficiency**: Reduce RAM/Flash usage for microcontrollers
2. **Performance**: Optimize loops, reduce function calls, improve timing
3. **Readability**: Clear naming, proper structure, helpful comments
4. **Best Practices**: Follow embedded systems standards
5. **Hardware Optimization**: Leverage specific MCU features

**Example Response**:
{
  "refactoredCode": "// Optimized code here\\nvoid setup() {\\n  // code\\n}",
  "changes": [
    {"type": "optimization", "description": "Replaced String with char arrays", "benefit": "Reduces heap fragmentation and saves 200 bytes RAM"},
    {"type": "cleanup", "description": "Extracted sensor reading logic", "benefit": "Improves code reusability and maintainability"}
  ],
  "summary": "Refactored for better memory efficiency and code organization. The changes reduce RAM usage by 30% and make the code more maintainable."
}`;

      const instruction = refactorInstructions[refactorType];
      let userMessage = `Refactor this ${language === "cpp" ? "Arduino/C++" : "MicroPython"} code:

**Refactoring Goal**: ${instruction}

**Current Code**:
\`\`\`${language}
${code}
\`\`\``;

      if (fileName) {
        userMessage += `\n**File**: ${fileName}`;
      }

      const response = await callNvidiaAPI(systemPrompt, userMessage);

      let result;
      try {
        result = JSON.parse(response);
      } catch {
        result = {
          refactoredCode: code,
          changes: [],
          summary: "Unable to parse refactoring response. Please try again."
        };
      }

      res.json(result);
    } catch (error) {
      console.error("Error in code refactoring:", error);
      res.status(500).json({
        error: "Failed to refactor code",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/ai/apply-suggestion - Apply AI suggestion to code
   */
  app.post("/api/ai/apply-suggestion", async (req: Request, res: Response) => {
    try {
      const { code, language, suggestion, lineNumber } = req.body;

      if (!code || !language || !suggestion) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const systemPrompt = `You are an AI code editor that applies specific suggestions to code.

**CRITICAL**: Return ONLY a valid JSON object. No markdown, no explanations outside the JSON.

**Required JSON Structure**:
{
  "modifiedCode": "complete code with suggestion applied",
  "appliedAt": {
    "lineStart": number,
    "lineEnd": number,
    "originalText": "exact text that was replaced",
    "newText": "exact replacement text"
  }
}

**Application Rules**:
- Apply the suggestion precisely and accurately
- Maintain proper syntax and formatting
- Preserve surrounding code exactly as-is
- Ensure code remains functional after change
- Consider embedded systems constraints (memory, timing, hardware)
- Keep code copy-friendly and production-ready

**Example Response**:
{
  "modifiedCode": "// Complete code with change applied\\nvoid setup() {\\n  pinMode(LED_PIN, OUTPUT);\\n}",
  "appliedAt": {
    "lineStart": 3,
    "lineEnd": 3,
    "originalText": "  pinMode(13, OUTPUT);",
    "newText": "  pinMode(LED_PIN, OUTPUT);"
  }
}`;

      let userMessage = `Apply this suggestion to the code:

**Suggestion**: ${suggestion}
${lineNumber ? `**Target Line**: ${lineNumber}` : ""}

**Current Code**:
\`\`\`${language}
${code}
\`\`\``;

      const response = await callNvidiaAPI(systemPrompt, userMessage);

      let result;
      try {
        result = JSON.parse(response);
      } catch {
        result = {
          modifiedCode: code,
          appliedAt: null
        };
      }

      res.json(result);
    } catch (error) {
      console.error("Error applying suggestion:", error);
      res.status(500).json({
        error: "Failed to apply suggestion",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}