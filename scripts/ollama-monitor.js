#!/usr/bin/env node
/**
 * Ollama Service Monitor
 * Monitors the Ollama AI service and automatically restarts if needed
 */

const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

const SERVICE_NAME = process.env.SERVICE_NAME || 'ollama';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 30000; // 30 seconds
const RESTART_DELAY = 5000; // 5 seconds

let consecutiveFailures = 0;
const MAX_FAILURES = 3;

// Simple HTTP client function
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json });
        } catch (e) {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, text: data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function checkOllamaHealth() {
  try {
    console.log(`[${new Date().toISOString()}] Checking Ollama health...`);
    
    // Check if Ollama API is responding
    const response = await httpRequest(`${OLLAMA_URL}/api/tags`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Ollama-Monitor/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = response.json;
    const modelCount = data.models ? data.models.length : 0;
    
    console.log(`[${new Date().toISOString()}] ✅ Ollama healthy - ${modelCount} models available`);
    consecutiveFailures = 0;
    return true;
    
  } catch (error) {
    consecutiveFailures++;
    console.error(`[${new Date().toISOString()}] ❌ Ollama health check failed (${consecutiveFailures}/${MAX_FAILURES}):`, error.message);
    
    if (consecutiveFailures >= MAX_FAILURES) {
      console.log(`[${new Date().toISOString()}] 🔄 Attempting to restart Ollama service...`);
      await restartOllama();
      consecutiveFailures = 0;
    }
    
    return false;
  }
}

async function restartOllama() {
  try {
    console.log(`[${new Date().toISOString()}] Stopping Ollama service...`);
    
    // Try to stop Ollama gracefully
    const stopProcess = spawn('sudo', ['systemctl', 'stop', 'ollama'], {
      stdio: 'pipe'
    });
    
    await new Promise((resolve) => {
      stopProcess.on('close', (code) => {
        console.log(`[${new Date().toISOString()}] Ollama stop process exited with code ${code}`);
        resolve();
      });
    });
    
    // Wait a bit before restarting
    await new Promise(resolve => setTimeout(resolve, RESTART_DELAY));
    
    console.log(`[${new Date().toISOString()}] Starting Ollama service...`);
    
    // Start Ollama
    const startProcess = spawn('sudo', ['systemctl', 'start', 'ollama'], {
      stdio: 'pipe'
    });
    
    await new Promise((resolve) => {
      startProcess.on('close', (code) => {
        console.log(`[${new Date().toISOString()}] Ollama start process exited with code ${code}`);
        resolve();
      });
    });
    
    // Wait for service to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log(`[${new Date().toISOString()}] ✅ Ollama restart completed`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to restart Ollama:`, error.message);
  }
}

async function testOllamaGeneration() {
  try {
    console.log(`[${new Date().toISOString()}] Testing Ollama generation...`);
    
    const response = await httpRequest(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        model: 'mistral:latest',
        prompt: 'Hello, respond with just "OK"',
        stream: false
      },
      timeout: 30000
    });
    
    if (response.ok) {
      const data = response.json;
      console.log(`[${new Date().toISOString()}] ✅ Ollama generation test passed: ${data.response ? data.response.slice(0, 50) : 'Response received'}`);
      return true;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Ollama generation test failed:`, error.message);
    return false;
  }
}

async function monitor() {
  console.log(`[${new Date().toISOString()}] 🚀 Starting Ollama monitor for ${SERVICE_NAME}`);
  console.log(`[${new Date().toISOString()}] Monitoring URL: ${OLLAMA_URL}`);
  console.log(`[${new Date().toISOString()}] Check interval: ${CHECK_INTERVAL}ms`);
  
  // Initial health check
  await checkOllamaHealth();
  
  // Periodic health checks
  setInterval(async () => {
    const isHealthy = await checkOllamaHealth();
    
    // Every 5 minutes, also test generation if healthy
    if (isHealthy && Date.now() % (5 * 60 * 1000) < CHECK_INTERVAL) {
      await testOllamaGeneration();
    }
  }, CHECK_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] 🛑 Ollama monitor shutting down...`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] 🛑 Ollama monitor interrupted...`);
  process.exit(0);
});

// Start monitoring
monitor().catch(error => {
  console.error(`[${new Date().toISOString()}] 💥 Fatal error in Ollama monitor:`, error);
  process.exit(1);
});
