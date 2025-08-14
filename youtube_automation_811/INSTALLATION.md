# AI Automation Platform - Installation Guide

## Overview

The AI Automation Platform is a comprehensive system that integrates with your existing BookAI Studio infrastructure to provide advanced automation capabilities across VPS management, N8N workflows, WordPress sites, social media (Postiz), and affiliate marketing.

## Prerequisites

### System Requirements
- **Operating System**: Ubuntu 22.04 LTS or later
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: Minimum 50GB free space
- **Network**: Stable internet connection with public IP
- **Node.js**: Version 18.0 or later
- **PostgreSQL**: Version 14 or later
- **Redis**: Version 6.0 or later

### Existing Infrastructure
This platform is designed to integrate with your existing BookAI Studio setup:
- **Domain**: bookaistudio.com
- **Subdomains**: 
  - chat.bookaistudio.com
  - wrp.bookaistudio.com (WordPress)
  - postiz.bookaistudio.com (Postiz)
  - mail.bookaistudio.com (Email server)
  - n8n.bookaistudio.com (N8N workflows)

### Required Services
Ensure these services are running on your VPS:
- **Ollama AI Server** (Port 11434)
- **N8N Automation** (Port 5678)
- **PostgreSQL Database** (Port 5432)
- **Redis Cache** (Port 6379)
- **Nginx Web Server** (Ports 80, 443)

## Installation Steps

### Step 1: Download and Extract Platform

```bash
# Navigate to your home directory
cd /home/ubuntu

# If you have the platform files, extract them
# Otherwise, clone from your repository
git clone <your-repository-url> ai-automation-platform
cd ai-automation-platform
```

### Step 2: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Or if using pnpm
pnpm install

# Install Python dependencies for automation scripts
pip3 install -r requirements.txt
```

### Step 3: Database Setup

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE ai_automation;
CREATE USER ai_automation_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ai_automation TO ai_automation_user;
\q

# Import database schema
psql -U ai_automation_user -d ai_automation -f database/schema.sql
```

### Step 4: Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

Configure the following variables in `.env`:

```env
# Database Configuration
DATABASE_URL=postgresql://ai_automation_user:your_secure_password@localhost:5432/ai_automation
REDIS_URL=redis://localhost:6379

# Encryption Key (generate a secure 32-character key)
ENCRYPTION_KEY=your_32_character_encryption_key_here

# BookAI Studio Integration
BOOKAI_DOMAIN=bookaistudio.com
CHAT_SUBDOMAIN=chat.bookaistudio.com
WORDPRESS_SUBDOMAIN=wrp.bookaistudio.com
POSTIZ_SUBDOMAIN=postiz.bookaistudio.com
MAIL_SUBDOMAIN=mail.bookaistudio.com
N8N_SUBDOMAIN=n8n.bookaistudio.com

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Server Configuration
PORT=8000
NODE_ENV=production

# MCP Server Configuration
MCP_PORT=8002
MCP_HOST=0.0.0.0

# API Keys (add as needed)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
GOOGLE_API_KEY=your_google_key_here
```

### Step 5: SSL Certificate Setup

```bash
# Install Certbot if not already installed
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Generate SSL certificates for the platform
sudo certbot --nginx -d dashboard.bookaistudio.com
sudo certbot --nginx -d api.bookaistudio.com
```

### Step 6: Nginx Configuration

Create Nginx configuration for the platform:

```bash
sudo nano /etc/nginx/sites-available/ai-automation-platform
```

Add the following configuration:

```nginx
# Dashboard
server {
    listen 443 ssl http2;
    server_name dashboard.bookaistudio.com;
    
    ssl_certificate /etc/letsencrypt/live/dashboard.bookaistudio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.bookaistudio.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# API
server {
    listen 443 ssl http2;
    server_name api.bookaistudio.com;
    
    ssl_certificate /etc/letsencrypt/live/api.bookaistudio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.bookaistudio.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# MCP Server
server {
    listen 443 ssl http2;
    server_name mcp.bookaistudio.com;
    
    ssl_certificate /etc/letsencrypt/live/mcp.bookaistudio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.bookaistudio.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration:

```bash
sudo ln -s /etc/nginx/sites-available/ai-automation-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: PM2 Process Management

Install and configure PM2 for process management:

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cp ecosystem.config.js.example ecosystem.config.js

# Edit the configuration
nano ecosystem.config.js
```

Configure PM2 ecosystem:

```javascript
module.exports = {
  apps: [
    {
      name: 'ai-automation-main',
      script: 'src/core/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      }
    },
    {
      name: 'ai-automation-api',
      script: 'src/api/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8001
      }
    },
    {
      name: 'ai-automation-mcp',
      script: 'src/core/enhanced-mcp-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8002
      }
    }
  ]
};
```

### Step 8: Start Services

```bash
# Start all services with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

### Step 9: Verify Installation

```bash
# Check service status
pm2 status

# Check logs
pm2 logs

# Test database connection
npm run test:db

# Test API endpoints
curl https://api.bookaistudio.com/health
curl https://dashboard.bookaistudio.com/health
curl https://mcp.bookaistudio.com/health
```

## Post-Installation Configuration

### 1. Initial Admin Setup

Visit `https://dashboard.bookaistudio.com` and complete the initial setup:

1. Create admin account
2. Configure LLM providers
3. Set up integrations
4. Test basic functionality

### 2. Integration Configuration

#### N8N Integration
1. Go to N8N settings in the dashboard
2. Enter your N8N instance URL: `https://n8n.bookaistudio.com`
3. Configure API credentials
4. Test connection

#### WordPress Integration
1. Navigate to WordPress settings
2. Add your WordPress sites
3. Configure API keys for each site
4. Test content creation capabilities

#### Postiz Integration
1. Access Postiz configuration
2. Enter Postiz instance URL: `https://postiz.bookaistudio.com`
3. Configure social media accounts
4. Test posting capabilities

#### Affiliate Networks
1. Go to Affiliate settings
2. Add your affiliate network credentials
3. Configure tracking parameters
4. Test product research functionality

### 3. Security Configuration

```bash
# Set up firewall rules
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Secure database
sudo -u postgres psql
ALTER USER ai_automation_user WITH PASSWORD 'new_very_secure_password';
\q

# Update environment file with new password
nano .env
```

### 4. Backup Configuration

```bash
# Create backup directory
sudo mkdir -p /backup/ai-automation

# Set up automated database backups
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * pg_dump -U ai_automation_user ai_automation > /backup/ai-automation/db_$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l | grep ai_automation

# Test connection
psql -U ai_automation_user -d ai_automation -c "SELECT version();"
```

#### 2. Redis Connection Failed
```bash
# Check Redis status
sudo systemctl status redis

# Test Redis connection
redis-cli ping
```

#### 3. Ollama Not Responding
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Restart Ollama if needed
sudo systemctl restart ollama
```

#### 4. SSL Certificate Issues
```bash
# Renew certificates
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

#### 5. PM2 Process Issues
```bash
# Restart all processes
pm2 restart all

# Check process logs
pm2 logs --lines 100

# Monitor processes
pm2 monit
```

### Log Locations

- **Application Logs**: `~/.pm2/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **PostgreSQL Logs**: `/var/log/postgresql/`
- **System Logs**: `/var/log/syslog`

### Performance Monitoring

```bash
# Check system resources
htop

# Monitor database performance
sudo -u postgres psql ai_automation -c "SELECT * FROM pg_stat_activity;"

# Check disk usage
df -h

# Monitor network connections
netstat -tulpn
```

## Maintenance

### Regular Tasks

#### Daily
- Check PM2 process status
- Monitor log files for errors
- Verify backup completion

#### Weekly
- Update system packages
- Review performance metrics
- Clean up old log files

#### Monthly
- Update SSL certificates (automatic with certbot)
- Review and optimize database
- Update platform dependencies

### Update Procedure

```bash
# Stop services
pm2 stop all

# Backup current installation
cp -r ai-automation-platform ai-automation-platform-backup

# Pull updates
git pull origin main

# Install new dependencies
npm install

# Run database migrations if needed
npm run migrate

# Restart services
pm2 start all

# Verify functionality
npm run test
```

## Support

For technical support and troubleshooting:

1. Check the logs first: `pm2 logs`
2. Review this documentation
3. Check the API documentation at `https://api.bookaistudio.com/docs`
4. Contact system administrator

## Security Notes

- Change all default passwords
- Regularly update system packages
- Monitor access logs
- Use strong encryption keys
- Implement proper backup procedures
- Regular security audits recommended

---

**Installation Complete!** Your AI Automation Platform should now be running at:
- **Dashboard**: https://dashboard.bookaistudio.com
- **API**: https://api.bookaistudio.com
- **MCP Server**: https://mcp.bookaistudio.com

