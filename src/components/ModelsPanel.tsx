import React, { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Button, Chip, Box, LinearProgress,
  IconButton, Tooltip, Alert, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadDialog from './DownloadDialog';
import { OllamaModel, SystemSpecs } from '../types';

interface ModelsPanelProps {
  models: OllamaModel[];
  systemSpecs: SystemSpecs | null;
  onRefresh: () => void;
  addLog: (action: string, model: string, status: string, details?: string) => void;
}

interface RunningModel { name: string; model: string; size: number; digest: string; details?: any; }

const ModelsPanel: React.FC<ModelsPanelProps> = ({ models, systemSpecs, onRefresh, addLog }) => {
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
    if (systemSpecs) generateRecommendations();
  }, [systemSpecs, models]);

  const generateRecommendations = () => {
    const vramTotal = systemSpecs?.gpu.reduce((acc, gpu) => acc + (gpu.vram || 0), 0) || 0;
    const ramTotal = systemSpecs?.ram.total || 0;
    const recommended = [];
    if (vramTotal >= 8) recommended.push({ name: 'llama3.2:7b', task: 'General Chat', reason: 'Excellent all-rounder for 8GB+ VRAM.' });
    if (vramTotal >= 6) recommended.push({ name: 'deepseek-coder:6.7b', task: 'Coding', reason: 'Strong coding assistant for mid-range GPUs.' });
    if (ramTotal >= 16) recommended.push({ name: 'mistral:7b', task: 'General Chat', reason: 'Fast and efficient for CPU/GPU mixing.' });
    if (vramTotal >= 12) recommended.push({ name: 'llama3.1:8b', task: 'Advanced Reasoning', reason: 'Great for complex tasks on 12GB+ VRAM.' });
    setRecommendations(recommended);
  };

  const handlePullModel = async (modelName: string) => {
    // First check if Ollama is running
    const isOllamaRunning = await window.electronAPI.checkOllama();
    if (!isOllamaRunning) {
      setDownloadState({
        open: true,
        modelName,
        isDownloading: false,
        isComplete: false,
        hasError: true,
        errorMessage: 'Ollama is not running. Please start Ollama first (run "ollama serve" in terminal or start from system tray).'
      });
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
      console.error('Download error:', error);
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

  if (!systemSpecs) return <LinearProgress />;

  const isModelRunning = (name: string) => runningModels.some(m => m.name === name);

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

      <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>🟢 Running Models
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

      <Divider sx={{ my: 3 }} />

      <Typography variant="h5" gutterBottom>💡 Smart Model Recommendations</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {recommendations.map((rec, idx) => (
          <Grid size={{ xs: 12, md: 3 }} key={idx}>
            <Card>
              <CardContent>
                <Typography variant="h6">{rec.name}</Typography>
                <Typography color="textSecondary" gutterBottom>Best for: {rec.task}</Typography>
                <Typography variant="body2">{rec.reason}</Typography>
                <Button variant="contained" size="small" sx={{ mt: 2 }} startIcon={<DownloadIcon />} onClick={() => handlePullModel(rec.name)}>Download & Use</Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" gutterBottom>📦 Your Installed Models</Typography>
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