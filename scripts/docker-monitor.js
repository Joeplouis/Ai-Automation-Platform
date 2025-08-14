#!/usr/bin/env node

const { exec } = require('child_process');
const containerName = process.argv[2] || process.env.CONTAINER_NAME;
const serviceName = process.env.SERVICE_NAME || containerName;
const checkInterval = parseInt(process.env.CHECK_INTERVAL) || 30000;

if (!containerName) {
  console.error('Container name is required');
  process.exit(1);
}

console.log(`🐳 Starting Docker monitor for ${serviceName} (${containerName})`);

function checkDockerContainer() {
  exec(`docker ps --filter "name=${containerName}" --format "{{.Status}}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error checking ${serviceName}:`, error.message);
      return;
    }

    const status = stdout.trim();
    
    if (!status) {
      console.error(`🚨 ${serviceName} container not found! Attempting restart...`);
      restartContainer();
    } else if (status.includes('Restarting') || status.includes('Exited')) {
      console.warn(`⚠️ ${serviceName} is ${status}. Monitoring...`);
    } else if (status.includes('Up')) {
      console.log(`✅ ${serviceName} is healthy: ${status}`);
    } else {
      console.warn(`❓ ${serviceName} unknown status: ${status}`);
    }
  });
}

function restartContainer() {
  const restartCommand = containerName === 'n8n-n8n-1' 
    ? 'cd /opt/n8n && docker compose restart'
    : `docker restart ${containerName}`;

  exec(restartCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Failed to restart ${serviceName}:`, error.message);
    } else {
      console.log(`🔄 ${serviceName} restart initiated`);
    }
  });
}

// Initial check
checkDockerContainer();

// Regular monitoring
setInterval(checkDockerContainer, checkInterval);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`🛑 Stopping ${serviceName} monitor`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`🛑 Stopping ${serviceName} monitor`);
  process.exit(0);
});
