/**
 * Code Analyzer Service for Arduino/MicroPython
 * Provides syntax checking, linting, and code analysis
 */

export interface CodeIssue {
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  suggestion?: string;
}

export interface AnalysisResult {
  success: boolean;
  errors: CodeIssue[];
  warnings: CodeIssue[];
  info: CodeIssue[];
  stats: {
    lines: number;
    functions: number;
    variables: number;
    includes: number;
    estimatedSize: number;
    complexity: 'low' | 'medium' | 'high';
  };
}

interface FunctionInfo {
  name: string;
  line: number;
  returnType: string;
  params: string[];
}

interface VariableInfo {
  name: string;
  line: number;
  type: string;
  isGlobal: boolean;
}

// Arduino/C++ reserved keywords
const CPP_KEYWORDS = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
  'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
  'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while',
  'bool', 'true', 'false', 'class', 'private', 'public', 'protected', 'virtual',
  'new', 'delete', 'this', 'nullptr', 'template', 'typename', 'namespace', 'using'
]);

// Arduino specific functions
const ARDUINO_FUNCTIONS = new Set([
  'setup', 'loop', 'pinMode', 'digitalWrite', 'digitalRead', 'analogRead',
  'analogWrite', 'delay', 'delayMicroseconds', 'millis', 'micros',
  'Serial', 'Wire', 'SPI', 'attachInterrupt', 'detachInterrupt',
  'tone', 'noTone', 'pulseIn', 'shiftOut', 'shiftIn', 'map', 'constrain',
  'min', 'max', 'abs', 'pow', 'sqrt', 'sin', 'cos', 'tan', 'random', 'randomSeed'
]);

// Common Arduino pin constants
const ARDUINO_CONSTANTS = new Set([
  'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN',
  'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7',
  'RISING', 'FALLING', 'CHANGE', 'SERIAL', 'DISPLAY'
]);

export class CodeAnalyzer {
  private code: string;
  private lines: string[];
  private language: 'arduino' | 'micropython';
  private issues: CodeIssue[] = [];
  private functions: FunctionInfo[] = [];
  private variables: VariableInfo[] = [];
  private includes: string[] = [];

  constructor(code: string, language: 'arduino' | 'micropython' = 'arduino') {
    this.code = code;
    this.lines = code.split('\n');
    this.language = language;
  }

  analyze(): AnalysisResult {
    this.issues = [];
    this.functions = [];
    this.variables = [];
    this.includes = [];

    if (this.language === 'arduino') {
      this.analyzeArduino();
    } else {
      this.analyzeMicroPython();
    }

    const errors = this.issues.filter(i => i.severity === 'error');
    const warnings = this.issues.filter(i => i.severity === 'warning');
    const info = this.issues.filter(i => i.severity === 'info');

    return {
      success: errors.length === 0,
      errors,
      warnings,
      info,
      stats: {
        lines: this.lines.length,
        functions: this.functions.length,
        variables: this.variables.length,
        includes: this.includes.length,
        estimatedSize: this.estimateSize(),
        complexity: this.calculateComplexity(),
      },
    };
  }

  private analyzeArduino(): void {
    this.checkRequiredFunctions();
    this.checkBraceMatching();
    this.checkParenthesesMatching();
    this.checkSemicolons();
    this.checkIncludes();
    this.extractFunctions();
    this.extractVariables();
    this.checkSerialUsage();
    this.checkPinUsage();
    this.checkDelayUsage();
    this.checkMemoryIssues();
    this.checkNamingConventions();
    this.checkWidgetBindings();
    this.checkCommonMistakes();
  }

  private analyzeMicroPython(): void {
    this.checkPythonIndentation();
    this.checkPythonSyntax();
    this.extractPythonFunctions();
    this.extractPythonVariables();
    this.checkPythonImports();
  }

  private checkRequiredFunctions(): void {
    const hasSetup = /void\s+setup\s*\(\s*\)/.test(this.code);
    const hasLoop = /void\s+loop\s*\(\s*\)/.test(this.code);

    if (!hasSetup) {
      this.issues.push({
        line: 1,
        severity: 'error',
        message: 'Missing required setup() function',
        code: 'E001',
        suggestion: 'Add: void setup() { }'
      });
    }

    if (!hasLoop) {
      this.issues.push({
        line: 1,
        severity: 'error',
        message: 'Missing required loop() function',
        code: 'E002',
        suggestion: 'Add: void loop() { }'
      });
    }
  }

  private checkBraceMatching(): void {
    let braceCount = 0;
    let braceStack: { char: string; line: number }[] = [];

    this.lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      // Skip comments and strings
      const cleanLine = this.removeCommentsAndStrings(line);
      
      for (const char of cleanLine) {
        if (char === '{') {
          braceStack.push({ char: '{', line: lineNum });
          braceCount++;
        } else if (char === '}') {
          if (braceStack.length === 0) {
            this.issues.push({
              line: lineNum,
              severity: 'error',
              message: 'Unexpected closing brace }',
              code: 'E003'
            });
          } else {
            braceStack.pop();
          }
          braceCount--;
        }
      }
    });

    if (braceStack.length > 0) {
      braceStack.forEach(b => {
        this.issues.push({
          line: b.line,
          severity: 'error',
          message: 'Opening brace { without matching closing brace',
          code: 'E004'
        });
      });
    }
  }

  private checkParenthesesMatching(): void {
    let parenStack: { line: number; col: number }[] = [];

    this.lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const cleanLine = this.removeCommentsAndStrings(line);
      
      for (let col = 0; col < cleanLine.length; col++) {
        if (cleanLine[col] === '(') {
          parenStack.push({ line: lineNum, col });
        } else if (cleanLine[col] === ')') {
          if (parenStack.length === 0) {
            this.issues.push({
              line: lineNum,
              column: col + 1,
              severity: 'error',
              message: 'Unexpected closing parenthesis )',
              code: 'E005'
            });
          } else {
            parenStack.pop();
          }
        }
      }
    });

    parenStack.forEach(p => {
      this.issues.push({
        line: p.line,
        column: p.col + 1,
        severity: 'error',
        message: 'Opening parenthesis ( without matching closing parenthesis',
        code: 'E006'
      });
    });
  }

  private checkSemicolons(): void {
    let inMultiLineComment = false;

    this.lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      let trimmed = line.trim();

      // Track multi-line comments
      if (trimmed.includes('/*')) inMultiLineComment = true;
      if (trimmed.includes('*/')) inMultiLineComment = false;

      if (inMultiLineComment || !trimmed) return;

      // Skip lines that don't need semicolons
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('/*') ||
        trimmed.endsWith('*/') ||
        trimmed.endsWith('{') ||
        trimmed.endsWith('}') ||
        trimmed.endsWith(',') ||
        trimmed.endsWith(';') ||
        trimmed.endsWith(':') ||
        /^(if|else|for|while|switch|do|try|catch)\s*[\({]?/.test(trimmed) ||
        /^(void|int|float|double|char|bool|long|short|unsigned|String)\s+\w+\s*\(/.test(trimmed) ||
        /^\w+\s*:$/.test(trimmed) // labels
      ) {
        return;
      }

      // Check for statements that should end with semicolon
      if (
        /^(return|break|continue)\s/.test(trimmed) ||
        /^\w+\s*=/.test(trimmed) ||
        /^\w+\s*\(.*\)\s*$/.test(trimmed) ||
        /^\w+(\+\+|--)\s*$/.test(trimmed) ||
        /^(\+\+|--)\w+\s*$/.test(trimmed)
      ) {
        this.issues.push({
          line: lineNum,
          severity: 'warning',
          message: 'Statement may be missing semicolon',
          code: 'W001',
          suggestion: 'Add ; at the end of the line'
        });
      }
    });
  }

  private checkIncludes(): void {
    this.lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const includeMatch = line.match(/^\s*#include\s*[<"](.+)[>"]/);
      
      if (includeMatch) {
        this.includes.push(includeMatch[1]);
        
        // Check for common include issues
        if (includeMatch[1].includes(' ')) {
          this.issues.push({
            line: lineNum,
            severity: 'error',
            message: `Invalid include: spaces in header name "${includeMatch[1]}"`,
            code: 'E007'
          });
        }
      }

      // Check for malformed includes
      if (line.trim().startsWith('#include') && !includeMatch) {
        this.issues.push({
          line: lineNum,
          severity: 'error',
          message: 'Malformed #include directive',
          code: 'E008',
          suggestion: 'Use: #include <header.h> or #include "header.h"'
        });
      }
    });
  }

  private extractFunctions(): void {
    const funcRegex = /^(\w+)\s+(\w+)\s*\(([^)]*)\)\s*{?/;
    
    this.lines.forEach((line, idx) => {
      const match = line.match(funcRegex);
      if (match && !line.trim().startsWith('//')) {
        const [, returnType, name, params] = match;
        if (!CPP_KEYWORDS.has(name)) {
          this.functions.push({
            name,
            line: idx + 1,
            returnType,
            params: params.split(',').map(p => p.trim()).filter(Boolean)
          });
        }
      }
    });
  }

  private extractVariables(): void {
    const varRegex = /^\s*(const\s+)?(int|float|double|char|bool|long|short|unsigned|String|byte|uint\d+_t|int\d+_t)\s+(\w+)\s*(=|;|\[)/;
    let inFunction = false;
    let braceDepth = 0;

    this.lines.forEach((line, idx) => {
      const cleanLine = this.removeCommentsAndStrings(line);
      
      // Track function scope
      if (cleanLine.includes('{')) braceDepth++;
      if (cleanLine.includes('}')) braceDepth--;
      
      if (/void\s+(setup|loop|\w+)\s*\(/.test(cleanLine)) {
        inFunction = true;
      }

      const match = line.match(varRegex);
      if (match) {
        this.variables.push({
          name: match[3],
          line: idx + 1,
          type: match[2],
          isGlobal: braceDepth === 0
        });
      }
    });
  }

  private checkSerialUsage(): void {
    const usesSerial = /Serial\.(print|println|write|read|available|begin)/.test(this.code);
    const hasSerialBegin = /Serial\.begin\s*\(\s*\d+\s*\)/.test(this.code);

    if (usesSerial && !hasSerialBegin) {
      this.issues.push({
        line: 1,
        severity: 'warning',
        message: 'Using Serial without Serial.begin() - add Serial.begin(9600) in setup()',
        code: 'W002',
        suggestion: 'Add Serial.begin(9600); in setup()'
      });
    }

    // Check for Serial.begin in loop (common mistake)
    let inLoop = false;
    this.lines.forEach((line, idx) => {
      if (/void\s+loop\s*\(/.test(line)) inLoop = true;
      if (inLoop && line.includes('}') && !line.includes('{')) inLoop = false;
      
      if (inLoop && /Serial\.begin/.test(line)) {
        this.issues.push({
          line: idx + 1,
          severity: 'warning',
          message: 'Serial.begin() should be in setup(), not loop()',
          code: 'W003'
        });
      }
    });
  }

  private checkPinUsage(): void {
    const digitalPins = new Set<string>();
    const analogPins = new Set<string>();
    const configuredPins = new Set<string>();

    this.lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      
      // Extract pinMode calls
      const pinModeMatch = line.match(/pinMode\s*\(\s*(\w+)/);
      if (pinModeMatch) {
        configuredPins.add(pinModeMatch[1]);
      }

      // Extract digitalWrite/digitalRead calls
      const digitalMatch = line.match(/digital(Write|Read)\s*\(\s*(\w+)/);
      if (digitalMatch) {
        digitalPins.add(digitalMatch[2]);
      }

      // Extract analogRead/analogWrite calls
      const analogMatch = line.match(/analog(Write|Read)\s*\(\s*(\w+)/);
      if (analogMatch) {
        analogPins.add(analogMatch[2]);
      }
    });

    // Check for unconfigured digital pins
    digitalPins.forEach(pin => {
      if (!configuredPins.has(pin) && !ARDUINO_CONSTANTS.has(pin)) {
        this.issues.push({
          line: 1,
          severity: 'warning',
          message: `Pin ${pin} used without pinMode() configuration`,
          code: 'W004',
          suggestion: `Add pinMode(${pin}, OUTPUT); or pinMode(${pin}, INPUT); in setup()`
        });
      }
    });
  }

  private checkDelayUsage(): void {
    let delayCount = 0;
    let totalDelay = 0;

    this.lines.forEach((line, idx) => {
      const delayMatch = line.match(/delay\s*\(\s*(\d+)\s*\)/);
      if (delayMatch) {
        delayCount++;
        totalDelay += parseInt(delayMatch[1]);

        if (parseInt(delayMatch[1]) > 1000) {
          this.issues.push({
            line: idx + 1,
            severity: 'info',
            message: `Long delay (${delayMatch[1]}ms) - consider using millis() for non-blocking timing`,
            code: 'I001'
          });
        }
      }
    });

    if (delayCount > 3) {
      this.issues.push({
        line: 1,
        severity: 'info',
        message: `Multiple delay() calls (${delayCount}) - consider using millis() for better responsiveness`,
        code: 'I002'
      });
    }
  }

  private checkMemoryIssues(): void {
    // Check for String class usage (can cause memory fragmentation)
    let stringCount = 0;
    this.lines.forEach((line, idx) => {
      if (/String\s+\w+/.test(line)) {
        stringCount++;
      }
      
      // Check for String concatenation in loop
      if (/String\s*\+/.test(line) || /\+=\s*String/.test(line)) {
        this.issues.push({
          line: idx + 1,
          severity: 'info',
          message: 'String concatenation can cause memory fragmentation - consider using char arrays',
          code: 'I003'
        });
      }
    });

    if (stringCount > 5) {
      this.issues.push({
        line: 1,
        severity: 'info',
        message: `Heavy String usage (${stringCount} instances) may cause memory issues on small MCUs`,
        code: 'I004'
      });
    }

    // Check for large arrays
    this.lines.forEach((line, idx) => {
      const arrayMatch = line.match(/\w+\s+\w+\s*\[\s*(\d+)\s*\]/);
      if (arrayMatch && parseInt(arrayMatch[1]) > 256) {
        this.issues.push({
          line: idx + 1,
          severity: 'warning',
          message: `Large array size (${arrayMatch[1]}) - ensure sufficient RAM`,
          code: 'W005'
        });
      }
    });
  }

  private checkNamingConventions(): void {
    this.variables.forEach(v => {
      // Check for single letter variable names (except i, j, k for loops)
      if (v.name.length === 1 && !['i', 'j', 'k', 'n', 'x', 'y', 'z'].includes(v.name)) {
        this.issues.push({
          line: v.line,
          severity: 'info',
          message: `Single letter variable name "${v.name}" - consider using descriptive names`,
          code: 'I005'
        });
      }

      // Check for reserved words used as variables
      if (ARDUINO_FUNCTIONS.has(v.name) || ARDUINO_CONSTANTS.has(v.name)) {
        this.issues.push({
          line: v.line,
          severity: 'warning',
          message: `Variable "${v.name}" shadows Arduino built-in`,
          code: 'W006'
        });
      }
    });
  }

  private checkWidgetBindings(): void {
    const bindingRegex = /\/\/@bind_widget\s*\(\s*id\s*=\s*"([^"]+)"\s*\)/g;
    let match;
    const bindings: { id: string; line: number }[] = [];

    this.lines.forEach((line, idx) => {
      const bindMatch = line.match(/\/\/@bind_widget\s*\(\s*id\s*=\s*"([^"]+)"\s*\)/);
      if (bindMatch) {
        bindings.push({ id: bindMatch[1], line: idx + 1 });
        
        // Check if next line has a variable or function
        const nextLine = this.lines[idx + 1];
        if (nextLine && !(/^\s*(int|float|bool|void|char|String|double|long|unsigned)/.test(nextLine))) {
          this.issues.push({
            line: idx + 1,
            severity: 'warning',
            message: '@bind_widget annotation should be followed by a variable or function declaration',
            code: 'W007'
          });
        }
      }
    });

    // Check for duplicate binding IDs
    const idCounts = new Map<string, number>();
    bindings.forEach(b => {
      idCounts.set(b.id, (idCounts.get(b.id) || 0) + 1);
    });
    
    idCounts.forEach((count, id) => {
      if (count > 1) {
        this.issues.push({
          line: 1,
          severity: 'warning',
          message: `Duplicate widget binding ID: "${id}" used ${count} times`,
          code: 'W008'
        });
      }
    });
  }

  private checkCommonMistakes(): void {
    this.lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // Assignment in condition
      if (/if\s*\(\s*\w+\s*=\s*[^=]/.test(line) && !/==/.test(line)) {
        this.issues.push({
          line: lineNum,
          severity: 'warning',
          message: 'Possible assignment in condition - did you mean == instead of =?',
          code: 'W009'
        });
      }

      // Division by zero potential
      if (/\/\s*0[^.]/.test(line)) {
        this.issues.push({
          line: lineNum,
          severity: 'error',
          message: 'Division by zero',
          code: 'E009'
        });
      }

      // Empty if/while body
      if (/^\s*(if|while|for)\s*\([^)]+\)\s*;\s*$/.test(line)) {
        this.issues.push({
          line: lineNum,
          severity: 'warning',
          message: 'Empty statement body - semicolon immediately after condition',
          code: 'W010'
        });
      }

      // Comparing floating point with ==
      if (/==\s*\d+\.\d+/.test(line) || /\d+\.\d+\s*==/.test(line)) {
        this.issues.push({
          line: lineNum,
          severity: 'info',
          message: 'Comparing floating point with == may be unreliable - consider using a tolerance',
          code: 'I006'
        });
      }
    });
  }

  private checkPythonIndentation(): void {
    let expectedIndent = 0;
    const indentStack: number[] = [0];

    this.lines.forEach((line, idx) => {
      if (!line.trim() || line.trim().startsWith('#')) return;

      const currentIndent = line.match(/^(\s*)/)?.[1].length || 0;
      const trimmed = line.trim();

      // Check for mixed tabs and spaces
      if (/^\t+ /.test(line) || /^ +\t/.test(line)) {
        this.issues.push({
          line: idx + 1,
          severity: 'error',
          message: 'Mixed tabs and spaces in indentation',
          code: 'E010'
        });
      }

      // Check for lines that should increase indent
      if (trimmed.endsWith(':')) {
        indentStack.push(currentIndent);
      }
    });
  }

  private checkPythonSyntax(): void {
    this.lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      // Check for missing colons
      if (/^(if|elif|else|for|while|def|class|try|except|finally|with)\s/.test(trimmed) && !trimmed.endsWith(':')) {
        this.issues.push({
          line: idx + 1,
          severity: 'error',
          message: 'Missing colon at end of statement',
          code: 'E011'
        });
      }
    });
  }

  private extractPythonFunctions(): void {
    this.lines.forEach((line, idx) => {
      const match = line.match(/^\s*def\s+(\w+)\s*\(([^)]*)\)/);
      if (match) {
        this.functions.push({
          name: match[1],
          line: idx + 1,
          returnType: 'any',
          params: match[2].split(',').map(p => p.trim()).filter(Boolean)
        });
      }
    });
  }

  private extractPythonVariables(): void {
    this.lines.forEach((line, idx) => {
      const match = line.match(/^\s*(\w+)\s*=\s*(.+)/);
      if (match && !line.trim().startsWith('def ') && !line.trim().startsWith('#')) {
        this.variables.push({
          name: match[1],
          line: idx + 1,
          type: this.inferPythonType(match[2]),
          isGlobal: !line.startsWith(' ') && !line.startsWith('\t')
        });
      }
    });
  }

  private checkPythonImports(): void {
    this.lines.forEach((line, idx) => {
      if (/^(import|from)\s/.test(line.trim())) {
        const importMatch = line.match(/(?:import|from)\s+(\w+)/);
        if (importMatch) {
          this.includes.push(importMatch[1]);
        }
      }
    });
  }

  private inferPythonType(value: string): string {
    value = value.trim();
    if (/^["']/.test(value)) return 'str';
    if (/^\d+$/.test(value)) return 'int';
    if (/^\d+\.\d+$/.test(value)) return 'float';
    if (/^(True|False)$/.test(value)) return 'bool';
    if (/^\[/.test(value)) return 'list';
    if (/^\{/.test(value)) return 'dict';
    return 'any';
  }

  private removeCommentsAndStrings(line: string): string {
    // Remove string literals
    let result = line.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
    // Remove single-line comments
    const commentIdx = result.indexOf('//');
    if (commentIdx !== -1) {
      result = result.substring(0, commentIdx);
    }
    return result;
  }

  private estimateSize(): number {
    // Rough estimation of compiled size
    let size = 0;
    size += this.code.length * 0.3; // Base code
    size += this.functions.length * 50; // Function overhead
    size += this.variables.filter(v => v.isGlobal).length * 4; // Global variables
    size += this.includes.length * 200; // Library overhead
    return Math.floor(size);
  }

  private calculateComplexity(): 'low' | 'medium' | 'high' {
    let score = 0;
    score += this.functions.length * 2;
    score += this.variables.length;
    score += (this.code.match(/if|for|while|switch/g) || []).length * 3;
    score += (this.code.match(/&&|\|\|/g) || []).length * 2;
    
    if (score < 20) return 'low';
    if (score < 50) return 'medium';
    return 'high';
  }
}

export function analyzeCode(code: string, language: 'arduino' | 'micropython' = 'arduino'): AnalysisResult {
  const analyzer = new CodeAnalyzer(code, language);
  return analyzer.analyze();
}
