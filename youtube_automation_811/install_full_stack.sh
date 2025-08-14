#!/usr/bin/env bash
# install_full_stack.sh
# One-shot installer for: Mailcow (mail server), Mautic, n8n (+Postgres & tables),
# WordPress, optional Postiz proxy, Ollama, NGINX reverse proxy + Certbot.
# Target OS: Ubuntu 22.04/24.04 (run as root or with sudo)

set -euo pipefail

#############################
# EDIT THESE VARIABLES FIRST
#############################
MAIN_DOMAIN="${MAIN_DOMAIN:-yourdomain.com}"         # e.g., bookaistudio.com
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${MAIN_DOMAIN}}"   # for Let's Encrypt

# Subdomains
API_DOMAIN="${API_DOMAIN:-api.${MAIN_DOMAIN}}"       # n8n
MAIL_DOMAIN="${MAIL_DOMAIN:-mail.${MAIN_DOMAIN}}"    # Mailcow
MAUTIC_DOMAIN="${MAUTIC_DOMAIN:-mautic.${MAIN_DOMAIN}}"
WP_DOMAIN="${WP_DOMAIN:-wp.${MAIN_DOMAIN}}"          # WordPress (or use root later if you prefer)
POSTIZ_DOMAIN="${POSTIZ_DOMAIN:-postiz.${MAIN_DOMAIN}}"
BI_DOMAIN="${BI_DOMAIN:-bi.${MAIN_DOMAIN}}"          # optional Metabase (disabled by default below)

# What to install (yes/no/detect)
INSTALL_NGINX_CERTBOT="${INSTALL_NGINX_CERTBOT:-detect}" # detect|yes|no
INSTALL_MAILCOW="${INSTALL_MAILCOW:-yes}"
INSTALL_MAUTIC="${INSTALL_MAUTIC:-yes}"
INSTALL_N8N="${INSTALL_N8N:-yes}"
INSTALL_WORDPRESS="${INSTALL_WORDPRESS:-yes}"
INSTALL_POSTGRES="${INSTALL_POSTGRES:-yes}"
INSTALL_POSTIZ_PROXY="${INSTALL_POSTIZ_PROXY:-no}"   # only creates the proxy; you run Postiz yourself on port 3000
INSTALL_OLLAMA="${INSTALL_OLLAMA:-yes}"
INSTALL_METABASE="${INSTALL_METABASE:-no}"

# Timezone
TIMEZONE="${TIMEZONE:-America/New_York}"

# n8n basic auth
N8N_BASIC_USER="${N8N_BASIC_USER:-admin}"
N8N_BASIC_PASS="${N8N_BASIC_PASS:-changeMe!Strong1}"

# Mautic DB
MAUTIC_DB_PASS="${MAUTIC_DB_PASS:-changeMe!Strong2}"

# Postgres (system service) for n8n + "automation" schema (Section M tables)
PG_AUTOMATION_DB="${PG_AUTOMATION_DB:-automation}"
PG_AUTOMATION_USER="${PG_AUTOMATION_USER:-auto_user}"
PG_AUTOMATION_PASS="${PG_AUTOMATION_PASS:-ChangeMe!PGauto1}"
PG_N8N_DB="${PG_N8N_DB:-n8n}"
PG_N8N_USER="${PG_N8N_USER:-n8n_user}"
PG_N8N_PASS="${PG_N8N_PASS:-ChangeMe!PGn8n1}"

# Optional: SMTP relay if your provider blocks outbound 25 (for Mailcow)
USE_SMTP_RELAY="${USE_SMTP_RELAY:-no}" # yes|no
RELAY_HOST="${RELAY_HOST:-}"
RELAY_PORT="${RELAY_PORT:-587}"
RELAY_USER="${RELAY_USER:-}"
RELAY_PASS="${RELAY_PASS:-}"

########################################
# Helper functions
########################################
say(){ echo -e "\n\033[1;32m[*]\033[0m $*\n"; }
warn(){ echo -e "\n\033[1;33m[!]\033[0m $*\n"; }
die(){ echo -e "\n\033[1;31m[x]\033[0m $*\n"; exit 1; }

need_root(){
  if [ "$(id -u)" != "0" ]; then
    die "Run as root (sudo bash install_full_stack.sh)"
  fi
}

pkg_install(){
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y "$@"
}

file_has(){ grep -q "$2" "$1" 2>/dev/null || return 1; }

########################################
# Prep
########################################
need_root

say "Setting timezone to ${TIMEZONE}"
timedatectl set-timezone "$TIMEZONE" || true

say "Installing base packages"
pkg_install ca-certificates curl gnupg lsb-release git ufw jq unzip

say "Installing Docker Engine + Compose plugin"
install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
fi
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
pkg_install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

say "Creating folders"
BASE=/opt/stack
mkdir -p $BASE/{n8n,mautic/{db,html},wordpress,backups} /opt/mailcow /opt/metabase
chmod -R 750 $BASE

say "Firewall (UFW)"
ufw allow 22/tcp || true
ufw allow 80,443/tcp || true
ufw allow 25,465,587,993,995/tcp || true  # mail
yes | ufw enable || true

########################################
# NGINX + Certbot
########################################
maybe_install_nginx(){
  local mode="$1"
  if [ "$mode" = "detect" ]; then
    if command -v nginx >/dev/null 2>&1 && command -v certbot >/dev/null 2>&1; then
      say "Detected NGINX and Certbot — skipping install"
      return 0
    else
      mode="yes"
    fi
  fi
  if [ "$mode" = "yes" ]; then
    say "Installing NGINX + Certbot"
    pkg_install nginx python3-certbot-nginx
    systemctl enable --now nginx
  else
    say "Skipping NGINX/Certbot installation as requested"
  fi
}

maybe_install_nginx "$INSTALL_NGINX_CERTBOT"

create_nginx_vhost(){
  local server="$1" target="$2"
  local file="/etc/nginx/sites-available/${server}.conf"
  cat > "$file" <<EOF
server { listen 80; server_name ${server}; 
  location / {
    proxy_pass ${target};
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  }
}
EOF
  ln -sf "$file" "/etc/nginx/sites-enabled/${server}.conf"
}

########################################
# Mailcow (mail server)
########################################
if [ "$INSTALL_MAILCOW" = "yes" ]; then
  say "Installing Mailcow (Dockerized)"
  if [ ! -d /opt/mailcow/mailcow-dockerized ]; then
    git clone https://github.com/mailcow/mailcow-dockerized /opt/mailcow/mailcow-dockerized
  fi
  cd /opt/mailcow/mailcow-dockerized
  # Base config (SSL via NGINX/Certbot in front)
  if [ ! -f mailcow.conf ]; then
    cat > mailcow.conf <<EOF
TZ=${TIMEZONE}
HTTP_PORT=8080
HTTPS_PORT=7443
MAILCOW_HOSTNAME=${MAIL_DOMAIN}
SKIP_LETS_ENCRYPT=y
EOF
  fi

  # Optional SMTP relay (if provider blocks outbound :25) — writes Postfix extra.cf
  if [ "$USE_SMTP_RELAY" = "yes" ] && [ -n "${RELAY_HOST}" ]; then
    say "Configuring Mailcow SMTP relay via ${RELAY_HOST}:${RELAY_PORT}"
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

  ./generate_config.sh <<< "" || true
  docker compose pull
  docker compose up -d

  # NGINX vhost for Mailcow
  create_nginx_vhost "${MAIL_DOMAIN}" "http://127.0.0.1:8080"
fi

########################################
# Mautic (Docker)
########################################
if [ "$INSTALL_MAUTIC" = "yes" ]; then
  say "Setting up Mautic"
  cat > $BASE/mautic/docker-compose.yml <<EOF
services:
  db:
    image: mariadb:11
    restart: unless-stopped
    environment:
      MARIADB_DATABASE: mautic
      MARIADB_USER: mautic
      MARIADB_PASSWORD: ${MAUTIC_DB_PASS}
      MARIADB_ROOT_PASSWORD: ${MAUTIC_DB_PASS}
      TZ: ${TIMEZONE}
    volumes:
      - ./db:/var/lib/mysql
  mautic:
    image: mautic/mautic:v5
    restart: unless-stopped
    environment:
      MAUTIC_DB_HOST: db
      MAUTIC_DB_NAME: mautic
      MAUTIC_DB_USER: mautic
      MAUTIC_DB_PASSWORD: ${MAUTIC_DB_PASS}
      MAUTIC_RUN_CRON_JOBS: "true"
      TZ: ${TIMEZONE}
    depends_on:
      - db
    volumes:
      - ./html:/var/www/html
    ports:
      - "8088:8080"
EOF
  docker compose -f $BASE/mautic/docker-compose.yml up -d
  create_nginx_vhost "${MAUTIC_DOMAIN}" "http://127.0.0.1:8088"
fi

########################################
# Postgres (system service) + DBs
########################################
if [ "$INSTALL_POSTGRES" = "yes" ]; then
  say "Installing Postgres (system service)"
  pkg_install postgresql postgresql-contrib
  systemctl enable --now postgresql

  # Create users & DBs if not exists
  su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='${PG_AUTOMATION_USER}'\" | grep -q 1 || psql -c \"CREATE ROLE ${PG_AUTOMATION_USER} LOGIN PASSWORD '${PG_AUTOMATION_PASS}'\""
  su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${PG_AUTOMATION_DB}'\" | grep -q 1 || createdb -O ${PG_AUTOMATION_USER} ${PG_AUTOMATION_DB}"

  su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='${PG_N8N_USER}'\" | grep -q 1 || psql -c \"CREATE ROLE ${PG_N8N_USER} LOGIN PASSWORD '${PG_N8N_PASS}'\""
  su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${PG_N8N_DB}'\" | grep -q 1 || createdb -O ${PG_N8N_USER} ${PG_N8N_DB}"

  # Section M: create core tables in automation DB
  say "Creating core 'automation' tables in Postgres"
  su - postgres -c "psql -d ${PG_AUTOMATION_DB}" <<'SQL'
-- Tenants / brands
CREATE TABLE IF NOT EXISTS brands (
  brand_id uuid PRIMARY KEY,
  name text NOT NULL,
  domain text,
  industry text,
  language text DEFAULT 'en',
  tone text,
  target_avatar text,
  compliance_notes text,
  created_at timestamptz DEFAULT now()
);

-- Requests
CREATE TABLE IF NOT EXISTS requests (
  req_id uuid PRIMARY KEY,
  brand_id uuid REFERENCES brands(brand_id),
  req_type text CHECK (req_type IN ('blog','newsletter','script','video')),
  inputs jsonb NOT NULL,
  llm_pref text,
  deadline timestamptz,
  status text DEFAULT 'queued',
  created_at timestamptz DEFAULT now()
);

-- Approvals
CREATE TABLE IF NOT EXISTS approvals (
  approval_id uuid PRIMARY KEY,
  req_id uuid REFERENCES requests(req_id),
  reviewer text,
  decision text CHECK (decision IN ('approved','rejected')),
  notes text,
  decided_at timestamptz DEFAULT now()
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  asset_id uuid PRIMARY KEY,
  req_id uuid REFERENCES requests(req_id),
  kind text CHECK (kind IN ('script','audio','video','thumbnail','caption')),
  storage_url text NOT NULL,
  checksum text,
  license text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- Channels
CREATE TABLE IF NOT EXISTS channels (
  channel_id uuid PRIMARY KEY,
  brand_id uuid REFERENCES brands(brand_id),
  platform text CHECK (platform IN ('youtube','tiktok','instagram','facebook','linkedin','reddit','x')),
  handle text,
  auth_ref text,
  posting_rules jsonb,
  UNIQUE(brand_id, platform, handle)
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  post_id uuid PRIMARY KEY,
  brand_id uuid REFERENCES brands(brand_id),
  channel_id uuid REFERENCES channels(channel_id),
  asset_ids uuid[] NOT NULL,
  caption text,
  tags text[],
  scheduled_at timestamptz,
  status text DEFAULT 'queued',
  published_at timestamptz
);

-- Performance
CREATE TABLE IF NOT EXISTS performance (
  post_id uuid REFERENCES posts(post_id) PRIMARY KEY,
  views bigint DEFAULT 0,
  ctr numeric(6,3),
  watch_time_seconds bigint,
  clicks bigint,
  leads bigint,
  revenue_cents bigint DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Money in
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  click_id uuid PRIMARY KEY,
  post_id uuid REFERENCES posts(post_id),
  offer_id uuid,
  ts timestamptz DEFAULT now(),
  meta jsonb
);
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  conv_id uuid PRIMARY KEY,
  post_id uuid REFERENCES posts(post_id),
  offer_id uuid,
  amount_cents int,
  ts timestamptz DEFAULT now(),
  meta jsonb
);
CREATE TABLE IF NOT EXISTS platform_earnings (
  earning_id uuid PRIMARY KEY,
  post_id uuid REFERENCES posts(post_id),
  platform text,
  amount_cents int,
  ts timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS client_invoices (
  invoice_id uuid PRIMARY KEY,
  brand_id uuid REFERENCES brands(brand_id),
  amount_cents int,
  due_date date,
  paid boolean DEFAULT false,
  paid_at timestamptz
);

-- Costs
CREATE TABLE IF NOT EXISTS workflow_runs (
  run_id uuid PRIMARY KEY,
  req_id uuid REFERENCES requests(req_id),
  node text,
  model text,
  tokens_prompt bigint,
  tokens_completion bigint,
  duration_ms bigint,
  cost_cents int DEFAULT 0,
  ts timestamptz DEFAULT now(),
  meta jsonb
);

-- View
CREATE OR REPLACE VIEW v_daily_kpis AS
SELECT
  date_trunc('day', COALESCE(p.published_at, r.created_at))::date AS day,
  p.brand_id,
  COUNT(DISTINCT p.post_id) AS posts,
  SUM(perf.views) AS views,
  SUM(perf.clicks) AS clicks,
  SUM(perf.leads) AS leads,
  COALESCE(SUM(perf.revenue_cents),0) AS revenue_cents,
  0::bigint AS cost_cents
FROM posts p
LEFT JOIN performance perf ON perf.post_id = p.post_id
LEFT JOIN requests r ON r.req_id::text = p.post_id::text
GROUP BY 1,2;
SQL
fi

########################################
# n8n (Docker) using Postgres
########################################
if [ "$INSTALL_N8N" = "yes" ]; then
  say "Setting up n8n (with Postgres backend)"
  mkdir -p $BASE/n8n/data
  cat > $BASE/n8n/docker-compose.yml <<EOF
services:
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    environment:
      N8N_BASIC_AUTH_ACTIVE: "true"
      N8N_BASIC_AUTH_USER: "${N8N_BASIC_USER}"
      N8N_BASIC_AUTH_PASSWORD: "${N8N_BASIC_PASS}"
      N8N_PROTOCOL: "http"
      N8N_HOST: "${API_DOMAIN}"
      GENERIC_TIMEZONE: "${TIMEZONE}"
      DB_TYPE: "postgresdb"
      DB_POSTGRESDB_HOST: "host.docker.internal"
      DB_POSTGRESDB_PORT: "5432"
      DB_POSTGRESDB_DATABASE: "${PG_N8N_DB}"
      DB_POSTGRESDB_USER: "${PG_N8N_USER}"
      DB_POSTGRESDB_PASSWORD: "${PG_N8N_PASS}"
    ports:
      - "5678:5678"
    volumes:
      - ./data:/home/node/.n8n
EOF
  # On Linux, host.docker.internal may not resolve; use the host IP via gateway trick
  if ! getent hosts host.docker.internal >/dev/null 2>&1; then
    echo "127.0.0.1 host.docker.internal" >> /etc/hosts || true
  fi
  docker compose -f $BASE/n8n/docker-compose.yml up -d

  create_nginx_vhost "${API_DOMAIN}" "http://127.0.0.1:5678"
fi

########################################
# WordPress (Docker) + MariaDB
########################################
if [ "$INSTALL_WORDPRESS" = "yes" ]; then
  say "Setting up WordPress (Docker)"
  cat > $BASE/wordpress/docker-compose.yml <<'EOF'
services:
  db:
    image: mariadb:11
    restart: unless-stopped
    environment:
      MARIADB_DATABASE: wordpress
      MARIADB_USER: wpuser
      MARIADB_PASSWORD: ChangeMe!WPdb1
      MARIADB_ROOT_PASSWORD: ChangeMe!WPdb1
    volumes:
      - ./db:/var/lib/mysql
  wordpress:
    image: wordpress:php8.2-apache
    restart: unless-stopped
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_NAME: wordpress
      WORDPRESS_DB_USER: wpuser
      WORDPRESS_DB_PASSWORD: ChangeMe!WPdb1
    depends_on:
      - db
    volumes:
      - ./html:/var/www/html
    ports:
      - "8081:80"
EOF
  docker compose -f $BASE/wordpress/docker-compose.yml up -d
  create_nginx_vhost "${WP_DOMAIN}" "http://127.0.0.1:8081"
fi

########################################
# Postiz (proxy only, you run app on 3000)
########################################
if [ "$INSTALL_POSTIZ_PROXY" = "yes" ]; then
  say "Creating Postiz proxy vhost (expects app at http://127.0.0.1:3000)"
  create_nginx_vhost "${POSTIZ_DOMAIN}" "http://127.0.0.1:3000"
fi

########################################
# Metabase (optional) + proxy
########################################
if [ "$INSTALL_METABASE" = "yes" ]; then
  say "Setting up Metabase (OSS BI)"
  cat > /opt/metabase/docker-compose.yml <<EOF
services:
  metabase:
    image: metabase/metabase:latest
    restart: unless-stopped
    ports: ["127.0.0.1:3001:3000"]
    environment:
      MB_DB_FILE: /metabase-data/metabase.db
    volumes:
      - metabase_data:/metabase-data
volumes:
  metabase_data:
EOF
  docker compose -f /opt/metabase/docker-compose.yml up -d
  create_nginx_vhost "${BI_DOMAIN}" "http://127.0.0.1:3001"
fi

########################################
# Ollama (local LLM runner)
########################################
if [ "$INSTALL_OLLAMA" = "yes" ]; then
  say "Installing Ollama"
  curl -fsSL https://ollama.com/install.sh | sh
  systemctl enable --now ollama || true
fi

########################################
# NGINX reload + Certbot
########################################
say "Reloading NGINX and issuing Let's Encrypt certs"
nginx -t && systemctl reload nginx

if command -v certbot >/dev/null 2>&1; then
  DOMAINS=""
  [ "$INSTALL_MAILCOW" = "yes" ] && DOMAINS="$DOMAINS -d ${MAIL_DOMAIN}"
  [ "$INSTALL_MAUTIC" = "yes" ] && DOMAINS="$DOMAINS -d ${MAUTIC_DOMAIN}"
  [ "$INSTALL_N8N" = "yes" ] && DOMAINS="$DOMAINS -d ${API_DOMAIN}"
  [ "$INSTALL_WORDPRESS" = "yes" ] && DOMAINS="$DOMAINS -d ${WP_DOMAIN}"
  [ "$INSTALL_POSTIZ_PROXY" = "yes" ] && DOMAINS="$DOMAINS -d ${POSTIZ_DOMAIN}"
  [ "$INSTALL_METABASE" = "yes" ] && DOMAINS="$DOMAINS -d ${BI_DOMAIN}"
  if [ -n "$DOMAINS" ]; then
    certbot --nginx -n --agree-tos -m "${ADMIN_EMAIL}" ${DOMAINS}
  fi
else
  warn "Certbot not found; HTTPS not issued automatically."
fi

########################################
# Backups (simple cron)
########################################
say "Installing nightly backup cron"
cat > /usr/local/bin/stack_backup.sh <<'BKP'
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%F_%H%M%S)
DEST=/opt/stack/backups/$STAMP
mkdir -p "$DEST"

# Mautic DB (MariaDB)
if docker ps -a --format '{{.Names}}' | grep -q 'mautic-db-1'; then
  docker exec $(docker ps -qf "name=mautic-db-1") \
    mysqldump -umautic -p${MAUTIC_DB_PASS} mautic > "$DEST/mautic.sql" 2>/dev/null || true
fi

# WordPress DB
if docker ps -a --format '{{.Names}}' | grep -q 'wordpress-db-1'; then
  docker exec $(docker ps -qf "name=wordpress-db-1") \
    mysqldump -uwpuser -pChangeMe!WPdb1 wordpress > "$DEST/wordpress.sql" 2>/dev/null || true
fi

# Postgres dumps
if command -v pg_dump >/dev/null 2>&1; then
  sudo -u postgres pg_dump -Fc -d ${PG_AUTOMATION_DB} > "$DEST/automation.dump" || true
  sudo -u postgres pg_dump -Fc -d ${PG_N8N_DB} > "$DEST/n8n.dump" || true
fi

# Tar important data
tar czf "$DEST/n8n.tgz" -C /opt/stack/n8n . 2>/dev/null || true
tar czf "$DEST/mautic.tgz" -C /opt/stack/mautic . 2>/dev/null || true
tar czf "$DEST/wordpress.tgz" -C /opt/stack/wordpress . 2>/dev/null || true
tar czf "$DEST/mailcow-conf.tgz" -C /opt/mailcow/mailcow-dockerized data conf mailcow.conf 2>/dev/null || true

# Keep 7 latest
ls -1 /opt/stack/backups | head -n -7 | xargs -I{} rm -rf /opt/stack/backups/{} 2>/dev/null || true
BKP
chmod +x /usr/local/bin/stack_backup.sh
( crontab -l 2>/dev/null; echo "25 3 * * * /usr/local/bin/stack_backup.sh >/var/log/stack_backup.log 2>&1" ) | crontab -

########################################
# Output summary
########################################
cat <<OUT

=========================================================
INSTALL COMPLETE

Domains to point (A records -> your VPS IP):

  ${MAIL_DOMAIN}
  ${MAUTIC_DOMAIN}
  ${API_DOMAIN}
  ${WP_DOMAIN}
$( [ "$INSTALL_POSTIZ_PROXY" = "yes" ] && echo "  ${POSTIZ_DOMAIN}" )
$( [ "$INSTALL_METABASE" = "yes" ] && echo "  ${BI_DOMAIN}" )

After DNS and certs propagate (5–15 min), open:
  Mailcow:   https://${MAIL_DOMAIN}
  Mautic:    https://${MAUTIC_DOMAIN}
  n8n:       https://${API_DOMAIN}   (login: ${N8N_BASIC_USER} / ${N8N_BASIC_PASS})
  WordPress: https://${WP_DOMAIN}
$( [ "$INSTALL_METABASE" = "yes" ] && echo "  Metabase:  https://${BI_DOMAIN}" )

Postgres:
  Host: 127.0.0.1  Port: 5432
  DB/User: ${PG_AUTOMATION_DB}/${PG_AUTOMATION_USER}  (pass: ${PG_AUTOMATION_PASS})
  DB/User: ${PG_N8N_DB}/${PG_N8N_USER}               (pass: ${PG_N8N_PASS})

Next steps:
  1) Mailcow: add each sending domain, copy DKIM TXT into your DNS.
  2) Mautic: finish installer, set mailer via Mailcow SMTP (or relay).
  3) n8n: build your API/webhook workflows and write usage to Postgres (workflow_runs).
  4) WordPress: complete initial setup (you can later switch to multisite).
  5) (Optional) Run 'ollama pull mistral' to grab a local LLM.

Re-run this script safely to update vhosts or components.
=========================================================
OUT
