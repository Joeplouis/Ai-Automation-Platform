#!/usr/bin/env node

const { exec } = require('child_process');
const domains = (process.env.DOMAINS || 'n8n.bookaistudio.com').split(',');
const checkInterval = parseInt(process.env.CHECK_INTERVAL) || 3600000; // 1 hour

console.log(`🔒 Starting SSL Certificate Monitor for: ${domains.join(', ')}`);

function checkSSLCertificates() {
  domains.forEach(domain => {
    checkDomainSSL(domain);
  });
}

function checkDomainSSL(domain) {
  exec(`echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -noout -dates`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ SSL check failed for ${domain}:`, error.message);
      return;
    }

    const lines = stdout.split('\n');
    const notAfterLine = lines.find(line => line.includes('notAfter'));
    
    if (notAfterLine) {
      const expiryDate = new Date(notAfterLine.split('=')[1]);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 7) {
        console.warn(`🚨 SSL certificate for ${domain} expires in ${daysUntilExpiry} days!`);
        renewCertificate();
      } else if (daysUntilExpiry < 30) {
        console.warn(`⚠️ SSL certificate for ${domain} expires in ${daysUntilExpiry} days`);
      } else {
        console.log(`✅ SSL certificate for ${domain} is valid (${daysUntilExpiry} days remaining)`);
      }
    }
  });
}

function renewCertificate() {
  console.log('🔄 Attempting to renew SSL certificates...');
  exec('sudo certbot renew --quiet', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Certificate renewal failed:', error.message);
    } else {
      console.log('✅ Certificate renewal completed');
      exec('sudo systemctl reload nginx', (reloadError) => {
        if (reloadError) {
          console.error('❌ Nginx reload failed:', reloadError.message);
        } else {
          console.log('✅ Nginx reloaded successfully');
        }
      });
    }
  });
}

// Initial check
checkSSLCertificates();

// Regular monitoring
setInterval(checkSSLCertificates, checkInterval);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Stopping SSL Monitor');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Stopping SSL Monitor');
  process.exit(0);
});
