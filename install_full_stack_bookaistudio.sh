# install_full_stack_bookaistudio.sh
# One-shot installer for: NGINX+Certbot, Postgres, n8n, WordPress Multisite (Docker), Ollama,
# and NGINX vhosts for chat / n8n / wrpress / postiz / ai.
# Mail servers are assumed to be handled by your existing scripts.
#
# Tested on: Ubuntu 22.04/24.04 (root/sudo). Idempotent where possible.

set -euo pipefail

# =========================
# Config — EDIT IF NEEDED
# =========================
ROOT_DOMAIN="bookaistudio.com"
ADMIN_EMAIL="admin@bookaistudio.com"

# Requested subdomains
CHAT_DOMAIN="chat.bookaistudio.com"      # chat agent (static UI + proxy to n8n webhook)
N8N_DOMAIN="n8n.bookaistudio.com"        # n8n editor / API
WP_DOMAIN="wrpress.bookaistudio.com"     # WordPress Multisite admin/login
POSTIZ_DOMAIN="postiz.bookaistudio.com"  # Postiz (placeholder vhost; proxy later)
OLLAMA_DOMAIN="ai.bookaistudio.com"      # Ollama API reverse-proxy
MAIL_DOMAIN="mail.bookaistudio.com"      # Mail servers (already set up via your scripts)

# n8n security (change these!)
N8N_BASIC_USER="admin"
N8N_BASIC_PASS="$(openssl rand -hex 16)"
N8N_ENCRYPTION_KEY="$(openssl rand -hex 32)"
N8N_WEBHOOK_URL="https://${N8N_DOMAIN}/"   # used for n8n to compute webhook URLs
