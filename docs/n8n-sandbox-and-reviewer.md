# Hardened n8n Sandbox UI and Reviewer UX

This guide explains how to provision the hardened n8n sandbox from the UI, manage the egress whitelist, enable an optional systemd timer for DNS refresh, and use the improved Reviewer workflow.

## Prerequisites
- A server registered in your VPS inventory (serverId UUID)
- API auth token (JWT) in localStorage/sessionStorage
- Backend exposes the following endpoints:
  - POST /api/llm/vps/:serverId/n8n/sandbox
  - POST /api/llm/vps/:serverId/n8n/whitelist/refresh
  - POST /api/llm/vps/:serverId/n8n/whitelist/timer

## Provision the n8n sandbox
1. Open the Agents tab and choose the n8n tile.
2. In the "Hardened n8n Sandbox" panel:
   - Server ID: UUID of your VPS in the platform
   - Public Domain (optional): n8n.example.com (requires DNS + cert)
   - Agent IPs allowlist: comma/space list of IPs allowed to access Nginx
   - Whitelist Domains: one per line, domains that outbound egress may contact
   - Option: Install hourly whitelist refresh timer (systemd)
3. Click "Provision Sandbox" and watch progress output. The result section shows the base API URL, data directory, and whitelist file path.

Notes:
- Egress is locked via iptables/ipset to resolved IPs from the whitelist. DNS must be available.
- If you set a domain, Nginx + Basic Auth with IP allowlist is configured.

## Refresh the whitelist on demand
- In the same panel, enter any domain changes and click "Refresh Whitelist".
- This updates whitelist-domains.txt and runs whitelist-domains.sh remotely to resolve and apply new IPs.

## Optional: systemd timer for DNS changes
- Toggle the checkbox before provisioning to create n8n-whitelist-refresh.{service,timer} and start it.
- The timer runs hourly by default. You can trigger immediately with systemctl start n8n-whitelist-refresh.service on the VPS.

---

## Reviewer UX improvements
- In Chat and Agents modals, you can optionally override the Reviewer provider/model/temperature.
- Minimal validation prevents setting a model without a provider and enforces temperature 0–1.
- Tooltips clarify recommended settings (e.g., 0.1–0.3 temperature for deterministic rewrites).
- From the Agents modal, after a successful revision, use "Approve & Send (Chat)" to jump to the Chat tab and prefill the prompt.

## Troubleshooting
- If provisioning fails, check the progress log for the first explicit error.
- Ensure the serverId is valid and the platform can SSH/connect as configured.
- Whitelist refresh failures typically indicate DNS/egress blockers or a missing whitelist-domains.sh script on the VPS sandbox root.
