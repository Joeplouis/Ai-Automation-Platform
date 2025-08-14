# BookAI Studio - Integration & Testing Guide

## 🎯 Overview

This guide provides comprehensive testing procedures to ensure your AI automation platform integrates seamlessly with your existing BookAI Studio infrastructure and operates at peak performance.

## 📋 Pre-Testing Checklist

### Environment Verification
- ✅ **VPS Status**: All existing services running (18 active ports)
- ✅ **New Services**: AI automation platform deployed
- ✅ **Database**: PostgreSQL and Redis accessible
- ✅ **Network**: All required ports open and accessible
- ✅ **SSL**: Certificates valid for all domains
 - ✅ **Migrations**: All SQL migrations (000–003) applied with no pending drift
 - ✅ **Metrics**: Prometheus endpoint reachable (port 9464)
 - ✅ **Audit Logs**: Write path functioning (entries appear on task execution)

### Service Dependencies
- ✅ **Ollama**: Running on port 11434
- ✅ **N8N**: Running on port 5678
- ✅ **PostgreSQL**: Running on port 5432
- ✅ **Redis**: Running on port 6379
- ✅ **Nginx**: Running on ports 80/443

### Orchestrator & Metrics
- ✅ **Agent Orchestrator Enabled**: ENV AGENT_ORCHESTRATOR_ENABLED=true
- ✅ **Metrics Port**: 9464 reachable locally (curl -s localhost:9464 | head)
- ✅ **Failover Logic Verified**: Simulate a timeout and observe reroute (see Phase 3 additions)

---

## 🔧 Phase 1: Basic Service Testing

### 1.1 Health Check Tests

#### Test AI Automation API
```bash
# Test local health endpoint
curl -X GET http://localhost:8010/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "version": "1.0.0"
}

# Test external endpoint (after DNS setup)
curl -X GET https://api-ai.bookaistudio.com/health
```

#### Test Enhanced MCP Server
```bash
# Test MCP health
curl -X GET http://localhost:8011/health

# Test MCP capabilities
curl -X GET http://localhost:8011/capabilities

# Expected response:
{
  "capabilities": [
    "vps_management",
    "workflow_orchestration", 
    "content_generation",
    "social_media_automation",
    "affiliate_marketing"
  ]
}

#### Test Metrics Exporter
```bash
# Scrape metrics
curl -s http://localhost:9464/metrics | grep agent_task

# Quick sanity checks
curl -s http://localhost:9464/metrics | grep agent_selection_duration_seconds_bucket
```

#### Test Audit Log Insertion
```bash
# Trigger a simple orchestrated task (example endpoint)
curl -X POST http://localhost:8010/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"type":"health_probe","payload":{}}'

# Query audit log via API (if exposed) or DB (example DB query)
sudo -u postgres psql bookai_studio -c "SELECT event_type, status, agent_id FROM audit_logs ORDER BY created_at DESC LIMIT 5;"
```
```

#### Test Analytics Server
```bash
# Test analytics health
curl -X GET http://localhost:8013/health

# Test metrics endpoint
curl -X GET http://localhost:8013/metrics

#### Test Orchestrator Metrics
```bash
# Check agent selection & failover counters
curl -s localhost:9464 | grep -E 'agent_(selections|failovers|task_duration)' || echo 'No agent metrics yet'
```
```

### 1.2 PM2 Process Verification
```bash
# Check all AI automation processes
pm2 status | grep ai-automation

# Expected output:
# ai-automation-api     │ 0    │ online │ 0       │ 45.2mb   │ ubuntu
# ai-automation-mcp     │ 1    │ online │ 0       │ 32.1mb   │ ubuntu
# ai-automation-analytics│ 2   │ online │ 0       │ 28.5mb   │ ubuntu
# ai-automation-worker  │ 3    │ online │ 0       │ 35.7mb   │ ubuntu

# Check logs for errors
pm2 logs ai-automation-api --lines 20
```

### 1.4 Systemd Service Verification (v2.1.0)
```bash
# New dedicated MCP service
systemctl status bookai-mcp

# Ensure both services active
systemctl is-active bookai-studio && systemctl is-active bookai-mcp
```

### 1.5 Migration Drift Check
```bash
# List applied migrations (assuming migration history table optional)
# If no table yet, manually diff directory vs executed log output
ls /opt/bookai-studio/migrations

# Sanity query for new schema objects
sudo -u postgres psql bookai_studio -c "\dt | grep vps_servers"
sudo -u postgres psql bookai_studio -c "\dt | grep task_executions"
```

### 1.3 Database Connectivity
```bash
# Test PostgreSQL connection
sudo -u postgres psql ai_automation_platform -c "SELECT version();"

# Test Redis connection
redis-cli ping
# Expected: PONG

# Test application database connection
curl -X GET http://localhost:8010/api/system/db-test
```

---

## 🔗 Phase 2: Integration Testing

### 2.1 Ollama AI Integration

#### Test Local Ollama Connection
```bash
# Test direct Ollama connection
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b",
    "prompt": "Hello, how are you?",
    "stream": false
  }'
```

#### Test AI Platform → Ollama Integration
```bash
# Test through AI automation platform
curl -X POST http://localhost:8010/api/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ollama",
    "model": "qwen2.5:14b",
    "messages": [
      {
        "role": "user",
        "content": "Test integration with BookAI Studio platform"
      }
    ]
  }'

# Expected response:
{
  "success": true,
  "data": {
    "response": "Integration test successful...",
    "model": "qwen2.5:14b",
    "provider": "ollama",
    "tokens_used": 25
  }
}
```

### 2.2 N8N Workflow Integration

#### Test N8N API Access
```bash
# Test N8N health
curl -X GET http://localhost:5678/healthz

# List existing workflows
curl -X GET http://localhost:5678/api/v1/workflows \
  -H "Authorization: Bearer YOUR_N8N_API_KEY"
```

#### Test AI Platform → N8N Integration
```bash
# Test workflow creation through AI platform
curl -X POST http://localhost:8010/api/n8n/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Integration Test",
    "description": "Test workflow created via AI platform",
    "nodes": [
      {
        "type": "trigger",
        "name": "Manual Trigger"
      },
      {
        "type": "ai-automation",
        "name": "AI Content Generation"
      }
    ]
  }'
```

#### Test Workflow Execution
```bash
# Execute test workflow
curl -X POST http://localhost:8010/api/n8n/workflows/test-workflow/execute \
  -H "Content-Type: application/json" \
  -d '{
    "inputData": {
      "topic": "AI automation testing",
      "platform": "BookAI Studio"
    }
  }'
```

### 2.3 WordPress Integration

#### Test WordPress API Access
```bash
# Test WordPress REST API
curl -X GET https://wrp.bookaistudio.com/wp-json/wp/v2/posts \
  -u "username:password"
```

#### Test AI Platform → WordPress Integration
```bash
# Test post creation through AI platform
curl -X POST http://localhost:8010/api/wordpress/posts \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "main",
    "title": "AI Integration Test Post",
    "content": "This post was created via the AI automation platform",
    "status": "draft",
    "categories": ["Testing"],
    "tags": ["AI", "automation", "integration"]
  }'
```

#### Test Theme Installation
```bash
# Test theme management
curl -X POST http://localhost:8010/api/wordpress/themes \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "main",
    "action": "install",
    "theme": "ai-agency-theme"
  }'
```

### 2.4 Social Media (Postiz) Integration

### 2.5 Orchestrator Task Routing
```bash
# Trigger content article generation (routes via orchestrator task type content_article)
curl -X POST http://localhost:8011/tools/call \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "content_generate_article",
    "arguments": { "topic": "AI automation reliability" }
  }'

# Trigger LLM chat (routes via ai_chat)
curl -X POST http://localhost:8011/tools/call \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "ai_chat",
    "arguments": { "provider": "ollama", "model": "qwen2.5:14b", "messages": [{"role":"user","content":"Hello orchestrator"}] }
  }'

# Inspect metrics after invocations
curl -s localhost:9464 | grep agent_platform_agent_selections || true
```

#### Test Postiz Connection
```bash
# Test Postiz API
curl -X GET https://postiz.bookaistudio.com/api/accounts \
  -H "Authorization: Bearer YOUR_POSTIZ_TOKEN"
```

#### Test AI Platform → Postiz Integration
```bash
# Test social media post creation
curl -X POST http://localhost:8010/api/postiz/posts \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Testing AI automation platform integration! 🚀 #AI #Automation #BookAIStudio",
    "platforms": ["twitter", "linkedin"],
    "scheduledFor": "2024-01-16T10:00:00Z"
  }'
```

---

## 🧪 Phase 3: Functional Testing

### 3.1 Content Generation Workflow

#### Test Complete Content Pipeline
```bash
# Create a complete content generation workflow
curl -X POST http://localhost:8010/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Content Generation Test",
    "tasks": [
      {
        "id": "research",
        "type": "affiliate_research",
        "config": {
          "niche": "AI tools",
          "limit": 5
        }
      },
      {
        "id": "content",
        "type": "content_generation",
        "dependsOn": ["research"],
        "config": {
          "template": "product_review",
          "llm_provider": "ollama",
          "model": "qwen2.5:14b"
        }
      },
      {
        "id": "publish",
        "type": "wordpress_publish",
        "dependsOn": ["content"],
        "config": {
          "siteId": "main",
          "status": "draft"
        }
      },
      {
        "id": "social",
        "type": "social_media_post",
        "dependsOn": ["publish"],
        "config": {
          "platforms": ["twitter", "linkedin"]
        }
      }
    ]
  }'

# Execute the workflow
curl -X POST http://localhost:8010/api/workflows/{workflow_id}/execute
```

### 3.2 Affiliate Marketing Test

#### Test Product Research
```bash
# Test affiliate product research
curl -X POST http://localhost:8010/api/affiliate/research \
  -H "Content-Type: application/json" \
  -d '{
    "niche": "productivity tools",
    "minCommission": 10,
    "maxPrice": 100,
    "networks": ["amazon", "clickbank"],
    "limit": 10
  }'

# Expected response:
{
  "success": true,
  "data": [
    {
      "id": "product_123",
      "title": "AI Productivity Suite",
      "price": 49.99,
      "commissionRate": 25,
      "rating": 4.7,
      "network": "clickbank",
      "profitabilityScore": 8.5
    }
  ]
}
```

#### Test Campaign Creation
```bash
# Create affiliate campaign
curl -X POST http://localhost:8010/api/affiliate/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Productivity Tools Q1 2024",
    "products": ["product_123"],
    "channels": ["blog", "social", "email"],
    "budget": 1000,
    "duration": 90
  }'
```

### 3.3 Revenue Analytics Test
### 3.4 Orchestrator Failover Simulation
```bash
# Register a slow/failing agent (if API exposed) or temporarily modify builtin agent to simulate timeout.
# Then invoke ai_chat and confirm failover counter increments.
curl -s localhost:9464 | grep agent_failovers_total || echo 'No failovers recorded yet'
```

#### Test Revenue Tracking
```bash
# Test revenue dashboard
curl -X GET http://localhost:8013/api/analytics/revenue

# Test commission tracking
curl -X POST http://localhost:8010/api/affiliate/commissions \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign_123",
    "productId": "product_123",
    "amount": 49.99,
    "commissionRate": 25,
    "status": "pending"
  }'

# Verify tracking
curl -X GET http://localhost:8013/api/analytics/commissions
```

---

## 🌐 Phase 4: End-to-End Testing

### 4.1 Complete Business Workflow Test

#### Scenario: Client Onboarding to Revenue
```bash
# Step 1: Client books consultation (WordPress theme)
# Test booking form submission
curl -X POST https://wrp.bookaistudio.com/wp-json/contact-form-7/v1/contact-forms/123/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "your-name": "Test Client",
    "your-email": "test@example.com",
    "your-service": "AI Training Session",
    "your-message": "Interested in $350 AI training"
  }'

# Step 2: Client data flows to dashboard
curl -X GET http://localhost:8010/api/clients

# Step 3: AI generates custom content for client
curl -X POST http://localhost:8010/api/workflows/client-onboarding/execute \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client_123",
    "industry": "e-commerce",
    "services": ["AI training", "automation setup"]
  }'

# Step 4: Revenue tracking
curl -X POST http://localhost:8010/api/revenue/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client_123",
    "service": "AI Training Session",
    "amount": 350,
    "status": "completed"
  }'
```

### 4.2 Multi-Platform Content Distribution

#### Test Viral Content Creation and Distribution
```bash
# Create viral content workflow
curl -X POST http://localhost:8010/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Viral Content Distribution",
    "tasks": [
      {
        "id": "trend_research",
        "type": "social_media_trends",
        "config": {
          "platforms": ["tiktok", "instagram", "youtube"],
          "niche": "AI automation"
        }
      },
      {
        "id": "content_creation",
        "type": "ai_content_generation",
        "dependsOn": ["trend_research"],
        "config": {
          "content_types": ["video_script", "social_post", "blog_post"],
          "tone": "engaging",
          "target_audience": "entrepreneurs"
        }
      },
      {
        "id": "multi_platform_publish",
        "type": "social_media_distribution",
        "dependsOn": ["content_creation"],
        "config": {
          "platforms": ["tiktok", "instagram", "youtube", "twitter", "linkedin"],
          "schedule": "optimal_times"
        }
      },
      {
        "id": "performance_tracking",
        "type": "analytics_monitoring",
        "dependsOn": ["multi_platform_publish"],
        "config": {
          "metrics": ["views", "engagement", "conversions"],
          "duration": "7_days"
        }
      }
    ]
  }'
```

---

## 📊 Phase 5: Performance Testing

### 5.1 Load Testing

#### Test API Performance
```bash
# Install Apache Bench for load testing
sudo apt install apache2-utils

# Test API under load (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:8010/health

# Test content generation under load
ab -n 50 -c 5 -p content_request.json -T application/json http://localhost:8010/api/llm/chat
```

#### Test Database Performance
```bash
# Test database connection pool
for i in {1..20}; do
  curl -s http://localhost:8010/api/system/db-test &
done
wait

# Monitor database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

### 5.2 Memory and CPU Testing

#### Monitor Resource Usage
```bash
# Monitor system resources during testing
htop &

# Monitor specific processes
watch -n 1 'ps aux | grep -E "(node|pm2)" | grep -v grep'

# Check memory usage
free -h

# Check disk usage
df -h
```

#### Test Memory Limits
```bash
# Test with large content generation
curl -X POST http://localhost:8010/api/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ollama",
    "model": "qwen2.5:14b",
    "messages": [
      {
        "role": "user",
        "content": "Generate a comprehensive 5000-word article about AI automation in business"
      }
    ],
    "max_tokens": 5000
  }'
```

---

## 🔍 Phase 6: Security Testing

### 6.1 Authentication Testing

#### Test API Key Security
```bash
# Test without API key (should fail)
curl -X GET http://localhost:8010/api/workflows

# Test with invalid API key (should fail)
curl -X GET http://localhost:8010/api/workflows \
  -H "Authorization: Bearer invalid_key"

# Test with valid API key (should succeed)
curl -X GET http://localhost:8010/api/workflows \
  -H "Authorization: Bearer YOUR_VALID_API_KEY"
```

#### Test Rate Limiting
```bash
# Test rate limiting (should be blocked after limit)
for i in {1..50}; do
  curl -s http://localhost:8010/api/llm/chat \
    -H "Content-Type: application/json" \
    -d '{"provider": "ollama", "model": "qwen2.5:14b", "messages": [{"role": "user", "content": "test"}]}'
done
```

### 6.2 Input Validation Testing

#### Test SQL Injection Protection
```bash
# Test malicious input (should be sanitized)
curl -X POST http://localhost:8010/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test; DROP TABLE workflows; --",
    "description": "SQL injection test"
  }'
```

#### Test XSS Protection
```bash
# Test script injection (should be sanitized)
curl -X POST http://localhost:8010/api/wordpress/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "<script>alert(\"XSS\")</script>",
    "content": "XSS test content"
  }'
```

---

## ✅ Phase 7: Integration Validation

### 7.1 Cross-Service Communication Test

#### Test Complete Integration Chain
```bash
# Test: AI Platform → Ollama → N8N → WordPress → Postiz
curl -X POST http://localhost:8010/api/workflows/integration-test/execute \
  -H "Content-Type: application/json" \
  -d '{
    "test_scenario": "full_integration",
    "steps": [
      "generate_content_with_ollama",
      "create_n8n_workflow", 
      "publish_to_wordpress",
      "share_on_social_media",
      "track_analytics"
    ]
  }'
```

### 7.2 Data Flow Validation

#### Test Data Consistency
```bash
# Create content and verify it appears in all systems
CONTENT_ID=$(curl -X POST http://localhost:8010/api/content/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Integration Test Content",
    "type": "blog_post",
    "distribute": true
  }' | jq -r '.data.id')

# Verify in WordPress
curl -X GET https://wrp.bookaistudio.com/wp-json/wp/v2/posts?search="Integration Test Content"

# Verify in social media queue
curl -X GET http://localhost:8010/api/postiz/scheduled | grep "Integration Test Content"

# Verify in analytics
curl -X GET http://localhost:8013/api/analytics/content/$CONTENT_ID
```

---

## 🎯 Phase 8: User Acceptance Testing

### 8.1 Dashboard Functionality Test

#### Test Client Dashboard
```bash
# Test dashboard access
curl -I https://dashboard-ai.bookaistudio.com/

# Test dashboard API endpoints
curl -X GET https://dashboard-ai.bookaistudio.com/api/dashboard/metrics

# Test client management
curl -X POST https://dashboard-ai.bookaistudio.com/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "email": "test@example.com",
    "service": "AI Training",
    "budget": 5000
  }'
```

### 8.2 WordPress Theme Test

#### Test AI Agency Theme
```bash
# Test theme activation
curl -X POST https://wrp.bookaistudio.com/wp-admin/admin-ajax.php \
  -d "action=switch_theme&template=ai-agency-theme"

# Test contact form
curl -X POST https://wrp.bookaistudio.com/wp-json/contact-form-7/v1/contact-forms/1/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "your-name": "Test User",
    "your-email": "test@example.com",
    "your-service": "Free Consultation"
  }'

# Test booking integration
curl -X GET https://wrp.bookaistudio.com/book-consultation
```

---

## 📈 Phase 9: Performance Benchmarking

### 9.1 Baseline Metrics

#### Establish Performance Baselines
```bash
# API Response Times
echo "Testing API response times..."
for endpoint in health workflows llm/chat affiliate/research; do
  echo "Testing /api/$endpoint"
  curl -w "@curl-format.txt" -s -o /dev/null http://localhost:8010/api/$endpoint
done

# Content Generation Speed
echo "Testing content generation speed..."
time curl -X POST http://localhost:8010/api/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ollama",
    "model": "qwen2.5:14b",
    "messages": [{"role": "user", "content": "Write a 500-word article about AI automation"}]
  }'

# Workflow Execution Time
echo "Testing workflow execution time..."
time curl -X POST http://localhost:8010/api/workflows/content-pipeline/execute
```

### 9.2 Scalability Testing

#### Test Concurrent Users
```bash
# Simulate 10 concurrent users
for i in {1..10}; do
  (
    for j in {1..10}; do
      curl -s http://localhost:8010/api/llm/chat \
        -H "Content-Type: application/json" \
        -d '{"provider": "ollama", "model": "qwen2.5:14b", "messages": [{"role": "user", "content": "test"}]}'
    done
  ) &
done
wait
```

---

## 🔧 Phase 10: Troubleshooting Tests

### 10.1 Failure Recovery Testing

#### Test Service Recovery
```bash
# Stop a service and test recovery
pm2 stop ai-automation-api
sleep 5
pm2 start ai-automation-api

# Test database connection recovery
sudo systemctl restart postgresql
sleep 10
curl -X GET http://localhost:8010/api/system/db-test

# Test Redis connection recovery
sudo systemctl restart redis-server
sleep 5
curl -X GET http://localhost:8010/health
```

### 10.2 Error Handling Testing

#### Test Error Scenarios
```bash
# Test invalid model request
curl -X POST http://localhost:8010/api/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ollama",
    "model": "nonexistent-model",
    "messages": [{"role": "user", "content": "test"}]
  }'

# Test network timeout
curl -X POST http://localhost:8010/api/llm/chat \
  --max-time 1 \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ollama",
    "model": "qwen2.5:14b",
    "messages": [{"role": "user", "content": "Generate a very long response..."}]
  }'
```

---

## 📋 Testing Checklist

### ✅ Basic Functionality
- [ ] All services start successfully
- [ ] Health endpoints respond correctly
- [ ] Database connections work
- [ ] API authentication functions
- [ ] Rate limiting is enforced

### ✅ Integration Tests
- [ ] Ollama AI integration works
- [ ] N8N workflow creation succeeds
- [ ] WordPress post creation works
- [ ] Social media posting functions
- [ ] Analytics tracking operates

### ✅ Performance Tests
- [ ] API response times < 2 seconds
- [ ] Content generation < 30 seconds
- [ ] Workflow execution completes
- [ ] System handles 10 concurrent users
- [ ] Memory usage stays under limits

### ✅ Security Tests
- [ ] Authentication required for protected endpoints
- [ ] Rate limiting prevents abuse
- [ ] Input validation prevents injection
- [ ] HTTPS redirects work correctly
- [ ] API keys are properly secured

### ✅ User Experience Tests
- [ ] Dashboard loads and functions
- [ ] WordPress theme displays correctly
- [ ] Contact forms submit successfully
- [ ] Booking system works
- [ ] Mobile responsiveness verified

---

## 🎉 Testing Complete!

Once all tests pass, your BookAI Studio AI automation platform is ready for production use. The platform should now seamlessly integrate with your existing infrastructure while providing powerful new automation capabilities.

### Next Steps After Testing:
1. **Monitor Performance** - Set up ongoing monitoring
2. **User Training** - Train team members on new features
3. **Client Onboarding** - Start onboarding clients through new system
4. **Revenue Tracking** - Begin tracking automation ROI
5. **Scale Operations** - Implement scaling strategies as needed

**🚀 Your billion-dollar AI automation empire is now fully tested and operational!**

