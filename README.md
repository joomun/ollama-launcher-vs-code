# Ollama Ultimate UI

A complete desktop application for managing and interacting with local Ollama AI models. It provides an intuitive interface to discover, download, run, monitor, and chat with models, all while respecting your hardware capabilities.

## Features

- Model Management: View installed models, download new ones, and delete unused models.
- Smart Recommendations: Detects your CPU, RAM, and GPU VRAM to suggest suitable models for tasks like coding, general chat, or advanced reasoning.
- Real-time Resource Monitoring: Live graphs of CPU, RAM, and VRAM usage.
- Start / Stop Models: Load models into memory (start) or unload them (stop) directly from the UI.
- Running Models Indicator: See which models are currently active in Ollama.
- Chat Interface: Have conversations with any loaded model, with markdown support.
- Ollama Log Viewer: Watch the Ollama server log in real time to see all activity (including requests from VS Code, Copilot, or any other client).
- Configuration: Adjust Ollama connection settings and hardware utilization (number of GPU layers, CPU threads).
- Cross-platform: Works on Windows, macOS, and Linux (tested on Windows).

## Prerequisites

- Node.js (version 18 or later)
- Ollama backend installed and running on your machine
  - Download from [ollama.com](https://ollama.com/)
  - Ensure the Ollama service is active (default API endpoint `http://localhost:11434`)

## Installation

1. Clone or download this repository.

2. Open a terminal in the project folder.

3. Install dependencies:
   ```bash
   npm install