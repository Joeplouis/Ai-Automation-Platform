module.exports = {
  apps: [
    // Core AI Automation Platform Services
    {
      name: 'ai-automation-main',
      script: 'ai-automation-platform/src/core/server.js',
      cwd: '/root/Ai-Automation-Platform',
      env_file: './ai-automation-platform/.env',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/main-error.log',
      out_file: './logs/main-out.log',
      log_file: './logs/main-combined.log',
      env: {
        PORT: 8083,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'ai-automation-mcp',
      script: 'ai-automation-platform/src/core/enhanced-mcp-server.js',
      cwd: '/root/Ai-Automation-Platform',
      env_file: './ai-automation-platform/.env',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/mcp-error.log',
      out_file: './logs/mcp-out.log',
      log_file: './logs/mcp-combined.log'
    },
    
    // Docker Service Monitoring
    {
      name: 'docker-n8n-monitor',
      script: './scripts/docker-monitor.js',
      args: ['n8n-n8n-1'],
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        SERVICE_NAME: 'n8n',
        CONTAINER_NAME: 'n8n-n8n-1',
        CHECK_INTERVAL: 30000
      }
    },
    {
      name: 'docker-wordpress-monitor',
      script: './scripts/docker-monitor.js',
      args: ['wordpress-wordpress-1'],
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        SERVICE_NAME: 'wordpress',
        CONTAINER_NAME: 'wordpress-wordpress-1',
        CHECK_INTERVAL: 30000
      }
    },
    {
      name: 'docker-mautic-monitor',
      script: './scripts/docker-monitor.js',
      args: ['mautic-mautic-1'],
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        SERVICE_NAME: 'mautic',
        CONTAINER_NAME: 'mautic-mautic-1',
        CHECK_INTERVAL: 30000
      }
    },
    
    // System Monitoring
    {
      name: 'system-monitor',
      script: './scripts/system-monitor.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        CHECK_INTERVAL: 60000,
        LOG_LEVEL: 'info'
      }
    },
    
    // SSL Certificate Monitor
    {
      name: 'ssl-monitor',
      script: './scripts/ssl-monitor.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      cron_restart: '0 6 * * *', // Check daily at 6 AM
      env: {
        DOMAINS: 'n8n.bookaistudio.com,dashboard.bookaistudio.com,platform-api.bookaistudio.com,ai.bookaistudio.com,wrp.bookaistudio.com,postiz.bookaistudio.com,mail.bookaistudio.com,mautic.bookaistudio.com',
        CHECK_INTERVAL: 3600000 // 1 hour
      }
    },
    
    // Infrastructure Service Monitoring
    {
      name: 'ollama-monitor',
      script: './scripts/ollama-monitor.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        SERVICE_NAME: 'ollama',
        OLLAMA_URL: 'http://localhost:11434',
        CHECK_INTERVAL: 30000
      }
    },
    {
      name: 'redis-monitor',
      script: './scripts/redis-monitor.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        SERVICE_NAME: 'redis',
        REDIS_URL: 'redis://localhost:6379',
        CHECK_INTERVAL: 30000
      }
    },
    {
      name: 'nginx-monitor',
      script: './scripts/nginx-monitor.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        SERVICE_NAME: 'nginx',
        NGINX_STATUS_URL: 'http://localhost:80',
        CHECK_INTERVAL: 30000
      }
    }
  ]
};
