// Dynamic LLM Provider Selection Interface
// Frontend component for selecting LLM providers and models

import React, { useState, useEffect } from 'react';
import { 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Slider,
  Box
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  Cloud as CloudIcon,
  Computer as ComputerIcon,
  Key as KeyIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon
} from '@mui/icons-material';

const LLMSelector = ({ onLLMChange, currentConfig, userId }) => {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(currentConfig?.provider || 'ollama');
  const [selectedModel, setSelectedModel] = useState(currentConfig?.model || '');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [advancedSettings, setAdvancedSettings] = useState({
    temperature: currentConfig?.temperature || 0.7,
    maxTokens: currentConfig?.maxTokens || 4000,
    streaming: currentConfig?.streaming !== false,
    topP: currentConfig?.topP || 1.0,
    frequencyPenalty: currentConfig?.frequencyPenalty || 0,
    presencePenalty: currentConfig?.presencePenalty || 0
  });

  // Load available providers on component mount
  useEffect(() => {
    loadProviders();
  }, []);

  // Load models when provider changes
  useEffect(() => {
    if (selectedProvider) {
      loadModels(selectedProvider);
    }
  }, [selectedProvider]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/llm/providers');
      if (!response.ok) throw new Error('Failed to load providers');
      
      const providersData = await response.json();
      setProviders(providersData);
      
      // If no provider selected, default to Ollama if available
      if (!selectedProvider && providersData.find(p => p.id === 'ollama')) {
        setSelectedProvider('ollama');
      }
    } catch (error) {
      setError(`Failed to load LLM providers: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async (providerId) => {
    try {
      setLoading(true);
      const provider = providers.find(p => p.id === providerId);
      if (!provider) return;

      setModels(provider.models || []);
      
      // Auto-select first model if none selected
      if (!selectedModel && provider.models?.length > 0) {
        setSelectedModel(provider.models[0]);
      }
    } catch (error) {
      setError(`Failed to load models: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (event) => {
    const providerId = event.target.value;
    setSelectedProvider(providerId);
    setSelectedModel('');
    setApiKey('');
    setError('');
    setSuccess('');
  };

  const handleModelChange = (event) => {
    setSelectedModel(event.target.value);
  };

  const handleApiKeyChange = (event) => {
    setApiKey(event.target.value);
  };

  const handleAdvancedSettingChange = (setting, value) => {
    setAdvancedSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const saveConfiguration = async () => {
    try {
      setLoading(true);
      setError('');

      const provider = providers.find(p => p.id === selectedProvider);
      if (!provider) {
        throw new Error('Invalid provider selected');
      }

      if (!selectedModel) {
        throw new Error('Please select a model');
      }

      if (provider.requiresApiKey && !apiKey && provider.id !== 'ollama') {
        throw new Error('API key is required for this provider');
      }

      const config = {
        provider: selectedProvider,
        model: selectedModel,
        apiKey: apiKey || undefined,
        ...advancedSettings,
        userId: userId
      };

      // Test the configuration
      const testResponse = await fetch('/api/llm/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!testResponse.ok) {
        const error = await testResponse.json();
        throw new Error(error.message || 'Configuration test failed');
      }

      // Save the configuration
      const saveResponse = await fetch('/api/llm/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!saveResponse.ok) {
        const error = await saveResponse.json();
        throw new Error(error.message || 'Failed to save configuration');
      }

      setSuccess('LLM configuration saved successfully!');
      
      // Notify parent component
      if (onLLMChange) {
        onLLMChange(config);
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      setError('');

      const config = {
        provider: selectedProvider,
        model: selectedModel,
        apiKey: apiKey || undefined,
        ...advancedSettings
      };

      const response = await fetch('/api/llm/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Connection test failed');
      }

      const result = await response.json();
      setSuccess(`Connection successful! Response time: ${result.responseTime}ms`);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentProvider = () => {
    return providers.find(p => p.id === selectedProvider);
  };

  const getProviderIcon = (provider) => {
    return provider?.type === 'local' ? <ComputerIcon /> : <CloudIcon />;
  };

  const getModelInfo = (modelName) => {
    // Return basic info about the model
    const info = {
      'gpt-4': { context: '8K', cost: 'High', speed: 'Medium' },
      'gpt-3.5-turbo': { context: '4K', cost: 'Low', speed: 'Fast' },
      'claude-3-opus': { context: '200K', cost: 'High', speed: 'Medium' },
      'claude-3-sonnet': { context: '200K', cost: 'Medium', speed: 'Fast' },
      'llama2': { context: '4K', cost: 'Free', speed: 'Fast' },
      'codellama': { context: '16K', cost: 'Free', speed: 'Fast' }
    };

    return info[modelName] || { context: 'Unknown', cost: 'Unknown', speed: 'Unknown' };
  };

  return (
    <Card sx={{ maxWidth: 800, margin: 'auto', mt: 2 }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          🤖 LLM Provider Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Select your preferred LLM provider and model. Local Ollama is recommended for cost-effectiveness and privacy.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Provider Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>LLM Provider</InputLabel>
              <Select
                value={selectedProvider}
                onChange={handleProviderChange}
                label="LLM Provider"
                disabled={loading}
              >
                {providers.map((provider) => (
                  <MenuItem key={provider.id} value={provider.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getProviderIcon(provider)}
                      {provider.name}
                      <Chip 
                        label={provider.type} 
                        size="small" 
                        color={provider.type === 'local' ? 'success' : 'primary'}
                        variant="outlined"
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Model Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Model</InputLabel>
              <Select
                value={selectedModel}
                onChange={handleModelChange}
                label="Model"
                disabled={loading || !selectedProvider}
              >
                {models.map((model) => (
                  <MenuItem key={model} value={model}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Typography variant="body2">{model}</Typography>
                      <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                        {Object.entries(getModelInfo(model)).map(([key, value]) => (
                          <Chip 
                            key={key}
                            label={`${key}: ${value}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* API Key (for external providers) */}
          {getCurrentProvider()?.requiresApiKey && selectedProvider !== 'ollama' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Key"
                type="password"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Enter your API key"
                InputProps={{
                  startAdornment: <KeyIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                helperText={`Required for ${getCurrentProvider()?.name}. Your API key is encrypted and stored securely.`}
              />
            </Grid>
          )}

          {/* Advanced Settings */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Advanced Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {/* Temperature */}
                  <Grid item xs={12} sm={6}>
                    <Typography gutterBottom>
                      Temperature: {advancedSettings.temperature}
                    </Typography>
                    <Slider
                      value={advancedSettings.temperature}
                      onChange={(_, value) => handleAdvancedSettingChange('temperature', value)}
                      min={0}
                      max={2}
                      step={0.1}
                      marks={[
                        { value: 0, label: 'Focused' },
                        { value: 1, label: 'Balanced' },
                        { value: 2, label: 'Creative' }
                      ]}
                    />
                  </Grid>

                  {/* Max Tokens */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Max Tokens"
                      type="number"
                      value={advancedSettings.maxTokens}
                      onChange={(e) => handleAdvancedSettingChange('maxTokens', parseInt(e.target.value))}
                      inputProps={{ min: 100, max: 32000 }}
                    />
                  </Grid>

                  {/* Streaming */}
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advancedSettings.streaming}
                          onChange={(e) => handleAdvancedSettingChange('streaming', e.target.checked)}
                        />
                      }
                      label="Enable Streaming"
                    />
                  </Grid>

                  {/* Top P */}
                  <Grid item xs={12} sm={6}>
                    <Typography gutterBottom>
                      Top P: {advancedSettings.topP}
                    </Typography>
                    <Slider
                      value={advancedSettings.topP}
                      onChange={(_, value) => handleAdvancedSettingChange('topP', value)}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                  </Grid>

                  {/* Frequency Penalty */}
                  <Grid item xs={12} sm={6}>
                    <Typography gutterBottom>
                      Frequency Penalty: {advancedSettings.frequencyPenalty}
                    </Typography>
                    <Slider
                      value={advancedSettings.frequencyPenalty}
                      onChange={(_, value) => handleAdvancedSettingChange('frequencyPenalty', value)}
                      min={-2}
                      max={2}
                      step={0.1}
                    />
                  </Grid>

                  {/* Presence Penalty */}
                  <Grid item xs={12} sm={6}>
                    <Typography gutterBottom>
                      Presence Penalty: {advancedSettings.presencePenalty}
                    </Typography>
                    <Slider
                      value={advancedSettings.presencePenalty}
                      onChange={(_, value) => handleAdvancedSettingChange('presencePenalty', value)}
                      min={-2}
                      max={2}
                      step={0.1}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={testConnection}
                disabled={loading || !selectedProvider || !selectedModel}
                startIcon={<SpeedIcon />}
              >
                Test Connection
              </Button>
              <Button
                variant="contained"
                onClick={saveConfiguration}
                disabled={loading || !selectedProvider || !selectedModel}
                startIcon={<MemoryIcon />}
              >
                Save Configuration
              </Button>
            </Box>
          </Grid>

          {/* Current Configuration Display */}
          {currentConfig && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Current Configuration
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Provider:</strong> {currentConfig.provider}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Model:</strong> {currentConfig.model}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Temperature:</strong> {currentConfig.temperature}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Max Tokens:</strong> {currentConfig.maxTokens}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default LLMSelector;

