# AI Automation Platform - API Documentation

## Overview

The AI Automation Platform provides a comprehensive REST API for managing automation workflows, integrations, and system operations. The API is designed to work seamlessly with your existing BookAI Studio infrastructure.

## Base URLs

- **Production**: `https://api.bookaistudio.com`
- **MCP Server**: `https://mcp.bookaistudio.com`
- **Dashboard**: `https://dashboard.bookaistudio.com`

## Authentication

### API Key Authentication

All API requests require authentication using an API key in the header:

```http
Authorization: Bearer your_api_key_here
Content-Type: application/json
```

### Getting an API Key

1. Log in to the dashboard at `https://dashboard.bookaistudio.com`
2. Navigate to Settings > API Keys
3. Click "Generate New API Key"
4. Copy and securely store your API key

## Rate Limiting

- **Standard**: 1000 requests per hour
- **Premium**: 10000 requests per hour
- **Enterprise**: Unlimited

Rate limit headers are included in all responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

## Core Endpoints

### Health Check

Check the API status and system health.

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 86400,
    "services": {
      "database": "connected",
      "redis": "connected",
      "ollama": "connected"
    }
  }
}
```

### System Information

Get detailed system information and metrics.

```http
GET /system/info
```

**Response:**
```json
{
  "success": true,
  "data": {
    "platform": "AI Automation Platform",
    "version": "1.0.0",
    "environment": "production",
    "services": {
      "vps": "active",
      "n8n": "active",
      "wordpress": "active",
      "postiz": "active",
      "affiliate": "active"
    },
    "metrics": {
      "activeWorkflows": 25,
      "totalAutomations": 150,
      "monthlyRevenue": 45000
    }
  }
}
```

## LLM Provider Management

### List LLM Providers

Get all configured LLM providers.

```http
GET /llm/providers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ollama",
      "name": "Ollama Local",
      "type": "ollama",
      "status": "active",
      "models": ["llama3.1:8b", "codellama:7b"],
      "isDefault": true
    },
    {
      "id": "openai",
      "name": "OpenAI",
      "type": "openai",
      "status": "active",
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "isDefault": false
    }
  ]
}
```

### Add LLM Provider

Configure a new LLM provider.

```http
POST /llm/providers
```

**Request Body:**
```json
{
  "name": "Anthropic Claude",
  "type": "anthropic",
  "apiKey": "your_anthropic_api_key",
  "baseUrl": "https://api.anthropic.com",
  "models": ["claude-3-opus", "claude-3-sonnet"],
  "isDefault": false
}
```

### Update LLM Provider

Update an existing LLM provider configuration.

```http
PUT /llm/providers/{providerId}
```

### Delete LLM Provider

Remove an LLM provider.

```http
DELETE /llm/providers/{providerId}
```

### Chat Completion

Generate text using the configured LLM providers.

```http
POST /llm/chat
```

**Request Body:**
```json
{
  "provider": "ollama",
  "model": "llama3.1:8b",
  "messages": [
    {
      "role": "user",
      "content": "Create a marketing strategy for affiliate products"
    }
  ],
  "temperature": 0.7,
  "maxTokens": 1000
}
```

## VPS Management

### List VPS Instances

Get all managed VPS instances.

```http
GET /vps/instances
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "vps_main",
      "name": "BookAI Studio Main",
      "ip": "168.231.74.188",
      "status": "running",
      "services": {
        "nginx": "active",
        "postgresql": "active",
        "redis": "active",
        "ollama": "active"
      },
      "metrics": {
        "cpu": 45.2,
        "memory": 68.5,
        "disk": 34.1
      }
    }
  ]
}
```

### Deploy Service

Deploy a new service to a VPS instance.

```http
POST /vps/{instanceId}/deploy
```

**Request Body:**
```json
{
  "service": "n8n",
  "version": "latest",
  "config": {
    "domain": "n8n.bookaistudio.com",
    "port": 5678,
    "ssl": true
  }
}
```

### Execute Command

Execute a command on a VPS instance.

```http
POST /vps/{instanceId}/execute
```

**Request Body:**
```json
{
  "command": "systemctl status nginx",
  "sudo": true
}
```

## N8N Workflow Management

### List Workflows

Get all N8N workflows.

```http
GET /n8n/workflows
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "workflow_123",
      "name": "Social Media Content Creation",
      "status": "active",
      "lastExecution": "2024-01-15T10:00:00Z",
      "successRate": 98.5,
      "totalExecutions": 1250
    }
  ]
}
```

### Create Workflow

Create a new N8N workflow.

```http
POST /n8n/workflows
```

**Request Body:**
```json
{
  "name": "Affiliate Product Research",
  "description": "Automated affiliate product research and analysis",
  "nodes": [
    {
      "type": "trigger",
      "name": "Schedule Trigger",
      "config": {
        "cron": "0 9 * * *"
      }
    },
    {
      "type": "http",
      "name": "Fetch Products",
      "config": {
        "url": "https://api.affiliate-network.com/products",
        "method": "GET"
      }
    }
  ]
}
```

### Execute Workflow

Manually execute a workflow.

```http
POST /n8n/workflows/{workflowId}/execute
```

**Request Body:**
```json
{
  "inputData": {
    "niche": "health supplements",
    "minCommission": 15
  }
}
```

### Get Workflow Execution History

Get execution history for a workflow.

```http
GET /n8n/workflows/{workflowId}/executions
```

## WordPress Management

### List WordPress Sites

Get all managed WordPress sites.

```http
GET /wordpress/sites
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "site_main",
      "name": "BookAI Studio Blog",
      "url": "https://wrp.bookaistudio.com",
      "status": "active",
      "version": "6.4.2",
      "posts": 145,
      "pages": 12
    }
  ]
}
```

### Create Post

Create a new WordPress post.

```http
POST /wordpress/sites/{siteId}/posts
```

**Request Body:**
```json
{
  "title": "Best AI Tools for Content Creation in 2024",
  "content": "<p>Discover the top AI tools...</p>",
  "status": "draft",
  "categories": ["AI Tools", "Content Creation"],
  "tags": ["AI", "automation", "content"],
  "featuredImage": "https://example.com/image.jpg",
  "seo": {
    "metaTitle": "Best AI Tools for Content Creation",
    "metaDescription": "Comprehensive guide to AI content creation tools",
    "focusKeyword": "AI content creation tools"
  }
}
```

### Update Post

Update an existing WordPress post.

```http
PUT /wordpress/sites/{siteId}/posts/{postId}
```

### Delete Post

Delete a WordPress post.

```http
DELETE /wordpress/sites/{siteId}/posts/{postId}
```

### Install Plugin

Install a WordPress plugin.

```http
POST /wordpress/sites/{siteId}/plugins
```

**Request Body:**
```json
{
  "plugin": "yoast-seo",
  "version": "latest",
  "activate": true
}
```

## Social Media (Postiz) Management

### List Social Accounts

Get all connected social media accounts.

```http
GET /postiz/accounts
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "twitter_main",
      "platform": "twitter",
      "username": "@bookaistudio",
      "status": "connected",
      "followers": 15420,
      "lastPost": "2024-01-15T08:30:00Z"
    },
    {
      "id": "instagram_main",
      "platform": "instagram",
      "username": "bookaistudio",
      "status": "connected",
      "followers": 8750,
      "lastPost": "2024-01-15T07:15:00Z"
    }
  ]
}
```

### Create Social Post

Create and schedule a social media post.

```http
POST /postiz/posts
```

**Request Body:**
```json
{
  "content": "Discover how AI automation can transform your business! 🚀 #AI #Automation #Business",
  "platforms": ["twitter", "instagram", "linkedin"],
  "scheduledFor": "2024-01-16T10:00:00Z",
  "media": [
    {
      "type": "image",
      "url": "https://example.com/image.jpg",
      "alt": "AI automation infographic"
    }
  ]
}
```

### Get Post Analytics

Get analytics for social media posts.

```http
GET /postiz/posts/{postId}/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "postId": "post_123",
    "platforms": {
      "twitter": {
        "views": 5420,
        "likes": 234,
        "retweets": 45,
        "replies": 12
      },
      "instagram": {
        "views": 3210,
        "likes": 187,
        "shares": 23,
        "comments": 8
      }
    },
    "totalEngagement": 509,
    "engagementRate": 5.8
  }
}
```

## Affiliate Marketing

### List Affiliate Networks

Get all configured affiliate networks.

```http
GET /affiliate/networks
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "amazon",
      "name": "Amazon Associates",
      "status": "connected",
      "commissionRate": "1-10%",
      "products": 1250,
      "monthlyEarnings": 2340.50
    },
    {
      "id": "clickbank",
      "name": "ClickBank",
      "status": "connected",
      "commissionRate": "10-75%",
      "products": 450,
      "monthlyEarnings": 5670.25
    }
  ]
}
```

### Research Products

Research affiliate products based on criteria.

```http
POST /affiliate/research
```

**Request Body:**
```json
{
  "niche": "health supplements",
  "minCommission": 15,
  "maxPrice": 200,
  "minRating": 4.0,
  "networks": ["amazon", "clickbank"],
  "limit": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "product_123",
      "title": "Premium Omega-3 Fish Oil",
      "price": 49.99,
      "commissionRate": 25,
      "rating": 4.7,
      "reviewCount": 1250,
      "network": "amazon",
      "affiliateUrl": "https://amazon.com/dp/PRODUCT123?tag=yourtag-20",
      "category": "health supplements"
    }
  ]
}
```

### Create Campaign

Create a new affiliate marketing campaign.

```http
POST /affiliate/campaigns
```

**Request Body:**
```json
{
  "name": "Health Supplements Q1 2024",
  "description": "Promoting top health supplements",
  "products": ["product_123", "product_456"],
  "channels": ["blog", "social", "email"],
  "budget": 5000,
  "startDate": "2024-01-01",
  "endDate": "2024-03-31"
}
```

### Track Commission

Record a commission transaction.

```http
POST /affiliate/commissions
```

**Request Body:**
```json
{
  "campaignId": "campaign_123",
  "productId": "product_123",
  "network": "amazon",
  "orderId": "order_789",
  "amount": 49.99,
  "commissionRate": 25,
  "status": "confirmed"
}
```

## Workflow Engine

### Create Workflow

Create a custom automation workflow.

```http
POST /workflows
```

**Request Body:**
```json
{
  "name": "Content Creation Pipeline",
  "description": "Automated content creation and distribution",
  "tasks": [
    {
      "id": "research",
      "type": "affiliate_research",
      "name": "Research Products",
      "config": {
        "niche": "${niche}",
        "limit": 10
      }
    },
    {
      "id": "content",
      "type": "content_generation",
      "name": "Generate Content",
      "dependsOn": ["research"],
      "config": {
        "template": "product_review",
        "products": "${research.results}"
      }
    },
    {
      "id": "publish",
      "type": "wordpress_publish",
      "name": "Publish to WordPress",
      "dependsOn": ["content"],
      "config": {
        "siteId": "site_main",
        "content": "${content.result}"
      }
    }
  ],
  "variables": {
    "niche": "health supplements"
  }
}
```

### Execute Workflow

Execute a workflow with input data.

```http
POST /workflows/{workflowId}/execute
```

**Request Body:**
```json
{
  "inputData": {
    "niche": "fitness equipment",
    "targetAudience": "fitness enthusiasts"
  }
}
```

### Get Workflow Status

Get the current status of a workflow execution.

```http
GET /workflows/{workflowId}/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflowId": "workflow_123",
    "status": "running",
    "currentTask": "content",
    "progress": 60,
    "startTime": "2024-01-15T10:00:00Z",
    "estimatedCompletion": "2024-01-15T10:15:00Z",
    "completedTasks": ["research"],
    "failedTasks": []
  }
}
```

## Analytics and Reporting

### Get Dashboard Metrics

Get comprehensive dashboard metrics.

```http
GET /analytics/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "revenue": {
      "total": 125000,
      "monthly": 15000,
      "growth": 12.5
    },
    "content": {
      "postsCreated": 45,
      "videosGenerated": 23,
      "socialPosts": 156
    },
    "automation": {
      "activeWorkflows": 25,
      "totalExecutions": 1250,
      "successRate": 98.2
    },
    "affiliate": {
      "totalCommissions": 8500,
      "activeProducts": 150,
      "conversionRate": 3.2
    }
  }
}
```

### Get Revenue Report

Get detailed revenue analytics.

```http
GET /analytics/revenue
```

**Query Parameters:**
- `period`: `7days`, `30days`, `90days`, `1year`
- `breakdown`: `daily`, `weekly`, `monthly`

### Get Performance Metrics

Get system performance metrics.

```http
GET /analytics/performance
```

## Webhooks

### Register Webhook

Register a webhook endpoint for event notifications.

```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["workflow.completed", "commission.earned", "post.published"],
  "secret": "your_webhook_secret"
}
```

### Webhook Events

Available webhook events:

- `workflow.started`
- `workflow.completed`
- `workflow.failed`
- `post.published`
- `social.posted`
- `commission.earned`
- `product.researched`
- `campaign.created`

### Webhook Payload Example

```json
{
  "event": "workflow.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "workflowId": "workflow_123",
    "name": "Content Creation Pipeline",
    "duration": 450000,
    "results": {
      "postsCreated": 3,
      "socialPostsScheduled": 9
    }
  },
  "signature": "sha256=..."
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `AUTHENTICATION_FAILED` | Invalid or missing API key |
| `AUTHORIZATION_FAILED` | Insufficient permissions |
| `VALIDATION_ERROR` | Invalid request parameters |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `SERVICE_UNAVAILABLE` | External service unavailable |
| `INTERNAL_ERROR` | Internal server error |
| `WORKFLOW_FAILED` | Workflow execution failed |
| `INTEGRATION_ERROR` | Third-party integration error |

## SDKs and Libraries

### JavaScript/Node.js

```bash
npm install @bookaistudio/ai-automation-sdk
```

```javascript
const { AIAutomationClient } = require('@bookaistudio/ai-automation-sdk');

const client = new AIAutomationClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.bookaistudio.com'
});

// Create a workflow
const workflow = await client.workflows.create({
  name: 'My Automation',
  tasks: [...]
});

// Execute workflow
const execution = await client.workflows.execute(workflow.id, {
  inputData: { niche: 'technology' }
});
```

### Python

```bash
pip install bookaistudio-ai-automation
```

```python
from bookaistudio import AIAutomationClient

client = AIAutomationClient(
    api_key='your_api_key',
    base_url='https://api.bookaistudio.com'
)

# Research affiliate products
products = client.affiliate.research({
    'niche': 'health supplements',
    'min_commission': 15,
    'limit': 50
})

# Create social media post
post = client.postiz.create_post({
    'content': 'Check out these amazing products!',
    'platforms': ['twitter', 'instagram'],
    'scheduled_for': '2024-01-16T10:00:00Z'
})
```

## Postman C
(Content truncated due to size limit. Use page ranges or line ranges to read remaining content)