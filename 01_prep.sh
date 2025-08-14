#!/bin/bash
set -e
set -u
set -o pipefail
source ./00.env
export DEBIAN_FRONTEND=noninteractive

timedatectl set-timezone "$TIMEZONE" || true
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg lsb-release git jq unzip ufw

# Docker
install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
fi
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) stable" \
> /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker

# Folders
mkdir -p /opt/{mailcow,mautic/{db,html},n8n}
chmod -R 750 /opt

# Firewall
ufw allow 22/tcp || true
ufw allow 80,443/tcp || true
ufw allow 25,465,587/tcp || true
ufw allow 993,995/tcp || true
yes | ufw enable || true

echo "[OK] Prep complete."
