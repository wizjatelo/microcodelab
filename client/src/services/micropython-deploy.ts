/**
 * MicroPython Deployment Service
 * Uploads Python files (source or compiled .mpy) to MicroPython devices via WebSerial
 */

import { webSerial } from "./web-serial";
import { apiRequest } from "@/lib/queryClient";

export interface MicroPythonDeployResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface MpyCompileResult {
  success: boolean;
  binaryBase64?: string;
  fileName: string;
  originalSize: number;
  compiledSize?: number;
  error?: string;
}

class MicroPythonDeployService {
  private readonly CTRL_A = "\x01"; // Raw REPL mode
  private readonly CTRL_B = "\x02"; // Normal REPL mode
  private readonly CTRL_C = "\x03"; // Interrupt
  private readonly CTRL_D = "\x04"; // Soft reset / End of raw paste
  private readonly CTRL_E = "\x05"; // Paste mode

  /**
   * Check if mpy-cross compiler is available on server
   */
  async checkCompilerStatus(): Promise<{ installed: boolean; version?: string }> {
    try {
      return await apiRequest("/api/micropython/status", { method: "GET" });
    } catch {
      return { installed: false };
    }
  }

  /**
   * Compile Python to .mpy bytecode on server
   */
  async compileToBytecode(code: string, fileName: string): Promise<MpyCompileResult> {
    return apiRequest("/api/micropython/compile", {
      method: "POST",
      body: { code, fileName },
    });
  }

  /**
   * Upload a Python source file (.py) to the device
   */
  async uploadSourceFile(
    filename: string,
    content: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<MicroPythonDeployResult> {
    if (!webSerial.getConnectionStatus()) {
      return { success: false, message: "Not connected", error: "Connect to device first" };
    }

    try {
      onProgress?.("Preparing device...", 10);
      await this.interruptAndEnterRawRepl();

      onProgress?.("Writing file...", 40);
      const escapedContent = this.escapeString(content);
      const writeCommand = `f=open('${filename}','w')\nf.write('${escapedContent}')\nf.close()\nprint('OK')`;
      
      await webSerial.send(writeCommand);
      await this.delay(100);
      await webSerial.send(this.CTRL_D);
      await this.delay(500);

      onProgress?.("Verifying...", 80);
      await webSerial.send(this.CTRL_B);

      onProgress?.("Complete!", 100);
      return { success: true, message: `Uploaded ${filename} (${content.length} bytes)` };
    } catch (error: any) {
      return { success: false, message: "Upload failed", error: error.message };
    }
  }

  /**
   * Upload a compiled .mpy binary file to the device
   */
  async uploadBinaryFile(
    filename: string,
    binaryBase64: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<MicroPythonDeployResult> {
    if (!webSerial.getConnectionStatus()) {
      return { success: false, message: "Not connected", error: "Connect to device first" };
    }

    try {
      onProgress?.("Preparing device...", 10);
      await this.interruptAndEnterRawRepl();

      onProgress?.("Writing binary...", 30);
      
      // Decode base64 and write as binary
      const binaryData = atob(binaryBase64);
      const byteArray = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        byteArray[i] = binaryData.charCodeAt(i);
      }

      // Write binary file using ubinascii
      const hexString = Array.from(byteArray).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Split into chunks for large files
      const chunkSize = 512;
      const chunks = [];
      for (let i = 0; i < hexString.length; i += chunkSize) {
        chunks.push(hexString.slice(i, i + chunkSize));
      }

      // Create file and write chunks
      await webSerial.send(`import ubinascii\nf=open('${filename}','wb')`);
      await this.delay(100);
      await webSerial.send(this.CTRL_D);
      await this.delay(200);

      for (let i = 0; i < chunks.length; i++) {
        onProgress?.(`Writing chunk ${i + 1}/${chunks.length}...`, 30 + (50 * (i + 1) / chunks.length));
        await webSerial.send(this.CTRL_A);
        await this.delay(50);
        await webSerial.send(`f.write(ubinascii.unhexlify('${chunks[i]}'))`);
        await this.delay(50);
        await webSerial.send(this.CTRL_D);
        await this.delay(100);
      }

      await webSerial.send(this.CTRL_A);
      await this.delay(50);
      await webSerial.send(`f.close()\nprint('OK')`);
      await webSerial.send(this.CTRL_D);
      await this.delay(200);

      onProgress?.("Verifying...", 90);
      await webSerial.send(this.CTRL_B);

      onProgress?.("Complete!", 100);
      return { success: true, message: `Uploaded ${filename} (${byteArray.length} bytes compiled)` };
    } catch (error: any) {
      return { success: false, message: "Binary upload failed", error: error.message };
    }
  }

  /**
   * Compile and upload as .mpy binary
   */
  async compileAndUpload(
    filename: string,
    code: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<MicroPythonDeployResult> {
    try {
      onProgress?.("Compiling to bytecode...", 10);
      
      const compileResult = await this.compileToBytecode(code, filename);
      
      if (!compileResult.success || !compileResult.binaryBase64) {
        return {
          success: false,
          message: "Compilation failed",
          error: compileResult.error || "No binary generated",
        };
      }

      onProgress?.("Compiled! Uploading binary...", 30);
      
      return await this.uploadBinaryFile(
        compileResult.fileName,
        compileResult.binaryBase64,
        (stage, progress) => {
          onProgress?.(stage, 30 + progress * 0.7);
        }
      );
    } catch (error: any) {
      return { success: false, message: "Compile and upload failed", error: error.message };
    }
  }

  /**
   * Upload and run (source or binary based on preference)
   */
  async uploadAndRun(
    filename: string,
    content: string,
    useBinary: boolean = false,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<MicroPythonDeployResult> {
    let uploadResult: MicroPythonDeployResult;

    if (useBinary) {
      uploadResult = await this.compileAndUpload(filename, content, (stage, progress) => {
        onProgress?.(stage, progress * 0.8);
      });
    } else {
      uploadResult = await this.uploadSourceFile(filename, content, (stage, progress) => {
        onProgress?.(stage, progress * 0.8);
      });
    }

    if (!uploadResult.success) {
      return uploadResult;
    }

    try {
      onProgress?.("Running script...", 85);
      
      // Soft reset to run main.py, or exec for other files
      if (filename === "main.py" || filename === "main.mpy") {
        await webSerial.send(this.CTRL_D);
      } else {
        // For non-main files, execute directly
        const pyFilename = filename.replace(".mpy", ".py");
        await webSerial.send(`exec(open('${pyFilename}').read())\r\n`);
      }

      onProgress?.("Running!", 100);
      return { success: true, message: `Uploaded and running ${filename}` };
    } catch (error: any) {
      return { success: false, message: "Failed to run", error: error.message };
    }
  }

  /**
   * Execute code directly in REPL
   */
  async executeCode(code: string): Promise<MicroPythonDeployResult> {
    if (!webSerial.getConnectionStatus()) {
      return { success: false, message: "Not connected", error: "Connect first" };
    }

    try {
      await webSerial.send(this.CTRL_C);
      await this.delay(100);
      await webSerial.send(this.CTRL_E);
      await this.delay(100);
      await webSerial.send(code);
      await this.delay(100);
      await webSerial.send(this.CTRL_D);
      return { success: true, message: "Code executed" };
    } catch (error: any) {
      return { success: false, message: "Execution failed", error: error.message };
    }
  }

  /**
   * Soft reset the device
   */
  async softReset(): Promise<void> {
    await webSerial.send(this.CTRL_D);
  }

  private async interruptAndEnterRawRepl(): Promise<void> {
    await webSerial.send(this.CTRL_C);
    await this.delay(100);
    await webSerial.send(this.CTRL_C);
    await this.delay(100);
    await webSerial.send(this.CTRL_A);
    await this.delay(200);
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const micropythonDeploy = new MicroPythonDeployService();
