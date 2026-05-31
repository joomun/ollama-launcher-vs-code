import React, { useState } from 'react';
import { Box, TextField, Button, Select, MenuItem, FormControl, InputLabel, Paper, Typography, CircularProgress } from '@mui/material';
import { OllamaModel } from '../types';

interface ChatPanelProps {
  models: OllamaModel[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ models }) => {
  const [selectedModel, setSelectedModel] = useState<string>(models[0]?.name || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || !selectedModel) return;
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await window.electronAPI.generateChat(selectedModel, [...messages, userMessage]);
      const assistantMessage: Message = { role: 'assistant', content: response.message.content };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error communicating with Ollama. Is it running?' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Model</InputLabel>
        <Select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} label="Model">
          {models.map((model) => (
            <MenuItem key={model.name} value={model.name}>{model.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Paper sx={{ flexGrow: 1, overflow: 'auto', p: 2, mb: 2, bgcolor: '#2d2d2d' }}>
        {messages.map((msg, idx) => (
          <Box key={idx} sx={{ mb: 2, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
            <Typography variant="caption" color="textSecondary">{msg.role === 'user' ? 'You' : selectedModel}</Typography>
            <Paper sx={{ p: 1, display: 'inline-block', bgcolor: msg.role === 'user' ? '#1976d2' : '#424242', borderRadius: 2 }}>
              <Typography variant="body2">{msg.content}</Typography>
            </Paper>
          </Box>
        ))}
        {loading && <CircularProgress size={24} />}
      </Paper>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField fullWidth variant="outlined" placeholder="Type your message..." value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} />
        <Button variant="contained" onClick={handleSend} disabled={loading}>Send</Button>
      </Box>
    </Box>
  );
};

export default ChatPanel;