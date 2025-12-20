# Requirements Document

## Introduction

This specification defines the requirements for a web-based ESP32 communication system using the Web Serial API. The system enables browser-to-ESP32 communication via USB, supporting multiple ESP32 variants and USB bridge chips. The implementation must handle connection management, data transfer, error handling, and provide a robust user experience.

## Glossary

- **Web_Serial_API**: Browser API enabling serial port communication from web applications
- **ESP32**: Espressif microcontroller family including ESP32-DevKitC-V4, ESP32-WROOM-32, ESP32-S2, ESP32-S3
- **USB_Bridge_Chip**: Hardware component converting USB to UART (CP210x, FTDI FT232, CH340)
- **Baud_Rate**: Serial communication speed in bits per second
- **Serial_Port**: Virtual COM port representing USB-connected device
- **Connection_Manager**: Service handling serial port lifecycle (open, read, write, close)
- **Data_Parser**: Component processing incoming serial data into structured formats
- **Command_Protocol**: Defined message format for bidirectional communication

## Requirements

### Requirement 1: Browser Compatibility Detection

**User Story:** As a user, I want to know immediately if my browser supports Web Serial, so that I can switch to a compatible browser if needed.

#### Acceptance Criteria

1. WHEN the application loads, THE Web_Serial_API SHALL check for `navigator.serial` availability
2. WHEN Web Serial is not supported, THE System SHALL display a clear warning message listing supported browsers (Chrome >=89, Edge >=89, Opera >=76)
3. WHEN Web Serial is not supported, THE System SHALL disable connection UI elements and prevent connection attempts
4. THE System SHALL detect HTTPS context requirement and warn users on insecure connections

### Requirement 2: Serial Port Selection

**User Story:** As a user, I want to select my ESP32 from a list of available ports, so that I can connect to the correct device.

#### Acceptance Criteria

1. WHEN the user clicks the connect button, THE System SHALL invoke `navigator.serial.requestPort()` to display browser's native port picker
2. WHEN multiple devices are connected, THE System SHALL allow the user to distinguish between ports via the browser's port selector
3. WHEN the user cancels port selection, THE System SHALL handle the `NotFoundError` gracefully without showing error messages
4. THE System SHALL support filtering by USB vendor/product IDs for common ESP32 bridge chips (CP210x: 0x10C4, FTDI: 0x0403, CH340: 0x1A86)

### Requirement 3: Connection Configuration

**User Story:** As a developer, I want to configure serial connection parameters, so that I can match my ESP32 firmware settings.

#### Acceptance Criteria

1. THE System SHALL provide baud rate selection with options: 9600, 19200, 38400, 57600, 115200 (default), 230400, 460800, 921600
2. THE System SHALL use fixed parameters: 8 data bits, 1 stop bit, no parity, no flow control
3. WHEN connecting, THE System SHALL pass configuration to `port.open()` with specified baudRate
4. THE System SHALL persist user's last-used baud rate preference in local storage

### Requirement 4: Connection Establishment

**User Story:** As a user, I want to establish a reliable connection to my ESP32, so that I can communicate with my device.

#### Acceptance Criteria

1. WHEN the user initiates connection, THE Connection_Manager SHALL call `port.open()` with configured parameters
2. IF the port is already in use by another application, THEN THE System SHALL display a specific error message suggesting to close Arduino IDE Serial Monitor or other programs
3. WHEN connection succeeds, THE System SHALL set up TextDecoderStream and TextEncoderStream for text-based communication
4. WHEN connection succeeds, THE System SHALL start a read loop to continuously receive incoming data
5. THE System SHALL provide visual feedback showing connection status (connecting, connected, disconnected, error)

### Requirement 5: Data Transmission

**User Story:** As a developer, I want to send commands to my ESP32, so that I can control my device from the browser.

#### Acceptance Criteria

1. WHEN the user sends a command, THE System SHALL write data to the serial port using the writer interface
2. THE System SHALL append newline character (`\n`) to outgoing messages for line-based protocols
3. WHEN transmission fails, THE System SHALL notify the user with the specific error
4. THE System SHALL support both plain text commands and structured JSON payloads
5. THE System SHALL log all transmitted data with timestamps for debugging

### Requirement 6: Data Reception

**User Story:** As a developer, I want to receive data from my ESP32, so that I can display sensor readings and device responses.

#### Acceptance Criteria

1. THE System SHALL continuously read from the serial port using an async read loop
2. THE System SHALL buffer incoming data and process complete lines (delimited by `\n`)
3. WHEN data is received, THE System SHALL parse structured formats (e.g., `VARIABLE:VALUE`)
4. THE System SHALL dispatch parsed data via custom events (`serial-variable-update`) for widget binding
5. THE System SHALL handle partial messages by buffering until complete line is received
6. THE System SHALL log all received data with timestamps for debugging

### Requirement 7: Connection Termination

**User Story:** As a user, I want to cleanly disconnect from my ESP32, so that the port is released for other applications.

#### Acceptance Criteria

1. WHEN the user clicks disconnect, THE Connection_Manager SHALL stop the read loop
2. THE Connection_Manager SHALL cancel the reader using `reader.cancel()`
3. THE Connection_Manager SHALL close the writer using `writer.close()`
4. THE Connection_Manager SHALL close the port using `port.close()`
5. THE System SHALL update UI to reflect disconnected state
6. IF errors occur during disconnection, THEN THE System SHALL log them but complete the disconnection process

### Requirement 8: Error Handling

**User Story:** As a user, I want clear error messages when something goes wrong, so that I can troubleshoot connection issues.

#### Acceptance Criteria

1. WHEN a port is busy, THE System SHALL suggest specific actions: close Arduino IDE, unplug/replug cable, check Device Manager
2. WHEN connection times out, THE System SHALL provide timeout-specific guidance
3. WHEN the USB cable is disconnected during operation, THE System SHALL detect the disconnection and update status
4. THE System SHALL categorize errors by severity (info, warning, error, debug) for logging
5. IF a read error occurs during active connection, THEN THE System SHALL attempt graceful recovery before disconnecting

### Requirement 9: Visual Feedback and Status

**User Story:** As a user, I want to see the current connection status at a glance, so that I know if my device is connected.

#### Acceptance Criteria

1. THE System SHALL display connection status with distinct visual indicators (connected: green, disconnected: gray, error: red)
2. THE System SHALL show data transfer activity indicators for TX and RX
3. WHEN messages are sent or received, THE System SHALL display them in a scrollable log with timestamps
4. THE System SHALL differentiate message types visually (TX: cyan, RX: green, error: red, status: yellow)
5. THE System SHALL provide a message history limited to the last 100 messages to prevent memory issues

### Requirement 10: Communication Protocol Support

**User Story:** As a developer, I want a defined protocol for ESP32 communication, so that I can implement compatible firmware.

#### Acceptance Criteria

1. THE System SHALL support ASCII text-based commands for simplicity
2. THE System SHALL support structured data format: `VARIABLE_NAME:VALUE`
3. THE System SHALL parse numeric values (integers, floats) from string representations
4. THE System SHALL parse boolean values from "true"/"false" and "1"/"0" strings
5. THE System SHALL support JSON payloads for complex commands: `COMMAND:{"param1":"value1"}`

### Requirement 11: Widget Integration

**User Story:** As a developer, I want serial data to update dashboard widgets, so that I can visualize sensor readings in real-time.

#### Acceptance Criteria

1. WHEN structured data is received (e.g., `TEMP:25.5`), THE Data_Parser SHALL dispatch a custom event with variable name and parsed value
2. THE System SHALL maintain a variables state object mapping variable names to their latest values
3. THE System SHALL provide a `sendCommand()` method for widgets to send commands with optional parameters
4. Dashboard widgets SHALL be able to subscribe to specific variable updates

### Requirement 12: Security and Permissions

**User Story:** As a user, I want my serial port access to be secure, so that malicious websites cannot access my devices.

#### Acceptance Criteria

1. THE System SHALL only function in secure contexts (HTTPS or localhost)
2. THE System SHALL require explicit user permission for each port access via browser's native permission dialog
3. THE System SHALL NOT persist port access across browser sessions (session-only access)
4. THE System SHALL enforce single connection per port (no concurrent access)
