const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const si = require('systeminformation');
const fs = require('fs');
const os = require('os');
const { EventEmitter } = require('events');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'build/icon.ico')
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../build/index.html')}`;
  mainWindow.loadURL(startUrl);

  if (process.env.ELECTRON_START_URL) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// --- Hardware Detection IPC Handlers ---
ipcMain.handle('get-system-specs', async () => {
  try {
    const cpu = await si.cpu();
    const mem = await si.mem();
    const graphics = await si.graphics();
    const gpuInfo = graphics.controllers.map(gpu => ({
      name: gpu.model,
      vram: gpu.vram,
      vendor: gpu.vendor
    }));
    return {
      cpu: { manufacturer: cpu.manufacturer, brand: cpu.brand, cores: cpu.cores },
      ram: { total: mem.total, free: mem.free, used: mem.active },
      gpu: gpuInfo,
      os: await si.osInfo()
    };
  } catch (error) {
    console.error("Failed to get system specs:", error);
    return { error: error.message };
  }
});

ipcMain.handle('get-current-resources', async () => {
  try {
    const cpuLoad = await si.currentLoad();
    const memLoad = await si.mem();
    const graphics = await si.graphics();
    let gpuLoad = null;
    if (graphics.controllers && graphics.controllers.length > 0) {
      if (graphics.controllers[0].memoryUsed) {
        gpuLoad = {
          used: graphics.controllers[0].memoryUsed,
          total: graphics.controllers[0].memoryTotal
        };
      }
    }
    return {
      cpu: { currentLoad: cpuLoad.currentLoad },
      ram: { used: memLoad.active, total: memLoad.total },
      vram: gpuLoad
    };
  } catch (error) {
    console.error("Failed to get live resources:", error);
    return { error: error.message };
  }
});

// --- Ollama Log Handling ---
const ollamaLogPath = path.join(os.homedir(), '.ollama', 'logs', 'server.log');
let logWatcher = null;
let logEmitter = new EventEmitter();

function tailFile(filePath, numLines = 200) {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) return reject(err);
      const bufferSize = Math.min(stats.size, 1024 * 50);
      const buffer = Buffer.alloc(bufferSize);
      fs.open(filePath, 'r', (err, fd) => {
        if (err) return reject(err);
        const startPos = Math.max(0, stats.size - bufferSize);
        fs.read(fd, buffer, 0, bufferSize, startPos, (err, bytesRead, bufferOut) => {
          fs.close(fd, () => {});
          if (err) return reject(err);
          const content = bufferOut.toString('utf8');
          const lines = content.split(/\r?\n/);
          const lastLines = lines.slice(-numLines);
          resolve(lastLines);
        });
      });
    });
  });
}

function watchLogFile() {
  if (logWatcher) return;
  let lastSize = 0;
  fs.stat(ollamaLogPath, (err, stats) => {
    if (!err) lastSize = stats.size;
  });
  logWatcher = fs.watch(ollamaLogPath, (eventType) => {
    if (eventType === 'change') {
      fs.stat(ollamaLogPath, (err, stats) => {
        if (err) return;
        if (stats.size > lastSize) {
          const stream = fs.createReadStream(ollamaLogPath, { start: lastSize, encoding: 'utf8' });
          let newContent = '';
          stream.on('data', chunk => newContent += chunk);
          stream.on('end', () => {
            const lines = newContent.split(/\r?\n/).filter(l => l.trim());
            lines.forEach(line => logEmitter.emit('new-log', line));
            lastSize = stats.size;
          });
        } else {
          lastSize = stats.size;
        }
      });
    }
  });
  logWatcher.on('error', (err) => console.error('Log watcher error:', err));
}

ipcMain.handle('get-ollama-logs', async (event, numLines = 200) => {
  try {
    const lines = await tailFile(ollamaLogPath, numLines);
    return { success: true, lines };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('start-log-watcher', () => {
  watchLogFile();
  return { success: true };
});

ipcMain.handle('stop-log-watcher', () => {
  if (logWatcher) {
    logWatcher.close();
    logWatcher = null;
  }
  return { success: true };
});

ipcMain.on('subscribe-logs', (event) => {
  const listener = (line) => {
    event.sender.send('new-log-line', line);
  };
  logEmitter.on('new-log', listener);
  event.sender.on('destroyed', () => {
    logEmitter.off('new-log', listener);
  });
});