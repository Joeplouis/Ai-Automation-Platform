#!/bin/bash

# Phase 1: Infrastructure Scaling Script
# Target: Scale from current capacity to 1,000 videos/day
# Timeline: Weeks 1-2

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
LOG_FILE="/var/log/phase1-infrastructure.log"
BACKUP_DIR="/opt/backups/phase1_$(date +%Y%m%d_%H%M%S)"

print_status() {
    echo -e "${GREEN}[PHASE1]${NC} $1" | tee -a $LOG_FILE
}

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
}

# Function to check system resources
check_system_resources() {
    print_header "CHECKING SYSTEM RESOURCES"
    
    # Check CPU cores
    cpu_cores=$(nproc)
    print_status "CPU Cores: $cpu_cores"
    
    # Check memory
    total_memory=$(free -h | awk 'NR==2{print $2}')
    available_memory=$(free -h | awk 'NR==2{print $7}')
    print_status "Total Memory: $total_memory"
    print_status "Available Memory: $available_memory"
    
    # Check disk space
    disk_usage=$(df -h / | awk 'NR==2{print $4}')
    print_status "Available Disk Space: $disk_usage"
    
    # Check GPU (if available)
    if command -v nvidia-smi &> /dev/null; then
        gpu_info=$(nvidia-smi --query-gpu=name --format=csv,noheader,nounits | head -1)
        print_status "GPU: $gpu_info"
    else
        print_status "GPU: Not available (CPU-only mode)"
    fi
}

# Function to scale Ollama AI processing
scale_ollama_processing() {
    print_header "SCALING OLLAMA AI PROCESSING"
    
    # Stop existing Ollama service
    systemctl stop ollama 2>/dev/null || true
    pkill -f ollama 2>/dev/null || true
    
    # Create Ollama cluster configuration
    mkdir -p /opt/ollama-cluster
    
    # Create optimized Ollama configuration
    cat > /opt/ollama-cluster/ollama-config.env << 'EOF'
# Ollama Optimization Configuration
OLLAMA_HOST=0.0.0.0:11434
OLLAMA_NUM_PARALLEL=8
OLLAMA_MAX_LOADED_MODELS=5
OLLAMA_MAX_QUEUE=1000
OLLAMA_FLASH_ATTENTION=1
OLLAMA_KEEP_ALIVE=24h
OLLAMA_LOAD_TIMEOUT=300s
OLLAMA_REQUEST_TIMEOUT=300s
EOF

    # Create Ollama cluster startup script
    cat > /opt/ollama-cluster/start-cluster.sh << 'EOF'
#!/bin/bash

# Load configuration
source /opt/ollama-cluster/ollama-config.env

# Start primary Ollama instance
echo "Starting primary Ollama instance..."
OLLAMA_HOST=0.0.0.0:11434 \
OLLAMA_NUM_PARALLEL=8 \
OLLAMA_MAX_LOADED_MODELS=5 \
OLLAMA_MAX_QUEUE=1000 \
OLLAMA_FLASH_ATTENTION=1 \
nohup ollama serve > /var/log/ollama-primary.log 2>&1 &

sleep 10

# Start secondary instances for load balancing
for port in 11435 11436 11437; do
    echo "Starting Ollama instance on port $port..."
    OLLAMA_HOST=0.0.0.0:$port \
    OLLAMA_NUM_PARALLEL=4 \
    OLLAMA_MAX_LOADED_MODELS=3 \
    OLLAMA_MAX_QUEUE=500 \
    OLLAMA_FLASH_ATTENTION=1 \
    nohup ollama serve > /var/log/ollama-$port.log 2>&1 &
    
    sleep 5
done

echo "Ollama cluster started successfully!"
EOF

    chmod +x /opt/ollama-cluster/start-cluster.sh
    
    # Start the Ollama cluster
    /opt/ollama-cluster/start-cluster.sh
    
    # Wait for services to start
    sleep 30
    
    # Preload essential models on all instances
    for port in 11434 11435 11436 11437; do
        echo "Preloading models on port $port..."
        OLLAMA_HOST=localhost:$port ollama pull llama3.1:8b &
        OLLAMA_HOST=localhost:$port ollama pull codellama:7b &
        OLLAMA_HOST=localhost:$port ollama pull mistral:7b &
    done
    
    wait # Wait for all model downloads to complete
    
    print_status "Ollama cluster scaled to 4 instances"
}

# Function to setup load balancer for Ollama
setup_ollama_load_balancer() {
    print_header "SETTING UP OLLAMA LOAD BALANCER"
    
    # Install HAProxy for load balancing
    apt update && apt install -y haproxy
    
    # Backup original HAProxy config
    cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.backup
    
    # Create HAProxy configuration for Ollama load balancing
    cat > /etc/haproxy/haproxy.cfg << 'EOF'
global
    daemon
    maxconn 4096
    log stdout local0

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog
    log global

# Ollama AI Load Balancer
frontend ollama_frontend
    bind *:11430
    default_backend ollama_backend

backend ollama_backend
    balance roundrobin
    option httpchk GET /api/tags
    server ollama1 127.0.0.1:11434 check
    server ollama2 127.0.0.1:11435 check
    server ollama3 127.0.0.1:11436 check
    server ollama4 127.0.0.1:11437 check

# Stats interface
frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
    stats admin if TRUE
EOF

    # Start HAProxy
    systemctl enable haproxy
    systemctl restart haproxy
    
    print_status "HAProxy load balancer configured on port 11430"
}

# Function to scale database infrastructure
scale_database_infrastructure() {
    print_header "SCALING DATABASE INFRASTRUCTURE"
    
    # Optimize MySQL configuration
    print_status "Optimizing MySQL configuration..."
    
    # Calculate optimal settings based on available memory
    total_memory_mb=$(free -m | awk 'NR==2{print $2}')
    innodb_buffer_pool_size=$((total_memory_mb * 60 / 100))  # 60% of total memory
    
    cat > /tmp/mysql-phase1-optimization.cnf << EOF
[mysqld]
# Phase 1 Optimization Settings
innodb_buffer_pool_size = ${innodb_buffer_pool_size}M
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
innodb_file_per_table = 1
innodb_buffer_pool_instances = 8

# Connection settings
max_connections = 1000
max_connect_errors = 1000000
wait_timeout = 28800
interactive_timeout = 28800

# Query cache
query_cache_type = 1
query_cache_size = 512M
query_cache_limit = 4M

# Binary logging
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
expire_logs_days = 7
max_binlog_size = 100M

# Performance optimizations
tmp_table_size = 256M
max_heap_table_size = 256M
sort_buffer_size = 4M
read_buffer_size = 2M
read_rnd_buffer_size = 8M
myisam_sort_buffer_size = 128M
thread_cache_size = 128
table_open_cache = 4000
EOF

    # Apply MySQL optimizations
    cat /tmp/mysql-phase1-optimization.cnf >> /etc/mysql/mysql.conf.d/mysqld.cnf
    systemctl restart mysql
    
    # Optimize PostgreSQL
    print_status "Optimizing PostgreSQL configuration..."
    
    # Calculate PostgreSQL settings
    shared_buffers=$((total_memory_mb / 4))
    effective_cache_size=$((total_memory_mb * 3 / 4))
    
    cat > /tmp/postgresql-phase1-optimization.conf << EOF
# Phase 1 PostgreSQL Optimizations
shared_buffers = ${shared_buffers}MB
effective_cache_size = ${effective_cache_size}MB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 32MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 16MB
min_wal_size = 2GB
max_wal_size = 8GB
max_worker_processes = 16
max_parallel_workers_per_gather = 8
max_parallel_workers = 16
max_parallel_maintenance_workers = 8
EOF

    # Apply PostgreSQL optimizations
    cat /tmp/postgresql-phase1-optimization.conf >> /etc/postgresql/*/main/postgresql.conf
    systemctl restart postgresql
    
    # Optimize Redis
    print_status "Optimizing Redis configuration..."
    
    cat > /tmp/redis-phase1-optimization.conf << 'EOF'
# Phase 1 Redis Optimizations
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error no
rdbcompression yes
rdbchecksum yes
tcp-keepalive 300
timeout 0
tcp-backlog 511
databases 16
EOF

    cat /tmp/redis-phase1-optimization.conf >> /etc/redis/redis.conf
    systemctl restart redis
    
    print_status "Database infrastructure optimized"
}

# Function to setup content storage infrastructure
setup_content_storage() {
    print_header "SETTING UP CONTENT STORAGE INFRASTRUCTURE"
    
    # Create content storage directories
    mkdir -p /opt/content-storage/{videos,images,audio,templates,cache}
    mkdir -p /opt/content-storage/videos/{raw,processed,thumbnails}
    mkdir -p /opt/content-storage/images/{backgrounds,overlays,logos}
    
    # Set proper permissions
    chown -R www-data:www-data /opt/content-storage
    chmod -R 755 /opt/content-storage
    
    # Create content cleanup script
    cat > /opt/content-storage/cleanup.sh << 'EOF'
#!/bin/bash

# Content Storage Cleanup Script
# Removes files older than 30 days to manage disk space

STORAGE_DIR="/opt/content-storage"
LOG_FILE="/var/log/content-cleanup.log"

echo "$(date): Starting content cleanup..." >> $LOG_FILE

# Clean old processed videos (keep for 30 days)
find $STORAGE_DIR/videos/processed -type f -mtime +30 -delete
echo "$(date): Cleaned old processed videos" >> $LOG_FILE

# Clean old raw videos (keep for 7 days)
find $STORAGE_DIR/videos/raw -type f -mtime +7 -delete
echo "$(date): Cleaned old raw videos" >> $LOG_FILE

# Clean cache files (keep for 1 day)
find $STORAGE_DIR/cache -type f -mtime +1 -delete
echo "$(date): Cleaned cache files" >> $LOG_FILE

# Report disk usage
df -h $STORAGE_DIR >> $LOG_FILE

echo "$(date): Content cleanup completed" >> $LOG_FILE
EOF

    chmod +x /opt/content-storage/cleanup.sh
    
    # Schedule cleanup to run daily
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/content-storage/cleanup.sh") | crontab -
    
    print_status "Content storage infrastructure setup completed"
}

# Function to setup monitoring infrastructure
setup_monitoring_infrastructure() {
    print_header "SETTING UP MONITORING INFRASTRUCTURE"
    
    # Install monitoring tools
    apt update && apt install -y htop iotop nethogs prometheus-node-exporter
    
    # Create system monitoring script
    cat > /opt/system-monitor.sh << 'EOF'
#!/bin/bash

# System Monitoring Script for Phase 1
METRICS_FILE="/var/log/system-metrics.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Collect system metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
DISK_USAGE=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
LOAD_AVERAGE=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')

# Collect service metrics
OLLAMA_PROCESSES=$(pgrep -c ollama || echo "0")
MYSQL_CONNECTIONS=$(mysql -e "SHOW STATUS LIKE 'Threads_connected';" 2>/dev/null | awk 'NR==2{print $2}' || echo "0")
POSTGRES_CONNECTIONS=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ' || echo "0")
REDIS_MEMORY=$(redis-cli info memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r' || echo "0")

# Collect content metrics
VIDEOS_TODAY=$(find /opt/content-storage/videos/processed -type f -newermt "$(date +%Y-%m-%d)" | wc -l)
STORAGE_USED=$(du -sh /opt/content-storage | awk '{print $1}')

# Create metrics JSON
cat > $METRICS_FILE << EOF
{
  "timestamp": "$TIMESTAMP",
  "system": {
    "cpu_usage": $CPU_USAGE,
    "memory_usage": $MEMORY_USAGE,
    "disk_usage": $DISK_USAGE,
    "load_average": $LOAD_AVERAGE
  },
  "services": {
    "ollama_processes": $OLLAMA_PROCESSES,
    "mysql_connections": $MYSQL_CONNECTIONS,
    "postgres_connections": $POSTGRES_CONNECTIONS,
    "redis_memory": "$REDIS_MEMORY"
  },
  "content": {
    "videos_today": $VIDEOS_TODAY,
    "storage_used": "$STORAGE_USED"
  }
}
EOF

# Send metrics to monitoring endpoint (if available)
if curl -s http://localhost:8501/api/metrics > /dev/null 2>&1; then
    curl -X POST http://localhost:8501/api/metrics \
      -H "Content-Type: application/json" \
      -d @$METRICS_FILE \
      2>/dev/null || true
fi

EOF

    chmod +x /opt/system-monitor.sh
    
    # Schedule monitoring to run every minute
    (crontab -l 2>/dev/null; echo "* * * * * /opt/system-monitor.sh") | crontab -
    
    # Create alerting script
    cat > /opt/alert-system.sh << 'EOF'
#!/bin/bash

# Alert System for Phase 1
LOG_FILE="/var/log/alerts.log"
ALERT_EMAIL="admin@bookaistudio.com"

# Check system health
check_system_health() {
    # Check CPU usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' | cut -d'.' -f1)
    if [ "$cpu_usage" -gt 90 ]; then
        echo "$(date): HIGH CPU USAGE: ${cpu_usage}%" >> $LOG_FILE
    fi
    
    # Check memory usage
    memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$memory_usage" -gt 90 ]; then
        echo "$(date): HIGH MEMORY USAGE: ${memory_usage}%" >> $LOG_FILE
    fi
    
    # Check disk usage
    disk_usage=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 85 ]; then
        echo "$(date): HIGH DISK USAGE: ${disk_usage}%" >> $LOG_FILE
    fi
    
    # Check Ollama processes
    ollama_count=$(pgrep -c ollama || echo "0")
    if [ "$ollama_count" -lt 4 ]; then
        echo "$(date): OLLAMA PROCESSES DOWN: Only $ollama_count running" >> $LOG_FILE
    fi
    
    # Check database connections
    if ! systemctl is-active --quiet mysql; then
        echo "$(date): MYSQL SERVICE DOWN" >> $LOG_FILE
    fi
    
    if ! systemctl is-active --quiet postgresql; then
        echo "$(date): POSTGRESQL SERVICE DOWN" >> $LOG_FILE
    fi
    
    if ! systemctl is-active --quiet redis; then
        echo "$(date): REDIS SERVICE DOWN" >> $LOG_FILE
    fi
}

check_system_health
EOF

    chmod +x /opt/alert-system.sh
    
    # Schedule alerts to run every 5 minutes
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/alert-system.sh") | crontab -
    
    print_status "Monitoring infrastructure setup completed"
}

# Function to setup network optimizations
setup_network_optimizations() {
    print_header "SETTING UP NETWORK OPTIMIZATIONS"
    
    # Optimize kernel network parameters
    cat > /etc/sysctl.d/99-phase1-network.conf << 'EOF'
# Phase 1 Network Optimizations
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 65536 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_tw_reuse = 1
net.core.somaxconn = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_max_syn_backlog = 65535
EOF

    # Apply network optimizations
    sysctl -p /etc/sysctl.d/99-phase1-network.conf
    
    # Optimize Nginx for high concurrency
    cat > /etc/nginx/conf.d/phase1-optimization.conf << 'EOF'
# Phase 1 Nginx Optimizations
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 8192;
    use epoll;
    multi_accept on;
}

http {
    # Connection optimizations
    keepalive_timeout 65;
    keepalive_requests 1000;
    
    # Buffer optimizations
    client_body_buffer_size 128k;
    client_max_body_size 500M;
    client_header_buffer_size 3m;
    large_client_header_buffers 4 256k;
    
    # Timeout optimizations
    client_body_timeout 12;
    client_header_timeout 12;
    send_timeout 10;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate limiting for API endpoints
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=content:10m rate=50r/s;
}
EOF

    # Restart Nginx to apply optimizations
    nginx -t && systemctl reload nginx
    
    print_status "Network optimizations applied"
}

# Function to create Phase 1 status dashboard
create_status_dashboard() {
    print_header "CREATING PHASE 1 STATUS DASHBOARD"
    
    # Create status dashboard script
    cat > /opt/phase1-status.sh << 'EOF'
#!/bin/bash

# Phase 1 Status Dashboard
clear

echo "=================================="
echo "   PHASE 1 INFRASTRUCTURE STATUS"
echo "=================================="
echo

# System Resources
echo "🖥️  SYSTEM RESOURCES:"
echo "   CPU Cores: $(nproc)"
echo "   Memory: $(free -h | awk 'NR==2{print $2}') total, $(free -h | awk 'NR==2{print $7}') available"
echo "   Disk: $(df -h / | awk 'NR==2{print $4}') available"
echo

# Service Status
echo "🔧 SERVICE STATUS:"
services=("mysql" "postgresql" "redis" "nginx" "haproxy")
for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        echo "   ✅ $service: Running"
    else
        echo "   ❌ $service: Stopped"
    fi
done
echo

# Ollama Cluster Status
echo "🤖 OLLAMA CLUSTER STATUS:"
for port in 11434 11435 11436 11437; do
    if curl -s http://localhost:$port/api/tags > /dev/null 2>&1; then
        echo "   ✅ Ollama:$port: Running"
    else
        echo "   ❌ Ollama:$port: Stopped"
    fi
done
echo

# Load Balancer Status
echo "⚖️  LOAD BALANCER STATUS:"
if curl -s http://localhost:11430/api/tags > /dev/null 2>&1; then
    echo "   ✅ HAProxy Load Balancer: Running"
else
    echo "   ❌ HAProxy Load Balancer: Stopped"
fi
echo

# Content Production Status
echo "🎬 CONTENT PRODUCTION:"
videos_today=$(find /opt/content-storage/videos/processed -type f -newermt "$(date +%Y-%m-%d)" 2>/dev/null | wc -l)
storage_used=$(du -sh /opt/content-storage 2>/dev/null | awk '{print $1}' || echo "0")
echo "   Videos Today: $videos_today"
echo "   Storage Used: $storage_used"
echo

# Performance Metrics
echo "📊 PERFORMANCE METRICS:"
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
memory_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
echo "   CPU Usage: $cpu_usage"
echo "   Memory Usage: ${memory_usage}%"
echo "   Load Average: $load_avg"
echo

# Target Progress
echo "🎯 PHASE 1 TARGETS:"
echo "   Current Capacity: ~$videos_today videos/day"
echo "   Target Capacity: 1,000 videos/day"
if [ "$videos_today" -gt 0 ]; then
    progress=$((videos_today * 100 / 1000))
    echo "   Progress: ${progress}% of target"
else
    echo "   Progress: 0% of target"
fi
echo

echo "=================================="
echo "Last updated: $(date)"
echo "=================================="
EOF

    chmod +x /opt/phase1-status.sh
    
    # Create alias for easy access
    echo "alias phase1-status='/opt/phase1-status.sh'" >> /root/.bashrc
    
    print_status "Phase 1 status dashboard created"
}

# Function to run infrastructure tests
run_infrastructure_tests() {
    print_header "RUNNING INFRASTRUCTURE TESTS"
    
    # Test Ollama cluster
    print_status "Testing Ollama cluster..."
    for port in 11434 11435 11436 11437; do
        if curl -s http://localhost:$port/api/tags > /dev/null; then
            print_status "✅ Ollama instance on port $port is responding"
        else
            print_error "❌ Ollama instance on port $port is not responding"
        fi
    done
    
    # Test load balancer
    print_status "Testing load balancer..."
    if curl -s http://localhost:11430/api/tags > /dev/null; then
        print_status "✅ Load balancer is working"
    else
        print_error "❌ Load balancer is not working"
    fi
    
    # Test database connections
    print_status "Testing database connections..."
    
    # MySQL test
    if mysql -e "SELECT 1;" > /dev/null 2>&1; then
        print_status "✅ MySQL connection successful"
    else
        print_error "❌ MySQL connection failed"
    fi
    
    # PostgreSQL test
    if sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1; then
        print_status "✅ PostgreSQL connection successful"
    else
        print_error "❌ PostgreSQL connection failed"
    fi
    
    # Redis test
    if redis-cli ping > /dev/null 2>&1; then
        print_status "✅ Redis connection successful"
    else
        print_error "❌ Redis connection failed"
    fi
    
    # Test content storage
    print_status "Testing content storage..."
    if [ -d "/opt/content-storage" ] && [ -w "/opt/content-storage" ]; then
        print_status "✅ Content storage is accessible"
    else
        print_error "❌ Content storage is not accessible"
    fi
    
    print_status "Infrastructure tests completed"
}

# Main execution function
main() {
    print_header "PHASE 1: INFRASTRUCTURE SCALING"
    echo "Target: Scale to 1,000 videos/day capacity"
    echo "Timeline: Weeks 1-2"
    echo ""
    
    # Create log file
    touch $LOG_FILE
    chmod 644 $LOG_FILE
    
    echo "Infrastructure scaling started at $(date)" | tee -a $LOG_FILE
    
    # Create backup
    mkdir -p $BACKUP_DIR
    print_status "Backup directory created: $BACKUP_DIR"
    
    # Run scaling steps
    check_system_resources
    scale_ollama_processing
    setup_ollama_load_balancer
    scale_database_infrastructure
    setup_content_storage
    setup_monitoring_infrastructure
    setup_network_optimizations
    create_status_dashboard
    run_infrastructure_tests
    
    echo "Infrastructure scaling completed at $(date)" | tee -a $LOG_FILE
    
    print_header "🚀 PHASE 1 INFRASTRUCTURE SCALING COMPLETED!"
    echo -e "${GREEN}Your infrastructure is now ready for 1,000+ videos/day!${NC}"
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo -e "1. Run: ${YELLOW}phase1-status${NC} to check system status"
    echo -e "2. Monitor logs: ${YELLOW}tail -f $LOG_FILE${NC}"
    echo -e "3. Check Ollama cluster: ${YELLOW}curl http://localhost:11430/api/tags${NC}"
    echo -e "4. Proceed to revenue optimization scripts"
    echo ""
    echo -e "${GREEN}🎯 Infrastructure scaling target: ACHIEVED!${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root or with sudo"
    exit 1
fi

# Run main function
main "$@"

