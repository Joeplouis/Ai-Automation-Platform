# AI Automation Platform

A comprehensive, secure AI automation platform that provides complete control over your VPS infrastructure through your own Model Context Protocol (MCP) server. Built specifically to avoid third-party MCP servers that might inject malicious code.

## 🎯 Overview

This platform gives you an internet-accessible AI agent that can:

- **🖥️ VPS Management**: Deploy and manage entire server stacks (Mailcow, N8N, WordPress, Postiz, Ollama)
- **🔄 N8N Workflows**: Create, execute, and manage automation workflows
- **🌐 WordPress Automation**: Build websites, create content, manage multiple sites
- **📱 Social Media**: Automate posting across all platforms via Postiz
- **💰 Affiliate Marketing**: Manage networks, find products, create campaigns
- **🤖 AI Integration**: Chat with multiple LLM providers (OpenRouter, Ollama, etc.)
- **🔒 Secure MCP Server**: Your own Model Context Protocol server for safe AI interactions

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Automation Platform                    │
├─────────────────────────────────────────────────────────────┤
│                     MCP Server                              │
│              (Model Context Protocol)                       │
├─────────────────────────────────────────────────────────────┤
│  VPS Manager  │  N8N Manager  │  WordPress  │  Postiz      │
│               │               │  Manager    │  Manager     │
├─────────────────────────────────────────────────────────────┤
│           Affiliate Manager   │   Task Engine              │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database  │  Redis Cache  │  Crypto Utils      │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Ubuntu 22.04+ VPS with root access
- Domain name pointing to your VPS
- PostgreSQL 15+
- Node.js 18+
- Docker & Docker Compose

### 1. Clone and Setup

```bash
git clone https://github.com/yourusername/ai-automation-platform.git
cd ai-automation-platform

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file with your settings:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_automation
POSTGRES_URL=postgresql://user:password@localhost:5432/ai_automation

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key

# Domain Configuration
MAIN_DOMAIN=yourdomain.com
API_DOMAIN=api.yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# LLM Providers
OPENAI_API_KEY=your-openai-key
OPENROUTER_API_KEY=your-openrouter-key
ANTHROPIC_API_KEY=your-anthropic-key

# Server Configuration
NODE_ENV=production
PORT=8080
```

### 3. Database Setup

```bash
# Create database
createdb ai_automation

# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

### 4. Deploy Full Stack to VPS

The platform includes automated deployment scripts for your entire infrastructure:

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Deploy full stack (Mailcow, N8N, WordPress, Postiz, Ollama)
sudo ./scripts/install_full_stack_bookaistudio.sh

# Or deploy individual components
sudo ./scripts/10_mailcow_install.sh
sudo ./scripts/30_n8n_install.sh
sudo ./scripts/wordpress_install.sh
```

### 5. Start the Platform

```bash
# Development
npm run dev

# Production
npm start

# With PM2 (recommended for production)
npm install -g pm2
pm2 start src/core/server.js --name "ai-automation-platform"
```

### 6. Start MCP Server

```bash
# Start the MCP server for AI agent communication
node src/core/mcp-server.js
```

## 🔧 Configuration

### VPS Deployment Scripts

The platform includes sophisticated deployment scripts that automatically install and configure:

#### Full Stack Deployment (`install_full_stack_bookaistudio.sh`)

- **NGINX + Certbot**: Reverse proxy with automatic SSL certificates
- **PostgreSQL**: Database for N8N and platform data
- **N8N**: Workflow automation with secure authentication
- **WordPress**: Multi-site setup with Docker
- **Ollama**: Local AI model server
- **Mailcow**: Complete email server solution
- **Postiz**: Social media automation platform

#### Individual Component Scripts

- `01_prep.sh` - System preparation and basic packages
- `10_mailcow_install.sh` - Email server setup
- `20_mautic_install.sh` - Marketing automation
- `30_n8n_install.sh` - Workflow automation
- `40_nginx_sites.sh` - Web server configuration
- `45_certbot_certs.sh` - SSL certificate setup

### Domain Configuration

Set up DNS records for your domain:

```
A    api.yourdomain.com     -> YOUR_VPS_IP
A    n8n.yourdomain.com     -> YOUR_VPS_IP
A    mail.yourdomain.com    -> YOUR_VPS_IP
A    postiz.yourdomain.com  -> YOUR_VPS_IP
A    ai.yourdomain.com      -> YOUR_VPS_IP
```

## 🛠️ MCP Server Tools

The MCP server provides 25+ tools for complete automation:

### VPS Management
- `vps_list_servers` - List all VPS servers
- `vps_create_server` - Add new server to management
- `vps_deploy_stack` - Deploy full infrastructure stack
- `vps_get_status` - Get server status and monitoring
- `vps_execute_command` - Run commands via SSH

### N8N Workflow Management
- `n8n_list_instances` - List N8N instances
- `n8n_create_workflow` - Create new workflows
- `n8n_execute_workflow` - Run workflows
- `n8n_sync_workflows` - Sync from N8N instances

### WordPress Management
- `wp_list_sites` - List WordPress sites
- `wp_create_site` - Create new WordPress site
- `wp_create_post` - Create posts and pages

### Social Media Automation
- `social_list_accounts` - List social accounts
- `social_create_post` - Create social media posts
- `social_schedule_post` - Schedule posts

### Affiliate Marketing
- `affiliate_list_networks` - List affiliate networks
- `affiliate_search_products` - Find affiliate products
- `affiliate_create_campaign` - Create marketing campaigns

### System Management
- `system_get_metrics` - Get platform metrics
- `system_backup_data` - Create backups
- `system_deploy_updates` - Deploy updates

### AI Integration
- `ai_chat` - Chat with various LLM providers
- `ai_generate_workflow` - Generate N8N workflows with AI

## 📊 Database Schema

The platform uses PostgreSQL with the following main tables:

### Core Tables
- `users` - User accounts and authentication
- `credentials` - Encrypted API keys and secrets
- `chat_logs` - AI conversation history
- `rate_limits` - API rate limiting data

### VPS Management
- `vps_servers` - Server configurations
- `vps_monitoring` - Server monitoring data
- `task_executions` - Deployment and task logs

### N8N Integration
- `n8n_instances` - N8N server instances
- `n8n_workflows` - Workflow definitions
- `n8n_executions` - Workflow execution logs

### WordPress Management
- `wordpress_sites` - WordPress site configurations
- `wordpress_content` - Content creation logs

### Social Media
- `social_accounts` - Social media account configs
- `social_posts` - Post creation and scheduling

### Affiliate Marketing
- `affiliate_networks` - Affiliate network configs
- `affiliate_products` - Product catalog
- `affiliate_campaigns` - Marketing campaigns
- `affiliate_clicks` - Click tracking and analytics

## 🔐 Security Features

### Encryption
- All API keys and sensitive data encrypted with AES-256-GCM
- Unique encryption keys per credential
- Secure key derivation using PBKDF2

### Authentication
- JWT-based authentication with configurable expiration
- Role-based access control (admin/user)
- Rate limiting on all endpoints

### Network Security
- HTTPS-only communication
- CORS protection
- Security headers (HSTS, CSP, etc.)
- SSH key-based server access

### MCP Server Security
- Isolated execution environment
- No third-party MCP dependencies
- Secure credential handling
- Audit logging for all operations

## 🚦 API Endpoints

### Authentication
```
POST /auth/login          - User login
POST /auth/register       - User registration
```

### Credentials Management
```
GET    /api/credentials           - List credentials
POST   /api/credentials           - Create credential
DELETE /api/credentials/:id       - Delete credential
```

### VPS Management
```
GET  /api/vps/servers             - List servers
POST /api/vps/servers             - Create server
GET  /api/vps/servers/:id/status  - Get server status
POST /api/vps/servers/:id/deploy  - Deploy to server
```

### N8N Management
```
GET  /api/n8n/instances           - List N8N instances
POST /api/n8n/instances           - Create instance
GET  /api/n8n/workflows           - List workflows
POST /api/n8n/workflows           - Create workflow
POST /api/n8n/workflows/:id/execute - Execute workflow
```

### WordPress Management
```
GET  /api/wordpress/sites         - List WordPress sites
POST /api/wordpress/sites         - Create site
POST /api/wordpress/sites/:id/content - Create content
```

### Social Media
```
GET  /api/social/accounts         - List social accounts
POST /api/social/accounts         - Create account
POST /api/social/posts            - Create post
POST /api/social/posts/:id/schedule - Schedule post
```

### Affiliate Marketing
```
GET  /api/affiliate/networks      - List affiliate networks
POST /api/affiliate/networks      - Create network
GET  /api/affiliate/products      - Search products
POST /api/affiliate/campaigns     - Create campaign
```

### AI Chat
```
POST /api/chat                    - Chat with AI (streaming)
```

### Metrics
```
GET /api/metrics/overview         - Platform overview
GET /api/metrics/chat             - Chat metrics
GET /api/metrics/tasks            - Task metrics
```

## 🔄 Workflow Examples

### Example 1: Automated Content Creation

```javascript
// N8N workflow that:
// 1. Finds trending affiliate products
// 2. Generates blog post with AI
// 3. Creates WordPress post
// 4. Schedules social media posts
// 5. Tracks performance

const workflow = {
  "nodes": [
    {
      "name": "Find Products",
      "type": "affiliate_search_products",
      "parameters": {
        "category": "tech",
        "min_commission": 10
      }
    },
    {
      "name": "Generate Content",
      "type": "ai_chat",
      "parameters": {
        "provider": "openrouter",
        "model": "anthropic/claude-3.5-sonnet",
        "prompt": "Write a blog post about {{$node['Find Products'].json.products[0].name}}"
      }
    },
    {
      "name": "Create WordPress Post",
      "type": "wp_create_post",
      "parameters": {
        "title": "{{$node['Generate Content'].json.title}}",
        "content": "{{$node['Generate Content'].json.content}}",
        "status": "published"
      }
    },
    {
      "name": "Schedule Social Posts",
      "type": "social_create_post",
      "parameters": {
        "content": "{{$node['Generate Content'].json.summary}}",
        "platforms": ["twitter", "linkedin", "facebook"],
        "scheduled_for": "{{DateTime.now().plus({hours: 1}).toISO()}}"
      }
    }
  ]
}
```

### Example 2: VPS Monitoring and Auto-scaling

```javascript
// Workflow that monitors VPS resources and deploys new instances
const monitoringWorkflow = {
  "nodes": [
    {
      "name": "Check Server Status",
      "type": "vps_get_status",
      "parameters": {
        "server_id": "{{$json.server_id}}"
      }
    },
    {
      "name": "Evaluate Resources",
      "type": "code",
      "parameters": {
        "jsCode": `
          const status = $node['Check Server Status'].json;
          if (status.monitoring.cpu_usage > 80 || status.monitoring.memory_usage > 85) {
            return { scale_up: true, reason: 'High resource usage' };
          }
          return { scale_up: false };
        `
      }
    },
    {
      "name": "Deploy New Instance",
      "type": "vps_deploy_stack",
      "parameters": {
        "stack_type": "bookaistudio",
        "domain": "{{$json.new_domain}}",
        "environment": {
          "LOAD_BALANCER": "true"
        }
      }
    }
  ]
}
```

## 📈 Monitoring and Analytics

### Platform Metrics
- Server uptime and performance
- API request rates and latency
- Database query performance
- Error rates and alerts

### Business Metrics
- Content creation volume
- Social media engagement
- Affiliate campaign performance
- Revenue tracking

### Custom Dashboards
Access metrics via API or build custom dashboards:

```javascript
// Get platform overview
const overview = await fetch('/api/metrics/overview');

// Get specific metrics
const chatMetrics = await fetch('/api/metrics/chat?timeframe=7d');
const taskMetrics = await fetch('/api/metrics/tasks?timeframe=30d');
```

## 🔧 Customization

### Adding New LLM Providers

```javascript
// src/providers/llm.js
export function createLLMProvider() {
  return {
    async chat(params) {
      switch (params.provider) {
        case 'your_provider':
          return await this.callYourProvider(params);
        // ... other providers
      }
    },
    
    async callYourProvider(params) {
      // Your provider implementation
    }
  };
}
```

### Custom MCP Tools

```javascript
// Add to src/core/mcp-server.js
{
  name: 'custom_tool',
  description: 'Your custom automation tool',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string' },
      param2: { type: 'number' }
    },
    required: ['param1']
  }
}

// Handler
async handleCustomTool(args) {
  // Your custom logic
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ result: 'success' }, null, 2)
      }
    ]
  };
}
```

### Custom Deployment Scripts

Create your own deployment scripts in the `scripts/` directory:

```bash
#!/bin/bash
# scripts/custom_stack.sh

# Your custom deployment logic
echo "Deploying custom stack..."

# Install your services
docker-compose -f custom-stack.yml up -d

# Configure NGINX
cp custom-nginx.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/custom-nginx.conf /etc/nginx/sites-enabled/

# Restart services
systemctl restart nginx
```

## 🐛 Troubleshooting

### Common Issues

#### MCP Server Connection Issues
```bash
# Check if MCP server is running
ps aux | grep mcp-server

# Check logs
tail -f logs/mcp-server.log

# Restart MCP server
pkill -f mcp-server
node src/core/mcp-server.js
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
systemctl status postgresql

# Test connection
psql -h localhost -U your_user -d ai_automation

# Check logs
tail -f /var/log/postgresql/postgresql-15-main.log
```

#### VPS Deployment Failures
```bash
# Check deployment logs
tail -f /var/log/deployment.log

# Test SSH connection
ssh -i ~/.ssh/your_key user@your_vps_ip

# Check service status
systemctl status nginx n8n mailcow
```

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
DEBUG=ai-automation:*
LOG_LEVEL=debug
```

### Health Checks

```bash
# Platform health
curl http://localhost:8080/health

# Database health
curl http://localhost:8080/api/health/database

# Services health
curl http://localhost:8080/api/health/services
```

## 📚 Additional Resources

### Documentation
- [API Reference](docs/api-reference.md)
- [MCP Tools Guide](docs/mcp-tools.md)
- [Deployment Guide](docs/deployment.md)
- [Security Best Practices](docs/security.md)

### Examples
- [Workflow Templates](examples/workflows/)
- [Deployment Configurations](examples/deployments/)
- [Custom Tools](examples/custom-tools/)

### Community
- [GitHub Issues](https://github.com/yourusername/ai-automation-platform/issues)
- [Discussions](https://github.com/yourusername/ai-automation-platform/discussions)
- [Discord Server](https://discord.gg/your-server)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/ai-automation-platform.git
cd ai-automation-platform

# Install dependencies
npm install

# Set up development database
createdb ai_automation_dev
npm run migrate:dev

# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [N8N](https://n8n.io/) - Workflow automation platform
- [Postiz](https://postiz.com/) - Social media management
- [Mailcow](https://mailcow.email/) - Email server solution
- [Model Context Protocol](https://modelcontextprotocol.io/) - AI agent communication standard

---

**Built with ❤️ for secure, self-hosted AI automation**

