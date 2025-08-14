#!/bin/bash

# BookAI Studio - Automated Platform Testing Script
# This script runs comprehensive tests on the AI automation platform

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_BASE="http://localhost:8010"
MCP_BASE="http://localhost:8011"
ANALYTICS_BASE="http://localhost:8013"
DASHBOARD_BASE="http://localhost:8012"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

echo -e "${BLUE}🧪 BookAI Studio - Platform Testing Suite${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Function to log test results
log_test() {
    local test_name="$1"
    local result="$2"
    local message="$3"
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✅ $test_name${NC}: $message"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ $test_name${NC}: $message"
        ((TESTS_FAILED++))
        FAILED_TESTS+=("$test_name")
    fi
}

# Function to test HTTP endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$response_code" = "$expected_code" ]; then
        log_test "$name" "PASS" "HTTP $response_code"
    else
        log_test "$name" "FAIL" "Expected HTTP $expected_code, got $response_code"
    fi
}

# Function to test JSON API endpoint
test_json_api() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    
    local response
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        response=$(curl -s -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo '{"error": "request_failed"}')
    else
        response=$(curl -s "$url" 2>/dev/null || echo '{"error": "request_failed"}')
    fi
    
    if echo "$response" | jq . >/dev/null 2>&1; then
        if echo "$response" | jq -e '.error' >/dev/null 2>&1; then
            local error=$(echo "$response" | jq -r '.error')
            log_test "$name" "FAIL" "API Error: $error"
        else
            log_test "$name" "PASS" "Valid JSON response"
        fi
    else
        log_test "$name" "FAIL" "Invalid JSON response"
    fi
}

# Function to test service process
test_process() {
    local name="$1"
    local process_name="$2"
    
    if pgrep -f "$process_name" >/dev/null; then
        log_test "$name" "PASS" "Process running"
    else
        log_test "$name" "FAIL" "Process not found"
    fi
}

# Function to test port
test_port() {
    local name="$1"
    local port="$2"
    
    if netstat -tlnp | grep -q ":$port "; then
        log_test "$name" "PASS" "Port $port is listening"
    else
        log_test "$name" "FAIL" "Port $port is not listening"
    fi
}

echo -e "${YELLOW}Phase 1: Basic Service Tests${NC}"
echo "================================"

# Test ports
test_port "API Port" "8010"
test_port "MCP Port" "8011"
test_port "Analytics Port" "8013"

# Test processes
test_process "PM2 API Process" "ai-automation-api"
test_process "PM2 MCP Process" "ai-automation-mcp"
test_process "PM2 Analytics Process" "ai-automation-analytics"

# Test health endpoints
test_endpoint "API Health" "$API_BASE/health"
test_endpoint "MCP Health" "$MCP_BASE/health"
test_endpoint "Analytics Health" "$ANALYTICS_BASE/health"

echo ""
echo -e "${YELLOW}Phase 2: API Functionality Tests${NC}"
echo "=================================="

# Test API endpoints
test_json_api "API Status" "$API_BASE/api/status"
test_json_api "System Info" "$API_BASE/api/system/info"

# Test LLM integration (if Ollama is available)
if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    test_json_api "Ollama Integration" "$API_BASE/api/llm/providers"
    
    # Test simple chat
    chat_data='{
        "provider": "ollama",
        "model": "qwen2.5:14b",
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 50
    }'
    test_json_api "LLM Chat Test" "$API_BASE/api/llm/chat" "POST" "$chat_data"
else
    log_test "Ollama Integration" "SKIP" "Ollama not available"
fi

echo ""
echo -e "${YELLOW}Phase 3: Database Tests${NC}"
echo "========================"

# Test database connectivity
test_json_api "Database Connection" "$API_BASE/api/system/db-test"

# Test Redis connectivity
if redis-cli ping >/dev/null 2>&1; then
    log_test "Redis Connection" "PASS" "Redis responding to ping"
else
    log_test "Redis Connection" "FAIL" "Redis not responding"
fi

echo ""
echo -e "${YELLOW}Phase 4: Integration Tests${NC}"
echo "==============================="

# Test N8N integration (if available)
if curl -s http://localhost:5678/healthz >/dev/null 2>&1; then
    test_json_api "N8N Integration" "$API_BASE/api/n8n/status"
else
    log_test "N8N Integration" "SKIP" "N8N not available"
fi

# Test WordPress integration (if available)
if curl -s https://wrp.bookaistudio.com/wp-json/ >/dev/null 2>&1; then
    test_json_api "WordPress Integration" "$API_BASE/api/wordpress/status"
else
    log_test "WordPress Integration" "SKIP" "WordPress not available"
fi

echo ""
echo -e "${YELLOW}Phase 5: Workflow Tests${NC}"
echo "==========================="

# Test workflow creation
workflow_data='{
    "name": "Test Workflow",
    "description": "Automated test workflow",
    "tasks": [
        {
            "id": "test_task",
            "type": "log_message",
            "config": {
                "message": "Test workflow executed successfully"
            }
        }
    ]
}'
test_json_api "Workflow Creation" "$API_BASE/api/workflows" "POST" "$workflow_data"

# Test workflow listing
test_json_api "Workflow Listing" "$API_BASE/api/workflows"

echo ""
echo -e "${YELLOW}Phase 6: Security Tests${NC}"
echo "=========================="

# Test authentication (should fail without auth)
test_endpoint "Auth Required" "$API_BASE/api/admin/settings" "401"

# Test rate limiting (basic test)
echo -n "Testing rate limiting... "
rate_limit_failed=false
for i in {1..20}; do
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/health" 2>/dev/null || echo "000")
    if [ "$response_code" = "429" ]; then
        log_test "Rate Limiting" "PASS" "Rate limit enforced"
        rate_limit_failed=false
        break
    fi
    rate_limit_failed=true
done

if [ "$rate_limit_failed" = true ]; then
    log_test "Rate Limiting" "SKIP" "Rate limit not triggered in test"
fi

echo ""
echo -e "${YELLOW}Phase 7: Performance Tests${NC}"
echo "=============================="

# Test response times
echo -n "Testing API response time... "
start_time=$(date +%s%N)
curl -s "$API_BASE/health" >/dev/null 2>&1
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

if [ "$response_time" -lt 2000 ]; then
    log_test "API Response Time" "PASS" "${response_time}ms (< 2000ms)"
else
    log_test "API Response Time" "FAIL" "${response_time}ms (>= 2000ms)"
fi

# Test memory usage
memory_usage=$(ps aux | grep -E "ai-automation" | grep -v grep | awk '{sum += $6} END {print sum/1024}')
if [ -n "$memory_usage" ] && [ "$(echo "$memory_usage < 2048" | bc -l)" = "1" ]; then
    log_test "Memory Usage" "PASS" "${memory_usage}MB (< 2GB)"
else
    log_test "Memory Usage" "WARN" "${memory_usage}MB"
fi

echo ""
echo -e "${YELLOW}Phase 8: External Service Tests${NC}"
echo "===================================="

# Test external domain accessibility (if DNS is configured)
external_domains=(
    "api-ai.bookaistudio.com"
    "mcp-ai.bookaistudio.com"
    "dashboard-ai.bookaistudio.com"
    "analytics-ai.bookaistudio.com"
)

for domain in "${external_domains[@]}"; do
    if nslookup "$domain" >/dev/null 2>&1; then
        test_endpoint "External $domain" "https://$domain/health"
    else
        log_test "External $domain" "SKIP" "DNS not configured"
    fi
done

echo ""
echo -e "${YELLOW}Phase 9: Dashboard Tests${NC}"
echo "========================="

# Test dashboard static files
if [ -d "/var/www/dashboards/ai-agency-dashboard/dist" ]; then
    if [ -f "/var/www/dashboards/ai-agency-dashboard/dist/index.html" ]; then
        log_test "Dashboard Build" "PASS" "Built files exist"
    else
        log_test "Dashboard Build" "FAIL" "index.html not found"
    fi
else
    log_test "Dashboard Build" "FAIL" "Dashboard directory not found"
fi

# Test dashboard accessibility
test_endpoint "Dashboard Access" "$DASHBOARD_BASE"

echo ""
echo -e "${YELLOW}Phase 10: Log Tests${NC}"
echo "==================="

# Check log files
log_files=(
    "/var/log/ai-automation/api-error.log"
    "/var/log/ai-automation/api-out.log"
    "/var/log/ai-automation/mcp-error.log"
    "/var/log/ai-automation/mcp-out.log"
)

for log_file in "${log_files[@]}"; do
    if [ -f "$log_file" ]; then
        log_test "Log File $(basename "$log_file")" "PASS" "Log file exists"
    else
        log_test "Log File $(basename "$log_file")" "FAIL" "Log file missing"
    fi
done

# Check for critical errors in logs
if [ -f "/var/log/ai-automation/api-error.log" ]; then
    error_count=$(grep -c "ERROR\|FATAL" "/var/log/ai-automation/api-error.log" 2>/dev/null || echo "0")
    if [ "$error_count" -eq 0 ]; then
        log_test "Critical Errors" "PASS" "No critical errors found"
    else
        log_test "Critical Errors" "WARN" "$error_count critical errors found"
    fi
fi

echo ""
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo -e "${BLUE}======================${NC}"
echo ""
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed Tests:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "  • $test"
    done
fi

echo ""
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Platform is ready for production.${NC}"
    exit 0
elif [ $TESTS_FAILED -lt 5 ]; then
    echo -e "${YELLOW}⚠️  Some tests failed, but platform is mostly functional.${NC}"
    exit 1
else
    echo -e "${RED}❌ Multiple test failures detected. Please review configuration.${NC}"
    exit 2
fi

