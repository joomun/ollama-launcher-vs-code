const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemSpecs: () => ipcRenderer.invoke('get-system-specs'),
  getCurrentResources: () => ipcRenderer.invoke('get-current-resources'),
  // Ollama API calls
  fetchModels: () => fetch('http://localhost:11434/api/tags').then(res => res.json()),
  pullModel: (modelName) => fetch('http://localhost:11434/api/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName })
  }).then(res => res.json()),
  deleteModel: (modelName) => fetch('http://localhost:11434/api/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName })
  }),
  generateChat: (model, messages) => fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model, messages: messages, stream: false })
  }).then(res => res.json()),
  getRunningModels: () => fetch('http://localhost:11434/api/ps').then(res => res.json()),
  stopModel: (modelName) => fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    model: modelName, 
    prompt: '', 
    keep_alive: 0 
  }),
  getOllamaLogs: (numLines) => ipcRenderer.invoke('get-ollama-logs', numLines),
startLogWatcher: () => ipcRenderer.invoke('start-log-watcher'),
stopLogWatcher: () => ipcRenderer.invoke('stop-log-watcher'),
onNewLogLine: (callback) => {
  ipcRenderer.on('new-log-line', (event, line) => callback(line));
  return () => ipcRenderer.removeAllListeners('new-log-line');
}
})
});