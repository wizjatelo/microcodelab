/**
 * Web Serial API Service for Arduino/Microcontroller Communication
 * Enables USB serial connection from browser to Arduino Uno
 */

// Web Serial API type declarations
declare global {
  interface Navigator {
    serial: Serial;
  }
  
  interface Serial {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
    getPorts(): Promise<SerialPort[]>;
  }
  
  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[];
  }
  
  interface SerialPortFilter {
    usbVendorId?: number;
    usbProductId?: number;
  }
  
  interface SerialPort {
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
    open(options: SerialOptions): Promise<void>;
    close(): Promise<void>;
    getInfo(): SerialPortInfo;
  }
  
  interface SerialOptions {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'even' | 'odd';
    bufferSize?: number;
    flowControl?: 'none' | 'hardware';
  }
  
  interface SerialPortInfo {
    usbVendorId?: number;
    usbProductId?: number;
  }
}

export interface SerialMessage {
  type: 'data' | 'error' | 'connected' | 'disconnected' | 'tx' | 'rx';
  data?: string;
  timestamp: Date;
}

export interface SerialLogEntry {
  id: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  timestamp: string;
}

type MessageCallback = (message: SerialMessage) => void;
type LogCallback = (log: SerialLogEntry) => void;

class WebSerialService {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private writer: WritableStreamDefaultWriter<string> | null = null;
  private isConnected = false;
  private listeners: Set<MessageCallback> = new Set();
  private logListeners: Set<LogCallback> = new Set();
  private readLoopRunning = false;
  private logIdCounter = 0;

  /**
   * Check if Web Serial API is supported
   */
  isSupported(): boolean {
    return 'serial' in navigator;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Subscribe to log entries for the console
   */
  subscribeToLogs(callback: LogCallback): () => void {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  private log(level: SerialLogEntry['level'], source: string, message: string): void {
    const entry: SerialLogEntry = {
      id: `serial-${++this.logIdCounter}-${Date.now()}`,
      level,
      source,
      message,
      timestamp: new Date().toISOString(),
    };
    this.logListeners.forEach(cb => cb(entry));
  }

  /**
   * Request and connect to a serial port
   */
  async connect(baudRate: number = 9600): Promise<boolean> {
    if (!this.isSupported()) {
      this.log('error', 'serial', 'Web Serial API not supported. Use Chrome or Edge.');
      this.notify({ type: 'error', data: 'Web Serial API not supported. Use Chrome or Edge.', timestamp: new Date() });
      return false;
    }

    this.log('info', 'serial', `Requesting serial port connection at ${baudRate} baud...`);

    try {
      // Request port from user
      this.port = await navigator.serial.requestPort();
      this.log('debug', 'serial', 'Port selected by user');
      
      // Open the port with retry logic
      try {
        await this.port.open({ baudRate });
      } catch (openError: any) {
        // Provide helpful error messages
        if (openError.message?.includes("Failed to open serial port")) {
          this.log('error', 'serial', '⚠️ Port is busy! Common causes:');
          this.log('warning', 'serial', '  1. Arduino IDE Serial Monitor is open - close it');
          this.log('warning', 'serial', '  2. Another program is using the port');
          this.log('warning', 'serial', '  3. Try unplugging and replugging the USB cable');
          this.log('warning', 'serial', '  4. Check Device Manager for the correct COM port');
          throw new Error('Port is busy. Close Arduino IDE Serial Monitor or other programs using the port, then try again.');
        }
        throw openError;
      }
      
      this.log('info', 'serial', `Port opened successfully at ${baudRate} baud`);
      
      // Setup text encoder/decoder streams
      const textDecoder = new TextDecoderStream();
      const textEncoder = new TextEncoderStream();
      
      this.port.readable?.pipeTo(textDecoder.writable);
      textEncoder.readable.pipeTo(this.port.writable!);
      
      this.reader = textDecoder.readable.getReader();
      this.writer = textEncoder.writable.getWriter();
      
      this.isConnected = true;
      this.log('info', 'serial', '✓ Serial connection established - ready for communication');
      this.notify({ type: 'connected', data: 'Connected to serial port', timestamp: new Date() });
      
      // Start reading loop
      this.startReadLoop();
      this.log('debug', 'serial', 'Read loop started - listening for incoming data');
      
      return true;
    } catch (error: any) {
      const message = error.message || 'Failed to connect';
      
      // User cancelled the port selection
      if (error.name === 'NotFoundError') {
        this.log('info', 'serial', 'Port selection cancelled by user');
        return false;
      }
      
      // No ports available
      if (message.includes('No port selected')) {
        this.log('warning', 'serial', 'No serial port selected. Make sure your Arduino is connected.');
        return false;
      }
      
      this.log('error', 'serial', `Connection failed: ${message}`);
      this.notify({ type: 'error', data: message, timestamp: new Date() });
      return false;
    }
  }

  /**
   * Disconnect from serial port
   */
  async disconnect(): Promise<void> {
    this.log('info', 'serial', 'Disconnecting from serial port...');
    this.readLoopRunning = false;
    
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
        this.log('debug', 'serial', 'Reader closed');
      }
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
        this.log('debug', 'serial', 'Writer closed');
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
        this.log('debug', 'serial', 'Port closed');
      }
    } catch (error: any) {
      this.log('error', 'serial', `Error during disconnect: ${error.message}`);
    }
    
    this.isConnected = false;
    this.log('info', 'serial', 'Serial port disconnected');
    this.notify({ type: 'disconnected', data: 'Disconnected from serial port', timestamp: new Date() });
  }

  /**
   * Send data to serial port
   */
  async send(data: string): Promise<boolean> {
    if (!this.isConnected || !this.writer) {
      this.log('error', 'tx', 'Cannot send - not connected');
      this.notify({ type: 'error', data: 'Not connected', timestamp: new Date() });
      return false;
    }

    try {
      const payload = data + '\n';
      this.log('info', 'tx', `Sending: "${data}"`);
      this.log('debug', 'tx', `Raw bytes: ${payload.length} chars`);
      await this.writer.write(payload);
      this.log('debug', 'tx', 'Data written to serial buffer');
      this.notify({ type: 'tx', data, timestamp: new Date() });
      return true;
    } catch (error: any) {
      this.log('error', 'tx', `Send failed: ${error.message}`);
      this.notify({ type: 'error', data: error.message, timestamp: new Date() });
      return false;
    }
  }

  /**
   * Send command for widget binding
   */
  async sendCommand(command: string, params?: Record<string, any>): Promise<boolean> {
    const message = params ? `${command}:${JSON.stringify(params)}` : command;
    this.log('info', 'command', `Executing command: ${command}`);
    if (params) {
      this.log('debug', 'command', `Parameters: ${JSON.stringify(params)}`);
    }
    return this.send(message);
  }

  /**
   * Subscribe to serial messages
   */
  subscribe(callback: MessageCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(message: SerialMessage): void {
    this.listeners.forEach(cb => cb(message));
  }

  private async startReadLoop(): Promise<void> {
    if (!this.reader || this.readLoopRunning) return;
    
    this.readLoopRunning = true;
    let buffer = '';

    try {
      while (this.readLoopRunning && this.reader) {
        const { value, done } = await this.reader.read();
        
        if (done) {
          this.log('debug', 'rx', 'Read stream ended');
          break;
        }
        
        if (value) {
          buffer += value;
          this.log('debug', 'rx', `Received chunk: ${value.length} chars`);
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              const trimmedLine = line.trim();
              this.log('info', 'rx', `Received: "${trimmedLine}"`);
              this.notify({ type: 'rx', data: trimmedLine, timestamp: new Date() });
              this.notify({ type: 'data', data: trimmedLine, timestamp: new Date() });
              this.parseAndDispatch(trimmedLine);
            }
          }
        }
      }
    } catch (error: any) {
      if (this.readLoopRunning) {
        this.log('error', 'rx', `Read error: ${error.message}`);
        this.notify({ type: 'error', data: error.message, timestamp: new Date() });
      }
    }
    
    this.readLoopRunning = false;
    this.log('debug', 'serial', 'Read loop stopped');
  }

  /**
   * Parse incoming data and dispatch to appropriate handlers
   */
  private parseAndDispatch(data: string): void {
    // Parse format: VARIABLE:VALUE or SENSOR:VALUE
    const match = data.match(/^(\w+):(.+)$/);
    if (match) {
      const [, name, value] = match;
      const parsedValue = this.parseValue(value);
      this.log('debug', 'parser', `Parsed variable: ${name} = ${parsedValue} (${typeof parsedValue})`);
      // Dispatch variable update event
      window.dispatchEvent(new CustomEvent('serial-variable-update', {
        detail: { name, value: parsedValue }
      }));
    } else {
      this.log('debug', 'parser', `Raw message (no variable format): "${data}"`);
    }
  }

  private parseValue(value: string): any {
    if (value === '1' || value.toLowerCase() === 'true') return true;
    if (value === '0' || value.toLowerCase() === 'false') return false;
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
    return value;
  }
}

// Singleton instance
export const webSerial = new WebSerialService();
