#!/usr/bin/env node
/**
 * Redis Service Monitor
 * Monitors Redis service and automatically restarts if needed
 */

const { createClient } = require('redis');
const { spawn } = require('child_process');

const SERVICE_NAME = process.env.SERVICE_NAME || 'redis';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 30000; // 30 seconds
const RESTART_DELAY = 5000; // 5 seconds

let consecutiveFailures = 0;
const MAX_FAILURES = 3;

async function checkRedisHealth() {
  let client = null;
  try {
    console.log(`[${new Date().toISOString()}] Checking Redis health...`);
    
    // Create Redis client
    client = createClient({ url: REDIS_URL });
    
    // Connect with timeout
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 10000))
    ]);
    
    // Test ping
    const pong = await client.ping();
    if (pong !== 'PONG') {
      throw new Error(`Unexpected ping response: ${pong}`);
    }
    
    // Test basic operations
    await client.set('health_check', Date.now().toString());
    const value = await client.get('health_check');
    await client.del('health_check');
    
    console.log(`[${new Date().toISOString()}] ✅ Redis healthy - ping: ${pong}, test value: ${value ? 'OK' : 'FAIL'}`);
    consecutiveFailures = 0;
    return true;
    
  } catch (error) {
    consecutiveFailures++;
    console.error(`[${new Date().toISOString()}] ❌ Redis health check failed (${consecutiveFailures}/${MAX_FAILURES}):`, error.message);
    
    if (consecutiveFailures >= MAX_FAILURES) {
      console.log(`[${new Date().toISOString()}] 🔄 Attempting to restart Redis service...`);
      await restartRedis();
      consecutiveFailures = 0;
    }
    
    return false;
  } finally {
    if (client && client.isOpen) {
      await client.quit();
    }
  }
}

async function restartRedis() {
  try {
    console.log(`[${new Date().toISOString()}] Stopping Redis service...`);
    
    // Try to stop Redis gracefully
    const stopProcess = spawn('sudo', ['systemctl', 'stop', 'redis-server'], {
      stdio: 'pipe'
    });
    
    await new Promise((resolve) => {
      stopProcess.on('close', (code) => {
        console.log(`[${new Date().toISOString()}] Redis stop process exited with code ${code}`);
        resolve();
      });
    });
    
    // Wait a bit before restarting
    await new Promise(resolve => setTimeout(resolve, RESTART_DELAY));
    
    console.log(`[${new Date().toISOString()}] Starting Redis service...`);
    
    // Start Redis
    const startProcess = spawn('sudo', ['systemctl', 'start', 'redis-server'], {
      stdio: 'pipe'
    });
    
    await new Promise((resolve) => {
      startProcess.on('close', (code) => {
        console.log(`[${new Date().toISOString()}] Redis start process exited with code ${code}`);
        resolve();
      });
    });
    
    // Wait for service to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log(`[${new Date().toISOString()}] ✅ Redis restart completed`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to restart Redis:`, error.message);
  }
}

async function monitor() {
  console.log(`[${new Date().toISOString()}] 🚀 Starting Redis monitor for ${SERVICE_NAME}`);
  console.log(`[${new Date().toISOString()}] Monitoring URL: ${REDIS_URL}`);
  console.log(`[${new Date().toISOString()}] Check interval: ${CHECK_INTERVAL}ms`);
  
  // Initial health check
  await checkRedisHealth();
  
  // Periodic health checks
  setInterval(async () => {
    await checkRedisHealth();
  }, CHECK_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] 🛑 Redis monitor shutting down...`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] 🛑 Redis monitor interrupted...`);
  process.exit(0);
});

// Start monitoring
monitor().catch(error => {
  console.error(`[${new Date().toISOString()}] 💥 Fatal error in Redis monitor:`, error);
  process.exit(1);
});
