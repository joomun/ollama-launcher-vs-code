import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Typography, Box, Paper, Alert } from '@mui/material';

interface DownloadDialogProps {
  open: boolean;
  modelName: string;
  isDownloading: boolean;
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
  onClose: () => void;
}

const DownloadDialog: React.FC<DownloadDialogProps> = ({
  open, modelName, isDownloading, isComplete, hasError, errorMessage, onClose
}) => {
  const command = `ollama pull ${modelName}`;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Download Model</DialogTitle>
      <DialogContent dividers>
        <Paper sx={{ p: 1, mb: 2, bgcolor: '#2d2d2d', fontFamily: 'monospace' }}>
          <Typography variant="caption" color="textSecondary">Command:</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>$ {command}</Typography>
        </Paper>
        {isDownloading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
            <CircularProgress size={24} />
            <Typography>Downloading {modelName}... This may take several minutes.</Typography>
          </Box>
        )}
        {isComplete && <Alert severity="success" sx={{ mt: 2 }}>Download completed successfully!</Alert>}
        {hasError && <Alert severity="error" sx={{ mt: 2 }}>{errorMessage || 'Download failed'}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" disabled={isDownloading}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DownloadDialog;