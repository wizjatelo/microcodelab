# boot.py - Runs on boot
import machine
import utime


def setup():
    # Configure hardware
    print("Boot: Initializing hardware...")

    # Disable WiFi to save power if not needed
    import network
    sta = network.WLAN(network.STA_IF)
    ap = network.WLAN(network.AP_IF)
    sta.active(False)
    ap.active(False)

    # Configure LED (GPIO2 on most ESP32 boards)
    led = machine.Pin(2, machine.Pin.OUT)
    led.value(0)  # Turn off

    # Boot indicator
    for _ in range(3):
        led.value(1)
        utime.sleep_ms(100)
        led.value(0)
        utime.sleep_ms(100)

    print("Boot: Complete")


# Run setup
setup()
