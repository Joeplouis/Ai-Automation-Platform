#!/usr/bin/env bash
set -euo pipefail
source ./00.env

cat <<DNS
Create these A records for your main stack (pointing to ${VPS_IP}):
A  ${MAIL_DOMAIN}    ${VPS_IP}
A  ${MAUTIC_DOMAIN}  ${VPS_IP}
A  ${API_DOMAIN}     ${VPS_IP}
A  ${POSTIZ_DOMAIN}  ${VPS_IP}

For ANY mail domain you add inside Mailcow (example: domain.com):
A     mail                 ${VPS_IP}
MX    @                    mail.domain.com.   (priority 10)
TXT   @                    v=spf1 mx ~all
TXT   _dmarc               v=DMARC1; p=none; rua=mailto:postmaster@domain.com
TXT   <selector>._domainkey   (paste DKIM value from Mailcow UI for domain.com)
DNS
