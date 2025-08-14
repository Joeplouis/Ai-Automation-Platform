// API Routes for LLM Provider Management
// Handles dynamic LLM provider selection and configuration

import express from 'express';
import { promises as fsp } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LangChainAgentSystem } from '../ai/langchain-agent-system.js';
import { authenticateToken, authenticateTokenFlexible } from '../middleware/auth.js';
import { encryptSecret } from '../utils/crypto.js';
import { createVPSManager } from '../modules/vps/manager.js';

const router = express.Router();

/**
 * Initialize LangChain Agent System
 */
let agentSystem = null;

export function initializeLLMRoutes(pool, redis) {
  agentSystem = new LangChainAgentSystem(pool, redis);
  return router;
}

// Ensure required tables exist (idempotent). We do this in code to avoid migrations.
async function ensureTables(req) {
  // Ensure pgcrypto for gen_random_uuid
  try {
    await req.pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  } catch (e) {
    console.warn('pgcrypto extension not enabled:', e.message);
  }
  // Custom providers registry for dynamic providers
  await req.pool.query(`
    CREATE TABLE IF NOT EXISTS llm_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,              -- 'local' | 'external' | 'openai-compatible' | 'ollama-compatible' | 'custom'
      config JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  // Chat session/message tables (aligns with schema.sql; harmless if it already exists)
  await req.pool.query(`
    CREATE TABLE IF NOT EXISTS chat_session (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      title TEXT,
      provider TEXT,
      model TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);

  await req.pool.query(`
    CREATE TABLE IF NOT EXISTS message (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID REFERENCES chat_session(id) ON DELETE CASCADE,
      role TEXT CHECK (role IN ('user','assistant','tool','system')),
      content JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);
}

// Lightweight module/script inventory for the Agent UI
router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const inventory = { modules: {}, scripts: {} };
    // Check manager modules presence by dynamic import
    const checks = [
      { key: 'vps', path: '../modules/vps/manager.js' },
      { key: 'n8n', path: '../modules/n8n/manager.js' },
      { key: 'wordpress', path: '../modules/wordpress/manager.js' },
      { key: 'postiz', path: '../modules/postiz/manager.js' },
      { key: 'affiliate', path: '../modules/affiliate/manager.js' }
    ];
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    for (const c of checks) {
      try {
        const abs = path.resolve(__dirname, c.path);
        await fsp.stat(abs);
        inventory.modules[c.key] = { present: true, error: null };
      } catch (e) {
        inventory.modules[c.key] = { present: false, error: e.message };
      }
    }

    // Script availability via VPS manager's resolver
    try {
      const vps = createVPSManager(req.pool);
  const types = ['full_stack','mailcow','mautic','n8n','nginx','certbot','prep','bookaistudio','mailcow_only','n8n_only','wordpress_only'];
      for (const t of types) {
        try {
          const p = await vps.getDeploymentScript(t);
          inventory.scripts[t] = { present: true, path: p };
        } catch (e) {
          inventory.scripts[t] = { present: false, error: e.message };
        }
      }
  // Advertise hardened sandbox capability (method-based, not script file)
  inventory.capabilities = inventory.capabilities || {};
  inventory.capabilities.n8n_sandbox = true;
    } catch (e) {
      inventory.scripts_error = e.message;
    }

    res.json({ success: true, inventory });
  } catch (error) {
    console.error('Error building inventory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------- VPS learning corpus ops ----------
router.post('/vps/:serverId/corpus/stage', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const options = req.body || {};
    const vps = createVPSManager(req.pool);
    const result = await vps.stageLearningCorpus(serverId, req.user.id, options);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/vps/:serverId/corpus/analyze', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { targetDir = '/opt/docniz_corpus' } = req.body || {};
    const vps = createVPSManager(req.pool);
    const result = await vps.analyzeLearningCorpus(serverId, req.user.id, targetDir);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/vps/:serverId/corpus', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { targetDir = '/opt/docniz_corpus' } = req.query || {};
    const vps = createVPSManager(req.pool);
    const result = await vps.listLearningCorpus(serverId, req.user.id, targetDir);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/vps/:serverId/corpus/snapshot', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { targetDir = '/opt/docniz_corpus' } = req.body || {};
    const vps = createVPSManager(req.pool);
    const result = await vps.snapshotLearningCorpus(serverId, req.user.id, targetDir);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ---------- n8n hardened sandbox provisioning ----------
router.post('/vps/:serverId/n8n/sandbox', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const options = req.body || {};
    const vps = createVPSManager(req.pool);
    const result = await vps.setupN8nSandbox(serverId, req.user.id, options);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Refresh n8n whitelist (update domains file and run refresh script)
router.post('/vps/:serverId/n8n/whitelist/refresh', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { whitelistDomains = [] } = req.body || {};
    const vps = createVPSManager(req.pool);
    const result = await vps.refreshN8nWhitelist(serverId, req.user.id, whitelistDomains);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Install systemd timer for periodic whitelist refresh
router.post('/vps/:serverId/n8n/whitelist/timer', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { onCalendar = 'hourly' } = req.body || {};
    const vps = createVPSManager(req.pool);
    const result = await vps.installN8nWhitelistTimer(serverId, req.user.id, { onCalendar });
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /api/llm/providers
 * Get available LLM providers and their models
 */
router.get('/providers', authenticateToken, async (req, res) => {
  try {
    const providers = await agentSystem.getLLMProviders();
    // Merge in custom providers from DB registry (dynamic)
    await ensureTables(req);
    const custom = await req.pool.query('SELECT id, name, type, config FROM llm_providers ORDER BY id ASC');
    for (const row of custom.rows) {
      providers.push({
        id: row.id,
        name: row.name,
        type: row.type,
        models: row.config?.models || [],
        requiresApiKey: row.type !== 'local'
      });
    }
    
    res.json({
      success: true,
      providers: providers,
      message: 'LLM providers retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting LLM providers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/llm/models/:provider
 * Get available models for a specific provider
 */
router.get('/models/:provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    
  let models = null;
    
    switch (provider) {
      case 'ollama':
        models = await agentSystem.getOllamaModels();
        break;
      case 'openrouter':
        models = await agentSystem.getOpenRouterModels();
        break;
      case 'openai':
        models = [
          'gpt-4-turbo-preview',
          'gpt-4',
          'gpt-3.5-turbo',
          'gpt-3.5-turbo-16k'
        ];
        break;
      case 'anthropic':
        models = [
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
          'claude-2.1',
          'claude-2.0',
          'claude-instant-1.2'
        ];
        break;
      case 'google':
        models = [
          'gemini-pro',
          'gemini-pro-vision',
          'gemini-1.5-pro-latest',
          'gemini-1.5-flash-latest'
        ];
        break;
      case 'cohere':
        models = [
          'command-r-plus',
          'command-r',
          'command',
          'command-nightly',
          'command-light',
          'command-light-nightly'
        ];
        break;
      default:
        // handled below (try dynamic DB-backed provider) then fallback to empty array
        break;
    }

    // If still null, try dynamic/custom provider from DB
    if (models === null) {
      await ensureTables(req);
      const prov = await req.pool.query('SELECT id, name, type, config FROM llm_providers WHERE id = $1', [provider]);
      if (prov.rows.length) {
        const row = prov.rows[0];
        const cfg = row.config || {};
        if (row.type === 'ollama-compatible' && cfg.baseUrl) {
          const resp = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/api/tags`);
          if (resp.ok) {
            const data = await resp.json();
            models = data.models?.map(m => m.name) || [];
          }
        } else if ((row.type === 'openai-compatible' || row.type === 'external') && (cfg.modelsEndpoint || cfg.baseURL)) {
          const endpoint = cfg.modelsEndpoint || `${cfg.baseURL.replace(/\/$/, '')}/models`;
          // TODO: Attach BYOK auth header when stored; omitted for safety here
          const resp = await fetch(endpoint);
          if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data)) {
              models = data.map(m => m.id || m.name).filter(Boolean);
            } else if (Array.isArray(data.data)) {
              models = data.data.map(m => m.id || m.name).filter(Boolean);
            } else if (Array.isArray(data.models)) {
              models = data.models.map(m => m.id || m.name).filter(Boolean);
            }
          } else {
            models = cfg.models || [];
          }
        } else {
          models = cfg.models || [];
        }
      }
      // Final fallback
      if (models === null) models = [];
    }
    
    res.json({
      success: true,
      provider: provider,
      models: models,
      message: `Models for ${provider} retrieved successfully`
    });
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/llm/providers/custom
 * Register or update a custom provider so models can be loaded dynamically in UI
 * Body: { id, name, type, config }
 */
router.post('/providers/custom', authenticateToken, async (req, res) => {
  try {
    await ensureTables(req);
    const { id, name, type, config = {} } = req.body;
    if (!id || !name || !type) {
      return res.status(400).json({ success: false, error: 'id, name, and type are required' });
    }
    await req.pool.query(`
      INSERT INTO llm_providers (id, name, type, config, created_at, updated_at)
      VALUES ($1, $2, $3, $4, now(), now())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        config = EXCLUDED.config,
        updated_at = now()
    `, [id, name, type, JSON.stringify(config)]);
    res.json({ success: true, message: 'Custom provider saved', provider: { id, name, type, config } });
  } catch (error) {
    console.error('Error saving custom provider:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/llm/prompt/review
 * Run a "prompt reviewer" agent that either revises the prompt or asks clarifying questions.
 * Body: { prompt: string, answers?: object }
 * Returns: { status: 'ready'|'needs_clarification', revisedPrompt?: string, questions?: string[], notes?: string }
 */
router.post('/prompt/review', authenticateToken, async (req, res) => {
  try {
    const { prompt, answers = {}, reviewerProvider, reviewerModel, reviewerTemperature } = req.body || {};
    if (!prompt) return res.status(400).json({ success: false, error: 'prompt is required' });

    const userId = req.user.id;
    // Get active LLM configuration
    const configResult = await req.pool.query(`
      SELECT provider, model, config_data
      FROM llm_configurations
      WHERE user_id = $1 AND is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `, [userId]);

    let llmProvider = reviewerProvider || 'ollama';
    let llmModel = reviewerModel || 'llama2';
    let temperature = reviewerTemperature ?? 0.2;
    if ((!reviewerProvider || !reviewerModel) && configResult.rows.length) {
      const c = configResult.rows[0];
      const cfg = JSON.parse(c.config_data);
      if (!reviewerProvider) llmProvider = c.provider;
      if (!reviewerModel) llmModel = c.model;
      if (reviewerTemperature == null) temperature = cfg.temperature ?? 0.2;
    }

    // Create reviewer agent with a strict JSON output instruction
    const reviewSystemPrompt = `You are a Prompt Reviewer & Rewriter Agent. Your goal: transform a user's initial instruction into a precise, executable prompt optimized for downstream AI agents.\n\nThink first using Tree-of-Thought (ToT):\n- Brainstorm 2-3 brief alternative framings of the user's goal.\n- Identify missing inputs, constraints, deliverables, target systems, and success criteria.\n- Select the best framing (clarity, completeness, low ambiguity).\n\nThen produce ONLY a compact JSON object with this exact shape:\n{\n  "status": "ready" | "needs_clarification",\n  "revisedPrompt"?: string,\n  "questions"?: string[],\n  "notes"?: string\n}\nRules:\n- If anything is ambiguous (missing inputs, targets, constraints, credentials), set status = "needs_clarification" and ask 2-5 crisp questions in the "questions" array (no fluff).\n- If sufficient, set status = "ready" and output a concise "revisedPrompt" in imperative voice with:\n  - Objective: one sentence.\n  - Inputs: enumerated facts/links/credentials/placeholders.\n  - Steps: numbered actions (including validation and error handling).\n  - Output: explicit format and destination.\n  - Constraints: time, cost, model/tooling, safety.\n  - Evaluation: how to confirm success.\n- Keep notes brief and actionable. Do NOT include your chain-of-thought or internal analysis—only the JSON.\n\nExample of a well-structured revisedPrompt (for illustration; adapt to the user's domain):\nObjective: Build and validate a content plan for "{brand}".\nInputs:\n- Target audience: {audience}\n- Topics: {topics}\n- Tone: {tone}\nSteps:\n1) Research audience pain points and top questions.\n2) Propose 10 post ideas with titles, hooks, and CTAs.\n3) Map each post to a platform and schedule.\n4) Validate with keyword checks; revise where weak.\n5) Produce a CSV and a summary.\nOutput: CSV with columns [title, hook, CTA, platform, schedule, keyword], plus a 200-word summary.\nConstraints: Complete within current context limits; no external writes.\nEvaluation: Posts must be unique, on-brand, and keyword-backed.\n`;

    const reviewer = await agentSystem.createAgent('prompt_reviewer', {
      userId,
      llmProvider, llmModel, temperature,
      tools: [],
      systemPrompt: reviewSystemPrompt
    });

  const context = { answers };
    const result = await agentSystem.executeAgentTask(reviewer.id, prompt, context);
    if (!result.success) return res.status(500).json({ success: false, error: result.error || 'review_failed' });

    // Best-effort parse of JSON
    let payload = null;
  try { payload = JSON.parse(result.result); } catch (e) { /* ignore parse error */ }
    if (!payload || typeof payload !== 'object') {
      // Fallback: wrap the text as notes and mark needs_clarification
      return res.json({ success: true, status: 'needs_clarification', questions: [ 'Please restate your request more specifically.' ], notes: String(result.result).slice(0, 500) });
    }
    res.json({ success: true, ...payload });
  } catch (error) {
    console.error('Error reviewing prompt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/llm/test
 * Test LLM configuration
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { provider, model, apiKey, temperature = 0.7 } = req.body;
    
    if (!provider || !model) {
      return res.status(400).json({
        success: false,
        error: 'Provider and model are required'
      });
    }
    
    const startTime = Date.now();
    
    // Create LLM instance for testing
    const llmConfig = {
      provider,
      model,
      apiKey,
      temperature,
      userId: req.user.id
    };
    
    const llm = await agentSystem.createLLMInstance(llmConfig);
    
    // Test with a simple prompt
    const testPrompt = 'Hello! Please respond with "Connection successful" to confirm this LLM is working.';
    const response = await llm.invoke(testPrompt);
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      provider: provider,
      model: model,
      responseTime: responseTime,
      testResponse: response.content || response,
      message: 'LLM connection test successful'
    });
  } catch (error) {
    console.error('Error testing LLM:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'LLM connection test failed'
    });
  }
});

/**
 * POST /api/llm/config
 * Save LLM configuration for user
 */
router.post('/config', authenticateToken, async (req, res) => {
  try {
    const {
      provider,
      model,
      apiKey,
      temperature = 0.7,
      maxTokens = 4000,
      streaming = true,
      topP = 1.0,
      frequencyPenalty = 0,
      presencePenalty = 0
    } = req.body;
    
    if (!provider || !model) {
      return res.status(400).json({
        success: false,
        error: 'Provider and model are required'
      });
    }
    
    const userId = req.user.id;
    
    // Encrypt API key if provided
    let encryptedCredentials = null;
    if (apiKey) {
      const credentialData = {
        apiKey: apiKey,
        provider: provider
      };
      
      const encrypted = encryptSecret(
        JSON.stringify(credentialData),
        process.env.ENCRYPTION_KEY
      );
      
      encryptedCredentials = encrypted;
    }
    
    // Save or update LLM configuration
    const configData = {
      provider,
      model,
      temperature,
      maxTokens,
      streaming,
      topP,
      frequencyPenalty,
      presencePenalty
    };
    
    await req.pool.query(`
      INSERT INTO llm_configurations (
        user_id, provider, model, config_data, 
        encrypted_credentials, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, now(), now())
      ON CONFLICT (user_id, provider, model)
      DO UPDATE SET
        config_data = EXCLUDED.config_data,
        encrypted_credentials = COALESCE(EXCLUDED.encrypted_credentials, llm_configurations.encrypted_credentials),
        is_active = EXCLUDED.is_active,
        updated_at = now()
    `, [
      userId,
      provider,
      model,
      JSON.stringify(configData),
      encryptedCredentials ? JSON.stringify(encryptedCredentials) : null,
      true
    ]);
    
    // Set this as the active configuration
    await req.pool.query(`
      UPDATE llm_configurations
      SET is_active = false
      WHERE user_id = $1 AND (provider != $2 OR model != $3)
    `, [userId, provider, model]);
    
    res.json({
      success: true,
      configuration: {
        provider,
        model,
        ...configData
      },
      message: 'LLM configuration saved successfully'
    });
  } catch (error) {
    console.error('Error saving LLM config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/llm/config
 * Get current LLM configuration for user
 */
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await req.pool.query(`
      SELECT provider, model, config_data, created_at, updated_at
      FROM llm_configurations
      WHERE user_id = $1 AND is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        configuration: null,
        message: 'No active LLM configuration found'
      });
    }
    
    const config = result.rows[0];
    const configData = JSON.parse(config.config_data);
    
    res.json({
      success: true,
      configuration: {
        provider: config.provider,
        model: config.model,
        ...configData,
        createdAt: config.created_at,
        updatedAt: config.updated_at
      },
      message: 'LLM configuration retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting LLM config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/llm/configs
 * Get all LLM configurations for user
 */
router.get('/configs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await req.pool.query(`
      SELECT provider, model, config_data, is_active, created_at, updated_at
      FROM llm_configurations
      WHERE user_id = $1
      ORDER BY updated_at DESC
    `, [userId]);
    
    const configurations = result.rows.map(config => ({
      provider: config.provider,
      model: config.model,
      ...JSON.parse(config.config_data),
      isActive: config.is_active,
      createdAt: config.created_at,
      updatedAt: config.updated_at
    }));
    
    res.json({
      success: true,
      configurations: configurations,
      message: 'LLM configurations retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting LLM configs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/llm/config/:provider/:model
 * Delete specific LLM configuration
 */
router.delete('/config/:provider/:model', authenticateToken, async (req, res) => {
  try {
    const { provider, model } = req.params;
    const userId = req.user.id;
    
    const result = await req.pool.query(`
      DELETE FROM llm_configurations
      WHERE user_id = $1 AND provider = $2 AND model = $3
      RETURNING *
    `, [userId, provider, model]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }
    
    res.json({
      success: true,
      message: 'LLM configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting LLM config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/llm/chat
 * Chat with selected LLM
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
  const { message, agentType = 'master', context = {}, sessionId: inputSessionId } = req.body;
    const userId = req.user.id;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    // Optional: If client requests SSE via Accept header, stream the response.
    // Note: POST with SSE works in many environments but some proxies prefer GET. See /chat/stream below.
    const wantsSSE = (req.headers['accept'] || '').includes('text/event-stream');
    
    // Get user's active LLM configuration
    const configResult = await req.pool.query(`
      SELECT provider, model, config_data, encrypted_credentials
      FROM llm_configurations
      WHERE user_id = $1 AND is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `, [userId]);
    
    let llmConfig = {
      provider: 'ollama',
      model: 'llama2',
      temperature: 0.7
    };
    
    if (configResult.rows.length > 0) {
      const config = configResult.rows[0];
      const configData = JSON.parse(config.config_data);
      
      llmConfig = {
        provider: config.provider,
        model: config.model,
        ...configData,
        userId: userId
      };
    }
    
    // Create or get agent
    const agentConfig = {
      userId: userId,
      llmProvider: llmConfig.provider,
      llmModel: llmConfig.model,
      temperature: llmConfig.temperature,
      tools: ['web_search', 'vps_list_servers', 'n8n_create_workflow', 'affiliate_search_products']
    };
    
    const agent = await agentSystem.createAgent(agentType, agentConfig);

    // Ensure tables for session/message persistence
    await ensureTables(req);
    // Resolve or create chat session
    let sessionId = inputSessionId;
    if (!sessionId) {
      const created = await req.pool.query(`
        INSERT INTO chat_session (user_id, title, provider, model) VALUES ($1, $2, $3, $4) RETURNING id
      `, [userId, (context.title || 'Chat Session'), llmConfig.provider, llmConfig.model]);
      sessionId = created.rows[0].id;
    }

    if (wantsSSE) {
      // Server-Sent Events streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      // CORS headers (optional; adjust per your server-wide config)
      if (!res.getHeader('Access-Control-Allow-Origin')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }

      const sendEvent = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
      };

      // Heartbeat to keep connection alive through proxies
      const heartbeat = setInterval(() => {
        res.write(': ping\n\n');
      }, 15000);

      req.on('close', () => {
        clearInterval(heartbeat);
      });

      const startTime = Date.now();

      // Stream tokens
      let accumulated = '';
      const streamResult = await agentSystem.executeAgentTaskStream(
        agent.id,
        message,
        (token) => {
          // Stream each token chunk as an SSE message
          accumulated += token;
          sendEvent('token', token);
        },
        context
      );

      // Send final result event and close
      sendEvent('done', {
        success: streamResult.success,
        agentId: agent.id,
        executionTime: Date.now() - startTime
      });

      // Persist messages
      try {
        await req.pool.query('INSERT INTO message (session_id, role, content) VALUES ($1, $2, $3)', [
          sessionId, 'user', JSON.stringify({ text: message, context })
        ]);
        await req.pool.query('INSERT INTO message (session_id, role, content) VALUES ($1, $2, $3)', [
          sessionId, 'assistant', JSON.stringify({ text: accumulated })
        ]);
      } catch (e) {
        console.warn('Failed to persist chat messages (SSE):', e.message);
      }

      clearInterval(heartbeat);
      res.end();
      return; // Important: stop normal JSON response
    }

    // Non-streaming JSON response
    const result = await agentSystem.executeAgentTask(agent.id, message, context);
    // Persist messages
    try {
      await req.pool.query('INSERT INTO message (session_id, role, content) VALUES ($1, $2, $3)', [
        sessionId, 'user', JSON.stringify({ text: message, context })
      ]);
      await req.pool.query('INSERT INTO message (session_id, role, content) VALUES ($1, $2, $3)', [
        sessionId, 'assistant', JSON.stringify({ text: result.result })
      ]);
    } catch (e) {
      console.warn('Failed to persist chat messages:', e.message);
    }
    res.json({
      success: result.success,
      response: result.result,
      agentId: result.agentId,
      executionTime: result.executionTime,
  llmConfig: {
        provider: llmConfig.provider,
        model: llmConfig.model
      },
  sessionId,
      message: result.success ? 'Chat completed successfully' : 'Chat failed'
    });
  } catch (error) {
    console.error('Error in LLM chat:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/llm/chat/stream
 * SSE streaming chat endpoint (preferred for EventSource on browsers)
 * Usage: /api/llm/chat/stream?message=Hello&agentType=master
 */
router.get('/chat/stream', authenticateTokenFlexible, async (req, res) => {
  try {
  const message = req.query.message;
    const agentType = req.query.agentType || 'master';
  const context = req.query.context ? JSON.parse(req.query.context) : {};
  const inputSessionId = req.query.sessionId || null;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Get user's active LLM configuration
    const configResult = await req.pool.query(`
      SELECT provider, model, config_data, encrypted_credentials
      FROM llm_configurations
      WHERE user_id = $1 AND is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `, [userId]);

    let llmConfig = { provider: 'ollama', model: 'llama2', temperature: 0.7 };
    if (configResult.rows.length > 0) {
      const config = configResult.rows[0];
      const configData = JSON.parse(config.config_data);
      llmConfig = { provider: config.provider, model: config.model, ...configData, userId };
    }

    // Create agent
    const agentConfig = {
      userId,
      llmProvider: llmConfig.provider,
      llmModel: llmConfig.model,
      temperature: llmConfig.temperature,
      tools: ['web_search', 'vps_list_servers', 'n8n_create_workflow', 'affiliate_search_products']
    };
    const agent = await agentSystem.createAgent(agentType, agentConfig);

    await ensureTables(req);
    let sessionId = inputSessionId;
    if (!sessionId) {
      const created = await req.pool.query(`
        INSERT INTO chat_session (user_id, title, provider, model) VALUES ($1, $2, $3, $4) RETURNING id
      `, [userId, (context.title || 'Chat Session'), llmConfig.provider, llmConfig.model]);
      sessionId = created.rows[0].id;
    }

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (!res.getHeader('Access-Control-Allow-Origin')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
    };

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);
    req.on('close', () => clearInterval(heartbeat));

    const startTime = Date.now();

    // Stream tokens
    let accumulated = '';
    const streamResult = await agentSystem.executeAgentTaskStream(
      agent.id,
      message,
      (token) => { accumulated += token; sendEvent('token', token); },
      context
    );

    // Final event
    sendEvent('done', {
      success: streamResult.success,
      agentId: agent.id,
      executionTime: Date.now() - startTime
    });

    // Persist messages
    try {
      await req.pool.query('INSERT INTO message (session_id, role, content) VALUES ($1, $2, $3)', [
        sessionId, 'user', JSON.stringify({ text: message, context })
      ]);
      await req.pool.query('INSERT INTO message (session_id, role, content) VALUES ($1, $2, $3)', [
        sessionId, 'assistant', JSON.stringify({ text: accumulated })
      ]);
    } catch (e) {
      console.warn('Failed to persist chat messages (GET stream):', e.message);
    }

    clearInterval(heartbeat);
    res.end();
  } catch (error) {
    console.error('Error in LLM chat stream:', error);
    // Attempt to send an error event if headers already sent; otherwise JSON
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
    try {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } catch (_) {
      // ignore
    }
  }
});

// ---------- Chat session management ----------

/**
 * GET /api/llm/sessions
 * List chat sessions for the current user
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    await ensureTables(req);
    const result = await req.pool.query(`
      SELECT id, title, provider, model, created_at
      FROM chat_session
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.id]);
    res.json({ success: true, sessions: result.rows });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/llm/sessions
 * Create a new chat session
 */
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    await ensureTables(req);
    const { title = 'Chat Session', provider = null, model = null } = req.body || {};
    const created = await req.pool.query(`
      INSERT INTO chat_session (user_id, title, provider, model) VALUES ($1, $2, $3, $4)
      RETURNING id, title, provider, model, created_at
    `, [req.user.id, title, provider, model]);
    res.json({ success: true, session: created.rows[0] });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/llm/sessions/:id/messages
 * Get messages for a session
 */
router.get('/sessions/:id/messages', authenticateToken, async (req, res) => {
  try {
    await ensureTables(req);
    const { id } = req.params;
    const msgs = await req.pool.query(`
      SELECT role, content, created_at FROM message
      WHERE session_id = $1
      ORDER BY created_at ASC
    `, [id]);
    res.json({ success: true, messages: msgs.rows });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/llm/sessions/:id/clear
 * Remove all messages from a session (but keep the session record)
 */
router.post('/sessions/:id/clear', authenticateToken, async (req, res) => {
  try {
    await ensureTables(req);
    const { id } = req.params;
    await req.pool.query('DELETE FROM message WHERE session_id = $1', [id]);
    res.json({ success: true, message: 'Session cleared' });
  } catch (error) {
    console.error('Error clearing session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/llm/agents/status
 * Get status of all active agents
 */
router.get('/agents/status', authenticateToken, async (req, res) => {
  try {
    const status = await agentSystem.getAgentStatus();
    
    res.json({
      success: true,
      agentStatus: status,
      message: 'Agent status retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting agent status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/llm/agents/cleanup
 * Cleanup inactive agents
 */
router.post('/agents/cleanup', authenticateToken, async (req, res) => {
  try {
    await agentSystem.cleanupAgents();
    
    res.json({
      success: true,
      message: 'Agent cleanup completed successfully'
    });
  } catch (error) {
    console.error('Error cleaning up agents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/llm/orchestrate
 * Orchestrate multiple agents for complex tasks
 */
router.post('/orchestrate', authenticateToken, async (req, res) => {
  try {
    const { masterTask, agentConfigs = {} } = req.body;
    const userId = req.user.id;
    
    if (!masterTask) {
      return res.status(400).json({
        success: false,
        error: 'Master task is required'
      });
    }
    
    // Add user ID to all agent configs
    const enhancedAgentConfigs = {};
    for (const [agentType, config] of Object.entries(agentConfigs)) {
      enhancedAgentConfigs[agentType] = {
        ...config,
        userId: userId
      };
    }
    
    // Add default master agent config if not provided
    if (!enhancedAgentConfigs.master) {
      enhancedAgentConfigs.master = {
        userId: userId,
        llmProvider: 'ollama',
        llmModel: 'llama2',
        tools: ['web_search', 'vps_list_servers', 'n8n_create_workflow']
      };
    }
    
    const result = await agentSystem.orchestrateAgents(masterTask, enhancedAgentConfigs);
    
    res.json({
      success: result.success,
      orchestration: result,
      message: result.success ? 'Task orchestration completed successfully' : 'Task orchestration completed with some failures'
    });
  } catch (error) {
    console.error('Error orchestrating agents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

