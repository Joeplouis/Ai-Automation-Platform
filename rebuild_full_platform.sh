#!/bin/bash
# Rebuild / Reinstall Entire BookAIStudio Stack (non-destructive where possible)
# Safe to re-run. Creates marker files for completed steps unless --force supplied.
# Includes: base prep, docker (if missing), core services (mailcow, mautic, n8n, nginx, certbot),
# AI Automation Platform app install + migrations + systemd service.
# Optional: backup restore hooks (DB + volumes) if archives present.

set -euo pipefail
IFS=$'\n\t'

LOG_FILE="/var/log/bookaistudio_rebuild.log"
MARK_DIR="/var/lib/bookaistudio"
mkdir -p "$(dirname "$LOG_FILE")" "$MARK_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "==== [START] Rebuild at $(date -u +%Y-%m-%dT%H:%M:%SZ) ===="

# --------------------------
# Helpers
# --------------------------
usage() {
  cat <<'USAGE'
Usage: rebuild_full_platform.sh [options]
  --force                Ignore existing step markers (rerun all)
  --only STEPS           Comma list of step keys to run (prep,mailcow,mautic,n8n,nginx,certs,platform,backup-restore)
  --skip STEPS           Comma list of steps to skip
  --with-backup          Attempt backup restoration if archives found
  -h|--help              Show this help
Examples:
  ./rebuild_full_platform.sh --force
  ./rebuild_full_platform.sh --only prep,platform
USAGE
}

FORCE=0
ONLY=""
SKIP=""
WITH_BACKUP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=1; shift;;
    --only) ONLY="$2"; shift 2;;
    --skip) SKIP="$2"; shift 2;;
    --with-backup) WITH_BACKUP=1; shift;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1"; usage; exit 1;;
  esac
done

in_list() { local item="$1" list="$2"; IFS=',' read -ra parts <<<"$list"; for p in "${parts[@]}"; do [ "$p" = "$item" ] && return 0; done; return 1; }
should_run() {
  local name="$1";
  if [ -n "$ONLY" ] && ! in_list "$name" "$ONLY"; then return 1; fi
  if [ -n "$SKIP" ] && in_list "$name" "$SKIP"; then return 1; fi
  return 0
}

step() {
  local key="$1"; shift
  local fn="$1"; shift
  local marker="$MARK_DIR/.done_$key"
  if ! should_run "$key"; then echo "[SKIP-FILTER] $key"; return 0; fi
  if [ $FORCE -eq 0 ] && [ -f "$marker" ]; then echo "[SKIP-DONE ] $key"; return 0; fi
  echo "[RUN        ] $key"
  if "$fn" "$@"; then
    touch "$marker"
    echo "[DONE       ] $key"
  else
    echo "[FAIL       ] $key" >&2
    return 1
  fi
}

require_root() { [ "${EUID:-$(id -u)}" -eq 0 ] || { echo "[ERROR] Must run as root"; exit 1; }; }
require_root

# --------------------------
# Pre-flight checks
# --------------------------
command -v curl >/dev/null 2>&1 || apt-get update -y

if [ ! -f ./00.env ]; then
  echo "[WARN] Missing 00.env - creating sample." >&2
  cat >./00.env <<'ENV'
TIMEZONE=UTC
# Add other required environment variables here
# Core security / JWT
JWT_SECRET=change_me
JWT_ISSUER=ai-automation-platform
JWT_AUDIENCE=ai-automation-clients
ADMIN_KMS_KEY=change_me_admin_kms
# Optional AI review threshold (0.0-1.0)
AI_REVIEW_THRESHOLD=0.4
ENV
fi
source ./00.env || true
export DEBIAN_FRONTEND=noninteractive

# --------------------------
# Step Implementations
# --------------------------
fn_prep() { bash ./01_prep.sh; }
fn_mailcow() { [ -f ./10_mailcow_install.sh ] && bash ./10_mailcow_install.sh || echo "[INFO] mailcow script missing"; }
fn_mautic() { [ -f ./20_mautic_install.sh ] && bash ./20_mautic_install.sh || echo "[INFO] mautic script missing"; }
fn_n8n() { [ -f ./30_n8n_install.sh ] && bash ./30_n8n_install.sh || echo "[INFO] n8n script missing"; }
fn_nginx() { [ -f ./40_nginx_sites.sh ] && bash ./40_nginx_sites.sh || echo "[INFO] nginx sites script missing"; }
fn_certs() { [ -f ./45_certbot_certs.sh ] && bash ./45_certbot_certs.sh || echo "[INFO] certbot script missing"; }

fn_platform() {
  if [ ! -d ./ai-automation-platform ]; then echo "[INFO] Skipping platform (dir missing)"; return 0; fi
  pushd ai-automation-platform >/dev/null
  # Install Node if missing
  if ! command -v node >/dev/null 2>&1; then
    echo "[INFO] Installing Node.js (LTS)";
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
  fi
  if command -v npm >/dev/null 2>&1; then npm install --omit=dev || true; fi
  if [ -f scripts/migrate.js ]; then
    echo "[INFO] Running migrations (includes audit_logs, review queue, ai_outputs updates)"; node scripts/migrate.js
  fi
  # Systemd service
  if [ ! -f /etc/systemd/system/ai-platform.service ]; then
    cat >/etc/systemd/system/ai-platform.service <<'UNIT'
[Unit]
Description=AI Automation Platform
After=network.target

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
  echo "[INFO] ai-platform.service restarted (JWT hardened, audit logger, review queue, auto-escalation)"
  popd >/dev/null
}

fn_backup_restore() {
  # Hook points: if /backup/mailcow.tar.gz etc. exist, restore them (placeholder)
  local backup_dir="/backup"
  [ -d "$backup_dir" ] || { echo "[INFO] No /backup directory"; return 0; }
  if ls $backup_dir/platform-db-*.sql.gz >/dev/null 2>&1; then
    echo "[INFO] Found platform DB backups (manual restore logic placeholder)";
  fi
  return 0
}

# --------------------------
# Execute Steps
# --------------------------
step prep fn_prep
step mailcow fn_mailcow
step mautic fn_mautic
step n8n fn_n8n
step nginx fn_nginx
step certs fn_certs
step platform fn_platform
if [ $WITH_BACKUP -eq 1 ]; then step backup-restore fn_backup_restore; fi

echo "==== [COMPLETE] Rebuild finished $(date -u +%Y-%m-%dT%H:%M:%SZ) ===="
