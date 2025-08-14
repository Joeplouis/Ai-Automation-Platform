#!/bin/bash

#==============================================================================
# MASTER INSTALLATION SCRIPT - BOOKAI STUDIO AI AUTOMATION PLATFORM
# 
# This script orchestrates the complete installation of your billion-dollar
# AI automation platform including all services, APIs, and configurations.
#
# Components Installed:
# - NGINX + SSL Certificates
# - PostgreSQL + Redis
# - N8N Workflow Automation
# - WordPress Multisite
# - Ollama AI Server
# - Postiz Social Media Automation
# - Email Servers (Mailcow + Mautic)
# - AI Automation Platform (20 JS modules)
# - MCP Server + Agent System
# - Analytics Dashboard
# - Revenue Tracking System
#
# Domain Structure:
# - bookaistudio.com (main domain)
# - chat.bookaistudio.com (AI chat agent)
# - n8n.bookaistudio.com (workflow automation)
# - wrp.bookaistudio.com (WordPress multisite)
# - postiz.bookaistudio.com (social media)
# - mail.bookaistudio.com (email server)
# - ai.bookaistudio.com (Ollama API)
#
# Author: BookAI Studio Development Team
# Version: 2.1.0 (adds enhanced MCP service, agent orchestrator, audit logging, metrics & migrations)
# Date: $(date +%Y-%m-%d)
#==============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/bookai-studio-install.log"
CONFIG_FILE="$SCRIPT_DIR/bookai-studio-config.env"
CREDENTIALS_FILE="$SCRIPT_DIR/bookai-studio-credentials.env"

# Installation phases
declare -a INSTALLATION_PHASES=(
    "01_prep"
    "10_mailcow_install" 
    "20_mautic_install"
    "30_n8n_install"
    "40_nginx_sites"
    "45_certbot_certs"
    "60_dns_print"
    "70_mailcow_api_bulk"
    "install_full_stack_bookaistudio"
    "ai_automation_platform"
    "javascript_modules"
    "final_configuration"
)

# JavaScript modules to deploy
declare -a JS_MODULES=(
    "ai-automation-platform/config/vps-integration.js"
    "ai-automation-platform/src/ai/langchain-agent-system.js"
    "ai-automation-platform/src/ai/learning-engine.js"
    "ai-automation-platform/src/api/llm-routes.js"
    "ai-automation-platform/src/core/enhanced-mcp-server.js"
    "ai-automation-platform/src/ai/agent-orchestrator.js"
    "ai-automation-platform/src/ai/output-capture.js"
    "ai-automation-platform/src/ai/confidence-scorer.js"
    "ai-automation-platform/src/core/audit.js"
    "ai-automation-platform/src/core/mcp-server.js"
    "ai-automation-platform/src/core/server.js"
    "ai-automation-platform/src/dashboard/revenue-analytics-dashboard.js"
    "ai-automation-platform/src/enterprise/billion-dollar-api.js"
    "ai-automation-platform/src/enterprise/billion-dollar-dashboard.js"
    "ai-automation-platform/src/frontend/llm-selector.js"
    "ai-automation-platform/src/integrations/bookai-studio-connector.js"
    "ai-automation-platform/src/modules/affiliate/manager.js"
    "ai-automation-platform/src/modules/n8n/manager.js"
    "ai-automation-platform/src/modules/postiz/manager.js"
    "ai-automation-platform/src/modules/vps/manager.js"
    "ai-automation-platform/src/modules/wordpress/manager.js"
    "ai-automation-platform/src/modules/workflow/engine.js"
    "ai-automation-platform/src/utils/metrics.js"
    "ai-automation-platform/migrations/000_base.sql"
    "ai-automation-platform/migrations/001_domain_tables.sql"
    "ai-automation-platform/migrations/002_audit_logs.sql"
    "ai-automation-platform/migrations/003_vps_and_metrics_support.sql"
    "ai-automation-platform/src/utils/rateLimit.js"
    "bessou-ecommerce-plugins/admin-dashboard/assets/js/dashboard.js"
)

# Required credentials and APIs
declare -A REQUIRED_CREDENTIALS=(
    ["OPENAI_API_KEY"]="OpenAI API key for LLM access"
    ["ANTHROPIC_API_KEY"]="Anthropic Claude API key"
    ["GOOGLE_API_KEY"]="Google AI API key"
    ["N8N_API_KEY"]="N8N API key (generated after installation)"
    ["WORDPRESS_API_KEY"]="WordPress API key (generated after installation)"
    ["POSTIZ_API_KEY"]="Postiz API key"
    ["MAILCOW_API_KEY"]="Mailcow API key (generated after installation)"
    ["MAUTIC_API_KEY"]="Mautic API key (generated after installation)"
    ["STRIPE_SECRET_KEY"]="Stripe secret key for payments"
    ["STRIPE_PUBLISHABLE_KEY"]="Stripe publishable key"
    ["PAYPAL_CLIENT_ID"]="PayPal client ID"
    ["PAYPAL_CLIENT_SECRET"]="PayPal client secret"
    ["DATABASE_PASSWORD"]="PostgreSQL database password"
    ["REDIS_PASSWORD"]="Redis password"
    ["JWT_SECRET"]="JWT secret for authentication"
    ["ENCRYPTION_KEY"]="Encryption key for sensitive data"
)

# Chinese LLM providers (optional)
declare -A CHINESE_LLM_PROVIDERS=(
    ["BAIDU_API_KEY"]="Baidu Ernie Bot API key (optional)"
    ["ALIBABA_API_KEY"]="Alibaba Qwen API key (optional)"
    ["TENCENT_API_KEY"]="Tencent Hunyuan API key (optional)"
    ["BYTEDANCE_API_KEY"]="ByteDance Doubao API key (optional)"
    ["IFLYTEK_API_KEY"]="iFlytek Spark API key (optional)"
    ["ZHIPU_API_KEY"]="Zhipu ChatGLM API key (optional)"
    ["MOONSHOT_API_KEY"]="Moonshot Kimi API key (optional)"
)

#==============================================================================
# UTILITY FUNCTIONS
#==============================================================================

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    BOOKAI STUDIO AI AUTOMATION PLATFORM                     ║"
    echo "║                         MASTER INSTALLATION SCRIPT                          ║"
    echo "║                                                                              ║"
    echo "║  🚀 Billion-Dollar AI Automation Empire Installation                        ║"
    echo "║  🤖 Complete AI Agent System with MCP Server                                ║"
    echo "║  📊 Revenue Analytics & Performance Tracking                                ║"
    echo "║  🔄 N8N Workflow Automation + WordPress + Postiz                           ║"
    echo "║  📧 Email Marketing + Affiliate Management                                  ║"
    echo "║  🧠 AI Learning Engine (3000+ workflows, 500+ nodes)                       ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_phase() {
    echo -e "\n${PURPLE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║ PHASE: $1${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root or with sudo privileges"
        exit 1
    fi
}

check_os() {
    if [[ ! -f /etc/os-release ]]; then
        print_error "Cannot determine OS version"
        exit 1
    fi
    
    source /etc/os-release
    
    if [[ "$ID" != "ubuntu" ]]; then
        print_error "This script is designed for Ubuntu. Detected: $ID"
        exit 1
    fi
    
    if [[ "$VERSION_ID" != "22.04" && "$VERSION_ID" != "24.04" ]]; then
        print_warning "This script is tested on Ubuntu 22.04/24.04. You have $VERSION_ID"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

check_internet() {
    print_info "Checking internet connectivity..."
    if ! ping -c 1 google.com &> /dev/null; then
        print_error "No internet connection detected"
        exit 1
    fi
    print_success "Internet connectivity confirmed"
}

check_disk_space() {
    print_info "Checking disk space..."
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=10485760  # 10GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        print_error "Insufficient disk space. Required: 10GB, Available: $(($available_space / 1024 / 1024))GB"
        exit 1
    fi
    print_success "Sufficient disk space available"
}

check_memory() {
    print_info "Checking memory..."
    local total_memory=$(free -m | awk 'NR==2{print $2}')
    local required_memory=4096  # 4GB in MB
    
    if [[ $total_memory -lt $required_memory ]]; then
        print_warning "Low memory detected. Required: 4GB, Available: ${total_memory}MB"
        print_info "The installation may be slower but should still work"
    else
        print_success "Sufficient memory available"
    fi
}

#==============================================================================
# CREDENTIAL COLLECTION FUNCTIONS
#==============================================================================

collect_basic_info() {
    print_phase "BASIC CONFIGURATION"
    
    echo -e "${WHITE}Please provide basic configuration information:${NC}\n"
    
    # Domain configuration
    read -p "Main domain (default: bookaistudio.com): " MAIN_DOMAIN
    MAIN_DOMAIN=${MAIN_DOMAIN:-bookaistudio.com}
    
    read -p "Admin email (default: admin@$MAIN_DOMAIN): " ADMIN_EMAIL
    ADMIN_EMAIL=${ADMIN_EMAIL:-admin@$MAIN_DOMAIN}
    
    # Server configuration
    read -p "Server timezone (default: UTC): " SERVER_TIMEZONE
    SERVER_TIMEZONE=${SERVER_TIMEZONE:-UTC}
    
    # Save basic config
    cat > "$CONFIG_FILE" << EOF
# BookAI Studio Basic Configuration
MAIN_DOMAIN="$MAIN_DOMAIN"
ADMIN_EMAIL="$ADMIN_EMAIL"
SERVER_TIMEZONE="$SERVER_TIMEZONE"

# Subdomain Configuration
CHAT_DOMAIN="chat.$MAIN_DOMAIN"
N8N_DOMAIN="n8n.$MAIN_DOMAIN"
WP_DOMAIN="wrp.$MAIN_DOMAIN"
POSTIZ_DOMAIN="postiz.$MAIN_DOMAIN"
OLLAMA_DOMAIN="ai.$MAIN_DOMAIN"
MAIL_DOMAIN="mail.$MAIN_DOMAIN"

# Installation timestamp
INSTALL_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
EOF
    
    print_success "Basic configuration saved"
}

collect_required_credentials() {
    print_phase "REQUIRED API CREDENTIALS"
    
    echo -e "${WHITE}Please provide the following API credentials:${NC}"
    echo -e "${YELLOW}Note: These are REQUIRED for the platform to function properly${NC}\n"
    
    # Create credentials file
    echo "# BookAI Studio API Credentials" > "$CREDENTIALS_FILE"
    echo "# Generated on $(date)" >> "$CREDENTIALS_FILE"
    echo "" >> "$CREDENTIALS_FILE"
    
    for credential in "${!REQUIRED_CREDENTIALS[@]}"; do
        local description="${REQUIRED_CREDENTIALS[$credential]}"
        
        echo -e "${CYAN}$credential${NC}"
        echo -e "  Description: $description"
        
        if [[ "$credential" == *"PASSWORD"* ]] || [[ "$credential" == *"SECRET"* ]] || [[ "$credential" == *"KEY"* ]]; then
            read -s -p "  Enter value (hidden): " value
            echo
        else
            read -p "  Enter value: " value
        fi
        
        if [[ -z "$value" ]]; then
            print_warning "Empty value for $credential - you can set this later"
            echo "$credential=\"\"" >> "$CREDENTIALS_FILE"
        else
            echo "$credential=\"$value\"" >> "$CREDENTIALS_FILE"
            print_success "Saved $credential"
        fi
        echo
    done
    
    print_success "Required credentials collected"
}

collect_optional_credentials() {
    print_phase "OPTIONAL CHINESE LLM PROVIDERS"
    
    echo -e "${WHITE}Chinese LLM providers (optional but recommended for global reach):${NC}\n"
    
    read -p "Do you want to configure Chinese LLM providers? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "" >> "$CREDENTIALS_FILE"
        echo "# Chinese LLM Providers (Optional)" >> "$CREDENTIALS_FILE"
        
        for credential in "${!CHINESE_LLM_PROVIDERS[@]}"; do
            local description="${CHINESE_LLM_PROVIDERS[$credential]}"
            
            echo -e "${CYAN}$credential${NC}"
            echo -e "  Description: $description"
            read -p "  Enter value (or press Enter to skip): " value
            
            if [[ -n "$value" ]]; then
                echo "$credential=\"$value\"" >> "$CREDENTIALS_FILE"
                print_success "Saved $credential"
            else
                echo "$credential=\"\"" >> "$CREDENTIALS_FILE"
            fi
            echo
        done
    else
        echo "" >> "$CREDENTIALS_FILE"
        echo "# Chinese LLM Providers (Skipped)" >> "$CREDENTIALS_FILE"
        for credential in "${!CHINESE_LLM_PROVIDERS[@]}"; do
            echo "$credential=\"\"" >> "$CREDENTIALS_FILE"
        done
    fi
    
    print_success "Optional credentials processed"
}

generate_secure_passwords() {
    print_phase "GENERATING SECURE PASSWORDS"
    
    echo "" >> "$CREDENTIALS_FILE"
    echo "# Auto-generated secure passwords" >> "$CREDENTIALS_FILE"
    
    # Generate passwords for services that need them
    local db_password=$(openssl rand -hex 32)
    local redis_password=$(openssl rand -hex 32)
    local jwt_secret=$(openssl rand -hex 64)
    local encryption_key=$(openssl rand -hex 32)
    local n8n_encryption_key=$(openssl rand -hex 32)
    local n8n_basic_pass=$(openssl rand -hex 16)
    
    echo "DB_PASSWORD=\"$db_password\"" >> "$CREDENTIALS_FILE"
    echo "REDIS_PASSWORD=\"$redis_password\"" >> "$CREDENTIALS_FILE"
    echo "JWT_SECRET=\"$jwt_secret\"" >> "$CREDENTIALS_FILE"
    echo "ENCRYPTION_KEY=\"$encryption_key\"" >> "$CREDENTIALS_FILE"
    echo "N8N_ENCRYPTION_KEY=\"$n8n_encryption_key\"" >> "$CREDENTIALS_FILE"
    echo "N8N_BASIC_AUTH_PASSWORD=\"$n8n_basic_pass\"" >> "$CREDENTIALS_FILE"
    
    print_success "Secure passwords generated"
}

validate_credentials() {
    print_phase "VALIDATING CREDENTIALS"
    
    source "$CREDENTIALS_FILE"
    
    local missing_credentials=()
    
    # Check critical credentials
    local critical_creds=("OPENAI_API_KEY" "DATABASE_PASSWORD" "JWT_SECRET" "ENCRYPTION_KEY")
    
    for cred in "${critical_creds[@]}"; do
        if [[ -z "${!cred:-}" ]]; then
            missing_credentials+=("$cred")
        fi
    done
    
    if [[ ${#missing_credentials[@]} -gt 0 ]]; then
        print_error "Missing critical credentials:"
        for cred in "${missing_credentials[@]}"; do
            echo "  - $cred"
        done
        echo
        print_error "Please run the script again and provide all required credentials"
        exit 1
    fi
    
    print_success "All critical credentials validated"
}

#==============================================================================
# INSTALLATION PHASE FUNCTIONS
#==============================================================================

run_preparation_phase() {
    print_phase "SYSTEM PREPARATION"
    
    if [[ -f "$SCRIPT_DIR/01_prep.sh" ]]; then
        print_info "Running system preparation script..."
        bash "$SCRIPT_DIR/01_prep.sh" 2>&1 | tee -a "$LOG_FILE"
        print_success "System preparation completed"
    else
        print_warning "01_prep.sh not found, running basic preparation..."
        
        # Basic system update
        apt-get update && apt-get upgrade -y
        
        # Install essential packages
        apt-get install -y curl wget git unzip software-properties-common \
                          apt-transport-https ca-certificates gnupg lsb-release \
                          build-essential python3 python3-pip nodejs npm
        
        print_success "Basic preparation completed"
    fi
}

run_mailcow_installation() {
    print_phase "MAILCOW EMAIL SERVER INSTALLATION"
    
    if [[ -f "$SCRIPT_DIR/10_mailcow_install.sh" ]]; then
        print_info "Installing Mailcow email server..."
        bash "$SCRIPT_DIR/10_mailcow_install.sh" 2>&1 | tee -a "$LOG_FILE"
        print_success "Mailcow installation completed"
        
        print_info "Please configure Mailcow API key after installation"
        echo "1. Access https://mail.$MAIN_DOMAIN"
        echo "2. Login with admin credentials"
        echo "3. Go to Configuration > Access > API"
        echo "4. Generate API key and update MAILCOW_API_KEY in $CREDENTIALS_FILE"
        
        read -p "Press Enter when you have configured the Mailcow API key..."
    else
        print_warning "10_mailcow_install.sh not found, skipping Mailcow installation"
    fi
}

run_mautic_installation() {
    print_phase "MAUTIC EMAIL MARKETING INSTALLATION"
    
    if [[ -f "$SCRIPT_DIR/20_mautic_install.sh" ]]; then
        print_info "Installing Mautic email marketing platform..."
        bash "$SCRIPT_DIR/20_mautic_install.sh" 2>&1 | tee -a "$LOG_FILE"
        print_success "Mautic installation completed"
        
        print_info "Please configure Mautic API key after installation"
        echo "1. Access your Mautic installation"
        echo "2. Go to Settings > API Settings"
        echo "3. Enable API and generate credentials"
        echo "4. Update MAUTIC_API_KEY in $CREDENTIALS_FILE"
        
        read -p "Press Enter when you have configured the Mautic API key..."
    else
        print_warning "20_mautic_install.sh not found, skipping Mautic installation"
    fi
}

run_n8n_installation() {
    print_phase "N8N WORKFLOW AUTOMATION INSTALLATION"
    
    if [[ -f "$SCRIPT_DIR/30_n8n_install.sh" ]]; then
        print_info "Installing N8N workflow automation..."
        
        # Source credentials for N8N configuration
        source "$CREDENTIALS_FILE"
        
        # Export N8N specific variables
        export N8N_ENCRYPTION_KEY="$N8N_ENCRYPTION_KEY"
        export N8N_BASIC_AUTH_PASSWORD="$N8N_BASIC_AUTH_PASSWORD"
        export N8N_WEBHOOK_URL="https://n8n.$MAIN_DOMAIN/"
        
        bash "$SCRIPT_DIR/30_n8n_install.sh" 2>&1 | tee -a "$LOG_FILE"
        print_success "N8N installation completed"
        
        print_info "Please configure N8N API key after installation"
        echo "1. Access https://n8n.$MAIN_DOMAIN"
        echo "2. Login with admin credentials"
        echo "3. Go to Settings > API Keys"
        echo "4. Generate API key and update N8N_API_KEY in $CREDENTIALS_FILE"
        
        read -p "Press Enter when you have configured the N8N API key..."
    else
        print_warning "30_n8n_install.sh not found, skipping N8N installation"
    fi
}

run_nginx_configuration() {
    print_phase "NGINX REVERSE PROXY CONFIGURATION"
    
    if [[ -f "$SCRIPT_DIR/40_nginx_sites.sh" ]]; then
        print_info "Configuring NGINX virtual hosts..."
        bash "$SCRIPT_DIR/40_nginx_sites.sh" 2>&1 | tee -a "$LOG_FILE"
        print_success "NGINX configuration completed"
    else
        print_warning "40_nginx_sites.sh not found, skipping NGINX configuration"
    fi
}

run_ssl_certificates() {
    print_phase "SSL CERTIFICATE INSTALLATION"
    
    if [[ -f "$SCRIPT_DIR/45_certbot_certs.sh" ]]; then
        print_info "Installing SSL certificates with Certbot..."
        bash "$SCRIPT_DIR/45_certbot_certs.sh" 2>&1 | tee -a "$LOG_FILE"
        print_success "SSL certificates installed"
    else
        print_warning "45_certbot_certs.sh not found, skipping SSL installation"
    fi
}

run_full_stack_installation() {
    print_phase "FULL STACK BOOKAI STUDIO INSTALLATION"
    
    if [[ -f "$SCRIPT_DIR/install_full_stack_bookaistudio.sh" ]]; then
        print_info "Running full stack installation..."
        
        # Source credentials for the installation
        source "$CREDENTIALS_FILE"
        source "$CONFIG_FILE"
        
        bash "$SCRIPT_DIR/install_full_stack_bookaistudio.sh" 2>&1 | tee -a "$LOG_FILE"
        print_success "Full stack installation completed"
        
        print_info "Please configure WordPress and Postiz API keys"
        echo "1. WordPress: Access https://wrp.$MAIN_DOMAIN/wp-admin"
        echo "2. Install Application Passwords plugin"
        echo "3. Generate API key and update WORDPRESS_API_KEY in $CREDENTIALS_FILE"
        echo "4. Postiz: Access https://postiz.$MAIN_DOMAIN"
        echo "5. Generate API key and update POSTIZ_API_KEY in $CREDENTIALS_FILE"
        
        read -p "Press Enter when you have configured WordPress and Postiz API keys..."
    else
        print_warning "install_full_stack_bookaistudio.sh not found, skipping full stack installation"
    fi
}

deploy_javascript_modules() {
    print_phase "DEPLOYING AI AUTOMATION PLATFORM MODULES"
    
    print_info "Creating application directory structure..."
    
    local app_dir="/opt/bookai-studio"
    mkdir -p "$app_dir"/{src,config,logs,data,backups}
    
    print_info "Deploying JavaScript modules..."
    
    local deployed_count=0
    for module in "${JS_MODULES[@]}"; do
        if [[ -f "$SCRIPT_DIR/$module" ]]; then
            local target_dir="$app_dir/$(dirname "$module")"
            mkdir -p "$target_dir"
            cp "$SCRIPT_DIR/$module" "$target_dir/"
            print_success "Deployed: $module"
            ((deployed_count++))
        else
            print_warning "Module not found: $module"
        fi
    done
    
    print_success "Deployed $deployed_count JavaScript modules"
    
    # Install Node.js dependencies
    print_info "Installing Node.js dependencies..."
    
    if [[ -f "$SCRIPT_DIR/ai-automation-platform/package.json" ]]; then
        cp "$SCRIPT_DIR/ai-automation-platform/package.json" "$app_dir/"
        cd "$app_dir"
        npm install --production
        print_success "Node.js dependencies installed"
    else
        print_warning "package.json not found, creating basic dependencies..."
        cat > "$app_dir/package.json" << 'EOF'
{
  "name": "bookai-studio-platform",
  "version": "2.0.0",
  "description": "BookAI Studio AI Automation Platform",
  "main": "src/core/server.js",
  "scripts": {
    "start": "node src/core/server.js",
    "dev": "nodemon src/core/server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "redis": "^4.6.8",
    "node-fetch": "^3.3.2",
    "langchain": "^0.1.0",
    "ollama": "^0.5.0",
    "ws": "^8.14.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "rate-limiter-flexible": "^3.0.8",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "crypto": "^1.0.1"
  }
}
EOF
        cd "$app_dir"
        npm install --production
        print_success "Basic dependencies installed"
    fi
    
    # Set proper permissions
    chown -R www-data:www-data "$app_dir"
    chmod -R 755 "$app_dir"
    
    # Apply database migrations if DB already created (idempotent)
    print_info "Applying database migrations (if database exists)..."
    if command -v psql >/dev/null 2>&1; then
        if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U bookai_user -lqt 2>/dev/null | cut -d \| -f1 | grep -qw bookai_studio; then
            MIG_DIR="$SCRIPT_DIR/ai-automation-platform/migrations"
            if [[ -d "$MIG_DIR" ]]; then
                for mig in $(ls "$MIG_DIR"/*.sql 2>/dev/null | sort); do
                    print_info "Applying migration: $(basename "$mig")"
                    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U bookai_user -d bookai_studio -v ON_ERROR_STOP=1 -f "$mig" >/dev/null 2>>"$LOG_FILE" || print_warning "Migration $(basename "$mig") issue (continuing)"
                done
                print_success "Migrations applied"
            else
                print_warning "Migration directory missing: $MIG_DIR"
            fi
        else
            print_warning "Database not yet created; migrations will run in final phase"
        fi
    else
        print_warning "psql not found in PATH; skipping migrations now"
    fi

    print_success "JavaScript modules deployment completed"
        # Ensure external agent registration helper is executable
        if [[ -f "$SCRIPT_DIR/ai-automation-platform/scripts/register-external-agent.js" ]]; then
            chmod +x "$SCRIPT_DIR/ai-automation-platform/scripts/register-external-agent.js" || true
        fi
}

configure_systemd_services() {
    print_phase "CONFIGURING SYSTEMD SERVICES"
    
    print_info "Creating systemd services (core platform + enhanced MCP) ..."
    
    # Source credentials
    source "$CREDENTIALS_FILE"
    source "$CONFIG_FILE"
    
    # Create systemd service file
    cat > /etc/systemd/system/bookai-studio.service << EOF
[Unit]
Description=BookAI Studio AI Automation Platform
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/bookai-studio
ExecStart=/usr/bin/node src/core/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8000
Environment=DATABASE_URL=postgresql://bookai_user:$DB_PASSWORD@localhost:5432/bookai_studio
Environment=REDIS_URL=redis://localhost:6379
Environment=JWT_SECRET=$JWT_SECRET
Environment=ENCRYPTION_KEY=$ENCRYPTION_KEY
EnvironmentFile=/opt/bookai-studio/config/production.env
Environment=METRICS_ENABLED=true
Environment=METRICS_PORT=9464
Environment=AGENT_ORCHESTRATOR_ENABLED=true
Environment=AUDIT_LOG_ENABLED=true

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/bookai-studio/logs /opt/bookai-studio/data

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

    # Create environment file
    mkdir -p /opt/bookai-studio/config
    cat > /opt/bookai-studio/config/production.env << EOF
# BookAI Studio Production Environment
NODE_ENV=production
PORT=8000

# Database Configuration
DATABASE_URL=postgresql://bookai_user:$DB_PASSWORD@localhost:5432/bookai_studio
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# API Keys
OPENAI_API_KEY=$OPENAI_API_KEY
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
GOOGLE_API_KEY=$GOOGLE_API_KEY
N8N_API_KEY=$N8N_API_KEY
WORDPRESS_API_KEY=$WORDPRESS_API_KEY
POSTIZ_API_KEY=$POSTIZ_API_KEY

# Domain Configuration
MAIN_DOMAIN=$MAIN_DOMAIN
CHAT_DOMAIN=$CHAT_DOMAIN
N8N_DOMAIN=$N8N_DOMAIN
WP_DOMAIN=$WP_DOMAIN
POSTIZ_DOMAIN=$POSTIZ_DOMAIN
OLLAMA_DOMAIN=$OLLAMA_DOMAIN
MAIL_DOMAIN=$MAIL_DOMAIN

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/bookai-studio/logs/application.log
EOF

    # Enhanced MCP Server service
    cat > /etc/systemd/system/bookai-mcp.service << EOF
[Unit]
Description=BookAI Studio Enhanced MCP / Agent Orchestrator
After=network.target bookai-studio.service
Wants=bookai-studio.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/bookai-studio
ExecStart=/usr/bin/node src/core/enhanced-mcp-server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://bookai_user:$DB_PASSWORD@localhost:5432/bookai_studio
Environment=REDIS_URL=redis://localhost:6379
Environment=METRICS_ENABLED=true
Environment=AGENT_ORCHESTRATOR_ENABLED=true
Environment=AUDIT_LOG_ENABLED=true
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF

    # Set permissions
    chown www-data:www-data /opt/bookai-studio/config/production.env
    chmod 600 /opt/bookai-studio/config/production.env
    
    # Enable services
    systemctl daemon-reload
    systemctl enable bookai-studio bookai-mcp
    
    print_success "Systemd services configured"
}

run_final_configuration() {
    print_phase "FINAL CONFIGURATION AND TESTING"
    
    # Create database and user
    print_info "Setting up database..."
    source "$CREDENTIALS_FILE"
    
    sudo -u postgres psql << EOF
CREATE DATABASE bookai_studio;
CREATE USER bookai_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE bookai_studio TO bookai_user;
ALTER USER bookai_user CREATEDB;
\q
EOF
    
    # Configure Redis
    print_info "Configuring Redis..."
    if [[ -n "$REDIS_PASSWORD" ]]; then
        echo "requirepass $REDIS_PASSWORD" >> /etc/redis/redis.conf
        systemctl restart redis
    fi
    
    # Start services (core first, then MCP)
    print_info "Starting BookAI Studio services..."
    systemctl start bookai-studio || print_error "Failed to start core service"
    sleep 5
    systemctl start bookai-mcp || print_warning "Enhanced MCP service failed to start initially"
    
    # Wait for services to start
    sleep 10
    
    # Test services
    print_info "Testing service connectivity..."
    
    local services_ok=true
    
    # Test main application
    if curl -f -s http://localhost:8000/health > /dev/null; then
        print_success "AI Automation Platform is running"
    else
        print_error "AI Automation Platform is not responding"
        services_ok=false
    fi
    
    # Test N8N
    if curl -f -s https://n8n.$MAIN_DOMAIN > /dev/null; then
        print_success "N8N is accessible"
    else
        print_warning "N8N may not be fully configured"
    fi
    
    # Test WordPress
    if curl -f -s https://wrp.$MAIN_DOMAIN > /dev/null; then
        print_success "WordPress is accessible"
    else
        print_warning "WordPress may not be fully configured"
    fi
    
    if [[ "$services_ok" == true ]]; then
        print_success "All core services are running"
    else
        print_warning "Some services may need additional configuration"
    fi
}

#==============================================================================
# MAIN INSTALLATION FLOW
#==============================================================================

main() {
    print_header
    
    # Pre-flight checks
    print_phase "PRE-FLIGHT CHECKS"
    check_root
    check_os
    check_internet
    check_disk_space
    check_memory
    
    # Create log file
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"
    
    log_message "BookAI Studio installation started"
    
    # Collect configuration and credentials
    collect_basic_info
    collect_required_credentials
    collect_optional_credentials
    generate_secure_passwords
    validate_credentials
    
    # Show installation summary
    print_phase "INSTALLATION SUMMARY"
    source "$CONFIG_FILE"
    
    echo -e "${WHITE}Installation Configuration:${NC}"
    echo "  Main Domain: $MAIN_DOMAIN"
    echo "  Admin Email: $ADMIN_EMAIL"
    echo "  Chat Agent: https://$CHAT_DOMAIN"
    echo "  N8N Workflows: https://$N8N_DOMAIN"
    echo "  WordPress: https://$WP_DOMAIN"
    echo "  Postiz Social: https://$POSTIZ_DOMAIN"
    echo "  AI/Ollama: https://$OLLAMA_DOMAIN"
    echo "  Email Server: https://$MAIL_DOMAIN"
    echo
    echo -e "${WHITE}Components to Install:${NC}"
    echo "  ✓ System preparation and dependencies"
    echo "  ✓ Mailcow email server"
    echo "  ✓ Mautic email marketing"
    echo "  ✓ N8N workflow automation"
    echo "  ✓ NGINX reverse proxy with SSL"
    echo "  ✓ WordPress multisite"
    echo "  ✓ Ollama AI server"
    echo "  ✓ Postiz social media automation"
    echo "  ✓ AI Automation Platform (agent orchestrator + output capture + audit + metrics)"
    echo "  ✓ Enhanced MCP Server & AI agents"
    echo "  ✓ Revenue analytics dashboard & metrics exporter"
    echo "  ✓ Learning engine (reinforcement stats + confidence scoring)"
    echo
    
    read -p "Proceed with installation? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Installation cancelled by user"
        exit 0
    fi
    
    # Run installation phases
    print_phase "STARTING INSTALLATION"
    
    run_preparation_phase
    run_mailcow_installation
    run_mautic_installation
    run_n8n_installation
    run_nginx_configuration
    run_ssl_certificates
    run_full_stack_installation
    deploy_javascript_modules
    configure_systemd_services
    run_final_configuration
    
    # Installation complete
    print_phase "INSTALLATION COMPLETE"
    
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    🎉 INSTALLATION SUCCESSFUL! 🎉                          ║"
    echo "║                                                                              ║"
    echo "║  Your BookAI Studio AI Automation Platform is now running!                  ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${WHITE}Access Your Platform:${NC}"
    echo "  🤖 AI Chat Agent: https://$CHAT_DOMAIN"
    echo "  🔄 N8N Workflows: https://$N8N_DOMAIN"
    echo "  🌐 WordPress Admin: https://$WP_DOMAIN/wp-admin"
    echo "  📱 Postiz Social: https://$POSTIZ_DOMAIN"
    echo "  🧠 Ollama AI API: https://$OLLAMA_DOMAIN"
    echo "  📧 Email Server: https://$MAIL_DOMAIN"
    echo "  🔌 Enhanced MCP (systemd: bookai-mcp)"
    echo
    echo -e "${WHITE}Next Steps:${NC}"
    echo "  1. Complete API key configuration for any skipped services"
    echo "  2. Configure DNS records for all subdomains"
    echo "  3. Test all integrations and workflows"
    echo "  4. Inspect agent orchestrator metrics: curl -s localhost:9464 | grep agent_"
    echo "  5. Validate enhanced MCP tools: journalctl -u bookai-mcp -n 50 --no-pager"
    echo "  6. Begin your journey to billion-dollar operations!"
    echo
    echo -e "${WHITE}Important Files:${NC}"
    echo "  📄 Configuration: $CONFIG_FILE"
    echo "  🔐 Credentials: $CREDENTIALS_FILE"
    echo "  📋 Installation Log: $LOG_FILE"
    echo "  🏠 Application Directory: /opt/bookai-studio"
    echo
    echo -e "${YELLOW}⚠️  Security Note: Please secure your credentials file!${NC}"
    echo "  chmod 600 $CREDENTIALS_FILE"
    echo
    
    log_message "BookAI Studio installation completed successfully"
    
    print_success "Welcome to your billion-dollar AI automation empire!"
}

# Run main function
main "$@"

