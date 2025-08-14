#!/usr/bin/env bash
set -euo pipefail
source ./00.env

cd /opt/mailcow
if [ ! -d mailcow-dockerized ]; then
  git clone https://github.com/mailcow/mailcow-dockerized
fi
cd mailcow-dockerized

# Minimal config (Nginx will proxy, so skip LE here)
cat > mailcow.conf <<EOF
TZ=${TIMEZONE}
HTTP_PORT=8082
HTTPS_PORT=7443
MAILCOW_HOSTNAME=${MAIL_DOMAIN}
SKIP_LETS_ENCRYPT=y
EOF

./generate_config.sh <<< "" || true

# Optional SMTP relay
if [ "${USE_SMTP_RELAY}" = "yes" ]; then
  mkdir -p data/conf/postfix
  cat > data/conf/postfix/extra.cf <<RELAY
relayhost = [${RELAY_HOST}]:${RELAY_PORT}
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = static:${RELAY_USER}:${RELAY_PASS}
smtp_sasl_security_options = noanonymous
smtp_use_tls = yes
smtp_tls_security_level = may
RELAY
fi

docker compose pull
docker compose up -d

echo "[OK] Mailcow started. UI will be proxied at https://${MAIL_DOMAIN} after Nginx+Certbot."
