# AI Automation Platform - Troubleshooting Guide

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Installation Issues](#installation-issues)
3. [Connection Problems](#connection-problems)
4. [Performance Issues](#performance-issues)
5. [LLM Provider Issues](#llm-provider-issues)
6. [Workflow Failures](#workflow-failures)
7. [Integration Problems](#integration-problems)
8. [Error Code Reference](#error-code-reference)
9. [System Recovery](#system-recovery)
10. [Getting Support](#getting-support)

---

## Quick Diagnostics

### System Health Check

Run the built-in diagnostic tool to identify common issues:

```bash
# Check system health
curl -X GET https://api.bookaistudio.com/health

# Check service status
curl -X GET https://api.bookaistudio.com/system/status

# Test database connectivity
curl -X GET https://api.bookaistudio.com/system/db-test
```

### Common Quick Fixes

#### 1. Restart Services
```bash
# Restart all services
sudo systemctl restart nginx postgresql redis-server

# Restart specific service
sudo systemctl restart ollama
```

#### 2. Clear Cache
```bash
# Clear Redis cache
redis-cli FLUSHALL

# Clear application cache
rm -rf /tmp/ai-automation-cache/*
```

#### 3. Check Logs
```bash
# View application logs
tail -f /var/log/ai-automation/app.log

# View system logs
journalctl -u ai-automation-platform -f
```

---

## Installation Issues

### Issue: Installation Script Fails

**Symptoms:**
- Installation stops with error
- Missing dependencies
- Permission denied errors

**Solutions:**

1. **Check System Requirements**
   ```bash
   # Verify Ubuntu version
   lsb_release -a
   
   # Check available memory
   free -h
   
   # Check disk space
   df -h
   ```

2. **Update System**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Fix Permissions**
   ```bash
   sudo chown -R $USER:$USER /home/ubuntu/ai-automation-platform
   chmod +x /home/ubuntu/ai-automation-platform/deploy/*.sh
   ```

4. **Install Missing Dependencies**
   ```bash
   sudo apt install -y curl wget git nodejs npm postgresql redis-server
   ```

### Issue: Database Setup Fails

**Symptoms:**
- PostgreSQL connection errors
- Database creation failures
- Permission issues

**Solutions:**

1. **Reset PostgreSQL**
   ```bash
   sudo systemctl stop postgresql
   sudo systemctl start postgresql
   sudo -u postgres createdb ai_automation
   ```

2. **Fix Database Permissions**
   ```bash
   sudo -u postgres psql
   CREATE USER ai_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE ai_automation TO ai_user;
   \q
   ```

3. **Run Database Migrations**
   ```bash
   cd /home/ubuntu/ai-automation-platform
   npm run migrate
   ```

### Issue: Ollama Installation Problems

**Symptoms:**
- Ollama service not starting
- Model download failures
- GPU detection issues

**Solutions:**

1. **Reinstall Ollama**
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   sudo systemctl enable ollama
   sudo systemctl start ollama
   ```

2. **Download Models**
   ```bash
   ollama pull llama3.1:8b
   ollama pull qwen2.5:14b
   ollama pull codellama:7b
   ```

3. **Check GPU Support**
   ```bash
   nvidia-smi  # For NVIDIA GPUs
   ollama list  # Verify models are available
   ```

---

## Connection Problems

### Issue: API Connection Failures

**Symptoms:**
- 500 Internal Server Error
- Connection timeout
- Authentication failures

**Solutions:**

1. **Check Service Status**
   ```bash
   sudo systemctl status ai-automation-platform
   sudo systemctl status nginx
   sudo systemctl status postgresql
   ```

2. **Verify Network Configuration**
   ```bash
   # Check if services are listening
   netstat -tlnp | grep :8002  # MCP Server
   netstat -tlnp | grep :5432  # PostgreSQL
   netstat -tlnp | grep :6379  # Redis
   ```

3. **Test API Endpoints**
   ```bash
   # Test health endpoint
   curl -v http://localhost:8002/health
   
   # Test with authentication
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        http://localhost:8002/api/status
   ```

4. **Check Firewall Settings**
   ```bash
   sudo ufw status
   sudo ufw allow 8002/tcp
   sudo ufw allow 443/tcp
   ```

### Issue: External Service Connections

**Symptoms:**
- WordPress connection failed
- Social media API errors
- Affiliate network timeouts

**Solutions:**

1. **Verify Credentials**
   - Check API keys are valid
   - Verify usernames/passwords
   - Test credentials manually

2. **Check SSL Certificates**
   ```bash
   # Test SSL connection
   openssl s_client -connect api.openai.com:443
   
   # Update certificates
   sudo apt update && sudo apt install ca-certificates
   ```

3. **Test Network Connectivity**
   ```bash
   # Test DNS resolution
   nslookup api.openai.com
   
   # Test HTTP connectivity
   curl -I https://api.openai.com
   ```

### Issue: Database Connection Problems

**Symptoms:**
- Connection pool exhausted
- Database timeout errors
- Authentication failures

**Solutions:**

1. **Check Database Status**
   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -c "SELECT version();"
   ```

2. **Verify Connection Settings**
   ```bash
   # Check PostgreSQL configuration
   sudo nano /etc/postgresql/14/main/postgresql.conf
   
   # Verify connection limits
   sudo -u postgres psql -c "SHOW max_connections;"
   ```

3. **Reset Connection Pool**
   ```bash
   # Restart application
   sudo systemctl restart ai-automation-platform
   
   # Clear connection pool
   sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'ai_automation';"
   ```

---

## Performance Issues

### Issue: Slow Response Times

**Symptoms:**
- API requests taking >30 seconds
- Workflow execution delays
- Dashboard loading slowly

**Solutions:**

1. **Check System Resources**
   ```bash
   # Monitor CPU and memory
   htop
   
   # Check disk I/O
   iotop
   
   # Monitor network
   nethogs
   ```

2. **Optimize Database**
   ```bash
   # Analyze database performance
   sudo -u postgres psql ai_automation -c "ANALYZE;"
   
   # Reindex tables
   sudo -u postgres psql ai_automation -c "REINDEX DATABASE ai_automation;"
   ```

3. **Clear Cache and Logs**
   ```bash
   # Clear Redis cache
   redis-cli FLUSHALL
   
   # Rotate logs
   sudo logrotate -f /etc/logrotate.d/ai-automation
   ```

4. **Scale Resources**
   ```bash
   # Increase worker processes
   sudo nano /etc/systemd/system/ai-automation-platform.service
   # Add: Environment=WORKERS=4
   
   sudo systemctl daemon-reload
   sudo systemctl restart ai-automation-platform
   ```

### Issue: High Memory Usage

**Symptoms:**
- Out of memory errors
- System becoming unresponsive
- Swap usage high

**Solutions:**

1. **Identify Memory Hogs**
   ```bash
   # Check memory usage by process
   ps aux --sort=-%mem | head -10
   
   # Monitor memory in real-time
   watch -n 1 'free -m'
   ```

2. **Optimize Application**
   ```bash
   # Reduce worker processes
   export WORKERS=2
   
   # Limit concurrent workflows
   export MAX_CONCURRENT_WORKFLOWS=5
   ```

3. **Add Swap Space**
   ```bash
   # Create swap file
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   
   # Make permanent
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

### Issue: Disk Space Problems

**Symptoms:**
- "No space left on device" errors
- Log files growing too large
- Database performance degradation

**Solutions:**

1. **Check Disk Usage**
   ```bash
   # Check overall disk usage
   df -h
   
   # Find large files
   sudo du -h / | sort -rh | head -20
   ```

2. **Clean Up Files**
   ```bash
   # Clean log files
   sudo find /var/log -name "*.log" -type f -size +100M -delete
   
   # Clean temporary files
   sudo rm -rf /tmp/*
   
   # Clean package cache
   sudo apt clean
   ```

3. **Configure Log Rotation**
   ```bash
   # Create log rotation config
   sudo nano /etc/logrotate.d/ai-automation
   
   # Add configuration:
   /var/log/ai-automation/*.log {
       daily
       rotate 7
       compress
       delaycompress
       missingok
       notifempty
   }
   ```

---

## LLM Provider Issues

### Issue: Ollama Connection Problems

**Symptoms:**
- "Connection refused" errors
- Model not found errors
- Slow response times

**Solutions:**

1. **Check Ollama Service**
   ```bash
   # Check service status
   sudo systemctl status ollama
   
   # Restart if needed
   sudo systemctl restart ollama
   
   # Check logs
   journalctl -u ollama -f
   ```

2. **Verify Models**
   ```bash
   # List available models
   ollama list
   
   # Test model
   ollama run llama3.1:8b "Hello, how are you?"
   ```

3. **Check Configuration**
   ```bash
   # Verify Ollama is listening
   curl http://localhost:11434/api/tags
   
   # Check model status
   curl http://localhost:11434/api/show -d '{"name": "llama3.1:8b"}'
   ```

### Issue: External API Failures

**Symptoms:**
- OpenAI API errors
- Rate limit exceeded
- Authentication failures

**Solutions:**

1. **Verify API Keys**
   ```bash
   # Test OpenAI API
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   
   # Test Anthropic API
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: YOUR_API_KEY"
   ```

2. **Check Rate Limits**
   ```bash
   # Monitor API usage
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        https://api.openai.com/v1/usage
   ```

3. **Implement Retry Logic**
   ```javascript
   // Add to configuration
   {
     "retryAttempts": 3,
     "retryDelay": 1000,
     "backoffMultiplier": 2
   }
   ```

### Issue: Model Performance Problems

**Symptoms:**
- Slow generation times
- Poor quality outputs
- Memory errors

**Solutions:**

1. **Optimize Model Selection**
   ```bash
   # Use smaller models for simple tasks
   ollama pull qwen2.5:7b  # Instead of 32b
   
   # Use specialized models
   ollama pull codellama:7b  # For coding tasks
   ```

2. **Adjust Generation Parameters**
   ```javascript
   {
     "temperature": 0.7,
     "max_tokens": 1000,
     "top_p": 0.9,
     "frequency_penalty": 0.1
   }
   ```

3. **Monitor GPU Usage**
   ```bash
   # Check GPU memory
   nvidia-smi
   
   # Monitor GPU utilization
   watch -n 1 nvidia-smi
   ```

---

## Workflow Failures

### Issue: Workflow Execution Errors

**Symptoms:**
- Workflows failing to start
- Tasks timing out
- Unexpected termination

**Solutions:**

1. **Check Workflow Configuration**
   ```bash
   # Validate workflow JSON
   cat workflow.json | jq .
   
   # Check for syntax errors
   node -c workflow.js
   ```

2. **Review Task Dependencies**
   - Verify all required inputs are available
   - Check task execution order
   - Validate conditional logic

3. **Monitor Resource Usage**
   ```bash
   # Check if system has enough resources
   free -m
   ps aux | grep workflow
   ```

4. **Enable Debug Logging**
   ```javascript
   // Add to workflow configuration
   {
     "debug": true,
     "logLevel": "verbose"
   }
   ```

### Issue: Task Timeout Errors

**Symptoms:**
- Tasks exceeding time limits
- Workflows hanging indefinitely
- Partial completion

**Solutions:**

1. **Adjust Timeout Settings**
   ```javascript
   {
     "taskTimeout": 300000,  // 5 minutes
     "workflowTimeout": 1800000  // 30 minutes
   }
   ```

2. **Optimize Task Logic**
   - Break large tasks into smaller ones
   - Add progress checkpoints
   - Implement early termination

3. **Add Retry Mechanisms**
   ```javascript
   {
     "retryAttempts": 3,
     "retryDelay": 5000,
     "retryOnFailure": true
   }
   ```

### Issue: Data Flow Problems

**Symptoms:**
- Variables not passing between tasks
- Data transformation errors
- Missing output data

**Solutions:**

1. **Validate Data Schema**
   ```javascript
   // Add schema validation
   {
     "inputSchema": {
       "type": "object",
       "properties": {
         "niche": {"type": "string"},
         "budget": {"type": "number"}
       }
     }
   }
   ```

2. **Debug Data Flow**
   ```javascript
   // Add logging to tasks
   console.log('Task input:', JSON.stringify(input, null, 2));
   console.log('Task output:', JSON.stringify(output, null, 2));
   ```

3. **Check Variable Scoping**
   - Verify variable names are correct
   - Check variable accessibility
   - Validate data types

---

## Integration Problems

### Issue: WordPress Integration Failures

**Symptoms:**
- Cannot connect to WordPress site
- Post creation failures
- Plugin installation errors

**Solutions:**

1. **Verify WordPress Credentials**
   ```bash
   # Test WordPress API
   curl -u username:password \
        https://yoursite.com/wp-json/wp/v2/posts
   ```

2. **Check WordPress Configuration**
   - Ensure REST API is enabled
   - Verify user permissions
   - Check plugin compatibility

3. **Update WordPress**
   ```bash
   # Update WordPress core and plugins
   wp core update
   wp plugin update --all
   ```

### Issue: Social Media API Problems

**Symptoms:**
- Postiz connection failures
- Post publishing errors
- Authentication issues

**Solutions:**

1. **Verify Postiz Configuration**
   ```bash
   # Test Postiz API
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://postiz.bookaistudio.com/api/accounts
   ```

2. **Check Social Media Permissions**
   - Verify app permissions
   - Refresh access tokens
   - Check rate limits

3. **Update API Credentials**
   - Regenerate API keys
   - Update webhook URLs
   - Verify callback URLs

### Issue: Affiliate Network Problems

**Symptoms:**
- Commission tracking failures
- Product data sync errors
- API rate limit issues

**Solutions:**

1. **Verify Network Credentials**
   ```bash
   # Test Amazon API
   curl -H "Authorization: AWS4-HMAC-SHA256 ..." \
        https://webservices.amazon.com/paapi5/getitems
   ```

2. **Check Data Synchronization**
   - Verify product feed URLs
   - Check data format compatibility
   - Update mapping configurations

3. **Implement Rate Limiting**
   ```javascript
   {
     "rateLimit": {
       "requests": 100,
       "period": 3600000  // 1 hour
     }
   }
   ```

---

## Error Code Reference

### System Errors

| Code | Description | Solution |
|------|-------------|----------|
| SYS_001 | Database connection failed | Check PostgreSQL service |
| SYS_002 | Redis connection failed | Restart Redis service |
| SYS_003 | File system error | Check disk space and permissions |
| SYS_004 | Memory allocation failed | Increase available memory |
| SYS_005 | Network timeout | Check network connectivity |

### Authentication Errors

| Code | Description | Solution |
|------|-------------|----------|
| AUTH_001 | Invalid API key | Regenerate API key |
| AUTH_002 | Expired token | Refresh authentication token |
| AUTH_003 | Insufficient permissions | Update user permissions |
| AUTH_004 | Rate limit exceeded | Wait or upgrade plan |
| AUTH_005 | Account suspended | Contact support |

### Workflow Errors

| Code | Description | Solution |
|------|-------------|----------|
| WF_001 | Workflow not found | Check workflow ID |
| WF_002 | Invalid workflow configuration | Validate JSON schema |
| WF_003 | Task execution failed | Check task parameters |
| WF_004 | Timeout exceeded | Increase timeout limits |
| WF_005 | Dependency not met | Check task dependencies |

### Integration Errors

| Code | Description | Solution |
|------|-------------|----------|
| INT_001 | WordPress connection failed | Verify credentials |
| INT_002 | Social media API error | Check API permissions |
| INT_003 | Affiliate network timeout | Retry request |
| INT_004 | LLM provider unavailable | Switch to backup provider |
| INT_005 | Data synchronization failed | Check data format |

### LLM Errors

| Code | Description | Solution |
|------|-------------|----------|
| LLM_001 | Model not found | Download required model |
| LLM_002 | Generation timeout | Reduce max tokens |
| LLM_003 | Context length exceeded | Reduce input length |
| LLM_004 | Rate limit exceeded | Wait or use different model |
| LLM_005 | Invalid prompt format | Check prompt structure |

---

## System Recovery

### Emergency Recovery Procedures

#### 1. Complete System Restore

```bash
# Stop all services
sudo systemctl stop ai-automation-platform nginx postgresql redis-server

# Restore from backup
sudo tar -xzf /backups/system-backup-latest.tar.gz -C /

# Restore database
sudo -u postgres pg_restore -d ai_automation /backups/db-backup-latest.sql

# Restart services
sudo systemctl start postgresql redis-server nginx ai-automation-platform
```

#### 2. Database Recovery

```bash
# Create backup of current state
sudo -u postgres pg_dump ai_automation > /tmp/current-db.sql

# Restore from known good backup
sudo -u postgres dropdb ai_automation
sudo -u postgres createdb ai_automation
sudo -u postgres pg_restore -d ai_automation /backups/db-backup-good.sql

# Run migrations if needed
cd /home/ubuntu/ai-automation-platform
npm run migrate
```

#### 3. Configuration Reset

```bash
# Backup current configuration
cp -r /home/ubuntu/ai-automation-platform/config /tmp/config-backup

# Reset to default configuration
git checkout HEAD -- config/

# Apply minimal working configuration
cp config/default.json config/production.json

# Restart services
sudo systemctl restart ai-automation-platform
```

### Backup Verification

#### 1. Test Backup Integrity

```bash
# Verify database backup
sudo -u postgres pg_restore --list /backups/db-backup-latest.sql

# Test file backup
tar -tzf /backups/system-backup-latest.tar.gz | head -20

# Verify backup completeness
du -sh /backups/
ls -la /backups/
```

#### 2. Recovery Testing

```bash
# Create test environment
mkdir /tmp/recovery-test
cd /tmp/recovery-test

# Extract backup
tar -xzf /backups/system-backup-latest.tar.gz

# Verify critical files
ls -la home/ubuntu/ai-automation-platform/
cat home/ubuntu/ai-automation-platform/package.json
```

---

## Getting Support

### Self-Service Resources

#### 1. Documentation
- **User Manual**: Complete usage guide
- **API Documentation**: Technical reference
- **Video Tutorials**: Step-by-step guides
- **FAQ**: Common questions and answers

#### 2. Diagnostic Tools
- **Health Check**: `/api/health`
- **System Status**: `/api/system/status`
- **Log Viewer**: Dashboard > System > Logs
- **Performance Monitor**: Dashboard > Analytics > Performance

#### 3. Community Resources
- **Forum**: https://community.bookaistudio.com
- **Discord**: Real-time community chat
- **GitHub Issues**: Bug reports and feature requests
- **Stack Overflow**: Technical Q&A

### Professional Support

#### 1. Support Tiers

**Basic Support** (Free)
- Community forum access
- Documentation and tutorials
- Basic troubleshooting guides

**Premium Support** ($99/month)
- Email support (24-48 hour response)
- Priority bug fixes
- Configuration assistance

**Enterprise Support** ($499/month)
- Phone and video support
- Dedicated support engineer
- Custom integration assistance
- 4-hour response time SLA

#### 2. Contact Information

**Email Support**: support@bookaistudio.com
**Emergency Hotline**: +1-555-BOOKAIS (24/7 for Enterprise)
**Live Chat**: Available in dashboard (Premium+)

#### 3. Support Request Guidelines

When contacting support, please include:

1. **System Information**
   ```bash
   # Run diagnostic command
   curl -s https://api.bookaistudio.com/system/info
   ```

2. **Error Details**
   - Exact error message
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

3. **Environment Details**
   - Operating system version
   - Browser version (if applicable)
   - Network configuration
   - Recent changes made

4. **Log Files**
   ```bash
   # Collect relevant logs
   tail -100 /var/log/ai-automation/app.log
   journalctl -u ai-automation-platform --since "1 hour ago"
   ```

### Escalation Process

1. **Level 1**: Community forum or basic support
2. **Level 2**: Premium email support
3. **Level 3**: Senior technical support
4. **Level 4**: Engineering team escalation

### SLA Commitments

| Support Tier | Response Time | Resolution Time |
|--------------|---------------|-----------------|
| Basic | Best effort | Best effort |
| Premium | 24-48 hours | 5 business days |
| Enterprise | 4 hours | 2 business days |
| Critical | 1 hour | 24 hours |

---

## Preventive Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor system health dashboard
- Check error logs for new issues
- Verify backup completion
- Review performance metrics

#### Weekly
- Update system packages
- Clean temporary files
- Rotate log files
- Test backup restoration

#### Monthly
- Review and optimize database
- Update application dependencies
- Security audit and updates
- Performance optimization review

#### Quarterly
- Full system backup verification
- Disaster recovery testing
- Security penetration testing
- Capacity planning review

### Monitoring Setup

#### 1. System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Set up log monitoring
sudo apt install logwatch
```

#### 2. Application Monitoring
```javascript
// Add to configuration
{
  "monitoring": {
    "enabled": true,
    "metrics": ["cpu", "memory", "disk", "network"],
    "alerts": {
      "cpu": 80,
      "memory": 85,
      "disk": 90
    }
  }
}
```

#### 3. Automated Alerts
```bash
# Set up email alerts
sudo apt install mailutils
echo "High CPU usage detected" | mail -s "System Alert" admin@bookaistudio.com
```

This comprehensive troubleshooting guide should help you resolve most issues you might encounter with the AI Automation Platform. Remember to always backup your system before making significant changes, and don't hesitate to contact support when needed.

