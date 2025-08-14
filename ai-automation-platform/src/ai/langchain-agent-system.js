// LangChain-Powered Agent System with Dynamic LLM Selection
// Supports local Ollama and external LLM providers through MCP

import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatCohere } from '@langchain/cohere';

import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { BufferMemory } from 'langchain/memory';
import { ConversationSummaryBufferMemory } from 'langchain/memory';
import { DynamicTool, Tool } from '@langchain/core/tools';
import { RunnableSequence } from '@langchain/core/runnables';

import { decryptSecret } from '../utils/crypto.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Managers to enable tool actions (VPS, N8N, WordPress, Postiz, Affiliate)
import { createVPSManager } from '../modules/vps/manager.js';
import { createN8NManager } from '../modules/n8n/manager.js';
import { createWordPressManager } from '../modules/wordpress/manager.js';
import { createPostizManager } from '../modules/postiz/manager.js';
import { createAffiliateManager } from '../modules/affiliate/manager.js';

/**
 * LangChain Agent System with Dynamic LLM Provider Selection
 */
export class LangChainAgentSystem {
  constructor(pool, redis) {
    this.pool = pool;
    this.redis = redis;
    this.llmProviders = new Map();
    this.agents = new Map();
    this.memories = new Map();
    this.tools = new Map();
    // Provide tool managers so DynamicTool handlers can call into real modules
    this.managers = {
      vps: createVPSManager(this.pool),
      n8n: createN8NManager(this.pool),
      wordpress: createWordPressManager(this.pool),
      postiz: createPostizManager(this.pool),
      affiliate: createAffiliateManager(this.pool)
    };
    
    this.initializeLLMProviders();
    this.initializeTools();
  }

  /**
   * Initialize available LLM providers
   */
  initializeLLMProviders() {
    this.llmProviders.set('ollama', {
      name: 'Ollama (Local)',
      type: 'local',
      models: [
        // Western Models
        'llama3.1:8b', 'llama3.1:70b', 'llama3.1:405b',
        'llama3:8b', 'llama3:70b',
        'llama2:7b', 'llama2:13b', 'llama2:70b',
        'codellama:7b', 'codellama:13b', 'codellama:34b',
        'mistral:7b', 'mixtral:8x7b', 'mixtral:8x22b',
        'gemma:2b', 'gemma:7b',
        'phi3:3.8b', 'phi3:14b',
        
        // Chinese Models - Qwen Series (Alibaba)
        'qwen2.5:72b', 'qwen2.5:32b', 'qwen2.5:14b', 'qwen2.5:7b', 'qwen2.5:3b', 'qwen2.5:1.5b',
        'qwen2:72b', 'qwen2:7b', 'qwen2:1.5b',
        'qwen:14b', 'qwen:7b', 'qwen:4b',
        'codeqwen:7b',
        
        // ChatGLM Series (Zhipu AI)
        'chatglm3:6b',
        'glm4:9b',
        
        // Baichuan Series
        'baichuan2:13b', 'baichuan2:7b',
        
        // Yi Series (01.AI)
        'yi:34b', 'yi:6b',
        
        // InternLM Series (Shanghai AI Lab)
        'internlm2:20b', 'internlm2:7b',
        
        // Other Chinese Models
        'deepseek-coder:6.7b', 'deepseek-coder:33b',
        'chinese-alpaca2:7b', 'chinese-alpaca2:13b'
      ],
      createInstance: (config) => new ChatOllama({
        baseUrl: config.baseUrl || 'http://localhost:11434',
        model: config.model || 'llama3.1:8b',
        temperature: config.temperature || 0.7,
        ...config
      })
    });

    this.llmProviders.set('openai', {
      name: 'OpenAI',
      type: 'external',
      models: [
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k'
      ],
      createInstance: (config) => new ChatOpenAI({
        openAIApiKey: config.apiKey,
        modelName: config.model || 'gpt-3.5-turbo',
        temperature: config.temperature || 0.7,
        ...config
      })
    });

    this.llmProviders.set('anthropic', {
      name: 'Anthropic',
      type: 'external',
      models: [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-2.1',
        'claude-2.0',
        'claude-instant-1.2'
      ],
      createInstance: (config) => new ChatAnthropic({
        anthropicApiKey: config.apiKey,
        modelName: config.model || 'claude-3-sonnet-20240229',
        temperature: config.temperature || 0.7,
        ...config
      })
    });

    this.llmProviders.set('google', {
      name: 'Google AI',
      type: 'external',
      models: [
        'gemini-pro',
        'gemini-pro-vision',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash-latest'
      ],
      createInstance: (config) => new ChatGoogleGenerativeAI({
        apiKey: config.apiKey,
        modelName: config.model || 'gemini-pro',
        temperature: config.temperature || 0.7,
        ...config
      })
    });

    this.llmProviders.set('cohere', {
      name: 'Cohere',
      type: 'external',
      models: [
        'command-r-plus',
        'command-r',
        'command',
        'command-nightly',
        'command-light',
        'command-light-nightly'
      ],
      createInstance: (config) => new ChatCohere({
        apiKey: config.apiKey,
        model: config.model || 'command-r',
        temperature: config.temperature || 0.7,
        ...config
      })
    });

    // Chinese LLM Providers
    this.llmProviders.set('baidu', {
      name: 'Baidu (Ernie Bot)',
      type: 'external',
      models: [
        'ernie-4.0-turbo-8k',
        'ernie-4.0-8k',
        'ernie-3.5-8k',
        'ernie-3.5-4k',
        'ernie-lite-8k',
        'ernie-speed-128k',
        'ernie-speed-8k'
      ],
      createInstance: (config) => this.createBaiduChat(config)
    });

    this.llmProviders.set('alibaba', {
      name: 'Alibaba (Qwen)',
      type: 'external',
      models: [
        'qwen-turbo',
        'qwen-plus',
        'qwen-max',
        'qwen-max-1201',
        'qwen-max-longcontext',
        'qwen-vl-plus',
        'qwen-vl-max'
      ],
      createInstance: (config) => this.createAlibabaChat(config)
    });

    this.llmProviders.set('tencent', {
      name: 'Tencent (Hunyuan)',
      type: 'external',
      models: [
        'hunyuan-lite',
        'hunyuan-standard',
        'hunyuan-pro',
        'hunyuan-turbo'
      ],
      createInstance: (config) => this.createTencentChat(config)
    });

    this.llmProviders.set('bytedance', {
      name: 'ByteDance (Doubao)',
      type: 'external',
      models: [
        'doubao-lite-4k',
        'doubao-lite-32k',
        'doubao-lite-128k',
        'doubao-pro-4k',
        'doubao-pro-32k',
        'doubao-pro-128k'
      ],
      createInstance: (config) => this.createByteDanceChat(config)
    });

    this.llmProviders.set('iflytek', {
      name: 'iFlytek (Spark)',
      type: 'external',
      models: [
        'spark-lite',
        'spark-pro',
        'spark-pro-128k',
        'spark-max',
        'spark-4.0-ultra'
      ],
      createInstance: (config) => this.createIFlytekChat(config)
    });

    this.llmProviders.set('sensetime', {
      name: 'SenseTime (SenseChat)',
      type: 'external',
      models: [
        'sensechat-5',
        'sensechat-turbo',
        'sensechat-character'
      ],
      createInstance: (config) => this.createSenseTimeChat(config)
    });

    this.llmProviders.set('zhipu', {
      name: 'Zhipu AI (ChatGLM)',
      type: 'external',
      models: [
        'glm-4',
        'glm-4v',
        'glm-3-turbo',
        'chatglm_turbo',
        'chatglm_pro',
        'chatglm_std',
        'chatglm_lite'
      ],
      createInstance: (config) => this.createZhipuChat(config)
    });

    this.llmProviders.set('moonshot', {
      name: 'Moonshot AI (Kimi)',
      type: 'external',
      models: [
        'moonshot-v1-8k',
        'moonshot-v1-32k',
        'moonshot-v1-128k'
      ],
      createInstance: (config) => this.createMoonshotChat(config)
    });

    this.llmProviders.set('openrouter', {
      name: 'OpenRouter',
      type: 'external',
      models: [], // Will be populated from OpenRouter API
      createInstance: (config) => new ChatOpenAI({
        openAIApiKey: config.apiKey,
        modelName: config.model,
        temperature: config.temperature || 0.7,
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': config.referer || 'https://your-domain.com',
            'X-Title': config.title || 'AI Automation Platform'
          }
        },
        ...config
      })
    });
  }

  /**
   * Get available LLM providers for frontend
   */
  async getLLMProviders() {
    const providers = [];
    
    for (const [key, provider] of this.llmProviders) {
      let models = provider.models;
      
      // For Ollama, get available models from local instance
      if (key === 'ollama') {
        models = await this.getOllamaModels();
      }
      
      // For OpenRouter, get models from API
      if (key === 'openrouter') {
        models = await this.getOpenRouterModels();
      }
      
      providers.push({
        id: key,
        name: provider.name,
        type: provider.type,
        models: models,
        requiresApiKey: provider.type === 'external'
      });
    }
    
    return providers;
  }

  /**
   * Get available Ollama models from local instance
   */
  async getOllamaModels() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        console.warn('Could not fetch Ollama models, using defaults');
        return ['llama2', 'codellama', 'mistral', 'neural-chat'];
      }
      
      const data = await response.json();
      return data.models?.map(model => model.name) || [];
    } catch (error) {
      console.warn('Error fetching Ollama models:', error.message);
      return ['llama2', 'codellama', 'mistral', 'neural-chat'];
    }
  }

  /**
   * Get available OpenRouter models
   */
  async getOpenRouterModels() {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      if (!response.ok) {
        return ['anthropic/claude-3.5-sonnet', 'openai/gpt-4-turbo', 'meta-llama/llama-3-70b-instruct'];
      }
      
      const data = await response.json();
      return data.data?.map(model => model.id) || [];
    } catch (error) {
      console.warn('Error fetching OpenRouter models:', error.message);
      return ['anthropic/claude-3.5-sonnet', 'openai/gpt-4-turbo', 'meta-llama/llama-3-70b-instruct'];
    }
  }

  /**
   * Create LLM instance with dynamic provider selection
   */
  async createLLMInstance(config) {
    const { provider, model, apiKey, temperature = 0.7, userId } = config;
    
    const providerInfo = this.llmProviders.get(provider);
    if (!providerInfo) {
      throw new Error(`Unknown LLM provider: ${provider}`);
    }
    
    let llmConfig = {
      model,
      temperature,
      maxTokens: config.maxTokens || 4000,
      streaming: config.streaming !== false
    };
    
    // Handle API key for external providers
    if (providerInfo.type === 'external') {
      if (apiKey) {
        llmConfig.apiKey = apiKey;
      } else if (userId) {
        // Get encrypted API key from database
        const credResult = await this.pool.query(`
          SELECT enc_data, enc_iv, enc_tag
          FROM credentials
          WHERE user_id = $1 AND service = $2
          ORDER BY created_at DESC
          LIMIT 1
        `, [userId, provider]);
        
        if (credResult.rows.length > 0) {
          const decryptedData = decryptSecret(
            credResult.rows[0].enc_data,
            credResult.rows[0].enc_iv,
            credResult.rows[0].enc_tag,
            process.env.ENCRYPTION_KEY
          );
          const credentials = JSON.parse(decryptedData);
          llmConfig.apiKey = credentials.apiKey;
        } else {
          throw new Error(`No API key found for provider: ${provider}`);
        }
      } else {
        throw new Error(`API key required for external provider: ${provider}`);
      }
    }
    
    // Special handling for Ollama
    if (provider === 'ollama') {
      llmConfig.baseUrl = config.ollamaUrl || 'http://localhost:11434';
    }
    
    return providerInfo.createInstance(llmConfig);
  }

  /**
   * Initialize available tools for agents
   */
  initializeTools() {
    // VPS Management Tools
    this.tools.set('vps_list_servers', new DynamicTool({
      name: 'vps_list_servers',
      description: 'List all VPS servers for the user',
      func: async (input) => {
        const { userId } = JSON.parse(input);
        const servers = await this.managers.vps.listServers(userId);
        return JSON.stringify(servers);
      }
    }));

    this.tools.set('vps_deploy_stack', new DynamicTool({
      name: 'vps_deploy_stack',
      description: 'Deploy full stack to VPS server',
      func: async (input) => {
        const params = JSON.parse(input);
        const result = await this.managers.vps.deployScript(
          params.serverId,
          params.userId,
          params.stackType,
          params.environment
        );
        return JSON.stringify(result);
      }
    }));

    // N8N Workflow Tools
    this.tools.set('n8n_create_workflow', new DynamicTool({
      name: 'n8n_create_workflow',
      description: 'Create a new N8N workflow',
      func: async (input) => {
        const params = JSON.parse(input);
        const workflow = await this.managers.n8n.createWorkflow(params, params.userId);
        return JSON.stringify(workflow);
      }
    }));

    this.tools.set('n8n_execute_workflow', new DynamicTool({
      name: 'n8n_execute_workflow',
      description: 'Execute an N8N workflow',
      func: async (input) => {
        const params = JSON.parse(input);
        const result = await this.managers.n8n.executeWorkflow(
          params.workflowId,
          params.inputData,
          params.userId
        );
        return JSON.stringify(result);
      }
    }));

    // WordPress Tools
    this.tools.set('wp_create_post', new DynamicTool({
      name: 'wp_create_post',
      description: 'Create a WordPress post',
      func: async (input) => {
        const params = JSON.parse(input);
        const post = await this.managers.wordpress.createContent(
          params.siteId,
          params,
          params.userId
        );
        return JSON.stringify(post);
      }
    }));

    // Social Media Tools
    this.tools.set('social_create_post', new DynamicTool({
      name: 'social_create_post',
      description: 'Create a social media post',
      func: async (input) => {
        const params = JSON.parse(input);
        const post = await this.managers.postiz.createPost(params);
        return JSON.stringify(post);
      }
    }));

    // Affiliate Marketing Tools
    this.tools.set('affiliate_search_products', new DynamicTool({
      name: 'affiliate_search_products',
      description: 'Search for affiliate products',
      func: async (input) => {
        const params = JSON.parse(input);
        const products = await this.managers.affiliate.searchProducts(
          params.userId,
          params
        );
        return JSON.stringify(products);
      }
    }));

    // Research Tools
    this.tools.set('web_search', new DynamicTool({
      name: 'web_search',
      description: 'Search the web for information',
      func: async (input) => {
        const { query, numResults = 5 } = JSON.parse(input);
        // Implement web search functionality
        const results = await this.performWebSearch(query, numResults);
        return JSON.stringify(results);
      }
    }));

    this.tools.set('analyze_data', new DynamicTool({
      name: 'analyze_data',
      description: 'Analyze data and provide insights',
      func: async (input) => {
        const { data, analysisType } = JSON.parse(input);
        const analysis = await this.performDataAnalysis(data, analysisType);
        return JSON.stringify(analysis);
      }
    }));
  }

  /**
   * Create specialized agent with LangChain
   */
  async createAgent(agentType, config) {
    const {
      userId,
      llmProvider = 'ollama',
      llmModel = 'llama2',
      systemPrompt,
      tools = [],
      memoryType = 'buffer',
      maxMemorySize = 2000
    } = config;

    // Create LLM instance
    const llm = await this.createLLMInstance({
      provider: llmProvider,
      model: llmModel,
      userId: userId,
      temperature: config.temperature || 0.7
    });

    // Create memory
    let memory;
    if (memoryType === 'summary') {
      memory = new ConversationSummaryBufferMemory({
        llm: llm,
        maxTokenLimit: maxMemorySize,
        returnMessages: true,
        memoryKey: 'chat_history'
      });
    } else {
      memory = new BufferMemory({
        returnMessages: true,
        memoryKey: 'chat_history',
        maxTokenLimit: maxMemorySize
      });
    }

    // Get tools for agent
    const agentTools = tools.map(toolName => {
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
      }
      return tool;
    });

    // Build enriched system prompt with knowledge base and recent sessions
    const enrichedSystemPrompt = await this.buildSystemPrompt(agentType, userId, systemPrompt);

    // Create prompt template with memory placeholders
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', enrichedSystemPrompt],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad')
    ]);

    // Create agent
    const agent = await createOpenAIFunctionsAgent({
      llm,
      tools: agentTools,
      prompt
    });

    // Create agent executor
    const agentExecutor = new AgentExecutor({
      agent,
      tools: agentTools,
      memory,
      verbose: process.env.NODE_ENV === 'development',
      maxIterations: config.maxIterations || 10,
      earlyStoppingMethod: 'generate'
    });

    const agentId = `${agentType}_${userId}_${Date.now()}`;
    
    // Store agent and memory
    this.agents.set(agentId, agentExecutor);
    this.memories.set(agentId, memory);

    return {
      id: agentId,
      type: agentType,
      executor: agentExecutor,
      memory: memory,
      llmProvider: llmProvider,
      llmModel: llmModel
    };
  }

  /**
   * Build a comprehensive system prompt that includes:
   * - Default role and objectives per agent type
   * - Knowledge base snippets from docs/knowledge
   * - Summaries from the user's last 5 sessions for long-term memory
   */
  async buildSystemPrompt(agentType, userId, overridePrompt) {
    const base = overridePrompt || this.getDefaultSystemPrompt(agentType);
    const kb = await this.loadKnowledgeBase(agentType);
    const memories = await this.getRecentSessionsSummary(userId, 5);
    const memoryBlock = memories ? `\n\nRecent user sessions (last 5):\n${memories}` : '';
    const kbBlock = kb ? `\n\nKnowledge Base for ${agentType} agent:\n${kb}` : '';
    return `${base}${kbBlock}${memoryBlock}\n\nAlways verify existing assets and workflows before creating new ones; aim for at least 99% error-free execution by studying close examples.`;
  }

  /** Load knowledge base text for an agent from docs/knowledge/<agentType>.md if present */
  async loadKnowledgeBase(agentType) {
    try {
      const kbDir = path.resolve(__dirname, '../../docs/knowledge');
      const map = {
        master: 'master.md',
        technical: 'n8n.md',
        n8n: 'n8n.md',
        wordpress: 'wordpress.md',
        affiliate: 'affiliate.md',
        postiz: 'postiz.md',
        vps: 'vps.md',
        content: 'content.md',
  research: 'research.md',
  prompt_reviewer: 'master.md'
      };
      const file = map[agentType] || 'master.md';
      const p = path.join(kbDir, file);
      const data = await fs.readFile(p, 'utf8').catch(() => '');
      return data;
    } catch {
      return '';
    }
  }

  /** Summarize last N sessions: titles and last utterance pairs */
  async getRecentSessionsSummary(userId, limit = 5) {
    try {
      if (!userId) return '';
      const sess = await this.pool.query(`
        SELECT id, title, provider, model, created_at
        FROM chat_session
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);
      const lines = [];
      for (const s of sess.rows) {
        const msgs = await this.pool.query(`
          SELECT role, content, created_at
          FROM message
          WHERE session_id = $1
          ORDER BY created_at DESC
          LIMIT 2
        `, [s.id]);
        const last = msgs.rows.reverse().map(m => {
          let text = '';
          try { text = typeof m.content === 'string' ? m.content : (m.content?.text || JSON.stringify(m.content)); } catch { text = String(m.content); }
          return `${m.role}: ${String(text).slice(0, 280)}`;
        }).join(' | ');
        lines.push(`- ${s.title || 'Session'} [${s.provider || ''}/${s.model || ''}] ${new Date(s.created_at).toISOString()} => ${last}`);
      }
      return lines.join('\n');
    } catch (e) {
      console.warn('getRecentSessionsSummary failed:', e.message);
      return '';
    }
  }

  /**
   * Get default system prompt for agent type
   */
  getDefaultSystemPrompt(agentType) {
    const prompts = {
      master: `Role: Master Orchestrator Agent\nObjectives:\n- Understand multi-step business tasks and create an execution plan.\n- Coordinate sub-agents (n8n, WordPress, VPS, Affiliate, Social/Postiz) end-to-end.\n- Before acting, study existing live assets/workflows to avoid duplication.\n- Verify results and maintain state for continuity across sessions.\nProcess:\n1) Analyze request and decompose into steps.\n2) Search knowledge base and existing artifacts first.\n3) Call tools to create/update assets.\n4) Validate, summarize, and store outcomes for future recall.\nQuality Bar: >= 99% error-free by learning from close examples.`,

      technical: `Role: Technical Automation Agent (n8n, WordPress, VPS)\nWhen asked to build an n8n workflow:\n- Study available nodes and example workflows (prefer live examples) before building.\n- Search for similar workflows; if found, learn structure, triggers, error handling, and credentials management.\n- Compose your workflow modularly, with clear naming and retry/error policies.\nFor WordPress landing pages:\n- Follow proper structure (themes/templates/blocks) and site identification schemas.\n- Reuse components when possible; ensure idempotent page updates.\nFor VPS tasks:\n- Choose the right stack script via the resolver, avoid full reinstalls unless necessary.\nAim for 99% error-free by referencing examples.`,

      affiliate: `Role: Affiliate Agent\n- Research affiliate catalogs, filter by relevance, margins, and compliance.\n- Cross-check brand terms and policy constraints.\n- Provide shortlists with rationale, creatives ideas, and tracking guidance.`,

      content: `Role: Content Agent\n- Draft conversion-focused copy, video scripts, and landing blocks.\n- Respect brand voice and SEO principles.\n- Provide variants and A/B test ideas.`,

  research: `Role: Research Agent\n- Gather and cross-verify facts quickly.\n- Provide sources, confidence, and concise actionable summaries.`,
  prompt_reviewer: `Role: Prompt Reviewer Agent\n- Identify ambiguities, missing info, or risky assumptions in user prompts.\n- Produce either clarifying questions or a crisp revised prompt ready for execution.\n- Return outputs as compact JSON when requested by the API.`
    };

    return prompts[agentType] || prompts.master;
  }

  /**
   * Execute agent task
   */
  async executeAgentTask(agentId, task, context = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    try {
      // Add context to the task
      const enhancedTask = {
        input: task,
        context: context,
        timestamp: new Date().toISOString()
      };

      const result = await agent.invoke({
        input: JSON.stringify(enhancedTask)
      });

      // Log the interaction
      await this.logAgentInteraction(agentId, task, result, context);

      return {
        success: true,
        result: result.output,
        agentId: agentId,
        executionTime: Date.now() - new Date(enhancedTask.timestamp).getTime()
      };
    } catch (error) {
      console.error(`Agent execution error:`, error);
      
      // Log the error
      await this.logAgentInteraction(agentId, task, { error: error.message }, context);

      return {
        success: false,
        error: error.message,
        agentId: agentId
      };
    }
  }

  /**
   * Stream agent task output token-by-token via callback (best-effort)
   * Falls back to non-streaming if underlying LLM/agent doesn't support callbacks
   */
  async executeAgentTaskStream(agentId, task, onToken, context = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const enhancedTask = {
      input: task,
      context: context,
      timestamp: new Date().toISOString()
    };

    let aggregated = '';
    try {
      // Try invoking with callbacks to stream tokens as they are generated
      const result = await agent.invoke(
        { input: JSON.stringify(enhancedTask) },
        {
          callbacks: [{
            handleLLMNewToken(token) {
              aggregated += token;
              try { onToken(token); } catch { /* ignore */ }
            }
          }]
        }
      );

      // Ensure at least final output is sent if streaming wasn't supported
      if (!aggregated && result && result.output) {
        aggregated = String(result.output);
        try { onToken(aggregated); } catch { /* ignore */ }
      }

      // Log interaction (non-blocking)
      this.logAgentInteraction(agentId, task, { output: aggregated }, context).catch(() => {});

      return { success: true, result: aggregated, agentId };
    } catch (error) {
      await this.logAgentInteraction(agentId, task, { error: error.message }, context).catch(() => {});
      return { success: false, error: error.message, agentId };
    }
  }

  /**
   * Orchestrate multiple agents for complex tasks
   */
  async orchestrateAgents(masterTask, agentConfigs) {
    const results = [];
    const masterAgent = await this.createAgent('master', {
      ...agentConfigs.master,
      tools: ['vps_list_servers', 'n8n_create_workflow', 'affiliate_search_products', 'web_search']
    });

    // Master agent analyzes the task and creates execution plan
    const planResult = await this.executeAgentTask(masterAgent.id, 
      `Analyze this complex task and create an execution plan: ${masterTask}`
    );

    if (!planResult.success) {
      throw new Error(`Master agent planning failed: ${planResult.error}`);
    }

    // Parse the execution plan
    let executionPlan;
    try {
      executionPlan = JSON.parse(planResult.result);
    } catch (error) {
      // If parsing fails, treat the result as a text plan
      executionPlan = {
        steps: [{ description: planResult.result, agent: 'master' }]
      };
    }

    // Execute each step in the plan
    for (const step of executionPlan.steps || []) {
      const agentType = step.agent || 'master';
      const agentConfig = agentConfigs[agentType] || agentConfigs.master;

      let agent;
      if (agentType === 'master') {
        agent = masterAgent;
      } else {
        agent = await this.createAgent(agentType, agentConfig);
      }

      const stepResult = await this.executeAgentTask(
        agent.id,
        step.description,
        { step: step, masterTask: masterTask }
      );

      results.push({
        step: step,
        agent: agentType,
        result: stepResult
      });

      // If a step fails and it's critical, stop execution
      if (!stepResult.success && step.critical) {
        throw new Error(`Critical step failed: ${stepResult.error}`);
      }
    }

    return {
      masterTask: masterTask,
      executionPlan: executionPlan,
      results: results,
      success: results.every(r => r.result.success),
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Log agent interactions for learning and debugging
   */
  async logAgentInteraction(agentId, task, result, context) {
    try {
      await this.pool.query(`
        INSERT INTO agent_interactions (
          agent_id, task, result, context, created_at
        ) VALUES ($1, $2, $3, $4, now())
      `, [
        agentId,
        JSON.stringify(task),
        JSON.stringify(result),
        JSON.stringify(context)
      ]);
    } catch (error) {
      console.error('Error logging agent interaction:', error);
    }
  }

  /**
   * Learn from agent interactions to improve performance
   */
  async learnFromInteractions(agentType, limit = 1000) {
    try {
      const result = await this.pool.query(`
        SELECT task, result, context, created_at
        FROM agent_interactions
        WHERE agent_id LIKE $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [`${agentType}_%`, limit]);

      const interactions = result.rows;
      
      // Analyze patterns in successful vs failed interactions
      const successful = interactions.filter(i => {
        try {
          const result = JSON.parse(i.result);
          return !result.error;
        } catch {
          return false;
        }
      });

      const failed = interactions.filter(i => {
        try {
          const result = JSON.parse(i.result);
          return !!result.error;
        } catch {
          return true;
        }
      });

      // Extract patterns and insights
      const insights = {
        totalInteractions: interactions.length,
        successRate: (successful.length / interactions.length * 100).toFixed(2),
        commonSuccessPatterns: this.extractPatterns(successful),
        commonFailurePatterns: this.extractPatterns(failed),
        recommendations: this.generateRecommendations(successful, failed)
      };

      return insights;
    } catch (error) {
      console.error('Error learning from interactions:', error);
      return null;
    }
  }

  /**
   * Extract patterns from interactions
   */
  extractPatterns(interactions) {
    // Simple pattern extraction - can be enhanced with ML
    const patterns = {};
    
    interactions.forEach(interaction => {
      try {
        const task = JSON.parse(interaction.task);
        const taskType = typeof task === 'string' ? 'simple' : 'complex';
        
        if (!patterns[taskType]) {
          patterns[taskType] = 0;
        }
        patterns[taskType]++;
      } catch (error) {
        // Skip malformed interactions
      }
    });

    return patterns;
  }

  /**
   * Generate recommendations based on interaction analysis
   */
  generateRecommendations(successful, failed) {
    const recommendations = [];

    if (failed.length > successful.length * 0.1) {
      recommendations.push('Consider adjusting system prompts to reduce error rate');
    }

    if (successful.length > 100) {
      recommendations.push('Agent is performing well, consider expanding capabilities');
    }

    return recommendations;
  }

  /**
   * Cleanup inactive agents
   */
  async cleanupAgents() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    for (const [agentId, agent] of this.agents) {
      const creationTime = parseInt(agentId.split('_').pop());
      if (creationTime < cutoffTime) {
        this.agents.delete(agentId);
        this.memories.delete(agentId);
        console.log(`Cleaned up inactive agent: ${agentId}`);
      }
    }
  }

  /**
   * Get agent status and performance metrics
   */
  async getAgentStatus() {
    const activeAgents = Array.from(this.agents.keys());
    const agentTypes = {};

    activeAgents.forEach(agentId => {
      const type = agentId.split('_')[0];
      if (!agentTypes[type]) {
        agentTypes[type] = 0;
      }
      agentTypes[type]++;
    });

    return {
      totalActiveAgents: activeAgents.length,
      agentsByType: agentTypes,
      availableProviders: Array.from(this.llmProviders.keys()),
      memoryUsage: this.memories.size,
      lastCleanup: new Date().toISOString()
    };
  }

  /**
   * ===== Chinese LLM provider helpers =====
   */
  createBaiduChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'ernie-3.5-8k',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
        defaultHeaders: { 'Content-Type': 'application/json' }
      },
      ...config
    });
  }

  createAlibabaChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'qwen-turbo',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://dashscope.aliyuncs.com/api/v1',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  createTencentChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'hunyuan-lite',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://hunyuan.tencentcloudapi.com',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  createByteDanceChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'doubao-lite-4k',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  createIFlytekChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'spark-lite',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://spark-api.xf-yun.com/v1',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  createSenseTimeChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'sensechat-5',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://api.sensenova.cn/v1',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  createZhipuChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'glm-4',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  createMoonshotChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'moonshot-v1-8k',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://api.moonshot.cn/v1',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  async testChineseLLMConnection(providerId, config) {
    try {
      const provider = this.llmProviders.get(providerId);
      if (!provider) throw new Error(`Provider not found: ${providerId}`);
      const llm = provider.createInstance(config);
      const testMessage = new HumanMessage('你好，请简单介绍一下你自己。');
      const response = await llm.invoke([testMessage]);
      return { success: true, provider: providerId, model: config.model, response: String(response.content).slice(0, 100) + '...' };
    } catch (error) {
      return { success: false, provider: providerId, error: error.message };
    }
  }

  getRecommendedChineseModels() {
    return {
      general: { local: ['qwen2.5:14b', 'chatglm3:6b', 'yi:6b'], api: ['qwen-plus', 'glm-4', 'ernie-3.5-8k'] },
      coding: { local: ['codeqwen:7b', 'deepseek-coder:6.7b'], api: ['qwen-max', 'glm-4', 'doubao-pro-32k'] },
      longContext: { local: ['qwen2.5:32b'], api: ['qwen-max-longcontext', 'moonshot-v1-128k', 'doubao-pro-128k'] },
      lightweight: { local: ['qwen2.5:3b', 'qwen2.5:1.5b'], api: ['qwen-turbo', 'ernie-lite-8k', 'doubao-lite-4k'] },
      multimodal: { api: ['qwen-vl-max', 'glm-4v'] }
    };
  }

  selectOptimalChineseModel(taskType, preferLocal = true) {
    const recommendations = this.getRecommendedChineseModels();
    const category = recommendations[taskType] || recommendations.general;
    if (preferLocal && category.local) return { provider: 'ollama', model: category.local[0] };
    if (category.api) {
      if (taskType === 'coding') return { provider: 'zhipu', model: 'glm-4' };
      if (taskType === 'longContext') return { provider: 'moonshot', model: 'moonshot-v1-128k' };
      return { provider: 'alibaba', model: 'qwen-plus' };
    }
    return { provider: 'ollama', model: 'qwen2.5:7b' };
  }

  // Helper methods for web search and data analysis
  async performWebSearch(query, numResults) {
    // Implement web search functionality
    // This could use Google Search API, Bing API, or other search services
    return {
      query: query,
      results: [],
      message: 'Web search functionality to be implemented'
    };
  }

  async performDataAnalysis(data, analysisType) {
    // Implement data analysis functionality
    return {
      analysisType: analysisType,
      insights: [],
      message: 'Data analysis functionality to be implemented'
    };
  }
}


// ================================================================
// NOTE ABOUT THE FOLLOWING COMMENTED BLOCK
// ------------------------------------------------
// Reason for commenting (not deleting):
// A duplicate set of Chinese LLM provider helper methods and utilities
// existed AFTER the class definition and export. Having standalone
// function declarations here (e.g., createBaiduChat, createAlibabaChat, ...)
// collided with the class methods of the same names already defined
// inside LangChainAgentSystem, producing syntax/type errors and ambiguity.
//
// We are preserving the original duplicate code below as a historical record
// and for easy diffing, but the authoritative implementations now live
// INSIDE the class. If you need to modify provider behavior, edit the
// in-class methods. If for any reason you want to restore this block, move
// it INSIDE the class or rename functions to avoid collisions.
//
// Keeping code commented fulfills the request to avoid truncation and retain
// full context. This prevents runtime errors while keeping the prior code.
// ================================================================
/*
  // ===== CHINESE LLM PROVIDER IMPLEMENTATIONS =====

  // Create Baidu Ernie Bot chat instance
  function createBaiduChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'ernie-3.5-8k',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
        defaultHeaders: { 'Content-Type': 'application/json' }
      },
      ...config
    });
  }

  // Create Alibaba Qwen chat instance
  function createAlibabaChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'qwen-turbo',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://dashscope.aliyuncs.com/api/v1',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  // Create Tencent Hunyuan chat instance
  function createTencentChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'hunyuan-lite',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://hunyuan.tencentcloudapi.com',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  // Create ByteDance Doubao chat instance
  function createByteDanceChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'doubao-lite-4k',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  // Create iFlytek Spark chat instance
  function createIFlytekChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'spark-lite',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://spark-api.xf-yun.com/v1',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  // Create SenseTime SenseChat instance
  function createSenseTimeChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'sensechat-5',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://api.sensenova.cn/v1',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  // Create Zhipu AI ChatGLM instance
  function createZhipuChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'glm-4',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  // Create Moonshot AI Kimi instance
  function createMoonshotChat(config) {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'moonshot-v1-8k',
      temperature: config.temperature || 0.7,
      configuration: {
        baseURL: 'https://api.moonshot.cn/v1',
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      ...config
    });
  }

  // Get available models from Ollama instance
  async function getOllamaModels() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      return data.models?.map(model => model.name) || [];
    } catch (error) {
      console.warn('Failed to fetch Ollama models, using default list:', error.message);
      return [];
    }
  }

  // Get available models from OpenRouter API
  async function getOpenRouterModels() {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      const data = await response.json();
      return data.data?.map(model => model.id) || [];
    } catch (error) {
      console.warn('Failed to fetch OpenRouter models:', error.message);
      return [];
    }
  }

  // Test Chinese LLM provider connection
  async function testChineseLLMConnection(providerId, config) {
    try {
      // This duplicate function conflicts with the in-class method.
      // Kept for reference only.
      const provider = providerId; // placeholder to avoid unused warnings
      return { success: false, provider: providerId, note: 'Duplicate external function (commented reference only).' };
    } catch (error) {
      return { success: false, provider: providerId, error: error.message };
    }
  }

  // Get recommended Chinese models for different use cases
  function getRecommendedChineseModels() {
    return {
      general: { local: ['qwen2.5:14b', 'chatglm3:6b', 'yi:6b'], api: ['qwen-plus', 'glm-4', 'ernie-3.5-8k'] },
      coding: { local: ['codeqwen:7b', 'deepseek-coder:6.7b'], api: ['qwen-max', 'glm-4', 'doubao-pro-32k'] },
      longContext: { local: ['qwen2.5:32b'], api: ['qwen-max-longcontext', 'moonshot-v1-128k', 'doubao-pro-128k'] },
      lightweight: { local: ['qwen2.5:3b', 'qwen2.5:1.5b'], api: ['qwen-turbo', 'ernie-lite-8k', 'doubao-lite-4k'] },
      multimodal: { api: ['qwen-vl-max', 'glm-4v'] }
    };
  }

  // Auto-select best Chinese model based on task type
  function selectOptimalChineseModel(taskType, preferLocal = true) {
    const recommendations = getRecommendedChineseModels();
    const category = recommendations[taskType] || recommendations.general;
    if (preferLocal && category.local) return { provider: 'ollama', model: category.local[0] };
    if (category.api) {
      if (taskType === 'coding') return { provider: 'zhipu', model: 'glm-4' };
      if (taskType === 'longContext') return { provider: 'moonshot', model: 'moonshot-v1-128k' };
      return { provider: 'alibaba', model: 'qwen-plus' };
    }
    return { provider: 'ollama', model: 'qwen2.5:7b' };
  }
*/



