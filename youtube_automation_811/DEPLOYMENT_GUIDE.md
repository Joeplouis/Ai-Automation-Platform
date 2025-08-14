# AI Automation Platform - Deployment Guide

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Production Deployment](#production-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Security Hardening](#security-hardening)
5. [Performance Optimization](#performance-optimization)
6. [Monitoring Setup](#monitoring-setup)
7. [Backup Configuration](#backup-configuration)
8. [SSL/TLS Setup](#ssltls-setup)
9. [Load Balancing](#load-balancing)
10. [Maintenance Procedures](#maintenance-procedures)

---

## Pre-Deployment Checklist

### System Requirements

#### Minimum Requirements
- **OS**: Ubuntu 22.04 LTS or newer
- **CPU**: 4 cores (2.4GHz+)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 100GB SSD minimum, 500GB recommended
- **Network**: 1Gbps connection
- **Bandwidth**: 10TB/month minimum

#### Recommended Production Setup
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 8+ cores (3.0GHz+)
- **RAM**: 32GB+
- **Storage**: 1TB+ NVMe SSD
- **Network**: 10Gbps connection
- **Bandwidth**: Unlimited

### Domain Requirements

#### Primary Domains
- `bookaistudio.com` - Main website
- `api.bookaistudio.com` - API endpoint
- `dashboard.bookaistudio.com` - Admin dashboard
- `mcp.bookaistudio.com` - MCP server

#### Service Subdomains
- `n8n.bookaistudio.com` - N8N workflows
- `postiz.bookaistudio.com` - Social media automation
- `wrp.bookaistudio.com` - WordPress multisite
- `mail.bookaistudio.com` - Email server
- `chat.bookaistudio.com` - AI chat interface

### SSL Certificates

#### Let's Encrypt Setup
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificates for all domains
sudo certbot --nginx -d bookaistudio.com \
  -d api.bookaistudio.com \
  -d dashboard.bookaistudio.com \
  -d mcp.bookaistudio.com \
  -d n8n.bookaistudio.com \
  -d postiz.bookaistudio.com \
  -d wrp.bookaistudio.com \
  -d mail.bookaistudio.com \
  -d chat.bookaistudio.com
```

### DNS Configuration

#### Required DNS Records
```dns
; A Records
bookaistudio.com.           IN A    168.231.74.188
api.bookaistudio.com.       IN A    168.231.74.188
dashboard.bookaistudio.com. IN A    168.231.74.188
mcp.bookaistudio.com.       IN A    168.231.74.188
n8n.bookaistudio.com.       IN A    168.231.74.188
postiz.bookaistudio.com.    IN A    168.231.74.188
wrp.bookaistudio.com.       IN A    168.231.74.188
mail.bookaistudio.com.      IN A    168.231.74.188
chat.bookaistudio.com.      IN A    168.231.74.188

; CNAME Records
www.bookaistudio.com.       IN CNAME bookaistudio.com.

; MX Records (for email)
bookaistudio.com.           IN MX 10 mail.bookaistudio.com.

; TXT Records (for verification)
bookaistudio.com.           IN TXT  "v=spf1 include:mail.bookaistudio.com ~all"
_dmarc.bookaistudio.com.    IN TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@bookaistudio.com"
```

---

## Production Deployment

### Step 1: Server Preparation

#### 1.1 Update System
```bash
# Update package lists and system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git vim htop unzip software-properties-common

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version
npm --version
```

#### 1.2 Create Application User
```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash aiautomation
sudo usermod -aG sudo aiautomation

# Switch to application user
sudo su - aiautomation
```

#### 1.3 Configure Firewall
```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application ports
sudo ufw allow 8002/tcp  # MCP Server
sudo ufw allow 8003/tcp  # WordPress MCP
sudo ufw allow 5678/tcp  # N8N
sudo ufw allow 11434/tcp # Ollama

# Check firewall status
sudo ufw status verbose
```

### Step 2: Database Setup

#### 2.1 Install PostgreSQL
```bash
# Install PostgreSQL 14+
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE ai_automation;
CREATE USER ai_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE ai_automation TO ai_user;
ALTER USER ai_user CREATEDB;
\q
EOF
```

#### 2.2 Install Redis
```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Uncomment and set: requirepass your_redis_password_here

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### Step 3: Application Deployment

#### 3.1 Clone Repository
```bash
# Clone the application
cd /home/aiautomation
git clone https://github.com/yourusername/ai-automation-platform.git
cd ai-automation-platform

# Set proper permissions
sudo chown -R aiautomation:aiautomation /home/aiautomation/ai-automation-platform
```

#### 3.2 Install Dependencies
```bash
# Install Node.js dependencies
npm install --production

# Install PM2 for process management
sudo npm install -g pm2

# Install global tools
sudo npm install -g @nestjs/cli
```

#### 3.3 Environment Configuration
```bash
# Create production environment file
cp .env.example .env.production

# Edit environment variables
nano .env.production
```

#### 3.4 Database Migration
```bash
# Run database migrations
npm run migrate:prod

# Seed initial data
npm run seed:prod
```

### Step 4: Service Configuration

#### 4.1 Install Ollama
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
sudo systemctl start ollama
sudo systemctl enable ollama

# Download required models
ollama pull llama3.1:8b
ollama pull qwen2.5:14b
ollama pull codellama:7b
ollama pull qwen2.5:32b
```

#### 4.2 Install Nginx
```bash
# Install Nginx
sudo apt install -y nginx

# Remove default configuration
sudo rm /etc/nginx/sites-enabled/default

# Create application configuration
sudo nano /etc/nginx/sites-available/ai-automation-platform
```

#### 4.3 Nginx Configuration
```nginx
# Main configuration
upstream api_backend {
    server 127.0.0.1:8002;
    keepalive 32;
}

upstream mcp_backend {
    server 127.0.0.1:8003;
    keepalive 32;
}

upstream n8n_backend {
    server 127.0.0.1:5678;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=dashboard:10m rate=5r/s;

# Main API server
server {
    listen 443 ssl http2;
    server_name api.bookaistudio.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.bookaistudio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.bookaistudio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req zone=api burst=20 nodelay;

    # Proxy configuration
    location / {
        proxy_pass http://api_backend;
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

# Dashboard server
server {
    listen 443 ssl http2;
    server_name dashboard.bookaistudio.com;

    ssl_certificate /etc/letsencrypt/live/dashboard.bookaistudio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.bookaistudio.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Rate limiting
    limit_req zone=dashboard burst=10 nodelay;

    # Serve static dashboard files
    root /home/aiautomation/ai-automation-platform/dashboard/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy for dashboard
    location /api/ {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# MCP Server
server {
    listen 443 ssl http2;
    server_name mcp.bookaistudio.com;

    ssl_certificate /etc/letsencrypt/live/mcp.bookaistudio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.bookaistudio.com/privkey.pem;

    location / {
        proxy_pass http://mcp_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# N8N Workflows
server {
    listen 443 ssl http2;
    server_name n8n.bookaistudio.com;

    ssl_certificate /etc/letsencrypt/live/n8n.bookaistudio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/n8n.bookaistudio.com/privkey.pem;

    location / {
        proxy_pass http://n8n_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.bookaistudio.com dashboard.bookaistudio.com mcp.bookaistudio.com n8n.bookaistudio.com;
    return 301 https://$server_name$request_uri;
}
```

#### 4.4 Enable Nginx Configuration
```bash
# Enable the configuration
sudo ln -s /etc/nginx/sites-available/ai-automation-platform /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 5: Process Management

#### 5.1 PM2 Configuration
```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'ai-automation-api',
      script: 'src/core/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8002
      },
      error_file: '/var/log/ai-automation/api-error.log',
      out_file: '/var/log/ai-automation/api-out.log',
      log_file: '/var/log/ai-automation/api-combined.log',
      time: true,
      max_memory_restart: '2G',
      node_args: '--max-old-space-size=4096'
    },
    {
      name: 'ai-automation-mcp',
      script: 'src/core/enhanced-mcp-server.js',
      instances: 2,
      env: {
        NODE_ENV: 'production',
        PORT: 8003
      },
      error_file: '/var/log/ai-automation/mcp-error.log',
      out_file: '/var/log/ai-automation/mcp-out.log',
      log_file: '/var/log/ai-automation/mcp-combined.log',
      time: true,
      max_memory_restart: '1G'
    },
    {
      name: 'ai-automation-worker',
      script: 'src/workers/workflow-worker.js',
      instances: 4,
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/ai-automation/worker-error.log',
      out_file: '/var/log/ai-automation/worker-out.log',
      log_file: '/var/log/ai-automation/worker-combined.log',
      time: true,
      max_memory_restart: '1G'
    }
  ]
};
```

#### 5.2 Start Services
```bash
# Create log directory
sudo mkdir -p /var/log/ai-automation
sudo chown -R aiautomation:aiautomation /var/log/ai-automation

# Start applications with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup
# Follow the instructions provided by PM2
```

---

## Environment Configuration

### Production Environment Variables

Create `/home/aiautomation/ai-automation-platform/.env.production`:

```bash
# Application Configuration
NODE_ENV=production
PORT=8002
MCP_PORT=8003

# Database Configuration
DATABASE_URL=postgresql://ai_user:your_secure_password_here@localhost:5432/ai_automation
REDIS_URL=redis://:your_redis_password_here@localhost:6379

# Security
JWT_SECRET=your_jwt_secret_here_minimum_32_characters
ENCRYPTION_KEY=your_encryption_key_here_32_characters
API_KEY_SECRET=your_api_key_secret_here

# External Services
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen2.5:14b

# WordPress Configuration
WORDPRESS_DEFAULT_URL=https://wrp.bookaistudio.com
WORDPRESS_API_USER=admin
WORDPRESS_API_PASSWORD=your_wordpress_password

# Social Media Configuration
POSTIZ_BASE_URL=https://postiz.bookaistudio.com
POSTIZ_API_KEY=your_postiz_api_key

# Email Configuration
SMTP_HOST=mail.bookaistudio.com
SMTP_PORT=587
SMTP_USER=noreply@bookaistudio.com
SMTP_PASSWORD=your_email_password

# Monitoring
SENTRY_DSN=your_sentry_dsn_here
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/home/aiautomation/ai-automation-platform/uploads

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=ai-automation-backups
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

### Configuration Validation

```bash
# Validate environment configuration
npm run validate:config

# Test database connection
npm run test:db

# Test Redis connection
npm run test:redis

# Test external APIs
npm run test:apis
```

---

## Security Hardening

### System Security

#### 1. SSH Hardening
```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Recommended settings:
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2

# Restart SSH
sudo systemctl restart sshd
```

#### 2. Fail2Ban Setup
```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Create custom configuration
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 2222

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 7200
maxretry = 10
```

#### 3. System Updates
```bash
# Enable automatic security updates
sudo apt install -y unattended-upgrades

# Configure automatic updates
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades

# Enable the service
sudo systemctl enable unattended-upgrades
```

### Application Security

#### 1. API Security
```javascript
// Add to server configuration
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', apiLimiter);
```

#### 2. Database Security
```sql
-- Create read-only user for reporting
CREATE USER ai_readonly WITH ENCRYPTED PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE ai_automation TO ai_readonly;
GRANT USAGE ON SCHEMA public TO ai_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_readonly;

-- Enable row-level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_policy ON users FOR ALL TO ai_user USING (user_id = current_user_id());
```

#### 3. File System Security
```bash
# Set proper file permissions
chmod 600 .env.production
chmod 700 /home/aiautomation/ai-automation-platform/uploads
chmod 755 /home/aiautomation/ai-automation-platform/public

# Create restricted directories
sudo mkdir -p /var/lib/ai-automation/{secrets,temp}
sudo chown -R aiautomation:aiautomation /var/lib/ai-automation
sudo chmod 700 /var/lib/ai-automation/secrets
```

---

## Performance Optimization

### Database Optimization

#### 1. PostgreSQL Tuning
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf
```

```ini
# Memory settings
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 64MB
maintenance_work_mem = 512MB

# Connection settings
max_connections = 200
shared_preload_libraries = 'pg_stat_statements'

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Query optimization
random_page_cost = 1.1
effective_io_concurrency = 200
```

#### 2. Database Indexing
```sql
-- Create performance indexes
CREATE INDEX CONCURRENTLY idx_workflows_user_id ON workflows(user_id);
CREATE INDEX CONCURRENTLY idx_workflows_status ON workflows(status);
CREATE INDEX CONCURRENTLY idx_workflows_created_at ON workflows(created_at);

CREATE INDEX CONCURRENTLY idx_social_posts_account_id ON social_posts(account_id);
CREATE INDEX CONCURRENTLY idx_social_posts_created_at ON social_posts(created_at);

CREATE INDEX CONCURRENTLY idx_commission_transactions_network_id ON commission_transactions(network_id);
CREATE INDEX CONCURRENTLY idx_commission_transactions_created_at ON commission_transactions(created_at);

-- Analyze tables
ANALYZE;
```

### Redis Optimization

#### 1. Redis Configuration
```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf
```

```ini
# Memory optimization
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Network
tcp-keepalive 300
timeout 0

# Performance
tcp-backlog 511
databases 16
```

### Application Optimization

#### 1. Node.js Optimization
```javascript
// Add to server startup
process.env.UV_THREADPOOL_SIZE = 128;

// Optimize garbage collection
const v8 = require('v8');
v8.setFlagsFromString('--max-old-space-size=4096');
v8.setFlagsFromString('--optimize-for-size');

// Connection pooling
const pool = new Pool({
  host: 'localhost',
  database: 'ai_automation',
  user: 'ai_user',
  password: process.env.DB_PASSWORD,
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### 2. Caching Strategy
```javascript
// Redis caching middleware
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  password: process.env.REDIS_PASSWORD
});

// Cache frequently accessed data
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await client.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      client.setex(key, duration, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  };
};
```

---

## Monitoring Setup

### System Monitoring

#### 1. Install Monitoring Tools
```bash
# Install system monitoring
sudo apt install -y htop iotop nethogs

# Install log monitoring
sudo apt install -y logwatch

# Install process monitoring
sudo npm install -g pm2-logrotate
pm2 install pm2-logrotate
```

#### 2. Custom Monitoring Script
```bash
# Create monitoring script
nano /home/aiautomation/scripts/monitor.sh
```

```bash
#!/bin/bash

# System monitoring script
LOG_FILE="/var/log/ai-automation/system-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check system resources
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.2f"), $3/$2 * 100.0}')
DISK_USAGE=$(df -h / | awk 'NR==2{printf "%s", $5}' | sed 's/%//')

# Check services
NGINX_STATUS=$(systemctl is-active nginx)
POSTGRESQL_STATUS=$(systemctl is-active postgresql)
REDIS_STATUS=$(systemctl is-active redis-server)
OLLAMA_STATUS=$(systemctl is-active ollama)

# Log results
echo "[$DATE] CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%, Disk: ${DISK_USAGE}%" >> $LOG_FILE
echo "[$DATE] Services - Nginx: $NGINX_STATUS, PostgreSQL: $POSTGRESQL_STATUS, Redis: $REDIS_STATUS, Ollama: $OLLAMA_STATUS" >> $LOG_FILE

# Send alerts if thresholds exceeded
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "High CPU usage: ${CPU_USAGE}%" | mail -s "System Alert" admin@bookaistudio.com
fi

if (( $(echo "$MEMORY_USAGE > 85" | bc -l) )); then
    echo "High memory usage: ${MEMORY_USAGE}%" | mail -s "System Alert" admin@bookaistudio.com
fi
```

#### 3. Setup Cron Jobs
```bash
# Edit crontab
crontab -e

# Add monitoring jobs
*/5 * * * * /home/aiautomation/scripts/monitor.sh
0 2 * * * /home/aiautomation/scripts/backup.sh
0 0 * * 0 /home/aiautomation/scripts/weekly-maintenance.sh
```

### Application Monitoring

#### 1. Health Check Endpoints
```javascript
// Add health check routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});

app.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      ollama: await checkOllama(),
      external_apis: await checkExternalAPIs()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(check => check.status === 'ok');
  health.status = isHealthy ? 'healthy' : 'unhealthy';
  
  res.status(isHealthy ? 200 : 503).json(health);
});
```

#### 2. Performance Metrics
```javascript
// Add performance monitoring
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

// Middleware to collect metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

---

## Backup Configuration

### Automated Backup System

#### 1. Database Backup Script
```bash
# Create backup script
nano /home/aiautomation/scripts/backup.sh
```

```bash
#!/bin/bash

# Backup configuration
BACKUP_DIR="/home/aiautomation/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR/{database,files,config}

# Database backup
echo "Starting database backup..."
sudo -u postgres pg_dump ai_automation | gzip > $BACKUP_DIR/database/db_backup_$DATE.sql.gz

# Files backup
echo "Starting files backup..."
tar -czf $BACKUP_DIR/files/files_backup_$DATE.tar.gz \
  /home/aiautomation/ai-automation-platform \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=logs

# Configuration backup
echo "Starting configuration backup..."
tar -czf $BACKUP_DIR/config/config_backup_$DATE.tar.gz \
  /etc/nginx/sites-available \
  /etc/postgresql/14/main \
  /etc/redis

# Upload to S3 (if configured)
if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "Uploading to S3..."
    aws s3 sync $BACKUP_DIR s3://ai-automation-backups/$(hostname)/
fi

# Clean old backups
echo "Cleaning old backups..."
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully"
```

#### 2. Backup Verification
```bash
# Create verification script
nano /home/aiautomation/scripts/verify-backup.sh
```

```bash
#!/bin/bash

# Verify latest backup
BACKUP_DIR="/home/aiautomation/backups"
LATEST_DB_BACKUP=$(ls -t $BACKUP_DIR/database/*.sql.gz | head -1)

# Test database backup
echo "Verifying database backup..."
gunzip -t $LATEST_DB_BACKUP
if [ $? -eq 0 ]; then
    echo "Database backup is valid"
else
    echo "Database backup is corrupted!" | mail -s "Backup Alert" admin@bookaistudio.com
fi

# Test file backup
LATEST_FILE_BACKUP=$(ls -t $BACKUP_DIR/files/*.tar.gz | head -1)
echo "Verifying file backup..."
tar -tzf $LATEST_FILE_BACKUP > /dev/null
if [ $? -eq 0 ]; then
    echo "File backup is valid"
else
    echo "File backup is corrupted!" | mail -s "Backup Alert" admin@bookaistudio.com
fi
```

### Disaster Recovery

#### 1. Recovery Procedures
```bash
# Create recovery script
nano /home/aiautomation/scripts/recover.sh
```

```bash
#!/bin/bash

# Disaster recovery script
BACKUP_DIR="/home/aiautomation/backups"
RECOVERY_DATE=${1:-$(date +%Y%m%d)}

echo "Starting disaster recovery for date: $RECOVERY_DATE"

# Stop services
sudo systemctl stop nginx
pm2 stop all
sudo systemctl stop postgresql

# Restore database
echo "Restoring database..."
sudo -u postgres dropdb ai_automation
sudo -u postgres createdb ai_automation
gunzip -c $BACKUP_DIR/database/db_backup_${RECOVERY_DATE}*.sql.gz | sudo -u postgres psql ai_automation

# Restore files
echo "Restoring files..."
cd /home/aiautomation
tar -xzf $BACKUP_DIR/files/files_backup_${RECOVERY_DATE}*.tar.gz

# Restore configuration
echo "Restoring configuration..."
sudo tar -xzf $BACKUP_DIR/config/config_backup_${RECOVERY_DATE}*.tar.gz -C /

# Start services
sudo systemctl start postgresql
pm2 start ecosystem.config.js
sudo systemctl start nginx

echo "Recovery completed"
```

---

## SSL/TLS Setup

### Let's Encrypt Configuration

#### 1. Initial Setup
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate certificates
sudo certbot --nginx \
  -d bookaistudio.com \
  -d www.bookaistudio.com \
  -d api.bookaistudio.com \
  -d dashboard.bookaistudio.com \
  -d mcp.bookaistudio.com \
  -d n8n.bookaistudio.com \
  -d postiz.bookaistudio.com \
  -d wrp.bookaistudio.com \
  -d mail.bookaistudio.com \
  -d chat.bookaistudio.com
```

#### 2. Auto-Renewal Setup
```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab
sudo crontab -e

# Add renewal job
0 12 * * * /usr/bin/certbot renew --quiet
```

### Custom SSL Configuration

#### 1. Strong SSL Configuration
```nginx
# Add to Nginx configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;

# Generate DH parameters
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
ssl_dhparam /etc/ssl/certs/dhparam.pem;
```

---

## Load Balancing

### Nginx Load Balancing

#### 1. Multiple Server Setup
```nginx
# Define upstream servers
upstream api_cluster {
    least_conn;
    server 127.0.0.1:8002 weight=3;
    server 127.0.0.1:8004 weight=2;
    server 127.0.0.1:8006 weight=1;
    keepalive 32;
}

upstream mcp_cluster {
    ip_hash;
    server 127.0.0.1:8003;
    server 127.0.0.1:8005;
    keepalive 16;
}

# Health checks
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

#### 2. Session Persistence
```nginx
# Use Redis for session storage
location /api/ {
    proxy_pass http://api_cluster;
    
    # Session persistence
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    
    # Sticky sessions (if needed)
    ip_hash;
}
```

### Application Clustering

#### 1. PM2 Cluster Mode
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'ai-automation-api',
      script: 'src/core/server.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8002
      }
    }
  ]
};
```

#### 2. Redis Session Store
```javascript
// Add to server configuration
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');

const redisClient = redis.createClient({
  host: 'localhost',
  port: 6379,
  password: process.env.REDIS_PASSWORD
});

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

---

## Maintenance Procedures

### Regular Maintenance Tasks

#### 1. Weekly Maintenance Script
```bash
# Create maintenance script
nano /home/aiautomation/scripts/weekly-maintenance.sh
```

```bash
#!/bin/bash

echo "Starting weekly maintenance..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean package cache
sudo apt autoremove -y
sudo apt autoclean

# Rotate logs
sudo logrotate -f /etc/logrotate.conf

# Optimize database
sudo -u postgres psql ai_automation -c "VACUUM ANALYZE;"

# Clear temporary files
sudo find /tmp -type f -atime +7 -delete

# Restart services for fresh start
pm2 restart all
sudo systemctl restart nginx

# Generate maintenance report
echo "Weekly maintenance completed on $(date)" >> /var/log/ai-automation/maintenance.log

echo "Weekly maintenance completed"
```

#### 2. Database Maintenance
```sql
-- Create maintenance procedures
CREATE OR REPLACE FUNCTION maintenance_cleanup()
RETURNS void AS $$
BEGIN
    -- Clean old logs
    DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Clean old sessions
    DELETE FROM user_sessions WHERE expires_at < NOW();
    
    -- Clean old temporary data
    DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL '24 hours';
    
    -- Update statistics
    ANALYZE;
    
    -- Log maintenance
    INSERT INTO system_logs (level, message, created_at) 
    VALUES ('INFO', 'Database maintenance completed', NOW());
END;
$$ LANGUAGE plpgsql;

-- Schedule maintenance
SELECT cron.schedule('database-maintenance', '0 2 * * 0', 'SELECT maintenance_cleanup();');
```

### Performance Monitoring

#### 1. Performance Dashboard
```javascript
// Create performance monitoring endpoint
app.get('/admin/performance', async (req, res) => {
  const metrics = {
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    database: await getDatabaseMetrics(),
    redis: await getRedisMetrics(),
    workflows: await getWorkflowMetrics(),
    api: await getAPIMetrics()
  };
  
  res.json(metrics);
});

async function getDatabaseMetrics() {
  const result = await pool.query(`
    SELECT 
      schemaname,
      tablename,
      n_tup_ins as inserts,
      n_tup_upd as updates,
      n_tup_del as deletes
    FROM pg_stat_user_tables
    ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
    LIMIT 10
  `);
  
  return result.rows;
}
```

#### 2. Automated Scaling
```bash
# Create auto-scaling script
nano /home/aiautomation/scripts/auto-scale.sh
```

```bash
#!/bin/bash

# Auto-scaling based on load
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85

# Get current metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f"), $3/$2 * 100.0}')

# Scale up if needed
if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )) || (( $(echo "$MEMORY_USAGE > $MEMORY_THRESHOLD" | bc -l) )); then
    echo "High load detected. Scaling up..."
    pm2 scale ai-automation-api +2
    pm2 scale ai-automation-worker +1
fi

# Scale down during low usage (optional)
if (( $(echo "$CPU_USAGE < 30" | bc -l) )) && (( $(echo "$MEMORY_USAGE < 50" | bc -l) )); then
    CURRENT_INSTANCES=$(pm2 jlist | jq '.[] | select(.name=="ai-automation-api") | .pm2_env.instances' | head -1)
    if [ "$CURRENT_INSTANCES" -gt 2 ]; then
        echo "Low load detected. Scaling down..."
        pm2 scale ai-automation-api -1
    fi
fi
```

This comprehensive deployment guide provides everything needed to deploy and maintain the AI Automation Platform in a production environment. Follow each section carefully and adapt the configurations to your specific requirements.

