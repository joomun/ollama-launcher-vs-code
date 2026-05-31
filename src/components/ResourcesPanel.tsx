import React from 'react';
import { Grid, Paper, Typography, LinearProgress, Box } from '@mui/material';
import { SystemResources, SystemSpecs } from '../types';

interface ResourcesPanelProps {
  resources: SystemResources | null;
  systemSpecs: SystemSpecs | null;
}

const ResourcesPanel: React.FC<ResourcesPanelProps> = ({ resources, systemSpecs }) => {
  if (!resources) {
    return <LinearProgress />;
  }

  const cpuPercent = resources.cpu.currentLoad;
  const ramPercent = (resources.ram.used / resources.ram.total) * 100;
  const vramPercent = resources.vram ? (resources.vram.used / resources.vram.total) * 100 : 0;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">CPU</Typography>
          <Typography variant="body2" gutterBottom>Load: {cpuPercent.toFixed(1)}%</Typography>
          <LinearProgress variant="determinate" value={cpuPercent} sx={{ mb: 1 }} />
          <Typography variant="body2">Cores: {systemSpecs?.cpu.cores} | {systemSpecs?.cpu.brand}</Typography>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">RAM</Typography>
          <Typography variant="body2" gutterBottom>
            Used: {(resources.ram.used / (1024 ** 3)).toFixed(1)} GB / {(resources.ram.total / (1024 ** 3)).toFixed(1)} GB ({ramPercent.toFixed(1)}%)
          </Typography>
          <LinearProgress variant="determinate" value={ramPercent} sx={{ mb: 1 }} />
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">GPU (VRAM)</Typography>
          {resources.vram ? (
            <>
              <Typography variant="body2" gutterBottom>
                Used: {(resources.vram.used / (1024 ** 3)).toFixed(1)} GB / {(resources.vram.total / (1024 ** 3)).toFixed(1)} GB ({vramPercent.toFixed(1)}%)
              </Typography>
              <LinearProgress variant="determinate" value={vramPercent} sx={{ mb: 1 }} />
              <Typography variant="body2">GPU: {systemSpecs?.gpu[0]?.name || 'N/A'}</Typography>
            </>
          ) : (
            <Typography variant="body2">No GPU detected or VRAM data unavailable.</Typography>
          )}
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">System Overview</Typography>
          <Typography variant="body2">OS: {systemSpecs?.os.distro} {systemSpecs?.os.release}</Typography>
          <Typography variant="body2">Platform: {systemSpecs?.os.platform}</Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ResourcesPanel;