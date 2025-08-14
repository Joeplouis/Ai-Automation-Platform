#!/usr/bin/env bash
set -euo pipefail
source ./00.env

cat > /opt/mautic/docker-compose.yml <<EOF
services:
  db:
    image: mariadb:11
    restart: unless-stopped
    environment:
      - MARIADB_DATABASE=mautic
      - MARIADB_USER=mautic
      - MARIADB_PASSWORD=${MAUTIC_DB_PASS}
      - MARIADB_ROOT_PASSWORD=${MAUTIC_DB_PASS}
      - TZ=${TIMEZONE}
    volumes:
      - ./db:/var/lib/mysql
  mautic:
    image: mautic/mautic:v5
    restart: unless-stopped
    environment:
      - MAUTIC_DB_HOST=db
      - MAUTIC_DB_NAME=mautic
      - MAUTIC_DB_USER=mautic
      - MAUTIC_DB_PASSWORD=${MAUTIC_DB_PASS}
      - MAUTIC_RUN_CRON_JOBS=true
      - TZ=${TIMEZONE}
    depends_on:
      - db
    ports:
      - "8088:8080"
    volumes:
      - ./html:/var/www/html
EOF

docker compose -f /opt/mautic/docker-compose.yml up -d
echo "[OK] Mautic started (http://127.0.0.1:8088). Will be proxied at https://${MAUTIC_DOMAIN}."
