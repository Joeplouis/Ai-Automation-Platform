#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const checkInterval = parseInt(process.env.CHECK_INTERVAL) || 60000;
const logLevel = process.env.LOG_LEVEL || 'info';

console.log('🖥️ Starting System Monitor');

function checkSystemHealth() {
  const checks = [
    checkMemoryUsage(),
    checkDiskUsage(),
    checkCPUUsage(),
    checkNetworkConnections(),
    checkSystemLoad()
  ];

  Promise.all(checks).then(results => {
    const timestamp = new Date().toISOString();
    console.log(`📊 [${timestamp}] System Health Check Complete`);
  }).catch(error => {
    console.error('❌ System health check failed:', error);
  });
}

function checkMemoryUsage() {
  return new Promise((resolve, reject) => {
    exec('free -m', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      const lines = stdout.split('\n');
      const memLine = lines[1].split(/\s+/);
      const total = parseInt(memLine[1]);
      const used = parseInt(memLine[2]);
      const available = parseInt(memLine[6]);
      const usagePercent = ((used / total) * 100).toFixed(1);

      if (usagePercent > 85) {
        console.warn(`⚠️ High memory usage: ${usagePercent}% (${used}MB/${total}MB)`);
      } else if (logLevel === 'info') {
        console.log(`💾 Memory: ${usagePercent}% used (${available}MB available)`);
      }

      resolve({ memory: { total, used, available, usagePercent } });
    });
  });
}

function checkDiskUsage() {
  return new Promise((resolve, reject) => {
    exec('df -h /', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      const lines = stdout.split('\n');
      const diskLine = lines[1].split(/\s+/);
      const usagePercent = parseInt(diskLine[4]);

      if (usagePercent > 85) {
        console.warn(`⚠️ High disk usage: ${usagePercent}% on root partition`);
      } else if (logLevel === 'info') {
        console.log(`💿 Disk: ${usagePercent}% used`);
      }

      resolve({ disk: { usagePercent } });
    });
  });
}

function checkCPUUsage() {
  return new Promise((resolve, reject) => {
    exec("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1", (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      const cpuUsage = parseFloat(stdout.trim());

      if (cpuUsage > 80) {
        console.warn(`⚠️ High CPU usage: ${cpuUsage}%`);
      } else if (logLevel === 'info') {
        console.log(`🔥 CPU: ${cpuUsage}% used`);
      }

      resolve({ cpu: { usagePercent: cpuUsage } });
    });
  });
}

function checkNetworkConnections() {
  return new Promise((resolve, reject) => {
    exec('netstat -tn | grep ESTABLISHED | wc -l', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      const connections = parseInt(stdout.trim());

      if (connections > 1000) {
        console.warn(`⚠️ High network connections: ${connections}`);
      } else if (logLevel === 'info') {
        console.log(`🌐 Network: ${connections} active connections`);
      }

      resolve({ network: { activeConnections: connections } });
    });
  });
}

function checkSystemLoad() {
  return new Promise((resolve, reject) => {
    exec('uptime', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      const loadMatch = stdout.match(/load average: ([\d.]+), ([\d.]+), ([\d.]+)/);
      if (loadMatch) {
        const load1 = parseFloat(loadMatch[1]);
        const load5 = parseFloat(loadMatch[2]);
        const load15 = parseFloat(loadMatch[3]);

        if (load1 > 4.0) {
          console.warn(`⚠️ High system load: ${load1} (1min avg)`);
        } else if (logLevel === 'info') {
          console.log(`📈 Load: ${load1} ${load5} ${load15} (1/5/15min avg)`);
        }

        resolve({ load: { load1, load5, load15 } });
      } else {
        resolve({ load: null });
      }
    });
  });
}

// Initial check
checkSystemHealth();

// Regular monitoring
setInterval(checkSystemHealth, checkInterval);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Stopping System Monitor');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Stopping System Monitor');
  process.exit(0);
});
