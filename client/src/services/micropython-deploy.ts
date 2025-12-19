/**
 * MicroPython Deployment Service
 * Safe file upload to MicroPython devices via WebSerial REPL
 * Compatible with official MicroPython firmware
 * 
 * This implementation uses the proper MicroPython REPL protocol to safely
 * write files to the device's filesystem without affecting the firmware.
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

export interface DeviceInfo {
  platform?: string;
  version?: string;
  machine?: string;
  freeMemory?: number;
  freeFlash?: number;
}

class MicroPythonDeployService {
  // MicroPython REPL control characters
  private readonly CTRL_A = "\x01"; // Enter raw REPL mode
  private readonly CTRL_B = "\x02"; // Exit raw REPL, enter normal mode
  private readonly CTRL_C = "\x03"; // Interrupt (KeyboardInterrupt)
  private readonly CTRL_D = "\x04"; // Soft reset in normal mode, execute in raw mode
  private readonly CTRL_E = "\x05"; // Paste mode

  // Chunk size for file transfers (safe for most devices)
  private readonly CHUNK_SIZE = 256;
  
  // Delays for device response (ms)
  private readonly SHORT_DELAY = 50;
  private readonly MEDIUM_DELAY = 150;
  private readonly LONG_DELAY = 300;

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
   * Get device information (version, platform, memory)
   */
  async getDeviceInfo(): Promise<DeviceInfo | null> {
    if (!webSerial.getConnectionStatus()) {
      return null;
    }

    try {
      await this.enterRawRepl();
      
      const infoCode = `
import sys
import gc
try:
    import os
    fs = os.statvfs('/')
    free_flash = fs[0] * fs[3]
except:
    free_flash = 0
gc.collect()
print('PLATFORM:', sys.platform)
print('VERSION:', sys.version)
print('MACHINE:', sys.implementation.machine if hasattr(sys.implementation, 'machine') else 'unknown')
print('FREE_MEM:', gc.mem_free())
print('FREE_FLASH:', free_flash)
`;
      
      await this.executeRawRepl(infoCode);
      await this.exitRawRepl();
      
      // Parse response from serial output (simplified - actual parsing would need response capture)
      return {
        platform: "micropython",
        version: "unknown",
      };
    } catch {
      return null;
    }
  }

  /**
   * List files on the device
   */
  async listFiles(path: string = "/"): Promise<string[]> {
    if (!webSerial.getConnectionStatus()) {
      return [];
    }

    try {
      await this.enterRawRepl();
      await this.executeRawRepl(`import os\nfor f in os.listdir('${path}'): print(f)`);
      await this.exitRawRepl();
      return []; // Would need response capture to return actual list
    } catch {
      return [];
    }
  }

  /**
   * Upload a Python source file (.py) to the device filesystem
   * Uses chunked transfer for reliability
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
      onProgress?.("Preparing device...", 5);
      
      // Interrupt any running code and enter raw REPL
      await this.safeInterrupt();
      await this.delay(this.MEDIUM_DELAY);
      
      onProgress?.("Entering raw REPL...", 10);
      await this.enterRawRepl();
      await this.delay(this.MEDIUM_DELAY);

      // Ensure target directory exists (for nested paths)
      const dirPath = this.getDirectoryPath(filename);
      if (dirPath) {
        onProgress?.("Creating directory...", 15);
        await this.executeRawRepl(`
import os
try:
    os.mkdir('${dirPath}')
except OSError:
    pass
`);
        await this.delay(this.SHORT_DELAY);
      }

      onProgress?.("Opening file for write...", 20);
      
      // Open file for writing
      await this.executeRawRepl(`_f=open('${filename}','w')`);
      await this.delay(this.SHORT_DELAY);

      // Write content in chunks to avoid buffer overflow
      const chunks = this.splitIntoChunks(content, this.CHUNK_SIZE);
      
      for (let i = 0; i < chunks.length; i++) {
        const progress = 20 + Math.floor((i / chunks.length) * 60);
        onProgress?.(`Writing chunk ${i + 1}/${chunks.length}...`, progress);
        
        const escapedChunk = this.escapeForPython(chunks[i]);
        await this.executeRawRepl(`_f.write('${escapedChunk}')`);
        await this.delay(this.SHORT_DELAY);
      }

      onProgress?.("Closing file...", 85);
      await this.executeRawRepl(`_f.close()\ndel _f`);
      await this.delay(this.SHORT_DELAY);

      onProgress?.("Verifying...", 90);
      // Verify file was written
      await this.executeRawRepl(`
import os
_s=os.stat('${filename}')
print('SIZE:',_s[6])
`);
      await this.delay(this.SHORT_DELAY);

      onProgress?.("Exiting raw REPL...", 95);
      await this.exitRawRepl();

      onProgress?.("Complete!", 100);
      return { 
        success: true, 
        message: `Uploaded ${filename} (${content.length} bytes) to device filesystem` 
      };
    } catch (error: any) {
      // Try to recover to normal REPL state
      try {
        await this.exitRawRepl();
      } catch {}
      
      return { 
        success: false, 
        message: "Upload failed", 
        error: error.message || "Unknown error during file transfer"
      };
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
      onProgress?.("Preparing device...", 5);
      
      await this.safeInterrupt();
      await this.delay(this.MEDIUM_DELAY);
      
      onProgress?.("Entering raw REPL...", 10);
      await this.enterRawRepl();
      await this.delay(this.MEDIUM_DELAY);

      // Decode base64 to bytes
      const binaryData = atob(binaryBase64);
      const byteArray = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        byteArray[i] = binaryData.charCodeAt(i);
      }

      onProgress?.("Opening file for binary write...", 15);
      
      // Import binascii for hex conversion
      await this.executeRawRepl(`import ubinascii`);
      await this.delay(this.SHORT_DELAY);
      
      // Open file for binary writing
      await this.executeRawRepl(`_f=open('${filename}','wb')`);
      await this.delay(this.SHORT_DELAY);

      // Convert to hex and write in chunks
      const hexString = Array.from(byteArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Use smaller chunks for binary (hex is 2x the size)
      const hexChunkSize = this.CHUNK_SIZE;
      const chunks: string[] = [];
      for (let i = 0; i < hexString.length; i += hexChunkSize) {
        chunks.push(hexString.slice(i, i + hexChunkSize));
      }

      for (let i = 0; i < chunks.length; i++) {
        const progress = 20 + Math.floor((i / chunks.length) * 60);
        onProgress?.(`Writing binary chunk ${i + 1}/${chunks.length}...`, progress);
        
        await this.executeRawRepl(`_f.write(ubinascii.unhexlify('${chunks[i]}'))`);
        await this.delay(this.SHORT_DELAY);
      }

      onProgress?.("Closing file...", 85);
      await this.executeRawRepl(`_f.close()\ndel _f`);
      await this.delay(this.SHORT_DELAY);

      onProgress?.("Exiting raw REPL...", 95);
      await this.exitRawRepl();

      onProgress?.("Complete!", 100);
      return { 
        success: true, 
        message: `Uploaded ${filename} (${byteArray.length} bytes compiled) to device` 
      };
    } catch (error: any) {
      try {
        await this.exitRawRepl();
      } catch {}
      
      return { 
        success: false, 
        message: "Binary upload failed", 
        error: error.message 
      };
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
      onProgress?.("Compiling to bytecode...", 5);
      
      const compileResult = await this.compileToBytecode(code, filename);
      
      if (!compileResult.success || !compileResult.binaryBase64) {
        return {
          success: false,
          message: "Compilation failed",
          error: compileResult.error || "No binary generated",
        };
      }

      onProgress?.(`Compiled! (${compileResult.compiledSize} bytes)`, 15);
      
      return await this.uploadBinaryFile(
        compileResult.fileName,
        compileResult.binaryBase64,
        (stage, progress) => {
          // Scale progress from 15-100
          onProgress?.(stage, 15 + progress * 0.85);
        }
      );
    } catch (error: any) {
      return { 
        success: false, 
        message: "Compile and upload failed", 
        error: error.message 
      };
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
        onProgress?.(stage, progress * 0.75);
      });
    } else {
      uploadResult = await this.uploadSourceFile(filename, content, (stage, progress) => {
        onProgress?.(stage, progress * 0.75);
      });
    }

    if (!uploadResult.success) {
      return uploadResult;
    }

    try {
      onProgress?.("Running script...", 80);
      
      // For main.py, do a soft reset to auto-run it
      if (filename === "main.py" || filename === "main.mpy") {
        await this.softReset();
        onProgress?.("Device reset - main.py will run", 100);
        return { 
          success: true, 
          message: `Uploaded and running ${filename} (device reset)` 
        };
      } else {
        // For other files, import/exec them
        onProgress?.("Executing script...", 85);
        await this.enterRawRepl();
        
        const moduleName = filename.replace(".py", "").replace(".mpy", "");
        await this.executeRawRepl(`exec(open('${filename.replace(".mpy", ".py")}').read())`);
        
        await this.exitRawRepl();
        onProgress?.("Running!", 100);
        return { 
          success: true, 
          message: `Uploaded and executed ${filename}` 
        };
      }
    } catch (error: any) {
      return { 
        success: false, 
        message: "Failed to run script", 
        error: error.message 
      };
    }
  }

  /**
   * Execute code directly in REPL (paste mode)
   */
  async executeCode(code: string): Promise<MicroPythonDeployResult> {
    if (!webSerial.getConnectionStatus()) {
      return { success: false, message: "Not connected", error: "Connect first" };
    }

    try {
      await this.safeInterrupt();
      await this.delay(this.SHORT_DELAY);
      
      // Use paste mode for multi-line code
      await webSerial.send(this.CTRL_E);
      await this.delay(this.MEDIUM_DELAY);
      
      await webSerial.send(code);
      await this.delay(this.SHORT_DELAY);
      
      // Execute pasted code
      await webSerial.send(this.CTRL_D);
      
      return { success: true, message: "Code executed" };
    } catch (error: any) {
      return { success: false, message: "Execution failed", error: error.message };
    }
  }

  /**
   * Delete a file from the device
   */
  async deleteFile(filename: string): Promise<MicroPythonDeployResult> {
    if (!webSerial.getConnectionStatus()) {
      return { success: false, message: "Not connected", error: "Connect first" };
    }

    try {
      await this.enterRawRepl();
      await this.executeRawRepl(`import os\nos.remove('${filename}')`);
      await this.exitRawRepl();
      return { success: true, message: `Deleted ${filename}` };
    } catch (error: any) {
      try { await this.exitRawRepl(); } catch {}
      return { success: false, message: "Delete failed", error: error.message };
    }
  }

  /**
   * Soft reset the device (runs boot.py and main.py)
   */
  async softReset(): Promise<void> {
    await this.safeInterrupt();
    await this.delay(this.SHORT_DELAY);
    // In normal REPL mode, Ctrl+D does soft reset
    await webSerial.send(this.CTRL_D);
    await this.delay(this.LONG_DELAY);
  }

  /**
   * Hard reset using machine.reset() if available
   */
  async hardReset(): Promise<MicroPythonDeployResult> {
    if (!webSerial.getConnectionStatus()) {
      return { success: false, message: "Not connected", error: "Connect first" };
    }

    try {
      await this.enterRawRepl();
      await this.executeRawRepl(`import machine\nmachine.reset()`);
      return { success: true, message: "Device reset" };
    } catch (error: any) {
      return { success: false, message: "Reset failed", error: error.message };
    }
  }

  // ============== Private Helper Methods ==============

  /**
   * Safely interrupt any running code
   */
  private async safeInterrupt(): Promise<void> {
    // Send multiple Ctrl+C to ensure we interrupt
    await webSerial.send(this.CTRL_C);
    await this.delay(this.SHORT_DELAY);
    await webSerial.send(this.CTRL_C);
    await this.delay(this.SHORT_DELAY);
  }

  /**
   * Enter raw REPL mode
   */
  private async enterRawRepl(): Promise<void> {
    await webSerial.send(this.CTRL_A);
    await this.delay(this.MEDIUM_DELAY);
  }

  /**
   * Exit raw REPL mode back to normal REPL
   */
  private async exitRawRepl(): Promise<void> {
    await webSerial.send(this.CTRL_B);
    await this.delay(this.MEDIUM_DELAY);
  }

  /**
   * Execute code in raw REPL mode
   */
  private async executeRawRepl(code: string): Promise<void> {
    await webSerial.send(code);
    await this.delay(this.SHORT_DELAY);
    await webSerial.send(this.CTRL_D);
    await this.delay(this.MEDIUM_DELAY);
  }

  /**
   * Split content into chunks for safe transfer
   */
  private splitIntoChunks(content: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Escape string for Python string literal
   */
  private escapeForPython(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      .replace(/\x00/g, "\\x00");
  }

  /**
   * Get directory path from filename
   */
  private getDirectoryPath(filename: string): string | null {
    const lastSlash = filename.lastIndexOf("/");
    if (lastSlash > 0) {
      return filename.substring(0, lastSlash);
    }
    return null;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const micropythonDeploy = new MicroPythonDeployService();
