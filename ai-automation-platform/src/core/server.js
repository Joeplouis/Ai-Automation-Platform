// AI Gateway Server
// Main Express server with multi-provider LLM support

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient as createRedis } from 'redis';
import { logger, httpLogger } from './logger.js';
import { loadConfig } from './config.js';
import { encryptSecret, decryptSecret } from './crypto.js';
import { makeRateLimiter } from './rateLimit.js';
import { listModels as listOR, streamChat as streamOR } from './providers/openrouter.js';
import { listModels as listOllama, streamChat as streamOllama } from './providers/ollama.js';
import { createAgentOrchestrator } from '../ai/agent-orchestrator.js';

// Load configuration
const cfg = loadConfig();

// Initialize Express app
const app = express();

// Database connection
const pool = new Pool({
  connectionString: cfg.databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Redis connection (optional)
let redis = null;
if (cfg.redisUrl) {
  try {
    redis = createRedis({ url: cfg.redisUrl });
    await redis.connect();
    logger.info('Redis connected');
  } catch (error) {
    logger.warn('Redis connection failed, continuing without cache');
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(httpLogger());

// Initialize orchestrator
const orchestrator = createAgentOrchestrator();

// Authentication middleware
function requireAdminToken(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_KMS_KEY) {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
  next();
}

async function authenticateChat(req, res, next) {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) token = req.headers['x-chat-token'] || req.query.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Auth routes
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // For demo purposes - in production, query database
    const validUser = { email: 'admin@bookaistudio.com', password: 'admin123' };
    
    if (email === validUser.email && password === validUser.password) {
      const token = jwt.sign(
        { email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h', issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE }
      );
      
      res.json({ 
        token, 
        user: { email, role: 'admin' }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    logger.error(error, 'Login error');
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/auth/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Dev-only quick login endpoint (GET for browser convenience)
app.get('/auth/dev-quick-login', async (req, res) => {
  if (process.env.DEV_ENABLE_QUICK_LOGIN !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  try {
    const token = jwt.sign(
      { email: 'dev@example.com', role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h', issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE }
    );
    
    // For GET requests, redirect to dashboard with token in URL (for convenience)
    res.redirect(`/dashboard?token=${token}`);
  } catch (e) {
    logger.error(e, 'Quick login error');
    res.status(500).json({ error: 'Login failed' });
  }
});

// Dev-only quick login endpoint (POST for API)
app.post('/auth/dev-quick-login', async (req, res) => {
  if (process.env.DEV_ENABLE_QUICK_LOGIN !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  try {
    const token = jwt.sign(
      { email: 'dev@example.com', role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h', issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE }
    );
    
    res.json({ 
      token, 
      user: { email: 'dev@example.com', role: 'user' }
    });
  } catch (error) {
    logger.error(error, 'Dev quick login error');
    res.status(500).json({ error: 'Quick login failed' });
  }
});

app.get('/chat/login', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookAI Studio - Chat Login</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh; display: flex; align-items: center; justify-content: center;
        }
        
        .login-container { 
            background: rgba(255,255,255,0.95); backdrop-filter: blur(20px);
            padding: 40px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            width: 100%; max-width: 400px; text-align: center;
        }
        
        .logo { font-size: 48px; margin-bottom: 10px; }
        h1 { color: #2c3e50; margin-bottom: 10px; font-size: 28px; font-weight: 700; }
        .subtitle { color: #7f8c8d; margin-bottom: 30px; font-size: 16px; }
        
        .form-group { margin-bottom: 20px; text-align: left; }
        label { display: block; margin-bottom: 8px; color: #2c3e50; font-weight: 500; }
        input { 
            width: 100%; padding: 12px 16px; border: 2px solid #e1e8ed;
            border-radius: 10px; font-size: 16px; transition: all 0.2s;
            background: white;
        }
        input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
        
        .login-btn { 
            width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600;
            cursor: pointer; transition: all 0.2s; margin-top: 10px;
        }
        .login-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(102,126,234,0.3); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        
        .error { 
            background: #ff6b6b; color: white; padding: 12px; border-radius: 8px;
            margin-bottom: 20px; font-size: 14px; display: none;
        }
        
        .dashboard-link { 
            margin-top: 20px; padding-top: 20px; border-top: 1px solid #e1e8ed;
        }
        .dashboard-link a { 
            color: #667eea; text-decoration: none; font-weight: 500;
        }
        .dashboard-link a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">🤖</div>
        <h1>Chat Login</h1>
        <p class="subtitle">Sign in to access AI Chat</p>
        
        <div class="error" id="error"></div>
        
        <form onsubmit="login(event)">
            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" required>
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" required>
            </div>
            
            <button type="submit" class="login-btn" id="loginBtn">
                Sign In to Chat
            </button>

            <button type="button" class="login-btn" style="margin-top:10px;background:#10b981"
                    onclick="quickDevChat()">Quick Dev Login</button>
        </form>
        
        <div class="dashboard-link"> 
            <a href="/dashboard">← Back to Dashboard</a>
        </div>
    </div>

    <script>
        async function login(event) {
            event.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');
            const loginBtn = document.getElementById('loginBtn');
            
            errorDiv.style.display = 'none';
            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing In...';
            
            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store token
                    localStorage.setItem('chatToken', data.token);
                    localStorage.setItem('chatUser', JSON.stringify(data.user));
                    
                    // Redirect to chat
                    window.location.href = '/chat';
                } else {
                    errorDiv.textContent = data.error || 'Login failed';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = 'Connection error. Please try again.';
                errorDiv.style.display = 'block';
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In to Chat';
            }
        }

        // DEV ONLY: Mint a chat token without credentials (requires DEV_ENABLE_QUICK_LOGIN=true)
        async function quickDevChat() {
            try {
                const res = await fetch('/auth/dev-quick-login', { method: 'POST' });
                const data = await res.json();
                if (!data.token) throw new Error(data.error || 'Quick login disabled');
                localStorage.setItem('chatToken', data.token);
                localStorage.setItem('chatUser', JSON.stringify(data.user || { email: 'dev@example.com' }));
                window.location.href = '/chat';
            } catch (e) {
                alert('Quick Dev Login failed: ' + (e.message || e));
            }
        }
        
        // Auto-focus email field
        document.getElementById('email').focus();
    </script>
</body>
</html>`;
  res.send(html);
});

// Provider Keys Management
app.post('/admin/provider-keys', requireAdminToken, async (req, res) => {
  try {
    const { provider, name, secret } = req.body || {};
    
    if (!provider || !name || !secret) {
      return res.status(400).json({ error: 'provider, name, and secret are required' });
    }
    
    const { ciphertext, iv, tag } = encryptSecret(secret, process.env.ADMIN_KMS_KEY);
    
    const query = `
      INSERT INTO provider_keys (provider, name, enc_key, enc_iv, enc_tag)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, provider, name, created_at
    `;
    const { rows } = await pool.query(query, [provider, name, ciphertext, iv, tag]);
    return res.json({ key: rows[0] });

    } catch (error) {
        logger.error(error, 'Provider key insert failed');
        return res.status(500).json({ error: 'Failed to store provider key' });
    }
});

// Legacy chat login path redirect (cleanup of earlier duplication)
app.get('/chat-login', (req, res) => res.redirect(301, '/chat/login'));

app.post('/admin/orchestrator/route-test', requireAdminToken, async (req, res) => {
    try {
        const task = req.body || {};
        if (!task.type) return res.status(400).json({ error: 'task.type required' });
        const result = await orchestrator.routeTask(task);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Model catalog
app.get('/models', async (req, res) => {
  const models = [];
  
  // OpenRouter models
  try {
    if (process.env.OPENROUTER_API_KEY) {
      const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
      const orModels = await listOR(baseUrl, process.env.OPENROUTER_API_KEY);
      models.push(...orModels);
    }
  } catch (error) {
    models.push({
      provider: 'openrouter',
      model: 'error',
      status: 'offline',
      description: error.message,
      context_length: null
    });
  }
  
  // Ollama models
  try {
    if (process.env.OLLAMA_BASE_URL) {
      const ollamaModels = await listOllama(process.env.OLLAMA_BASE_URL);
      models.push(...ollamaModels);
    }
  } catch (error) {
    models.push({
      provider: 'ollama',
      model: 'error',
      status: 'offline',
      description: error.message,
      context_length: null
    });
  }
  
  res.json(models);
});

// (Duplicate authenticateChat removed above; single definition kept earlier)

// Rate limiting middleware
const rateLimiter = await makeRateLimiter(pool, redis);
app.use(rateLimiter);

// Dashboard API endpoints
app.get('/api/dashboard/analytics', async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    
    // Mock dashboard data - replace with real database queries
    const dashboardData = {
      overview: {
        totalRevenue: Math.floor(Math.random() * 100000) + 50000,
        totalCosts: Math.floor(Math.random() * 30000) + 15000,
        netProfit: Math.floor(Math.random() * 70000) + 35000,
        roi: Math.floor(Math.random() * 400) + 200,
        revenueGrowth: Math.floor(Math.random() * 50) + 10,
        costChange: Math.floor(Math.random() * 20) - 10,
        profitMargin: Math.floor(Math.random() * 40) + 30,
        roiTrend: Math.floor(Math.random() * 20) + 5
      },
      revenue: {
        sources: [
          { name: 'Affiliate Marketing', value: 45000, color: '#8884d8' },
          { name: 'Video Content', value: 35000, color: '#82ca9d' },
          { name: 'AI Services', value: 25000, color: '#ffc658' },
          { name: 'Courses', value: 15000, color: '#ff7300' }
        ],
        trend: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          revenue: Math.floor(Math.random() * 5000) + 2000,
          profit: Math.floor(Math.random() * 3000) + 1000
        }))
      },
      products: [
        {
          id: 1,
          name: 'AI Content Generator',
          type: 'affiliate',
          niche: 'Content Creation',
          revenue: 15000,
          costs: 5000,
          profit: 10000,
          roi: 300,
          performance: 85
        },
        {
          id: 2,
          name: 'YouTube Automation Course',
          type: 'course',
          niche: 'Education',
          revenue: 12000,
          costs: 3000,
          profit: 9000,
          roi: 400,
          performance: 92
        }
      ],
      workflows: [
        {
          id: 1,
          name: 'YouTube Content Creation',
          type: 'content_creation',
          description: 'Automated video creation and publishing',
          executions: 1250,
          successRate: 95,
          revenueGenerated: 25000,
          executionCosts: 5000,
          netProfit: 20000,
          roi: 500
        }
      ],
      videos: {
        platformPerformance: [
          { platform: 'YouTube', views: 150000, engagement: 8.5, revenue: 12000 },
          { platform: 'TikTok', views: 89000, engagement: 12.3, revenue: 5500 },
          { platform: 'Instagram', views: 65000, engagement: 6.8, revenue: 3200 }
        ],
        topVideos: [
          {
            id: 1,
            title: 'AI Automation Secrets',
            niche: 'Technology',
            views: 25000,
            revenue: 2500,
            maxRevenue: 5000
          }
        ],
        nichePerformance: [
          {
            name: 'AI & Technology',
            videoCount: 45,
            totalViews: 125000,
            avgEngagement: 9.2,
            revenue: 15000,
            costPerVideo: 150,
            profit: 8250,
            roi: 122
          }
        ]
      },
      affiliates: [
        {
          id: 1,
          productName: 'Jasper AI',
          merchant: 'Jasper Technologies',
          network: 'Direct',
          niche: 'AI Writing',
          clicks: 2500,
          conversions: 125,
          conversionRate: 5.0,
          commissionRate: 30,
          revenue: 15000,
          marketingCost: 3000,
          netProfit: 12000,
          roi: 500
        }
      ],
      costs: {
        breakdown: [
          { name: 'Content Creation', value: 8000, color: '#8884d8' },
          { name: 'Marketing', value: 5000, color: '#82ca9d' },
          { name: 'Infrastructure', value: 3000, color: '#ffc658' },
          { name: 'Tools & Software', value: 2000, color: '#ff7300' }
        ]
      }
    };
    
    res.json(dashboardData);
  } catch (error) {
    logger.error(error, 'Dashboard analytics error');
    res.status(500).json({ error: 'Failed to load dashboard analytics' });
  }
});

app.get('/api/enterprise/realtime-metrics', async (req, res) => {
  try {
    const realTimeData = {
      enterprise: {
        arr: Math.floor(Math.random() * 500000000) + 200000000,
        mrr: Math.floor(Math.random() * 50000000) + 20000000,
        arrGrowth: Math.floor(Math.random() * 50) + 25,
        mrrGrowth: Math.floor(Math.random() * 20) + 10,
        contentVelocity: Math.floor(Math.random() * 1000) + 500,
        globalReach: Math.floor(Math.random() * 10000000) + 5000000,
        countries: Math.floor(Math.random() * 50) + 100,
        aiEfficiency: Math.floor(Math.random() * 30) + 70,
        scaleFactor: Math.floor(Math.random() * 50) + 25
      },
      liveActivities: Array.from({ length: 20 }, (_, i) => ({
        action: `Content created for ${['YouTube', 'TikTok', 'Instagram'][Math.floor(Math.random() * 3)]}`,
        platform: ['YouTube', 'TikTok', 'Instagram', 'Twitter'][Math.floor(Math.random() * 4)],
        revenue: Math.floor(Math.random() * 1000) + 100,
        timestamp: new Date(Date.now() - i * 60000).toLocaleTimeString(),
        icon: '🎬',
        color: '#667eea',
        count: Math.floor(Math.random() * 10) + 1
      })),
      revenueVelocity: Array.from({ length: 24 }, (_, i) => ({
        time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toLocaleTimeString(),
        revenue: Math.floor(Math.random() * 10000) + 5000,
        contentCreated: Math.floor(Math.random() * 50) + 25,
        affiliateCommissions: Math.floor(Math.random() * 3000) + 1000
      })),
      platformMatrix: [
        {
          name: 'YouTube',
          logo: '/static/youtube-logo.png',
          contentToday: Math.floor(Math.random() * 100) + 50,
          contentGrowth: Math.floor(Math.random() * 50) + 10,
          views: Math.floor(Math.random() * 500000) + 200000,
          engagementRate: Math.floor(Math.random() * 10) + 5,
          revenue: Math.floor(Math.random() * 50000) + 25000,
          costPerContent: Math.floor(Math.random() * 200) + 100,
          roi: Math.floor(Math.random() * 400) + 200,
          aiEfficiency: Math.floor(Math.random() * 30) + 70,
          status: 'Optimal'
        }
      ],
      aiIntelligence: [
        { capability: 'Content Creation', current: 85, target: 95 },
        { capability: 'SEO Optimization', current: 78, target: 90 },
        { capability: 'Audience Targeting', current: 82, target: 92 },
        { capability: 'Revenue Optimization', current: 75, target: 88 },
        { capability: 'Automation', current: 88, target: 95 },
        { capability: 'Analytics', current: 80, target: 90 }
      ]
    };
    
    res.json(realTimeData);
  } catch (error) {
    logger.error(error, 'Enterprise metrics error');
    res.status(500).json({ error: 'Failed to load enterprise metrics' });
  }
});

// System status endpoint
app.get('/api/system/status', async (req, res) => {
  try {
    const systemStatus = {
      services: [
        { name: 'AI Platform', status: 'online', uptime: '99.9%', lastCheck: new Date().toISOString() },
        { name: 'Database', status: 'online', uptime: '99.8%', lastCheck: new Date().toISOString() },
        { name: 'Redis Cache', status: 'online', uptime: '99.7%', lastCheck: new Date().toISOString() },
        { name: 'Ollama AI', status: 'online', uptime: '98.5%', lastCheck: new Date().toISOString() }
      ],
      metrics: {
        totalRequests: Math.floor(Math.random() * 100000) + 50000,
        activeUsers: Math.floor(Math.random() * 1000) + 500,
        avgResponseTime: Math.floor(Math.random() * 200) + 100,
        errorRate: (Math.random() * 2).toFixed(2)
      }
    };
    
    res.json(systemStatus);
  } catch (error) {
    logger.error(error, 'System status error');
    res.status(500).json({ error: 'Failed to load system status' });
  }
});

// Admin metrics endpoint for dashboard
app.get('/admin/metrics', async (req, res) => {
  try {
    // Verify admin token
    const adminToken = req.headers['x-admin-token'];
    if (adminToken !== process.env.ADMIN_KMS_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get basic system metrics
    const metrics = {
      total_requests: Math.floor(Math.random() * 100000) + 50000,
      active_users: Math.floor(Math.random() * 500) + 100,
      error_count: Math.floor(Math.random() * 50),
      avg_response_time: Math.floor(Math.random() * 500) + 200,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    res.json(metrics);
  } catch (error) {
    logger.error(error, 'Admin metrics error');
    res.status(500).json({ error: 'Failed to load admin metrics' });
  }
});

// Chat API endpoint with multiple LLM providers
// Clean (single) chat endpoint with streaming
app.post('/chat', authenticateChat, async (req, res) => {
    const startTime = Date.now();
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const { provider = 'openrouter', model, messages = [], key_uuid, byok_api_key, temperature, max_tokens } = req.body || {};

    // Basic validation
    if (!model) return res.status(400).json({ error: 'model parameter is required' });
    if (!messages.length) return res.status(400).json({ error: 'messages array is required and cannot be empty' });

    // Resolve API key (if needed for provider)
    let apiKey = byok_api_key || null;
    if (!apiKey && key_uuid) {
        try {
            const result = await pool.query('SELECT enc_key, enc_iv, enc_tag FROM provider_keys WHERE id = $1 AND enabled = true', [key_uuid]);
            if (result.rowCount === 0) return res.status(400).json({ error: 'Invalid or disabled key_uuid' });
            const { enc_key, enc_iv, enc_tag } = result.rows[0];
            apiKey = decryptSecret(enc_key, enc_iv, enc_tag, process.env.ADMIN_KMS_KEY);
        } catch (e) {
            logger.error(e, 'Key resolution failed');
            return res.status(500).json({ error: 'Failed to decrypt API key' });
        }
    }

    // Prepare SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    });

    let success = true;
    let errorMessage = null;
    let outputTokens = 0;

    const sendSSE = (data) => res.write(`data: ${data}\n\n`);

    try {
        if (provider === 'openrouter') {
            if (!apiKey) return sendSSE(JSON.stringify({ error: 'API key required for OpenRouter' }));
            const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
            await streamOR(baseUrl, apiKey, model, messages, (chunk) => {
                try {
                    const parsed = JSON.parse(chunk);
                    const content = parsed.choices?.[0]?.delta?.content || '';
                    if (content) outputTokens += Math.ceil(content.length / 4);
                } catch {}
                sendSSE(chunk);
            });
        } else if (provider === 'ollama') {
            const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
            await streamOllama(baseUrl, model, messages, (chunk) => {
                try {
                    const parsed = JSON.parse(chunk);
                    const content = parsed.choices?.[0]?.delta?.content || '';
                    if (content) outputTokens += Math.ceil(content.length / 4);
                } catch {}
                sendSSE(chunk);
            });
        } else {
            // Fallback simple simulated streaming for unknown provider
            const last = messages[messages.length - 1]?.content || '';
            const text = `Provider ${provider} not integrated yet. Echoing: ${last}`;
            for (const word of text.split(' ')) {
                sendSSE(JSON.stringify({ choices: [{ delta: { content: word + ' ' } }] }));
                await new Promise(r => setTimeout(r, 40));
            }
        }
        sendSSE('[DONE]');
    } catch (e) {
        success = false;
        errorMessage = e.message;
        logger.error(e, 'Chat streaming error');
        sendSSE(JSON.stringify({ error: e.message }));
    } finally {
        try {
            const latency = Date.now() - startTime;
            const inputText = messages.map(m => m.content || '').join('');
            const inputTokens = Math.ceil(inputText.length / 4);
            const totalTokens = inputTokens + outputTokens;
            await pool.query(`INSERT INTO chat_logs (ip, key_uuid, provider, model, ok, latency_ms, input_tokens, output_tokens, total_tokens, error) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [
                ip, key_uuid || null, provider, model, success, latency, inputTokens, outputTokens, totalTokens, errorMessage
            ]);
        } catch (logErr) {
            logger.error(logErr, 'Chat log insert failed');
        }
        res.end();
    }
});

// Serve static files for dashboard
app.use('/static', express.static('src/frontend'));

// Dashboard routes
app.get('/login', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookAI Studio - Login</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; display: flex; align-items: center; justify-content: center; 
        }
        .login-container { background: white; border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo h1 { color: #2c3e50; font-size: 28px; margin-bottom: 8px; }
        .logo p { color: #7f8c8d; font-size: 14px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 6px; color: #2c3e50; font-weight: 500; }
        .form-group input { width: 100%; padding: 12px; border: 2px solid #e1e8ed; border-radius: 8px; font-size: 16px; transition: border-color 0.3s; }
        .form-group input:focus { outline: none; border-color: #667eea; }
        .btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
        .btn:hover { transform: translateY(-2px); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .error { background: #fee; color: #c33; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .success { background: #efe; color: #3c3; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .features { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e8ed; }
        .features h3 { color: #2c3e50; margin-bottom: 15px; font-size: 16px; }
        .feature-list { list-style: none; }
        .feature-list li { color: #7f8c8d; margin-bottom: 8px; padding-left: 20px; position: relative; font-size: 14px; }
        .feature-list li:before { content: '✓'; position: absolute; left: 0; color: #27ae60; font-weight: bold; }
        .loading { display: none; text-align: center; margin: 20px 0; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <h1>🤖 BookAI Studio</h1>
            <p>AI Automation Platform</p>
        </div>
        
        <div id="error" class="error" style="display: none;"></div>
        <div id="success" class="success" style="display: none;"></div>
        
        <form id="loginForm" onsubmit="handleLogin(event)">
            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email" required placeholder="admin@bookaistudio.com">
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required placeholder="Enter your password">
            </div>
            
            <button type="submit" class="btn" id="loginBtn">
                Sign In to Dashboard
            </button>
        </form>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Authenticating...</p>
        </div>
        
        <div class="features">
            <h3>Dashboard Features:</h3>
            <ul class="feature-list">
                <li>Revenue & Analytics Tracking</li>
                <li>AI Model Management</li>
                <li>Workflow Automation Control</li>
                <li>System Monitoring</li>
                <li>Multi-Provider LLM Support</li>
                <li>Real-time Performance Metrics</li>
            </ul>
        </div>
    </div>

    <script>
        async function handleLogin(event) {
            event.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');
            const successDiv = document.getElementById('success');
            const loginBtn = document.getElementById('loginBtn');
            const loading = document.getElementById('loading');
            const form = document.getElementById('loginForm');
            
            // Reset messages
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
            
            // Show loading
            form.style.display = 'none';
            loading.style.display = 'block';
            
            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    successDiv.textContent = 'Login successful! Redirecting to dashboard...';
                    successDiv.style.display = 'block';
                    
                    // Redirect to dashboard
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1500);
                } else {
                    throw new Error(data.error || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                errorDiv.textContent = error.message || 'Login failed. Please try again.';
                errorDiv.style.display = 'block';
                
                // Show form again
                form.style.display = 'block';
                loading.style.display = 'none';
            }
        }
        
        // Check if already logged in
        if (localStorage.getItem('token')) {
            window.location.href = '/dashboard';
        }
    </script>
</body>
</html>`;
  res.send(html);
});

app.get('/dashboard', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookAI Studio - Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: #f8fafc; color: #1e293b; line-height: 1.6;
        }
        
        /* Header */
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; padding: 20px 30px; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            position: sticky; top: 0; z-index: 100;
        }
        .header-content { 
            display: flex; justify-content: space-between; align-items: center; 
            max-width: 1400px; margin: 0 auto; 
        }
        .header h1 { font-size: 24px; font-weight: 700; }
        .header .user-info { display: flex; align-items: center; gap: 15px; }
        .user-avatar { 
            width: 40px; height: 40px; border-radius: 50%; 
            background: rgba(255,255,255,0.2); 
            display: flex; align-items: center; justify-content: center; 
            font-weight: bold; font-size: 16px;
        }
        .logout-btn { 
            background: rgba(255,255,255,0.2); border: none; color: white; 
            padding: 8px 16px; border-radius: 6px; cursor: pointer; 
            transition: background 0.2s; font-size: 14px;
        }
        .logout-btn:hover { background: rgba(255,255,255,0.3); }
        
        /* Navigation */
        .nav-container { 
            background: white; border-bottom: 1px solid #e2e8f0; 
            padding: 0 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .nav-tabs { 
            display: flex; max-width: 1400px; margin: 0 auto; 
            overflow-x: auto; scrollbar-width: none;
        }
        .nav-tabs::-webkit-scrollbar { display: none; }
        .nav-tab { 
            padding: 16px 20px; border-bottom: 3px solid transparent; 
            cursor: pointer; transition: all 0.2s; white-space: nowrap;
            font-weight: 500; display: flex; align-items: center; gap: 8px;
        }
        .nav-tab:hover { background: #f8fafc; }
        .nav-tab.active { border-bottom-color: #667eea; color: #667eea; background: #f8fafc; }
        .nav-tab .material-icons { font-size: 20px; }
        
        /* Main Content */
        .main-content { 
            max-width: 1400px; margin: 0 auto; padding: 30px; 
        }
        
        /* Stats Cards */
        .stats-grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
            gap: 20px; margin-bottom: 30px; 
        }
        .stat-card { 
            background: white; border-radius: 12px; padding: 24px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.08); 
            border: 1px solid #e2e8f0; transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.12); }
        .stat-header { display: flex; justify-content: between; align-items: flex-start; margin-bottom: 12px; }
        .stat-icon { 
            width: 48px; height: 48px; border-radius: 10px; 
            display: flex; align-items: center; justify-content: center; 
            font-size: 24px; margin-right: 16px;
        }
        .stat-value { font-size: 32px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
        .stat-label { color: #64748b; font-size: 14px; font-weight: 500; }
        .stat-change { 
            font-size: 12px; font-weight: 500; 
            padding: 2px 6px; border-radius: 4px; margin-top: 8px; display: inline-block;
        }
        .stat-change.positive { background: #dcfce7; color: #166534; }
        .stat-change.negative { background: #fee2e2; color: #dc2626; }
        
        /* Data Tables */
        .data-section { 
            background: white; border-radius: 12px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.08); 
            border: 1px solid #e2e8f0; margin-bottom: 30px; overflow: hidden;
        }
        .section-header { 
            padding: 20px 24px; border-bottom: 1px solid #e2e8f0; 
            background: #f8fafc; display: flex; justify-content: space-between; align-items: center;
        }
        .section-title { font-size: 18px; font-weight: 600; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th { 
            background: #f8fafc; padding: 12px 16px; text-align: left; 
            font-weight: 600; font-size: 12px; text-transform: uppercase; 
            color: #64748b; border-bottom: 1px solid #e2e8f0;
        }
        .data-table td { 
            padding: 12px 16px; border-bottom: 1px solid #f1f5f9; 
            font-size: 14px; vertical-align: middle;
        }
        .data-table tr:hover { background: #f8fafc; }
        
        /* Status Indicators */
        .status-badge { 
            padding: 4px 8px; border-radius: 6px; font-size: 12px; 
            font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .status-online { background: #dcfce7; color: #166534; }
        .status-offline { background: #fee2e2; color: #dc2626; }
        .status-warning { background: #fef3c7; color: #92400e; }
        
        /* Buttons */
        .btn { 
            padding: 8px 16px; border-radius: 6px; border: none; 
            font-size: 14px; font-weight: 500; cursor: pointer; 
            transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px;
        }
        .btn-primary { background: #667eea; color: white; }
        .btn-primary:hover { background: #5a67d8; }
        .btn-secondary { background: #e2e8f0; color: #475569; }
        .btn-secondary:hover { background: #cbd5e1; }
        .btn-success { background: #10b981; color: white; }
        .btn-success:hover { background: #059669; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-danger:hover { background: #dc2626; }
        
        /* Charts Container */
        .charts-grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); 
            gap: 20px; margin-bottom: 30px; 
        }
        .chart-container { 
            background: white; border-radius: 12px; padding: 24px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.08); 
            border: 1px solid #e2e8f0; 
        }
        
        /* Loading States */
        .loading { text-align: center; padding: 40px; color: #64748b; }
        .spinner { 
            border: 3px solid #f1f5f9; border-top: 3px solid #667eea; 
            border-radius: 50%; width: 32px; height: 32px; 
            animation: spin 1s linear infinite; margin: 0 auto 16px; 
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        /* Responsive */
        @media (max-width: 768px) {
            .header-content { flex-direction: column; gap: 15px; text-align: center; }
            .main-content { padding: 20px 15px; }
            .nav-tabs { padding: 0 15px; }
            .stats-grid { grid-template-columns: 1fr; }
            .charts-grid { grid-template-columns: 1fr; }
        }
        
        /* Tab Content */
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        /* Progress Bars */
        .progress-bar { 
            background: #f1f5f9; border-radius: 6px; height: 8px; 
            overflow: hidden; margin: 4px 0; 
        }
        .progress-fill { 
            height: 100%; border-radius: 6px; 
            transition: width 0.3s ease; 
        }
        .progress-success { background: #10b981; }
        .progress-warning { background: #f59e0b; }
        .progress-danger { background: #ef4444; }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-content">
            <h1>🤖 BookAI Studio Dashboard</h1>
            <div class="user-info">
                <span id="userEmail">Loading...</span>
                <div class="user-avatar" id="userAvatar">A</div>
                <button class="logout-btn" onclick="logout()">
                    <span class="material-icons" style="font-size: 16px;">logout</span>
                    Logout
                </button>
            </div>
        </div>
    </div>

    <!-- Navigation -->
    <div class="nav-container">
        <div class="nav-tabs">
            <div class="nav-tab active" onclick="switchTab('overview')">
                <span class="material-icons">dashboard</span>
                Overview
            </div>
            <div class="nav-tab" onclick="switchTab('analytics')">
                <span class="material-icons">analytics</span>
                Analytics
            </div>
            <div class="nav-tab" onclick="switchTab('workflows')">
                <span class="material-icons">automation</span>
                Workflows
            </div>
            <div class="nav-tab" onclick="switchTab('models')">
                <span class="material-icons">psychology</span>
                AI Models
            </div>
            <div class="nav-tab" onclick="switchTab('system')">
                <span class="material-icons">computer</span>
                System
            </div>
            <div class="nav-tab" onclick="switchTab('security')">
                <span class="material-icons">security</span>
                Security
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
        <!-- Overview Tab -->
        <div id="overview" class="tab-content active">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            💰
                        </div>
                    </div>
                    <div class="stat-value" id="totalRevenue">$0</div>
                    <div class="stat-label">Total Revenue</div>
                    <div class="stat-change positive" id="revenueChange">+0%</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
                            🤖
                        </div>
                    </div>
                    <div class="stat-value" id="activeWorkflows">0</div>
                    <div class="stat-label">Active Workflows</div>
                    <div class="stat-change positive" id="workflowChange">+0</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white;">
                            📊
                        </div>
                    </div>
                    <div class="stat-value" id="totalRequests">0</div>
                    <div class="stat-label">API Requests Today</div>
                    <div class="stat-change positive" id="requestsChange">+0%</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
                            ⚡
                        </div>
                    </div>
                    <div class="stat-value" id="systemHealth">98%</div>
                    <div class="stat-label">System Health</div>
                    <div class="stat-change positive">+2%</div>
                </div>
            </div>

            <div class="data-section">
                <div class="section-header">
                    <div class="section-title">System Services Status</div>
                    <button class="btn btn-primary" onclick="refreshServices()">
                        <span class="material-icons">refresh</span>
                        Refresh
                    </button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>Status</th>
                            <th>CPU</th>
                            <th>Memory</th>
                            <th>Uptime</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="servicesTable">
                        <tr>
                            <td colspan="6" class="loading">
                                <div class="spinner"></div>
                                Loading services...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Analytics Tab -->
        <div id="analytics" class="tab-content">
            <div class="loading">
                <div class="spinner"></div>
                Loading analytics data...
            </div>
        </div>

        <!-- Workflows Tab -->
        <div id="workflows" class="tab-content">
            <div class="loading">
                <div class="spinner"></div>
                Loading workflows...
            </div>
        </div>

        <!-- Models Tab -->
        <div id="models" class="tab-content">
            <div class="loading">
                <div class="spinner"></div>
                Loading AI models...
            </div>
        </div>

        <!-- System Tab -->
        <div id="system" class="tab-content">
            <div class="loading">
                <div class="spinner"></div>
                Loading system information...
            </div>
        </div>

        <!-- Security Tab -->
        <div id="security" class="tab-content">
            <div class="loading">
                <div class="spinner"></div>
                Loading security information...
            </div>
        </div>
    </div>

    <script>
        // Global state
        let currentUser = null;
        let currentTab = 'overview';
        
        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            checkAuth();
            loadUserInfo();
            loadDashboardData();
        });
        
        function checkAuth() {
            // Check for token in URL first (for GET quick login)
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');
            
            if (urlToken) {
                localStorage.setItem('token', urlToken);
                // Remove token from URL for security
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }
            
            // Validate token
            fetch('/auth/validate', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Invalid token');
                }
                return response.json();
            })
            .catch(error => {
                console.error('Auth validation failed:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            });
        }
        
        function loadUserInfo() {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            currentUser = user;
            
            if (user.email) {
                document.getElementById('userEmail').textContent = user.email;
                document.getElementById('userAvatar').textContent = user.email.charAt(0).toUpperCase();
            }
        }
        
        async function loadDashboardData() {
            const token = localStorage.getItem('token');
            
            try {
                // Load services status
                const servicesResponse = await fetch('/admin/metrics', {
                    headers: { 'X-Admin-Token': '${process.env.ADMIN_KMS_KEY || 'demo-key'}' }
                });
                
                if (servicesResponse.ok) {
                    const servicesData = await servicesResponse.json();
                    updateStatsCards(servicesData);
                }
                
                // Load PM2 processes
                loadServices();
                
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            }
        }
        
        function updateStatsCards(data) {
            document.getElementById('totalRequests').textContent = data.total_requests?.toLocaleString() || '0';
            document.getElementById('requestsChange').textContent = '+' + (data.error_count || 0) + ' errors';
            document.getElementById('requestsChange').className = 'stat-change ' + (data.error_count > 0 ? 'negative' : 'positive');
        }
        
        async function loadServices() {
            try {
                const response = await fetch('/api/pm2/status');
                const services = await response.json();
                
                const tbody = document.getElementById('servicesTable');
                tbody.innerHTML = '';
                
                services.forEach(service => {
                    const row = document.createElement('tr');
                    row.innerHTML = \
                        <td>
                            <strong>\${service.name}</strong><br>
                            <small style="color: #64748b;">\${service.script || 'N/A'}</small>
                        </td>
                        <td>
                            <span class="status-badge status-\${service.status === 'online' ? 'online' : 'offline'}">
                                \${service.status}
                            </span>
                        </td>
                        <td>\${service.cpu || '0'}%</td>
                        <td>\${service.memory || '0MB'}</td>
                        <td>\${service.uptime || '0s'}</td>
                        <td>
                            <button class="btn btn-secondary" onclick="restartService('\${service.name}')">
                                <span class="material-icons">refresh</span>
                            </button>
                            <button class="btn btn-success" onclick="viewLogs('\${service.name}')">
                                <span class="material-icons">description</span>
                            </button>
                        </td>
                    \;
                    tbody.appendChild(row);
                });
                
            } catch (error) {
                console.error('Error loading services:', error);
                document.getElementById('servicesTable').innerHTML = '<tr><td colspan="6">Error loading services</td></tr>';
            }
        }
        
        function switchTab(tabName) {
            // Update active tab
            document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            document.querySelector(\[onclick="switchTab('\${tabName}')"]\).classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            currentTab = tabName;
            
            // Load tab-specific data
            switch(tabName) {
                case 'analytics':
                    loadAnalytics();
                    break;
                case 'workflows':
                    loadWorkflows();
                    break;
                case 'models':
                    loadModels();
                    break;
                case 'system':
                    loadSystem();
                    break;
                case 'security':
                    loadSecurity();
                    break;
            }
        }
        
        async function loadAnalytics() {
            document.getElementById('analytics').innerHTML = \
                <div class="charts-grid">
                    <div class="chart-container">
                        <h3>Revenue Trends</h3>
                        <p>Coming soon: Interactive revenue charts</p>
                    </div>
                    <div class="chart-container">
                        <h3>Workflow Performance</h3>
                        <p>Coming soon: Workflow analytics</p>
                    </div>
                </div>
            \;
        }
        
        async function loadWorkflows() {
            document.getElementById('workflows').innerHTML = \
                <div class="data-section">
                    <div class="section-header">
                        <div class="section-title">N8N Workflows</div>
                        <button class="btn btn-primary" onclick="createWorkflow()">
                            <span class="material-icons">add</span>
                            Create Workflow
                        </button>
                    </div>
                    <p style="padding: 20px;">Workflow management interface coming soon...</p>
                </div>
            \;
        }
        
        async function loadModels() {
            try {
                const response = await fetch('/models');
                const models = await response.json();
                
                let modelsHtml = \
                    <div class="data-section">
                        <div class="section-header">
                            <div class="section-title">Available AI Models</div>
                            <button class="btn btn-primary" onclick="refreshModels()">
                                <span class="material-icons">refresh</span>
                                Refresh Models
                            </button>
                        </div>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Provider</th>
                                    <th>Model</th>
                                    <th>Status</th>
                                    <th>Context Length</th>
                                    <th>Description</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                \;
                
                models.forEach(model => {
                    modelsHtml += \
                        <tr>
                            <td>
                                <span class="status-badge status-\${model.provider === 'ollama' ? 'online' : 'warning'}">
                                    \${model.provider}
                                </span>
                            </td>
                            <td><strong>\${model.model}</strong></td>
                            <td>
                                <span class="status-badge status-\${model.status === 'online' ? 'online' : 'offline'}">
                                    \${model.status}
                                </span>
                            </td>
                            <td>\${model.context_length || 'N/A'}</td>
                            <td>\${model.description || 'No description'}</td>
                            <td>
                                <button class="btn btn-primary" onclick="testModel('\${model.provider}', '\${model.model}')">
                                    <span class="material-icons">play_arrow</span>
                                    Test
                                </button>
                            </td>
                        </tr>
                    \;
                });
                
                modelsHtml += \
                            </tbody>
                        </table>
                    </div>
                \;
                
                document.getElementById('models').innerHTML = modelsHtml;
                
            } catch (error) {
                console.error('Error loading models:', error);
                document.getElementById('models').innerHTML = '<div class="loading">Error loading models</div>';
            }
        }
        
        function loadSystem() {
            document.getElementById('system').innerHTML = \
                <div class="data-section">
                    <div class="section-header">
                        <div class="section-title">System Information</div>
                    </div>
                    <p style="padding: 20px;">System monitoring interface coming soon...</p>
                </div>
            \;
        }
        
        function loadSecurity() {
            document.getElementById('security').innerHTML = \
                <div class="data-section">
                    <div class="section-header">
                        <div class="section-title">Security Settings</div>
                    </div>
                    <p style="padding: 20px;">Security management interface coming soon...</p>
                </div>
            \;
        }
        
        function refreshServices() {
            loadServices();
        }
        
        function restartService(serviceName) {
            if (confirm(\Are you sure you want to restart \${serviceName}?\)) {
                // Implementation for restarting service
                console.log('Restarting service:', serviceName);
            }
        }
        
        function viewLogs(serviceName) {
            // Implementation for viewing logs
            console.log('Viewing logs for:', serviceName);
        }
        
        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        
        // Auto-refresh data every 30 seconds
        setInterval(() => {
            if (currentTab === 'overview') {
                loadDashboardData();
            }
        }, 30000);
    </script>
</body>
</html>`;
  res.send(html);
});

// Chat login page
// Removed duplicate '/chat-login' page (legacy). We now use '/chat/login' as the canonical chat login.

// Chat interface route
app.get('/chat', authenticateChat, (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookAI Studio - AI Chat</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh; overflow: hidden;
        }
        
        .chat-container { 
            height: 100vh; display: flex; flex-direction: column;
            max-width: 1200px; margin: 0 auto; background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px); border-radius: 0;
        }
        
        .chat-header { 
            background: rgba(255,255,255,0.2); padding: 20px 30px; 
            border-bottom: 1px solid rgba(255,255,255,0.3);
            backdrop-filter: blur(20px); display: flex; justify-content: space-between; align-items: center;
        }
        .chat-header-left h1 { color: white; font-size: 24px; font-weight: 700; }
        .chat-header-left p { color: rgba(255,255,255,0.8); margin-top: 5px; }
        .chat-header-right { display: flex; align-items: center; gap: 15px; }
        .user-info { color: white; font-size: 14px; }
        .logout-btn { 
            background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);
            padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 14px;
            transition: all 0.2s; display: flex; align-items: center; gap: 6px;
        }
        .logout-btn:hover { background: rgba(255,255,255,0.3); }
        
        .chat-messages { 
            flex: 1; overflow-y: auto; padding: 20px; 
            background: rgba(255,255,255,0.05);
        }
        .message { 
            margin-bottom: 20px; display: flex; gap: 12px; max-width: 80%;
        }
        .message.user { margin-left: auto; flex-direction: row-reverse; }
        .message.assistant { margin-right: auto; }
        
        .message-avatar { 
            width: 40px; height: 40px; border-radius: 50%; 
            display: flex; align-items: center; justify-content: center;
            font-weight: bold; color: white; flex-shrink: 0;
        }
        .message.user .message-avatar { background: #667eea; }
        .message.assistant .message-avatar { background: #28a745; }
        
        .message-content { 
            background: rgba(255,255,255,0.9); border-radius: 18px; 
            padding: 12px 18px; color: #2c3e50; line-height: 1.5;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .message.user .message-content { 
            background: #667eea; color: white; 
        }
        
        .chat-input-container { 
            padding: 20px; background: rgba(255,255,255,0.2);
            border-top: 1px solid rgba(255,255,255,0.3);
            backdrop-filter: blur(20px);
        }
        .chat-input-form { display: flex; gap: 12px; }
        .chat-input { 
            flex: 1; padding: 12px 18px; border: 2px solid rgba(255,255,255,0.3);
            border-radius: 25px; background: rgba(255,255,255,0.9);
            font-size: 16px; outline: none; color: #2c3e50;
        }
        .chat-input:focus { border-color: white; }
        .send-btn { 
            padding: 12px 24px; background: white; color: #667eea;
            border: none; border-radius: 25px; font-weight: 600;
            cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;
        }
        .send-btn:hover { background: #f8f9fa; transform: translateY(-1px); }
        .send-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .typing-indicator { 
            display: none; padding: 10px 18px; 
            background: rgba(255,255,255,0.1); border-radius: 18px;
            color: rgba(255,255,255,0.8); font-style: italic;
        }
        
        .model-selector { 
            display: flex; gap: 10px; margin: 15px 30px; flex-wrap: wrap;
            padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px;
        }
        .model-btn { 
            padding: 6px 12px; background: rgba(255,255,255,0.2); 
            color: white; border: 1px solid rgba(255,255,255,0.3);
            border-radius: 15px; cursor: pointer; font-size: 12px;
            transition: all 0.2s;
        }
        .model-btn.active { background: white; color: #667eea; }
        .model-btn:hover { background: rgba(255,255,255,0.3); }
        
        .welcome-message { 
            text-align: center; padding: 40px 20px; color: rgba(255,255,255,0.8);
        }
        .welcome-message h2 { margin-bottom: 10px; }
        .welcome-examples { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px; margin-top: 20px;
        }
        .example-prompt { 
            background: rgba(255,255,255,0.1); padding: 15px; border-radius: 12px;
            cursor: pointer; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.2);
        }
        .example-prompt:hover { background: rgba(255,255,255,0.2); }
        
        @media (max-width: 768px) {
            .chat-container { border-radius: 0; }
            .message { max-width: 95%; }
            .chat-header { padding: 15px 20px; }
            .chat-input-container { padding: 15px; }
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <div class="chat-header-left">
                <h1>🤖 BookAI Studio Chat</h1>
                <p>Powered by Multiple LLM Providers - Choose your AI assistant</p>
            </div>
            <div class="chat-header-right">
                <div class="user-info" id="userInfo">
                    Welcome, <span id="userEmail">Loading...</span>
                </div>
                <button class="logout-btn" onclick="logout()">
                    🚪 Logout
                </button>
            </div>
        </div>
        
        <div class="model-selector">
            <div class="model-btn active" data-provider="ollama" data-model="llama2">🦙 Llama 2 (Local)</div>
            <div class="model-btn" data-provider="ollama" data-model="codellama">💻 Code Llama</div>
            <div class="model-btn" data-provider="openrouter" data-model="gpt-3.5-turbo">🚀 GPT-3.5 Turbo</div>
            <div class="model-btn" data-provider="openrouter" data-model="claude-3-sonnet">🎭 Claude 3 Sonnet</div>
        </div>
        
        <div class="chat-messages" id="chatMessages">
            <div class="welcome-message">
                <h2>Welcome to BookAI Studio Chat! 👋</h2>
                <p>Select an AI model above and start chatting. Try these examples:</p>
                <div class="welcome-examples">
                    <div class="example-prompt" onclick="useExample('Explain how AI automation can boost my business revenue')">
                        💰 "Explain how AI automation can boost my business revenue"
                    </div>
                    <div class="example-prompt" onclick="useExample('Help me create a YouTube content strategy')">
                        🎬 "Help me create a YouTube content strategy"
                    </div>
                    <div class="example-prompt" onclick="useExample('What are the best affiliate marketing niches?')">
                        📈 "What are the best affiliate marketing niches?"
                    </div>
                    <div class="example-prompt" onclick="useExample('Generate code for a simple AI automation workflow')">
                        🔧 "Generate code for a simple AI automation workflow"
                    </div>
                </div>
            </div>
        </div>
        
        <div class="typing-indicator" id="typingIndicator">
            AI is thinking...
        </div>
        
        <div class="chat-input-container">
            <form class="chat-input-form" onsubmit="sendMessage(event)">
                <input 
                    type="text" 
                    class="chat-input" 
                    id="messageInput" 
                    placeholder="Type your message here..." 
                    autocomplete="off"
                >
                <button type="submit" class="send-btn" id="sendBtn">
                    <span class="material-icons">send</span>
                    Send
                </button>
            </form>
        </div>
    </div>

    <script>
        let currentProvider = 'ollama';
        let currentModel = 'llama2';
        let conversationHistory = [];
        
        // Initialize authentication on page load
        document.addEventListener('DOMContentLoaded', function() {
            checkAuth();
            loadUserInfo();
        });
        
        function checkAuth() {
            const token = localStorage.getItem('chatToken');
            if (!token) {
                window.location.href = '/chat/login';
                return;
            }
            
            // Validate token
            fetch('/auth/validate', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Invalid token');
                }
                return response.json();
            })
            .catch(error => {
                console.error('Auth validation failed:', error);
                logout();
            });
        }
        
        function loadUserInfo() {
            const user = JSON.parse(localStorage.getItem('chatUser') || '{}');
            if (user.email) {
                document.getElementById('userEmail').textContent = user.email;
            }
        }
        
        function logout() {
            localStorage.removeItem('chatToken');
            localStorage.removeItem('chatUser');
            window.location.href = '/chat/login';
        }
        
        // Model selection
        document.querySelectorAll('.model-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.model-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentProvider = btn.dataset.provider;
                currentModel = btn.dataset.model;
                
                addMessage('system', \Switched to \${btn.textContent.trim()}\);
            });
        });
        
        function useExample(text) {
            document.getElementById('messageInput').value = text;
            document.getElementById('messageInput').focus();
        }
        
        function addMessage(role, content) {
            const messagesContainer = document.getElementById('chatMessages');
            const welcomeMessage = messagesContainer.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }
            
            const messageDiv = document.createElement('div');
            messageDiv.className = \message \${role}\;
            
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = role === 'user' ? 'U' : 'AI';
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.textContent = content;
            
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(messageContent);
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        function showTyping(show) {
            const indicator = document.getElementById('typingIndicator');
            indicator.style.display = show ? 'block' : 'none';
            
            if (show) {
                const messagesContainer = document.getElementById('chatMessages');
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
        
        async function sendMessage(event) {
            event.preventDefault();
            
            const input = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');
            const message = input.value.trim();
            
            if (!message) return;
            
            // Add user message
            addMessage('user', message);
            conversationHistory.push({ role: 'user', content: message });
            
            // Clear input and disable
            input.value = '';
            input.disabled = true;
            sendBtn.disabled = true;
            showTyping(true);
            
            try {
                const token = localStorage.getItem('chatToken');
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        provider: currentProvider,
                        model: currentModel,
                        messages: conversationHistory,
                        temperature: 0.7,
                        max_tokens: 1000
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Chat request failed');
                }
                
                const reader = response.body.getReader();
                let assistantMessage = '';
                let messageElement = null;
                
                showTyping(false);
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = new TextDecoder().decode(value);
                    const lines = chunk.split('\\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;
                            
                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content || '';
                                
                                if (content) {
                                    assistantMessage += content;
                                    
                                    if (!messageElement) {
                                        const messagesContainer = document.getElementById('chatMessages');
                                        const messageDiv = document.createElement('div');
                                        messageDiv.className = 'message assistant';
                                        
                                        const avatar = document.createElement('div');
                                        avatar.className = 'message-avatar';
                                        avatar.textContent = 'AI';
                                        
                                        messageElement = document.createElement('div');
                                        messageElement.className = 'message-content';
                                        
                                        messageDiv.appendChild(avatar);
                                        messageDiv.appendChild(messageElement);
                                        messagesContainer.appendChild(messageDiv);
                                    }
                                    
                                    messageElement.textContent = assistantMessage;
                                    const messagesContainer = document.getElementById('chatMessages');
                                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                }
                            } catch (e) {
                                // Ignore parsing errors
                            }
                        }
                    }
                }
                
                if (assistantMessage) {
                    conversationHistory.push({ role: 'assistant', content: assistantMessage });
                }
                
            } catch (error) {
                console.error('Chat error:', error);
                addMessage('system', '❌ Error: Failed to get response. Please try again.');
            } finally {
                input.disabled = false;
                sendBtn.disabled = false;
                showTyping(false);
                input.focus();
            }
        }
        
        // Focus input on load
        document.getElementById('messageInput').focus();
        
        // Auto-resize chat container
        function resizeChat() {
            const container = document.querySelector('.chat-container');
            container.style.height = window.innerHeight + 'px';
        }
        
        window.addEventListener('resize', resizeChat);
        resizeChat();
    </script>
</body>
</html>`;
  res.send(html);
});

// Root route - Check domain and redirect appropriately
app.get('/', (req, res) => {
  const host = req.get('host');
  
  // If accessing chat domain, redirect to chat interface
  if (host && host.includes('chat.bookaistudio.com')) {
    return res.redirect('/chat');
  }
  
  // If accessing dashboard domain, redirect to login
  if (host && host.includes('dashboard.bookaistudio.com')) {
    return res.redirect('/login');
  }
  
  // Otherwise show API information page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookAI Studio - AI Automation Platform</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; margin-bottom: 10px; }
        .subtitle { color: #7f8c8d; font-size: 1.1em; margin-bottom: 30px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 30px; }
        .card { background: #ffffff; border: 1px solid #e1e8ed; border-radius: 8px; padding: 20px; transition: transform 0.2s; }
        .card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .card h3 { color: #2c3e50; margin-top: 0; }
        .endpoint { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; }
        .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; font-weight: bold; }
        .status.online { background: #d4edda; color: #155724; }
        .status.info { background: #d1ecf1; color: #0c5460; }
        a { color: #3498db; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .login-btn { 
            display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; 
            font-weight: 600; margin-top: 20px; transition: transform 0.2s;
        }
        .login-btn:hover { transform: translateY(-2px); color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 BookAI Studio</h1>
        <p class="subtitle">AI Automation Platform</p>
        <div class="status online">🟢 System Online</div>
        
    <a href="/login" class="login-btn">🚀 Access Dashboard</a>
    <a href="/chat/login" class="login-btn" style="margin-left: 10px; background: linear-gradient(135deg, #10b981 0%, #34d399 100%);">💬 Chat Login</a>
        
        <div class="grid">
            <div class="card">
                <h3>🔌 API Endpoints</h3>
                <div class="endpoint">POST /chat - Chat with LLM models</div>
                <div class="endpoint">GET /models - List available models</div>
                <div class="endpoint">GET /healthz - Health check</div>
                <div class="endpoint">GET /readyz - Readiness check</div>
            </div>
            
            <div class="card">
                <h3>🔐 Authentication</h3>
                <div class="endpoint">POST /auth/login - User authentication</div>
                <div class="endpoint">GET /auth/validate - Token validation</div>
            </div>
            
            <div class="card">
                <h3>⚙️ Admin Panel</h3>
                <div class="endpoint">GET /admin/metrics - System metrics</div>
                <div class="endpoint">GET /admin/recent-logs - Recent logs</div>
                <div class="endpoint">GET /admin/provider-keys - API keys</div>
            </div>
            
            <div class="card">
                <h3>🤖 Orchestrator</h3>
                <div class="endpoint">GET /admin/orchestrator/config - Agent config</div>
                <div class="endpoint">POST /admin/orchestrator/agents - Register agent</div>
                <div class="endpoint">POST /admin/orchestrator/route-test - Test routing</div>
            </div>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e8ed; color: #7f8c8d; text-align: center;">
            <p>BookAI Studio AI Automation Platform • <a href="/healthz">System Health</a> • <a href="/models">Available Models</a> • <a href="/dashboard">Dashboard</a></p>
        </div>
    </div>
</body>
</html>`;
  res.send(html);
});

// PM2 Status API endpoint
app.get('/api/pm2/status', async (req, res) => {
  try {
    // Mock PM2 data for now - in production, you'd integrate with PM2 API
    const mockServices = [
      { name: 'ai-automation-main', status: 'online', cpu: '0.2', memory: '75.3MB', uptime: '2h 15m', script: 'src/core/server.js' },
      { name: 'ai-automation-mcp', status: 'online', cpu: '0.1', memory: '69.9MB', uptime: '2h 15m', script: 'src/mcp/server.js' },
      { name: 'ollama-monitor', status: 'online', cpu: '0.1', memory: '57.0MB', uptime: '2h 10m', script: 'scripts/ollama-monitor.js' },
      { name: 'redis-monitor', status: 'online', cpu: '0.1', memory: '58.6MB', uptime: '2h 10m', script: 'scripts/redis-monitor.js' },
      { name: 'nginx-monitor', status: 'online', cpu: '0.1', memory: '56.7MB', uptime: '2h 10m', script: 'scripts/nginx-monitor.js' }
    ];
    res.json(mockServices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get PM2 status' });
  }
});

// Health check
app.get('/healthz', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});
app.get('/readyz', async (req, res) => {
  const out = { db: false, redis: false };
  try { await pool.query('SELECT 1'); out.db = true; } catch (_) {}
  if (redis) {
    try { await redis.ping(); out.redis = true; } catch (_) {}
  }
  const ready = Object.values(out).every(Boolean);
  res.status(ready ? 200 : 503).json({ ok: ready, ...out });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error(error, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const port = cfg.port;
app.listen(port, () => {
  logger.info({ port }, 'AI Gateway server running');
  logger.info('Health: /healthz  Ready: /readyz  Admin: /admin/*');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  if (redis) await redis.quit();
  await pool.end();
  process.exit(0);
});

