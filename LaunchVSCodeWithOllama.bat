@echo off
title VS Code + Ollama Launcher

REM ============================================  
REM Configuration
REM ============================================  
set MODEL=qwen2.5-coder:7b
set VSCODE_PATH=%LocalAppData%\Programs\Microsoft VS Code\Code.exe

echo Checking Ollama service...

REM Check if Ollama is running
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I "ollama.exe" >NUL

if "%ERRORLEVEL%"=="0" (
    echo Ollama already running.
) else (
    echo Starting Ollama...
    start "" "%LocalAppData%\Programs\Ollama\ollama.exe"
    timeout /t 5 /nobreak >nul
)

echo Listing available models in Ollama...

REM List all available models in Ollama
start "Ollama Models" cmd /k ollama list

echo Waiting for model initialization...
timeout /t 10 /nobreak >nul

echo Launching VS Code...  

if exist "%VSCODE_PATH%" (
    start "" "%VSCODE_PATH%"
) else (
    echo VS Code not found at:
    echo %VSCODE_PATH%
    pause
)

exit