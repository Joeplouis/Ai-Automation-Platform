## MCP Tool Parity Audit (Task 2.1)

Date: 2025-08-12

Purpose: Compare tool surfaces between the baseline `mcp-server` and the `enhanced-mcp-server`, enumerate gaps, rationalize differences, and propose phased alignment (feeds Tasks 2.2 & 2.3).

### 1. Tool Inventories

Baseline Server (`src/core/mcp-server.js`):

Domains & Tools (29 total):
- VPS: `vps_list_servers`, `vps_create_server`, `vps_deploy_stack`, `vps_get_status`, `vps_execute_command`
- N8N: `n8n_list_instances`, `n8n_create_workflow`, `n8n_execute_workflow`, `n8n_sync_workflows`
- WordPress: `wp_list_sites`, `wp_create_site`, `wp_create_post`
- Social (Postiz): `social_list_accounts`, `social_create_post`, `social_schedule_post`
- Affiliate: `affiliate_list_networks`, `affiliate_search_products`, `affiliate_create_campaign`
- System: `system_get_metrics`, `system_backup_data`, `system_deploy_updates`
- AI: `ai_chat`, `ai_generate_workflow`

Enhanced Server (`src/core/enhanced-mcp-server.js`):

Domains & Tools (8 total):
- Learning / Analytics: `learning_stats`, `workflow_score`
- Orchestration / Agents: `agent_list`
- Content: `content_generate_article`
- Human Review: `review_list_pending`, `review_change_status`, `review_list_by_status`, `review_decide_batch`

### 2. Diff Summary

Missing in Enhanced (candidate additions): all 21 baseline domain/infra/AI tools except the review-centric & learning tools (which only exist in enhanced). Conversely, Enhanced offers 8 tools absent in Baseline.

| Category | Baseline Only | Enhanced Only | Overlap |
|----------|---------------|---------------|---------|
| VPS | 5 tools | 0 | 0 |
| N8N | 4 | 0 | 0 |
| WordPress | 3 | 0 | 0 |
| Social | 3 | 0 | 0 |
| Affiliate | 3 | 0 | 0 |
| System | 3 | 0 | 0 |
| AI General | 2 | 0 | 0 |
| Learning / Review | 0 | 8 | 0 |

### 3. Rationale for Divergence
The baseline server functions as a comprehensive infrastructure & content operations surface. The enhanced server pivots toward higher-level orchestration, human-in-the-loop review flows, and AI learning. Consolidating surfaces reduces client complexity and enables unified auth, auditing, and rate limiting.

### 4. Risks of Current Split
- Fragmented telemetry & metrics.
- Duplicated connection pools & resource usage if both run.
- Inconsistent audit logging (enhanced logs review actions; baseline may not capture all advanced events yet).
- Increased client complexity (must negotiate which server hosts which tool).

### 5. Consolidation Strategy (Phased)

Batch 1 (Task 2.2 – Infrastructure & Listing Tools)
Scope: Read/list & passive introspection to give orchestrator situational awareness.
Tools to port/register into enhanced:
- `vps_list_servers`
- `n8n_list_instances`
- `wp_list_sites`
- `social_list_accounts`
- `affiliate_list_networks`
- `system_get_metrics`
- (Optional) `ai_chat` (read-only style interaction) — may postpone to Batch 2 if dependencies heavy.

Batch 2 (Task 2.3 – Action & Mutation Tools)
Scope: Create, mutate, deploy, execute flows.
- VPS create/deploy/status/execute: `vps_create_server`, `vps_deploy_stack`, `vps_get_status`, `vps_execute_command`
- N8N: `n8n_create_workflow`, `n8n_execute_workflow`, `n8n_sync_workflows`
- WordPress: `wp_create_site`, `wp_create_post`
- Social: `social_create_post`, `social_schedule_post`
- Affiliate: `affiliate_search_products`, `affiliate_create_campaign`
- System: `system_backup_data`, `system_deploy_updates`
- AI: `ai_generate_workflow`

### 6. Implementation Notes
1. Shared Managers: Enhanced server already initializes managers for domains; minimal effort to expose additional handlers.
2. Auth / Authorization: Introduce pre-handler guard for action tools (Phase 3 RBAC will refine).
3. Metrics: Add counter `ai_platform_mcp_tool_invocations_total{tool,server}` (server=baseline|enhanced) when porting (ties into Observability roadmap 3.5 later for tracing).
4. Audit Logging: Wrap mutating tools to emit audit events (entity, action, metadata snapshot) aligning with Task 1.13 patterns.
5. Deprecation Plan: After parity & soak period, optionally retire baseline server or reduce to thin compatibility shim.

### 7. Success Criteria for Tasks 2.2 / 2.3
- 2.2: All Batch 1 tools callable from enhanced; list endpoint enumerates them; tests for each return shape (HTTP 200) and include at least one negative case.
- 2.3: All mutation tools ported; audit & metrics instrumentation present; baseline server functionally redundant for those operations.

### 8. Open Questions
- Should `ai_chat` remain baseline for isolation of provider credentials? (Decision pending security review.)
- Do we expose versioned tool names (e.g., `v1_vps_list_servers`) for forward compatibility? (Currently defer; add alias mapping later if schema evolves.)

### 9. Next Actions
1. Implement Batch 1 handlers in `enhanced-mcp-server.js` (Task 2.2) reusing existing baseline logic patterns.
2. Add metrics counter & basic Jest tests referencing enhanced server for new tools.
3. Prepare migration note for potential baseline deprecation after Batch 2.

---
Generated for roadmap Task 2.1.
