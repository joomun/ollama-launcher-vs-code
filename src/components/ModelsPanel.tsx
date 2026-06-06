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

interface RunningModel { name: string; model: string; size: number; digest: string; details?: any; }

const MODEL_CATALOG = [
  { name: 'llama3.2:3b', parameterSize: '3B', vramRequiredGB: 2, ramRequiredGB: 4, diskSizeGB: 2.0, task: 'General Chat', description: 'Fast, lightweight' },
  { name: 'llama3.2:7b', parameterSize: '7B', vramRequiredGB: 6, ramRequiredGB: 8, diskSizeGB: 4.5, task: 'General Chat', description: 'Excellent all-rounder' },
  { name: 'mistral:7b', parameterSize: '7B', vramRequiredGB: 6, ramRequiredGB: 8, diskSizeGB: 4.1, task: 'General Chat', description: 'Efficient and capable' },
  { name: 'deepseek-coder:6.7b', parameterSize: '6.7B', vramRequiredGB: 6, ramRequiredGB: 8, diskSizeGB: 3.8, task: 'Coding', description: 'Specialized for coding' },
  { name: 'codellama:7b', parameterSize: '7B', vramRequiredGB: 6, ramRequiredGB: 8, diskSizeGB: 3.8, task: 'Coding', description: 'Meta\'s code model' },
  { name: 'llama3.1:8b', parameterSize: '8B', vramRequiredGB: 8, ramRequiredGB: 12, diskSizeGB: 4.7, task: 'Advanced Reasoning', description: 'Strong reasoning' },
  { name: 'phi3:mini', parameterSize: '3.8B', vramRequiredGB: 2, ramRequiredGB: 4, diskSizeGB: 2.3, task: 'General Chat', description: 'Very small but capable' },
  { name: 'qwen2.5:7b', parameterSize: '7B', vramRequiredGB: 6, ramRequiredGB: 8, diskSizeGB: 4.2, task: 'Multilingual', description: 'Good for non-English' },
  { name: 'tinyllama:1.1b', parameterSize: '1.1B', vramRequiredGB: 0.5, ramRequiredGB: 2, diskSizeGB: 0.6, task: 'General Chat', description: 'Extremely small' },
];

const ModelsPanel: React.FC<ModelsPanelProps> = ({ models, systemSpecs, resources, onRefresh, addLog }) => {
  const [task, setTask] = useState<string>('General Chat');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [runningModels, setRunningModels] = useState<RunningModel[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [discoverSearch, setDiscoverSearch] = useState('');
  const [discoverTaskFilter, setDiscoverTaskFilter] = useState<string>('All');

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

  // AI‑powered recommendation
  const fetchAIRecs = useCallback(async () => {
    // Check if phi3:mini is installed
    const modelsList = await window.electronAPI.fetchModels();
    const hasPhi3 = modelsList.models?.some(m => m.name === 'phi3:mini');
    if (!hasPhi3) {
      setRecommendations([{
        name: 'phi3:mini',
        reason: 'This small model is needed to power AI recommendations. Please download it first.',
        vramRequiredGB: 2,
        ramRequiredGB: 4,
        suitable: true,
        installed: false
      }]);
      setLoadingRecommendations(false);
      return;
    }
    if (!systemSpecs || !resources) return;
    setLoadingRecommendations(true);
    const freeRamGB = (resources.ram.total - resources.ram.used) / (1024 ** 3);
    const totalVramGB = systemSpecs.gpu.reduce((acc, gpu) => acc + (gpu.vram || 0), 0);
    const freeVramGB = resources.vram ? (resources.vram.total - resources.vram.used) / (1024 ** 3) : totalVramGB;
    const hasGpu = totalVramGB > 0;

    const systemInfo = {
      cpu: { cores: systemSpecs.cpu.cores },
      freeRamGB,
      freeVramGB,
      hasGpu
    };

    try {
      const aiRecs = await window.electronAPI.getModelRecommendations(systemInfo, task);
      if (aiRecs && aiRecs.length > 0) {
        // Enrich AI recs with catalog data
        const enriched = aiRecs.map(rec => {
          const catalog = MODEL_CATALOG.find(m => m.name === rec.name);
          return {
            ...rec,
            ...catalog,
            installed: models.some(m => m.name === rec.name),
            suitable: catalog ? (catalog.vramRequiredGB <= freeVramGB && catalog.ramRequiredGB <= freeRamGB) : false
          };
        });
        setRecommendations(enriched);
      } else {
        // Fallback to simple catalog scoring
        fallbackRecommendations(freeRamGB, freeVramGB, hasGpu);
      }
    } catch (err) {
      console.error('AI recommendation failed, using fallback', err);
      fallbackRecommendations(freeRamGB, freeVramGB, hasGpu);
    }
    setLoadingRecommendations(false);
  }, [task, systemSpecs, resources, models]);

  const fallbackRecommendations = (freeRamGB: number, freeVramGB: number, hasGpu: boolean) => {
    const scored = MODEL_CATALOG.map(model => {
      let score = 0;
      let suitable = true;
      if (hasGpu && freeVramGB >= model.vramRequiredGB) score += 10;
      else if (!hasGpu && model.vramRequiredGB > 2) suitable = false;
      if (freeRamGB >= model.ramRequiredGB) score += 5;
      else suitable = false;
      if (model.task === task) score += 5;
      return { ...model, score, suitable, installed: models.some(m => m.name === model.name), reason: `${model.description}, requires ${model.vramRequiredGB}GB VRAM, ${model.ramRequiredGB}GB RAM` };
    });
    const top = scored.filter(m => m.suitable || m.score > 0).sort((a,b) => b.score - a.score).slice(0,4);
    setRecommendations(top);
  };

  useEffect(() => {
    fetchAIRecs();
  }, [task, fetchAIRecs]);

  const handlePullModel = async (modelName: string) => {
    setDownloading(modelName);
    addLog('DOWNLOAD', modelName, 'started');
    try {
      await window.electronAPI.pullModel(modelName);
      addLog('DOWNLOAD', modelName, 'success');
      onRefresh();
    } catch (error: any) {
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
      } catch (error: any) { addLog('DELETE', modelName, 'failed', error.message); }
    }
  };

  const handleStartModel = async (modelName: string) => {
    setLoadingAction(`start-${modelName}`);
    addLog('START', modelName, 'started');
    try {
      await window.electronAPI.generateChat(modelName, [{ role: 'user', content: 'Hello' }]);
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
    fetchAIRecs();
  };

  if (!systemSpecs || !resources) return <LinearProgress />;

  const isModelRunning = (name: string) => runningModels.some(m => m.name === name);
  const isInstalled = (name: string) => models.some(m => m.name === name);
  const freeRamGB = (resources.ram.total - resources.ram.used) / (1024 ** 3);
  const totalVramGB = systemSpecs.gpu.reduce((acc, gpu) => acc + (gpu.vram || 0), 0);
  const freeVramGB = resources.vram ? (resources.vram.total - resources.vram.used) / (1024 ** 3) : totalVramGB;
  const hasGpu = totalVramGB > 0;

  const filteredModels = MODEL_CATALOG.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(discoverSearch.toLowerCase()) ||
                          model.description.toLowerCase().includes(discoverSearch.toLowerCase());
    const matchesTask = discoverTaskFilter === 'All' || model.task === discoverTaskFilter;
    return matchesSearch && matchesTask;
  });

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">Free RAM: {freeRamGB.toFixed(1)} GB / {(resources.ram.total / (1024**3)).toFixed(1)} GB</Typography>
        <Typography variant="body2">Free VRAM: {freeVramGB.toFixed(1)} GB / {totalVramGB.toFixed(0)} GB</Typography>
      </Alert>

      <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
        🟢 Running Models
        <IconButton size="small" onClick={fetchRunningModels} sx={{ ml: 1 }}><RefreshIcon fontSize="small" /></IconButton>
      </Typography>
      {runningModels.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>No models currently loaded.</Alert>
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

      <Typography variant="h5" gutterBottom>💡 AI‑Powered Smart Recommendations</Typography>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>What will you use the AI for?</InputLabel>
        <Select value={task} label="What will you use the AI for?" onChange={(e) => setTask(e.target.value)}>
          <MenuItem value="General Chat">General Chat</MenuItem>
          <MenuItem value="Coding">Coding Assistance</MenuItem>
          <MenuItem value="Advanced Reasoning">Advanced Reasoning</MenuItem>
          <MenuItem value="Creative Writing">Creative Writing</MenuItem>
          <MenuItem value="Multilingual">Multilingual</MenuItem>
        </Select>
      </FormControl>

      {loadingRecommendations && <LinearProgress sx={{ mb: 2 }} />}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {recommendations.length === 0 && !loadingRecommendations && (
          <Alert severity="info">No recommendations yet. Select a task and ensure Ollama is running with phi3:mini model installed.</Alert>
        )}
        {recommendations.map((rec, idx) => (
          <Grid size={{ xs: 12, md: 3 }} key={idx}>
            <Card sx={{ opacity: rec.suitable ? 1 : 0.7 }}>
              <CardContent>
                <Typography variant="h6">{rec.name}</Typography>
                <Typography color="textSecondary" variant="caption">{rec.reason || rec.description}</Typography>
                <Box sx={{ my: 1 }}>
                  <Chip size="small" label={`VRAM: ${rec.vramRequiredGB}GB`} />
                  <Chip size="small" label={`RAM: ${rec.ramRequiredGB}GB`} sx={{ ml: 1 }} />
                </Box>
                {!rec.suitable && hasGpu && (
                  <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                    ⚠️ May exceed free VRAM/RAM
                  </Typography>
                )}
                {rec.installed ? (
                  <Button variant="outlined" size="small" sx={{ mt: 2 }} disabled>Installed</Button>
                ) : (
                  <Button variant="contained" size="small" sx={{ mt: 2 }} onClick={() => handlePullModel(rec.name)} disabled={downloading === rec.name}>
                    {downloading === rec.name ? <LinearProgress sx={{ width: 60 }} /> : 'Download & Use'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h5" gutterBottom>🔍 Browse All Models</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
          <SearchIcon sx={{ color: 'text.secondary' }} />
          <TextField fullWidth size="small" placeholder="Search..." value={discoverSearch} onChange={(e) => setDiscoverSearch(e.target.value)} variant="outlined" />
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
                  {installed ? (
                    <Button variant="outlined" size="small" sx={{ mt: 2 }} disabled>Installed</Button>
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

      <Typography variant="h5" gutterBottom>
        📦 Your Installed Models
        <IconButton size="small" onClick={handleManualRefresh} sx={{ ml: 1 }}><RefreshIcon fontSize="small" /></IconButton>
      </Typography>
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