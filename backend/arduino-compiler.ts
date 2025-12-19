/**
 * Arduino Compiler Service
 * Uses Arduino CLI to compile and upload sketches from the server
 */

import { exec, spawn } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";

const execAsync = promisify(exec);

export interface CompileResult {
  success: boolean;
  output: string;
  errors: string[];
  warnings: string[];
  binarySize?: number;
}

export interface UploadResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface BoardInfo {
  fqbn: string;
  name: string;
  port?: string;
}

// Board FQBN mappings
const BOARD_FQBNS: Record<string, string> = {
  "arduino_uno": "arduino:avr:uno",
  "arduino_nano": "arduino:avr:nano",
  "arduino_mega": "arduino:avr:mega",
  "esp32": "esp32:esp32:esp32",
  "esp8266": "esp8266:esp8266:nodemcu",
  "raspberry_pi_pico": "rp2040:rp2040:rpipico",
};

class ArduinoCompiler {
  private arduinoCliPath: string;
  private tempDir: string;

  constructor() {
    // Try to find arduino-cli in PATH, or use a specific path
    this.arduinoCliPath = process.env.ARDUINO_CLI_PATH || "arduino-cli";
    this.tempDir = join(tmpdir(), "ucodelab-builds");
  }

  /**
   * Check if Arduino CLI is installed and accessible
   */
  async checkInstallation(): Promise<{ installed: boolean; version?: string; error?: string }> {
    try {
      const { stdout } = await execAsync(`${this.arduinoCliPath} version`);
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
      return {
        installed: true,
        version: versionMatch ? versionMatch[1] : "unknown",
      };
    } catch (error: any) {
      return {
        installed: false,
        error: "Arduino CLI not found. Install it from https://arduino.github.io/arduino-cli/",
      };
    }
  }

  /**
   * List connected boards
   */
  async listBoards(): Promise<BoardInfo[]> {
    try {
      const { stdout } = await execAsync(`${this.arduinoCliPath} board list --format json`);
      const data = JSON.parse(stdout);
      
      return data.detected_ports?.map((port: any) => ({
        fqbn: port.matching_boards?.[0]?.fqbn || "",
        name: port.matching_boards?.[0]?.name || "Unknown Board",
        port: port.port?.address,
      })).filter((b: BoardInfo) => b.port) || [];
    } catch (error) {
      console.error("Error listing boards:", error);
      return [];
    }
  }

  /**
   * Compile Arduino sketch
   */
  async compile(
    code: string,
    boardType: string = "arduino_uno",
    fileName: string = "sketch.ino"
  ): Promise<CompileResult> {
    const buildId = randomUUID();
    const buildDir = join(this.tempDir, buildId);
    const sketchDir = join(buildDir, "sketch");
    const sketchFile = join(sketchDir, fileName);
    const outputDir = join(buildDir, "output");

    try {
      // Create directories
      await mkdir(sketchDir, { recursive: true });
      await mkdir(outputDir, { recursive: true });

      // Write sketch file
      await writeFile(sketchFile, code, "utf-8");

      // Get FQBN for board
      const fqbn = BOARD_FQBNS[boardType] || BOARD_FQBNS["arduino_uno"];

      // Compile
      const compileCmd = `${this.arduinoCliPath} compile --fqbn ${fqbn} --output-dir "${outputDir}" "${sketchDir}"`;
      
      console.log(`[arduino] Compiling with: ${compileCmd}`);
      
      const { stdout, stderr } = await execAsync(compileCmd, {
        timeout: 120000, // 2 minute timeout
      });

      const output = stdout + stderr;
      const warnings = this.extractWarnings(output);
      
      // Get binary size
      const sizeMatch = output.match(/Sketch uses (\d+) bytes/);
      const binarySize = sizeMatch ? parseInt(sizeMatch[1]) : undefined;

      return {
        success: true,
        output,
        errors: [],
        warnings,
        binarySize,
      };
    } catch (error: any) {
      const errorOutput = error.stderr || error.message || "Unknown compilation error";
      return {
        success: false,
        output: errorOutput,
        errors: this.extractErrors(errorOutput),
        warnings: this.extractWarnings(errorOutput),
      };
    } finally {
      // Cleanup temp directory
      try {
        await rm(buildDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Compile and upload to connected board
   */
  async compileAndUpload(
    code: string,
    port: string,
    boardType: string = "arduino_uno",
    fileName: string = "sketch.ino",
    onProgress?: (stage: string, progress: number) => void
  ): Promise<UploadResult> {
    const buildId = randomUUID();
    const buildDir = join(this.tempDir, buildId);
    const sketchDir = join(buildDir, "sketch");
    const sketchFile = join(sketchDir, fileName);

    try {
      // Create directories
      await mkdir(sketchDir, { recursive: true });

      // Write sketch file
      await writeFile(sketchFile, code, "utf-8");

      // Get FQBN for board
      const fqbn = BOARD_FQBNS[boardType] || BOARD_FQBNS["arduino_uno"];

      onProgress?.("compiling", 10);

      // Compile and upload in one command
      const uploadCmd = `${this.arduinoCliPath} compile --fqbn ${fqbn} -u -p ${port} "${sketchDir}"`;
      
      console.log(`[arduino] Uploading with: ${uploadCmd}`);

      return new Promise((resolve) => {
        const process = spawn(this.arduinoCliPath, [
          "compile",
          "--fqbn", fqbn,
          "-u",
          "-p", port,
          sketchDir,
        ], {
          timeout: 180000, // 3 minute timeout
        });

        let output = "";
        let errorOutput = "";

        process.stdout?.on("data", (data) => {
          const text = data.toString();
          output += text;
          
          // Parse progress from output
          if (text.includes("Compiling")) {
            onProgress?.("compiling", 30);
          } else if (text.includes("Linking")) {
            onProgress?.("linking", 50);
          } else if (text.includes("Uploading")) {
            onProgress?.("uploading", 70);
          } else if (text.includes("avrdude")) {
            onProgress?.("flashing", 85);
          }
        });

        process.stderr?.on("data", (data) => {
          errorOutput += data.toString();
        });

        process.on("close", (code) => {
          if (code === 0) {
            onProgress?.("complete", 100);
            resolve({
              success: true,
              output: output + errorOutput,
            });
          } else {
            resolve({
              success: false,
              output: output + errorOutput,
              error: this.extractErrors(errorOutput).join("\n") || "Upload failed",
            });
          }
        });

        process.on("error", (err) => {
          resolve({
            success: false,
            output: "",
            error: err.message,
          });
        });
      });
    } catch (error: any) {
      return {
        success: false,
        output: "",
        error: error.message || "Unknown error",
      };
    } finally {
      // Cleanup temp directory
      try {
        await rm(buildDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  private extractErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split("\n");
    
    for (const line of lines) {
      if (line.includes("error:") || line.includes("Error:")) {
        errors.push(line.trim());
      }
    }
    
    return errors;
  }

  private extractWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split("\n");
    
    for (const line of lines) {
      if (line.includes("warning:") || line.includes("Warning:")) {
        warnings.push(line.trim());
      }
    }
    
    return warnings;
  }
}

export const arduinoCompiler = new ArduinoCompiler();
