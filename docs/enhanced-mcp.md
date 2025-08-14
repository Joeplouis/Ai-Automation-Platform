# Enhanced MCP Server Deep Dive

Date: 2025-08-12  
Related Roadmap Tasks: 0.10, 1.10–1.15, 2.1, 2.2, (upcoming 2.3, 2.4–2.6, 3.5)

## 1. Purpose
Unify infrastructure, human review, AI orchestration, and learning capabilities behind a single Model Context Protocol (MCP) surface so agents & external clients consume a consistent, observable, auditable interface.

## 2. High-Level Architecture
```
+-------------------+        +------------------+
|  External MCP     |<STDIO>| Enhanced MCP     |
|  Client / Agent   |        | Server (Node.js) |
+-------------------+        +---------+--------+
                                         |
     +--------------- Shared Resource Layer ---------------+
     |  PostgreSQL  |  Redis (opt)  |  Metrics (/metrics)  |
     +------+-------+------+--------+-----------+----------+
            |              |                    |
     +------+----+   +-----+----+        +------+---------+
     | Managers  |   | Human    |        | Observability  |
     | (VPS,N8N, |   | Review   |        | prom-client    |
     | WP,Social,|   | Queue     |        | counters / hist|
     | Affiliate)|   +----------+        +----------------+
            |               \
            |                +--+------------------+
     +------+----+              |  AI Layer        |
     | Output   |<-- scoring -->|  (Orchestrator,  |
     | Capture  | -- audit ---->|  Learning,       |
     +-----------+              |  Content Gen)    |
                                +------------------+
```

## 3. Key Components
| Component | File | Responsibility |
|-----------|------|---------------|
| Enhanced Server Core | `src/core/enhanced-mcp-server.js` | Registers tools, initializes managers, routes tool calls. |
| Domain Managers | `src/modules/*/manager.js` | CRUD + domain logic (VPS, N8N, WordPress, Social, Affiliate). |
| Review Queue Manager | `src/modules/reviews/manager.js` | Human-in-the-loop state machine. |
| Output Capture | `src/ai/output-capture.js` | Wraps AI calls → persist output, score, auto-escalate, metrics. |
| Confidence Scorer | `src/ai/confidence-scorer.js` | Heuristic scoring (placeholder; upgrade in later tasks). |
| Audit Logger | `src/core/audit.js` | Structured audit events. |
| Metrics Module | `src/observability/metrics.js` | Prometheus counters/histograms & MCP tool invocation counter. |
| Learning Engine (stub) | `src/ai/learning-engine.js` | Placeholder for feedback loop & analytics. |

## 4. Tool Surface Status
See `docs/mcp-tool-parity.md` for diff details.

Current (after Batch 1):
- Read / List Tools: infra inventories, review listings, learning stats, workflow scoring.
- Mutation / Action Tools: deferred to Batch 2 (Task 2.3) to avoid partial write-path parity.

Upcoming (Batch 2) will port create/deploy/execute tools and AI generation (`ai_chat`, `ai_generate_workflow`).

## 5. Metrics Integration
Added custom counters:
- `ai_platform_mcp_tool_invocations_total{tool,server}` – increments before handler dispatch (server label = 'enhanced' now; baseline preserved for comparison if still running).
- `ai_platform_ai_outputs_total{auto_escalated}` – incremented by output capture wrapper.
- HTTP metrics exposed separately via API server `/metrics` (same Prometheus registry).

Design Considerations:
- Low cardinality labels to avoid Prometheus churn.
- Route-level HTTP metrics kept; tool-level uses tool name directly (bounded set).

## 6. Audit & Compliance
Mutating tools (post Batch 2) will emit audit events via `createAuditLogger` with schema:
```
{ timestamp, actor, action, entity, entity_id, metadata }
```
Shift-left: list/read tools are not audited (can be added later under Compliance task 3.9 for PII reads).

## 7. Security Considerations
| Aspect | Current | Planned Enhancement |
|--------|---------|--------------------|
| Auth | (Baseline MCP auth approach TBD) | JWT middleware & RBAC (Task 3.6) fronting STDIO/transport wrappers. |
| Secrets | Encrypted fields (crypto utils) | Secret rotation (Task 3.8). |
| Least Privilege | Unified server reduces duplicate pools | Introduce per-tool authorization matrix w/ roles. |
| Abuse / Rate | None yet | Rate limiting (Task 3.7) + per-tool quotas. |

## 8. Adding a New Tool (Pattern)
1. Define deterministic, minimal input schema (no untyped blobs where avoidable).
2. Validate arguments early; throw `McpError(ErrorCode.InvalidRequest, message)` on user mistakes.
3. Wrap long-running or AI calls with output capture if producing LLM content.
4. Increment metrics (automatic if added to CallTool handler). For custom metrics, extend `metrics.js`.
5. Emit audit log if mutating state.
6. Add a test: success path + one invalid argument case.

Template Snippet:
```js
// In ListToolsRequest handler array
{
  name: 'example_do_thing',
  description: 'Performs X transformation',
  inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }
}

// In CallTool switch
case 'example_do_thing': {
  const { id } = args;
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new McpError(ErrorCode.InvalidRequest, 'Invalid id');
  const result = await this.managers.example.doThing(id);
  return { content: [{ type: 'text', text: JSON.stringify({ result }, null, 2) }] };
}
```

## 9. Migration Path & Deprecation Strategy
1. Batch 2 completes parity for mutating tools.
2. Provide 2-release overlap where baseline server still ships but logs a deprecation warning on start.
3. Introduce environment flag `DISABLE_BASELINE_MCP=1` to harden migration once stable.
4. Remove baseline after verifying telemetry: no baseline-only tool invocations over trailing 14 days.

## 10. Testing Strategy
| Layer | Example Test | Purpose |
|-------|--------------|---------|
| Unit | scoring heuristic boundaries | Deterministic correctness |
| Integration | tool call → manager returns list | Schema regressions |
| Observability | metrics counter increments (optional) | Guard instrumentation |
| Workflow | output capture auto-escalation | Confidence threshold paths |

Suggested Future Additions:
- Snapshot tests for tool list to detect accidental breaking changes.
- Contract tests: JSON schema validation against example payloads.

## 11. Performance & Scaling Notes
- Single PG pool reused across all tools (avoid pool per manager).
- Potential bottlenecks: SSH-based VPS commands (serialize or queue), large AI outputs (consider streaming & chunk persistence).
- After tracing (Task 3.5) introduce span-level latency budgets per category.

## 12. Roadmap Linkage
- 2.3: Adds mutation tools + AI generation.
- 2.4–2.6: Orchestrator & analyzer become smart; will reuse same tool surface for introspection.
- 3.5: Tracing will correlate tool invocation IDs with HTTP/API requests and AI outputs.

## 13. Open Questions / TODOs
- Unified auth handshake for STDIO transport? (Possibly wrap STDIO behind authenticated sidecar.)
- Should we namespace tool names (e.g. `infra.vps.list`)? (Deferred for now; current flat names kept for backward compatibility.)
- Introduce version negotiation for future schema changes? (Add subtle `x_version` field later.)

## 14. Quick Start
Run enhanced server locally:
```bash
node src/core/enhanced-mcp-server.js
```
List tools (example pseudo-request over MCP transport):
```json
{ "method": "tools/list", "params": {} }
```
Call listing tool:
```json
{ "method": "tools/call", "params": { "name": "vps_list_servers", "arguments": { "user_id": "demo" } } }
```

## 15. Change Log (Doc)
- 2025-08-12: Initial deep dive created (post Batch 1 parity) – includes metrics & migration strategy.

---
End of document.
