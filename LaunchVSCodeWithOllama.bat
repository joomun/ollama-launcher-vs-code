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

echo Select a model from the list:
set /p MODEL_CHOICE=Enter the number of the model you want to use: 

if "%MODEL_CHOICE%"=="1" (
    set MODEL=qwen2.5-coder:7b
) else if "%MODEL_CHOICE%"=="2" (
    set MODEL=qwen2.5-coder:34b
) else if "%MODEL_CHOICE%"=="3" (
    set MODEL=qwen2.5-coder:10b
) else (
    echo Invalid choice, using default model.
)

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