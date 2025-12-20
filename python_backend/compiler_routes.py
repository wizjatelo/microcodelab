"""
Compiler Routes for µCodeLab
Arduino CLI and MicroPython mpy-cross compilation
"""

import os
import uuid
import shutil
import asyncio
import tempfile
import logging
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Compilers"])

# Configuration
ARDUINO_CLI_PATH = os.getenv("ARDUINO_CLI_PATH", "arduino-cli")
MPY_CROSS_PATH = os.getenv("MPY_CROSS_PATH", "mpy-cross")

# Board FQBN mappings
BOARD_FQBNS = {
    "arduino_uno": "arduino:avr:uno",
    "arduino_nano": "arduino:avr:nano",
    "arduino_mega": "arduino:avr:mega",
    "esp32": "esp32:esp32:esp32",
    "esp8266": "esp8266:esp8266:nodemcu",
    "raspberry_pi_pico": "rp2040:rp2040:rpipico",
}


# ============== Request/Response Models ==============

class ArduinoCompileRequest(BaseModel):
    code: str
    boardType: str = "arduino_uno"
    fileName: str = "sketch.ino"


class ArduinoUploadRequest(BaseModel):
    code: str
    port: str
    boardType: str = "arduino_uno"
    fileName: str = "sketch.ino"


class MpyCompileRequest(BaseModel):
    code: str
    fileName: str = "main.py"


class MpyValidateRequest(BaseModel):
    code: str


class CompileResult(BaseModel):
    success: bool
    output: str
    errors: List[str] = []
    warnings: List[str] = []
    binarySize: Optional[int] = None


class UploadResult(BaseModel):
    success: bool
    output: str
    error: Optional[str] = None


class BoardInfo(BaseModel):
    fqbn: str
    name: str
    port: Optional[str] = None


# ============== Helper Functions ==============

async def run_command(cmd: str, timeout: int = 120) -> tuple[str, str, int]:
    """Run a shell command asynchronously"""
    try:
        process = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=timeout
        )
        return (
            stdout.decode("utf-8", errors="replace"),
            stderr.decode("utf-8", errors="replace"),
            process.returncode or 0
        )
    except asyncio.TimeoutError:
        process.kill()
        raise HTTPException(504, "Command timed out")
    except Exception as e:
        raise HTTPException(500, str(e))


def extract_errors(output: str) -> List[str]:
    """Extract error messages from compiler output"""
    errors = []
    for line in output.split("\n"):
        if "error:" in line.lower() or "Error:" in line:
            errors.append(line.strip())
    return errors


def extract_warnings(output: str) -> List[str]:
    """Extract warning messages from compiler output"""
    warnings = []
    for line in output.split("\n"):
        if "warning:" in line.lower() or "Warning:" in line:
            warnings.append(line.strip())
    return warnings


# ============== Arduino Routes ==============

@router.get("/api/arduino/status")
async def arduino_status():
    """Check if Arduino CLI is installed"""
    try:
        stdout, stderr, code = await run_command(f"{ARDUINO_CLI_PATH} version", timeout=10)
        if code == 0:
            import re
            version_match = re.search(r'(\d+\.\d+\.\d+)', stdout)
            return {
                "installed": True,
                "version": version_match.group(1) if version_match else "unknown"
            }
        return {"installed": False, "error": stderr or "Arduino CLI not found"}
    except Exception as e:
        return {
            "installed": False,
            "error": "Arduino CLI not found. Install it from https://arduino.github.io/arduino-cli/"
        }


@router.get("/api/arduino/boards")
async def list_arduino_boards():
    """List connected Arduino boards"""
    try:
        stdout, stderr, code = await run_command(
            f"{ARDUINO_CLI_PATH} board list --format json",
            timeout=15
        )
        if code != 0:
            return {"boards": []}
        
        import json
        data = json.loads(stdout)
        boards = []
        
        for port in data.get("detected_ports", []):
            matching = port.get("matching_boards", [])
            if matching and port.get("port", {}).get("address"):
                boards.append(BoardInfo(
                    fqbn=matching[0].get("fqbn", ""),
                    name=matching[0].get("name", "Unknown Board"),
                    port=port["port"]["address"]
                ))
        
        return {"boards": boards}
    except Exception as e:
        logger.error(f"Error listing boards: {e}")
        return {"boards": []}


@router.post("/api/arduino/compile")
async def compile_arduino(request: ArduinoCompileRequest):
    """Compile Arduino sketch"""
    build_id = str(uuid.uuid4())
    temp_dir = Path(tempfile.gettempdir()) / "ucodelab-builds" / build_id
    sketch_dir = temp_dir / "sketch"
    output_dir = temp_dir / "output"

    try:
        # Create directories
        sketch_dir.mkdir(parents=True, exist_ok=True)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Write sketch file
        sketch_file = sketch_dir / request.fileName
        sketch_file.write_text(request.code, encoding="utf-8")

        # Get FQBN
        fqbn = BOARD_FQBNS.get(request.boardType, BOARD_FQBNS["arduino_uno"])

        # Compile
        cmd = f'{ARDUINO_CLI_PATH} compile --fqbn {fqbn} --output-dir "{output_dir}" "{sketch_dir}"'
        logger.info(f"[arduino] Compiling: {cmd}")

        stdout, stderr, code = await run_command(cmd, timeout=120)
        output = stdout + stderr

        if code == 0:
            # Get binary size
            import re
            size_match = re.search(r'Sketch uses (\d+) bytes', output)
            binary_size = int(size_match.group(1)) if size_match else None

            return CompileResult(
                success=True,
                output=output,
                errors=[],
                warnings=extract_warnings(output),
                binarySize=binary_size
            )
        else:
            return CompileResult(
                success=False,
                output=output,
                errors=extract_errors(output),
                warnings=extract_warnings(output)
            )

    except Exception as e:
        logger.error(f"Compilation error: {e}")
        return CompileResult(
            success=False,
            output=str(e),
            errors=[str(e)]
        )
    finally:
        # Cleanup
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except:
            pass


@router.post("/api/arduino/upload")
async def upload_arduino(request: ArduinoUploadRequest):
    """Compile and upload Arduino sketch to board"""
    build_id = str(uuid.uuid4())
    temp_dir = Path(tempfile.gettempdir()) / "ucodelab-builds" / build_id
    sketch_dir = temp_dir / "sketch"

    try:
        # Create directories
        sketch_dir.mkdir(parents=True, exist_ok=True)

        # Write sketch file
        sketch_file = sketch_dir / request.fileName
        sketch_file.write_text(request.code, encoding="utf-8")

        # Get FQBN
        fqbn = BOARD_FQBNS.get(request.boardType, BOARD_FQBNS["arduino_uno"])

        # Compile and upload
        cmd = f'{ARDUINO_CLI_PATH} compile --fqbn {fqbn} -u -p {request.port} "{sketch_dir}"'
        logger.info(f"[arduino] Uploading: {cmd}")

        stdout, stderr, code = await run_command(cmd, timeout=180)
        output = stdout + stderr

        if code == 0:
            return UploadResult(success=True, output=output)
        else:
            return UploadResult(
                success=False,
                output=output,
                error="\n".join(extract_errors(output)) or "Upload failed"
            )

    except Exception as e:
        logger.error(f"Upload error: {e}")
        return UploadResult(success=False, output="", error=str(e))
    finally:
        # Cleanup
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except:
            pass


# ============== MicroPython Routes ==============

@router.get("/api/micropython/status")
async def micropython_status():
    """Check if mpy-cross is installed"""
    try:
        stdout, stderr, code = await run_command(f"{MPY_CROSS_PATH} --version", timeout=10)
        if code == 0:
            import re
            version_match = re.search(r'(\d+\.\d+)', stdout)
            return {
                "installed": True,
                "version": version_match.group(1) if version_match else "unknown"
            }
        return {"installed": False, "error": stderr or "mpy-cross not found"}
    except Exception as e:
        return {
            "installed": False,
            "error": "mpy-cross not found. Install with: pip install mpy-cross"
        }


@router.post("/api/micropython/compile")
async def compile_micropython(request: MpyCompileRequest):
    """Compile Python to .mpy bytecode"""
    build_id = str(uuid.uuid4())
    temp_dir = Path(tempfile.gettempdir()) / "ucodelab-mpy" / build_id

    try:
        # Create directory
        temp_dir.mkdir(parents=True, exist_ok=True)

        # Write Python file
        py_file = temp_dir / request.fileName
        py_file.write_text(request.code, encoding="utf-8")

        # Output file
        mpy_filename = request.fileName.replace(".py", ".mpy")
        mpy_file = temp_dir / mpy_filename

        # Compile
        cmd = f'{MPY_CROSS_PATH} -o "{mpy_file}" "{py_file}"'
        logger.info(f"[mpy-cross] Compiling: {cmd}")

        stdout, stderr, code = await run_command(cmd, timeout=30)

        if code == 0 and mpy_file.exists():
            # Read binary
            import base64
            binary = mpy_file.read_bytes()
            
            return {
                "success": True,
                "binaryBase64": base64.b64encode(binary).decode("utf-8"),
                "fileName": mpy_filename,
                "originalSize": len(request.code),
                "compiledSize": len(binary)
            }
        else:
            return {
                "success": False,
                "fileName": mpy_filename,
                "originalSize": len(request.code),
                "error": stderr or stdout or "Compilation failed"
            }

    except Exception as e:
        logger.error(f"[mpy-cross] Compilation error: {e}")
        return {
            "success": False,
            "fileName": request.fileName.replace(".py", ".mpy"),
            "originalSize": len(request.code),
            "error": str(e)
        }
    finally:
        # Cleanup
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except:
            pass


@router.post("/api/micropython/validate")
async def validate_micropython(request: MpyValidateRequest):
    """Validate Python syntax"""
    build_id = str(uuid.uuid4())
    temp_dir = Path(tempfile.gettempdir()) / "ucodelab-mpy" / build_id

    try:
        # Create directory
        temp_dir.mkdir(parents=True, exist_ok=True)

        # Write Python file
        py_file = temp_dir / "check.py"
        py_file.write_text(request.code, encoding="utf-8")

        # Validate syntax using Python
        cmd = f'python -m py_compile "{py_file}"'
        stdout, stderr, code = await run_command(cmd, timeout=10)

        if code == 0:
            return {"valid": True}
        else:
            import re
            error_msg = stderr or stdout or ""
            line_match = re.search(r'line (\d+)', error_msg)
            return {
                "valid": False,
                "error": error_msg,
                "line": int(line_match.group(1)) if line_match else None
            }

    except Exception as e:
        return {"valid": False, "error": str(e)}
    finally:
        # Cleanup
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except:
            pass
