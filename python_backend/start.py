#!/usr/bin/env python3
"""
Startup script for the Python Communication Backend
"""

import sys
import subprocess
import os
from pathlib import Path

# Load .env FIRST before anything else and export to environment
from dotenv import load_dotenv, dotenv_values
env_path = Path(__file__).parent.parent / ".env"

# Load values and set them in os.environ explicitly
env_values = dotenv_values(env_path)
for key, value in env_values.items():
    if value:
        os.environ[key] = value

print(f"[ENV] Loaded .env from: {env_path.absolute()}")
print(f"[ENV] NVIDIA_API_KEY set: {bool(os.environ.get('NVIDIA_API_KEY'))}")

def check_dependencies():
    """Check if required packages are installed"""
    required = ['fastapi', 'uvicorn', 'serial', 'paho.mqtt']
    missing = []
    
    for package in required:
        try:
            __import__(package.replace('.', '_'))
        except ImportError:
            missing.append(package)
    
    if missing:
        print(f"Missing packages: {', '.join(missing)}")
        print("Installing dependencies...")
        subprocess.check_call([
            sys.executable, '-m', 'pip', 'install', '-r', 
            os.path.join(os.path.dirname(__file__), 'requirements.txt')
        ])
        print("Dependencies installed!")

def main():
    """Start the FastAPI server"""
    check_dependencies()
    
    import uvicorn
    
    print("=" * 50)
    print("µCodeLab Python Communication Backend")
    print("=" * 50)
    print()
    print("Starting server on http://localhost:8001")
    print("API docs available at http://localhost:8001/docs")
    print()
    print("Press Ctrl+C to stop")
    print("=" * 50)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
        log_level="info",
        access_log=True
    )

if __name__ == "__main__":
    main()
