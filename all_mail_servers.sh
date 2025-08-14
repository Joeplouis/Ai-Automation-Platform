
sudo bash install_stack.sh

2) After it finishes
Create DNS records (snippet at the bottom).
Open the printed URLs & logins to confirm.
#!/usr/bin/env bash
set -euo pipefail

#############################
# EDIT THESE VARIABLES FIRST
#############################
MAIN_DOMAIN="yourdomain.com"
API_DOMAIN="api.${MAIN_DOMAIN}"
MAIL_DOMAIN="mail.${MAIN_DOMAIN}"
MAUTIC_DOMAIN="mautic.${MAIN_DOMAIN}"
N8N_DOMAIN="n8n.${MAIN_DOMAIN}"
POSTIZ_DOMAIThis exposes Mailcow's UI on http://127.0.0.1:8082 (we'll put Nginx HTTPS in front).="postiz.${MAIN_DOMAIN}" # If Postiz is already running
ADMIN_EMAIL="admin@${MAIN_DOMAIN}" # For SSL/ACME
TIMEZONE="America/New_York"

# Initial admin creds (CHANGE THESE)
N8N_BASIC_USER="admin"
N8N_BASIC_PASS="changeMe!Strong1"
MAUTIC_DB_PASS="changeMe!Strong2"
MAUTIC_ADMIN_EMAIL="${ADMIN_EMAIL}"
MAUTIC_ADMIN_PASS="changeMe!Strong3"

# If your provider blocks port 25 outbound, set an SMTP relay here (optional)
USE_SMTP_RELAY="no" # yes|no
RELAY_HOST="email-smtp.us-east-1.amazonaws.com"
RELAY_PORT="587"
RELAY_USER="AKIAXXXXX"
RELAY_PASS="xxxxxxxxxxxxxxxx"

########################################
# No edits needed below this line
########################################
export DEBIAN_FRONTEND=noninteractive

echo "[*] System prep…"
timedatectl set-timezone "$TIMEZONE" || true
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg lsb-release git ufw jq unzip

echo "[*] Docker & Compose plugin…"
install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
fi
echo \
"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) stable" \
> /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

echo "[*] Folders…"
BASE=/opt/stack
mkdir -p $BASE/{caddy,n8n,mautic/{db,html},backups} /opt/mailcow
chmod -R 750 $BASE

echo "[*] UFW firewall…"
ufw allow 22/tcp || true
ufw allow 80,443/tcp || true
# Mail ports
ufw allow 25/tcp || true
ufw allow 465,587/tcp || true
ufw allow 993,995/tcp || true
yes | ufw enable || true

########################################
# cerbot/mginx reverse proxy (HTTPS + routes)
########################################

we are not installing caddy we all ready hat cerbolt and nginx install
#echo "[*] ngnix or cerbolt reverse proxy…"
#cat > $BASE/cerbot/nginx <<EOF
{
email ${ADMIN_EMAIL}
servers {
metrics
}
}

# n8n as your One API entry
${API_DOMAIN} {
encode gzip
@api path /domains* /mailboxes* /inbox* /emails/send* /campaigns* /social/schedule* /scripts/generate*
reverse_proxy @api http://n8n:5678
}

# Mailcow (admin + webmail)
${MAIL_DOMAIN} {
encode gzip
reverse_proxy http://mailcow-proxy:8082
}

# Mautic
${MAUTIC_DOMAIN} {
encode gzip
reverse_proxy http://mautic:8080
}

# Postiz (assumes you already run it at 3000 in docker or host)
${POSTIZ_DOMAIN} {
encode gzip
reverse_proxy postiz:3000
}
EOF

cat > $BASE/caddy/docker-compose.yml <<'EOF'
services:
caddy:
image: caddy:2
restart: unless-stopped
ports:
- "80:80"
- "443:443"
environment:
- TZ=${TIMEZONE}
volumes:
- ./Caddyfile:/etc/caddy/Caddyfile:ro
- caddy_data:/data
- caddy_config:/config
networks:
- edge
- mailcow-net
- core

volumes:
caddy_data:
caddy_config:

networks:
edge:
core:
mailcow-net:
external: true
name: mailcow-network
EOF

########################################
# Mailcow (multi-domain email)
########################################
echo "[*] Mailcow… (this may take a moment)"
if [ ! -d /opt/mailcow/mailcow-dockerized ]; then
git clone https://github.com/mailcow/mailcow-dockerized /opt/mailcow/mailcow-dockerized
fi
cd /opt/mailcow/mailcow-dockerized

# Generate base config non-interactively
MAILCOW_HOSTNAME="${MAIL_DOMAIN}"
if [ ! -f /opt/mailcow/mailcow-dockerized/mailcow.conf ]; then
echo "TZ=${TIMEZONE}" > mailcow.conf
echo "HTTP_PORT=8082" >> mailcow.conf
echo "HTTPS_PORT=7443" >> mailcow.conf
echo "MAILCOW_HOSTNAME=${MAILCOW_HOSTNAME}" >> mailcow.conf
echo "SKIP_LETS_ENCRYPT=y" >> mailcow.conf
fi

# Create a shared network so Caddy can reverse-proxy Mailcow
docker network create mailcow-network || true

# Optional: SMTP relay for hosts that block port 25 outbound
if [ "${USE_SMTP_RELAY}" = "yes" ]; then
echo "[*] Configuring SMTP relay through ${RELAY_HOST}:${RELAY_PORT}"
# Create or update postfix relay settings via extra.env
cat > /opt/mailcow/mailcow-dockerized/data/conf/postfix/extra.cf <<RELAY
relayhost = [${RELAY_HOST}]:${RELAY_PORT}
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = static:${RELAY_USER}:${RELAY_PASS}
smtp_sasl_security_options = noanonymous
smtp_use_tls = yes
smtp_tls_security_level = may
RELAY
fi

# Bring up Mailcow
./generate_config.sh <<< "" || true
docker compose pull
docker compose up -d

########################################
# Mautic (bulk campaigns)
########################################
echo "[*] Mautic…"
cat > $BASE/mautic/docker-compose.yml <<EOF
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
networks: [core]

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
depends_on: [db]
volumes:
- ./html:/var/www/html
networks: [core]
ports:
- "8080:8080"
EOF

########################################
# n8n (Orchestrator = One API)
########################################
echo "[*] n8n…"
cat > $BASE/n8n/docker-compose.yml <<EOF
services:
n8n:
image: n8nio/n8n:latest
restart: unless-stopped
environment:
- N8N_BASIC_AUTH_ACTIVE=true
- N8N_BASIC_AUTH_USER=${N8N_BASIC_USER}
- N8N_BASIC_AUTH_PASSWORD=${N8N_BASIC_PASS}
- N8N_HOST=${N8N_DOMAIN}
- WEBHOOK_TUNNEL_URL=https://${API_DOMAIN}
- N8N_PROTOCOL=https
- GENERIC_TIMEZONE=${TIMEZONE}
networks: [core]
ports:
- "5678:5678"
volumes:
- ./data:/home/node/.n8n
EOF

########################################
# Ollama (AI text gen)
########################################
echo "[*] Ollama…"
curl -fsSL https://ollama.com/install.sh | sh
systemctl enable --now ollama

########################################
# Postiz (reverse proxy only)
########################################
# If you run Postiz in Docker elsewhere, ensure it's on 'core' network or change the proxy target.
# For a local container, you can later 'docker run --name postiz -p 3000:3000 ...' and attach to 'core' network.

########################################
# Compose UP all stacks
########################################
echo "[*] Bringing up stacks…"
docker compose -f $BASE/caddy/docker-compose.yml up -d
docker compose -f $BASE/n8n/docker-compose.yml up -d
docker compose -f $BASE/mautic/docker-compose.yml up -d

########################################
# Nightly backups (Docker volumes)
########################################
echo "[*] Nightly backup cron…"
cat > /usr/local/bin/stack_backup.sh <<'BKP'
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%F_%H%M%S)
DEST=/opt/stack/backups/$STAMP
mkdir -p "$DEST"

echo "[*] Dumping volumes…"
# Mautic DB
docker exec $(docker ps -qf "name=mautic-db-1") mysqldump -umautic -p${MAUTIC_DB_PASS} mautic > "$DEST/mautic.sql" 2>/dev/null || true

# Tar important data
tar czf "$DEST/caddy.tgz" -C /opt/stack/caddy .
tar czf "$DEST/n8n.tgz" -C /opt/stack/n8n .
tar czf "$DEST/mautic.tgz" -C /opt/stack/mautic .
# Mailcow has its own backup playbook; we snapshot configs:
tar czf "$DEST/mailcow-conf.tgz" -C /opt/mailcow/mailcow-dockerized data conf mailcow.conf 2>/dev/null || true

# Prune old (keep 7)
ls -1 /opt/stack/backups | head -n -7 | xargs -I{} rm -rf /opt/stack/backups/{} 2>/dev/null || true
BKP
chmod +x /usr/local/bin/stack_backup.sh

( crontab -l 2>/dev/null; echo "15 3 * * * /usr/local/bin/stack_backup.sh >/var/log/stack_backup.log 2>&1" ) | crontab -

########################################
# n8n bootstrap: create stub workflows via API (optional)
########################################
echo "[*] You can now add n8n workflows for:"
echo " - POST /domains -> create Mailcow domain and return DNS"
echo " - POST /mailboxes -> create mailbox and return IMAP/SMTP creds"
echo " - GET /inbox -> IMAP read & parse OTP"
echo " - POST /emails/send -> transactional send"
echo " - POST /campaigns -> Mautic campaign trigger"
echo " - POST /social/schedule -> Postiz scheduler"
echo " - POST /scripts/generate -> calls Ollama for copy"

########################################
# Output summary
########################################
cat <<OUT

=========================================================
DONE. Next steps:

1) Create DNS (at your registrar):
A ${API_DOMAIN} -> VPS_IP
A ${MAIL_DOMAIN} -> VPS_IP
A ${MAUTIC_DOMAIN} -> VPS_IP
A ${N8N_DOMAIN} -> VPS_IP
A ${POSTIZ_DOMAIN} -> VPS_IP

For EACH sending/receiving domain you use in Mailcow:
A mail -> VPS_IP
MX @ -> mail.${MAIN_DOMAIN}. (prio 10)
TXT @ v=spf1 mx ~all
TXT _dmarc v=DMARC1; p=none; rua=mailto:postmaster@${MAIN_DOMAIN}
TXT <selector>._domainkey (paste DKIM value from Mailcow)

2) Open the dashboards (after DNS/SSL is live ~15 mins):
- Caddy routes:
- n8n (One API): https://${API_DOMAIN}
Login: ${N8N_BASIC_USER} / ${N8N_BASIC_PASS}
- Mailcow (admin): https://${MAIL_DOMAIN}
- Mautic: https://${MAUTIC_DOMAIN}
- Postiz (proxy): https://${POSTIZ_DOMAIN}

3) Mailcow:
- Add domains & mailboxes.
- Copy DKIM TXT to DNS.
- If provider blocks port 25, we configured relay = ${USE_SMTP_RELAY}
Relay host: ${RELAY_HOST}:${RELAY_PORT}

4) Mautic:
- Initial setup at ${MAUTIC_DOMAIN}.
- Set mailer to SMTP via Mailcow or your relay.

5) n8n:
- Create the orchestrator workflows and secure each webhook with a token.
- Point your MCP agent to https://${API_DOMAIN}.

6) Ollama:
- Test: curl http://localhost:11434/api/tags
- Pull LLM: ollama pull mistral (e.g., mistral, llama3, qwen)
- Your /scripts/generate endpoint should POST prompts to Ollama.

7) Backups:
- Nightly cron installed. Check /opt/stack/backups.

When you outgrow Hostinger:
- Recreate this stack on the new server, rsync /opt/stack and /opt/mailcow, restore Mautic DB, repoint DNS. Your API stays the same.
=========================================================
OUT



What you’ll still need to do (quick checklist)
Update the VARS at the top (domains, passwords).
Create your n8n workflows for /domains, /mailboxes, etc. (I can export a starter pack if you want.)
In Mailcow, add each new sending domain, copy its DKIM to DNS.
In Mautic, set the mailer (Mailcow SMTP or relay) and confirm tracking works.
Warm up sending slowly for best deliverability.
Want me to generate the n8n workflow JSON for your “One API” routes so you can import and go?
 
Sources
You said:
im usin nginx curently and certbot my vps ip is 168.231.74.188 my main domain is bookaitudio.com that is the domain for my ai agency
 
ChatGPT said:
 
Thought for 10s
Perfect—since you’re already on Nginx + Certbot and your VPS IP is 168.231.74.188, here’s the clean setup tailored for you.

quick note: I’ve been seeing your domain as bookaistudio.com in earlier messages, but you just wrote bookaitudio.com (missing “s”). I’ll use bookaistudio.com below. If your real domain is the other one, just replace it everywhere.

1) DNS (at your registrar)
Point these to your VPS IP 168.231.74.188:


A api 168.231.74.188
A mail 168.231.74.188
A mautic 168.231.74.188
A n8n 168.231.74.188
A postiz 168.231.74.188



For every domain you’ll use for mail sending/receiving later, add (after Mailcow creates DKIM):


A mail 168.231.74.188
MX @ mail.yourdomain.com. (priority 10)
TXT @ v=spf1 mx ~all
TXT _dmarc v=DMARC1; p=none; rua=mailto:postmaster@yourdomain.com
TXT <selector>._domainkey (paste DKIM from Mailcow)

A mail 168.231.74.188
MX @ mail.yourdomain.com. (priority 10)
TXT @ v=spf1 mx ~all
TXT _dmarc v=DMARC1; p=none; rua=mailto:postmaster@yourdomain.com
TXT <selector>._domainkey (paste DKIM from Mailcow)
2) Install Docker & folders (once)
bash
Copy
Edit
sudo apt update && sudo apt -y install ca-certificates curl gnupg lsb-release git jq unzip
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update && sudo apt -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo mkdir -p /opt/{mailcow,mautic/{db,html},n8n}
3) Mailcow (multi-domain email + API)
bash
Copy
Edit
cd /opt/mailcow
git clone https://github.com/mailcow/mailcow-dockerized
cd mailcow-dockerized
# Create minimal config:
cat > mailcow.conf <<EOF
TZ=America/New_York
HTTP_PORT=8082
HTTPS_PORT=7443
MAILCOW_HOSTNAME=mail.bookaistudio.com
SKIP_LETS_ENCRYPT=y
EOF
./generate_config.sh
sudo docker compose pull
sudo docker compose up -d
This exposes Mailcow’s UI on http://127.0.0.1:8080 (we’ll put Nginx HTTPS in front).
Open these mail ports on any firewall/security group if needed: 25, 465, 587, 993, 995.
If your provider blocks outbound 25, configure a relay (SES/Mailgun/Postmark) later.

4) Mautic (bulk campaigns)
bash
Copy
Edit
cat > /opt/mautic/docker-compose.yml <<'EOF'
services:
db:
image: mariadb:11
restart: unless-stopped
environment:
MARIADB_DATABASE: mautic
MARIADB_USER: mautic
MARIADB_PASSWORD: changeMe!Strong2
MARIADB_ROOT_PASSWORD: changeMe!Strong2
volumes:
- ./db:/var/lib/mysql
mautic:
image: mautic/mautic:v5
restart: unless-stopped
environment:
MAUTIC_DB_HOST: db
MAUTIC_DB_NAME: mautic
MAUTIC_DB_USER: mautic
MAUTIC_DB_PASSWORD: changeMe!Strong2
MAUTIC_RUN_CRON_JOBS: "true"
depends_on:
- db
ports:
- "8088:8080"
volumes:
- ./html:/var/www/html
EOF
sudo docker compose -f /opt/mautic/docker-compose.yml up -d
We’ll reverse-proxy mautic.bookaistudio.com → http://127.0.0.1:8088.

5) n8n (your “One API” orchestrator)
bash
Copy
Edit
cat > /opt/n8n/docker-compose.yml <<'EOF'
services:
n8n:
image: n8nio/n8n:latest
restart: unless-stopped
environment:
N8N_BASIC_AUTH_ACTIVE: "true"
N8N_BASIC_AUTH_USER: "admin"
N8N_BASIC_AUTH_PASSWORD: "changeMe!Strong1"
GENERIC_TIMEZONE: "America/New_York"
ports:
- "5678:5678"
volumes:
- ./data:/home/node/.n8n
EOF
sudo docker compose -f /opt/n8n/docker-compose.yml up -d
We’ll reverse-proxy api.bookaistudio.com → http://127.0.0.1:5678.
Inside n8n, you’ll create webhook workflows like /domains, /mailboxes, /inbox, etc.

6) Nginx server blocks (reverse proxy)
Create files under /etc/nginx/sites-available/ then symlink to sites-enabled/.

mail.bookaistudio.com

nginx
Copy
Edit
server {
listen 80;
server_name mail.bookaistudio.com;
location / {
proxy_pass http://127.0.0.1:8082;
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
}
mautic.bookaistudio.com

nginx
Copy
Edit
server {
listen 80;
server_name mautic.bookaistudio.com;
location / {
proxy_pass http://127.0.0.1:8088;
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
}
api.bookaistudio.com (n8n)

nginx
Copy
Edit
server {
listen 80;
server_name api.bookaistudio.com;

# (Optional) tighten: only expose these paths to n8n webhooks
location / {
proxy_pass http://127.0.0.1:5678;
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
}
postiz.bookaistudio.com
If Postiz is running locally on port 3000:

nginx
Copy
Edit
server {
listen 80;
server_name postiz.bookaistudio.com;
location / {
proxy_pass http://127.0.0.1:3000;
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
}
Enable & test:

bash
Copy
Edit
sudo ln -s /etc/nginx/sites-available/mail.bookaistudio.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/mautic.bookaistudio.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.bookaistudio.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/postiz.bookaistudio.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
7) Certbot (HTTPS for each subdomain)
Run once per vhost (or pass multiple -d in one go if you prefer):

bash
Copy
Edit
sudo certbot --nginx -d mail.bookaistudio.com
sudo certbot --nginx -d mautic.bookaistudio.com
sudo certbot --nginx -d api.bookaistudio.com
sudo certbot --nginx -d postiz.bookaistudio.com
(If you also want n8n.bookaistudio.com separate from api., add another vhost and cert.)

8) Wire things together
Mailcow: log in at https://mail.bookaistudio.com, add your first domain & mailbox, copy its DKIM TXT into DNS.

Mautic: open https://mautic.bookaistudio.com, finish setup, set Mailer to SMTP via Mailcow (or a relay).

n8n: open https://api.bookaistudio.com, login with the basic auth, create webhook workflows:

POST /domains → HTTP Request to Mailcow API to add domain; return DNS JSON

POST /mailboxes → HTTP Request to Mailcow API to add mailbox; return creds

GET /inbox → IMAP node to read OTP/verification

POST /campaigns → HTTP to Mautic API (create/trigger campaigns)

POST /social/schedule → HTTP to Postiz API

Optionally /scripts/generate → call your Ollama endpoint on localhost:11434

9) (Optional) Outbound SMTP relay
If Hostinger blocks outbound 25 or you want better deliverability, configure a relay in Mailcow:

SES, Mailgun, SendGrid, Postmark, etc.
Mailcow docs show where to add the Postfix relay settings; after that, test sending from a mailbox and Mautic.

Want me to drop ready-made n8n workflow JSON for:

/domains (create domain in Mailcow and return DNS),

/mailboxes (create mailbox),

/inbox (read OTP),

/campaigns (trigger Mautic),

/social/schedule (Postiz),

so you can import and go?









Ask ChatGPT
You said:
curently i have 2 clients bessouhairbeauty.com but since it is in the server the subdomaine is subdomain setting inmy vps i also have unifiedbusinessblog.com that is setup as subdomain as well i will need email address for these 2 as well bessou@bessouhairbeauty.com, admin@bessouhairbeauty.com , also admin@unifiedbusinessblog.com, sales@unifiedbusinessblog.com i also have 33 subdomaine for sp.unifiedbusinessblog.com , fr.unifiedbusinessblog.com and so on i will need email for all but later


ChatGPT said:
Got it — so you have:

Main agency domain → bookaistudio.com (where we’ll install Mailcow, Mautic, n8n, Postiz, Ollama)

Client domains →

bessouhairbeauty.com → need bessou@bessouhairbeauty.com & admin@bessouhairbeauty.com

unifiedbusinessblog.com → need admin@unifiedbusinessblog.com & sales@unifiedbusinessblog.com

33 language/location subdomains under unifiedbusinessblog.com (e.g., sp., fr., etc.) → later we’ll make matching emails (e.g., info@sp.unifiedbusinessblog.com).

How to handle this in Mailcow
Mailcow supports multi-domain + subdomain mailboxes in one install.
We just add each domain to Mailcow once, and it manages DNS + DKIM for you.

Step 1 — Add client domains to Mailcow
Log into https://mail.bookaistudio.com (after install).

Go to Configuration → Domains → Add domain.

Enter:

bessouhairbeauty.com

unifiedbusinessblog.com

Mailcow will generate DKIM keys for each — copy them into DNS.

Step 2 — Set DNS for each domain (and subdomains if you want them to send/receive mail)
At your DNS provider for each domain:

For bessouhairbeauty.com

sql
Copy
Edit
A mail 168.231.74.188
MX @ mail.bessouhairbeauty.com. (priority 10)
TXT @ v=spf1 mx ~all
TXT _dmarc v=DMARC1; p=none; rua=mailto:postmaster@bessouhairbeauty.com
TXT <selector>._domainkey (paste DKIM from Mailcow)
For unifiedbusinessblog.com

sql
Copy
Edit
A mail 168.231.74.188
MX @ mail.unifiedbusinessblog.com. (priority 10)
TXT @ v=spf1 mx ~all
TXT _dmarc v=DMARC1; p=none; rua=mailto:postmaster@unifiedbusinessblog.com
TXT <selector>._domainkey (paste DKIM from Mailcow)
Step 3 — Create mailboxes
In Mailcow:

bessouhairbeauty.com

bessou@bessouhairbeauty.com

admin@bessouhairbeauty.com

unifiedbusinessblog.com

admin@unifiedbusinessblog.com

sales@unifiedbusinessblog.com

You can do this manually via the Mailcow UI or automate via API/n8n.

Step 4 — Subdomains for email (later)
If you want email for each language subdomain (e.g., info@sp.unifiedbusinessblog.com), Mailcow treats subdomains as separate mail domains.

That means for sp.unifiedbusinessblog.com you’ll repeat:

sql
Copy
Edit
A mail.sp 168.231.74.188
MX @ mail.sp.unifiedbusinessblog.com. (priority 10)
TXT @ v=spf1 mx ~all
TXT _dmarc v=DMARC1; p=none; rua=mailto:postmaster@sp.unifiedbusinessblog.com
TXT <selector>._domainkey (paste DKIM from Mailcow)
… and add sp.unifiedbusinessblog.com as a separate domain in Mailcow.

We can automate adding all 33 subdomains + DNS + mailboxes in one n8n workflow so you don’t have to click 33 times.

Recommended next step
Since you’ll need:

bookaistudio.com

bessouhairbeauty.com

unifiedbusinessblog.com

~33 subdomains later

…we should:

Install Mailcow now on your VPS.

Add the first 3 domains + mailboxes.

Test sending/receiving from them.

Later, run a batch script to add the 33 subdomains and auto-create emails.

If you want, I can make you:

A ready-to-import n8n workflow that takes a CSV of domains + mailboxes and automatically:

Adds them to Mailcow via API

Outputs the DNS records you need to paste

Creates all requested email accounts

Do you want me to prepare that automation now so you can bulk-add all future domains/subdomains without manual work?








You said:
yes


ChatGPT said:
Alright — here’s how we’ll do it so your AI agent (or you via n8n) can bulk-create domains + mailboxes in Mailcow, and automatically get the DNS records you need for each one.

How the Workflow Will Work
Input CSV with:

pgsql
Copy
Edit
domain,email_accounts
bessouhairbeauty.com,"bessou,admin"
unifiedbusinessblog.com,"admin,sales"
sp.unifiedbusinessblog.com,"info"
fr.unifiedbusinessblog.com,"info"
domain = the domain or subdomain you want email on

email_accounts = comma-separated list of mailbox names (without @domain)

n8n will:

Read the CSV

Call Mailcow API to:

Create the domain

Create DKIM key for it

Create each mailbox listed

Return a JSON of DNS records for SPF, DKIM, DMARC, MX, and A

You paste those DNS records into your registrar.

Prerequisites
Mailcow is installed & accessible at https://mail.bookaistudio.com

Mailcow API key generated in:

Configuration → API Access

n8n running at https://api.bookaistudio.com (or wherever you have it)

Your CSV uploaded in n8n or accessible via URL

Mailcow API Endpoints Needed
POST /api/v1/add/domain → Add domain

POST /api/v1/add/mailbox → Add mailbox

GET /api/v1/get/dkim/{domain} → Get DKIM key for domain

n8n Workflow Steps
Nodes:

Read CSV (n8n "Read Binary File" → "Spreadsheet File" node)

Loop over rows (n8n "Split In Batches" node)

HTTP Request: Create Domain
Method: POST
URL: https://mail.bookaistudio.com/api/v1/add/domain
Auth: Bearer token (Mailcow API key)
Body JSON:

json
Copy
Edit
{
"domain": "{{$json.domain}}",
"aliases": 0,
"mailboxes": 10,
"defquota": 3072,
"maxquota": 10240,
"active": 1,
"relayhost": ""
}
HTTP Request: Get DKIM
Method: GET
URL: https://mail.bookaistudio.com/api/v1/get/dkim/{{$json.domain}}

Loop over email_accounts (Split string by ,)

HTTP Request: Create Mailbox
Method: POST
URL: https://mail.bookaistudio.com/api/v1/add/mailbox
Body JSON:

json
Copy
Edit
{
"local_part": "{{$json.email_account}}",
"domain": "{{$json.domain}}",
"name": "{{$json.email_account}}",
"quota": 3072,
"password": "GenerateStrongPassHere",
"password2": "GenerateStrongPassHere",
"active": 1
}
Build DNS Output (Function node):

javascript
Copy
Edit
return [
{
json: {
domain: $json.domain,
records: [
{type: "A", name: "mail", value: "168.231.74.188"},
{type: "MX", name: "@", value: `mail.${$json.domain}.`, priority: 10},
{type: "TXT", name: "@", value: "v=spf1 mx ~all"},
{type: "TXT", name: "_dmarc", value: `v=DMARC1; p=none; rua=mailto:postmaster@${$json.domain}`},
{type: "TXT", name: "<selector>._domainkey", value: $json.dkim_record}
]
}
}
]
Write to file or return as JSON for copy-paste.

Output Example
json
Copy
Edit
{
"domain": "bessouhairbeauty.com",
"records": [
{"type": "A", "name": "mail", "value": "168.231.74.188"},
{"type": "MX", "name": "@", "value": "mail.bessouhairbeauty.com.", "priority": 10},
{"type": "TXT", "name": "@", "value": "v=spf1 mx ~all"},
{"type": "TXT", "name": "_dmarc", "value": "v=DMARC1; p=none; rua=mailto:postmaster@bessouhairbeauty.com"},
{"type": "TXT", "name": "selector._domainkey", "value": "v=DKIM1; k=rsa; p=MIIBIjANBg..."}
]
}
Next Steps for You
I can export this full n8n workflow JSON so you can import and run it right now.

You prepare your CSV with the domains + mailbox lists.

Run the workflow → get all DNS records + mailboxes created.

Do you want me to write the exact ready-to-import n8n workflow JSON so you can skip building it manually and just drop in your API key & CSV? That way you can have all these emails created in one click.








N8N INSTALL.txt
Displaying N8N INSTALL.txt.