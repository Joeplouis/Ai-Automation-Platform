# AI Automation Platform

A starter repository for building an AI-driven automation platform. This skeleton includes a clean structure, sensible defaults, and room to grow.

## Overview
- src: application source code
- tests: automated tests
- docs: documentation and notes

## Getting Started
1. Choose your stack (Node.js or Python recommended).
2. Create your app entry point in `src/`.
3. Add tests in `tests/`.
4. Update this README with real details.

Quick test: see docs/quick-dev-login-and-sse-chat.md for a 60-second streaming chat sanity check (no DB user required in dev).

## Next Steps
- Initialize runtime (Node: package.json; Python: pyproject.toml/venv)
- Add CI, linting, formatting
- Pick a license

## Disaster Recovery & Full Reinstall
Two composite scripts help rebuild the entire stack if the machine crashes:

1. `install_master_plus.sh` – Sequential installer wrapping existing component scripts with idempotent markers.
2. `rebuild_full_platform.sh` – Advanced rebuild tool supporting selective steps, force re-run, and backup hooks.

## Recovery and Reinstall

If the system crashes or you need to re-apply infrastructure pieces (n8n sandbox, Nginx, certs, timers), you can re-run the top-level scripts safely:

- ./SAFE_STARTUP_SCRIPT.sh — sanity checks and restarts core services
- ./rebuild_full_platform.sh — rebuild images and containers
- ./deploy-bookai-studio.sh — deploy the platform components
- ./30_n8n_install.sh — n8n base installation
- ./40_nginx_sites.sh — Nginx sites configuration
- ./45_certbot_certs.sh — Issue/renew certificates

For the hardened n8n sandbox managed by the app, use the UI (Agents > n8n) or call the API endpoints directly as documented in docs/n8n-sandbox-and-reviewer.md.

Systemd whitelist refresh timer and scripts are installed remotely on the VPS by the platform when you enable the timer option.

## Logging
Server-side modules may use console.log for operational output. You can:
- Switch to a structured logger (e.g., pino/winston) and wire levels per env.
- Or disable the no-console rule in server directories if desired.
- Tests now silence the AI Learning Engine init log under NODE_ENV=test to allow Jest to exit 0.
Usage:
```bash
chmod +x install_master_plus.sh rebuild_full_platform.sh
./rebuild_full_platform.sh --force
```

Flags (rebuild):
--force (rerun all) | --only prep,platform | --skip mailcow,mautic | --with-backup (enable placeholder restore).

Markers stored in `/var/lib/bookaistudio/.done_<step>` to keep steps idempotent. Logs: `/var/log/bookaistudio_rebuild.log` and `/var/log/bookaistudio_reinstall.log`.

Systemd service `ai-platform.service` is created if missing to run the enhanced MCP server.

## Key Environment Variables
Set these in `00.env` or your deployment environment before running installers:

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| JWT_SECRET | HMAC secret for signing access tokens | Yes | (none) |
| JWT_ISSUER | JWT issuer claim enforced by middleware | Yes | ai-automation-platform |
| JWT_AUDIENCE | JWT audience claim enforced | Yes | ai-automation-clients |
| DEV_ENABLE_QUICK_LOGIN | Enables dev-only token mint endpoint POST /auth/dev-quick-login | No (Dev only) | false |
| ADMIN_KMS_KEY | Symmetric key for encrypting stored credentials | Yes | (none) |
| AI_REVIEW_THRESHOLD | Confidence threshold below which outputs auto-escalate to human review | No | 0.4 |
| DATABASE_URL / POSTGRES_URL | PostgreSQL connection string | Yes | (none) |
| REDIS_URL | Redis (optional) for rate limiting / future queues | No | (none) |

## Recently Added Features
| Feature | Description |
|---------|-------------|
| Review Queue (1.6–1.9) | `human_reviews` table, API endpoints `/api/reviews`, MCP tools (`review_list_pending`, status change, batch decisions). |
| Auto-Escalation (1.12) | Low-confidence AI outputs automatically create a pending review row. |
| Confidence Scoring (1.11) | Heuristic scoring updates `ai_outputs.confidence` immediately after capture. |
| Audit Logging (1.13) | `audit_logs` table + logger capturing review submissions, decisions, auto escalations. |
| JWT Hardening (1.14) | Issuer/audience validation, clock skew tolerance, rotation-ready `kid` header support. |
| Request Metrics (1.15) | Prometheus counters & histograms + `/metrics` exposition endpoint (`ai_platform_` prefix). |
| Agent Orchestrator (2.1.0) | Capability + success-rate + freshness + load scoring with failover & metrics. |
| Orchestrator Admin API (2.1.0) | Runtime config adjust + external agent registration endpoints. |
| External Agent Script (2.1.0) | `scripts/register-external-agent.js` helper for HTTP callback agents. |

Re-run `install_master_plus.sh` or `rebuild_full_platform.sh` anytime to ensure migrations (including audit/review tables) and services are up-to-date.

## Metrics & Monitoring
An HTTP `/metrics` endpoint (text/plain; Prometheus format) exposes default process metrics plus custom platform metrics (all prefixed `ai_platform_`).

Custom metrics currently exported:
- `ai_platform_http_requests_total{method,route,status}` – Counter of HTTP requests.
- `ai_platform_http_request_duration_seconds{method,route,status}` – Histogram of request latency.
- `ai_platform_ai_outputs_total{auto_escalated}` – Counter of AI outputs captured (label reflects whether auto-escalated to human review).

Example Prometheus scrape config:
```yaml
scrape_configs:
	- job_name: ai-automation-platform
		metrics_path: /metrics
		static_configs:
			- targets: ['localhost:3000']  # adjust port
		# Optional relabeling to shorten high-card routes if needed
```

Grafana Starter Panels:
- Requests per second: sum(rate(ai_platform_http_requests_total[5m])) by (route)
- Error rate: sum(rate(ai_platform_http_requests_total{status=~"5.."}[5m])) / sum(rate(ai_platform_http_requests_total[5m]))
- p95 latency: histogram_quantile(0.95, sum(rate(ai_platform_http_request_duration_seconds_bucket[5m])) by (le,route))
- AI outputs auto-escalation %: sum(rate(ai_platform_ai_outputs_total{auto_escalated="true"}[5m])) / sum(rate(ai_platform_ai_outputs_total[5m]))

Future (Roadmap 3.5): OpenTelemetry tracing integration to correlate spans with these metrics.

## Enhanced MCP Parity (Phase 2)
The enhanced MCP server (`src/core/enhanced-mcp-server.js`) is being expanded to subsume baseline operational tools for a unified surface.

Batch 1 (Task 2.2 – Completed) added read/list tools:
- `vps_list_servers`, `n8n_list_instances`, `wp_list_sites`, `social_list_accounts`, `affiliate_list_networks`, `system_get_metrics`
- Existing enhanced-only tools: `learning_stats`, `workflow_score`, `agent_list`, `content_generate_article`, review tools (`review_list_pending`, `review_change_status`, `review_list_by_status`, `review_decide_batch`)

Why this upgrade:
- Single connection pool & consistent audit/metrics
- Less client complexity (one tool registry)
- Enables global orchestration decisions (learning engine sees infra state)

New metric: `ai_platform_mcp_tool_invocations_total{tool,server}` increments for each tool call (server label = enhanced or baseline).

## Orchestrator Admin API & External Agents

Runtime endpoints (admin token required via `X-Admin-Token` header = `ADMIN_KMS_KEY`):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/orchestrator/config` | GET | Inspect current orchestrator config & registered agents |
| `/admin/orchestrator/config` | POST | Patch config: `{ strategy, maxAttempts, taskTimeoutMs, scoreWeights, perTaskOverrides }` |
| `/admin/orchestrator/agents` | POST | Register external HTTP agent `{ id, capabilities[], callback_url }` |
| `/admin/orchestrator/route-test` | POST | Manually route an ad-hoc task `{ type, ... }` for diagnostics |

Example adjust weights at runtime:
```bash
curl -X POST http://localhost:8080/admin/orchestrator/config \
	-H "X-Admin-Token: $ADMIN_KMS_KEY" \
	-H 'Content-Type: application/json' \
	-d '{ "scoreWeights": { "capability": 6, "successRate": 3 } }'
```

Register an external agent (receives task JSON via POST):
```bash
node scripts/register-external-agent.js \
	--id research-agent \
	--capabilities content_article,ai_chat \
	--callback https://agent-host.example.com/execute \
	--admin-token $ADMIN_KMS_KEY \
	--api http://localhost:8080
```

Environment-based score weight overrides alternative:
```
AGENT_SCORE_WEIGHTS="capability=5,successRate=3,freshness=2" \
AGENT_ORCHESTRATOR_STRATEGY=scored-capabilities \
AGENT_MAX_ATTEMPTS=4 \
AGENT_TASK_TIMEOUT_MS=20000
```

Per-task overrides (POST body example):
```json
{
	"perTaskOverrides": {
		"ai_chat": { "scoreWeights": { "capability": 8 } },
		"workflow_generate": { "scoreWeights": { "successRate": 5 } }
	}
}
```

Metrics exposed (Prometheus):
- `ai_platform_agent_selections_total{strategy,outcome,agent}`
- `ai_platform_agent_task_duration_seconds_bucket{agent,task_type,outcome}` (histogram)
- `ai_platform_agent_failovers_total{initial_agent,final_agent,task_type}`

Use these to build dashboards for routing efficiency & failover health.

Calling Tools (stdio example):
```
node src/core/enhanced-mcp-server.js | your-mcp-client
```
Then invoke a tool via the client protocol, e.g. list WordPress sites:
```
{
	"method": "tools/call",
	"params": { "name": "wp_list_sites", "arguments": { "user_id": "demo-user" } }
}
```

Batch 2 (Task 2.3 – Completed) added mutation/action & AI tools:
- VPS: create, deploy_stack, get_status, execute_command
- N8N: create_workflow, execute_workflow, sync_workflows
- WordPress: create_site, create_post
- Social: create_post, schedule_post
- Affiliate: search_products, create_campaign
- System: backup_data, deploy_updates
- AI: ai_chat, ai_generate_workflow

All mutation tools emit audit log entries and are counted by `ai_platform_mcp_tool_invocations_total`.

See `docs/enhanced-mcp.md` for architecture, migration plan, and extension guidelines.
