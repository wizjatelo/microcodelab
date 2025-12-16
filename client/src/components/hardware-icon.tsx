import { Cpu, CircuitBoard } from "lucide-react";
import type { HardwareType } from "@shared/schema";

interface HardwareIconProps {
  hardware: HardwareType;
  className?: string;
}

export function HardwareIcon({ hardware, className = "h-4 w-4" }: HardwareIconProps) {
  return <Cpu className={className} />;
}

export function getHardwareLabel(hardware: HardwareType): string {
  const labels: Record<HardwareType, string> = {
    esp32: "ESP32",
    esp8266: "ESP8266",
    arduino_uno: "Arduino Uno",
    arduino_nano_33_iot: "Arduino Nano 33 IoT",
    rpi_pico: "Raspberry Pi Pico",
  };
  return labels[hardware] || hardware;
}

export function getLanguageLabel(language: string): string {
  const labels: Record<string, string> = {
    arduino: "Arduino C++",
    micropython: "MicroPython",
    both: "Arduino + MicroPython",
  };
  return labels[language] || language;
}
