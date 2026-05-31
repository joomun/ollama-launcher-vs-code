@echo off
title Ollama Dev Environment

echo Starting Ollama Control System...

REM Start Ollama if not running
tasklist | find "ollama.exe" >nul
if errorlevel 1 (
    echo Starting Ollama...
    start "" "%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
    timeout /t 5 >nul
)

echo Starting Proxy Monitor...
start "" python proxy.py

timeout /t 2 >nul

echo Starting GUI...
start "" python Python_Interface.py

echo Done.
pause