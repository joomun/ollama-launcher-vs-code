import React, { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Button, Chip, Box, LinearProgress,
  IconButton, Tooltip, Alert, Divider, FormControl, InputLabel, Select, MenuItem,
  Paper
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadDialog from './DownloadDialog';
import { OllamaModel, SystemSpecs, SystemResources } from '../types';

interface ModelsPanelProps {
  models: OllamaModel[];
  systemSpecs: SystemSpecs | null;
  resources: SystemResources | null;
  onRefresh: () => void;
  addLog: (action: string, model: string, status: string, details?: string) => void;
}

interface RunningModel { name: string; model: string; size: number; digest: string; details?: any; }

const MODEL_CATALOG = [
  { name: 'llama3.2:3b', task: 'General Chat', vramRequired: 2, ramRequired: 4, sizeGB: 2.0, description: 'Fast, lightweight, good for basic conversations' },
  { name: 'llama3.2:7b', task: 'General Chat', vramRequired: 6, ramRequired: 8, sizeGB: 4.5, description: 'Excellent all-rounder for most tasks' },
  { name: 'mistral:7b', task: 'General Chat', vramRequired: 6, ramRequired: 8, sizeGB: 4.1, description: 'Efficient and capable' },
  { name: 'deepseek-coder:6.7b', task: 'Coding', vramRequired: 6, ramRequired: 8, sizeGB: 3.8, description: 'Specialized for code generation' },
  { name: 'codellama:7b', task: 'Coding', vramRequired: 6, ramRequired: 8, sizeGB: 3.8, description: 'Meta\'s code model' },
  { name: 'llama3.1:8b', task: 'Advanced Reasoning', vramRequired: 8, ramRequired: 12, sizeGB: 4.7, description: 'Strong reasoning and complex tasks' },
  { name: 'phi3:mini', task: 'General Chat', vramRequired: 2, ramRequired: 4, sizeGB: 2.3, description: 'Very small but capable' },
  { name: 'qwen2.5:7b', task: 'Multilingual', vramRequired: 6, ramRequired: 8, sizeGB: 4.2, description: 'Good for non-English languages' },
  { name: 'mixtral:8x7b', task: 'Advanced Reasoning', vramRequired: 16, ramRequired: 32, sizeGB: 24, description: 'Powerful MoE model (needs lots of VRAM)' },
  { name: 'nous-hermes:7b', task: 'Creative Writing', vramRequired: 6, ramRequired: 8, sizeGB: 4.1, description: 'Good for storytelling' }
];

const ModelsPanel: React.FC<ModelsPanelProps> = ({ models, systemSpecs, resources, onRefresh, addLog }) => {
  const [useCase, setUseCase] = useState<string>('General Chat');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [runningModels, setRunningModels] = useState<RunningModel[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<{ open: boolean; modelName: string; isDownloading: boolean; isComplete: boolean; hasError: boolean; errorMessage?: string }>({
    open: false, modelName: '', isDownloading: false, isComplete: false, hasError: false
  });

  const fetchRunningModels = async () => {
    try {
      const data = await window.electronAPI.getRunningModels();
      setRunningModels(data.models || []);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchRunningModels();
    const interval = setInterval(fetchRunningModels, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (systemSpecs && resources) {
      generateRecommendations();
    }
  }, [useCase, systemSpecs, resources, models]);

  const generateRecommendations = () => {
    const totalVram = systemSpecs?.gpu.reduce((acc, gpu) => acc + (gpu.vram || 0), 0) || 0;
    const freeRamGB = resources ? (resources.ram.total - resources.ram.used) / (1024 ** 3) : (systemSpecs?.ram.total || 0) / (1024 ** 3);
    let freeVramGB = totalVram;
    if (resources?.vram) {
      freeVramGB = (resources.vram.total - resources.vram.used) / (1024 ** 3);
    }
    const hasGpu = totalVram > 0;

    let candidates = MODEL_CATALOG.filter(m => m.task === useCase);
    if (candidates.length === 0) {
      candidates = MODEL_CATALOG.filter(m => m.task === 'General Chat');
    }

    const scored = candidates.map(model => {
      let score = 0;
      let suitable = true;
      if (hasGpu) {
        if (freeVramGB >= model.vramRequired) {
          score += 10;
        } else {
          suitable = false;
          score -= 10;
        }
      } else {
        if (model.vramRequired > 2) {
          suitable = false;
          score -= 10;
        } else {
          score += 5;
        }
      }
      if (freeRamGB >= model.ramRequired) {
        score += 5;
      } else {
        suitable = false;
        score -= 5;
      }
      if (freeRamGB < 8 && model.ramRequired <= 4) score += 3;
      if (freeVramGB < 8 && model.vramRequired <= 4) score += 3;
      const installed = models.some(m => m.name === model.name);
      return { ...model, score, suitable, installed };
    });

    let top = scored.filter(m => m.suitable || m.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
    if (top.length === 0) {
      top = scored.sort((a, b) => b.score - a.score).slice(0, 4);
    }
    setRecommendations(top);
  };

  const handlePullModel = async (modelName: string) => {
    if (models.some(m => m.name === modelName)) {
      setDownloadState({ open: true, modelName, isDownloading: false, isComplete: true, hasError: false });
      addLog('DOWNLOAD', modelName, 'already exists', 'Model already downloaded');
      return;
    }
    const isOllamaRunning = await window.electronAPI.checkOllama();
    if (!isOllamaRunning) {
      setDownloadState({ open: true, modelName, isDownloading: false, isComplete: false, hasError: true, errorMessage: 'Ollama is not running. Please start Ollama first.' });
      addLog('DOWNLOAD', modelName, 'failed', 'Ollama not running');
      return;
    }

    setDownloadState({ open: true, modelName, isDownloading: true, isComplete: false, hasError: false });
    addLog('DOWNLOAD', modelName, 'started');
    try {
      await window.electronAPI.pullModel(modelName);
      setDownloadState(prev => ({ ...prev, isDownloading: false, isComplete: true }));
      addLog('DOWNLOAD', modelName, 'success');
      onRefresh();
    } catch (error: any) {
      setDownloadState(prev => ({ ...prev, isDownloading: false, hasError: true, errorMessage: error.message }));
      addLog('DOWNLOAD', modelName, 'failed', error.message);
    }
  };

  const closeDialog = () => {
    setDownloadState(prev => ({ ...prev, open: false }));
    setTimeout(() => setDownloadState({ open: false, modelName: '', isDownloading: false, isComplete: false, hasError: false }), 500);
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!window.confirm(`Delete ${modelName}?`)) return;
    addLog('DELETE', modelName, 'started');
    try {
      await window.electronAPI.deleteModel(modelName);
      addLog('DELETE', modelName, 'success');
      onRefresh();
    } catch (error: any) { addLog('DELETE', modelName, 'failed', error.message); }
  };

  const handleStartModel = async (modelName: string) => {
    setLoadingAction(`start-${modelName}`);
    addLog('START', modelName, 'started');
    try {
      await window.electronAPI.startModel(modelName);
      addLog('START', modelName, 'success');
      setTimeout(fetchRunningModels, 1000);
    } catch (error: any) { addLog('START', modelName, 'failed', error.message); }
    finally { setLoadingAction(null); }
  };

  const handleStopModel = async (modelName: string) => {
    setLoadingAction(`stop-${modelName}`);
    addLog('STOP', modelName, 'started');
    try {
      await window.electronAPI.stopModel(modelName);
      addLog('STOP', modelName, 'success');
      setTimeout(fetchRunningModels, 1000);
    } catch (error: any) { addLog('STOP', modelName, 'failed', error.message); }
    finally { setLoadingAction(null); }
  };

  const handleManualRefresh = () => {
    onRefresh();
    generateRecommendations();
  };

  if (!systemSpecs || !resources) return <LinearProgress />;

  const isModelRunning = (name: string) => runningModels.some(m => m.name === name);
  const freeRamGB = (resources.ram.total - resources.ram.used) / (1024 ** 3);
  const totalVramGB = systemSpecs.gpu.reduce((acc, gpu) => acc + (gpu.vram || 0), 0);
  const freeVramGB = resources.vram ? (resources.vram.total - resources.vram.used) / (1024 ** 3) : totalVramGB;

  return (
    <Box>
      <DownloadDialog
        open={downloadState.open}
        modelName={downloadState.modelName}
        isDownloading={downloadState.isDownloading}
        isComplete={downloadState.isComplete}
        hasError={downloadState.hasError}
        errorMessage={downloadState.errorMessage}
        onClose={closeDialog}
      />

      <Paper sx={{ p: 2, mb: 3, bgcolor: '#2a2a2a' }}>
        <Typography variant="subtitle1" gutterBottom>Your Hardware</Typography>
        <Typography variant="body2">CPU: {systemSpecs.cpu.brand} ({systemSpecs.cpu.cores} cores)</Typography>
        <Typography variant="body2">Free RAM: {freeRamGB.toFixed(1)} GB / {(resources.ram.total / (1024**3)).toFixed(1)} GB</Typography>
        <Typography variant="body2">GPU VRAM: {totalVramGB > 0 ? `${totalVramGB.toFixed(0)} GB (free: ${freeVramGB.toFixed(1)} GB)` : 'None detected (CPU only)'}</Typography>
      </Paper>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>What will you use the AI for?</InputLabel>
        <Select value={useCase} onChange={(e) => setUseCase(e.target.value)} label="What will you use the AI for?">
          <MenuItem value="General Chat">General Chat</MenuItem>
          <MenuItem value="Coding">Coding Assistance</MenuItem>
          <MenuItem value="Advanced Reasoning">Advanced Reasoning / Analysis</MenuItem>
          <MenuItem value="Creative Writing">Creative Writing / Storytelling</MenuItem>
          <MenuItem value="Multilingual">Multilingual / Translation</MenuItem>
        </Select>
      </FormControl>

      <Typography variant="h5" gutterBottom>💡 Smart Model Recommendations for "{useCase}"</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {recommendations.length === 0 && (
          <Alert severity="info" sx={{ width: '100%' }}>No specific recommendations found. Check your hardware resources or try a different use case.</Alert>
        )}
        {recommendations.map((rec, idx) => (
          <Grid size={{ xs: 12, md: 3 }} key={idx}>
            <Card sx={{ opacity: rec.suitable ? 1 : 0.7 }}>
              <CardContent>
                <Typography variant="h6">{rec.name}</Typography>
                <Typography color="textSecondary" variant="caption">{rec.description}</Typography>
                <Box sx={{ my: 1 }}>
                  <Chip size="small" label={`VRAM: ${rec.vramRequired}GB`} />
                  <Chip size="small" label={`RAM: ${rec.ramRequired}GB`} sx={{ ml: 1 }} />
                </Box>
                <Typography variant="body2" color="textSecondary">
                  {rec.installed ? '✓ Already installed' : `Size: ${rec.sizeGB} GB`}
                </Typography>
                {!rec.suitable && (
                  <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                    ⚠️ Your system may not have enough resources for this model
                  </Typography>
                )}
                {rec.installed ? (
                  <Button variant="outlined" size="small" sx={{ mt: 2 }} disabled>Already Downloaded</Button>
                ) : (
                  <Button variant="contained" size="small" sx={{ mt: 2 }} startIcon={<DownloadIcon />} onClick={() => handlePullModel(rec.name)}>Download & Use</Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h5" gutterBottom>🟢 Running Models
        <IconButton size="small" onClick={fetchRunningModels} sx={{ ml: 1 }}><RefreshIcon fontSize="small" /></IconButton>
      </Typography>
      {runningModels.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>No models currently loaded.</Alert>
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {runningModels.map(model => (
            <Grid size={{ xs: 12, md: 4 }} key={model.name}>
              <Card variant="outlined" sx={{ borderColor: 'success.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{model.name}</Typography>
                    <IconButton color="error" onClick={() => handleStopModel(model.name)} disabled={loadingAction === `stop-${model.name}`}>
                      {loadingAction === `stop-${model.name}` ? <LinearProgress sx={{ width: 24 }} /> : <StopIcon />}
                    </IconButton>
                  </Box>
                  <Typography variant="body2">Size: {(model.size / (1024**3)).toFixed(2)} GB</Typography>
                  <Chip label="ACTIVE" color="success" size="small" sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Typography variant="h5" gutterBottom>
        📦 Your Installed Models
        <IconButton size="small" onClick={handleManualRefresh} sx={{ ml: 1 }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Typography>
      <Grid container spacing={2}>
        {models.map(model => {
          const running = isModelRunning(model.name);
          return (
            <Grid size={{ xs: 12, md: 6 }} key={model.name}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{model.name}</Typography>
                    <Box>
                      <IconButton onClick={() => running ? handleStopModel(model.name) : handleStartModel(model.name)} disabled={loadingAction === `start-${model.name}` || loadingAction === `stop-${model.name}`} color={running ? "error" : "success"}>
                        {loadingAction === `start-${model.name}` || loadingAction === `stop-${model.name}` ? <LinearProgress sx={{ width: 24 }} /> : (running ? <StopIcon /> : <PlayArrowIcon />)}
                      </IconButton>
                      <IconButton onClick={() => handleDeleteModel(model.name)}><DeleteIcon /></IconButton>
                    </Box>
                  </Box>
                  <Typography variant="body2">Size: {(model.size / (1024**3)).toFixed(2)} GB | Modified: {new Date(model.modified_at).toLocaleString()}</Typography>
                  {model.details && <Typography variant="body2">Parameters: {model.details.parameter_size} | Quantization: {model.details.quantization_level}</Typography>}
                  <Box sx={{ mt: 2 }}><Chip label={running ? "RUNNING" : "Stopped"} color={running ? "success" : "default"} size="small" /></Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default ModelsPanel;