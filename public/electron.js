const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // System
  getSystemSpecs: () => ipcRenderer.invoke('get-system-specs'),
  getCurrentResources: () => ipcRenderer.invoke('get-current-resources'),

  // Model management
  fetchModels: () => fetch('http://localhost:11434/api/tags').then(res => res.json()),
  pullModel: (modelName) => fetch('http://localhost:11434/api/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName })
  }).then(res => res.json()),
  pullModelStream: async (modelName, onProgress) => {
    const response = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true })
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const data = JSON.parse(line);
          if (data.completed && data.total) {
            onProgress((data.completed / data.total) * 100);
          }
          if (data.status === 'success') onProgress(100);
        }
      }
    }
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