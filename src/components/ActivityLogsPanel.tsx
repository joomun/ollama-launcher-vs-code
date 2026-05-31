import React, { useRef, useEffect } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip, Chip } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';

export interface ActivityLogEntry {
  time: string;
  action: string;
  model: string;
  status: string;
  details?: string;
}

interface ActivityLogsPanelProps {
  logs: ActivityLogEntry[];
  onClear?: () => void;
}

const ActivityLogsPanel: React.FC<ActivityLogsPanelProps> = ({ logs, onClear }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [logs]);

  const getActionColor = (action: string, status: string) => {
    if (status === 'success') return '#4caf50';
    if (status === 'failed' || status === 'error') return '#f44336';
    if (status === 'started' || status === 'sending') return '#ff9800';
    return '#2196f3';
  };

  const getStatusChip = (status: string) => {
    const colorMap: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
      success: 'success',
      failed: 'error',
      error: 'error',
      started: 'warning',
      sending: 'warning',
      stopped: 'info',
      deleted: 'info'
    };
    return <Chip label={status} size="small" color={colorMap[status] || 'default'} />;
  };

  return (
    <Box sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Activity Logs</Typography>
        {onClear && (
          <Tooltip title="Clear all activity logs">
            <IconButton onClick={onClear}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Paper ref={containerRef} sx={{ flexGrow: 1, overflow: 'auto', bgcolor: '#1e1e1e', p: 2, fontFamily: 'monospace' }}>
        {logs.length === 0 && (
          <Typography color="textSecondary" align="center">No activity yet. Start, stop, or download a model to see logs.</Typography>
        )}
        {logs.map((log, idx) => (
          <Box key={idx} sx={{ borderBottom: '1px solid #333', py: 1, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip label={log.time} size="small" variant="outlined" />
            <Typography component="span" sx={{ fontWeight: 'bold', color: getActionColor(log.action, log.status) }}>
              {log.action}
            </Typography>
            <Typography component="span">model: {log.model}</Typography>
            {getStatusChip(log.status)}
            {log.details && <Typography component="span" variant="caption" color="textSecondary">{log.details}</Typography>}
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default ActivityLogsPanel;