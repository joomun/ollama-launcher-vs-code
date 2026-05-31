@echo off
title Ollama Dev Environment (Pro)

cd /d %~dp0

echo ===============================
echo  OLLAMA CONTROL CENTER START
echo ===============================

REM -------------------------------
REM Check Ollama
REM -------------------------------
tasklist | find /I "ollama.exe" >nul
if errorlevel 1 (
    echo Starting Ollama...
    start "" "%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
    timeout /t 5 >nul
) else (
    echo Ollama already running.
)

REM -------------------------------
REM Start Proxy (logging server)
REM -------------------------------
echo Starting Proxy Monitor...
start "" python proxy.py

timeout /t 2 >nul

REM -------------------------------
REM Start GUI
REM -------------------------------
echo Starting GUI...
start "" python Python_Interface.py

echo ===============================
echo System Ready
echo ===============================
pause