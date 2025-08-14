#!/usr/bin/env bash
set -euo pipefail
source ./00.env

cat > /opt/n8n/docker-compose.yml <<EOF
services:
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_BASIC_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_BASIC_PASS}
      - GENERIC_TIMEZONE=${TIMEZONE}
    ports:
      - "5678:5678"
    volumes:
      - ./data:/home/node/.n8n
EOF

docker compose -f /opt/n8n/docker-compose.yml up -d
echo "[OK] n8n started (http://127.0.0.1:5678). Will be proxied at https://${API_DOMAIN}."
