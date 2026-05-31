import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  LinearProgress, Typography, Box, Paper, Chip, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface DownloadDialogProps {
  open: boolean;
  modelName: string;
  progress: number;
  statusMessages: string[];
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
  onClose: () => void;
  onCancel?: () => void;
}

const DownloadDialog: React.FC<DownloadDialogProps> = ({
  open,
  modelName,
  progress,
  statusMessages,
  isComplete,
  hasError,
  errorMessage,
  onClose,
  onCancel
}) => {
  const [command] = useState(`ollama pull ${modelName}`);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Downloading {modelName}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* Command being run */}
        <Paper sx={{ p: 1, mb: 2, bgcolor: '#2d2d2d', fontFamily: 'monospace', fontSize: '0.8rem' }}>
          <Typography variant="caption" color="textSecondary">Command:</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>$ {command}</Typography>
        </Paper>

        {/* Progress bar */}
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
          <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>{Math.round(progress)}% complete</Typography>
        </Box>

        {/* Status messages */}
        <Typography variant="subtitle2" gutterBottom>Status:</Typography>
        <Paper sx={{ p: 1, bgcolor: '#1e1e1e', height: 200, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {statusMessages.map((msg, idx) => (
            <Box key={idx} sx={{ borderBottom: '1px solid #333', py: 0.5 }}>
              {msg.includes('error') ? (
                <><ErrorIcon color="error" sx={{ fontSize: 12, mr: 0.5 }} /> {msg}</>
              ) : msg.includes('success') || msg.includes('complete') ? (
                <><CheckCircleIcon color="success" sx={{ fontSize: 12, mr: 0.5 }} /> {msg}</>
              ) : (
                msg
              )}
            </Box>
          ))}
          {statusMessages.length === 0 && <Typography color="textSecondary">Waiting for response...</Typography>}
        </Paper>

        {hasError && errorMessage && (
          <Chip label={`Error: ${errorMessage}`} color="error" size="small" sx={{ mt: 2 }} />
        )}
        {isComplete && !hasError && (
          <Chip label="Download complete!" color="success" size="small" sx={{ mt: 2 }} />
        )}
      </DialogContent>
      <DialogActions>
        {!isComplete && !hasError && onCancel && (
          <Button onClick={onCancel} color="warning">Cancel</Button>
        )}
        <Button onClick={onClose} variant="contained" color={isComplete ? "success" : "primary"}>
          {isComplete ? "Close" : hasError ? "Close" : "Minimize"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DownloadDialog;