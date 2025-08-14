#!/bin/bash

# BookAI Studio - Quick Deployment Script
# This script provides a simplified deployment process for immediate setup

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 BookAI Studio - Quick AI Automation Deployment${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

# Configuration
PLATFORM_DIR="/opt/ai-automation-platform"
CURRENT_DIR=$(pwd)

# Function to log messages
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

# Step 1: Create directories
log "Creating deployment directories..."
mkdir -p "$PLATFORM_DIR"
mkdir -p "/var/log/ai-automation"
mkdir -p "/var/www/wordpress-themes"
mkdir -p "/var/www/dashboards"

# Step 2: Copy platform files
log "Copying platform files..."
if [ -d "$CURRENT_DIR/ai-automation-platform" ]; then
    cp -r "$CURRENT_DIR/ai-automation-platform/"* "$PLATFORM_DIR/"
    log "Main platform files copied"
else
    log_warning "ai-automation-platform directory not found in current directory"
fi

if [ -d "$CURRENT_DIR/ai-agency-theme" ]; then
    cp -r "$CURRENT_DIR/ai-agency-theme" "/var/www/wordpress-themes/"
    log "WordPress theme copied"
else
    log_warning "ai-agency-theme directory not found"
fi

if [ -d "$CURRENT_DIR/ai-agency-dashboard" ]; then
    cp -r "$CURRENT_DIR/ai-agency-dashboard" "/var/www/dashboards/"
    log "Dashboard files copied"
else
    log_warning "ai-agency-dashboard directory not found"
fi

# Step 3: Set permissions
log "Setting proper permissions..."
chown -R ubuntu:ubuntu "$PLATFORM_DIR"
chown -R ubuntu:ubuntu "/var/log/ai-automation"
chown -R www-data:www-data "/var/www/wordpress-themes"
chown -R www-data:www-data "/var/www/dashboards"

# Step 4: Install dependencies
log "Installing platform dependencies..."
cd "$PLATFORM_DIR"

# Install Node.js dependencies as ubuntu user
sudo -u ubuntu npm install --production

# Step 5: Build dashboard
log "Building client dashboard..."
cd "/var/www/dashboards/ai-agency-dashboard"
sudo -u ubuntu npm install
sudo -u ubuntu npm run build

# Step 6: Create basic environment file
log "Creating environment configuration..."
cd "$PLATFORM_DIR"

cat > .env.production << EOF
NODE_ENV=production

# API Ports
API_PORT=8010
MCP_PORT=8011
DASHBOARD_PORT=8012
ANALYTICS_PORT=8013

# Database (update with your credentials)
DATABASE_URL=postgresql://ai_automation:your_password@localhost:5432/ai_automation_platform
REDIS_URL=redis://localhost:6379

# Ollama (existing setup)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen2.5:14b

# Security (generate new keys for production)
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
API_KEY_SECRET=$(openssl rand -base64 32)

# Domains
MAIN_DOMAIN=bookaistudio.com
API_AI_DOMAIN=api-ai.bookaistudio.com
MCP_AI_DOMAIN=mcp-ai.bookaistudio.com
DASHBOARD_AI_DOMAIN=dashboard-ai.bookaistudio.com
ANALYTICS_AI_DOMAIN=analytics-ai.bookaistudio.com

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/ai-automation/app.log
EOF

chmod 600 .env.production
chown ubuntu:ubuntu .env.production

# Step 7: Create PM2 ecosystem
log "Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'ai-automation-api',
      script: 'src/core/server.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 8010
      },
      error_file: '/var/log/ai-automation/api-error.log',
      out_file: '/var/log/ai-automation/api-out.log',
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
      time: true,
      max_memory_restart: '512M'
    }
  ]
};
EOF

chown ubuntu:ubuntu ecosystem.config.js

# Step 8: Create basic Nginx configuration
log "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/ai-automation-quick << 'EOF'
# Quick AI Automation Platform Configuration

upstream ai_automation_api {
    server 127.0.0.1:8010;
}

upstream ai_automation_mcp {
    server 127.0.0.1:8011;
}

# AI API (HTTP for testing)
server {
    listen 8020;
    server_name localhost;

    location / {
        proxy_pass http://ai_automation_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# MCP Server (HTTP for testing)
server {
    listen 8021;
    server_name localhost;

    location / {
        proxy_pass http://ai_automation_mcp;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Dashboard (static files)
server {
    listen 8022;
    server_name localhost;

    root /var/www/dashboards/ai-agency-dashboard/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Enable the configuration
ln -sf /etc/nginx/sites-available/ai-automation-quick /etc/nginx/sites-enabled/

# Test and reload Nginx
if nginx -t; then
    systemctl reload nginx
    log "Nginx configuration updated"
else
    log_error "Nginx configuration test failed"
fi

# Step 9: Start services
log "Starting AI automation services..."
cd "$PLATFORM_DIR"

# Start with PM2 as ubuntu user
sudo -u ubuntu pm2 start ecosystem.config.js

# Step 10: Test services
log "Testing services..."
sleep 5

# Test API
if curl -s http://localhost:8010/health > /dev/null 2>&1; then
    log "✅ AI API is responding"
else
    log_warning "❌ AI API is not responding"
fi

# Test MCP
if curl -s http://localhost:8011/health > /dev/null 2>&1; then
    log "✅ MCP Server is responding"
else
    log_warning "❌ MCP Server is not responding"
fi

# Display results
echo ""
echo -e "${GREEN}🎉 Quick Deployment Completed!${NC}"
echo -e "${BLUE}=============================${NC}"
echo ""
echo -e "${YELLOW}Test URLs (HTTP):${NC}"
echo -e "  • AI API: http://168.231.74.188:8020"
echo -e "  • MCP Server: http://168.231.74.188:8021"
echo -e "  • Dashboard: http://168.231.74.188:8022"
echo ""
echo -e "${YELLOW}Service Status:${NC}"
sudo -u ubuntu pm2 status
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Test the URLs above"
echo -e "  2. Configure database credentials in .env.production"
echo -e "  3. Run full deployment script for HTTPS setup"
echo -e "  4. Add DNS records for production domains"
echo ""
echo -e "${GREEN}Platform is ready for testing! 🚀${NC}"

