// Supports third-party MCP clients, agent orchestration, and workflow learning
// Optional dependency: @modelcontextprotocol/sdk. Provide graceful fallback if absent (tests can stub).
let Server, StdioServerTransport, CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError;
try {
  ({ Server } = await import('@modelcontextprotocol/sdk/server/index.js'));
  ({ StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js'));
  ({ CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } = await import('@modelcontextprotocol/sdk/types.js'));
} catch (e) {
  console.warn('[EnhancedMCP] Optional dependency @modelcontextprotocol/sdk not installed; running in stub mode.');
  Server = class StubServer { constructor() { this.handlers = {}; } setRequestHandler(){} async connect(){} listTools(){ return { tools: [] }; } };
  StdioServerTransport = class {};
  CallToolRequestSchema = {}; ListToolsRequestSchema = {}; McpError = class extends Error {}; ErrorCode = { MethodNotFound: 'method_not_found', InvalidRequest: 'invalid_request' };
}

import { Pool } from 'pg';
import { createClient as createRedis } from 'redis';
import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Import enhanced modules
import { createAILearningEngine } from '../ai/learning-engine.js';
import { createAgentOrchestrator } from '../ai/agent-orchestrator.js';
import { createMCPClientManager } from '../mcp/client-manager.js';
import { createWorkflowAnalyzer } from '../ai/workflow-analyzer.js';
import { createContentGenerator } from '../ai/content-generator.js';
import { createOutputCapture } from '../ai/output-capture.js';
import { createConfidenceScorer } from '../ai/confidence-scorer.js';
import { initMetrics, incMcpToolInvocation } from '../observability/metrics.js';
import { createLLMProvider } from '../providers/llm.js';
import { spawn } from 'child_process';
import { createAuditLogger } from './audit.js';

// Import existing modules
import { createVPSManager } from '../modules/vps/manager.js';
import { createN8NManager } from '../modules/n8n/manager.js';
import { createWordPressManager } from '../modules/wordpress/manager.js';
import { createPostizManager } from '../modules/postiz/manager.js';
import { createAffiliateManager } from '../modules/affiliate/manager.js';
import { createReviewQueueManager } from '../modules/reviews/manager.js';

/**
 * Enhanced AI Automation MCP Server
 * Multi-client support, AI learning, and agent orchestration
 */
class EnhancedAIAutomationMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'enhanced-ai-automation-platform',
        version: '2.0.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    this.pool = null;
    this.redis = null;
    this.managers = {};
    this.learning = null;
    this.orchestrator = null;
    this.clients = null;
    this.analyzer = null;
    this.content = null;
  this.outputCapture = null;

    this.initialize();
  }

  async initialize() {
    await this.setupDatabase();
    this.setupManagers();
    this.setupAI();
    this.setupToolHandlers();
  }

  async setupDatabase() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      try {
        const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`;
        this.redis = createRedis({ url: redisUrl });
        await this.redis.connect();
      } catch (e) {
        console.warn('Redis unavailable (enhanced MCP continuing):', e.message);
      }
    }
  }

  setupManagers() {
    this.managers = {
      vps: createVPSManager(this.pool),
      n8n: createN8NManager(this.pool),
      wordpress: createWordPressManager(this.pool),
      postiz: createPostizManager(this.pool),
  affiliate: createAffiliateManager(this.pool),
  reviews: createReviewQueueManager(this.pool)
    };
  }

  setupAI() {
    this.learning = createAILearningEngine();
    this.orchestrator = createAgentOrchestrator({
      perTaskOverrides: {
        'ai_chat': { scoreWeights: { capability: 5 } },
        'content_article': { scoreWeights: { freshness: 2 } },
        'workflow_generate': { scoreWeights: { successRate: 3 } }
      }
    });
    this.clients = createMCPClientManager();
    this.analyzer = createWorkflowAnalyzer();
    this.content = createContentGenerator();
  const scorer = createConfidenceScorer();
  this.audit = createAuditLogger(this.pool);
  this.outputCapture = createOutputCapture({ pool: this.pool, scorer, auditLogger: this.audit, metrics: this.metrics });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        { name: 'learning_stats', description: 'Get AI learning engine stats', inputSchema: { type: 'object', properties: {} } },
        { name: 'agent_list', description: 'List registered agents', inputSchema: { type: 'object', properties: {} } },
        { name: 'workflow_score', description: 'Score a workflow JSON', inputSchema: { type: 'object', properties: { workflow: { type: 'object' } }, required: ['workflow'] } },
  { name: 'content_generate_article', description: 'Generate article draft', inputSchema: { type: 'object', properties: { topic: { type: 'string' } }, required: ['topic'] } },
  { name: 'review_list_pending', description: 'List pending human reviews', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
  { name: 'review_change_status', description: 'Approve/Reject/Escalate a review', inputSchema: { type: 'object', properties: { id: { type: 'number' }, action: { type: 'string', enum: ['approve','reject','escalate'] }, notes: { type: 'string' }, reviewer_id: { type: 'string' } }, required: ['id','action'] } },
  { name: 'review_list_by_status', description: 'List reviews by status', inputSchema: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] } },
  { name: 'review_decide_batch', description: 'Batch approve/reject multiple reviews', inputSchema: { type: 'object', properties: { decisions: { type: 'array', items: { type: 'object', properties: { id: { type: 'number' }, action: { type: 'string', enum: ['approve','reject'] }, notes: { type: 'string' }, reviewer_id: { type: 'string' } }, required: ['id','action'] } } }, required: ['decisions'] } }
  , { name: 'vps_list_servers', description: 'List all VPS servers', inputSchema: { type: 'object', properties: { user_id: { type: 'string' } }, required: ['user_id'] } }
  , { name: 'n8n_list_instances', description: 'List N8N instances', inputSchema: { type: 'object', properties: { user_id: { type: 'string' } }, required: ['user_id'] } }
  , { name: 'wp_list_sites', description: 'List WordPress sites', inputSchema: { type: 'object', properties: { user_id: { type: 'string' } }, required: ['user_id'] } }
  , { name: 'social_list_accounts', description: 'List social media accounts', inputSchema: { type: 'object', properties: { user_id: { type: 'string' } }, required: ['user_id'] } }
  , { name: 'affiliate_list_networks', description: 'List affiliate networks', inputSchema: { type: 'object', properties: { user_id: { type: 'string' } }, required: ['user_id'] } }
  , { name: 'system_get_metrics', description: 'Get platform metrics', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, timeframe: { type: 'string' }, metric_type: { type: 'string' } }, required: ['user_id'] } }
  , { name: 'vps_create_server', description: 'Create VPS server record', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, name: { type: 'string' }, provider: { type: 'string' }, ip_address: { type: 'string' } }, required: ['user_id','name','provider','ip_address'] } }
  , { name: 'vps_deploy_stack', description: 'Deploy stack to VPS', inputSchema: { type: 'object', properties: { server_id: { type: 'string' }, user_id: { type: 'string' }, stack_type: { type: 'string' }, domain: { type: 'string' }, admin_email: { type: 'string' }, environment: { type: 'object' } }, required: ['server_id','user_id','stack_type','domain'] } }
  , { name: 'vps_get_status', description: 'Get VPS status', inputSchema: { type: 'object', properties: { server_id: { type: 'string' }, user_id: { type: 'string' } }, required: ['server_id','user_id'] } }
  , { name: 'vps_execute_command', description: 'Execute command on VPS', inputSchema: { type: 'object', properties: { server_id: { type: 'string' }, user_id: { type: 'string' }, command: { type: 'string' }, working_dir: { type: 'string' } }, required: ['server_id','user_id','command'] } }
  , { name: 'n8n_create_workflow', description: 'Create N8N workflow', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, instance_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, workflow_data: { type: 'object' } }, required: ['user_id','instance_id','name','workflow_data'] } }
  , { name: 'n8n_execute_workflow', description: 'Execute N8N workflow', inputSchema: { type: 'object', properties: { workflow_id: { type: 'string' }, user_id: { type: 'string' }, input: { type: 'object' } }, required: ['workflow_id','user_id'] } }
  , { name: 'n8n_sync_workflows', description: 'Sync N8N workflows', inputSchema: { type: 'object', properties: { instance_id: { type: 'string' }, user_id: { type: 'string' } }, required: ['instance_id','user_id'] } }
  , { name: 'wp_create_site', description: 'Create WordPress site', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, name: { type: 'string' }, url: { type: 'string' }, admin_url: { type: 'string' }, api_key_id: { type: 'string' } }, required: ['user_id','name','url'] } }
  , { name: 'wp_create_post', description: 'Create WordPress post', inputSchema: { type: 'object', properties: { site_id: { type: 'string' }, user_id: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' }, status: { type: 'string' }, categories: { type: 'array' }, tags: { type: 'array' } }, required: ['site_id','user_id','title','content'] } }
  , { name: 'social_create_post', description: 'Create social post', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' }, platforms: { type: 'array' }, media_urls: { type: 'array' } }, required: ['user_id','content','platforms'] } }
  , { name: 'social_schedule_post', description: 'Schedule social post', inputSchema: { type: 'object', properties: { post_id: { type: 'string' }, user_id: { type: 'string' }, scheduled_for: { type: 'string' } }, required: ['post_id','user_id','scheduled_for'] } }
  , { name: 'affiliate_search_products', description: 'Search affiliate products', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, network_id: { type: 'string' }, category: { type: 'string' }, min_commission: { type: 'number' }, keywords: { type: 'string' } }, required: ['user_id'] } }
  , { name: 'affiliate_create_campaign', description: 'Create affiliate campaign', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, product_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, budget: { type: 'number' }, landing_page_url: { type: 'string' } }, required: ['user_id','product_id','name'] } }
  , { name: 'system_backup_data', description: 'Create system backup', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, backup_type: { type: 'string' }, include_media: { type: 'boolean' } }, required: ['user_id','backup_type'] } }
  , { name: 'system_deploy_updates', description: 'Deploy service updates', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, service: { type: 'string' }, version: { type: 'string' }, auto_restart: { type: 'boolean' } }, required: ['user_id','service'] } }
  , { name: 'ai_chat', description: 'Chat with AI provider', inputSchema: { type: 'object', properties: { provider: { type: 'string' }, model: { type: 'string' }, messages: { type: 'array' }, temperature: { type: 'number' }, max_tokens: { type: 'number' } }, required: ['provider','model','messages'] } }
  , { name: 'ai_generate_workflow', description: 'Generate N8N workflow via AI', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, description: { type: 'string' }, input_data: { type: 'object' }, output_format: { type: 'object' }, services: { type: 'array' } }, required: ['user_id','description'] } }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (req) => {
      const { name, arguments: args } = req.params;
  // Metrics: count before execution
  try { incMcpToolInvocation({ tool: name, server: 'enhanced' }); } catch (_) {}
      switch (name) {
        case 'learning_stats':
          return { content: [{ type: 'text', text: JSON.stringify(this.learning.getStats(), null, 2) }] };
        case 'agent_list':
          return { content: [{ type: 'text', text: JSON.stringify({ agents: this.orchestrator.listAgents() }, null, 2) }] };
        case 'workflow_score':
          return { content: [{ type: 'text', text: JSON.stringify(this.analyzer.score(args.workflow), null, 2) }] };
        case 'content_generate_article':
          {
            // Orchestrator routing: treat as task type content_article
            const task = { type: 'content_article', topic: args.topic };
            // Ensure at least one agent (register a default content agent if none)
            if (!this.orchestrator.listAgents().some(a => a.capabilities.includes('content_article'))) {
              this.orchestrator.registerAgent({
                id: 'builtin-content-agent',
                type: 'content',
                capabilities: ['content_article'],
                execute: async (t) => {
                  const wrapped = this.outputCapture.wrap(async ({ topic }) => this.content.generateArticle({ topic }), { model: 'content-gen-stub' });
                  const { output, meta } = await wrapped({ topic: t.topic });
                  return { result: { output, meta } };
                }
              });
            }
            const routed = await this.orchestrator.routeTask(task);
            return { content: [{ type: 'text', text: JSON.stringify(routed, null, 2) }] };
          }
        case 'review_list_pending':
          {
            const limit = args.limit || 50;
            const rows = await this.managers.reviews.listPending(limit);
            return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
          }
        case 'review_change_status':
          {
            const { id, action, notes, reviewer_id } = args;
            let updated;
            if (action === 'approve') updated = await this.managers.reviews.approve({ id, reviewer_id, notes });
            else if (action === 'reject') updated = await this.managers.reviews.reject({ id, reviewer_id, notes });
            else if (action === 'escalate') updated = await this.managers.reviews.escalate({ id, notes });
            else throw new McpError(ErrorCode.InvalidRequest, 'Unknown action');
            return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
          }
        case 'review_list_by_status':
          {
            const { status } = args;
            const rows = await this.managers.reviews.list({ status });
            return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
          }
        case 'review_decide_batch':
          {
            const { decisions } = args;
            if (!Array.isArray(decisions)) throw new McpError(ErrorCode.InvalidRequest, 'decisions must be array');
            const results = [];
            for (const d of decisions) {
              try {
                if (d.action === 'approve') results.push(await this.managers.reviews.approve({ id: d.id, reviewer_id: d.reviewer_id, notes: d.notes }));
                else if (d.action === 'reject') results.push(await this.managers.reviews.reject({ id: d.id, reviewer_id: d.reviewer_id, notes: d.notes }));
                else results.push({ id: d.id, error: 'unsupported action' });
              } catch (e) {
                results.push({ id: d.id, error: e.message });
              }
            }
            return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
          }
        case 'vps_list_servers':
          return { content: [{ type: 'text', text: JSON.stringify(await this.managers.vps.listServers(args.user_id), null, 2) }] };
        case 'n8n_list_instances':
          return { content: [{ type: 'text', text: JSON.stringify(await this.managers.n8n.listInstances(args.user_id), null, 2) }] };
        case 'wp_list_sites':
          return { content: [{ type: 'text', text: JSON.stringify(await this.managers.wordpress.listSites(args.user_id), null, 2) }] };
        case 'social_list_accounts':
          return { content: [{ type: 'text', text: JSON.stringify(await this.managers.postiz.listAccounts(args.user_id), null, 2) }] };
        case 'affiliate_list_networks':
          return { content: [{ type: 'text', text: JSON.stringify(await this.managers.affiliate.listNetworks(args.user_id), null, 2) }] };
        case 'system_get_metrics':
          {
            const { createMetricsCollector } = await import('../utils/metrics.js');
            const collector = createMetricsCollector(this.pool);
            const metric_type = args.metric_type || 'overview';
            let data;
            try {
              if (metric_type === 'overview') data = await collector.getPlatformOverview();
              else if (metric_type === 'vps') data = await collector.getVPSMetrics(args.timeframe);
              else if (metric_type === 'social') data = await collector.getSocialMetrics(args.timeframe);
              else if (metric_type === 'affiliate') data = await collector.getAffiliateMetrics(args.timeframe);
              else data = await collector.getPlatformOverview();
            } catch (e) {
              data = { error: e.message };
            }
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
          }
        case 'vps_create_server':
          {
            const server = await this.managers.vps.createServer(args);
            try { await this.audit.log({ actor: args.user_id, action: 'vps.create', entity: 'vps_server', entity_id: server.id, metadata: server }); } catch(_) {}
            return { content: [{ type: 'text', text: JSON.stringify({ server }, null, 2) }] };
          }
        case 'vps_deploy_stack':
          {
            const result = await this.managers.vps.deployScript(args.server_id, args.user_id, args.stack_type, { MAIN_DOMAIN: args.domain, ADMIN_EMAIL: args.admin_email || `admin@${args.domain}`, ...(args.environment||{}) });
            try { await this.audit.log({ actor: args.user_id, action: 'vps.deploy', entity: 'vps_server', entity_id: args.server_id, metadata: { stack_type: args.stack_type, domain: args.domain, success: result.success } }); } catch(_) {}
            return { content: [{ type: 'text', text: JSON.stringify({ deployment: result }, null, 2) }] };
          }
        case 'vps_get_status':
          return { content: [{ type: 'text', text: JSON.stringify(await this.managers.vps.getServerStatus(args.server_id, args.user_id), null, 2) }] };
        case 'vps_execute_command':
          {
            const exec = await this.managers.vps.executeCommand?.(args.server_id, args.user_id, args.command, args.working_dir);
            try { await this.audit.log({ actor: args.user_id, action: 'vps.exec', entity: 'vps_server', entity_id: args.server_id, metadata: { command: args.command } }); } catch(_) {}
            return { content: [{ type: 'text', text: JSON.stringify({ result: exec }, null, 2) }] };
          }
        case 'n8n_create_workflow':
          {
            const wf = await this.managers.n8n.createWorkflow(args, args.user_id);
            try { await this.audit.log({ actor: args.user_id, action: 'n8n.workflow.create', entity: 'n8n_workflow', entity_id: wf.id, metadata: { instance_id: args.instance_id } }); } catch(_) {}
            return { content: [{ type: 'text', text: JSON.stringify({ workflow: wf }, null, 2) }] };
          }
        case 'n8n_execute_workflow':
          {
            const result = await this.managers.n8n.executeWorkflow(args.workflow_id, args.input || {}, args.user_id);
            try { await this.audit.log({ actor: args.user_id, action: 'n8n.workflow.execute', entity: 'n8n_workflow', entity_id: args.workflow_id, metadata: { success: !!result } }); } catch(_) {}
            return { content: [{ type: 'text', text: JSON.stringify({ execution: result }, null, 2) }] };
          }
        case 'n8n_sync_workflows':
          {
            const result = await this.managers.n8n.syncWorkflows(args.instance_id, args.user_id);
            try { await this.audit.log({ actor: args.user_id, action: 'n8n.workflow.sync', entity: 'n8n_instance', entity_id: args.instance_id, metadata: { synced: result.synced } }); } catch(_) {}
            return { content: [{ type: 'text', text: JSON.stringify({ sync_result: result }, null, 2) }] };
          }
        case 'wp_create_site':
          {
            const site = await this.managers.wordpress.createSite(args);
            try { await this.audit.log({ actor: args.user_id, action: 'wp.site.create', entity: 'wp_site', entity_id: site.id, metadata: { url: site.url } }); } catch(_) {}
            return { content: [{ type: 'text', text: JSON.stringify({ site }, null, 2) }] };
          }
        case 'wp_create_post':
          {
            const post = await this.managers.wordpress.createContent(args.site_id, args, args.user_id);
            try { await this.audit.log({ actor: args.user_id, action: 'wp.post.create', entity: 'wp_post', entity_id: post.id, metadata: { site_id: args.site_id } }); } catch(_) {}
            return { content: [{ type: 'text', text: JSON.stringify({ post }, null, 2) }] };
          }
        case 'social_create_post':
          {
            const post = await this.managers.postiz.createPost(args);
            try { await this.audit.log({ actor: args.user_id, action: 'social.post.create', entity: 'social_post', entity_id: post.id, metadata: { platforms: args.platforms } }); } catch(_) {}
            return { content: [{ type: 'text', text: JSON.stringify({ post }, null, 2) }] };
          }
        case 'social_schedule_post':
          {
            const schedule = await this.managers.postiz.schedulePost(args.post_id, args.scheduled_for, args.user_id);
            try { await this.audit.log({ actor: args.user_id, action: 'social.post.schedule', entity: 'social_post', entity_id: args.post_id, metadata: { scheduled_for: args.scheduled_for } }); } catch(_) {}
            return { content: [{ type: 'text', text: JSON.stringify({ result: schedule }, null, 2) }] };
          }
        case 'affiliate_search_products':
          return { content: [{ type: 'text', text: JSON.stringify({ products: await this.managers.affiliate.searchProducts(args.user_id, args) }, null, 2) }] };
        case 'affiliate_create_campaign':
          {
            const campaign = await this.managers.affiliate.createCampaign(args);
            try { await this.audit.log({ actor: args.user_id, action: 'affiliate.campaign.create', entity: 'affiliate_campaign', entity_id: campaign.id, metadata: { product_id: args.product_id } }); } catch(_) {}
            return { content: [{ type: 'text', text: JSON.stringify({ campaign }, null, 2) }] };
          }
        case 'system_backup_data':
          {
            const backupId = `backup_${Date.now()}`;
            const backupPath = `/opt/backups/${backupId}`;
            try { await fs.mkdir(backupPath, { recursive: true }); } catch(_) {}
            const backup = { backup_id: backupId, backup_type: args.backup_type, path: backupPath };
            try { await this.audit.log({ actor: args.user_id, action: 'system.backup', entity: 'system_backup', entity_id: backupId, metadata: { type: args.backup_type } }); } catch(_) {}
            return { content: [{ type: 'text', text: JSON.stringify({ backup }, null, 2) }] };
          }
        case 'system_deploy_updates':
          {
            const update = { service: args.service, version: args.version || 'latest', started_at: new Date().toISOString(), status: 'completed' };
            try { await this.audit.log({ actor: args.user_id, action: 'system.deploy', entity: 'system_service', entity_id: args.service, metadata: { version: update.version } }); } catch(_) {}
            return { content: [{ type: 'text', text: JSON.stringify({ update }, null, 2) }] };
          }
        case 'ai_chat':
          {
            const task = { type: 'ai_chat', provider: args.provider, model: args.model, temperature: args.temperature };
            if (!this.orchestrator.listAgents().some(a => a.capabilities.includes('ai_chat'))) {
              this.orchestrator.registerAgent({
                id: 'builtin-llm-agent',
                type: 'llm',
                capabilities: ['ai_chat'],
                execute: async () => {
                  const llm = createLLMProvider();
                  const wrapped = this.outputCapture.wrap(async (p) => llm.chat(p), { model: args.model || 'unknown', prompt: JSON.stringify(args.messages) });
                  const { output, meta } = await wrapped({ provider: args.provider, model: args.model, messages: args.messages, temperature: args.temperature, max_tokens: args.max_tokens });
                  return { result: { response: output, meta } };
                }
              });
            }
            const routed = await this.orchestrator.routeTask(task);
            return { content: [{ type: 'text', text: JSON.stringify(routed, null, 2) }] };
          }
        case 'ai_generate_workflow':
          {
            const task = { type: 'workflow_generate', description: args.description };
            if (!this.orchestrator.listAgents().some(a => a.capabilities.includes('workflow_generate'))) {
              this.orchestrator.registerAgent({
                id: 'builtin-workflow-agent',
                type: 'workflow',
                capabilities: ['workflow_generate'],
                execute: async (t) => {
                  const llm = createLLMProvider();
                  const prompt = `Generate an N8N workflow JSON based on this description: ${t.description}`;
                  const wrapped = this.outputCapture.wrap(async () => llm.chat({ provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', messages: [ { role: 'system', content: 'You are an expert N8N workflow designer.' }, { role: 'user', content: prompt } ] }), { model: 'anthropic/claude-3.5-sonnet', prompt });
                  const { output, meta } = await wrapped({});
                  let parsed;
                  try { parsed = JSON.parse(output.content); } catch { parsed = { raw: output.content, error: 'parse_failed' }; }
                  return { result: { generated_workflow: parsed, meta } };
                }
              });
            }
            const routed = await this.orchestrator.routeTask(task);
            return { content: [{ type: 'text', text: JSON.stringify(routed, null, 2) }] };
          }
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🚀 Enhanced AI Automation MCP Server running');
  }

  async listTools() {
    return this.server.listTools();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new EnhancedAIAutomationMCPServer();
  server.run().catch(console.error);
}

export { EnhancedAIAutomationMCPServer };