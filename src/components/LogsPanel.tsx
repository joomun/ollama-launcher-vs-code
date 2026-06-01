import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip, LinearProgress, Alert, TextField, InputAdornment, InputBase } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';

const LogsPanel: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Load initial logs
  const loadLogs = async () => {
    setLoading(true);
    const result = await window.electronAPI.getOllamaLogs(500);
    if (result.success && result.lines) {
      setLogs(result.lines);
      setError(null);
    } else {
      setError(result.error || 'Failed to load logs');
    }
    setLoading(false);
  };

  // Start watching for new logs
  const startWatching = async () => {
    await window.electronAPI.startLogWatcher();
    if (unsubscribeRef.current) unsubscribeRef.current();
    unsubscribeRef.current = window.electronAPI.onNewLogLine((line) => {
      setLogs(prev => [...prev, line]);
      if (autoScroll) {
        setTimeout(() => {
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
          }
        }, 50);
      }
    });
    setWatching(true);
  };

  // Stop watching
  const stopWatching = async () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    await window.electronAPI.stopLogWatcher();
    setWatching(false);
  };

  useEffect(() => {
    loadLogs();
    startWatching();
    return () => {
      stopWatching();
    };
  }, []);

  useEffect(() => {
    // Apply filter
    if (!filter.trim()) {
      setFilteredLogs(logs);
    } else {
      const lowerFilter = filter.toLowerCase();
      setFilteredLogs(logs.filter(line => line.toLowerCase().includes(lowerFilter)));
    }
  }, [logs, filter]);

  const handleClear = () => {
    setLogs([]);
    setFilteredLogs([]);
  };

  const handleRefresh = async () => {
    const wasWatching = watching;
    if (wasWatching) await stopWatching();
    await loadLogs();
    if (wasWatching) await startWatching();
  };

  const toggleAutoScroll = () => setAutoScroll(!autoScroll);

  const highlightText = (text: string, search: string) => {
    if (!search) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === search.toLowerCase() ? 
        <span key={i} style={{ backgroundColor: '#ffeb3b', color: '#000' }}>{part}</span> : 
        part
    );
  };

  return (
    <Box sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">📋 Ollama Server Logs</Typography>
        <Box>
          <Tooltip title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}>
            <IconButton onClick={toggleAutoScroll} color={autoScroll ? "primary" : "default"}>
              {autoScroll ? <PlayArrowIcon /> : <PauseIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear logs (local only)">
            <IconButton onClick={handleClear}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh logs from file">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Search bar with icon side by side - avoids InputProps type issues */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <SearchIcon sx={{ color: 'text.secondary' }} />
        <TextField
          fullWidth
          size="small"
          placeholder="Filter logs (e.g., 'error', 'llama', 'GPU')"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          variant="outlined"
        />
      </Box>

      <Paper 
        ref={logContainerRef}
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          bgcolor: '#1e1e1e', 
          p: 2,
          fontFamily: 'monospace',
          fontSize: '0.8rem'
        }}
      >
        {loading && <LinearProgress />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {filteredLogs.length === 0 && !loading && !error && (
          <Typography color="textSecondary" align="center">No logs to display.</Typography>
        )}
        {filteredLogs.map((line, idx) => (
          <Box key={idx} sx={{ 
            borderBottom: '1px solid #333', 
            py: 0.5,
            fontFamily: 'Consolas, monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {highlightText(line, filter)}
          </Box>
        ))}
      </Paper>
      <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
        Log file location: $env:LOCALAPPDATA\Ollama\server.log
        {watching && <span style={{ color: '#4caf50', marginLeft: 8 }}>● Live watching active</span>}
      </Typography>
    </Box>
  );
};

export default LogsPanel;