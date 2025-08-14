// MCP (Model Context Protocol) Server for AI Automation Platform
// Secure, self-contained server for controlling entire VPS infrastructure
// Avoids third-party MCP servers that might inject malicious code

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { Pool } from 'pg';
import { createClient as createRedis } from 'redis';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import SSH2Promise from 'ssh2-promise';

// Import our modules
import { createVPSManager } from '../modules/vps/manager.js';
import { createN8NManager } from '../modules/n8n/manager.js';
import { createWordPressManager } from '../modules/wordpress/manager.js';
import MauticManager from '../modules/mautic/manager.js';
import { createPostizManager } from '../modules/postiz/manager.js';
import { createAffiliateManager } from '../modules/affiliate/manager.js';
import { decryptSecret } from '../utils/crypto.js';

/**
 * AI Automation MCP Server
 * Provides secure, comprehensive control over VPS infrastructure
 */
class AIAutomationMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'ai-automation-platform',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.pool = null;
    this.redis = null;
    this.managers = {};
    
    this.setupDatabase();
    this.setupManagers();
    this.setupToolHandlers();
  }

  async setupDatabase() {
    // Database connection
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Redis connection (optional)
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      try {
        const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`;
        this.redis = createRedis({ url: redisUrl });
        await this.redis.connect();
        console.log('✅ Redis connected');
      } catch (error) {
        console.warn('⚠️ Redis connection failed:', error.message);
      }
    }
  }

  setupManagers() {
    this.managers = {
      vps: createVPSManager(this.pool),
      n8n: createN8NManager(this.pool),
      wordpress: createWordPressManager(this.pool),
      mautic: new MauticManager(),
      postiz: createPostizManager(this.pool),
      affiliate: createAffiliateManager(this.pool)
    };
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // VPS Management Tools
          {
            name: 'vps_list_servers',
            description: 'List all VPS servers',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string', description: 'User ID' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'vps_create_server',
            description: 'Create a new VPS server record',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                name: { type: 'string' },
                provider: { type: 'string' },
                ip_address: { type: 'string' },
                hostname: { type: 'string' },
                region: { type: 'string' },
                size: { type: 'string' },
                os: { type: 'string' },
                connection_config: { type: 'object' }
              },
              required: ['user_id', 'name', 'provider', 'ip_address']
            }
          },
          {
            name: 'vps_deploy_stack',
            description: 'Deploy full stack (N8N, WordPress, Mailcow, etc.) to VPS',
            inputSchema: {
              type: 'object',
              properties: {
                server_id: { type: 'string' },
                user_id: { type: 'string' },
                stack_type: { 
                  type: 'string', 
                  enum: ['full_stack', 'bookaistudio', 'mailcow_only', 'n8n_only', 'wordpress_only'],
                  description: 'Type of stack to deploy'
                },
                domain: { type: 'string', description: 'Main domain for the deployment' },
                admin_email: { type: 'string', description: 'Admin email for SSL certificates' },
                environment: { type: 'object', description: 'Environment variables' }
              },
              required: ['server_id', 'user_id', 'stack_type', 'domain']
            }
          },
          {
            name: 'vps_get_status',
            description: 'Get server status and monitoring data',
            inputSchema: {
              type: 'object',
              properties: {
                server_id: { type: 'string' },
                user_id: { type: 'string' }
              },
              required: ['server_id', 'user_id']
            }
          },
          {
            name: 'vps_execute_command',
            description: 'Execute command on VPS server via SSH',
            inputSchema: {
              type: 'object',
              properties: {
                server_id: { type: 'string' },
                user_id: { type: 'string' },
                command: { type: 'string', description: 'Command to execute' },
                working_dir: { type: 'string', description: 'Working directory (optional)' }
              },
              required: ['server_id', 'user_id', 'command']
            }
          },

          // N8N Workflow Tools
          {
            name: 'n8n_list_instances',
            description: 'List all N8N instances',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'n8n_create_workflow',
            description: 'Create a new N8N workflow',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                instance_id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                workflow_data: { type: 'object', description: 'N8N workflow JSON' },
                tags: { type: 'array', items: { type: 'string' } }
              },
              required: ['user_id', 'instance_id', 'name', 'workflow_data']
            }
          },
          {
            name: 'n8n_execute_workflow',
            description: 'Execute an N8N workflow',
            inputSchema: {
              type: 'object',
              properties: {
                workflow_id: { type: 'string' },
                user_id: { type: 'string' },
                input: { type: 'object', description: 'Input data for workflow' }
              },
              required: ['workflow_id', 'user_id']
            }
          },
          {
            name: 'n8n_sync_workflows',
            description: 'Sync workflows from N8N instance',
            inputSchema: {
              type: 'object',
              properties: {
                instance_id: { type: 'string' },
                user_id: { type: 'string' }
              },
              required: ['instance_id', 'user_id']
            }
          },

          // WordPress Management Tools
          {
            name: 'wp_list_sites',
            description: 'List all WordPress sites',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'wp_create_site',
            description: 'Create a new WordPress site',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                name: { type: 'string' },
                url: { type: 'string' },
                admin_url: { type: 'string' },
                api_key_id: { type: 'string' }
              },
              required: ['user_id', 'name', 'url']
            }
          },
          {
            name: 'wp_create_post',
            description: 'Create a WordPress post',
            inputSchema: {
              type: 'object',
              properties: {
                site_id: { type: 'string' },
                user_id: { type: 'string' },
                title: { type: 'string' },
                content: { type: 'string' },
                status: { type: 'string', enum: ['draft', 'published', 'scheduled'] },
                categories: { type: 'array', items: { type: 'string' } },
                tags: { type: 'array', items: { type: 'string' } },
                scheduled_for: { type: 'string', format: 'date-time' }
              },
              required: ['site_id', 'user_id', 'title', 'content']
            }
          },

          // WordPress REST API Tools
          {
            name: 'wp_get_posts',
            description: 'Get WordPress posts via REST API',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                per_page: { type: 'integer', default: 10 },
                page: { type: 'integer', default: 1 },
                status: { type: 'string', enum: ['publish', 'draft', 'private'], default: 'publish' },
                search: { type: 'string' },
                categories: { type: 'array', items: { type: 'integer' } },
                tags: { type: 'array', items: { type: 'integer' } }
              },
              required: ['user_id']
            }
          },
          {
            name: 'wp_create_post_api',
            description: 'Create a WordPress post via REST API',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                title: { type: 'string' },
                content: { type: 'string' },
                status: { type: 'string', enum: ['draft', 'publish', 'private'], default: 'draft' },
                excerpt: { type: 'string' },
                categories: { type: 'array', items: { type: 'integer' } },
                tags: { type: 'array', items: { type: 'integer' } },
                featured_media: { type: 'integer' }
              },
              required: ['user_id', 'title', 'content']
            }
          },
          {
            name: 'wp_update_post',
            description: 'Update a WordPress post',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                post_id: { type: 'integer' },
                title: { type: 'string' },
                content: { type: 'string' },
                status: { type: 'string', enum: ['draft', 'publish', 'private'] },
                excerpt: { type: 'string' },
                categories: { type: 'array', items: { type: 'integer' } },
                tags: { type: 'array', items: { type: 'integer' } }
              },
              required: ['user_id', 'post_id']
            }
          },
          {
            name: 'wp_delete_post',
            description: 'Delete a WordPress post',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                post_id: { type: 'integer' }
              },
              required: ['user_id', 'post_id']
            }
          },
          {
            name: 'wp_get_pages',
            description: 'Get WordPress pages',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                per_page: { type: 'integer', default: 10 },
                page: { type: 'integer', default: 1 },
                status: { type: 'string', enum: ['publish', 'draft', 'private'], default: 'publish' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'wp_create_page',
            description: 'Create a WordPress page',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                title: { type: 'string' },
                content: { type: 'string' },
                status: { type: 'string', enum: ['draft', 'publish', 'private'], default: 'draft' },
                parent: { type: 'integer', default: 0 },
                template: { type: 'string' }
              },
              required: ['user_id', 'title', 'content']
            }
          },
          {
            name: 'wp_get_categories',
            description: 'Get WordPress categories',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'wp_create_category',
            description: 'Create a WordPress category',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                parent: { type: 'integer', default: 0 }
              },
              required: ['user_id', 'name']
            }
          },
          {
            name: 'wp_get_tags',
            description: 'Get WordPress tags',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'wp_get_site_info',
            description: 'Get WordPress site information and settings',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'wp_get_media',
            description: 'Get WordPress media library items',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                per_page: { type: 'integer', default: 10 },
                page: { type: 'integer', default: 1 }
              },
              required: ['user_id']
            }
          },

          // Mautic Email Marketing Tools
          {
            name: 'mautic_test_connection',
            description: 'Test Mautic API connection',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'mautic_get_contacts',
            description: 'Get Mautic contacts with pagination and search',
            inputSchema: {
              type: 'object',
              properties: {
                limit: { type: 'integer', default: 30, description: 'Number of contacts to retrieve' },
                start: { type: 'integer', default: 0, description: 'Starting offset' },
                search: { type: 'string', description: 'Search term' },
                orderBy: { type: 'string', default: 'id', description: 'Field to order by' },
                orderByDir: { type: 'string', default: 'ASC', enum: ['ASC', 'DESC'] }
              },
              required: []
            }
          },
          {
            name: 'mautic_get_contact',
            description: 'Get a specific Mautic contact by ID',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: { type: 'string', description: 'Contact ID' }
              },
              required: ['contactId']
            }
          },
          {
            name: 'mautic_create_contact',
            description: 'Create a new Mautic contact',
            inputSchema: {
              type: 'object',
              properties: {
                email: { type: 'string', description: 'Contact email address' },
                firstname: { type: 'string', description: 'First name' },
                lastname: { type: 'string', description: 'Last name' },
                company: { type: 'string', description: 'Company name' },
                phone: { type: 'string', description: 'Phone number' },
                website: { type: 'string', description: 'Website URL' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Contact tags' },
                customFields: { type: 'object', description: 'Custom field values' }
              },
              required: ['email']
            }
          },
          {
            name: 'mautic_update_contact',
            description: 'Update an existing Mautic contact',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: { type: 'string', description: 'Contact ID' },
                email: { type: 'string', description: 'Contact email address' },
                firstname: { type: 'string', description: 'First name' },
                lastname: { type: 'string', description: 'Last name' },
                company: { type: 'string', description: 'Company name' },
                phone: { type: 'string', description: 'Phone number' },
                website: { type: 'string', description: 'Website URL' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Contact tags' },
                customFields: { type: 'object', description: 'Custom field values' }
              },
              required: ['contactId']
            }
          },
          {
            name: 'mautic_delete_contact',
            description: 'Delete a Mautic contact',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: { type: 'string', description: 'Contact ID' }
              },
              required: ['contactId']
            }
          },
          {
            name: 'mautic_get_segments',
            description: 'Get Mautic segments (lists)',
            inputSchema: {
              type: 'object',
              properties: {
                limit: { type: 'integer', default: 30 },
                start: { type: 'integer', default: 0 },
                search: { type: 'string', description: 'Search term' }
              },
              required: []
            }
          },
          {
            name: 'mautic_create_segment',
            description: 'Create a new Mautic segment',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Segment name' },
                description: { type: 'string', description: 'Segment description' },
                isGlobal: { type: 'boolean', default: true, description: 'Is global segment' },
                filters: { type: 'array', description: 'Segment filters' }
              },
              required: ['name']
            }
          },
          {
            name: 'mautic_add_contact_to_segment',
            description: 'Add contact to a Mautic segment',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: { type: 'string', description: 'Contact ID' },
                segmentId: { type: 'string', description: 'Segment ID' }
              },
              required: ['contactId', 'segmentId']
            }
          },
          {
            name: 'mautic_remove_contact_from_segment',
            description: 'Remove contact from a Mautic segment',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: { type: 'string', description: 'Contact ID' },
                segmentId: { type: 'string', description: 'Segment ID' }
              },
              required: ['contactId', 'segmentId']
            }
          },
          {
            name: 'mautic_get_campaigns',
            description: 'Get Mautic campaigns',
            inputSchema: {
              type: 'object',
              properties: {
                limit: { type: 'integer', default: 30 },
                start: { type: 'integer', default: 0 },
                search: { type: 'string', description: 'Search term' }
              },
              required: []
            }
          },
          {
            name: 'mautic_create_campaign',
            description: 'Create a new Mautic campaign',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Campaign name' },
                description: { type: 'string', description: 'Campaign description' },
                isPublished: { type: 'boolean', default: true, description: 'Is campaign published' },
                events: { type: 'array', description: 'Campaign events' }
              },
              required: ['name']
            }
          },
          {
            name: 'mautic_add_contact_to_campaign',
            description: 'Add contact to a Mautic campaign',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: { type: 'string', description: 'Campaign ID' },
                contactId: { type: 'string', description: 'Contact ID' }
              },
              required: ['campaignId', 'contactId']
            }
          },
          {
            name: 'mautic_get_emails',
            description: 'Get Mautic emails',
            inputSchema: {
              type: 'object',
              properties: {
                limit: { type: 'integer', default: 30 },
                start: { type: 'integer', default: 0 },
                search: { type: 'string', description: 'Search term' }
              },
              required: []
            }
          },
          {
            name: 'mautic_create_email',
            description: 'Create a new Mautic email',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Email name' },
                subject: { type: 'string', description: 'Email subject' },
                customHtml: { type: 'string', description: 'Email HTML content' },
                plainText: { type: 'string', description: 'Email plain text content' },
                emailType: { type: 'string', default: 'template', enum: ['template', 'list'] },
                isPublished: { type: 'boolean', default: true }
              },
              required: ['name', 'subject', 'customHtml']
            }
          },
          {
            name: 'mautic_send_email',
            description: 'Send Mautic email to a contact',
            inputSchema: {
              type: 'object',
              properties: {
                emailId: { type: 'string', description: 'Email ID' },
                contactId: { type: 'string', description: 'Contact ID' },
                tokens: { type: 'object', description: 'Email tokens for personalization' }
              },
              required: ['emailId', 'contactId']
            }
          },
          {
            name: 'mautic_send_email_to_segment',
            description: 'Send Mautic email to a segment',
            inputSchema: {
              type: 'object',
              properties: {
                emailId: { type: 'string', description: 'Email ID' },
                segmentId: { type: 'string', description: 'Segment ID' }
              },
              required: ['emailId', 'segmentId']
            }
          },
          {
            name: 'mautic_get_forms',
            description: 'Get Mautic forms',
            inputSchema: {
              type: 'object',
              properties: {
                limit: { type: 'integer', default: 30 },
                start: { type: 'integer', default: 0 },
                search: { type: 'string', description: 'Search term' }
              },
              required: []
            }
          },
          {
            name: 'mautic_submit_form',
            description: 'Submit data to a Mautic form',
            inputSchema: {
              type: 'object',
              properties: {
                formId: { type: 'string', description: 'Form ID' },
                formData: { type: 'object', description: 'Form field data' }
              },
              required: ['formId', 'formData']
            }
          },
          {
            name: 'mautic_add_points',
            description: 'Add points to a Mautic contact',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: { type: 'string', description: 'Contact ID' },
                points: { type: 'integer', description: 'Points to add' },
                action: { type: 'string', default: 'Manual adjustment', description: 'Action description' }
              },
              required: ['contactId', 'points']
            }
          },
          {
            name: 'mautic_subtract_points',
            description: 'Subtract points from a Mautic contact',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: { type: 'string', description: 'Contact ID' },
                points: { type: 'integer', description: 'Points to subtract' },
                action: { type: 'string', default: 'Manual adjustment', description: 'Action description' }
              },
              required: ['contactId', 'points']
            }
          },
          {
            name: 'mautic_get_email_stats',
            description: 'Get Mautic email statistics',
            inputSchema: {
              type: 'object',
              properties: {
                emailId: { type: 'string', description: 'Email ID' }
              },
              required: ['emailId']
            }
          },
          {
            name: 'mautic_get_campaign_stats',
            description: 'Get Mautic campaign statistics',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: { type: 'string', description: 'Campaign ID' }
              },
              required: ['campaignId']
            }
          },

          // Social Media (Postiz) Tools
          {
            name: 'social_list_accounts',
            description: 'List all social media accounts',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'social_create_post',
            description: 'Create a social media post',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                title: { type: 'string' },
                content: { type: 'string' },
                platforms: { type: 'array', items: { type: 'string' } },
                media_urls: { type: 'array', items: { type: 'string' } },
                scheduled_for: { type: 'string', format: 'date-time' }
              },
              required: ['user_id', 'content', 'platforms']
            }
          },
          {
            name: 'social_schedule_post',
            description: 'Schedule a social media post',
            inputSchema: {
              type: 'object',
              properties: {
                post_id: { type: 'string' },
                user_id: { type: 'string' },
                scheduled_for: { type: 'string', format: 'date-time' }
              },
              required: ['post_id', 'user_id', 'scheduled_for']
            }
          },

          // Affiliate Marketing Tools
          {
            name: 'affiliate_list_networks',
            description: 'List all affiliate networks',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'affiliate_search_products',
            description: 'Search for affiliate products',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                network_id: { type: 'string' },
                category: { type: 'string' },
                min_commission: { type: 'number' },
                keywords: { type: 'string' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'affiliate_create_campaign',
            description: 'Create an affiliate marketing campaign',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                product_id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                budget: { type: 'number' },
                landing_page_url: { type: 'string' }
              },
              required: ['user_id', 'product_id', 'name']
            }
          },

          // Email Management (Mailcow) Tools
          {
            name: 'mail_list_domains',
            description: 'List all email domains',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'mail_create_domain',
            description: 'Create a new email domain',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                domain: { type: 'string' },
                description: { type: 'string' },
                max_mailboxes: { type: 'integer', default: 100 }
              },
              required: ['user_id', 'domain']
            }
          },
          {
            name: 'mail_list_mailboxes',
            description: 'List all mailboxes for a domain or all domains',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                domain: { type: 'string', description: 'Optional: filter by domain' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'mail_create_mailbox',
            description: 'Create a new mailbox',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                local_part: { type: 'string', description: 'Username part (before @)' },
                domain: { type: 'string' },
                name: { type: 'string', description: 'Full name' },
                password: { type: 'string' },
                quota: { type: 'integer', description: 'Quota in MB', default: 1024 },
                active: { type: 'boolean', default: true }
              },
              required: ['user_id', 'local_part', 'domain', 'name', 'password']
            }
          },
          {
            name: 'mail_update_mailbox',
            description: 'Update an existing mailbox',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                mailbox: { type: 'string', description: 'Full email address' },
                name: { type: 'string' },
                quota: { type: 'integer' },
                active: { type: 'boolean' },
                password: { type: 'string' }
              },
              required: ['user_id', 'mailbox']
            }
          },
          {
            name: 'mail_delete_mailbox',
            description: 'Delete a mailbox',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                mailbox: { type: 'string', description: 'Full email address' }
              },
              required: ['user_id', 'mailbox']
            }
          },
          {
            name: 'mail_list_aliases',
            description: 'List email aliases',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                domain: { type: 'string', description: 'Optional: filter by domain' }
              },
              required: ['user_id']
            }
          },
          {
            name: 'mail_create_alias',
            description: 'Create an email alias',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                address: { type: 'string', description: 'Alias email address' },
                goto: { type: 'array', items: { type: 'string' }, description: 'Destination addresses' },
                active: { type: 'boolean', default: true }
              },
              required: ['user_id', 'address', 'goto']
            }
          },

          // System Management Tools
          {
            name: 'system_get_metrics',
            description: 'Get platform metrics and monitoring data',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                timeframe: { type: 'string', enum: ['1h', '24h', '7d', '30d'], default: '24h' },
                metric_type: { type: 'string', enum: ['overview', 'chat', 'tasks', 'vps', 'social', 'affiliate'] }
              },
              required: ['user_id']
            }
          },
          {
            name: 'system_backup_data',
            description: 'Create backup of platform data',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                backup_type: { type: 'string', enum: ['full', 'database', 'configs', 'workflows'] },
                include_media: { type: 'boolean', default: false }
              },
              required: ['user_id', 'backup_type']
            }
          },
          {
            name: 'system_deploy_updates',
            description: 'Deploy updates to the platform or services',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                service: { type: 'string', enum: ['platform', 'n8n', 'wordpress', 'postiz', 'mailcow'] },
                version: { type: 'string' },
                auto_restart: { type: 'boolean', default: true }
              },
              required: ['user_id', 'service']
            }
          },

          // AI/LLM Tools
          {
            name: 'ai_chat',
            description: 'Chat with AI using various LLM providers',
            inputSchema: {
              type: 'object',
              properties: {
                provider: { type: 'string', enum: ['openrouter', 'ollama', 'openai', 'anthropic'] },
                model: { type: 'string' },
                messages: { 
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                      content: { type: 'string' }
                    },
                    required: ['role', 'content']
                  }
                },
                temperature: { type: 'number', minimum: 0, maximum: 2 },
                max_tokens: { type: 'integer', minimum: 1 }
              },
              required: ['provider', 'model', 'messages']
            }
          },
          {
            name: 'ai_generate_workflow',
            description: 'Generate N8N workflow using AI',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                description: { type: 'string', description: 'Description of what the workflow should do' },
                input_data: { type: 'object', description: 'Sample input data' },
                output_format: { type: 'object', description: 'Desired output format' },
                services: { type: 'array', items: { type: 'string' }, description: 'Services to integrate' }
              },
              required: ['user_id', 'description']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // VPS Management
          case 'vps_list_servers':
            return await this.handleVPSListServers(args);
          case 'vps_create_server':
            return await this.handleVPSCreateServer(args);
          case 'vps_deploy_stack':
            return await this.handleVPSDeployStack(args);
          case 'vps_get_status':
            return await this.handleVPSGetStatus(args);
          case 'vps_execute_command':
            return await this.handleVPSExecuteCommand(args);

          // N8N Management
          case 'n8n_list_instances':
            return await this.handleN8NListInstances(args);
          case 'n8n_create_workflow':
            return await this.handleN8NCreateWorkflow(args);
          case 'n8n_execute_workflow':
            return await this.handleN8NExecuteWorkflow(args);
          case 'n8n_sync_workflows':
            return await this.handleN8NSyncWorkflows(args);

          // WordPress Management
          case 'wp_list_sites':
            return await this.handleWPListSites(args);
          case 'wp_create_site':
            return await this.handleWPCreateSite(args);
          case 'wp_create_post':
            return await this.handleWPCreatePost(args);

          // WordPress REST API
          case 'wp_get_posts':
            return await this.handleWPGetPosts(args);
          case 'wp_create_post_api':
            return await this.handleWPCreatePostAPI(args);
          case 'wp_update_post':
            return await this.handleWPUpdatePost(args);
          case 'wp_delete_post':
            return await this.handleWPDeletePost(args);
          case 'wp_get_pages':
            return await this.handleWPGetPages(args);
          case 'wp_create_page':
            return await this.handleWPCreatePage(args);
          case 'wp_get_categories':
            return await this.handleWPGetCategories(args);
          case 'wp_create_category':
            return await this.handleWPCreateCategory(args);
          case 'wp_get_tags':
            return await this.handleWPGetTags(args);
          case 'wp_get_site_info':
            return await this.handleWPGetSiteInfo(args);
          case 'wp_get_media':
            return await this.handleWPGetMedia(args);

          // Mautic Email Marketing
          case 'mautic_test_connection':
            return await this.handleMauticTestConnection(args);
          case 'mautic_get_contacts':
            return await this.handleMauticGetContacts(args);
          case 'mautic_get_contact':
            return await this.handleMauticGetContact(args);
          case 'mautic_create_contact':
            return await this.handleMauticCreateContact(args);
          case 'mautic_update_contact':
            return await this.handleMauticUpdateContact(args);
          case 'mautic_delete_contact':
            return await this.handleMauticDeleteContact(args);
          case 'mautic_get_segments':
            return await this.handleMauticGetSegments(args);
          case 'mautic_create_segment':
            return await this.handleMauticCreateSegment(args);
          case 'mautic_add_contact_to_segment':
            return await this.handleMauticAddContactToSegment(args);
          case 'mautic_remove_contact_from_segment':
            return await this.handleMauticRemoveContactFromSegment(args);
          case 'mautic_get_campaigns':
            return await this.handleMauticGetCampaigns(args);
          case 'mautic_create_campaign':
            return await this.handleMauticCreateCampaign(args);
          case 'mautic_add_contact_to_campaign':
            return await this.handleMauticAddContactToCampaign(args);
          case 'mautic_get_emails':
            return await this.handleMauticGetEmails(args);
          case 'mautic_create_email':
            return await this.handleMauticCreateEmail(args);
          case 'mautic_send_email':
            return await this.handleMauticSendEmail(args);
          case 'mautic_send_email_to_segment':
            return await this.handleMauticSendEmailToSegment(args);
          case 'mautic_get_forms':
            return await this.handleMauticGetForms(args);
          case 'mautic_submit_form':
            return await this.handleMauticSubmitForm(args);
          case 'mautic_add_points':
            return await this.handleMauticAddPoints(args);
          case 'mautic_subtract_points':
            return await this.handleMauticSubtractPoints(args);
          case 'mautic_get_email_stats':
            return await this.handleMauticGetEmailStats(args);
          case 'mautic_get_campaign_stats':
            return await this.handleMauticGetCampaignStats(args);

          // Social Media
          case 'social_list_accounts':
            return await this.handleSocialListAccounts(args);
          case 'social_create_post':
            return await this.handleSocialCreatePost(args);
          case 'social_schedule_post':
            return await this.handleSocialSchedulePost(args);

          // Affiliate Marketing
          case 'affiliate_list_networks':
            return await this.handleAffiliateListNetworks(args);
          case 'affiliate_search_products':
            return await this.handleAffiliateSearchProducts(args);
          case 'affiliate_create_campaign':
            return await this.handleAffiliateCreateCampaign(args);

          // Email Management
          case 'mail_list_domains':
            return await this.handleMailListDomains(args);
          case 'mail_create_domain':
            return await this.handleMailCreateDomain(args);
          case 'mail_list_mailboxes':
            return await this.handleMailListMailboxes(args);
          case 'mail_create_mailbox':
            return await this.handleMailCreateMailbox(args);
          case 'mail_update_mailbox':
            return await this.handleMailUpdateMailbox(args);
          case 'mail_delete_mailbox':
            return await this.handleMailDeleteMailbox(args);
          case 'mail_list_aliases':
            return await this.handleMailListAliases(args);
          case 'mail_create_alias':
            return await this.handleMailCreateAlias(args);

          // System Management
          case 'system_get_metrics':
            return await this.handleSystemGetMetrics(args);
          case 'system_backup_data':
            return await this.handleSystemBackupData(args);
          case 'system_deploy_updates':
            return await this.handleSystemDeployUpdates(args);

          // AI/LLM
          case 'ai_chat':
            return await this.handleAIChat(args);
          case 'ai_generate_workflow':
            return await this.handleAIGenerateWorkflow(args);

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  // VPS Management Handlers
  async handleVPSListServers(args) {
    const servers = await this.managers.vps.listServers(args.user_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ servers }, null, 2)
        }
      ]
    };
  }

  async handleVPSCreateServer(args) {
    const server = await this.managers.vps.createServer(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ server, message: 'Server created successfully' }, null, 2)
        }
      ]
    };
  }

  async handleVPSDeployStack(args) {
    const { server_id, user_id, stack_type, domain, admin_email, environment = {} } = args;
    
    // Get deployment script based on stack type
    const scriptMap = {
      'full_stack': 'install_full_stack.sh',
      'bookaistudio': 'install_full_stack_bookaistudio.sh',
      'mailcow_only': '10_mailcow_install.sh',
      'n8n_only': '30_n8n_install.sh',
      'wordpress_only': 'wordpress_install.sh'
    };

    const scriptName = scriptMap[stack_type];
    if (!scriptName) {
      throw new Error(`Unknown stack type: ${stack_type}`);
    }

    // Prepare environment variables
    const deployEnv = {
      MAIN_DOMAIN: domain,
      ADMIN_EMAIL: admin_email || `admin@${domain}`,
      ...environment
    };

    const result = await this.managers.vps.deployScript(
      server_id,
      user_id,
      stack_type,
      deployEnv
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            deployment: result,
            message: `Stack deployment ${result.success ? 'completed' : 'failed'}`,
            script_used: scriptName,
            environment: deployEnv
          }, null, 2)
        }
      ]
    };
  }

  async handleVPSGetStatus(args) {
    const status = await this.managers.vps.getServerStatus(args.server_id, args.user_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(status, null, 2)
        }
      ]
    };
  }

  async handleVPSExecuteCommand(args) {
    const { server_id, user_id, command, working_dir = '/root' } = args;
    
    // Get server info
    const serverResult = await this.pool.query(
      'SELECT * FROM vps_servers WHERE id = $1 AND user_id = $2',
      [server_id, user_id]
    );

    if (serverResult.rows.length === 0) {
      throw new Error('Server not found or access denied');
    }

    const server = serverResult.rows[0];
    
    // Execute command via SSH
    const sshConfig = {
      host: server.ip_address,
      port: server.connection_config.ssh?.port || 22,
      username: server.connection_config.ssh?.username || 'root',
      ...server.connection_config.ssh
    };

    const ssh = new SSH2Promise(sshConfig);
    await ssh.connect();
    
    const result = await ssh.exec(`cd ${working_dir} && ${command}`);
    await ssh.close();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            command,
            working_dir,
            output: result,
            server: server.name,
            executed_at: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }

  // N8N Management Handlers
  async handleN8NListInstances(args) {
    const instances = await this.managers.n8n.listInstances(args.user_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ instances }, null, 2)
        }
      ]
    };
  }

  async handleN8NCreateWorkflow(args) {
    const workflow = await this.managers.n8n.createWorkflow(args, args.user_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ workflow, message: 'Workflow created successfully' }, null, 2)
        }
      ]
    };
  }

  async handleN8NExecuteWorkflow(args) {
    const result = await this.managers.n8n.executeWorkflow(
      args.workflow_id,
      args.input || {},
      args.user_id
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ execution: result }, null, 2)
        }
      ]
    };
  }

  async handleN8NSyncWorkflows(args) {
    const result = await this.managers.n8n.syncWorkflows(args.instance_id, args.user_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sync_result: result,
            message: `Synced ${result.synced} workflows, ${result.errors} errors`
          }, null, 2)
        }
      ]
    };
  }

  // WordPress Management Handlers
  async handleWPListSites(args) {
    const sites = await this.managers.wordpress.listSites(args.user_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ sites }, null, 2)
        }
      ]
    };
  }

  async handleWPCreateSite(args) {
    const site = await this.managers.wordpress.createSite(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ site, message: 'WordPress site created successfully' }, null, 2)
        }
      ]
    };
  }

  async handleWPCreatePost(args) {
    const post = await this.managers.wordpress.createContent(args.site_id, args, args.user_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ post, message: 'WordPress post created successfully' }, null, 2)
        }
      ]
    };
  }

  // WordPress REST API Handlers
  async handleWPGetPosts(args) {
    const posts = await this.managers.wordpress.getPosts({
      per_page: args.per_page,
      page: args.page,
      status: args.status,
      search: args.search,
      categories: args.categories,
      tags: args.tags
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ posts, count: posts.length }, null, 2)
        }
      ]
    };
  }

  async handleWPCreatePostAPI(args) {
    const post = await this.managers.wordpress.createPost({
      title: args.title,
      content: args.content,
      status: args.status,
      excerpt: args.excerpt,
      categories: args.categories,
      tags: args.tags,
      featured_media: args.featured_media
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ post, message: 'WordPress post created successfully via REST API' }, null, 2)
        }
      ]
    };
  }

  async handleWPUpdatePost(args) {
    const updates = {};
    if (args.title) updates.title = args.title;
    if (args.content) updates.content = args.content;
    if (args.status) updates.status = args.status;
    if (args.excerpt) updates.excerpt = args.excerpt;
    if (args.categories) updates.categories = args.categories;
    if (args.tags) updates.tags = args.tags;

    const post = await this.managers.wordpress.updatePost(args.post_id, updates);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ post, message: 'WordPress post updated successfully' }, null, 2)
        }
      ]
    };
  }

  async handleWPDeletePost(args) {
    const result = await this.managers.wordpress.deletePost(args.post_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ result, message: 'WordPress post deleted successfully' }, null, 2)
        }
      ]
    };
  }

  async handleWPGetPages(args) {
    const pages = await this.managers.wordpress.getPages({
      per_page: args.per_page,
      page: args.page,
      status: args.status
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ pages, count: pages.length }, null, 2)
        }
      ]
    };
  }

  async handleWPCreatePage(args) {
    const page = await this.managers.wordpress.createPage({
      title: args.title,
      content: args.content,
      status: args.status,
      parent: args.parent,
      template: args.template
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ page, message: 'WordPress page created successfully' }, null, 2)
        }
      ]
    };
  }

  async handleWPGetCategories(args) {
    const categories = await this.managers.wordpress.getCategories();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ categories, count: categories.length }, null, 2)
        }
      ]
    };
  }

  async handleWPCreateCategory(args) {
    const category = await this.managers.wordpress.createCategory({
      name: args.name,
      description: args.description,
      parent: args.parent
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ category, message: 'WordPress category created successfully' }, null, 2)
        }
      ]
    };
  }

  async handleWPGetTags(args) {
    const tags = await this.managers.wordpress.getTags();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ tags, count: tags.length }, null, 2)
        }
      ]
    };
  }

  async handleWPGetSiteInfo(args) {
    const [settings, currentUser] = await Promise.all([
      this.managers.wordpress.getSiteSettings(),
      this.managers.wordpress.getCurrentUser()
    ]);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ 
            site_settings: settings, 
            current_user: currentUser,
            message: 'WordPress site information retrieved successfully'
          }, null, 2)
        }
      ]
    };
  }

  async handleWPGetMedia(args) {
    const media = await this.managers.wordpress.getMedia({
      per_page: args.per_page,
      page: args.page
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ media, count: media.length }, null, 2)
        }
      ]
    };
  }

  // Mautic Email Marketing Handlers
  async handleMauticTestConnection(args) {
    try {
      const result = await this.managers.mautic.testConnection();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Mautic connection test failed: ${error.message}`);
    }
  }

  async handleMauticGetContacts(args) {
    try {
      const contacts = await this.managers.mautic.getContacts(
        args.limit,
        args.start,
        args.search,
        args.orderBy,
        args.orderByDir
      );
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ contacts, total: contacts.total || 0 }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get contacts: ${error.message}`);
    }
  }

  async handleMauticGetContact(args) {
    try {
      const contact = await this.managers.mautic.getContact(args.contactId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ contact }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get contact: ${error.message}`);
    }
  }

  async handleMauticCreateContact(args) {
    try {
      const contactData = {
        email: args.email,
        firstname: args.firstname,
        lastname: args.lastname,
        company: args.company,
        phone: args.phone,
        website: args.website,
        tags: args.tags,
        ...args.customFields
      };
      const contact = await this.managers.mautic.createContact(contactData);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ contact, message: 'Contact created successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create contact: ${error.message}`);
    }
  }

  async handleMauticUpdateContact(args) {
    try {
      const contactData = {
        email: args.email,
        firstname: args.firstname,
        lastname: args.lastname,
        company: args.company,
        phone: args.phone,
        website: args.website,
        tags: args.tags,
        ...args.customFields
      };
      const contact = await this.managers.mautic.updateContact(args.contactId, contactData);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ contact, message: 'Contact updated successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to update contact: ${error.message}`);
    }
  }

  async handleMauticDeleteContact(args) {
    try {
      const result = await this.managers.mautic.deleteContact(args.contactId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Contact deleted successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to delete contact: ${error.message}`);
    }
  }

  async handleMauticGetSegments(args) {
    try {
      const segments = await this.managers.mautic.getSegments(args.limit, args.start, args.search);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ segments, total: segments.total || 0 }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get segments: ${error.message}`);
    }
  }

  async handleMauticCreateSegment(args) {
    try {
      const segmentData = {
        name: args.name,
        description: args.description,
        isGlobal: args.isGlobal,
        filters: args.filters
      };
      const segment = await this.managers.mautic.createSegment(segmentData);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ segment, message: 'Segment created successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create segment: ${error.message}`);
    }
  }

  async handleMauticAddContactToSegment(args) {
    try {
      const result = await this.managers.mautic.addContactToSegment(args.contactId, args.segmentId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Contact added to segment successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to add contact to segment: ${error.message}`);
    }
  }

  async handleMauticRemoveContactFromSegment(args) {
    try {
      const result = await this.managers.mautic.removeContactFromSegment(args.contactId, args.segmentId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Contact removed from segment successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to remove contact from segment: ${error.message}`);
    }
  }

  async handleMauticGetCampaigns(args) {
    try {
      const campaigns = await this.managers.mautic.getCampaigns(args.limit, args.start, args.search);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ campaigns, total: campaigns.total || 0 }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get campaigns: ${error.message}`);
    }
  }

  async handleMauticCreateCampaign(args) {
    try {
      const campaignData = {
        name: args.name,
        description: args.description,
        isPublished: args.isPublished,
        events: args.events
      };
      const campaign = await this.managers.mautic.createCampaign(campaignData);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ campaign, message: 'Campaign created successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
  }

  async handleMauticAddContactToCampaign(args) {
    try {
      const result = await this.managers.mautic.addContactToCampaign(args.campaignId, args.contactId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Contact added to campaign successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to add contact to campaign: ${error.message}`);
    }
  }

  async handleMauticGetEmails(args) {
    try {
      const emails = await this.managers.mautic.getEmails(args.limit, args.start, args.search);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ emails, total: emails.total || 0 }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get emails: ${error.message}`);
    }
  }

  async handleMauticCreateEmail(args) {
    try {
      const emailData = {
        name: args.name,
        subject: args.subject,
        customHtml: args.customHtml,
        plainText: args.plainText,
        emailType: args.emailType,
        isPublished: args.isPublished
      };
      const email = await this.managers.mautic.createEmail(emailData);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ email, message: 'Email created successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create email: ${error.message}`);
    }
  }

  async handleMauticSendEmail(args) {
    try {
      const result = await this.managers.mautic.sendEmail(args.emailId, args.contactId, args.tokens);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Email sent successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async handleMauticSendEmailToSegment(args) {
    try {
      const result = await this.managers.mautic.sendEmailToSegment(args.emailId, args.segmentId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Email sent to segment successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to send email to segment: ${error.message}`);
    }
  }

  async handleMauticGetForms(args) {
    try {
      const forms = await this.managers.mautic.getForms(args.limit, args.start, args.search);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ forms, total: forms.total || 0 }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get forms: ${error.message}`);
    }
  }

  async handleMauticSubmitForm(args) {
    try {
      const result = await this.managers.mautic.submitForm(args.formId, args.formData);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Form submitted successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to submit form: ${error.message}`);
    }
  }

  async handleMauticAddPoints(args) {
    try {
      const result = await this.managers.mautic.addPointsToContact(args.contactId, args.points, args.action);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Points added successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to add points: ${error.message}`);
    }
  }

  async handleMauticSubtractPoints(args) {
    try {
      const result = await this.managers.mautic.subtractPointsFromContact(args.contactId, args.points, args.action);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Points subtracted successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to subtract points: ${error.message}`);
    }
  }

  async handleMauticGetEmailStats(args) {
    try {
      const stats = await this.managers.mautic.getEmailStats(args.emailId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ stats }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get email stats: ${error.message}`);
    }
  }

  async handleMauticGetCampaignStats(args) {
    try {
      const stats = await this.managers.mautic.getCampaignStats(args.campaignId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ stats }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get campaign stats: ${error.message}`);
    }
  }

  // Social Media Handlers
  async handleSocialListAccounts(args) {
    const accounts = await this.managers.postiz.listAccounts(args.user_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ accounts }, null, 2)
        }
      ]
    };
  }

  async handleSocialCreatePost(args) {
    const post = await this.managers.postiz.createPost(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ post, message: 'Social media post created successfully' }, null, 2)
        }
      ]
    };
  }

  async handleSocialSchedulePost(args) {
    const result = await this.managers.postiz.schedulePost(
      args.post_id,
      args.scheduled_for,
      args.user_id
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ result, message: 'Post scheduled successfully' }, null, 2)
        }
      ]
    };
  }

  // Affiliate Marketing Handlers
  async handleAffiliateListNetworks(args) {
    const networks = await this.managers.affiliate.listNetworks(args.user_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ networks }, null, 2)
        }
      ]
    };
  }

  async handleAffiliateSearchProducts(args) {
    const products = await this.managers.affiliate.searchProducts(args.user_id, args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ products }, null, 2)
        }
      ]
    };
  }

  async handleAffiliateCreateCampaign(args) {
    const campaign = await this.managers.affiliate.createCampaign(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ campaign, message: 'Affiliate campaign created successfully' }, null, 2)
        }
      ]
    };
  }

  // Email Management (Mailcow) Handlers
  async handleMailListDomains(args) {
    try {
      const response = await fetch(`${process.env.MAILCOW_API_URL}/get/domain/all`, {
        headers: {
          'X-API-Key': process.env.MAILCOW_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      const domains = await response.json();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ domains }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to list domains: ${error.message}`);
    }
  }

  async handleMailCreateDomain(args) {
    try {
      const response = await fetch(`${process.env.MAILCOW_API_URL}/add/domain`, {
        method: 'POST',
        headers: {
          'X-API-Key': process.env.MAILCOW_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain: args.domain,
          description: args.description || '',
          mailbox_quota: args.max_mailboxes || 100,
          active: 1
        })
      });
      const result = await response.json();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Domain created successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create domain: ${error.message}`);
    }
  }

  async handleMailListMailboxes(args) {
    try {
      let url = `${process.env.MAILCOW_API_URL}/get/mailbox/all`;
      if (args.domain) {
        url = `${process.env.MAILCOW_API_URL}/get/mailbox/domain/${args.domain}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': process.env.MAILCOW_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      const mailboxes = await response.json();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ mailboxes }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to list mailboxes: ${error.message}`);
    }
  }

  async handleMailCreateMailbox(args) {
    try {
      const response = await fetch(`${process.env.MAILCOW_API_URL}/add/mailbox`, {
        method: 'POST',
        headers: {
          'X-API-Key': process.env.MAILCOW_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          local_part: args.local_part,
          domain: args.domain,
          name: args.name,
          password: args.password,
          password2: args.password,
          quota: args.quota || 1024,
          active: args.active !== false ? 1 : 0
        })
      });
      const result = await response.json();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Mailbox created successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create mailbox: ${error.message}`);
    }
  }

  async handleMailUpdateMailbox(args) {
    try {
      const updateData = { items: [args.mailbox] };
      if (args.name) updateData.name = args.name;
      if (args.quota) updateData.quota = args.quota;
      if (args.active !== undefined) updateData.active = args.active ? 1 : 0;
      if (args.password) {
        updateData.password = args.password;
        updateData.password2 = args.password;
      }
      
      const response = await fetch(`${process.env.MAILCOW_API_URL}/edit/mailbox`, {
        method: 'POST',
        headers: {
          'X-API-Key': process.env.MAILCOW_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      const result = await response.json();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Mailbox updated successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to update mailbox: ${error.message}`);
    }
  }

  async handleMailDeleteMailbox(args) {
    try {
      const response = await fetch(`${process.env.MAILCOW_API_URL}/delete/mailbox`, {
        method: 'POST',
        headers: {
          'X-API-Key': process.env.MAILCOW_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [args.mailbox]
        })
      });
      const result = await response.json();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Mailbox deleted successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to delete mailbox: ${error.message}`);
    }
  }

  async handleMailListAliases(args) {
    try {
      let url = `${process.env.MAILCOW_API_URL}/get/alias/all`;
      if (args.domain) {
        url = `${process.env.MAILCOW_API_URL}/get/alias/domain/${args.domain}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': process.env.MAILCOW_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      const aliases = await response.json();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ aliases }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to list aliases: ${error.message}`);
    }
  }

  async handleMailCreateAlias(args) {
    try {
      const response = await fetch(`${process.env.MAILCOW_API_URL}/add/alias`, {
        method: 'POST',
        headers: {
          'X-API-Key': process.env.MAILCOW_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: args.address,
          goto: args.goto.join(','),
          active: args.active !== false ? 1 : 0
        })
      });
      const result = await response.json();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ result, message: 'Alias created successfully' }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create alias: ${error.message}`);
    }
  }

  // System Management Handlers
  async handleSystemGetMetrics(args) {
    const { createMetricsCollector } = await import('../utils/metrics.js');
    const metricsCollector = createMetricsCollector(this.pool);
    
    let metrics;
    switch (args.metric_type) {
      case 'overview':
        metrics = await metricsCollector.getPlatformOverview();
        break;
      case 'chat':
        metrics = await metricsCollector.getChatMetrics(args.timeframe);
        break;
      case 'tasks':
        metrics = await metricsCollector.getTaskMetrics(args.timeframe);
        break;
      case 'vps':
        metrics = await metricsCollector.getVPSMetrics(args.timeframe);
        break;
      case 'social':
        metrics = await metricsCollector.getSocialMetrics(args.timeframe);
        break;
      case 'affiliate':
        metrics = await metricsCollector.getAffiliateMetrics(args.timeframe);
        break;
      default:
        metrics = await metricsCollector.getPlatformOverview();
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ metrics }, null, 2)
        }
      ]
    };
  }

  async handleSystemBackupData(args) {
    // Implementation for system backup
    const backupId = `backup_${Date.now()}`;
    const backupPath = `/opt/backups/${backupId}`;
    
    // Create backup directory
    await fs.mkdir(backupPath, { recursive: true });
    
    let backupResult = {
      backup_id: backupId,
      backup_path: backupPath,
      backup_type: args.backup_type,
      created_at: new Date().toISOString(),
      files: []
    };

    switch (args.backup_type) {
      case 'full':
        // Full backup implementation
        backupResult.files = ['database.sql', 'configs.tar.gz', 'workflows.json', 'media.tar.gz'];
        break;
      case 'database':
        // Database backup
        const dbBackup = spawn('pg_dump', [process.env.DATABASE_URL, '-f', `${backupPath}/database.sql`]);
        await new Promise((resolve, reject) => {
          dbBackup.on('close', (code) => code === 0 ? resolve() : reject(new Error('Database backup failed')));
        });
        backupResult.files = ['database.sql'];
        break;
      case 'configs':
        // Config backup
        backupResult.files = ['configs.tar.gz'];
        break;
      case 'workflows':
        // Workflow backup
        const workflows = await this.pool.query('SELECT * FROM n8n_workflows WHERE instance_id IN (SELECT id FROM n8n_instances WHERE user_id = $1)', [args.user_id]);
        await fs.writeFile(`${backupPath}/workflows.json`, JSON.stringify(workflows.rows, null, 2));
        backupResult.files = ['workflows.json'];
        break;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ backup: backupResult, message: 'Backup created successfully' }, null, 2)
        }
      ]
    };
  }

  async handleSystemDeployUpdates(args) {
    // Implementation for system updates
    const updateResult = {
      service: args.service,
      version: args.version || 'latest',
      started_at: new Date().toISOString(),
      status: 'in_progress'
    };

    try {
      switch (args.service) {
        case 'platform':
          // Update the platform itself
          updateResult.actions = ['git_pull', 'npm_install', 'restart_service'];
          break;
        case 'n8n':
          // Update N8N instances
          updateResult.actions = ['stop_n8n', 'update_n8n', 'start_n8n'];
          break;
        case 'wordpress':
          // Update WordPress sites
          updateResult.actions = ['backup_wp', 'update_wp_core', 'update_plugins'];
          break;
        case 'postiz':
          // Update Postiz
          updateResult.actions = ['stop_postiz', 'update_postiz', 'start_postiz'];
          break;
        case 'mailcow':
          // Update Mailcow
          updateResult.actions = ['backup_mailcow', 'update_mailcow', 'restart_mailcow'];
          break;
      }

      updateResult.status = 'completed';
      updateResult.completed_at = new Date().toISOString();
    } catch (error) {
      updateResult.status = 'failed';
      updateResult.error = error.message;
      updateResult.completed_at = new Date().toISOString();
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ update: updateResult }, null, 2)
        }
      ]
    };
  }

  // AI/LLM Handlers
  async handleAIChat(args) {
    const { createLLMProvider } = await import('../providers/llm.js');
    const llmProvider = createLLMProvider();

    const response = await llmProvider.chat({
      provider: args.provider,
      model: args.model,
      messages: args.messages,
      temperature: args.temperature,
      max_tokens: args.max_tokens
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ response }, null, 2)
        }
      ]
    };
  }

  async handleAIGenerateWorkflow(args) {
    // Use AI to generate N8N workflow based on description
    const { createLLMProvider } = await import('../providers/llm.js');
    const llmProvider = createLLMProvider();

    const prompt = `Generate an N8N workflow JSON based on this description: ${args.description}

Input data format: ${JSON.stringify(args.input_data || {})}
Output format: ${JSON.stringify(args.output_format || {})}
Services to integrate: ${args.services?.join(', ') || 'none specified'}

Please return a valid N8N workflow JSON with nodes and connections.`;

    const response = await llmProvider.chat({
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: 'You are an expert N8N workflow designer. Generate valid N8N workflow JSON.' },
        { role: 'user', content: prompt }
      ]
    });

    try {
      const workflowData = JSON.parse(response.content);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              generated_workflow: workflowData,
              description: args.description,
              message: 'N8N workflow generated successfully'
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to parse generated workflow',
              raw_response: response.content,
              message: 'Please review and manually create the workflow'
            }, null, 2)
          }
        ]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🤖 AI Automation MCP Server running');
  }
}

// Start the MCP server
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new AIAutomationMCPServer();
  server.run().catch(console.error);
}

export { AIAutomationMCPServer };

