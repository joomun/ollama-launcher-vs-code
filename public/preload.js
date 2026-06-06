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
  },
  getModelRecommendations: async (systemInfo, task) => {
  const prompt = `You are an AI model selection expert. Based on the following system specifications and user task, recommend 4 suitable Ollama models from the list below. Return ONLY a JSON array with objects containing: name, reason. Available models: llama3.2:3b (3B, needs 2GB VRAM, 4GB RAM), llama3.2:7b (7B, needs 6GB VRAM, 8GB RAM), mistral:7b (7B, needs 6GB VRAM, 8GB RAM), deepseek-coder:6.7b (6.7B, needs 6GB VRAM, 8GB RAM, best for coding), codellama:7b (7B, needs 6GB VRAM, 8GB RAM), llama3.1:8b (8B, needs 8GB VRAM, 12GB RAM), phi3:mini (3.8B, needs 2GB VRAM, 4GB RAM), qwen2.5:7b (7B, needs 6GB VRAM, 8GB RAM), tinyllama:1.1b (1.1B, needs 0.5GB VRAM, 2GB RAM). System: CPU ${systemInfo.cpu.cores} cores, free RAM ${systemInfo.freeRamGB} GB, GPU VRAM ${systemInfo.freeVramGB} GB (${systemInfo.hasGpu ? 'available' : 'not available'}). Task: ${task}. Consider hardware limits and task relevance.`;
  
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'phi3:mini',
      prompt: prompt,
      stream: false,
      options: { temperature: 0.3, num_predict: 500 }
    })
  });
  const data = await response.json();
  try {
    // Extract JSON from response
    const jsonMatch = data.response.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return [];
  } catch (e) {
    console.error('Failed to parse AI recommendation', e);
    return [];
  }
}
});