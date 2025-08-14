#!/bin/bash

# BookAI Studio - AI Automation Platform Deployment Script
# This script automates the deployment of the complete AI automation platform
# to your existing BookAI Studio VPS infrastructure

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PLATFORM_DIR="/opt/ai-automation-platform"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/ai-automation/deployment.log"
DOMAIN="bookaistudio.com"
VPS_IP="168.231.74.188"

# Ports for new services
API_PORT=8010
MCP_PORT=8011
DASHBOARD_PORT=8012
ANALYTICS_PORT=8013

echo -e "${BLUE}🚀 BookAI Studio - AI Automation Platform Deployment${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Function to log messages
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$timestamp]${NC} $message"
    echo "[$timestamp] $message" >> "$LOG_FILE"
}

# Function to log errors
log_error() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[$timestamp] ERROR:${NC} $message"
    echo "[$timestamp] ERROR: $message" >> "$LOG_FILE"
}

# Function to log warnings
log_warning() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[$timestamp] WARNING:${NC} $message"
    echo "[$timestamp] WARNING: $message" >> "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
check_port() {
    local port=$1
    if netstat -tlnp | grep -q ":$port "; then
        log_warning "Port $port is already in use"
        return 1
    else
        log_message "Port $port is available"
        return 0
    fi
}

# Function to backup current configuration
backup_configuration() {
    log_message "Creating backup of current configuration..."
    
    # Create backup directory with timestamp
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local current_backup_dir="$BACKUP_DIR/deployment-backup-$backup_timestamp"
    
    mkdir -p "$current_backup_dir"
    
    # Backup Nginx configuration
    if [ -d "/etc/nginx/sites-available" ]; then
        cp -r /etc/nginx/sites-available "$current_backup_dir/nginx-sites-available"
        log_message "Nginx configuration backed up"
    fi
    
    # Backup PM2 configuration
    if command_exists pm2; then
        pm2 save
        cp ~/.pm2/dump.pm2 "$current_backup_dir/pm2-dump.pm2" 2>/dev/null || true
        log_message "PM2 configuration backed up"
    fi
    
    # Backup current services list
    systemctl list-units --state=running > "$current_backup_dir/running-services.txt"
    netstat -tlnp > "$current_backup_dir/port-status.txt"
    
    log_message "Backup completed: $current_backup_dir"
}

# Function to check system requirements
check_requirements() {
    log_message "Checking system requirements..."
    
    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root or with sudo"
        exit 1
    fi
    
    # Check Ubuntu version
    if ! grep -q "Ubuntu 22.04" /etc/os-release; then
        log_warning "This script is optimized for Ubuntu 22.04"
    fi
    
    # Check available disk space (minimum 5GB)
    local available_space=$(df / | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 5242880 ]; then  # 5GB in KB
        log_error "Insufficient disk space. At least 5GB required."
        exit 1
    fi
    
    # Check available memory (minimum 2GB)
    local available_memory=$(free -m | awk 'NR==2{print $7}')
    if [ "$available_memory" -lt 2048 ]; then
        log_warning "Low available memory. At least 2GB recommended."
    fi
    
    # Check required commands
    local required_commands=("node" "npm" "nginx" "postgresql" "redis-server")
    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            log_error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    log_message "System requirements check completed"
}

# Function to check port availability
check_ports() {
    log_message "Checking port availability..."
    
    local ports=($API_PORT $MCP_PORT $DASHBOARD_PORT $ANALYTICS_PORT)
    local unavailable_ports=()
    
    for port in "${ports[@]}"; do
        if ! check_port "$port"; then
            unavailable_ports+=($port)
        fi
    done
    
    if [ ${#unavailable_ports[@]} -gt 0 ]; then
        log_error "The following ports are unavailable: ${unavailable_ports[*]}"
        log_error "Please stop services using these ports or modify the configuration"
        exit 1
    fi
    
    log_message "All required ports are available"
}

# Function to setup directories
setup_directories() {
    log_message "Setting up directories..."
    
    # Create main platform directory
    mkdir -p "$PLATFORM_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "/var/log/ai-automation"
    mkdir -p "/var/www/wordpress-themes"
    mkdir -p "/var/www/dashboards"
    
    # Set proper ownership
    chown -R ubuntu:ubuntu "$PLATFORM_DIR"
    chown -R ubuntu:ubuntu "/var/log/ai-automation"
    chown -R www-data:www-data "/var/www/wordpress-themes"
    chown -R www-data:www-data "/var/www/dashboards"
    
    log_message "Directories created successfully"
}

# Function to install dependencies
install_dependencies() {
    log_message "Installing dependencies..."
    
    # Update package list
    apt update
    
    # Install Node.js 18 if needed
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log_message "Updating Node.js to version 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    fi
    
    # Install PM2 globally if not present
    if ! command_exists pm2; then
        npm install -g pm2
        log_message "PM2 installed globally"
    fi
    
    # Install additional tools
    npm install -g @nestjs/cli
    
    log_message "Dependencies installed successfully"
}

# Function to setup database
setup_database() {
    log_message "Setting up database..."
    
    # Generate secure password if not provided
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(openssl rand -base64 32)
        log_message "Generated secure database password"
    fi
    
    # Create database and user
    sudo -u postgres psql << EOF
CREATE DATABASE ai_automation_platform;
CREATE USER ai_automation WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE ai_automation_platform TO ai_automation;
ALTER USER ai_automation CREATEDB;
\q
EOF
    
    log_message "Database setup completed"
    
    # Save database credentials
    echo "DB_PASSWORD=$DB_PASSWORD" >> "$PLATFORM_DIR/.env.production"
}

# Function to configure environment
configure_environment() {
    log_message "Configuring environment..."
    
    # Create environment file
    cat > "$PLATFORM_DIR/.env.production" << EOF
# AI Automation Platform Configuration
NODE_ENV=production

# API Configuration
API_PORT=$API_PORT
MCP_PORT=$MCP_PORT
DASHBOARD_PORT=$DASHBOARD_PORT
ANALYTICS_PORT=$ANALYTICS_PORT

# Database Configuration
DATABASE_URL=postgresql://ai_automation:$DB_PASSWORD@localhost:5432/ai_automation_platform
REDIS_URL=redis://localhost:6379

# Ollama Configuration (existing setup)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen2.5:14b

# Security
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
API_KEY_SECRET=$(openssl rand -base64 32)

# BookAI Studio Integration
MAIN_DOMAIN=$DOMAIN
CHAT_DOMAIN=chat.$DOMAIN
WORDPRESS_DOMAIN=wrp.$DOMAIN
POSTIZ_DOMAIN=postiz.$DOMAIN
N8N_DOMAIN=n8n.$DOMAIN
MAIL_DOMAIN=mail.$DOMAIN

# New AI Services
API_AI_DOMAIN=api-ai.$DOMAIN
MCP_AI_DOMAIN=mcp-ai.$DOMAIN
DASHBOARD_AI_DOMAIN=dashboard-ai.$DOMAIN
ANALYTICS_AI_DOMAIN=analytics-ai.$DOMAIN

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/ai-automation/app.log
EOF
    
    # Set proper permissions
    chmod 600 "$PLATFORM_DIR/.env.production"
    chown ubuntu:ubuntu "$PLATFORM_DIR/.env.production"
    
    log_message "Environment configuration completed"
}

# Function to configure Nginx
configure_nginx() {
    log_message "Configuring Nginx..."
    
    # Create Nginx configuration
    cat > /etc/nginx/sites-available/ai-automation-platform << 'EOF'
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

# Rate limiting
limit_req_zone $binary_remote_addr zone=ai_api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=ai_dashboard:10m rate=5r/s;

# AI Automation API
server {
    listen 443 ssl http2;
    server_name api-ai.bookaistudio.com;

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

    root /var/www/dashboards/ai-agency-dashboard/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

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

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api-ai.bookaistudio.com mcp-ai.bookaistudio.com dashboard-ai.bookaistudio.com analytics-ai.bookaistudio.com;
    return 301 https://$server_name$request_uri;
}
EOF
    
    # Enable the site
    ln -sf /etc/nginx/sites-available/ai-automation-platform /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    if nginx -t; then
        log_message "Nginx configuration is valid"
        systemctl reload nginx
        log_message "Nginx reloaded successfully"
    else
        log_error "Nginx configuration test failed"
        exit 1
    fi
}

# Function to create PM2 ecosystem
create_pm2_ecosystem() {
    log_message "Creating PM2 ecosystem configuration..."
    
    cat > "$PLATFORM_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'ai-automation-api',
      script: 'src/core/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: $API_PORT
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
        PORT: $MCP_PORT
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
        PORT: $ANALYTICS_PORT
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
EOF
    
    chown ubuntu:ubuntu "$PLATFORM_DIR/ecosystem.config.js"
    log_message "PM2 ecosystem configuration created"
}

# Function to setup monitoring
setup_monitoring() {
    log_message "Setting up monitoring..."
    
    # Create monitoring script
    cat > "$PLATFORM_DIR/scripts/monitor.sh" << 'EOF'
#!/bin/bash
# AI Automation Platform Monitoring Script

LOG_FILE="/var/log/ai-automation/system-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check service health
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8010/health)
MCP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8011/health)
ANALYTICS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8013/health)

# Log status
echo "[$DATE] AI API: $API_STATUS, MCP: $MCP_STATUS, Analytics: $ANALYTICS_STATUS" >> $LOG_FILE

# Check PM2 processes
PM2_STATUS=$(pm2 jlist | jq -r '.[] | select(.name | startswith("ai-automation")) | .pm2_env.status' | grep -c "online")
echo "[$DATE] PM2 AI Services Online: $PM2_STATUS/4" >> $LOG_FILE

# System resources
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.2f"), $3/$2 * 100.0}')
echo "[$DATE] CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%" >> $LOG_FILE

# Alert if services are down
if [ "$API_STATUS" != "200" ] || [ "$MCP_STATUS" != "200" ] || [ "$ANALYTICS_STATUS" != "200" ]; then
    echo "AI Automation services are down!" | mail -s "Service Alert" admin@bookaistudio.com 2>/dev/null || true
fi
EOF
    
    chmod +x "$PLATFORM_DIR/scripts/monitor.sh"
    
    # Add to crontab for ubuntu user
    (crontab -u ubuntu -l 2>/dev/null; echo "*/5 * * * * $PLATFORM_DIR/scripts/monitor.sh") | crontab -u ubuntu -
    
    log_message "Monitoring setup completed"
}

# Function to setup log rotation
setup_log_rotation() {
    log_message "Setting up log rotation..."
    
    cat > /etc/logrotate.d/ai-automation << 'EOF'
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
EOF
    
    log_message "Log rotation configured"
}

# Function to run database migrations
run_migrations() {
    log_message "Running database migrations..."
    
    cd "$PLATFORM_DIR"
    
    # Install dependencies
    sudo -u ubuntu npm install --production
    
    # Run migrations
    sudo -u ubuntu npm run migrate:production 2>/dev/null || log_warning "Migration script not found, skipping..."
    
    # Seed initial data
    sudo -u ubuntu npm run seed:production 2>/dev/null || log_warning "Seed script not found, skipping..."
    
    log_message "Database migrations completed"
}

# Function to start services
start_services() {
    log_message "Starting AI automation services..."
    
    cd "$PLATFORM_DIR"
    
    # Start services with PM2 as ubuntu user
    sudo -u ubuntu pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    sudo -u ubuntu pm2 save
    
    # Setup PM2 startup
    sudo -u ubuntu pm2 startup systemd -u ubuntu --hp /home/ubuntu
    
    log_message "Services started successfully"
}

# Function to verify deployment
verify_deployment() {
    log_message "Verifying deployment..."
    
    # Wait for services to start
    sleep 10
    
    # Check if services are responding
    local services=(
        "http://localhost:$API_PORT/health"
        "http://localhost:$MCP_PORT/health"
        "http://localhost:$ANALYTICS_PORT/health"
    )
    
    local failed_services=()
    
    for service in "${services[@]}"; do
        if ! curl -s -f "$service" > /dev/null; then
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        log_error "The following services failed to start: ${failed_services[*]}"
        return 1
    fi
    
    # Check PM2 status
    local pm2_status=$(sudo -u ubuntu pm2 jlist | jq -r '.[] | select(.name | startswith("ai-automation")) | .pm2_env.status' | grep -c "online")
    
    if [ "$pm2_status" -eq 4 ]; then
        log_message "All 4 AI automation services are running"
    else
        log_warning "Only $pm2_status/4 AI automation services are running"
    fi
    
    log_message "Deployment verification completed"
}

# Function to display final information
display_final_info() {
    echo ""
    echo -e "${GREEN}🎉 Deployment Completed Successfully!${NC}"
    echo -e "${BLUE}=================================${NC}"
    echo ""
    echo -e "${YELLOW}New Service URLs:${NC}"
    echo -e "  • AI Automation API: https://api-ai.$DOMAIN"
    echo -e "  • Enhanced MCP Server: https://mcp-ai.$DOMAIN"
    echo -e "  • Client Dashboard: https://dashboard-ai.$DOMAIN"
    echo -e "  • Revenue Analytics: https://analytics-ai.$DOMAIN"
    echo ""
    echo -e "${YELLOW}Integration Points:${NC}"
    echo -e "  • Ollama AI: http://localhost:11434 (existing)"
    echo -e "  • N8N Workflows: https://n8n.$DOMAIN (existing)"
    echo -e "  • WordPress: https://wrp.$DOMAIN (existing)"
    echo -e "  • Postiz: https://postiz.$DOMAIN (existing)"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "  1. Add DNS records for new subdomains"
    echo -e "  2. Test all endpoints and integrations"
    echo -e "  3. Configure API keys in the dashboard"
    echo -e "  4. Install WordPress theme"
    echo -e "  5. Start creating automation workflows"
    echo ""
    echo -e "${YELLOW}Important Files:${NC}"
    echo -e "  • Platform Directory: $PLATFORM_DIR"
    echo -e "  • Environment Config: $PLATFORM_DIR/.env.production"
    echo -e "  • Logs Directory: /var/log/ai-automation/"
    echo -e "  • Backup Directory: $BACKUP_DIR"
    echo ""
    echo -e "${GREEN}Your billion-dollar AI automation empire is ready! 🚀${NC}"
}

# Main deployment function
main() {
    # Create log directory
    mkdir -p "/var/log/ai-automation"
    touch "$LOG_FILE"
    
    log_message "Starting BookAI Studio AI Automation Platform deployment"
    
    # Run deployment steps
    check_requirements
    check_ports
    backup_configuration
    setup_directories
    install_dependencies
    setup_database
    configure_environment
    configure_nginx
    create_pm2_ecosystem
    setup_monitoring
    setup_log_rotation
    
    # Note: Platform files need to be copied manually before running migrations
    log_warning "Please copy platform files to $PLATFORM_DIR before continuing"
    read -p "Press Enter after copying platform files to continue..."
    
    run_migrations
    start_services
    verify_deployment
    display_final_info
    
    log_message "Deployment completed successfully"
}

# Run main function
main "$@"

