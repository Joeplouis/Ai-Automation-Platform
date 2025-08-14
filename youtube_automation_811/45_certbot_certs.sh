#!/usr/bin/env bash
set -euo pipefail
source ./00.env

apt-get install -y certbot python3-certbot-nginx

certbot --nginx -d ${MAIL_DOMAIN} -m ${ADMIN_EMAIL} --agree-tos --redirect -n
certbot --nginx -d ${MAUTIC_DOMAIN} -m ${ADMIN_EMAIL} --agree-tos --redirect -n
certbot --nginx -d ${API_DOMAIN} -m ${ADMIN_EMAIL} --agree-tos --redirect -n
certbot --nginx -d ${POSTIZ_DOMAIN} -m ${ADMIN_EMAIL} --agree-tos --redirect -n

echo "[OK] Certificates installed."
