#!/bin/bash

# Phase 1: Deployment Automation Script
# Target: Deploy and integrate all Phase 1 components
# Timeline: Week 6

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
LOG_FILE="/var/log/phase1-deployment.log"
BACKUP_DIR="/opt/backups/phase1_deployment_$(date +%Y%m%d_%H%M%S)"

# Phase 1 Components
COMPONENTS=(
    "infrastructure-scaling"
    "revenue-optimization"
    "content-production"
    "monitoring-dashboard"
    "api-endpoints"
)

print_status() {
    echo -e "${GREEN}[DEPLOY]${NC} $1" | tee -a $LOG_FILE
}

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

# Function to check prerequisites
check_prerequisites() {
    print_header "CHECKING DEPLOYMENT PREREQUISITES"
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "Please run this script as root or with sudo"
        exit 1
    fi
    
    # Check system resources
    cpu_cores=$(nproc)
    memory_gb=$(free -g | awk 'NR==2{print $2}')
    disk_gb=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    
    print_status "System Resources:"
    print_status "  CPU Cores: $cpu_cores"
    print_status "  Memory: ${memory_gb}GB"
    print_status "  Available Disk: ${disk_gb}GB"
    
    # Minimum requirements check
    if [ "$cpu_cores" -lt 4 ]; then
        print_error "Minimum 4 CPU cores required for Phase 1"
        exit 1
    fi
    
    if [ "$memory_gb" -lt 8 ]; then
        print_error "Minimum 8GB RAM required for Phase 1"
        exit 1
    fi
    
    if [ "$disk_gb" -lt 50 ]; then
        print_error "Minimum 50GB free disk space required for Phase 1"
        exit 1
    fi
    
    # Check required services
    services=("mysql" "postgresql" "redis" "nginx" "docker")
    for service in "${services[@]}"; do
        if systemctl is-active --quiet $service 2>/dev/null; then
            print_status "✅ $service is running"
        else
            print_warning "⚠️  $service is not running - will attempt to start"
        fi
    done
    
    # Check Ollama cluster
    ollama_ports=(11434 11435 11436 11437)
    ollama_running=0
    for port in "${ollama_ports[@]}"; do
        if curl -s http://localhost:$port/api/tags > /dev/null 2>&1; then
            ollama_running=$((ollama_running + 1))
        fi
    done
    
    print_status "Ollama cluster: $ollama_running/4 instances running"
    
    if [ "$ollama_running" -lt 2 ]; then
        print_error "At least 2 Ollama instances required for Phase 1"
        exit 1
    fi
    
    print_status "Prerequisites check completed"
}

# Function to create project structure
create_project_structure() {
    print_header "CREATING PROJECT STRUCTURE"
    
    # Create main project directory
    mkdir -p $PROJECT_DIR
    cd $PROJECT_DIR
    
    # Create directory structure
    directories=(
        "src/api"
        "src/core"
        "src/modules/content"
        "src/modules/revenue"
        "src/modules/monitoring"
        "src/utils"
        "config"
        "logs"
        "data/content"
        "data/analytics"
        "data/cache"
        "scripts/phase1"
        "web/dashboard"
        "web/api"
        "backups"
        "temp"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        print_status "Created directory: $dir"
    done
    
    # Set proper permissions
    chown -R www-data:www-data $PROJECT_DIR
    chmod -R 755 $PROJECT_DIR
    
    print_status "Project structure created"
}

# Function to install Python dependencies
install_python_dependencies() {
    print_header "INSTALLING PYTHON DEPENDENCIES"
    
    # Create virtual environment
    python3 -m venv $PROJECT_DIR/venv
    source $PROJECT_DIR/venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Create requirements.txt for Phase 1
    cat > $PROJECT_DIR/requirements.txt << 'EOF'
# Phase 1 Python Dependencies
fastapi==0.104.1
uvicorn[standard]==0.24.0
aiohttp==3.9.1
aiofiles==23.2.1
mysql-connector-python==8.2.0
psycopg2-binary==2.9.9
redis==5.0.1
pandas==2.1.4
numpy==1.25.2
sqlalchemy==2.0.23
alembic==1.13.1
pydantic==2.5.2
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
celery==5.3.4
flower==2.0.1
prometheus-client==0.19.0
structlog==23.2.0
rich==13.7.0
typer==0.9.0
httpx==0.25.2
websockets==12.0
jinja2==3.1.2
matplotlib==3.8.2
seaborn==0.13.0
plotly==5.17.0
streamlit==1.28.2
schedule==1.2.0
APScheduler==3.10.4
asyncpg==0.29.0
aiomysql==0.2.0
aioredis==2.0.1
python-telegram-bot==20.7
discord.py==2.3.2
tweepy==4.14.0
instagrapi==2.0.0
facebook-sdk==3.1.0
youtube-dl==2021.12.17
yt-dlp==2023.11.16
moviepy==1.0.3
pillow==10.1.0
opencv-python==4.8.1.78
imageio==2.33.1
scikit-learn==1.3.2
tensorflow==2.15.0
torch==2.1.2
transformers==4.36.2
openai==1.3.8
anthropic==0.7.8
google-generativeai==0.3.2
langchain==0.0.350
langchain-community==0.0.1
langchain-openai==0.0.2
chromadb==0.4.18
sentence-transformers==2.2.2
beautifulsoup4==4.12.2
scrapy==2.11.0
selenium==4.16.0
requests==2.31.0
urllib3==2.1.0
lxml==4.9.3
feedparser==6.0.10
python-dateutil==2.8.2
pytz==2023.3
cachetools==5.3.2
tenacity==8.2.3
backoff==2.2.1
ratelimit==2.2.1
click==8.1.7
tqdm==4.66.1
colorama==0.4.6
tabulate==0.9.0
psutil==5.9.6
py-cpuinfo==9.0.0
GPUtil==1.4.0
docker==6.1.3
kubernetes==28.1.0
boto3==1.34.0
google-cloud-storage==2.10.0
azure-storage-blob==12.19.0
minio==7.2.0
EOF

    # Install dependencies
    pip install -r $PROJECT_DIR/requirements.txt
    
    print_status "Python dependencies installed"
}

# Function to install Node.js dependencies
install_nodejs_dependencies() {
    print_header "INSTALLING NODE.JS DEPENDENCIES"
    
    # Create package.json for Phase 1 dashboard
    cat > $PROJECT_DIR/web/package.json << 'EOF'
{
  "name": "phase1-dashboard",
  "version": "1.0.0",
  "description": "Phase 1 AI Automation Platform Dashboard",
  "main": "index.js",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.4",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@mui/material": "5.15.0",
    "@mui/icons-material": "5.15.0",
    "@emotion/react": "11.11.1",
    "@emotion/styled": "11.11.0",
    "recharts": "2.8.0",
    "axios": "1.6.2",
    "socket.io-client": "4.7.4",
    "date-fns": "2.30.0",
    "lodash": "4.17.21",
    "react-query": "3.39.3",
    "react-hook-form": "7.48.2",
    "react-router-dom": "6.20.1",
    "styled-components": "6.1.6",
    "framer-motion": "10.16.16",
    "react-spring": "9.7.3",
    "react-chartjs-2": "5.2.0",
    "chart.js": "4.4.0",
    "react-table": "7.8.0",
    "react-virtualized": "9.22.5",
    "react-window": "1.8.8",
    "react-infinite-scroll-component": "6.1.0",
    "react-dropzone": "14.2.3",
    "react-select": "5.8.0",
    "react-datepicker": "4.25.0",
    "react-toastify": "9.1.3",
    "react-loading-skeleton": "3.3.1",
    "react-helmet": "6.1.0",
    "react-error-boundary": "4.0.11"
  },
  "devDependencies": {
    "@types/node": "20.10.4",
    "@types/react": "18.2.45",
    "@types/react-dom": "18.2.18",
    "eslint": "8.56.0",
    "eslint-config-next": "14.0.4",
    "typescript": "5.3.3"
  }
}
EOF

    # Install Node.js dependencies
    cd $PROJECT_DIR/web
    npm install
    
    print_status "Node.js dependencies installed"
}

# Function to setup database schemas
setup_database_schemas() {
    print_header "SETTING UP DATABASE SCHEMAS"
    
    # Create Phase 1 database schema
    cat > $PROJECT_DIR/config/phase1_schema.sql << 'EOF'
-- Phase 1 Database Schema
-- AI Automation Platform

-- Content Scripts Table
CREATE TABLE IF NOT EXISTS content_scripts (
    id VARCHAR(36) PRIMARY KEY,
    niche VARCHAR(50) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    content_type VARCHAR(20) DEFAULT 'video',
    script_data JSON NOT NULL,
    quality_score DECIMAL(5,2) DEFAULT 0.00,
    word_count INT DEFAULT 0,
    estimated_duration INT DEFAULT 0,
    trending_keywords JSON,
    affiliate_products JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_niche_platform (niche, platform),
    INDEX idx_created_at (created_at),
    INDEX idx_quality_score (quality_score)
);

-- Content Videos Table
CREATE TABLE IF NOT EXISTS content_videos (
    id VARCHAR(36) PRIMARY KEY,
    script_id VARCHAR(36) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    niche VARCHAR(50) NOT NULL,
    video_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    duration INT NOT NULL,
    resolution VARCHAR(20),
    file_size BIGINT DEFAULT 0,
    production_time DECIMAL(10,2) DEFAULT 0.00,
    quality_score DECIMAL(5,2) DEFAULT 0.00,
    status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (script_id) REFERENCES content_scripts(id),
    INDEX idx_platform_niche (platform, niche),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Content Analytics Table
CREATE TABLE IF NOT EXISTS content_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    video_id VARCHAR(36) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    views_24h BIGINT DEFAULT 0,
    views_7d BIGINT DEFAULT 0,
    views_30d BIGINT DEFAULT 0,
    likes_24h BIGINT DEFAULT 0,
    comments_24h BIGINT DEFAULT 0,
    shares_24h BIGINT DEFAULT 0,
    revenue_24h DECIMAL(10,2) DEFAULT 0.00,
    revenue_7d DECIMAL(10,2) DEFAULT 0.00,
    revenue_30d DECIMAL(10,2) DEFAULT 0.00,
    cpm DECIMAL(8,2) DEFAULT 0.00,
    engagement_rate DECIMAL(5,2) DEFAULT 0.00,
    publish_date DATE NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES content_videos(id),
    INDEX idx_video_platform (video_id, platform),
    INDEX idx_publish_date (publish_date),
    INDEX idx_revenue (revenue_24h)
);

-- Affiliate Products Table
CREATE TABLE IF NOT EXISTS affiliate_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    network VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL,
    estimated_conversion DECIMAL(5,4) NOT NULL,
    niche VARCHAR(50) NOT NULL,
    gravity INT DEFAULT 0,
    revenue_potential DECIMAL(10,2) DEFAULT 0.00,
    product_url VARCHAR(500),
    affiliate_link VARCHAR(500),
    status ENUM('active', 'inactive', 'testing') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_niche_status (niche, status),
    INDEX idx_revenue_potential (revenue_potential),
    INDEX idx_network (network)
);

-- Affiliate Tracking Table
CREATE TABLE IF NOT EXISTS affiliate_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    video_id VARCHAR(36),
    platform VARCHAR(20) NOT NULL,
    clicks INT DEFAULT 0,
    conversions INT DEFAULT 0,
    commission_amount DECIMAL(10,2) DEFAULT 0.00,
    conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
    conversion_value DECIMAL(10,2) DEFAULT 0.00,
    tracking_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES affiliate_products(id),
    FOREIGN KEY (video_id) REFERENCES content_videos(id),
    INDEX idx_product_date (product_id, tracking_date),
    INDEX idx_video_date (video_id, tracking_date),
    INDEX idx_platform_date (platform, tracking_date)
);

-- Product Sales Table
CREATE TABLE IF NOT EXISTS product_sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    product_type ENUM('course', 'ebook', 'software', 'service') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    customer_email VARCHAR(255),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    affiliate_source VARCHAR(100),
    video_source VARCHAR(36),
    platform_source VARCHAR(20),
    status ENUM('pending', 'completed', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_source) REFERENCES content_videos(id),
    INDEX idx_product_type (product_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_amount (amount)
);

-- Service Bookings Table
CREATE TABLE IF NOT EXISTS service_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(200) NOT NULL,
    service_type ENUM('consultation', 'done_for_you', 'coaching', 'audit') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    client_email VARCHAR(255),
    client_name VARCHAR(200),
    booking_date DATE NOT NULL,
    completion_date DATE,
    status ENUM('booked', 'in_progress', 'completed', 'cancelled') DEFAULT 'booked',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_service_type (service_type),
    INDEX idx_status (status),
    INDEX idx_booking_date (booking_date),
    INDEX idx_amount (amount)
);

-- Daily Revenue Summary Table
CREATE TABLE IF NOT EXISTS daily_revenue_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    affiliate_revenue DECIMAL(12,2) DEFAULT 0.00,
    monetization_revenue DECIMAL(12,2) DEFAULT 0.00,
    products_revenue DECIMAL(12,2) DEFAULT 0.00,
    services_revenue DECIMAL(12,2) DEFAULT 0.00,
    target_progress DECIMAL(5,2) DEFAULT 0.00,
    videos_produced INT DEFAULT 0,
    content_performance_score DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date),
    INDEX idx_total_revenue (total_revenue)
);

-- Optimization Reports Table
CREATE TABLE IF NOT EXISTS optimization_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    revenue_status JSON NOT NULL,
    affiliate_data JSON,
    monetization_data JSON,
    product_data JSON,
    forecast_data JSON,
    recommendations JSON,
    performance_metrics JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (date)
);

-- System Metrics Table
CREATE TABLE IF NOT EXISTS system_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_date DATE NOT NULL,
    cpu_usage DECIMAL(5,2) DEFAULT 0.00,
    memory_usage DECIMAL(5,2) DEFAULT 0.00,
    disk_usage DECIMAL(5,2) DEFAULT 0.00,
    network_io BIGINT DEFAULT 0,
    ollama_requests INT DEFAULT 0,
    ollama_avg_response_time DECIMAL(8,2) DEFAULT 0.00,
    video_production_count INT DEFAULT 0,
    video_production_avg_time DECIMAL(8,2) DEFAULT 0.00,
    error_count INT DEFAULT 0,
    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_metric_date (metric_date)
);

-- User Sessions Table (for dashboard access)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL UNIQUE,
    user_id VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    permissions JSON,
    rate_limit INT DEFAULT 1000,
    requests_today INT DEFAULT 0,
    last_used TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    INDEX idx_key_hash (api_key_hash),
    INDEX idx_active (is_active)
);
EOF

    # Apply schema to MySQL
    mysql -u root -p${MYSQL_PASSWORD:-} bookai_analytics < $PROJECT_DIR/config/phase1_schema.sql
    
    print_status "Database schemas created"
}

# Function to deploy Phase 1 scripts
deploy_phase1_scripts() {
    print_header "DEPLOYING PHASE 1 SCRIPTS"
    
    # Copy Phase 1 scripts to project directory
    cp /home/ubuntu/ai-automation-platform/phase1/*.py $PROJECT_DIR/scripts/phase1/
    cp /home/ubuntu/ai-automation-platform/phase1/*.sh $PROJECT_DIR/scripts/phase1/
    
    # Make scripts executable
    chmod +x $PROJECT_DIR/scripts/phase1/*.sh
    chmod +x $PROJECT_DIR/scripts/phase1/*.py
    
    # Create systemd services for Phase 1 components
    create_systemd_services
    
    print_status "Phase 1 scripts deployed"
}

# Function to create systemd services
create_systemd_services() {
    print_header "CREATING SYSTEMD SERVICES"
    
    # Revenue Optimization Service
    cat > /etc/systemd/system/phase1-revenue-optimizer.service << EOF
[Unit]
Description=Phase 1 Revenue Optimization Service
After=network.target mysql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$PROJECT_DIR/venv/bin
ExecStart=$PROJECT_DIR/venv/bin/python $PROJECT_DIR/scripts/phase1/02-revenue-optimization.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Content Production Service
    cat > /etc/systemd/system/phase1-content-producer.service << EOF
[Unit]
Description=Phase 1 Content Production Service
After=network.target mysql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$PROJECT_DIR/venv/bin
ExecStart=$PROJECT_DIR/venv/bin/python $PROJECT_DIR/scripts/phase1/03-content-production-pipeline.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # API Service
    cat > /etc/systemd/system/phase1-api.service << EOF
[Unit]
Description=Phase 1 API Service
After=network.target mysql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$PROJECT_DIR/venv/bin
ExecStart=$PROJECT_DIR/venv/bin/uvicorn src.api.main:app --host 0.0.0.0 --port 8100 --workers 4
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Dashboard Service
    cat > /etc/systemd/system/phase1-dashboard.service << EOF
[Unit]
Description=Phase 1 Dashboard Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$PROJECT_DIR/web
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production
Environment=PORT=3100

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable services
    systemctl daemon-reload
    
    services=("phase1-revenue-optimizer" "phase1-content-producer" "phase1-api" "phase1-dashboard")
    for service in "${services[@]}"; do
        systemctl enable $service
        print_status "Enabled service: $service"
    done
    
    print_status "Systemd services created"
}

# Function to setup Nginx configuration
setup_nginx_configuration() {
    print_header "SETTING UP NGINX CONFIGURATION"
    
    # Create Phase 1 Nginx configuration
    cat > /etc/nginx/sites-available/phase1-dashboard << EOF
# Phase 1 Dashboard Configuration
server {
    listen 80;
    server_name dashboard.$DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dashboard.$DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/dashboard.$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # Dashboard Frontend
    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # API Endpoints
    location /api/ {
        proxy_pass http://localhost:8100/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS Headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain; charset=utf-8';
            add_header Content-Length 0;
            return 204;
        }
    }
    
    # WebSocket for real-time updates
    location /ws {
        proxy_pass http://localhost:8100/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files
    location /static/ {
        alias $PROJECT_DIR/web/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Content files
    location /content/ {
        alias /opt/content-storage/;
        expires 1d;
        add_header Cache-Control "public";
        
        # Security for content access
        valid_referers none blocked dashboard.$DOMAIN;
        if (\$invalid_referer) {
            return 403;
        }
    }
}
EOF

    # Enable the site
    ln -sf /etc/nginx/sites-available/phase1-dashboard /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    nginx -t
    if [ $? -eq 0 ]; then
        systemctl reload nginx
        print_status "Nginx configuration updated"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
}

# Function to setup SSL certificates
setup_ssl_certificates() {
    print_header "SETTING UP SSL CERTIFICATES"
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        print_status "Installing certbot..."
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Generate SSL certificate for dashboard
    print_status "Generating SSL certificate for dashboard.$DOMAIN..."
    
    certbot certonly \
        --nginx \
        --non-interactive \
        --agree-tos \
        --email admin@$DOMAIN \
        -d dashboard.$DOMAIN
    
    if [ $? -eq 0 ]; then
        print_status "SSL certificate generated successfully"
        
        # Setup auto-renewal
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        print_status "SSL auto-renewal configured"
    else
        print_warning "SSL certificate generation failed - using self-signed certificate"
        
        # Create self-signed certificate as fallback
        mkdir -p /etc/ssl/private
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/ssl/private/dashboard.$DOMAIN.key \
            -out /etc/ssl/certs/dashboard.$DOMAIN.crt \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=dashboard.$DOMAIN"
        
        # Update Nginx config to use self-signed certificate
        sed -i "s|/etc/letsencrypt/live/dashboard.$DOMAIN/fullchain.pem|/etc/ssl/certs/dashboard.$DOMAIN.crt|g" /etc/nginx/sites-available/phase1-dashboard
        sed -i "s|/etc/letsencrypt/live/dashboard.$DOMAIN/privkey.pem|/etc/ssl/private/dashboard.$DOMAIN.key|g" /etc/nginx/sites-available/phase1-dashboard
        
        systemctl reload nginx
    fi
}

# Function to create monitoring scripts
create_monitoring_scripts() {
    print_header "CREATING MONITORING SCRIPTS"
    
    # Create Phase 1 monitoring script
    cat > $PROJECT_DIR/scripts/phase1-monitor.sh << 'EOF'
#!/bin/bash

# Phase 1 Monitoring Script
LOG_FILE="/var/log/phase1-monitor.log"
ALERT_EMAIL="admin@bookaistudio.com"

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Check system health
check_system_health() {
    # CPU usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' | cut -d'.' -f1)
    
    # Memory usage
    memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    # Disk usage
    disk_usage=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
    
    # Load average
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    log_message "System Health - CPU: ${cpu_usage}%, Memory: ${memory_usage}%, Disk: ${disk_usage}%, Load: ${load_avg}"
    
    # Alert on high usage
    if [ "$cpu_usage" -gt 90 ] || [ "$memory_usage" -gt 90 ] || [ "$disk_usage" -gt 85 ]; then
        log_message "ALERT: High resource usage detected"
    fi
}

# Check Phase 1 services
check_phase1_services() {
    services=("phase1-revenue-optimizer" "phase1-content-producer" "phase1-api" "phase1-dashboard")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet $service; then
            log_message "Service $service: Running"
        else
            log_message "ALERT: Service $service is not running"
            # Attempt to restart
            systemctl restart $service
            sleep 5
            if systemctl is-active --quiet $service; then
                log_message "Service $service: Restarted successfully"
            else
                log_message "CRITICAL: Failed to restart $service"
            fi
        fi
    done
}

# Check Ollama cluster
check_ollama_cluster() {
    ollama_ports=(11434 11435 11436 11437)
    running_count=0
    
    for port in "${ollama_ports[@]}"; do
        if curl -s http://localhost:$port/api/tags > /dev/null 2>&1; then
            running_count=$((running_count + 1))
        fi
    done
    
    log_message "Ollama cluster: $running_count/4 instances running"
    
    if [ "$running_count" -lt 2 ]; then
        log_message "ALERT: Ollama cluster degraded - only $running_count instances running"
    fi
}

# Check database connections
check_databases() {
    # MySQL
    if mysql -e "SELECT 1;" > /dev/null 2>&1; then
        log_message "MySQL: Connected"
    else
        log_message "ALERT: MySQL connection failed"
    fi
    
    # PostgreSQL
    if sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1; then
        log_message "PostgreSQL: Connected"
    else
        log_message "ALERT: PostgreSQL connection failed"
    fi
    
    # Redis
    if redis-cli ping > /dev/null 2>&1; then
        log_message "Redis: Connected"
    else
        log_message "ALERT: Redis connection failed"
    fi
}

# Check content production metrics
check_content_metrics() {
    # Get today's video count
    videos_today=$(find /opt/content-storage/videos/processed -type f -newermt "$(date +%Y-%m-%d)" 2>/dev/null | wc -l)
    
    # Get storage usage
    storage_used=$(du -sh /opt/content-storage 2>/dev/null | awk '{print $1}' || echo "0")
    
    log_message "Content metrics - Videos today: $videos_today, Storage used: $storage_used"
    
    # Alert if production is low
    hour=$(date +%H)
    expected_videos=$((hour * 42))  # ~42 videos per hour for 1000/day target
    
    if [ "$videos_today" -lt "$expected_videos" ] && [ "$hour" -gt 6 ]; then
        log_message "ALERT: Video production below target - $videos_today vs expected $expected_videos"
    fi
}

# Main monitoring function
main() {
    log_message "Starting Phase 1 monitoring check"
    
    check_system_health
    check_phase1_services
    check_ollama_cluster
    check_databases
    check_content_metrics
    
    log_message "Phase 1 monitoring check completed"
}

# Run monitoring
main
EOF

    chmod +x $PROJECT_DIR/scripts/phase1-monitor.sh
    
    # Schedule monitoring to run every 5 minutes
    (crontab -l 2>/dev/null; echo "*/5 * * * * $PROJECT_DIR/scripts/phase1-monitor.sh") | crontab -
    
    # Create log rotation for monitoring
    cat > /etc/logrotate.d/phase1-monitor << 'EOF'
/var/log/phase1-monitor.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF

    print_status "Monitoring scripts created"
}

# Function to start Phase 1 services
start_phase1_services() {
    print_header "STARTING PHASE 1 SERVICES"
    
    # Start database services
    services=("mysql" "postgresql" "redis")
    for service in "${services[@]}"; do
        if ! systemctl is-active --quiet $service; then
            systemctl start $service
            print_status "Started $service"
        fi
    done
    
    # Wait for databases to be ready
    sleep 10
    
    # Start Phase 1 services
    phase1_services=("phase1-api" "phase1-dashboard" "phase1-revenue-optimizer" "phase1-content-producer")
    for service in "${phase1_services[@]}"; do
        systemctl start $service
        sleep 5
        
        if systemctl is-active --quiet $service; then
            print_status "✅ Started $service"
        else
            print_error "❌ Failed to start $service"
            journalctl -u $service --no-pager -n 20
        fi
    done
    
    print_status "Phase 1 services started"
}

# Function to run deployment tests
run_deployment_tests() {
    print_header "RUNNING DEPLOYMENT TESTS"
    
    # Test API endpoint
    print_status "Testing API endpoint..."
    sleep 10  # Wait for services to fully start
    
    if curl -s http://localhost:8100/health > /dev/null; then
        print_status "✅ API endpoint responding"
    else
        print_error "❌ API endpoint not responding"
    fi
    
    # Test dashboard
    print_status "Testing dashboard..."
    if curl -s http://localhost:3100 > /dev/null; then
        print_status "✅ Dashboard responding"
    else
        print_error "❌ Dashboard not responding"
    fi
    
    # Test Nginx proxy
    print_status "Testing Nginx proxy..."
    if curl -s -k https://dashboard.$DOMAIN > /dev/null; then
        print_status "✅ Nginx proxy working"
    else
        print_warning "⚠️  Nginx proxy test failed (may need DNS configuration)"
    fi
    
    # Test database connections
    print_status "Testing database connections..."
    
    if mysql -e "SELECT COUNT(*) FROM content_scripts;" bookai_analytics > /dev/null 2>&1; then
        print_status "✅ MySQL database accessible"
    else
        print_error "❌ MySQL database test failed"
    fi
    
    # Test Ollama cluster
    print_status "Testing Ollama cluster..."
    if curl -s http://localhost:11430/api/tags > /dev/null; then
        print_status "✅ Ollama load balancer working"
    else
        print_error "❌ Ollama load balancer test failed"
    fi
    
    # Test content storage
    print_status "Testing content storage..."
    if [ -w "/opt/content-storage" ]; then
        print_status "✅ Content storage writable"
    else
        print_error "❌ Content storage not writable"
    fi
    
    print_status "Deployment tests completed"
}

# Function to create Phase 1 status dashboard
create_phase1_status() {
    print_header "CREATING PHASE 1 STATUS COMMAND"
    
    cat > /usr/local/bin/phase1-status << 'EOF'
#!/bin/bash

# Phase 1 Status Dashboard
clear

echo "=================================================="
echo "   PHASE 1 AI AUTOMATION PLATFORM STATUS"
echo "=================================================="
echo

# System Resources
echo "🖥️  SYSTEM RESOURCES:"
echo "   CPU Cores: $(nproc)"
echo "   Memory: $(free -h | awk 'NR==2{print $2}') total, $(free -h | awk 'NR==2{print $7}') available"
echo "   Disk: $(df -h / | awk 'NR==2{print $4}') available"
echo "   Load Average: $(uptime | awk -F'load average:' '{print $2}')"
echo

# Service Status
echo "🔧 PHASE 1 SERVICES:"
services=("mysql" "postgresql" "redis" "nginx" "phase1-api" "phase1-dashboard" "phase1-revenue-optimizer" "phase1-content-producer")
for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        echo "   ✅ $service: Running"
    else
        echo "   ❌ $service: Stopped"
    fi
done
echo

# Ollama Cluster Status
echo "🤖 OLLAMA CLUSTER:"
for port in 11434 11435 11436 11437; do
    if curl -s http://localhost:$port/api/tags > /dev/null 2>&1; then
        echo "   ✅ Ollama:$port: Running"
    else
        echo "   ❌ Ollama:$port: Stopped"
    fi
done

# Load Balancer
if curl -s http://localhost:11430/api/tags > /dev/null 2>&1; then
    echo "   ✅ Load Balancer: Running"
else
    echo "   ❌ Load Balancer: Stopped"
fi
echo

# Content Production Status
echo "🎬 CONTENT PRODUCTION:"
videos_today=$(find /opt/content-storage/videos/processed -type f -newermt "$(date +%Y-%m-%d)" 2>/dev/null | wc -l)
storage_used=$(du -sh /opt/content-storage 2>/dev/null | awk '{print $1}' || echo "0")
echo "   Videos Today: $videos_today / 1,000 target"
echo "   Storage Used: $storage_used"

# Calculate progress
if [ "$videos_today" -gt 0 ]; then
    progress=$((videos_today * 100 / 1000))
    echo "   Progress: ${progress}% of daily target"
else
    echo "   Progress: 0% of daily target"
fi
echo

# Revenue Status (if available)
echo "💰 REVENUE STATUS:"
if mysql -e "SELECT total_revenue FROM daily_revenue_summary WHERE date = CURDATE();" bookai_analytics 2>/dev/null | tail -n 1 | grep -q '^[0-9]'; then
    today_revenue=$(mysql -e "SELECT total_revenue FROM daily_revenue_summary WHERE date = CURDATE();" bookai_analytics 2>/dev/null | tail -n 1)
    echo "   Today's Revenue: \$$(printf "%.2f" $today_revenue)"
    target_progress=$(echo "scale=1; $today_revenue * 100 / 100000" | bc 2>/dev/null || echo "0")
    echo "   Target Progress: ${target_progress}% of \$100K target"
else
    echo "   Revenue data not available"
fi
echo

# URLs
echo "🌐 ACCESS URLS:"
echo "   Dashboard: https://dashboard.bookaistudio.com"
echo "   API: https://dashboard.bookaistudio.com/api"
echo "   Local Dashboard: http://localhost:3100"
echo "   Local API: http://localhost:8100"
echo

# Performance Metrics
echo "📊 PERFORMANCE:"
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
memory_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
echo "   CPU Usage: $cpu_usage"
echo "   Memory Usage: ${memory_usage}%"

# Recent logs
echo "   Recent Errors: $(journalctl --since "1 hour ago" -p err --no-pager -q | wc -l)"
echo

echo "=================================================="
echo "Last updated: $(date)"
echo "Run 'phase1-status' anytime to check status"
echo "=================================================="
EOF

    chmod +x /usr/local/bin/phase1-status
    
    print_status "Phase 1 status command created"
}

# Main deployment function
main() {
    print_header "🚀 PHASE 1 DEPLOYMENT AUTOMATION"
    echo "Target: Deploy and integrate all Phase 1 components"
    echo "Timeline: Week 6"
    echo ""
    
    # Create log file
    touch $LOG_FILE
    chmod 644 $LOG_FILE
    
    echo "Phase 1 deployment started at $(date)" | tee -a $LOG_FILE
    
    # Create backup
    mkdir -p $BACKUP_DIR
    print_status "Backup directory created: $BACKUP_DIR"
    
    # Run deployment steps
    check_prerequisites
    create_project_structure
    install_python_dependencies
    install_nodejs_dependencies
    setup_database_schemas
    deploy_phase1_scripts
    setup_nginx_configuration
    setup_ssl_certificates
    create_monitoring_scripts
    start_phase1_services
    run_deployment_tests
    create_phase1_status
    
    echo "Phase 1 deployment completed at $(date)" | tee -a $LOG_FILE
    
    print_header "🎉 PHASE 1 DEPLOYMENT COMPLETED!"
    echo -e "${GREEN}Your Phase 1 AI Automation Platform is now live!${NC}"
    echo ""
    echo -e "${CYAN}🌐 Access URLs:${NC}"
    echo -e "   Dashboard: ${YELLOW}https://dashboard.$DOMAIN${NC}"
    echo -e "   API: ${YELLOW}https://dashboard.$DOMAIN/api${NC}"
    echo ""
    echo -e "${CYAN}📊 Monitoring:${NC}"
    echo -e "   Status: ${YELLOW}phase1-status${NC}"
    echo -e "   Logs: ${YELLOW}tail -f $LOG_FILE${NC}"
    echo -e "   Services: ${YELLOW}systemctl status phase1-*${NC}"
    echo ""
    echo -e "${CYAN}🎯 Phase 1 Targets:${NC}"
    echo -e "   📺 Content: ${YELLOW}1,000 videos/day${NC}"
    echo -e "   💰 Revenue: ${YELLOW}\$100K/day${NC}"
    echo -e "   ⚡ Performance: ${YELLOW}95%+ automation${NC}"
    echo ""
    echo -e "${GREEN}🚀 Ready to scale to billion-dollar operations!${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root or with sudo"
    exit 1
fi

# Run main function
main "$@"

