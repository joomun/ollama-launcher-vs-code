import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import ModelsPanel from './components/ModelsPanel';
import ResourcesPanel from './components/ResourcesPanel';
import ChatPanel from './components/ChatPanel';
import ConfigPanel from './components/ConfigPanel';
import LogsPanel from './components/LogsPanel';
import ActivityLogsPanel, { ActivityLogEntry } from './components/ActivityLogsPanel';
import { SystemSpecs, SystemResources, OllamaModel } from './types';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
    background: { default: '#121212', paper: '#1e1e1e' },
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [systemSpecs, setSystemSpecs] = useState<SystemSpecs | null>(null);
  const [resources, setResources] = useState<SystemResources | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);

  const addLog = (action: string, model: string, status: string, details?: string) => {
    setActivityLogs(prev => [{ time: new Date().toLocaleTimeString(), action, model, status, details }, ...prev]);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const fetchSystemSpecs = async () => {
    const specs = await window.electronAPI.getSystemSpecs();
    setSystemSpecs(specs);
  };

  const fetchResources = async () => {
    const res = await window.electronAPI.getCurrentResources();
    setResources(res);
  };

  const fetchModels = async () => {
    try {
      const data = await window.electronAPI.fetchModels();
      setModels(data.models || []);
    } catch (error) {
      console.error("Failed to fetch models", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemSpecs();
    fetchResources();
    fetchModels();
    const interval = setInterval(fetchResources, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', py: 2 }}>
        <Typography variant="h4" gutterBottom>
          Ollama Ultimate AI Studio
        </Typography>
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} centered>
            <Tab label="Models & Recommendations" />
            <Tab label="System Resources" />
            <Tab label="Chat" />
            <Tab label="Configuration" />
            <Tab label="Ollama Logs" />
            <Tab label="Activity Logs" />
          </Tabs>
        </Paper>
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <TabPanel value={tabValue} index={0}>
            <ModelsPanel models={models} systemSpecs={systemSpecs} onRefresh={fetchModels} addLog={addLog} />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <ResourcesPanel resources={resources} systemSpecs={systemSpecs} />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <ChatPanel models={models} addLog={addLog} />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <ConfigPanel />
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            <LogsPanel />
          </TabPanel>
          <TabPanel value={tabValue} index={5}>
            <ActivityLogsPanel logs={activityLogs} onClear={() => setActivityLogs([])} />
          </TabPanel>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;