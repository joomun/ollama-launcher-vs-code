import React, { useState } from 'react';
import { Card, CardContent, Typography, TextField, Button, Switch, FormControlLabel, Box, Alert } from '@mui/material';

const ConfigPanel: React.FC = () => {
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434');
  const [numGpu, setNumGpu] = useState('1');
  const [numCpuThreads, setNumCpuThreads] = useState('4');
  const [saveConfig, setSaveConfig] = useState(false);

  const handleSave = () => {
    localStorage.setItem('ollamaHost', ollamaHost);
    localStorage.setItem('ollamaNumGPU', numGpu);
    localStorage.setItem('ollamaNumCPU', numCpuThreads);
    alert('Configuration saved! Restart the Ollama service for changes to take effect.');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Ollama Runtime Configuration</Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Connection Settings</Typography>
          <TextField fullWidth label="Ollama API Host" value={ollamaHost} onChange={(e) => setOllamaHost(e.target.value)} margin="normal" variant="outlined" />
        </CardContent>
      </Card>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Hardware Utilization</Typography>
          <TextField fullWidth label="Number of GPUs to use" type="number" value={numGpu} onChange={(e) => setNumGpu(e.target.value)} margin="normal" variant="outlined" />
          <TextField fullWidth label="Number of CPU threads for inference" type="number" value={numCpuThreads} onChange={(e) => setNumCpuThreads(e.target.value)} margin="normal" variant="outlined" />
          <FormControlLabel control={<Switch checked={saveConfig} onChange={(e) => setSaveConfig(e.target.checked)} />} label="Persist these settings" />
          <Alert severity="info" sx={{ mt: 2 }}>
            These environment variables (OLLAMA_NUM_GPU, OLLAMA_NUM_THREADS) will need to be set before starting the Ollama service to take effect.
          </Alert>
        </CardContent>
      </Card>
      <Button variant="contained" onClick={handleSave}>Save Configuration</Button>
    </Box>
  );
};

export default ConfigPanel;