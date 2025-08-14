# Install & Recovery Guide

This guide consolidates safe recovery steps if the platform or a component fails. All scripts are idempotent where possible; re-running them should not corrupt state.

## Prerequisites
- Ubuntu 22.04+ is recommended
- Docker & Docker Compose plugin installed
- Access to DNS and certificate issuance if you plan to expose services over HTTPS
- Git and curl available

## Core scripts
- SAFE_STARTUP_SCRIPT.sh — sanity checks, restarts core services
- rebuild_full_platform.sh — rebuild images/containers for the full stack
- deploy-bookai-studio.sh — deploy application services
- 30_n8n_install.sh — base n8n install
- 40_nginx_sites.sh — Nginx sites and reverse proxy setup
- 45_certbot_certs.sh — Obtain/renew TLS certs

Usage examples:

1) Safe restart
   ./SAFE_STARTUP_SCRIPT.sh

2) Full rebuild
   ./rebuild_full_platform.sh

3) Re-deploy app
   ./deploy-bookai-studio.sh

## Hardened n8n sandbox (from the UI)
The app provisions a locked-down n8n instance on a target VPS. You can:
- Provision: POST /api/llm/vps/:serverId/n8n/sandbox
- Refresh whitelist: POST /api/llm/vps/:serverId/n8n/whitelist/refresh
- Install timer: POST /api/llm/vps/:serverId/n8n/whitelist/timer
See docs/n8n-sandbox-and-reviewer.md for UI usage.

## Troubleshooting
- If a script fails, re-run with bash -x to see the exact failing step.
- For Docker issues, run docker ps -a and docker logs <container>.
- For Nginx, check /var/log/nginx/error.log on the VPS.
- For systemd timers/services, use systemctl status n8n-whitelist-refresh.service.
