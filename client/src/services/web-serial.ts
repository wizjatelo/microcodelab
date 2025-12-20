declare global {
  interface Navigator { serial: Serial; }
  interface Serial { requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>; getPorts(): Promise<SerialPort[]>; }
  interface SerialPortRequestOptions { filters?: SerialPortFilter[]; }
  interface SerialPortFilter { usbVendorId?: number; usbProductId?: number; }
  interface SerialPort { readable: ReadableStream<Uint8Array> | null; writable: WritableStream<Uint8Array> | null; open(options: SerialOptions): Promise<void>; close(): Promise<void>; getInfo(): SerialPortInfo; }
  interface SerialOptions { baudRate: number; dataBits?: number; stopBits?: number; parity?: 'none' | 'even' | 'odd'; bufferSize?: number; flowControl?: 'none' | 'hardware'; }
  interface SerialPortInfo { usbVendorId?: number; usbProductId?: number; }
}

export interface SerialMessage { type: 'data' | 'error' | 'connected' | 'disconnected' | 'tx' | 'rx' | 'json'; data?: string; jsonData?: MicroPythonResponse; timestamp: Date; }
export interface SerialLogEntry { id: string; level: 'info' | 'warning' | 'error' | 'debug'; source: string; message: string; timestamp: string; }
export interface MicroPythonCommand { command: string; [key: string]: unknown; }
export interface MicroPythonResponse { type: string; [key: string]: unknown; }
export interface SystemInfo extends MicroPythonResponse { type: 'system_info'; chip_id: string; free_memory: number; used_memory: number; total_memory: number; freq_mhz: number; packet_count: number; uptime_ms: number; }
export interface GpioReadResponse extends MicroPythonResponse { type: 'gpio_read'; pin: number; value: number; mode: string; }
export interface GpioWriteResponse extends MicroPythonResponse { type: 'gpio_write'; pin: number; value: number; success: boolean; }
export interface AdcReadResponse extends MicroPythonResponse { type: 'adc_read'; pin: number; raw_value: number; voltage: number; resolution: string; }
export interface I2CScanResponse extends MicroPythonResponse { type: 'i2c_scan'; devices: Array<{ address: number; hex: string }>; count: number; pins: { scl: number; sda: number }; }
export interface WiFiScanResponse extends MicroPythonResponse { type: 'wifi_scan'; networks: Array<{ ssid: string; bssid: string; channel: number; rssi: number; security: string; hidden: number; }>; count: number; }
export interface FileListResponse extends MicroPythonResponse { type: 'file_list'; path: string; directories: Array<{ name: string; type: string }>; files: Array<{ name: string; size: number; type: string }>; total: number; }

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type AdcStreamCallback = (data: AdcReadResponse) => void;
type MessageCallback = (message: SerialMessage) => void;
type LogCallback = (log: SerialLogEntry) => void;
type JsonResponseCallback = (response: MicroPythonResponse) => void;
type StateChangeCallback = (state: ConnectionState) => void;

export class WebSerialService {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private writer: WritableStreamDefaultWriter<string> | null = null;
  private isConnected = false;
  private listeners: Set<MessageCallback> = new Set();
  private logListeners: Set<LogCallback> = new Set();
  private jsonListeners: Set<JsonResponseCallback> = new Set();
  private stateListeners: Set<StateChangeCallback> = new Set();
  private readLoopRunning = false;
  private logIdCounter = 0;
  private pendingCommands: Map<string, { resolve: (v: MicroPythonResponse) => void; reject: (e: Error) => void; timeout: ReturnType<typeof setTimeout> }> = new Map();
  private commandTimeout = 10000;
  private autoReconnectEnabled = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 2000;
  private lastBaudRate = 115200;
  private connectionState: ConnectionState = 'disconnected';
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeat = 0;
  private heartbeatEnabled = false;
  private adcStreamInterval: ReturnType<typeof setInterval> | null = null;
  private adcStreamCallbacks: Set<AdcStreamCallback> = new Set();
  private adcStreamPin = 36;
  private rateLimitEnabled = true;
  private commandsPerSecond = 20;
  private commandTimestamps: number[] = [];
  private logHistory: SerialLogEntry[] = [];
  private maxLogHistory = 1000;
  private static instances: Map<string, WebSerialService> = new Map();
  private deviceId = 'default';
  private deviceName = 'ESP32';
  private otaInProgress = false;
  private otaProgress = 0;

  isSecureContext(): boolean { return window.isSecureContext; }
  isSupported(): boolean { return 'serial' in navigator; }

  getBrowserCompatibility(): { supported: boolean; secure: boolean; browser: string; message: string } {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Edge')) browser = 'Edge';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    const supported = this.isSupported();
    const secure = this.isSecureContext();
    let message = !secure ? 'Web Serial requires HTTPS or localhost.' : !supported ? `Web Serial not supported in ${browser}. Use Chrome 89+.` : 'Web Serial API ready.';
    return { supported, secure, browser, message };
  }

  getConnectionStatus(): boolean { return this.isConnected; }
  getConnectionState(): ConnectionState { return this.connectionState; }
  subscribeToLogs(cb: LogCallback): () => void { this.logListeners.add(cb); return () => this.logListeners.delete(cb); }
  subscribeToJsonResponses(cb: JsonResponseCallback): () => void { this.jsonListeners.add(cb); return () => this.jsonListeners.delete(cb); }
  subscribeToStateChanges(cb: StateChangeCallback): () => void { this.stateListeners.add(cb); return () => this.stateListeners.delete(cb); }
  private setConnectionState(state: ConnectionState): void { this.connectionState = state; this.stateListeners.forEach(cb => cb(state)); }
  private log(level: SerialLogEntry['level'], source: string, message: string): void {
    const entry: SerialLogEntry = { id: `serial-${++this.logIdCounter}-${Date.now()}`, level, source, message, timestamp: new Date().toISOString() };
    this.logListeners.forEach(cb => cb(entry)); this.addToLogHistory(entry);
  }
  private checkRateLimit(): boolean {
    if (!this.rateLimitEnabled) return true;
    const now = Date.now();
    this.commandTimestamps = this.commandTimestamps.filter(t => now - t < 1000);
    if (this.commandTimestamps.length >= this.commandsPerSecond) return false;
    this.commandTimestamps.push(now); return true;
  }
  setRateLimit(enabled: boolean, cps = 20): void { this.rateLimitEnabled = enabled; this.commandsPerSecond = cps; }

  async connect(baudRate = 115200): Promise<boolean> {
    if (!this.isSecureContext()) { this.notify({ type: 'error', data: 'Requires HTTPS', timestamp: new Date() }); return false; }
    if (!this.isSupported()) { this.notify({ type: 'error', data: 'Web Serial not supported', timestamp: new Date() }); return false; }
    this.setConnectionState('connecting'); this.lastBaudRate = baudRate;
    try {
      this.port = await navigator.serial.requestPort({ filters: [{ usbVendorId: 0x10C4 }, { usbVendorId: 0x1A86 }, { usbVendorId: 0x0403 }, { usbVendorId: 0x303A }] }).catch(() => navigator.serial.requestPort());
      await this.port.open({ baudRate, bufferSize: 4096 });
      const dec = new TextDecoderStream(); const enc = new TextEncoderStream();
      this.port.readable?.pipeTo(dec.writable as WritableStream); enc.readable.pipeTo(this.port.writable as WritableStream);
      this.reader = dec.readable.getReader(); this.writer = enc.writable.getWriter();
      this.isConnected = true; this.reconnectAttempts = 0; this.setConnectionState('connected');
      this.notify({ type: 'connected', data: 'Connected', timestamp: new Date() });
      this.startReadLoop(); if (this.heartbeatEnabled) this.startHeartbeat();
      return true;
    } catch (e: unknown) { if ((e as Error).name === 'NotFoundError') { this.setConnectionState('disconnected'); return false; } this.setConnectionState('error'); return false; }
  }

  async disconnect(): Promise<void> {
    this.autoReconnectEnabled = false; this.readLoopRunning = false; this.stopHeartbeat(); this.stopAdcStream();
    this.pendingCommands.forEach(({ reject, timeout }) => { clearTimeout(timeout); reject(new Error('Disconnected')); }); this.pendingCommands.clear();
    try { if (this.reader) { await this.reader.cancel(); this.reader = null; } if (this.writer) { await this.writer.close(); this.writer = null; } if (this.port) { await this.port.close(); this.port = null; } } catch {}
    this.isConnected = false; this.setConnectionState('disconnected'); this.notify({ type: 'disconnected', data: 'Disconnected', timestamp: new Date() }); this.autoReconnectEnabled = true;
  }

  setAutoReconnect(enabled: boolean, max = 3, delay = 2000): void { this.autoReconnectEnabled = enabled; this.maxReconnectAttempts = max; this.reconnectDelay = delay; }
  private async attemptReconnect(): Promise<void> {
    if (!this.autoReconnectEnabled || this.reconnectAttempts >= this.maxReconnectAttempts) { this.setConnectionState('error'); return; }
    this.reconnectAttempts++; this.setConnectionState('reconnecting');
    await new Promise(r => setTimeout(r, this.reconnectDelay));
    try {
      if (this.port) {
        await this.port.open({ baudRate: this.lastBaudRate, bufferSize: 4096 });
        const dec = new TextDecoderStream(); const enc = new TextEncoderStream();
        this.port.readable?.pipeTo(dec.writable as WritableStream); enc.readable.pipeTo(this.port.writable as WritableStream);
        this.reader = dec.readable.getReader(); this.writer = enc.writable.getWriter();
        this.isConnected = true; this.reconnectAttempts = 0; this.setConnectionState('connected');
        this.startReadLoop(); if (this.heartbeatEnabled) this.startHeartbeat();
      }
    } catch { await this.attemptReconnect(); }
  }

  startHeartbeat(ms = 10000): void {
    this.heartbeatEnabled = true; if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(async () => { if (!this.isConnected) return; try { await this.ping(); this.lastHeartbeat = Date.now(); } catch { if (this.autoReconnectEnabled) { this.isConnected = false; this.attemptReconnect(); } } }, ms);
  }
  stopHeartbeat(): void { if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; } this.heartbeatEnabled = false; }
  getLastHeartbeat(): number { return this.lastHeartbeat; }

  startAdcStream(pin = 36, ms = 100, cb?: AdcStreamCallback): void {
    this.adcStreamPin = pin; if (cb) this.adcStreamCallbacks.add(cb); if (this.adcStreamInterval) clearInterval(this.adcStreamInterval);
    this.adcStreamInterval = setInterval(async () => { if (!this.isConnected) return; try { const d = await this.adcRead(this.adcStreamPin); this.adcStreamCallbacks.forEach(c => c(d)); window.dispatchEvent(new CustomEvent('esp32-adc-stream', { detail: d })); } catch {} }, ms);
  }
  stopAdcStream(): void { if (this.adcStreamInterval) { clearInterval(this.adcStreamInterval); this.adcStreamInterval = null; } this.adcStreamCallbacks.clear(); }
  subscribeToAdcStream(cb: AdcStreamCallback): () => void { this.adcStreamCallbacks.add(cb); return () => this.adcStreamCallbacks.delete(cb); }

  async send(data: string): Promise<boolean> {
    if (!this.isConnected || !this.writer) { this.notify({ type: 'error', data: 'Not connected', timestamp: new Date() }); return false; }
    if (!this.checkRateLimit()) return false;
    try { await this.writer.write(data + '\n'); this.notify({ type: 'tx', data, timestamp: new Date() }); return true; }
    catch (e: unknown) { this.notify({ type: 'error', data: e instanceof Error ? e.message : String(e), timestamp: new Date() }); return false; }
  }

  async sendJsonCommand<T extends MicroPythonResponse>(cmd: MicroPythonCommand, timeout?: number): Promise<T> {
    if (!this.isConnected || !this.writer) throw new Error('Not connected');
    if (!this.checkRateLimit()) throw new Error('Rate limit');
    const str = JSON.stringify(cmd);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { this.pendingCommands.delete(cmd.command); reject(new Error(`Timeout: ${cmd.command}`)); }, timeout || this.commandTimeout);
      this.pendingCommands.set(cmd.command, { resolve: resolve as (v: MicroPythonResponse) => void, reject, timeout: t });
      this.send(str).catch(e => { clearTimeout(t); this.pendingCommands.delete(cmd.command); reject(e); });
    });
  }

  async ping(): Promise<{ type: 'pong'; timestamp: number; uptime: number }> { return this.sendJsonCommand({ command: 'ping' }); }
  async getVersion(): Promise<{ type: 'version'; micropython: string; platform: string; release: string; machine: string }> { return this.sendJsonCommand({ command: 'version' }); }
  async getSystemInfo(): Promise<SystemInfo> { return this.sendJsonCommand({ command: 'system_info' }); }
  async gpioRead(pin: number): Promise<GpioReadResponse> { return this.sendJsonCommand({ command: 'gpio_read', pin }); }
  async gpioWrite(pin: number, value: number): Promise<GpioWriteResponse> { return this.sendJsonCommand({ command: 'gpio_write', pin, value }); }
  async adcRead(pin = 36): Promise<AdcReadResponse> { return this.sendJsonCommand({ command: 'adc_read', pin }); }
  async i2cScan(scl = 22, sda = 21): Promise<I2CScanResponse> { return this.sendJsonCommand({ command: 'i2c_scan', scl, sda }); }
  async i2cRead(addr: number, reg?: number, len = 1): Promise<MicroPythonResponse> { return this.sendJsonCommand({ command: 'i2c_read', address: addr, register: reg, length: len }); }
  async i2cWrite(addr: number, data: number[], reg?: number): Promise<MicroPythonResponse> { return this.sendJsonCommand({ command: 'i2c_write', address: addr, data, register: reg }); }
  async wifiScan(): Promise<WiFiScanResponse> { return this.sendJsonCommand({ command: 'wifi_scan' }, 15000); }
  async wifiConnect(ssid: string, password: string): Promise<MicroPythonResponse> { return this.sendJsonCommand({ command: 'wifi_connect', ssid, password }, 15000); }
  async fileList(path = '/'): Promise<FileListResponse> { return this.sendJsonCommand({ command: 'file_list', path }); }
  async fileRead(filename: string, maxSize = 4096): Promise<{ type: 'file_read'; filename: string; content: string; size: number; truncated: boolean }> { return this.sendJsonCommand({ command: 'file_read', filename, max_size: maxSize }); }
  async fileWrite(filename: string, content: string, mode: 'w' | 'a' = 'w'): Promise<{ type: 'file_write'; filename: string; size: number; success: boolean }> { return this.sendJsonCommand({ command: 'file_write', filename, content, mode }); }
  async fileDelete(path: string): Promise<{ type: 'file_delete'; path: string; success: boolean }> { return this.sendJsonCommand({ command: 'file_delete', path }); }
  async fileMkdir(path: string): Promise<{ type: 'file_mkdir'; path: string; success: boolean }> { return this.sendJsonCommand({ command: 'file_mkdir', path }); }
  async reboot(): Promise<void> { await this.send(JSON.stringify({ command: 'reboot' })); }
  async sendCommand(cmd: string, params?: Record<string, unknown>): Promise<boolean> { return this.send(JSON.stringify(params ? { command: cmd, ...params } : { command: cmd })); }

  async batchCommands(cmds: MicroPythonCommand[]): Promise<{ type: 'batch_result'; total: number; success_count: number; error_count: number; results: Array<{ index: number; result: MicroPythonResponse }>; errors: Array<{ index: number; error: string }>; }> {
    if (!cmds.length) throw new Error('No commands'); return this.sendJsonCommand({ command: 'batch', commands: cmds }, 30000);
  }
  async batchGpioRead(pins: number[]): Promise<GpioReadResponse[]> { const r = await this.batchCommands(pins.map(pin => ({ command: 'gpio_read', pin }))); return r.results.map(x => x.result as GpioReadResponse); }
  async batchGpioWrite(pv: Array<{ pin: number; value: number }>): Promise<GpioWriteResponse[]> { const r = await this.batchCommands(pv.map(x => ({ command: 'gpio_write', pin: x.pin, value: x.value }))); return r.results.map(x => x.result as GpioWriteResponse); }

  async sendBinary(data: Uint8Array): Promise<{ type: 'binary_complete'; size: number; data: number[] }> {
    if (!this.isConnected || !this.writer) throw new Error('Not connected');
    await this.sendJsonCommand({ command: 'binary_start', size: data.length });
    for (let i = 0; i < data.length; i += 512) { const c = data.slice(i, Math.min(i + 512, data.length)); await this.writer.write(new TextDecoder().decode(c)); await new Promise(r => setTimeout(r, 10)); }
    return this.sendJsonCommand({ command: 'binary_end' });
  }

  async otaUpdate(filename: string, content: string | Uint8Array, onProgress?: (p: number) => void): Promise<{ type: 'ota_complete'; filename: string; size: number; reboot_required: boolean }> {
    if (this.otaInProgress) throw new Error('OTA in progress');
    const data = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const buf = new ArrayBuffer(data.length); new Uint8Array(buf).set(data);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const checksum = Array.from(new Uint8Array(hash)).slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
    this.otaInProgress = true; this.otaProgress = 0;
    try {
      await this.sendJsonCommand({ command: 'ota_start', filename, size: data.length, checksum });
      for (let o = 0; o < data.length; o += 256) {
        const c = data.slice(o, Math.min(o + 256, data.length));
        const p = await this.sendJsonCommand<{ type: 'ota_progress'; progress: number }>({ command: 'ota_chunk', data: Array.from(c), offset: o });
        this.otaProgress = p.progress; if (onProgress) onProgress(p.progress);
        await new Promise(r => setTimeout(r, 20));
      }
      const r = await this.sendJsonCommand<{ type: 'ota_complete'; filename: string; size: number; reboot_required: boolean }>({ command: 'ota_finish' }, 30000);
      this.otaInProgress = false; return r;
    } catch (e) { try { await this.sendJsonCommand({ command: 'ota_abort' }); } catch {} this.otaInProgress = false; throw e; }
  }
  async otaAbort(): Promise<void> { if (this.otaInProgress) { await this.sendJsonCommand({ command: 'ota_abort' }); this.otaInProgress = false; this.otaProgress = 0; } }
  getOtaProgress(): number { return this.otaProgress; }
  isOtaInProgress(): boolean { return this.otaInProgress; }

  static createInstance(id: string, name?: string): WebSerialService { if (WebSerialService.instances.has(id)) return WebSerialService.instances.get(id)!; const i = new WebSerialService(); i.deviceId = id; i.deviceName = name || `ESP32-${id}`; WebSerialService.instances.set(id, i); return i; }
  static getInstance(id: string): WebSerialService | undefined { return WebSerialService.instances.get(id); }
  static getAllInstances(): Map<string, WebSerialService> { return WebSerialService.instances; }
  static getConnectedDevices(): Array<{ id: string; name: string; connected: boolean }> { const d: Array<{ id: string; name: string; connected: boolean }> = []; WebSerialService.instances.forEach((i, id) => d.push({ id, name: i.deviceName, connected: i.isConnected })); return d; }
  static async disconnectAll(): Promise<void> { const p: Promise<void>[] = []; WebSerialService.instances.forEach(i => { if (i.isConnected) p.push(i.disconnect()); }); await Promise.all(p); }
  static removeInstance(id: string): boolean { const i = WebSerialService.instances.get(id); if (i) { if (i.isConnected) i.disconnect(); WebSerialService.instances.delete(id); return true; } return false; }
  getDeviceId(): string { return this.deviceId; }
  getDeviceName(): string { return this.deviceName; }
  setDeviceName(n: string): void { this.deviceName = n; }

  private addToLogHistory(e: SerialLogEntry): void { this.logHistory.push(e); if (this.logHistory.length > this.maxLogHistory) this.logHistory.shift(); }
  getLogHistory(): SerialLogEntry[] { return [...this.logHistory]; }
  clearLogHistory(): void { this.logHistory = []; }
  exportLogsAsText(): string { return this.logHistory.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`).join('\n'); }
  exportLogsAsJson(): string { return JSON.stringify(this.logHistory, null, 2); }
  exportLogsAsCsv(): string { return 'timestamp,level,source,message\n' + this.logHistory.map(l => `"${l.timestamp}","${l.level}","${l.source}","${l.message.replace(/"/g, '""')}"`).join('\n'); }
  downloadLogs(fmt: 'text' | 'json' | 'csv' = 'text'): void {
    let c: string, f: string, m: string;
    if (fmt === 'json') { c = this.exportLogsAsJson(); f = `logs-${this.deviceId}-${Date.now()}.json`; m = 'application/json'; }
    else if (fmt === 'csv') { c = this.exportLogsAsCsv(); f = `logs-${this.deviceId}-${Date.now()}.csv`; m = 'text/csv'; }
    else { c = this.exportLogsAsText(); f = `logs-${this.deviceId}-${Date.now()}.txt`; m = 'text/plain'; }
    const b = new Blob([c], { type: m }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = f; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  }

  subscribe(cb: MessageCallback): () => void { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  private notify(msg: SerialMessage): void { this.listeners.forEach(cb => cb(msg)); }

  private async startReadLoop(): Promise<void> {
    if (!this.reader || this.readLoopRunning) return; this.readLoopRunning = true; let buf = '';
    try {
      while (this.readLoopRunning && this.reader) {
        const { value, done } = await this.reader.read(); if (done) break;
        if (value) { buf += value; const lines = buf.split('\n'); buf = lines.pop() || ''; for (const l of lines) if (l.trim()) { this.notify({ type: 'rx', data: l.trim(), timestamp: new Date() }); this.parseAndDispatch(l.trim()); } }
      }
    } catch { if (this.readLoopRunning) { this.isConnected = false; this.setConnectionState('error'); if (this.autoReconnectEnabled) this.attemptReconnect(); } }
    this.readLoopRunning = false;
  }

  private parseAndDispatch(data: string): void {
    if (data.startsWith('{')) {
      try {
        const j = JSON.parse(data) as MicroPythonResponse;
        this.jsonListeners.forEach(cb => cb(j)); this.notify({ type: 'json', jsonData: j, timestamp: new Date() });
        const map: Record<string, string> = { pong: 'ping', version: 'version', system_info: 'system_info', gpio_read: 'gpio_read', gpio_write: 'gpio_write', adc_read: 'adc_read', i2c_scan: 'i2c_scan', i2c_read: 'i2c_read', i2c_write: 'i2c_write', wifi_scan: 'wifi_scan', wifi_connect: 'wifi_connect', file_list: 'file_list', file_read: 'file_read', file_write: 'file_write', file_delete: 'file_delete', file_mkdir: 'file_mkdir', batch_result: 'batch', binary_complete: 'binary_end', ota_progress: 'ota_chunk', ota_complete: 'ota_finish' };
        const cmd = map[j.type]; if (cmd && this.pendingCommands.has(cmd)) { const p = this.pendingCommands.get(cmd)!; clearTimeout(p.timeout); this.pendingCommands.delete(cmd); p.resolve(j); }
        if (j.type === 'gpio_read' || j.type === 'adc_read') window.dispatchEvent(new CustomEvent('esp32-sensor-data', { detail: j }));
        return;
      } catch {}
    }
    const m = data.match(/^(\w+):(.+)$/);
    if (m) { const [, n, v] = m; window.dispatchEvent(new CustomEvent('serial-variable-update', { detail: { name: n, value: this.parseValue(v) } })); }
    else this.notify({ type: 'data', data, timestamp: new Date() });
  }

  private parseValue(v: string): boolean | number | string {
    if (v === '1' || v.toLowerCase() === 'true') return true;
    if (v === '0' || v.toLowerCase() === 'false') return false;
    const n = parseFloat(v); if (!isNaN(n)) return n; return v;
  }
}

export const webSerial = new WebSerialService();
