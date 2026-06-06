import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid, Card, CardContent, Typography, Button, Chip, Box, LinearProgress,
  IconButton, Alert, Divider, TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { OllamaModel, SystemSpecs, SystemResources } from '../types';

interface ModelsPanelProps {
  models: OllamaModel[];
  systemSpecs: SystemSpecs | null;
  resources: SystemResources | null;
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

interface ModelCatalogEntry {
  name: string;
  description: string;
  parameterSize: string;
  diskSizeGB: number;
  vramRequiredGB: number;
  ramRequiredGB: number;
  task: string;
  quantization: string;
  popularity: number;
}

const MODEL_CATALOG: ModelCatalogEntry[] = [
  { name: 'llama3.2:3b', description: 'Fast, lightweight model for basic conversations', parameterSize: '3B', diskSizeGB: 2.0, vramRequiredGB: 2, ramRequiredGB: 4, task: 'General Chat', quantization: 'Q4_K_M', popularity: 95 },
  { name: 'llama3.2:7b', description: 'Excellent all-rounder for most tasks', parameterSize: '7B', diskSizeGB: 4.5, vramRequiredGB: 6, ramRequiredGB: 8, task: 'General Chat', quantization: 'Q4_K_M', popularity: 98 },
  { name: 'mistral:7b', description: 'Efficient and capable general model', parameterSize: '7B', diskSizeGB: 4.1, vramRequiredGB: 6, ramRequiredGB: 8, task: 'General Chat', quantization: 'Q4_0', popularity: 96 },
  { name: 'phi3:mini', description: 'Very small but capable (3.8B parameters)', parameterSize: '3.8B', diskSizeGB: 2.3, vramRequiredGB: 2, ramRequiredGB: 4, task: 'General Chat', quantization: 'Q4_K_M', popularity: 88 },
  { name: 'llama3.1:8b', description: 'Strong reasoning and complex tasks', parameterSize: '8B', diskSizeGB: 4.7, vramRequiredGB: 8, ramRequiredGB: 12, task: 'Advanced Reasoning', quantization: 'Q4_K_M', popularity: 94 },
  { name: 'mixtral:8x7b', description: 'Powerful MoE model, needs lots of VRAM', parameterSize: '8x7B', diskSizeGB: 24, vramRequiredGB: 16, ramRequiredGB: 32, task: 'Advanced Reasoning', quantization: 'Q4_0', popularity: 85 },
  { name: 'deepseek-coder:6.7b', description: 'Specialized for code generation and understanding', parameterSize: '6.7B', diskSizeGB: 3.8, vramRequiredGB: 6, ramRequiredGB: 8, task: 'Coding', quantization: 'Q4_0', popularity: 92 },
  { name: 'codellama:7b', description: "Meta's code model, good for code completion", parameterSize: '7B', diskSizeGB: 3.8, vramRequiredGB: 6, ramRequiredGB: 8, task: 'Coding', quantization: 'Q4_0', popularity: 90 },
  { name: 'deepseek-coder:33b', description: 'Powerful coding model, needs high VRAM', parameterSize: '33B', diskSizeGB: 19, vramRequiredGB: 20, ramRequiredGB: 32, task: 'Coding', quantization: 'Q4_0', popularity: 82 },
  { name: 'nous-hermes:7b', description: 'Good for storytelling and creative writing', parameterSize: '7B', diskSizeGB: 4.1, vramRequiredGB: 6, ramRequiredGB: 8, task: 'Creative Writing', quantization: 'Q4_K_M', popularity: 86 },
  { name: 'dolphin-mistral:7b', description: 'Uncensored creative model', parameterSize: '7B', diskSizeGB: 4.1, vramRequiredGB: 6, ramRequiredGB: 8, task: 'Creative Writing', quantization: 'Q4_K_M', popularity: 84 },
  { name: 'qwen2.5:7b', description: 'Good for non-English languages', parameterSize: '7B', diskSizeGB: 4.2, vramRequiredGB: 6, ramRequiredGB: 8, task: 'Multilingual', quantization: 'Q4_K_M', popularity: 87 },
  { name: 'qwen2.5:14b', description: 'Strong multilingual with larger context', parameterSize: '14B', diskSizeGB: 8.2, vramRequiredGB: 12, ramRequiredGB: 16, task: 'Multilingual', quantization: 'Q4_K_M', popularity: 80 },
  { name: 'tinyllama:1.1b', description: 'Extremely small, runs on anything', parameterSize: '1.1B', diskSizeGB: 0.6, vramRequiredGB: 0.5, ramRequiredGB: 2, task: 'General Chat', quantization: 'Q4_K_M', popularity: 75 },
];

const ModelsPanel: React.FC<ModelsPanelProps> = ({ models, systemSpecs, resources, onRefresh, addLog }) => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [runningModels, setRunningModels] = useState<RunningModel[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [discoverSearch, setDiscoverSearch] = useState('');
  const [discoverTaskFilter, setDiscoverTaskFilter] = useState<string>('All');

  const fetchRunningModels = async () => {
    try {
      const data = await window.electronAPI.getRunningModels();
      setRunningModels(data.models || []);
    } catch (error) {
      console.error("Failed to fetch running models", error);
    }
  };

  useEffect(() => {
    fetchRunningModels();
    const interval = setInterval(fetchRunningModels, 5000);
    return () => clearInterval(interval);
  }, []);

  const generateRecommendations = useCallback(() => {
    const vramTotal = systemSpecs?.gpu.reduce((acc, gpu) => acc + (gpu.vram || 0), 0) || 0;
    const ramTotal = systemSpecs?.ram.total || 0;
    const recommended = [];
    if (vramTotal >= 8) recommended.push({ name: 'llama3.2:7b', task: 'General Chat', reason: 'Excellent all-rounder for 8GB+ VRAM.' });
    if (vramTotal >= 6) recommended.push({ name: 'deepseek-coder:6.7b', task: 'Coding', reason: 'Strong coding assistant for mid-range GPUs.' });
    if (ramTotal >= 16) recommended.push({ name: 'mistral:7b', task: 'General Chat', reason: 'Fast and efficient for CPU/GPU mixing.' });
    if (vramTotal >= 12) recommended.push({ name: 'llama3.1:8b', task: 'Advanced Reasoning', reason: 'Great for complex tasks on 12GB+ VRAM.' });
    setRecommendations(recommended);
  }, [systemSpecs]);

  useEffect(() => {
    if (systemSpecs) {
      generateRecommendations();
    }
  }, [systemSpecs, models, generateRecommendations]);

  const handlePullModel = async (modelName: string) => {
    setDownloading(modelName);
    addLog('DOWNLOAD', modelName, 'started');
    try {
      await window.electronAPI.pullModel(modelName);
      addLog('DOWNLOAD', modelName, 'success');
      onRefresh();
    } catch (error: any) {
      console.error("Failed to pull model", error);
      addLog('DOWNLOAD', modelName, 'failed', error.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (window.confirm(`Delete ${modelName}?`)) {
      addLog('DELETE', modelName, 'started');
      try {
        await window.electronAPI.deleteModel(modelName);
        addLog('DELETE', modelName, 'success');
        onRefresh();
      } catch (error: any) {
        addLog('DELETE', modelName, 'failed', error.message);
      }
    }
  };

  const handleStartModel = async (modelName: string) => {
    setLoadingAction(`start-${modelName}`);
    addLog('START', modelName, 'started');
    try {
      await window.electronAPI.generateChat(modelName, [{ role: 'user', content: 'Hello' }]);
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

  if (!systemSpecs) return <LinearProgress />;

  const isModelRunning = (name: string) => runningModels.some(m => m.name === name);
  const isInstalled = (name: string) => models.some(m => m.name === name);

  const filteredModels = MODEL_CATALOG.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(discoverSearch.toLowerCase()) ||
                          model.description.toLowerCase().includes(discoverSearch.toLowerCase());
    const matchesTask = discoverTaskFilter === 'All' || model.task === discoverTaskFilter;
    return matchesSearch && matchesTask;
  }).sort((a, b) => b.popularity - a.popularity);

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
                <Button variant="contained" size="small" sx={{ mt: 2 }} onClick={() => handlePullModel(rec.name)} disabled={downloading === rec.name}>
                  {downloading === rec.name ? <LinearProgress /> : 'Download & Use'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Discover More Models */}
      <Typography variant="h5" gutterBottom>🔍 Discover More Models</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
          <SearchIcon sx={{ color: 'text.secondary' }} />
          <TextField
            fullWidth
            size="small"
            placeholder="Search models..."
            value={discoverSearch}
            onChange={(e) => setDiscoverSearch(e.target.value)}
            variant="outlined"
          />
        </Box>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Task</InputLabel>
          <Select value={discoverTaskFilter} label="Task" onChange={(e) => setDiscoverTaskFilter(e.target.value)}>
            <MenuItem value="All">All Tasks</MenuItem>
            <MenuItem value="General Chat">General Chat</MenuItem>
            <MenuItem value="Coding">Coding</MenuItem>
            <MenuItem value="Advanced Reasoning">Advanced Reasoning</MenuItem>
            <MenuItem value="Creative Writing">Creative Writing</MenuItem>
            <MenuItem value="Multilingual">Multilingual</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {filteredModels.map((model) => {
          const installed = isInstalled(model.name);
          return (
            <Grid size={{ xs: 12, md: 4 }} key={model.name}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{model.name}</Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>{model.description}</Typography>
                  <Box sx={{ my: 1 }}>
                    <Chip size="small" label={`Params: ${model.parameterSize}`} />
                    <Chip size="small" label={`Disk: ${model.diskSizeGB} GB`} sx={{ ml: 1 }} />
                    <Chip size="small" label={`VRAM: ${model.vramRequiredGB} GB`} sx={{ ml: 1 }} />
                    <Chip size="small" label={`RAM: ${model.ramRequiredGB} GB`} sx={{ ml: 1 }} />
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', color: 'textSecondary' }}>
                    Quantization: {model.quantization} | Task: {model.task}
                  </Typography>
                  {installed ? (
                    <Button variant="outlined" size="small" sx={{ mt: 2 }} disabled startIcon={<DownloadIcon />}>
                      Installed
                    </Button>
                  ) : (
                    <Button variant="contained" size="small" sx={{ mt: 2 }} startIcon={<DownloadIcon />} onClick={() => handlePullModel(model.name)} disabled={downloading === model.name}>
                      {downloading === model.name ? <LinearProgress sx={{ width: 60 }} /> : 'Download'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Installed Models */}
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