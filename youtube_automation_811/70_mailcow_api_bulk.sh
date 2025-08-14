#!/usr/bin/env bash
set -euo pipefail
source ./00.env

CSV_FILE="${1:-domains.csv}"
if [ ! -f "$CSV_FILE" ]; then
  echo "Usage: $0 domains.csv"
  echo "CSV format: domain,email_accounts"
  echo 'Example row: bessouhairbeauty.com,"bessou,admin"'
  exit 1
fi

echo "Reading $CSV_FILE ..."
tail -n +2 "$CSV_FILE" | while IFS=, read -r domain emails; do
  domain=$(echo "$domain" | tr -d '"')
  emails=$(echo "$emails" | tr -d '"' | tr -d ' ')

  echo "== Domain: $domain =="

  # 1) Add domain
  curl -sS -X POST "${MAILCOW_BASE}/api/v1/add/domain" \
    -H "X-API-Key: ${MAILCOW_API_KEY}" -H "Content-Type: application/json" \
    -d "{\"domain\":\"${domain}\",\"aliases\":0,\"mailboxes\":100,\"defquota\":3072,\"maxquota\":10240,\"active\":1,\"relayhost\":\"\"}" \
    | jq -r '.msg // "ok"' || true

  # 2) Get DKIM
  DKIM_JSON=$(curl -sS -H "X-API-Key: ${MAILCOW_API_KEY}" "${MAILCOW_BASE}/api/v1/get/dkim/${domain}")
  DKIM_VALUE=$(echo "$DKIM_JSON" | jq -r '.[0].v // empty')
  DKIM_SELECTOR=$(echo "$DKIM_JSON" | jq -r '.[0].selector // "selector"')

  # 3) Create mailboxes
  IFS=',' read -ra arr <<< "$emails"
  for localpart in "${arr[@]}"; do
    [ -z "$localpart" ] && continue
    PASS="$(tr -dc 'A-Za-z0-9!@#%^&*' </dev/urandom | head -c 16)"
    jq -n --arg lp "$localpart" --arg dm "$domain" --arg pw "$PASS" \
      '{local_part:$lp, domain:$dm, name:$lp, quota:3072, password:$pw, password2:$pw, active:1}' \
    | curl -sS -X POST "${MAILCOW_BASE}/api/v1/add/mailbox" \
        -H "X-API-Key: ${MAILCOW_API_KEY}" -H "Content-Type: application/json" -d @- \
        | jq -r '.msg // "mailbox ok"'
    echo "  Mailbox created: ${localpart}@${domain}  (password: ${PASS})"
  done

  # 4) Print DNS to paste
  echo "---- DNS for ${domain} ----"
  echo "A    mail                 ${VPS_IP}"
  echo "MX   @                    mail.${domain}.   (priority 10)"
  echo "TXT  @                    v=spf1 mx ~all"
  echo "TXT  _dmarc               v=DMARC1; p=none; rua=mailto:postmaster@${domain}"
  if [ -n "$DKIM_VALUE" ]; then
    echo "TXT  ${DKIM_SELECTOR}._domainkey    ${DKIM_VALUE}"
  else
    echo "# Add DKIM in Mailcow UI then paste TXT here"
  fi
  echo "---------------------------"
done
