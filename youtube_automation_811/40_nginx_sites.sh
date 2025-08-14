#!/usr/bin/env bash
set -euo pipefail
source ./00.env

# mail
cat > /etc/nginx/sites-available/${MAIL_DOMAIN}.conf <<NGX
server {
    listen 80;
    server_name ${MAIL_DOMAIN};
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
NGX

# mautic
cat > /etc/nginx/sites-available/${MAUTIC_DOMAIN}.conf <<NGX
server {
    listen 80;
    server_name ${MAUTIC_DOMAIN};
    location / {
        proxy_pass http://127.0.0.1:8088;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
NGX

# api (n8n)
cat > /etc/nginx/sites-available/${API_DOMAIN}.conf <<NGX
server {
    listen 80;
    server_name ${API_DOMAIN};
    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
NGX

# postiz (if running locally on :3000)
cat > /etc/nginx/sites-available/${POSTIZ_DOMAIN}.conf <<NGX
server {
    listen 80;
    server_name ${POSTIZ_DOMAIN};
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
NGX

ln -sf /etc/nginx/sites-available/${MAIL_DOMAIN}.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/${MAUTIC_DOMAIN}.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/${API_DOMAIN}.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/${POSTIZ_DOMAIN}.conf /etc/nginx/sites-enabled/

nginx -t && systemctl reload nginx
echo "[OK] Nginx HTTP proxies ready."
