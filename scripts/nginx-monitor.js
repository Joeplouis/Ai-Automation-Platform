#!/usr/bin/env node
/**
 * NGINX Service Monitor
 * Monitors NGINX service and automatically restarts if needed
 */

const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

const SERVICE_NAME = process.env.SERVICE_NAME || 'nginx';
const NGINX_STATUS_URL = process.env.NGINX_STATUS_URL || 'http://localhost:80';
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
      resolve({ ok: res.statusCode >= 200 && res.statusCode < 500, status: res.statusCode, statusText: res.statusMessage });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

async function checkNginxHealth() {
  try {
    console.log(`[${new Date().toISOString()}] Checking NGINX health...`);
    
    // Test NGINX is responding
    const response = await httpRequest(NGINX_STATUS_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'NGINX-Monitor/1.0'
      }
    });
    
    // Any response is good - even 404 means NGINX is running
    console.log(`[${new Date().toISOString()}] ✅ NGINX healthy - HTTP ${response.status}: ${response.statusText}`);
    consecutiveFailures = 0;
    return true;
    
  } catch (error) {
    consecutiveFailures++;
    console.error(`[${new Date().toISOString()}] ❌ NGINX health check failed (${consecutiveFailures}/${MAX_FAILURES}):`, error.message);
    
    if (consecutiveFailures >= MAX_FAILURES) {
      console.log(`[${new Date().toISOString()}] 🔄 Attempting to restart NGINX service...`);
      await restartNginx();
      consecutiveFailures = 0;
    }
    
    return false;
  }
}

async function checkNginxConfig() {
  try {
    console.log(`[${new Date().toISOString()}] Testing NGINX configuration...`);
    
    const testProcess = spawn('sudo', ['nginx', '-t'], {
      stdio: 'pipe'
    });
    
    return new Promise((resolve) => {
      let output = '';
      testProcess.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`[${new Date().toISOString()}] ✅ NGINX configuration test passed`);
          resolve(true);
        } else {
          console.error(`[${new Date().toISOString()}] ❌ NGINX configuration test failed:`, output);
          resolve(false);
        }
      });
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to test NGINX configuration:`, error.message);
    return false;
  }
}

async function restartNginx() {
  try {
    // First test the configuration
    const configOk = await checkNginxConfig();
    if (!configOk) {
      console.error(`[${new Date().toISOString()}] ⚠️ NGINX configuration invalid, skipping restart`);
      return;
    }
    
    console.log(`[${new Date().toISOString()}] Reloading NGINX service...`);
    
    // Try to reload NGINX gracefully first
    const reloadProcess = spawn('sudo', ['systemctl', 'reload', 'nginx'], {
      stdio: 'pipe'
    });
    
    await new Promise((resolve) => {
      reloadProcess.on('close', (code) => {
        console.log(`[${new Date().toISOString()}] NGINX reload process exited with code ${code}`);
        resolve();
      });
    });
    
    // Wait a bit and test
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const isHealthy = await checkNginxHealth();
    if (!isHealthy) {
      console.log(`[${new Date().toISOString()}] Reload failed, attempting full restart...`);
      
      // Stop NGINX
      const stopProcess = spawn('sudo', ['systemctl', 'stop', 'nginx'], {
        stdio: 'pipe'
      });
      
      await new Promise((resolve) => {
        stopProcess.on('close', (code) => {
          console.log(`[${new Date().toISOString()}] NGINX stop process exited with code ${code}`);
          resolve();
        });
      });
      
      // Wait a bit before restarting
      await new Promise(resolve => setTimeout(resolve, RESTART_DELAY));
      
      // Start NGINX
      const startProcess = spawn('sudo', ['systemctl', 'start', 'nginx'], {
        stdio: 'pipe'
      });
      
      await new Promise((resolve) => {
        startProcess.on('close', (code) => {
          console.log(`[${new Date().toISOString()}] NGINX start process exited with code ${code}`);
          resolve();
        });
      });
    }
    
    console.log(`[${new Date().toISOString()}] ✅ NGINX restart completed`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to restart NGINX:`, error.message);
  }
}

async function monitor() {
  console.log(`[${new Date().toISOString()}] 🚀 Starting NGINX monitor for ${SERVICE_NAME}`);
  console.log(`[${new Date().toISOString()}] Monitoring URL: ${NGINX_STATUS_URL}`);
  console.log(`[${new Date().toISOString()}] Check interval: ${CHECK_INTERVAL}ms`);
  
  // Initial health check
  await checkNginxHealth();
  
  // Periodic health checks
  setInterval(async () => {
    await checkNginxHealth();
  }, CHECK_INTERVAL);
  
  // Weekly configuration check
  setInterval(async () => {
    await checkNginxConfig();
  }, 7 * 24 * 60 * 60 * 1000); // Weekly
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] 🛑 NGINX monitor shutting down...`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] 🛑 NGINX monitor interrupted...`);
  process.exit(0);
});

// Start monitoring
monitor().catch(error => {
  console.error(`[${new Date().toISOString()}] 💥 Fatal error in NGINX monitor:`, error);
  process.exit(1);
});
