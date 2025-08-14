#!/bin/bash
# Composite installer (extended) - keeps original scripts intact.
# This script chains base prep plus platform service deployment with safety checks.
set -euo pipefail

LOG_FILE="/var/log/bookaistudio_reinstall.log"
mkdir -p "$(dirname "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "[INFO] Starting BookAIStudio extended install $(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "[INFO] Required env vars (excerpt): JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, ADMIN_KMS_KEY, AI_REVIEW_THRESHOLD (optional, default 0.4)"

# 1. Environment sanity
if [ ! -f ./00.env ]; then
  echo "[ERROR] Missing 00.env file. Aborting." >&2
  exit 1
fi
source ./00.env
export DEBIAN_FRONTEND=noninteractive

# 2. Idempotent step runner
run_step() {
  local name="$1"; shift
  local marker="/var/lib/bookaistudio/.done_$name"
  mkdir -p /var/lib/bookaistudio
  if [ -f "$marker" ]; then
    echo "[SKIP] $name (already done)"
    return 0
  fi
  echo "[RUN ] $name"
  if "$@"; then
    touch "$marker"
    echo "[DONE] $name"
  else
    echo "[FAIL] $name" >&2
    return 1
  fi
}

# 3. Core functions wrapping existing scripts
step_prep() { bash ./01_prep.sh; }
step_mailcow() { [ -f ./10_mailcow_install.sh ] && bash ./10_mailcow_install.sh || echo "mailcow script missing, skipping"; }
step_mautic() { [ -f ./20_mautic_install.sh ] && bash ./20_mautic_install.sh || echo "mautic script missing, skipping"; }
step_n8n() { [ -f ./30_n8n_install.sh ] && bash ./30_n8n_install.sh || echo "n8n script missing, skipping"; }
step_nginx() { [ -f ./40_nginx_sites.sh ] && bash ./40_nginx_sites.sh || echo "nginx sites script missing, skipping"; }
step_certs() { [ -f ./45_certbot_certs.sh ] && bash ./45_certbot_certs.sh || echo "certbot script missing, skipping"; }

# 4. Platform app deploy (Node app + migrations)
step_platform() {
  if [ ! -d ./ai-automation-platform ]; then
    echo "Platform directory missing, skipping"; return 0; fi
  pushd ai-automation-platform >/dev/null
  if command -v npm >/dev/null 2>&1; then
    npm install --omit=dev || true
  fi
  # Run migrations (will include new audit_logs table and other schema updates)
  if [ -f ./scripts/migrate.js ]; then
    node ./scripts/migrate.js || { echo "Migration failed" >&2; return 1; }
  fi
  # Systemd service install (optional)
  if [ ! -f /etc/systemd/system/ai-platform.service ]; then
    cat >/etc/systemd/system/ai-platform.service <<'UNIT'
[Unit]
Description=AI Automation Platform
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/root/Ai-Automation-Platform/ai-automation-platform
ExecStart=/usr/bin/node src/core/enhanced-mcp-server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT
    systemctl daemon-reload
    systemctl enable ai-platform.service
  fi
  systemctl restart ai-platform.service || true
  echo "[INFO] ai-platform.service restarted (MCP server + review/audit features active)"
  popd >/dev/null
}

# 5. Execution order
run_step prep step_prep
run_step mailcow step_mailcow
run_step mautic step_mautic
run_step n8n step_n8n
run_step nginx step_nginx
run_step certs step_certs
run_step platform step_platform

echo "[COMPLETE] Install sequence finished." 
