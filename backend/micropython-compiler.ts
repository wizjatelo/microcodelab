/**
 * MicroPython Compiler Service
 * Compiles .py files to .mpy bytecode using mpy-cross
 */

import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";

const execAsync = promisify(exec);

export interface MpyCompileResult {
  success: boolean;
  binary?: Buffer;
  binaryBase64?: string;
  fileName: string;
  originalSize: number;
  compiledSize?: number;
  error?: string;
}

class MicroPythonCompiler {
  private mpyCrossPath: string;
  private tempDir: string;

  constructor() {
    // Try to find mpy-cross in PATH, or use a specific path
    this.mpyCrossPath = process.env.MPY_CROSS_PATH || "mpy-cross";
    this.tempDir = join(tmpdir(), "ucodelab-mpy");
  }

  /**
   * Check if mpy-cross is installed
   */
  async checkInstallation(): Promise<{ installed: boolean; version?: string; error?: string }> {
    try {
      const { stdout } = await execAsync(`${this.mpyCrossPath} --version`);
      const versionMatch = stdout.match(/(\d+\.\d+)/);
      return {
        installed: true,
        version: versionMatch ? versionMatch[1] : "unknown",
      };
    } catch (error: any) {
      return {
        installed: false,
        error: "mpy-cross not found. Install with: pip install mpy-cross",
      };
    }
  }

  /**
   * Compile Python code to .mpy bytecode
   */
  async compile(
    code: string,
    fileName: string = "main.py"
  ): Promise<MpyCompileResult> {
    const buildId = randomUUID();
    const buildDir = join(this.tempDir, buildId);
    const pyFile = join(buildDir, fileName);
    const mpyFileName = fileName.replace(".py", ".mpy");
    const mpyFile = join(buildDir, mpyFileName);

    try {
      // Create build directory
      await mkdir(buildDir, { recursive: true });

      // Write Python source file
      await writeFile(pyFile, code, "utf-8");

      // Compile with mpy-cross
      const compileCmd = `${this.mpyCrossPath} -o "${mpyFile}" "${pyFile}"`;
      console.log(`[mpy-cross] Compiling: ${compileCmd}`);

      await execAsync(compileCmd, { timeout: 30000 });

      // Read compiled binary
      const binary = await readFile(mpyFile);

      return {
        success: true,
        binary,
        binaryBase64: binary.toString("base64"),
        fileName: mpyFileName,
        originalSize: code.length,
        compiledSize: binary.length,
      };
    } catch (error: any) {
      console.error("[mpy-cross] Compilation error:", error);
      return {
        success: false,
        fileName: mpyFileName,
        originalSize: code.length,
        error: error.stderr || error.message || "Compilation failed",
      };
    } finally {
      // Cleanup
      try {
        await rm(buildDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Validate Python syntax without compiling
   */
  async validateSyntax(code: string): Promise<{ valid: boolean; error?: string; line?: number }> {
    const buildId = randomUUID();
    const buildDir = join(this.tempDir, buildId);
    const pyFile = join(buildDir, "check.py");

    try {
      await mkdir(buildDir, { recursive: true });
      await writeFile(pyFile, code, "utf-8");

      // Use Python to check syntax
      const checkCmd = `python -m py_compile "${pyFile}"`;
      await execAsync(checkCmd, { timeout: 10000 });

      return { valid: true };
    } catch (error: any) {
      const errorMsg = error.stderr || error.message || "";
      const lineMatch = errorMsg.match(/line (\d+)/);
      return {
        valid: false,
        error: errorMsg,
        line: lineMatch ? parseInt(lineMatch[1]) : undefined,
      };
    } finally {
      try {
        await rm(buildDir, { recursive: true, force: true });
      } catch {
        // Ignore
      }
    }
  }
}

export const micropythonCompiler = new MicroPythonCompiler();
