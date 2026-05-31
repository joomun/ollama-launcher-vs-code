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
import { OllamaModel, SystemSpecs } from '../types';

interface ModelsPanelProps {
  models: OllamaModel[];
  systemSpecs: SystemSpecs | null;
  onRefresh: () => void;
  addLog: (action: string, model: string, status: string, details?: string) => void;
}

interface RunningModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details?: any;
}

const ModelsPanel: React.FC<ModelsPanelProps> = ({ models, systemSpecs, onRefresh, addLog }) => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [runningModels, setRunningModels] = useState<RunningModel[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Fetch running models from Ollama
  const fetchRunningModels = async () => {
    try {
      const data = await window.electronAPI.getRunningModels();
      setRunningModels(data.models || []);
    } catch (error) {
      console.error("Failed to fetch running models", error);
    }
  };

  // Poll running models every 5 seconds
  useEffect(() => {
    fetchRunningModels();
    const interval = setInterval(fetchRunningModels, 5000);
    return () => clearInterval(interval);
  }, []);

  // Generate hardware-based recommendations
  useEffect(() => {
    if (systemSpecs) {
      generateRecommendations();
    }
  }, [systemSpecs, models]);

  const generateRecommendations = () => {
    const vramTotal = systemSpecs?.gpu.reduce((acc, gpu) => acc + (gpu.vram || 0), 0) || 0;
    const ramTotal = systemSpecs?.ram.total || 0;
    const recommended = [];

    if (vramTotal >= 8) {
      recommended.push({ name: 'llama3.2:7b', task: 'General Chat', reason: 'Excellent all-rounder for 8GB+ VRAM.', vram: 8 });
    }
    if (vramTotal >= 6) {
      recommended.push({ name: 'deepseek-coder:6.7b', task: 'Coding', reason: 'Strong coding assistant for mid-range GPUs.', vram: 6 });
    }
    if (ramTotal >= 16) {
      recommended.push({ name: 'mistral:7b', task: 'General Chat', reason: 'Fast and efficient for CPU/GPU mixing.', ram: 16 });
    }
    if (vramTotal >= 12) {
      recommended.push({ name: 'llama3.1:8b', task: 'Advanced Reasoning', reason: 'Great for complex tasks on 12GB+ VRAM.', vram: 12 });
    }
    setRecommendations(recommended);
  };

  const handlePullModel = async (modelName: string) => {
    setDownloading(modelName);
    addLog('DOWNLOAD', modelName, 'started');
    try {
      await window.electronAPI.pullModelStream(modelName, (percent: number) => {
        setDownloadProgress(prev => ({ ...prev, [modelName]: percent }));
      });
      addLog('DOWNLOAD', modelName, 'success');
      onRefresh();
    } catch (error: any) {
      console.error("Failed to pull model", error);
      addLog('DOWNLOAD', modelName, 'failed', error.message);
    } finally {
      setDownloading(null);
      // Clear progress after 2 seconds
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newState = { ...prev };
          delete newState[modelName];
          return newState;
        });
      }, 2000);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${modelName}?`)) return;
    addLog('DELETE', modelName, 'started');
    try {
      await window.electronAPI.deleteModel(modelName);
      addLog('DELETE', modelName, 'success');
      onRefresh();
    } catch (error: any) {
      addLog('DELETE', modelName, 'failed', error.message);
    }
  };

  const handleStartModel = async (modelName: string) => {
    setLoadingAction(`start-${modelName}`);
    addLog('START', modelName, 'started');
    try {
      await window.electronAPI.startModel(modelName);
      addLog('START', modelName, 'success');
      setTimeout(fetchRunningModels, 1000);
    } catch (error: any) {
      console.error("Failed to start model", error);
      addLog('START', modelName, 'failed', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStopModel = async (modelName: string) => {
    setLoadingAction(`stop-${modelName}`);
    addLog('STOP', modelName, 'started');
    try {
      await window.electronAPI.stopModel(modelName);
      addLog('STOP', modelName, 'success');
      setTimeout(fetchRunningModels, 1000);
    } catch (error: any) {
      console.error("Failed to stop model", error);
      addLog('STOP', modelName, 'failed', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  if (!systemSpecs) {
    return <LinearProgress />;
  }

  const isModelRunning = (modelName: string) => {
    return runningModels.some(m => m.name === modelName);
  };

  return (
    <Box>
      {/* Running Models Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
        🟢 Running Models
        <IconButton size="small" onClick={fetchRunningModels} sx={{ ml: 1 }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Typography>
      {runningModels.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>No models are currently loaded in memory. Start one below.</Alert>
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {runningModels.map((model) => (
            <Grid size={{ xs: 12, md: 4 }} key={model.name}>
              <Card variant="outlined" sx={{ borderColor: 'success.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{model.name}</Typography>
                    <Tooltip title="Stop this model">
                      <IconButton 
                        color="error" 
                        onClick={() => handleStopModel(model.name)}
                        disabled={loadingAction === `stop-${model.name}`}
                      >
                        {loadingAction === `stop-${model.name}` ? <LinearProgress sx={{ width: 24 }} /> : <StopIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Size: {(model.size / (1024 ** 3)).toFixed(2)} GB
                  </Typography>
                  <Chip label="ACTIVE" color="success" size="small" sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Smart Recommendations */}
      <Typography variant="h5" gutterBottom>💡 Smart Model Recommendations</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {recommendations.map((rec, idx) => (
          <Grid size={{ xs: 12, md: 3 }} key={idx}>
            <Card>
              <CardContent>
                <Typography variant="h6">{rec.name}</Typography>
                <Typography color="textSecondary" gutterBottom>Best for: {rec.task}</Typography>
                <Typography variant="body2">{rec.reason}</Typography>
                {downloading === rec.name ? (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="determinate" value={downloadProgress[rec.name] || 0} />
                    <Typography variant="caption">{Math.round(downloadProgress[rec.name] || 0)}%</Typography>
                  </Box>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={() => handlePullModel(rec.name)}
                  >
                    Download & Use
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Installed Models with Start/Stop buttons */}
      <Typography variant="h5" gutterBottom>📦 Your Installed Models</Typography>
      <Grid container spacing={2}>
        {models.map((model) => {
          const running = isModelRunning(model.name);
          return (
            <Grid size={{ xs: 12, md: 6 }} key={model.name}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{model.name}</Typography>
                    <Box>
                      <Tooltip title={running ? "Stop model" : "Start model"}>
                        <IconButton
                          onClick={() => running ? handleStopModel(model.name) : handleStartModel(model.name)}
                          disabled={loadingAction === `start-${model.name}` || loadingAction === `stop-${model.name}`}
                          color={running ? "error" : "success"}
                        >
                          {loadingAction === `start-${model.name}` || loadingAction === `stop-${model.name}` ? (
                            <LinearProgress sx={{ width: 24 }} />
                          ) : running ? (
                            <StopIcon />
                          ) : (
                            <PlayArrowIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete model">
                        <IconButton onClick={() => handleDeleteModel(model.name)} size="small">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Size: {(model.size / (1024 ** 3)).toFixed(2)} GB | Modified: {new Date(model.modified_at).toLocaleString()}
                  </Typography>
                  {model.details && (
                    <Typography variant="body2" color="textSecondary">
                      Parameters: {model.details.parameter_size} | Quantization: {model.details.quantization_level}
                    </Typography>
                  )}
                  <Box sx={{ mt: 2 }}>
                    {running ? (
                      <Chip label="RUNNING" color="success" size="small" />
                    ) : (
                      <Chip label="Stopped" color="default" size="small" />
                    )}
                  </Box>
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