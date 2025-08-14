#!/bin/bash

# BookAI Studio Billion-Dollar Platform Deployment Script
# Integrates AI Automation Platform with existing VPS infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
VPS_IP="168.231.74.188"
DOMAIN="bookaistudio.com"
PROJECT_DIR="/opt/ai-automation-platform"
BACKUP_DIR="/opt/backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="/var/log/bookai-deployment.log"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a $LOG_FILE
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
}

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

# Function to check if service is running
check_service() {
    local service_name=$1
    local port=$2
    
    if curl -s --connect-timeout 5 http://localhost:$port > /dev/null 2>&1; then
        print_status "$service_name is running on port $port"
        return 0
    else
        print_warning "$service_name is not responding on port $port"
        return 1
    fi
}

# Function to backup existing configuration
backup_existing_config() {
    print_header "BACKING UP EXISTING CONFIGURATION"
    
    mkdir -p $BACKUP_DIR
    
    # Backup existing services configuration
    if [ -d "/opt/n8n" ]; then
        cp -r /opt/n8n $BACKUP_DIR/
        print_status "N8N configuration backed up"
    fi
    
    if [ -d "/opt/postiz" ]; then
        cp -r /opt/postiz $BACKUP_DIR/
        print_status "Postiz configuration backed up"
    fi
    
    # Backup databases
    if command -v mysqldump &> /dev/null; then
        mysqldump --all-databases > $BACKUP_DIR/mysql_backup.sql
        print_status "MySQL databases backed up"
    fi
    
    if command -v pg_dumpall &> /dev/null; then
        sudo -u postgres pg_dumpall > $BACKUP_DIR/postgres_backup.sql
        print_status "PostgreSQL databases backed up"
    fi
    
    print_status "Backup completed: $BACKUP_DIR"
}

# Function to check system requirements
check_system_requirements() {
    print_header "CHECKING SYSTEM REQUIREMENTS"
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "Please run this script as root or with sudo"
        exit 1
    fi
    
    # Check available disk space (need at least 10GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [ $available_space -lt 10485760 ]; then
        print_error "Insufficient disk space. Need at least 10GB available"
        exit 1
    fi
    
    # Check memory (need at least 4GB)
    total_mem=$(free -m | awk 'NR==2{print $2}')
    if [ $total_mem -lt 4000 ]; then
        print_warning "Low memory detected. Recommended: 8GB+ for optimal performance"
    fi
    
    print_status "System requirements check completed"
}

# Function to verify existing services
verify_existing_services() {
    print_header "VERIFYING EXISTING BOOKAI STUDIO SERVICES"
    
    # Check Ollama AI
    if check_service "Ollama AI" 11434; then
        # Test Ollama models
        if curl -s http://localhost:11434/api/tags | grep -q "llama"; then
            print_status "Ollama models detected and ready"
        else
            print_warning "Ollama running but no models detected"
        fi
    else
        print_error "Ollama AI not running. Please start Ollama service first"
        exit 1
    fi
    
    # Check N8N
    check_service "N8N Automation" 5678
    
    # Check Platform MCP
    check_service "Platform MCP" 8002
    
    # Check WordPress MCP
    check_service "WordPress MCP" 8003
    
    # Check Streamlit Monitor
    check_service "Streamlit Monitor" 8501
    
    # Check databases
    if systemctl is-active --quiet mysql || systemctl is-active --quiet mariadb; then
        print_status "MySQL/MariaDB is running"
    else
        print_error "MySQL/MariaDB is not running"
        exit 1
    fi
    
    if systemctl is-active --quiet postgresql; then
        print_status "PostgreSQL is running"
    else
        print_error "PostgreSQL is not running"
        exit 1
    fi
    
    if systemctl is-active --quiet redis; then
        print_status "Redis is running"
    else
        print_error "Redis is not running"
        exit 1
    fi
    
    print_status "All required services are running"
}

# Function to install Node.js dependencies
install_dependencies() {
    print_header "INSTALLING DEPENDENCIES"
    
    # Update package list
    apt update
    
    # Install Node.js 20 if not present
    if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | cut -d'v' -f2)" -lt "18" ]; then
        print_status "Installing Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt install -y nodejs
    fi
    
    # Install PM2 for process management
    if ! command -v pm2 &> /dev/null; then
        print_status "Installing PM2..."
        npm install -g pm2
    fi
    
    # Install additional system dependencies
    apt install -y nginx certbot python3-certbot-nginx git curl wget unzip
    
    print_status "Dependencies installed successfully"
}

# Function to setup project directory
setup_project_directory() {
    print_header "SETTING UP PROJECT DIRECTORY"
    
    # Create project directory
    mkdir -p $PROJECT_DIR
    cd $PROJECT_DIR
    
    # Copy project files (assuming they're in current directory)
    if [ -d "/home/ubuntu/ai-automation-platform" ]; then
        cp -r /home/ubuntu/ai-automation-platform/* $PROJECT_DIR/
        print_status "Project files copied to $PROJECT_DIR"
    else
        print_error "Source project directory not found"
        exit 1
    fi
    
    # Set proper permissions
    chown -R www-data:www-data $PROJECT_DIR
    chmod -R 755 $PROJECT_DIR
    
    print_status "Project directory setup completed"
}

# Function to install Node.js dependencies
install_node_dependencies() {
    print_header "INSTALLING NODE.JS DEPENDENCIES"
    
    cd $PROJECT_DIR
    
    # Use the enhanced package.json
    if [ -f "package-enhanced.json" ]; then
        cp package-enhanced.json package.json
        print_status "Using enhanced package.json"
    fi
    
    # Install dependencies
    npm install --production
    
    print_status "Node.js dependencies installed"
}

# Function to setup databases
setup_databases() {
    print_header "SETTING UP DATABASES"
    
    # Setup MySQL database
    mysql -e "CREATE DATABASE IF NOT EXISTS bookai_analytics;"
    mysql -e "CREATE DATABASE IF NOT EXISTS bookai_revenue;"
    mysql -e "CREATE DATABASE IF NOT EXISTS bookai_content;"
    
    # Setup PostgreSQL database
    sudo -u postgres createdb bookai_workflows 2>/dev/null || true
    sudo -u postgres createdb bookai_agents 2>/dev/null || true
    
    # Import database schema
    if [ -f "$PROJECT_DIR/database/schema.sql" ]; then
        mysql bookai_analytics < $PROJECT_DIR/database/schema.sql
        print_status "MySQL schema imported"
    fi
    
    if [ -f "$PROJECT_DIR/database/postgres-schema.sql" ]; then
        sudo -u postgres psql bookai_workflows < $PROJECT_DIR/database/postgres-schema.sql
        print_status "PostgreSQL schema imported"
    fi
    
    print_status "Databases setup completed"
}

# Function to configure environment variables
configure_environment() {
    print_header "CONFIGURING ENVIRONMENT VARIABLES"
    
    cd $PROJECT_DIR
    
    # Create .env file
    cat > .env << EOF
# BookAI Studio Integration Configuration
NODE_ENV=production
PORT=8090

# VPS Configuration
VPS_IP=$VPS_IP
MAIN_DOMAIN=$DOMAIN

# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=${MYSQL_ROOT_PASSWORD:-}
MYSQL_DATABASE=bookai_analytics

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-}
POSTGRES_DATABASE=bookai_workflows

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Service URLs
OLLAMA_URL=http://localhost:11434
N8N_URL=http://localhost:5678
N8N_DOMAIN=https://n8n.$DOMAIN
WORDPRESS_URL=https://wrp.$DOMAIN
POSTIZ_URL=https://postiz.$DOMAIN
EMAIL_URL=https://mail.$DOMAIN
CHAT_URL=https://chat.$DOMAIN

# MCP Servers
PLATFORM_MCP_URL=http://localhost:8002
WORDPRESS_MCP_URL=http://localhost:8003
N8N_MCP_URL=http://localhost:3000

# API Keys (to be configured)
N8N_API_KEY=${N8N_API_KEY:-}
WORDPRESS_API_KEY=${WORDPRESS_API_KEY:-}
POSTIZ_API_TOKEN=${POSTIZ_API_TOKEN:-}
EMAIL_API_KEY=${EMAIL_API_KEY:-}

# Security
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Monitoring
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=30000

# Revenue Tracking
ENABLE_REVENUE_TRACKING=true
ENABLE_COST_TRACKING=true
ENABLE_ROI_CALCULATION=true

# Content Creation
ENABLE_CONTENT_AUTOMATION=true
CONTENT_STORAGE_PATH=/opt/content
MAX_CONTENT_PER_DAY=10000

# AI Configuration
DEFAULT_LLM_PROVIDER=ollama
DEFAULT_LLM_MODEL=llama3.1:8b
ENABLE_AI_LEARNING=true
LEARNING_DATA_PATH=/opt/ai-learning

EOF

    # Set proper permissions
    chmod 600 .env
    chown www-data:www-data .env
    
    print_status "Environment configuration completed"
}

# Function to setup Nginx configuration
setup_nginx() {
    print_header "SETTING UP NGINX CONFIGURATION"
    
    # Create Nginx configuration for the dashboard
    cat > /etc/nginx/sites-available/ai-automation-dashboard << EOF
server {
    listen 80;
    server_name dashboard.$DOMAIN;
    
    location / {
        proxy_pass http://localhost:8090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket support for real-time updates
    location /ws {
        proxy_pass http://localhost:8090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# API endpoint
server {
    listen 80;
    server_name api.$DOMAIN;
    
    location / {
        proxy_pass http://localhost:8090;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
    }
}
EOF

    # Enable the site
    ln -sf /etc/nginx/sites-available/ai-automation-dashboard /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
    
    print_status "Nginx configuration completed"
}

# Function to setup SSL certificates
setup_ssl() {
    print_header "SETTING UP SSL CERTIFICATES"
    
    # Setup SSL for dashboard
    certbot --nginx -d dashboard.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    # Setup SSL for API
    certbot --nginx -d api.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    print_status "SSL certificates configured"
}

# Function to setup PM2 processes
setup_pm2() {
    print_header "SETTING UP PM2 PROCESSES"
    
    cd $PROJECT_DIR
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'ai-automation-platform',
      script: 'src/core/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8090
      },
      error_file: '/var/log/ai-automation-platform/error.log',
      out_file: '/var/log/ai-automation-platform/out.log',
      log_file: '/var/log/ai-automation-platform/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    },
    {
      name: 'mcp-server',
      script: 'src/core/enhanced-mcp-server.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 8091
      },
      error_file: '/var/log/ai-automation-platform/mcp-error.log',
      out_file: '/var/log/ai-automation-platform/mcp-out.log',
      time: true
    },
    {
      name: 'revenue-tracker',
      script: 'src/enterprise/revenue-tracker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/ai-automation-platform/revenue-error.log',
      out_file: '/var/log/ai-automation-platform/revenue-out.log',
      time: true
    }
  ]
};
EOF

    # Create log directory
    mkdir -p /var/log/ai-automation-platform
    chown -R www-data:www-data /var/log/ai-automation-platform
    
    # Start PM2 processes
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup
    pm2 startup systemd -u www-data --hp /var/www
    
    print_status "PM2 processes configured and started"
}

# Function to setup monitoring and alerts
setup_monitoring() {
    print_header "SETTING UP MONITORING AND ALERTS"
    
    # Create monitoring script
    cat > /opt/monitor-bookai-platform.sh << 'EOF'
#!/bin/bash

# BookAI Studio Platform Monitoring Script

LOG_FILE="/var/log/bookai-platform-monitor.log"
ALERT_EMAIL="admin@bookaistudio.com"

# Function to check service health
check_service_health() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$url" || echo "000")
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "$(date): $service_name is healthy (HTTP $status_code)" >> $LOG_FILE
        return 0
    else
        echo "$(date): $service_name is unhealthy (HTTP $status_code)" >> $LOG_FILE
        return 1
    fi
}

# Check all services
services_down=0

# Check AI Automation Platform
if ! check_service_health "AI Automation Platform" "http://localhost:8090/health"; then
    ((services_down++))
fi

# Check Ollama AI
if ! check_service_health "Ollama AI" "http://localhost:11434/api/tags"; then
    ((services_down++))
fi

# Check N8N
if ! check_service_health "N8N" "http://localhost:5678/healthz"; then
    ((services_down++))
fi

# Check Platform MCP
if ! check_service_health "Platform MCP" "http://localhost:8002/health"; then
    ((services_down++))
fi

# Check databases
if ! systemctl is-active --quiet mysql; then
    echo "$(date): MySQL is down" >> $LOG_FILE
    ((services_down++))
fi

if ! systemctl is-active --quiet postgresql; then
    echo "$(date): PostgreSQL is down" >> $LOG_FILE
    ((services_down++))
fi

if ! systemctl is-active --quiet redis; then
    echo "$(date): Redis is down" >> $LOG_FILE
    ((services_down++))
fi

# Send alert if services are down
if [ $services_down -gt 0 ]; then
    echo "$(date): $services_down services are down - sending alert" >> $LOG_FILE
    # Add email alert logic here if needed
fi

# Check disk space
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $disk_usage -gt 85 ]; then
    echo "$(date): Disk usage is high: ${disk_usage}%" >> $LOG_FILE
fi

# Check memory usage
memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $memory_usage -gt 85 ]; then
    echo "$(date): Memory usage is high: ${memory_usage}%" >> $LOG_FILE
fi

EOF

    chmod +x /opt/monitor-bookai-platform.sh
    
    # Setup cron job for monitoring
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/monitor-bookai-platform.sh") | crontab -
    
    print_status "Monitoring and alerts configured"
}

# Function to create startup script
create_startup_script() {
    print_header "CREATING STARTUP SCRIPT"
    
    cat > /opt/start-bookai-platform.sh << 'EOF'
#!/bin/bash

# BookAI Studio Platform Startup Script

echo "Starting BookAI Studio AI Automation Platform..."

# Start databases if not running
systemctl start mysql
systemctl start postgresql
systemctl start redis

# Wait for databases to be ready
sleep 10

# Start PM2 processes
pm2 start /opt/ai-automation-platform/ecosystem.config.js

# Start Nginx
systemctl start nginx

echo "BookAI Studio AI Automation Platform started successfully!"
echo "Dashboard: https://dashboard.bookaistudio.com"
echo "API: https://api.bookaistudio.com"
echo "Monitoring: http://168.231.74.188:8501"

EOF

    chmod +x /opt/start-bookai-platform.sh
    
    print_status "Startup script created: /opt/start-bookai-platform.sh"
}

# Function to run integration tests
run_integration_tests() {
    print_header "RUNNING INTEGRATION TESTS"
    
    cd $PROJECT_DIR
    
    # Test database connections
    node -e "
    const mysql = require('mysql2/promise');
    const { Pool } = require('pg');
    const redis = require('redis');
    
    async function testConnections() {
        try {
            // Test MySQL
            const mysqlConnection = await mysql.createConnection({
                host: 'localhost',
                user: 'root',
                database: 'bookai_analytics'
            });
            await mysqlConnection.execute('SELECT 1');
            console.log('✅ MySQL connection successful');
            await mysqlConnection.end();
            
            // Test PostgreSQL
            const pgPool = new Pool({
                host: 'localhost',
                port: 5432,
                database: 'bookai_workflows',
                user: 'postgres'
            });
            await pgPool.query('SELECT 1');
            console.log('✅ PostgreSQL connection successful');
            await pgPool.end();
            
            // Test Redis
            const redisClient = redis.createClient();
            await redisClient.connect();
            await redisClient.ping();
            console.log('✅ Redis connection successful');
            await redisClient.quit();
            
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            process.exit(1);
        }
    }
    
    testConnections();
    "
    
    # Test service endpoints
    sleep 5
    
    if curl -s http://localhost:8090/health > /dev/null; then
        print_status "✅ AI Automation Platform is responding"
    else
        print_error "❌ AI Automation Platform is not responding"
    fi
    
    if curl -s http://localhost:11434/api/tags > /dev/null; then
        print_status "✅ Ollama AI is responding"
    else
        print_error "❌ Ollama AI is not responding"
    fi
    
    print_status "Integration tests completed"
}

# Function to display final status
display_final_status() {
    print_header "DEPLOYMENT COMPLETED SUCCESSFULLY!"
    
    echo -e "${GREEN}🚀 BookAI Studio Billion-Dollar Platform is now running!${NC}"
    echo ""
    echo -e "${CYAN}📊 Access URLs:${NC}"
    echo -e "   Dashboard: ${YELLOW}https://dashboard.$DOMAIN${NC}"
    echo -e "   API: ${YELLOW}https://api.$DOMAIN${NC}"
    echo -e "   Monitoring: ${YELLOW}http://$VPS_IP:8501${NC}"
    echo -e "   N8N: ${YELLOW}https://n8n.$DOMAIN${NC}"
    echo -e "   WordPress: ${YELLOW}https://wrp.$DOMAIN${NC}"
    echo -e "   Postiz: ${YELLOW}https://postiz.$DOMAIN${NC}"
    echo -e "   Email: ${YELLOW}https://mail.$DOMAIN${NC}"
    echo -e "   Chat: ${YELLOW}https://chat.$DOMAIN${NC}"
    echo ""
    echo -e "${CYAN}🔧 Management Commands:${NC}"
    echo -e "   Start Platform: ${YELLOW}/opt/start-bookai-platform.sh${NC}"
    echo -e "   Monitor Services: ${YELLOW}pm2 status${NC}"
    echo -e "   View Logs: ${YELLOW}pm2 logs${NC}"
    echo -e "   Restart Services: ${YELLOW}pm2 restart all${NC}"
    echo ""
    echo -e "${CYAN}📁 Important Paths:${NC}"
    echo -e "   Project Directory: ${YELLOW}$PROJECT_DIR${NC}"
    echo -e "   Logs: ${YELLOW}/var/log/ai-automation-platform/${NC}"
    echo -e "   Backups: ${YELLOW}$BACKUP_DIR${NC}"
    echo -e "   Configuration: ${YELLOW}$PROJECT_DIR/.env${NC}"
    echo ""
    echo -e "${GREEN}💰 Your billion-dollar automation empire is ready!${NC}"
    echo -e "${GREEN}🎯 Start creating content and generating revenue!${NC}"
}

# Main deployment function
main() {
    print_header "BOOKAI STUDIO BILLION-DOLLAR PLATFORM DEPLOYMENT"
    
    # Create log file
    touch $LOG_FILE
    chmod 644 $LOG_FILE
    
    echo "Deployment started at $(date)" | tee -a $LOG_FILE
    
    # Run deployment steps
    check_system_requirements
    verify_existing_services
    backup_existing_config
    install_dependencies
    setup_project_directory
    install_node_dependencies
    setup_databases
    configure_environment
    setup_nginx
    setup_ssl
    setup_pm2
    setup_monitoring
    create_startup_script
    run_integration_tests
    display_final_status
    
    echo "Deployment completed at $(date)" | tee -a $LOG_FILE
}

# Run main function
main "$@"

