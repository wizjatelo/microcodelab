"""
AI Routes for µCodeLab
NVIDIA API integration for code completion, analysis, chat, and more
"""

import os
import json
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# ENV_PATH for fallback loading if needed - don't load at module level
ENV_PATH = Path(__file__).parent.parent / ".env"

def get_nvidia_config():
    """Get NVIDIA API configuration at runtime"""
    api_key = os.getenv("NVIDIA_API_KEY")
    
    # Fallback: load .env if key not found
    if not api_key:
        load_dotenv(ENV_PATH, override=True)
        api_key = os.getenv("NVIDIA_API_KEY")
    
    return {
        "api_key": api_key,
        "endpoint": os.getenv("NVIDIA_API_ENDPOINT", "https://integrate.api.nvidia.com/v1/chat/completions"),
        "model": os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")
    }

router = APIRouter(prefix="/api/ai", tags=["AI"])


# ============== Request/Response Models ==============

class CompleteRequest(BaseModel):
    code: str
    language: str  # cpp or python
    cursorPosition: int
    fileName: Optional[str] = None


class AnalyzeRequest(BaseModel):
    code: str
    language: str


class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []
    context: Optional[Dict[str, Any]] = None
    systemPrompt: Optional[str] = None


class GenerateRequest(BaseModel):
    description: str
    language: str
    context: Optional[str] = None


class ReviewRequest(BaseModel):
    code: str
    language: str
    context: Optional[str] = None


class DebugRequest(BaseModel):
    errorMessage: str
    code: Optional[str] = None
    language: str


class EditCodeRequest(BaseModel):
    code: str
    language: str
    instruction: str
    fileName: Optional[str] = None
    selectionStart: Optional[int] = None
    selectionEnd: Optional[int] = None


class RefactorRequest(BaseModel):
    code: str
    language: str
    refactorType: str  # optimize, cleanup, modernize, extract_function, rename_variable
    fileName: Optional[str] = None
    targetElement: Optional[str] = None


class ApplySuggestionRequest(BaseModel):
    code: str
    language: str
    suggestion: str
    lineNumber: Optional[int] = None


# ============== NVIDIA API Helper ==============

async def call_nvidia_api(
    system_prompt: str,
    user_message: str,
    conversation_history: List[Dict[str, str]] = None,
    max_tokens: int = 512,
    temperature: float = 0.5
) -> str:
    """Call NVIDIA API with the given prompts"""
    config = get_nvidia_config()
    
    if not config["api_key"]:
        raise HTTPException(500, "NVIDIA_API_KEY not configured")

    # Limit conversation history to last 4 messages
    recent_history = (conversation_history or [])[-4:]

    messages = [
        {"role": "system", "content": system_prompt},
        *recent_history,
        {"role": "user", "content": user_message},
    ]

    try:
        logger.info(f"Calling NVIDIA API: {config['endpoint']} with model {config['model']}")
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                config["endpoint"],
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {config['api_key']}",
                },
                json={
                    "model": config["model"],
                    "messages": messages,
                    "temperature": temperature,
                    "top_p": 0.85,
                    "max_tokens": max_tokens,
                    "frequency_penalty": 0.1,
                },
            )
            logger.info(f"NVIDIA API response status: {response.status_code}")

            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                logger.error(f"NVIDIA API error: {error_data}")
                raise HTTPException(500, f"NVIDIA API error: {response.status_code}")

            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "No response from AI")

    except httpx.TimeoutException:
        raise HTTPException(504, "AI request timed out")
    except Exception as e:
        logger.error(f"Error calling NVIDIA API: {e}")
        raise HTTPException(500, str(e))


# ============== AI Endpoints ==============

@router.get("/status")
async def ai_status():
    """Check AI configuration status"""
    config = get_nvidia_config()
    return {
        "configured": bool(config["api_key"]),
        "model": config["model"],
        "endpoint": config["endpoint"],
        "api_key_prefix": config["api_key"][:10] + "..." if config["api_key"] else None
    }

@router.post("/complete")
async def complete_code(request: CompleteRequest):
    """Get code completion suggestions"""
    system_prompt = """You are a code completion expert for embedded systems. 
Analyze the code and suggest the next 3-5 lines of code that would logically follow at the cursor position.
Respond in JSON format: [{"suggestion": "...", "confidence": 0.95, "explanation": "..."}, ...]
Only return the JSON array, no other text."""

    lang_name = "Arduino/C++" if request.language == "cpp" else "MicroPython"
    user_message = f"""Complete this {lang_name} code at cursor position {request.cursorPosition}:
```{request.language}
{request.code}
```
{f'File: {request.fileName}' if request.fileName else ''}

Provide exactly 3-5 intelligent suggestions."""

    response = await call_nvidia_api(system_prompt, user_message, max_tokens=300, temperature=0.3)

    try:
        suggestions = json.loads(response)
    except json.JSONDecodeError:
        suggestions = [{"suggestion": response[:100], "confidence": 0.5, "explanation": response}]

    return {"suggestions": suggestions}


@router.post("/analyze")
async def analyze_code(request: AnalyzeRequest):
    """Analyze code for issues"""
    system_prompt = """You are an expert code analyzer for embedded systems and IoT.
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
Only return the JSON, no other text."""

    lang_name = "Arduino/C++" if request.language == "cpp" else "MicroPython"
    user_message = f"""Analyze this {lang_name} code for issues, bugs, and best practice violations:
```{request.language}
{request.code}
```"""

    response = await call_nvidia_api(system_prompt, user_message, max_tokens=400, temperature=0.3)

    try:
        analysis = json.loads(response)
    except json.JSONDecodeError:
        analysis = {"issues": [], "summary": "Code analysis completed. Check the AI response for details."}

    return analysis


@router.post("/chat")
async def chat_with_ai(request: ChatRequest):
    """Chat with AI about code"""
    full_message = request.message

    if request.context:
        if request.context.get("code"):
            lang = request.context.get("language", "code")
            file_name = request.context.get("fileName", "Code")
            full_message += f"\n\nContext - {file_name}:\n```{lang}\n{request.context['code']}\n```"
        if request.context.get("errorMessage"):
            full_message += f"\n\nError: {request.context['errorMessage']}"

    default_system_prompt = """You are µCodeLab AI, a professional embedded systems assistant. Be concise, direct, and technical.

**RESPONSE STYLE**:
- Be brief and to the point - no filler phrases like "Let me help you" or "Here's what I found"
- Skip obvious observations - don't describe what the code already clearly does
- Focus on actionable insights and improvements only
- Use short, punchy sentences
- No excessive praise or pleasantries

**FORMAT RULES**:
1. Start with a 1-2 sentence summary of the key insight or solution
2. If suggesting changes, list them as bullet points (max 3-4 points)
3. Code blocks must be clean and copy-ready - no inline comments explaining obvious things
4. End with a single actionable next step if relevant

**AVOID**:
- Long introductions or conclusions
- Repeating what the user already knows
- Excessive markdown headers
- Phrases like "Great question!", "I'd be happy to help", "Let me know if..."
- Bullet points for things that could be one sentence"""

    response = await call_nvidia_api(
        request.systemPrompt or default_system_prompt,
        full_message,
        request.history,
        max_tokens=800,
        temperature=0.6
    )

    return {"message": response}


@router.post("/generate")
async def generate_code(request: GenerateRequest):
    """Generate code from description"""
    lang = request.language
    system_prompt = f"""You are a conversational AI assistant specializing in embedded systems code generation.

**STRICT OUTPUT FORMAT**:

1. **Explanation**: Brief overview of the approach and design decisions (2-3 sentences)

2. **Separator**: Place --- after explanation

3. **Code Block**: Complete, production-ready code with this format:
   - Label: **[Descriptive Name]** (e.g., "Arduino Temperature Sensor", "ESP32 WiFi Setup")
   - Fence: ```{lang}
   - Content: Clean, well-commented, copy-ready code
   - Fence close: ```

4. **Key Features**: Bulleted list of important aspects

5. **Next Steps**: Testing or deployment suggestions

**Requirements**: Production-ready, well-commented, hardware-optimized code for embedded systems."""

    lang_name = "Arduino/C++" if lang == "cpp" else "MicroPython"
    user_message = f"""Generate {lang_name} code for the following:
{request.description}"""

    if request.context:
        user_message += f"\n\nContext: {request.context}"

    response = await call_nvidia_api(system_prompt, user_message, max_tokens=600, temperature=0.4)

    # Extract code from response
    import re
    code_match = re.search(r'```[\w]*\n([\s\S]*?)```', response)
    code = code_match.group(1).strip() if code_match else response

    return {"code": code}


@router.post("/review")
async def review_code(request: ReviewRequest):
    """Review code for improvements"""
    lang = request.language
    system_prompt = f"""You are a conversational AI assistant specializing in embedded systems code review.

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
   - Fence: ```{lang}
   - Content: Clean, improved version
   - Fence close: ```

5. **Key Improvements**: Bulleted list of changes made

6. **Next Steps**: Testing recommendations

**Focus**: Microcontroller optimization, memory efficiency, embedded best practices."""

    lang_name = "Arduino/C++" if lang == "cpp" else "MicroPython"
    user_message = f"""Review this {lang_name} code and suggest improvements:
```{lang}
{request.code}
```"""

    if request.context:
        user_message += f"\n\nContext: {request.context}"

    response = await call_nvidia_api(system_prompt, user_message, max_tokens=600, temperature=0.5)

    return {"review": response}


@router.post("/debug")
async def debug_error(request: DebugRequest):
    """Debug error messages"""
    lang = request.language
    system_prompt = f"""You are a conversational AI assistant specializing in embedded systems debugging.

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
   - Fence: ```{lang}
   - Content: Complete working fix
   - Fence close: ```

5. **What Changed**: Bulleted list of specific fixes applied

6. **Prevention**: How to avoid this error in the future

**Focus**: Hardware constraints, timing issues, memory management, embedded debugging."""

    lang_name = "Arduino/C++" if lang == "cpp" else "MicroPython"
    user_message = f"""Debug this {lang_name} error:
Error: {request.errorMessage}"""

    if request.code:
        user_message += f"\n\nCode:\n```{lang}\n{request.code}\n```"

    response = await call_nvidia_api(system_prompt, user_message, max_tokens=600, temperature=0.4)

    return {"solution": response}


@router.post("/edit-code")
async def edit_code(request: EditCodeRequest):
    """AI-powered real-time code editing"""
    system_prompt = """You are an AI code editor specializing in embedded systems. Modify code according to user instructions while maintaining functionality and best practices.

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
- Consider microcontroller limitations (RAM, Flash, processing power)"""

    lang_name = "Arduino/C++" if request.language == "cpp" else "MicroPython"
    user_message = f"""Edit this {lang_name} code according to the instruction:

**Instruction**: {request.instruction}

**Current Code**:
```{request.language}
{request.code}
```"""

    if request.fileName:
        user_message += f"\n**File**: {request.fileName}"

    if request.selectionStart is not None and request.selectionEnd is not None:
        lines = request.code.split('\n')
        selected_lines = lines[request.selectionStart:request.selectionEnd + 1]
        user_message += f"\n**Selected Lines** ({request.selectionStart + 1}-{request.selectionEnd + 1}):\n```{request.language}\n{chr(10).join(selected_lines)}\n```"

    response = await call_nvidia_api(system_prompt, user_message, max_tokens=700, temperature=0.4)

    try:
        result = json.loads(response)
    except json.JSONDecodeError:
        result = {
            "modifiedCode": request.code,
            "changes": [],
            "explanation": "Unable to parse AI response. Please try again."
        }

    return result


@router.post("/refactor")
async def refactor_code(request: RefactorRequest):
    """AI-powered code refactoring"""
    refactor_instructions = {
        "optimize": "Optimize the code for better performance and memory efficiency on microcontrollers",
        "cleanup": "Clean up the code by removing unused variables, improving naming, and organizing structure",
        "modernize": "Modernize the code using current best practices and language features",
        "extract_function": "Extract repeated code into reusable functions",
        "rename_variable": f"Rename the variable/function '{request.targetElement}' to a more descriptive name"
    }

    instruction = refactor_instructions.get(request.refactorType, "Refactor the code")

    system_prompt = """You are an AI code refactoring specialist for embedded systems.

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
5. **Hardware Optimization**: Leverage specific MCU features"""

    lang_name = "Arduino/C++" if request.language == "cpp" else "MicroPython"
    user_message = f"""Refactor this {lang_name} code:

**Refactoring Goal**: {instruction}

**Current Code**:
```{request.language}
{request.code}
```"""

    if request.fileName:
        user_message += f"\n**File**: {request.fileName}"

    response = await call_nvidia_api(system_prompt, user_message, max_tokens=700, temperature=0.4)

    try:
        result = json.loads(response)
    except json.JSONDecodeError:
        result = {
            "refactoredCode": request.code,
            "changes": [],
            "summary": "Unable to parse refactoring response. Please try again."
        }

    return result


@router.post("/apply-suggestion")
async def apply_suggestion(request: ApplySuggestionRequest):
    """Apply AI suggestion to code"""
    system_prompt = """You are an AI code editor that applies specific suggestions to code.

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
- Keep code copy-friendly and production-ready"""

    user_message = f"""Apply this suggestion to the code:

**Suggestion**: {request.suggestion}
{f'**Target Line**: {request.lineNumber}' if request.lineNumber else ''}

**Current Code**:
```{request.language}
{request.code}
```"""

    response = await call_nvidia_api(system_prompt, user_message, max_tokens=500, temperature=0.3)

    try:
        result = json.loads(response)
    except json.JSONDecodeError:
        result = {
            "modifiedCode": request.code,
            "appliedAt": None
        }

    return result
