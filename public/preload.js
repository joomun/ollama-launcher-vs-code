const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // System
  getSystemSpecs: () => ipcRenderer.invoke('get-system-specs'),
  getCurrentResources: () => ipcRenderer.invoke('get-current-resources'),

  // Check if Ollama is reachable
  checkOllama: async () => {
    try {
      const res = await fetch('http://localhost:11434/api/tags');
      return res.ok;
    } catch {
      return false;
    }
  },

  // Model management
  fetchModels: () => fetch('http://localhost:11434/api/tags').then(res => res.json()),
  
  // Robust pullModel with full error handling
  pullModel: async (modelName) => {
    const response = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    });
    // Get response as text for debugging
    const text = await response.text();
    // If not OK, throw with the response text
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
    }
    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON response from Ollama. Is Ollama running? Response: ${text.substring(0, 200)}`);
    }
    if (data.error) throw new Error(data.error);
    return data;
  },

  deleteModel: (modelName) => fetch('http://localhost:11434/api/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName })
  }),
  getRunningModels: () => fetch('http://localhost:11434/api/ps').then(res => res.json()),
  startModel: (modelName) => fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName, prompt: 'Hello', stream: false })
  }),
  stopModel: (modelName) => fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName, prompt: '', keep_alive: 0 })
  }),

  // Chat
  generateChat: (model, messages) => fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false })
  }).then(res => res.json()),

  // Logging
  getOllamaLogs: (numLines) => ipcRenderer.invoke('get-ollama-logs', numLines),
  startLogWatcher: () => ipcRenderer.invoke('start-log-watcher'),
  stopLogWatcher: () => ipcRenderer.invoke('stop-log-watcher'),
  onNewLogLine: (callback) => {
    ipcRenderer.on('new-log-line', (event, line) => callback(line));
    return () => ipcRenderer.removeAllListeners('new-log-line');
  }
});