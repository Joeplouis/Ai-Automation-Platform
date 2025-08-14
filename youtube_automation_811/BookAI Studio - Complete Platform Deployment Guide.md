# BookAI Studio - Complete Platform Deployment Guide

## 🎯 Overview

This guide will help you deploy the complete AI automation platform to your existing BookAI Studio VPS infrastructure. Your current setup includes:

- **Main Domain**: bookaistudio.com
- **Existing Services**: Ollama (Port 11434), N8N (Port 5678), Streamlit (Port 8501)
- **Current Ports**: 18 active services running
- **Infrastructure**: Ubuntu 22.04, PostgreSQL, Redis, Nginx

## 📋 Pre-Deployment Checklist

### Current Infrastructure Status
- ✅ **VPS**: 168.231.74.188 (Ubuntu 22.04)
- ✅ **Ollama AI**: Running on port 11434
- ✅ **N8N**: Running on port 5678  
- ✅ **Databases**: PostgreSQL (3306), Redis (6379)
- ✅ **Web Server**: Nginx (80/443)
- ✅ **Domains**: All subdomains configured

### New Services to Deploy
- 🆕 **AI Automation API**: Port 8010
- 🆕 **Enhanced MCP Server**: Port 8011
- 🆕 **Client Dashboard**: Port 8012
- 🆕 **WordPress Theme**: Integration with existing WordPress
- 🆕 **Revenue Analytics**: Port 8013

---

## 🚀 Step 1: Prepare Deployment Environment

### 1.1 Connect to Your VPS
```bash
# SSH into your VPS
ssh ubuntu@168.231.74.188

# Switch to root for system-level operations
sudo su -
```

### 1.2 Create Deployment Directory
```bash
# Create deployment workspace
mkdir -p /opt/ai-automation-platform
cd /opt/ai-automation-platform

# Set proper ownership
chown -R ubuntu:ubuntu /opt/ai-automation-platform
```

### 1.3 Backup Current Configuration
```bash
# Backup current Nginx configuration
cp -r /etc/nginx/sites-available /opt/backups/nginx-backup-$(date +%Y%m%d)

# Backup current services
systemctl list-units --state=running > /opt/backups/running-services-$(date +%Y%m%d).txt

# Backup current ports
netstat -tlnp > /opt/backups/port-status-$(date +%Y%m%d).txt
```

---

## 📦 Step 2: Download and Extract Platform Files

### 2.1 Transfer Files from Sandbox
```bash
# Create temporary download directory
mkdir -p /tmp/platform-download
cd /tmp/platform-download

# You'll need to transfer these files from the sandbox:
# - ai-automation-platform/ (complete directory)
# - ai-agency-theme/ (WordPress theme)
# - ai-agency-dashboard/ (React dashboard)
```

### 2.2 Extract Platform Files
```bash
# Move to deployment directory
cd /opt/ai-automation-platform

# Extract main platform
cp -r /tmp/platform-download/ai-automation-platform/* .

# Extract WordPress theme
mkdir -p /var/www/wordpress-themes
cp -r /tmp/platform-download/ai-agency-theme /var/www/wordpress-themes/

# Extract dashboard
mkdir -p /var/www/dashboards
cp -r /tmp/platform-download/ai-agency-dashboard /var/www/dashboards/

# Set permissions
chown -R ubuntu:ubuntu /opt/ai-automation-platform
chown -R www-data:www-data /var/www/wordpress-themes
chown -R www-data:www-data /var/www/dashboards
```

---

## 🔧 Step 3: Install Dependencies

### 3.1 Update Node.js (if needed)
```bash
# Check current Node.js version
node --version

# If version is less than 18, update:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3.2 Install Platform Dependencies
```bash
# Navigate to platform directory
cd /opt/ai-automation-platform

# Install dependencies
npm install --production

# Install PM2 globally (if not already installed)
npm install -g pm2

# Install additional tools
npm install -g @nestjs/cli
```

### 3.3 Install Dashboard Dependencies
```bash
# Navigate to dashboard directory
cd /var/www/dashboards/ai-agency-dashboard

# Install dependencies
npm install

# Build for production
npm run build

# Verify build
ls -la dist/
```

---

## 🗄️ Step 4: Database Setup

### 4.1 Create New Database
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create new database for AI automation
CREATE DATABASE ai_automation_platform;

# Create dedicated user
CREATE USER ai_automation WITH ENCRYPTED PASSWORD 'your_secure_password_here';

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE ai_automation_platform TO ai_automation;
ALTER USER ai_automation CREATEDB;

# Exit PostgreSQL
\q
```

### 4.2 Run Database Migrations
```bash
# Navigate to platform directory
cd /opt/ai-automation-platform

# Create environment file
cp .env.example .env.production

# Edit environment variables
nano .env.production
```

### 4.3 Configure Environment Variables
```bash
# Add to .env.production:
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://ai_automation:your_secure_password_here@localhost:5432/ai_automation_platform
REDIS_URL=redis://localhost:6379

# API Configuration
API_PORT=8010
MCP_PORT=8011
DASHBOARD_PORT=8012
ANALYTICS_PORT=8013

# Ollama Configuration (use your existing setup)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen2.5:14b

# Security
JWT_SECRET=your_jwt_secret_minimum_32_characters
ENCRYPTION_KEY=your_encryption_key_32_characters
API_KEY_SECRET=your_api_key_secret

# External APIs (add your existing keys)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# BookAI Studio Integration
MAIN_DOMAIN=bookaistudio.com
CHAT_DOMAIN=chat.bookaistudio.com
WORDPRESS_DOMAIN=wrp.bookaistudio.com
POSTIZ_DOMAIN=postiz.bookaistudio.com
N8N_DOMAIN=n8n.bookaistudio.com
MAIL_DOMAIN=mail.bookaistudio.com
```

### 4.4 Initialize Database
```bash
# Run database migrations
npm run migrate:production

# Seed initial data
npm run seed:production

# Verify database setup
npm run db:status
```

---

## 🌐 Step 5: Configure Nginx Integration

### 5.1 Create New Nginx Configuration
```bash
# Create new site configuration
nano /etc/nginx/sites-available/ai-automation-platform
```

### 5.2 Add Nginx Configuration
```nginx
# AI Automation Platform Configuration
upstream ai_automation_api {
    server 127.0.0.1:8010;
    keepalive 32;
}

upstream ai_automation_mcp {
    server 127.0.0.1:8011;
    keepalive 16;
}

upstream ai_automation_dashboard {
    server 127.0.0.1:8012;
    keepalive 16;
}

upstream ai_automation_analytics {
    server 127.0.0.1:8013;
    keepalive 16;
}

# Rate limiting for new services
limit_req_zone $binary_remote_addr zone=ai_api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=ai_dashboard:10m rate=5r/s;

# AI Automation API
server {
    listen 443 ssl http2;
    server_name api-ai.bookaistudio.com;

    # Use existing SSL certificates
    ssl_certificate /etc/letsencrypt/live/bookaistudio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bookaistudio.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req zone=ai_api burst=20 nodelay;

    location / {
        proxy_pass http://ai_automation_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}

# Enhanced MCP Server
server {
    listen 443 ssl http2;
    server_name mcp-ai.bookaistudio.com;

    ssl_certificate /etc/letsencrypt/live/bookaistudio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bookaistudio.com/privkey.pem;

    location / {
        proxy_pass http://ai_automation_mcp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Client Dashboard
server {
    listen 443 ssl http2;
    server_name dashboard-ai.bookaistudio.com;

    ssl_certificate /etc/letsencrypt/live/bookaistudio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bookaistudio.com/privkey.pem;

    # Rate limiting
    limit_req zone=ai_dashboard burst=10 nodelay;

    # Serve built React dashboard
    root /var/www/dashboards/ai-agency-dashboard/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy for dashboard
    location /api/ {
        proxy_pass http://ai_automation_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Revenue Analytics
server {
    listen 443 ssl http2;
    server_name analytics-ai.bookaistudio.com;

    ssl_certificate /etc/letsencrypt/live/bookaistudio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bookaistudio.com/privkey.pem;

    location / {
        proxy_pass http://ai_automation_analytics;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS for new domains
server {
    listen 80;
    server_name api-ai.bookaistudio.com mcp-ai.bookaistudio.com dashboard-ai.bookaistudio.com analytics-ai.bookaistudio.com;
    return 301 https://$server_name$request_uri;
}
```

### 5.3 Enable New Configuration
```bash
# Enable the new site
ln -s /etc/nginx/sites-available/ai-automation-platform /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# If test passes, reload Nginx
systemctl reload nginx
```

---

## 🔄 Step 6: Configure Process Management

### 6.1 Create PM2 Ecosystem File
```bash
# Navigate to platform directory
cd /opt/ai-automation-platform

# Create PM2 configuration
nano ecosystem.config.js
```

### 6.2 PM2 Configuration
```javascript
module.exports = {
  apps: [
    {
      name: 'ai-automation-api',
      script: 'src/core/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8010
      },
      error_file: '/var/log/ai-automation/api-error.log',
      out_file: '/var/log/ai-automation/api-out.log',
      log_file: '/var/log/ai-automation/api-combined.log',
      time: true,
      max_memory_restart: '1G'
    },
    {
      name: 'ai-automation-mcp',
      script: 'src/core/enhanced-mcp-server.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 8011
      },
      error_file: '/var/log/ai-automation/mcp-error.log',
      out_file: '/var/log/ai-automation/mcp-out.log',
      log_file: '/var/log/ai-automation/mcp-combined.log',
      time: true,
      max_memory_restart: '512M'
    },
    {
      name: 'ai-automation-analytics',
      script: 'src/enterprise/billion-dollar-api.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 8013
      },
      error_file: '/var/log/ai-automation/analytics-error.log',
      out_file: '/var/log/ai-automation/analytics-out.log',
      log_file: '/var/log/ai-automation/analytics-combined.log',
      time: true,
      max_memory_restart: '512M'
    },
    {
      name: 'ai-automation-worker',
      script: 'src/modules/workflow/engine.js',
      instances: 2,
      env: {
        NODE_ENV: 'production',
        WORKER_MODE: 'true'
      },
      error_file: '/var/log/ai-automation/worker-error.log',
      out_file: '/var/log/ai-automation/worker-out.log',
      log_file: '/var/log/ai-automation/worker-combined.log',
      time: true,
      max_memory_restart: '512M'
    }
  ]
};
```

### 6.3 Setup Logging Directory
```bash
# Create log directory
mkdir -p /var/log/ai-automation
chown -R ubuntu:ubuntu /var/log/ai-automation

# Create log rotation configuration
nano /etc/logrotate.d/ai-automation
```

### 6.4 Log Rotation Configuration
```bash
/var/log/ai-automation/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 🎨 Step 7: Install WordPress Theme

### 7.1 Copy Theme to WordPress
```bash
# Navigate to your WordPress themes directory
cd /var/www/html/wp-content/themes/

# Copy the AI Agency theme
cp -r /var/www/wordpress-themes/ai-agency-theme ./

# Set proper permissions
chown -R www-data:www-data ai-agency-theme
chmod -R 755 ai-agency-theme
```

### 7.2 Activate Theme via WordPress Admin
```bash
# Access your WordPress admin at: https://wrp.bookaistudio.com/wp-admin
# Navigate to: Appearance > Themes
# Find "AI Agency Theme" and click "Activate"
```

### 7.3 Configure Theme Settings
```bash
# In WordPress admin, go to:
# Appearance > Customize > AI Agency Settings

# Configure:
# - Google Calendar Link: [Your Google Calendar booking link]
# - Stripe API Keys: [Your Stripe keys]
# - PayPal Settings: [Your PayPal configuration]
# - Voice AI Agent URL: [Your external AI agent link]
# - Contact Information: [Your business details]
```

---

## 🚀 Step 8: Start All Services

### 8.1 Start Platform Services
```bash
# Navigate to platform directory
cd /opt/ai-automation-platform

# Start all services with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup (if not already done)
pm2 startup
# Follow the instructions provided by PM2
```

### 8.2 Verify Services are Running
```bash
# Check PM2 status
pm2 status

# Check service logs
pm2 logs ai-automation-api --lines 50

# Check if ports are listening
netstat -tlnp | grep -E "8010|8011|8012|8013"
```

### 8.3 Test API Endpoints
```bash
# Test main API
curl -X GET http://localhost:8010/health

# Test MCP server
curl -X GET http://localhost:8011/health

# Test analytics
curl -X GET http://localhost:8013/health
```

---

## 🔗 Step 9: Configure DNS and SSL

### 9.1 Add New DNS Records
```bash
# Add these A records to your DNS provider:
api-ai.bookaistudio.com.        IN A    168.231.74.188
mcp-ai.bookaistudio.com.        IN A    168.231.74.188
dashboard-ai.bookaistudio.com.  IN A    168.231.74.188
analytics-ai.bookaistudio.com.  IN A    168.231.74.188
```

### 9.2 Generate SSL Certificates (if needed)
```bash
# If you need new certificates for the new subdomains:
certbot --nginx \
  -d api-ai.bookaistudio.com \
  -d mcp-ai.bookaistudio.com \
  -d dashboard-ai.bookaistudio.com \
  -d analytics-ai.bookaistudio.com

# Or use your existing wildcard certificate
```

---

## ✅ Step 10: Integration Testing

### 10.1 Test All Endpoints
```bash
# Test API endpoints
curl -X GET https://api-ai.bookaistudio.com/health
curl -X GET https://mcp-ai.bookaistudio.com/health
curl -X GET https://analytics-ai.bookaistudio.com/health

# Test dashboard
curl -I https://dashboard-ai.bookaistudio.com/
```

### 10.2 Test Ollama Integration
```bash
# Test Ollama connection from the platform
curl -X POST https://api-ai.bookaistudio.com/api/llm/test \
  -H "Content-Type: application/json" \
  -d '{"provider": "ollama", "model": "qwen2.5:14b", "message": "Hello"}'
```

### 10.3 Test N8N Integration
```bash
# Test N8N workflow creation
curl -X POST https://api-ai.bookaistudio.com/api/n8n/workflows \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Workflow", "description": "Integration test"}'
```

### 10.4 Test WordPress Integration
```bash
# Test WordPress connection
curl -X GET https://api-ai.bookaistudio.com/api/wordpress/sites
```

---

## 📊 Step 11: Configure Monitoring

### 11.1 Setup System Monitoring
```bash
# Create monitoring script
nano /opt/ai-automation-platform/scripts/monitor.sh
```

```bash
#!/bin/bash
# System monitoring for AI automation platform

LOG_FILE="/var/log/ai-automation/system-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check new services
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8010/health)
MCP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8011/health)
ANALYTICS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8013/health)

# Log status
echo "[$DATE] AI API: $API_STATUS, MCP: $MCP_STATUS, Analytics: $ANALYTICS_STATUS" >> $LOG_FILE

# Check PM2 processes
PM2_STATUS=$(pm2 jlist | jq -r '.[] | select(.name | startswith("ai-automation")) | .pm2_env.status' | grep -c "online")
echo "[$DATE] PM2 AI Services Online: $PM2_STATUS/4" >> $LOG_FILE

# Alert if services are down
if [ "$API_STATUS" != "200" ] || [ "$MCP_STATUS" != "200" ] || [ "$ANALYTICS_STATUS" != "200" ]; then
    echo "AI Automation services are down!" | mail -s "Service Alert" admin@bookaistudio.com
fi
```

### 11.2 Add to Crontab
```bash
# Edit crontab
crontab -e

# Add monitoring job
*/5 * * * * /opt/ai-automation-platform/scripts/monitor.sh
```

---

## 🎯 Step 12: Final Configuration

### 12.1 Configure API Keys
```bash
# Access the dashboard at: https://dashboard-ai.bookaistudio.com
# Login with admin credentials
# Navigate to Settings > API Keys
# Add your external API keys:
# - OpenAI API Key
# - Anthropic API Key
# - Google API Key
# - Any other required keys
```

### 12.2 Setup Initial Workflows
```bash
# Access N8N at: https://n8n.bookaistudio.com
# Import the provided workflow templates
# Configure connections to the new AI automation platform
```

### 12.3 Test Complete Integration
```bash
# Test the complete workflow:
# 1. Create content via API
# 2. Publish to WordPress
# 3. Share on social media via Postiz
# 4. Track analytics
# 5. Monitor revenue
```

---

## 🎉 Deployment Complete!

### Your New URLs:
- **AI Automation API**: https://api-ai.bookaistudio.com
- **Enhanced MCP Server**: https://mcp-ai.bookaistudio.com  
- **Client Dashboard**: https://dashboard-ai.bookaistudio.com
- **Revenue Analytics**: https://analytics-ai.bookaistudio.com
- **WordPress Theme**: https://wrp.bookaistudio.com (with new theme)

### Integration Points:
- ✅ **Ollama AI**: Connected to existing instance (Port 11434)
- ✅ **N8N Workflows**: Integrated with existing setup (Port 5678)
- ✅ **PostgreSQL**: New database created alongside existing
- ✅ **Redis**: Shared with existing services
- ✅ **Nginx**: New virtual hosts added to existing configuration

### Next Steps:
1. **Test all functionality** through the dashboard
2. **Configure your first automation workflows**
3. **Set up client onboarding** through the WordPress theme
4. **Start generating revenue** with the $350 training sessions
5. **Scale operations** using the billion-dollar roadmap

**🚀 Your complete AI automation empire is now live and ready for billion-dollar operations!**

