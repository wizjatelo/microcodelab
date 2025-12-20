# main.py - Main MicroPython application
import machine
import uos
import ujson
import uselect
import utime
import sys
from machine import Pin, ADC, I2C, SPI, PWM
import network
import ubinascii
import hashlib
import gc


class WebSerialESP32:
    def __init__(self, baudrate=115200, buffer_size=2048):
        self.baudrate = baudrate
        self.buffer_size = buffer_size
        self.command_buffer = bytearray(buffer_size)
        self.buf_pos = 0
        self.last_char_time = 0
        self.timeout_ms = 100
        self.connected = False
        self.poll = uselect.poll()

        # Binary protocol settings
        self.binary_mode = False
        self.binary_buffer = bytearray(4096)
        self.binary_expected = 0
        self.binary_received = 0

        # OTA update state
        self.ota_in_progress = False
        self.ota_filename = None
        self.ota_size = 0
        self.ota_received = 0
        self.ota_checksum = None

        # Initialize UART for USB communication
        try:
            self.uart = machine.UART(0, baudrate=baudrate)
            self.uart.init(baudrate=baudrate, bits=8, parity=None, stop=1)
        except Exception as e:
            print(f"UART init failed: {e}")
            try:
                import usb_cdc
                self.uart = usb_cdc.data
                print("Using native USB CDC")
            except:
                print("No serial interface found")
                raise

        # Register for polling
        self.poll.register(self.uart, uselect.POLLIN)

        # Command handlers
        self.handlers = {
            'ping': self.handle_ping,
            'version': self.handle_version,
            'system_info': self.handle_system_info,
            'gpio_read': self.handle_gpio_read,
            'gpio_write': self.handle_gpio_write,
            'adc_read': self.handle_adc_read,
            'i2c_scan': self.handle_i2c_scan,
            'i2c_read': self.handle_i2c_read,
            'i2c_write': self.handle_i2c_write,
            'spi_transfer': self.handle_spi_transfer,
            'reboot': self.handle_reboot,
            'file_list': self.handle_file_list,
            'file_read': self.handle_file_read,
            'file_write': self.handle_file_write,
            'file_delete': self.handle_file_delete,
            'file_mkdir': self.handle_file_mkdir,
            'wifi_scan': self.handle_wifi_scan,
            'wifi_connect': self.handle_wifi_connect,
            # Batch commands
            'batch': self.handle_batch,
            # Binary protocol
            'binary_start': self.handle_binary_start,
            'binary_end': self.handle_binary_end,
            # OTA firmware update
            'ota_start': self.handle_ota_start,
            'ota_chunk': self.handle_ota_chunk,
            'ota_finish': self.handle_ota_finish,
            'ota_abort': self.handle_ota_abort,
        }

        # GPIO state tracking
        self.gpio_pins = {}
        self.initialize_pins()

        # I2C buses
        self.i2c_buses = {}

        # SPI buses
        self.spi_buses = {}

        # System info
        self.start_time = utime.ticks_ms()
        self.packet_count = 0

        print(f"WebSerial ESP32 ready at {baudrate} baud")

    def initialize_pins(self):
        """Initialize available GPIO pins"""
        # ESP32 GPIO map (exclude strapping pins)
        available_pins = list(range(0, 40))

        # Remove problematic pins
        problematic = [24, 28, 29, 30, 31]  # Usually not available
        for pin in problematic:
            if pin in available_pins:
                available_pins.remove(pin)

        # Initialize each pin as input by default
        for pin_num in available_pins:
            try:
                pin = Pin(pin_num, Pin.IN)
                self.gpio_pins[pin_num] = {
                    'pin': pin,
                    'mode': 'input',
                    'value': pin.value(),
                    'last_change': 0
                }
            except Exception as e:
                # Some pins may not be available
                pass

    def process(self):
        """Main processing loop - call this frequently"""
        events = self.poll.poll(0)  # Non-blocking poll

        for event in events:
            if event[0] == self.uart and event[1] & uselect.POLLIN:
                # Data available to read
                try:
                    # Read all available data
                    data = self.uart.read()
                    if data:
                        # Handle binary mode differently
                        if self.binary_mode:
                            self.process_binary_data(data)
                        else:
                            self.process_data(data)
                except Exception as e:
                    print(f"Read error: {e}")

        # Check for timeout (only in text mode)
        if not self.binary_mode and self.buf_pos > 0 and (utime.ticks_ms() - self.last_char_time > self.timeout_ms):
            self.process_buffer()

    def process_data(self, data):
        """Process incoming data"""
        for byte in data:
            if byte == ord('\n') or byte == ord('\r'):
                self.process_buffer()
            elif self.buf_pos < self.buffer_size - 1:
                self.command_buffer[self.buf_pos] = byte
                self.buf_pos += 1
                self.last_char_time = utime.ticks_ms()
            else:
                # Buffer overflow
                self.send_error("Buffer overflow")
                self.buf_pos = 0

    def process_buffer(self):
        """Process complete command in buffer"""
        if self.buf_pos == 0:
            return

        try:
            # Get command string
            command = self.command_buffer[:self.buf_pos].decode('utf-8').strip()
            self.buf_pos = 0

            # Skip empty commands
            if not command:
                return

            self.packet_count += 1

            # Parse as JSON if it starts with {
            if command.startswith('{'):
                try:
                    data = ujson.loads(command)
                    self.process_json_command(data)
                except ValueError as e:
                    self.send_error(f"Invalid JSON: {e}")
            else:
                # Simple text command
                self.process_text_command(command)

        except Exception as e:
            self.send_error(f"Processing error: {e}")
            self.buf_pos = 0

    def process_text_command(self, command):
        """Process simple text command"""
        parts = command.split()
        cmd = parts[0].lower() if parts else ""

        if cmd == 'help':
            self.send_response("Available commands: version, gpio, adc, i2c, spi, reboot, files")
        elif cmd == 'version':
            self.send_response(f"MicroPython {sys.version}")
        elif cmd == 'gpio':
            if len(parts) >= 3:
                pin = int(parts[1])
                value = int(parts[2])
                self.handle_gpio_write({'pin': pin, 'value': value})
            else:
                self.send_response("Usage: gpio <pin> <0/1>")
        elif cmd == 'reboot':
            machine.reset()
        else:
            self.send_error(f"Unknown command: {cmd}")

    def process_json_command(self, data):
        """Process JSON command"""
        if 'command' not in data:
            self.send_error("No command specified")
            return

        cmd = data['command']
        handler = self.handlers.get(cmd)

        if handler:
            try:
                response = handler(data)
                if response:
                    self.send_json(response)
            except Exception as e:
                self.send_error(f"Handler error: {e}")
        else:
            self.send_error(f"Unknown command: {cmd}")

    def send_response(self, message):
        """Send text response"""
        try:
            self.uart.write(message + '\n')
        except Exception as e:
            print(f"Send error: {e}")

    def send_json(self, data):
        """Send JSON response"""
        try:
            json_str = ujson.dumps(data)
            self.uart.write(json_str + '\n')
        except Exception as e:
            print(f"JSON send error: {e}")

    def send_error(self, message):
        """Send error response"""
        error_data = {
            'type': 'error',
            'message': message,
            'timestamp': utime.ticks_ms()
        }
        self.send_json(error_data)

    # Command handlers
    def handle_ping(self, data):
        return {
            'type': 'pong',
            'timestamp': utime.ticks_ms(),
            'uptime': utime.ticks_ms() - self.start_time
        }

    def handle_version(self, data):
        return {
            'type': 'version',
            'micropython': sys.version,
            'platform': uos.uname()[0],
            'release': uos.uname()[2],
            'machine': uos.uname()[4]
        }

    def handle_system_info(self, data):
        import gc

        # Get memory info
        gc.collect()
        free_mem = gc.mem_free()
        alloc_mem = gc.mem_alloc()
        total_mem = free_mem + alloc_mem

        # Get unique ID
        try:
            unique_id = ubinascii.hexlify(machine.unique_id()).decode()
        except:
            unique_id = 'unknown'

        return {
            'type': 'system_info',
            'chip_id': unique_id,
            'free_memory': free_mem,
            'used_memory': alloc_mem,
            'total_memory': total_mem,
            'freq_mhz': machine.freq() // 1000000,
            'packet_count': self.packet_count,
            'uptime_ms': utime.ticks_ms() - self.start_time
        }

    def handle_gpio_read(self, data):
        pin_num = data.get('pin', 2)  # Default to GPIO2 (LED)

        if pin_num not in self.gpio_pins:
            raise ValueError(f"Invalid GPIO pin: {pin_num}")

        pin_info = self.gpio_pins[pin_num]
        value = pin_info['pin'].value()

        # Update tracking
        if value != pin_info['value']:
            pin_info['value'] = value
            pin_info['last_change'] = utime.ticks_ms()

        return {
            'type': 'gpio_read',
            'pin': pin_num,
            'value': value,
            'mode': pin_info['mode']
        }

    def handle_gpio_write(self, data):
        pin_num = data.get('pin')
        value = data.get('value')

        if pin_num is None or value is None:
            raise ValueError("Missing pin or value")

        if pin_num not in self.gpio_pins:
            # Try to create the pin
            try:
                pin = Pin(pin_num, Pin.OUT)
                self.gpio_pins[pin_num] = {
                    'pin': pin,
                    'mode': 'output',
                    'value': value,
                    'last_change': utime.ticks_ms()
                }
            except Exception as e:
                raise ValueError(f"Invalid GPIO pin: {pin_num} - {e}")
        else:
            pin_info = self.gpio_pins[pin_num]

            # Change mode if needed
            if pin_info['mode'] != 'output':
                pin_info['pin'] = Pin(pin_num, Pin.OUT)
                pin_info['mode'] = 'output'

            # Set value
            pin_info['pin'].value(value)
            pin_info['value'] = value
            pin_info['last_change'] = utime.ticks_ms()

        return {
            'type': 'gpio_write',
            'pin': pin_num,
            'value': value,
            'success': True
        }

    def handle_adc_read(self, data):
        pin_num = data.get('pin', 36)  # Default to GPIO36 (VP)

        try:
            # Note: Not all pins support ADC
            adc = ADC(Pin(pin_num))
            adc.atten(ADC.ATTN_11DB)  # 0-3.3V range
            adc.width(ADC.WIDTH_12BIT)  # 12-bit resolution

            # Take multiple samples for accuracy
            samples = []
            for _ in range(10):
                samples.append(adc.read())
                utime.sleep_us(100)

            # Average the samples
            avg_value = sum(samples) // len(samples)

            # Convert to voltage (assuming 3.3V reference)
            voltage = (avg_value / 4095) * 3.3

            return {
                'type': 'adc_read',
                'pin': pin_num,
                'raw_value': avg_value,
                'voltage': round(voltage, 3),
                'resolution': '12-bit'
            }
        except Exception as e:
            raise ValueError(f"ADC read failed on pin {pin_num}: {e}")

    def handle_i2c_scan(self, data):
        scl_pin = data.get('scl', 22)  # Default I2C pins
        sda_pin = data.get('sda', 21)
        freq = data.get('freq', 100000)

        bus_key = f"{scl_pin}_{sda_pin}"

        if bus_key not in self.i2c_buses:
            try:
                i2c = I2C(0, scl=Pin(scl_pin), sda=Pin(sda_pin), freq=freq)
                self.i2c_buses[bus_key] = i2c
            except Exception as e:
                raise ValueError(f"I2C init failed: {e}")

        i2c = self.i2c_buses[bus_key]
        devices = i2c.scan()

        device_list = []
        for addr in devices:
            device_list.append({
                'address': addr,
                'hex': hex(addr)
            })

        return {
            'type': 'i2c_scan',
            'devices': device_list,
            'count': len(devices),
            'pins': {'scl': scl_pin, 'sda': sda_pin}
        }

    def handle_i2c_read(self, data):
        address = data.get('address')
        register = data.get('register')
        length = data.get('length', 1)

        if address is None:
            raise ValueError("I2C address required")

        # Use default I2C bus
        scl_pin = data.get('scl', 22)
        sda_pin = data.get('sda', 21)
        bus_key = f"{scl_pin}_{sda_pin}"

        if bus_key not in self.i2c_buses:
            raise ValueError("I2C bus not initialized. Run scan first.")

        i2c = self.i2c_buses[bus_key]

        try:
            if register is not None:
                # Read from specific register
                data_bytes = i2c.readfrom_mem(address, register, length)
            else:
                # General read
                data_bytes = i2c.readfrom(address, length)

            # Convert to list of integers
            data_list = list(data_bytes)

            return {
                'type': 'i2c_read',
                'address': address,
                'register': register,
                'data': data_list,
                'hex': ['0x{:02x}'.format(b) for b in data_list]
            }
        except Exception as e:
            raise ValueError(f"I2C read failed: {e}")

    def handle_i2c_write(self, data):
        address = data.get('address')
        register = data.get('register')
        data_bytes = data.get('data', [])

        if address is None or not data_bytes:
            raise ValueError("Address and data required")

        # Use default I2C bus
        scl_pin = data.get('scl', 22)
        sda_pin = data.get('sda', 21)
        bus_key = f"{scl_pin}_{sda_pin}"

        if bus_key not in self.i2c_buses:
            raise ValueError("I2C bus not initialized. Run scan first.")

        i2c = self.i2c_buses[bus_key]

        try:
            # Convert list to bytes
            data_to_write = bytes(data_bytes)

            if register is not None:
                # Write to specific register
                i2c.writeto_mem(address, register, data_to_write)
            else:
                # General write
                i2c.writeto(address, data_to_write)

            return {
                'type': 'i2c_write',
                'address': address,
                'register': register,
                'bytes_written': len(data_bytes),
                'success': True
            }
        except Exception as e:
            raise ValueError(f"I2C write failed: {e}")

    def handle_spi_transfer(self, data):
        mosi_pin = data.get('mosi', 23)
        miso_pin = data.get('miso', 19)
        sck_pin = data.get('sck', 18)
        cs_pin = data.get('cs')
        data_bytes = data.get('data', [0])
        baudrate = data.get('baudrate', 1000000)

        bus_key = f"{mosi_pin}_{miso_pin}_{sck_pin}"

        if bus_key not in self.spi_buses:
            try:
                spi = SPI(1, baudrate=baudrate, polarity=0, phase=0,
                          bits=8, firstbit=SPI.MSB,
                          sck=Pin(sck_pin), mosi=Pin(mosi_pin), miso=Pin(miso_pin))
                self.spi_buses[bus_key] = spi
            except Exception as e:
                raise ValueError(f"SPI init failed: {e}")

        spi = self.spi_buses[bus_key]

        try:
            # Setup CS pin if provided
            cs = None
            if cs_pin is not None:
                cs = Pin(cs_pin, Pin.OUT)
                cs.value(0)  # Activate

            # Convert data to bytes
            tx_data = bytes(data_bytes)

            # Perform transfer
            rx_data = spi.read(len(tx_data), tx_data[0])

            # Deactivate CS
            if cs:
                cs.value(1)

            rx_list = list(rx_data)

            return {
                'type': 'spi_transfer',
                'tx_data': data_bytes,
                'rx_data': rx_list,
                'hex_rx': ['0x{:02x}'.format(b) for b in rx_list]
            }
        except Exception as e:
            raise ValueError(f"SPI transfer failed: {e}")
        finally:
            if cs:
                cs.value(1)

    def handle_reboot(self, data):
        # Send response first
        self.send_json({
            'type': 'reboot',
            'message': 'Rebooting...'
        })

        # Small delay to ensure response is sent
        utime.sleep_ms(100)

        # Reboot
        machine.reset()
        return None  # Won't be reached

    def handle_file_list(self, data):
        path = data.get('path', '/')

        try:
            files = []
            dirs = []

            for entry in uos.ilistdir(path):
                name = entry[0]
                entry_type = entry[1]
                size = entry[3] if len(entry) > 3 else 0

                if entry_type == 0x4000:  # Directory
                    dirs.append({
                        'name': name,
                        'type': 'directory'
                    })
                else:  # File
                    files.append({
                        'name': name,
                        'size': size,
                        'type': 'file'
                    })

            # Sort alphabetically
            dirs.sort(key=lambda x: x['name'].lower())
            files.sort(key=lambda x: x['name'].lower())

            return {
                'type': 'file_list',
                'path': path,
                'directories': dirs,
                'files': files,
                'total': len(dirs) + len(files)
            }
        except Exception as e:
            raise ValueError(f"Failed to list directory: {e}")

    def handle_file_read(self, data):
        filename = data.get('filename')
        max_size = data.get('max_size', 4096)

        if not filename:
            raise ValueError("Filename required")

        try:
            with open(filename, 'r') as f:
                content = f.read(max_size)

            return {
                'type': 'file_read',
                'filename': filename,
                'content': content,
                'size': len(content),
                'truncated': len(content) == max_size
            }
        except Exception as e:
            raise ValueError(f"Failed to read file: {e}")

    def handle_file_write(self, data):
        filename = data.get('filename')
        content = data.get('content', '')
        mode = data.get('mode', 'w')  # 'w' for write, 'a' for append

        if not filename:
            raise ValueError("Filename required")

        try:
            with open(filename, mode) as f:
                f.write(content)

            # Get file size
            stat = uos.stat(filename)

            return {
                'type': 'file_write',
                'filename': filename,
                'size': stat[6],  # File size
                'success': True
            }
        except Exception as e:
            raise ValueError(f"Failed to write file: {e}")

    def handle_wifi_scan(self, data):
        try:
            sta = network.WLAN(network.STA_IF)
            sta.active(True)

            # Scan networks
            networks = sta.scan()

            # Format results
            results = []
            for net in networks:
                ssid = net[0].decode('utf-8') if isinstance(net[0], bytes) else net[0]
                bssid = ubinascii.hexlify(net[1]).decode()
                channel = net[2]
                rssi = net[3]
                auth = net[4]
                hidden = net[5]

                # Determine encryption type
                if auth == 0:
                    security = "OPEN"
                elif auth == 1:
                    security = "WEP"
                elif auth == 2:
                    security = "WPA-PSK"
                elif auth == 3:
                    security = "WPA2-PSK"
                elif auth == 4:
                    security = "WPA/WPA2-PSK"
                else:
                    security = f"UNKNOWN({auth})"

                results.append({
                    'ssid': ssid,
                    'bssid': bssid,
                    'channel': channel,
                    'rssi': rssi,
                    'security': security,
                    'hidden': hidden
                })

            # Sort by RSSI (strongest first)
            results.sort(key=lambda x: x['rssi'], reverse=True)

            return {
                'type': 'wifi_scan',
                'networks': results,
                'count': len(results)
            }
        except Exception as e:
            raise ValueError(f"WiFi scan failed: {e}")

    def handle_wifi_connect(self, data):
        ssid = data.get('ssid')
        password = data.get('password')

        if not ssid:
            raise ValueError("SSID required")

        try:
            sta = network.WLAN(network.STA_IF)
            sta.active(True)

            # Connect to network
            sta.connect(ssid, password)

            # Wait for connection (with timeout)
            timeout = 10000  # 10 seconds
            start_time = utime.ticks_ms()

            while not sta.isconnected():
                if utime.ticks_ms() - start_time > timeout:
                    raise ValueError("Connection timeout")
                utime.sleep_ms(100)

            # Get network info
            ifconfig = sta.ifconfig()

            return {
                'type': 'wifi_connect',
                'connected': True,
                'ssid': ssid,
                'ip_address': ifconfig[0],
                'subnet_mask': ifconfig[1],
                'gateway': ifconfig[2],
                'dns': ifconfig[3]
            }
        except Exception as e:
            raise ValueError(f"WiFi connection failed: {e}")

    # ============== File Delete ==============
    def handle_file_delete(self, data):
        """Delete a file or empty directory"""
        path = data.get('path') or data.get('filename')
        
        if not path:
            raise ValueError("Path required")
        
        try:
            # Check if it's a directory
            try:
                stat = uos.stat(path)
                is_dir = stat[0] & 0x4000
            except:
                raise ValueError(f"Path not found: {path}")
            
            if is_dir:
                uos.rmdir(path)
            else:
                uos.remove(path)
            
            return {
                'type': 'file_delete',
                'path': path,
                'success': True
            }
        except Exception as e:
            raise ValueError(f"Delete failed: {e}")

    def handle_file_mkdir(self, data):
        """Create a directory"""
        path = data.get('path')
        
        if not path:
            raise ValueError("Path required")
        
        try:
            uos.mkdir(path)
            return {
                'type': 'file_mkdir',
                'path': path,
                'success': True
            }
        except Exception as e:
            raise ValueError(f"Mkdir failed: {e}")

    # ============== Batch Commands ==============
    def handle_batch(self, data):
        """Execute multiple commands in a single request"""
        commands = data.get('commands', [])
        
        if not commands:
            raise ValueError("No commands provided")
        
        results = []
        errors = []
        
        for i, cmd_data in enumerate(commands):
            try:
                if 'command' not in cmd_data:
                    errors.append({'index': i, 'error': 'No command specified'})
                    continue
                
                cmd = cmd_data['command']
                handler = self.handlers.get(cmd)
                
                if not handler:
                    errors.append({'index': i, 'error': f'Unknown command: {cmd}'})
                    continue
                
                # Skip batch within batch to prevent recursion
                if cmd == 'batch':
                    errors.append({'index': i, 'error': 'Nested batch not allowed'})
                    continue
                
                result = handler(cmd_data)
                if result:
                    results.append({'index': i, 'result': result})
                    
            except Exception as e:
                errors.append({'index': i, 'error': str(e)})
        
        return {
            'type': 'batch_result',
            'total': len(commands),
            'success_count': len(results),
            'error_count': len(errors),
            'results': results,
            'errors': errors
        }

    # ============== Binary Protocol ==============
    def handle_binary_start(self, data):
        """Start binary transfer mode"""
        size = data.get('size', 0)
        
        if size <= 0 or size > len(self.binary_buffer):
            raise ValueError(f"Invalid size: {size} (max {len(self.binary_buffer)})")
        
        self.binary_mode = True
        self.binary_expected = size
        self.binary_received = 0
        
        return {
            'type': 'binary_ready',
            'expected_size': size
        }

    def handle_binary_end(self, data):
        """End binary transfer and return data"""
        if not self.binary_mode:
            raise ValueError("Not in binary mode")
        
        # Get the received binary data
        received_data = self.binary_buffer[:self.binary_received]
        
        # Reset binary mode
        self.binary_mode = False
        result_size = self.binary_received
        self.binary_received = 0
        self.binary_expected = 0
        
        return {
            'type': 'binary_complete',
            'size': result_size,
            'data': list(received_data)  # Convert to list for JSON
        }

    def process_binary_data(self, data):
        """Process incoming binary data"""
        for byte in data:
            if self.binary_received < self.binary_expected:
                self.binary_buffer[self.binary_received] = byte
                self.binary_received += 1
        
        # Check if complete
        if self.binary_received >= self.binary_expected:
            self.send_json({
                'type': 'binary_received',
                'size': self.binary_received
            })

    # ============== OTA Firmware Update ==============
    def handle_ota_start(self, data):
        """Start OTA firmware update"""
        filename = data.get('filename', 'main.py')
        size = data.get('size', 0)
        checksum = data.get('checksum')  # MD5 hex string
        
        if size <= 0:
            raise ValueError("Invalid file size")
        
        # Check available space
        gc.collect()
        free_mem = gc.mem_free()
        
        if size > free_mem * 0.8:  # Leave 20% buffer
            raise ValueError(f"File too large: {size} bytes (free: {free_mem})")
        
        self.ota_in_progress = True
        self.ota_filename = filename
        self.ota_size = size
        self.ota_received = 0
        self.ota_checksum = checksum
        
        # Create temp file
        self.ota_temp = filename + '.tmp'
        try:
            # Remove existing temp file
            try:
                uos.remove(self.ota_temp)
            except:
                pass
            
            # Create new temp file
            with open(self.ota_temp, 'wb') as f:
                pass
            
            return {
                'type': 'ota_ready',
                'filename': filename,
                'expected_size': size,
                'temp_file': self.ota_temp
            }
        except Exception as e:
            self.ota_in_progress = False
            raise ValueError(f"Failed to start OTA: {e}")

    def handle_ota_chunk(self, data):
        """Receive OTA firmware chunk"""
        if not self.ota_in_progress:
            raise ValueError("No OTA in progress")
        
        chunk_data = data.get('data', [])
        offset = data.get('offset', self.ota_received)
        
        if not chunk_data:
            raise ValueError("No data in chunk")
        
        try:
            # Convert list to bytes
            chunk_bytes = bytes(chunk_data)
            
            # Append to temp file
            with open(self.ota_temp, 'ab') as f:
                f.write(chunk_bytes)
            
            self.ota_received += len(chunk_bytes)
            progress = (self.ota_received / self.ota_size) * 100
            
            return {
                'type': 'ota_progress',
                'received': self.ota_received,
                'total': self.ota_size,
                'progress': round(progress, 1)
            }
        except Exception as e:
            raise ValueError(f"Chunk write failed: {e}")

    def handle_ota_finish(self, data):
        """Finish OTA update and apply"""
        if not self.ota_in_progress:
            raise ValueError("No OTA in progress")
        
        try:
            # Verify size
            stat = uos.stat(self.ota_temp)
            actual_size = stat[6]
            
            if actual_size != self.ota_size:
                raise ValueError(f"Size mismatch: expected {self.ota_size}, got {actual_size}")
            
            # Verify checksum if provided
            if self.ota_checksum:
                h = hashlib.md5()
                with open(self.ota_temp, 'rb') as f:
                    while True:
                        chunk = f.read(256)
                        if not chunk:
                            break
                        h.update(chunk)
                actual_checksum = ubinascii.hexlify(h.digest()).decode()
                
                if actual_checksum != self.ota_checksum:
                    raise ValueError(f"Checksum mismatch")
            
            # Backup original file
            backup_name = self.ota_filename + '.bak'
            try:
                uos.remove(backup_name)
            except:
                pass
            
            try:
                uos.rename(self.ota_filename, backup_name)
            except:
                pass  # Original might not exist
            
            # Move temp to final
            uos.rename(self.ota_temp, self.ota_filename)
            
            # Reset state
            self.ota_in_progress = False
            
            return {
                'type': 'ota_complete',
                'filename': self.ota_filename,
                'size': actual_size,
                'backup': backup_name,
                'reboot_required': self.ota_filename in ['main.py', 'boot.py']
            }
        except Exception as e:
            # Cleanup on error
            try:
                uos.remove(self.ota_temp)
            except:
                pass
            self.ota_in_progress = False
            raise ValueError(f"OTA finish failed: {e}")

    def handle_ota_abort(self, data):
        """Abort OTA update"""
        if self.ota_in_progress:
            try:
                uos.remove(self.ota_temp)
            except:
                pass
        
        self.ota_in_progress = False
        self.ota_filename = None
        self.ota_size = 0
        self.ota_received = 0
        
        return {
            'type': 'ota_aborted',
            'success': True
        }


# Create global instance
webserial = None


def main():
    global webserial

    # Initialize Web Serial
    webserial = WebSerialESP32(baudrate=115200)

    # Main loop
    print("Starting Web Serial loop...")

    while True:
        try:
            # Process serial communications
            webserial.process()

            # Small delay to prevent CPU hogging
            utime.sleep_ms(1)

        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"Main loop error: {e}")
            utime.sleep_ms(1000)


# Run main if executed directly
if __name__ == "__main__":
    main()
