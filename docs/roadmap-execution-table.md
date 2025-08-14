## AI Automation Platform – Execution Roadmap & Tracking Table

Purpose: Master checklist to drive implementation from current scaffold to enterprise-grade, human-in-the-loop platform. Update Status, Date Done, and Notes as tasks complete. One row = one atomic deliverable with clear exit criteria.

Legend:
- Priority: P0 (blocker / must now), P1 (near-term), P2 (important later), P3 (nice-to-have)
- Effort: S (≤0.5d), M (1–2d), L (3–5d), XL (>1wk)
- Status: TODO | WIP | BLOCKED | REVIEW | DONE

### Phase 0 – Immediate Stability & Foundation
| ID | Category | Task / Component | Description / Exit Criteria | Dependencies | Priority | Effort | Owner | Status | Date Done | Next Action (if not DONE) | Notes |
|----|----------|------------------|------------------------------|--------------|----------|--------|-------|--------|-----------|---------------------------|-------|
| 0.1 | Baseline | Inventory Freeze | Snapshot repo & tag (v0.1-internal). Exit: git tag exists & pushed. | None | P0 | S |  | TODO |  | Tag + push | Added composite reinstall script install_master_plus.sh for disaster recovery |  |
| 0.2 | Baseline | Lint/Format Setup | Add ESLint + Prettier config; CI fails on lint errors. | 0.1 | P0 | M |  | DONE | 2025-08-12 |  | Existing in package.json; CI pending |  |
| 0.3 | Security | Central .env Schema | Define required env vars doc + validation (e.g. zod on startup). Exit: startup fails with invalid config. | 0.1 | P0 | S |  | DONE | 2025-08-12 |  | Basic loader added |  |
| 0.4 | Crypto | Verify `core/crypto.js` | Unit tests for encrypt/decrypt (roundtrip, tamper detect). | 0.2 | P0 | S |  | DONE | 2025-08-12 |  | Roundtrip test added |  |
| 0.5 | Human Loop | Define Review States | Enum: pending, approved, rejected, escalated. Exit: spec doc + constants file. | 0.1 | P0 | S |  | DONE | 2025-08-12 |  | constants file added |  |
| 0.6 | DB | Migration Framework | Choose migration tool (Prisma / Knex / Sequelize / node-pg-migrate). Exit: migration runs locally & CI. | 0.1 | P0 | M |  | DONE | 2025-08-12 |  | Custom SQL migrator added |  |
| 0.7 | Testing | Test Harness | Add Jest/Vitest + coverage threshold (≥60% start). Sample test passes CI. | 0.2 | P0 | M |  | DONE | 2025-08-12 |  | Jest tests added |  |
| 0.8 | Observability | Structured Logger | Introduce pino/winston wrapper with request IDs. Exit: all servers use it. | 0.2 | P0 | M |  | DONE | 2025-08-12 |  | logger integrated in core server |  |
| 0.9 | Infra | Health Endpoints | /healthz & /readyz implement dependency checks. | 0.6 | P0 | S |  | DONE | 2025-08-12 |  | readiness added |  |
| 0.10 | MCP | Enhanced MCP Boot Test | Script starts enhanced MCP without crash; responds to tool list. | 0.7 | P0 | S |  | DONE | 2025-08-12 |  | test added |  |

### Phase 1 – Domain Layer & Human-in-the-Loop Pipeline
| ID | Category | Task / Component | Description / Exit Criteria | Dependencies | Priority | Effort | Owner | Status | Date Done | Next Action | Notes |
|----|----------|------------------|------------------------------|--------------|----------|--------|-------|--------|-----------|------------|-------|
| 1.1 | Domain Managers | Refactor n8n Manager | Replace duplicated VPS logic with real CRUD + status fetch; tests cover list/create. | 0.6,0.7 | P0 | M |  | DONE | 2025-08-12 |  | CRUD + tests added |  |
| 1.2 | Domain Managers | Refactor WordPress Manager | Real site provisioning fields (url, auth, status). | 1.1 | P0 | M |  | DONE | 2025-08-12 |  | CRUD + encryption + tests |  |
| 1.3 | Domain Managers | Refactor Postiz Manager | Manage social accounts with tokens (encrypted). | 0.4,1.1 | P0 | M |  | DONE | 2025-08-12 |  | CRUD + token rotation + encryption + tests |  |
| 1.4 | Domain Managers | Refactor Affiliate Manager | Manage offer sources; track networks. | 1.2 | P1 | M |  | DONE | 2025-08-12 |  | CRUD + key rotation + encryption + tests |  |
| 1.5 | DB | Migrations: Domain Tables | Tables: n8n_instances, wp_sites, social_accounts, affiliate_networks, human_reviews, ai_outputs. | 0.6 | P0 | L |  | DONE | 2025-08-12 |  | Added 001_domain_tables.sql |  |
| 1.6 | Human Loop | Review Queue Model | Table + status transitions; index on status+created_at. | 1.5 | P0 | S |  | DONE | 2025-08-12 |  | Manager + transitions + MCP tools |  |
| 1.7 | Human Loop | Submission API | POST /reviews (ai_output_id) => pending row. | 1.6 | P0 | M |  | DONE | 2025-08-12 |  | /api/reviews POST implemented |  |
| 1.8 | Human Loop | Approve/Reject API | PATCH /reviews/:id {status} audit logged. | 1.7 | P0 | S |  | DONE | 2025-08-12 |  | approve/reject/escalate added |  |
| 1.9 | Human Loop | MCP Tools for Review | Tools: review_list, review_decide. | 1.7 | P1 | M |  | DONE | 2025-08-12 |  | MCP review tools added (list/status/batch) |  |
| 1.10 | AI Output | Output Capture Wrapper | Wrap AI calls to persist prompt, model, output, score placeholder. | 1.5 | P0 | M |  | DONE | 2025-08-12 |  | Module + MCP integration + test |  |
| 1.11 | AI Output | Confidence Scoring Stub | Basic heuristic (length, model) produce 0–1; store. | 1.10 | P1 | S |  | DONE | 2025-08-12 |  | Heuristic scorer + integration + tests |  |
| 1.12 | AI Output | Auto-Escalation | If confidence < threshold create pending review automatically. | 1.11 | P1 | S |  | DONE | 2025-08-12 |  | Implemented in output-capture (env AI_REVIEW_THRESHOLD) |  |
| 1.13 | Audit | Audit Log Table & API | Table audit_logs (actor, action, entity, metadata JSON). | 1.5 | P0 | M |  | DONE | 2025-08-12 |  | Migration 002 + audit logger + integration |  |
| 1.14 | Security | JWT Middleware Hardening | Exp + audience + issuer validation; rotation ready. | 0.3 | P1 | S |  | DONE | 2025-08-12 |  | Issuer/audience checks, kid support, role guard |  |
| 1.15 | Observability | Request Metrics | Prom counters/histograms; /metrics endpoint. | 0.8 | P1 | M |  | DONE | 2025-08-12 |  | prom-client added; http + AI output counters + histogram; /metrics route |

### Phase 2 – AI Orchestration & Enhanced MCP Parity
| ID | Category | Task / Component | Description / Exit Criteria | Dependencies | Priority | Effort | Owner | Status | Date Done | Next Action | Notes |
|----|----------|------------------|------------------------------|--------------|----------|--------|-------|--------|-----------|------------|-------|
| 2.1 | MCP | Tool Parity Audit | List diff between base MCP and enhanced; doc plan. | 1.x | P1 | S |  | DONE | 2025-08-12 |  | Diff doc added (mcp-tool-parity.md) & batch plan |
| 2.2 | MCP | Implement Missing Tools Batch 1 | Infrastructure & listing tools. | 2.1 | P1 | M |  | DONE | 2025-08-12 |  | Added list tools (vps/n8n/wp/social/affiliate/system metrics) + metrics counter |
| 2.3 | MCP | Implement Missing Tools Batch 2 | Content / generation / workflow mgmt. | 2.2 | P1 | M |  | DONE | 2025-08-12 |  | Added mutation tools + ai_chat + ai_generate_workflow + audit & metrics |
| 2.4 | AI Orchestration | Agent Orchestrator Implementation | Replace stub: strategy selection, fallback chain. | 1.10 | P1 | L |  | TODO |  | Implement w/ tests |  |
| 2.5 | AI Orchestration | Workflow Analyzer Real | Pattern mining using learning engine metrics. | 2.4 | P1 | M |  | TODO |  | Implement compute |  |
| 2.6 | AI Orchestration | Content Generator Real | Templates + model selection + streaming. | 2.4 | P1 | M |  | TODO |  | Implement pipeline |  |
| 2.7 | AI Orchestration | Agent Registry Persistence | Table agent_profiles; dynamic load. | 1.5 | P1 | M |  | TODO |  | Migration + CRUD |  |
| 2.8 | Human Loop | Feedback Ingestion | Approved/rejected feeds back into learning stats. | 1.8,2.5 | P1 | S |  | TODO |  | Update learning engine |  |
| 2.9 | AI Quality | Evaluation Harness | Offline eval dataset + scoring script. | 2.6 | P2 | L |  | TODO |  | Build harness |  |

### Phase 3 – Resilience, Scaling, Security Hardening
| ID | Category | Task / Component | Description / Exit Criteria | Dependencies | Priority | Effort | Owner | Status | Date Done | Next Action | Notes |
|----|----------|------------------|------------------------------|--------------|----------|--------|-------|--------|-----------|------------|-------|
| 3.1 | Resilience | Message Queue Integration | Introduce Redis Streams / RabbitMQ; enqueue AI jobs. | 1.x | P1 | L |  | TODO |  | Pick tech + service wrapper |  |
| 3.2 | Resilience | Retry & DLQ | Exponential retry + dead-letter queue for failures. | 3.1 | P1 | M |  | TODO |  | Implement policies |  |
| 3.3 | Resilience | Circuit Breakers | Use opossum or custom wrapper around external APIs. | 3.1 | P2 | M |  | TODO |  | Add wrapper & tests |  |
| 3.4 | Performance | Caching Layer | In-memory/Redis for frequent reads (provider lists). | 0.8 | P2 | M |  | TODO |  | Add cache module |  |
| 3.5 | Observability | Distributed Tracing | OpenTelemetry instrumentation + exporter. | 0.8 | P2 | L |  | TODO |  | Instrument key paths |  |
| 3.6 | Security | RBAC | Roles table + middleware checks; tests. | 1.5 | P1 | L |  | TODO |  | Implement guard |  |
| 3.7 | Security | Rate Limiting | Token bucket / sliding window per API key/user. | 3.6 | P2 | M |  | TODO |  | Add limiter middleware |  |
| 3.8 | Security | Secret Rotation | Key versioning + re-encryption process doc. | 0.4 | P2 | M |  | TODO |  | Add version field |  |
| 3.9 | Compliance | Audit Log Expansion | Log read events (PII access) with purpose. | 1.13 | P2 | S |  | TODO |  | Extend logger |  |
| 3.10 | Compliance | Data Retention Policy | Configurable purge job; script & doc. | 3.2 | P2 | M |  | TODO |  | Scheduled job |  |
| 3.11 | Backup/DR | Automated Backups | Nightly pg_dump + verify restore script. | 1.5 | P1 | M |  | TODO |  | Add cron / doc |  |
| 3.12 | Availability | Multi-Instance Scaling | Horizontal scaling guidelines + sticky session removal. | 3.1 | P2 | M |  | TODO |  | Document + test |  |
| 3.13 | Availability | Readiness Gates | Fail readiness if queue / db / model provider unreachable. | 3.1 | P1 | S |  | TODO |  | Enhance /readyz |  |

### Phase 4 – Quality, Optimization & Governance
| ID | Category | Task | Description / Exit Criteria | Dependencies | Priority | Effort | Owner | Status | Date Done | Next Action | Notes |
|----|----------|------|----------------------------|--------------|----------|--------|-------|--------|-----------|------------|-------|
| 4.1 | Quality | Coverage ≥80% | Increase automated tests; enforce threshold. | 0.7 | P2 | L |  | TODO |  | Add more tests |  |
| 4.2 | Quality | Load Testing Suite | k6 / artillery baseline scenarios & report. | 3.12 | P2 | M |  | TODO |  | Create scripts |  |
| 4.3 | Optimization | Cost Tracking | Tag AI calls with cost estimate store. | 1.10 | P2 | S |  | TODO |  | Add cost calc |  |
| 4.4 | AI Safety | Content Moderation | Add moderation check pre-publish (OpenAI mod or custom). | 2.6 | P2 | M |  | TODO |  | Integrate filter |  |
| 4.5 | Governance | Model Registry | Configurable allowlist & version tracking. | 2.4 | P2 | M |  | TODO |  | Implement registry |  |
| 4.6 | Developer Exp | Local Dev Bootstrap Script | One command to seed, migrate, run all services. | 1.x | P2 | S |  | TODO |  | Script + README |  |
| 4.7 | Documentation | Architecture Docs v1 | Diagrams (C4), sequence for human loop. | 2.x | P2 | M |  | TODO |  | Create docs |  |
| 4.8 | CI/CD | Pipeline Hardening | Parallel test stages, cache deps, security scanning. | 0.2 | P2 | M |  | TODO |  | Update CI config |  |
| 4.9 | Security | SAST/Dependency Scans | Add CodeQL/Dependabot alerts gating. | 4.8 | P2 | S |  | TODO |  | Enable & badge |  |
| 4.10 | Runbooks | Incident Runbooks | Markdown playbooks: outage, queue stuck, cost spike. | 3.x | P3 | M |  | TODO |  | Create docs |  |
| 4.11 | Performance | Query Optimization Pass | EXPLAIN analyze top 10 queries & optimize. | 3.4 | P3 | M |  | TODO |  | Add indexes |  |
| 4.12 | Analytics | Product Metrics | Track adoption KPIs (approved %, turnaround time). | 1.8,2.8 | P3 | M |  | TODO |  | Event emitter + dashboard |  |

### Phase 5 – Stretch / Future
| ID | Category | Task / Component | Description / Exit Criteria | Dependencies | Priority | Effort | Owner | Status | Date Done | Next Action | Notes |
|----|----------|------------------|------------------------------|--------------|----------|--------|-------|--------|-----------|------------|-------|
| 5.1 | Multi-Region | Active/Active Strategy | Design doc + PoC with read replicas. | 3.12 | P3 | XL |  | TODO |  | Draft design |  |
| 5.2 | Privacy | PII Field Encryption | Field-level encryption for sensitive data. | 0.4 | P3 | L |  | TODO |  | Add encrypt hooks |  |
| 5.3 | AI | RLHF Loop | Capture human approvals to fine-tune scoring model. | 2.8 | P3 | L |  | TODO |  | Create dataset builder |  |
| 5.4 | Marketplace | Plugin System | Dynamic loading of provider / tool plugins. | 2.4 | P3 | XL |  | TODO |  | Design extension API |  |

### Cross-Cutting Task Bundles
| Bundle | Scope | Included Rows | Success Definition |
|--------|-------|---------------|-------------------|
| Foundational Readiness | Minimal stable platform | 0.x + 1.1–1.5 + 1.7–1.10 + 0.10 | System boots reliably; human loop MVP works |
| AI Orchestration Core | AI pipeline maturity | 2.1–2.8 + 1.10–1.12 | Dynamic agent selection & feedback loop |
| Enterprise Resilience | Reliability & security | 3.1–3.13 + 3.6–3.11 | Meets SLOs with failover & auditability |
| Quality & Governance | Ongoing excellence | 4.x + 3.9 + 5.2 | High test coverage, governance enforced |

### Updating Procedure
1. Pick next highest-priority unblocked row.
2. Change Status → WIP; optionally append initials in Owner.
3. On completion, verify exit criteria explicitly, then set Status → DONE, fill Date Done (YYYY-MM-DD), add concise Notes (e.g. PR #, key decisions).
4. If blocked, set Status → BLOCKED, add reason in Notes, list blocking row IDs.
5. Keep table sorted by ID; never delete rows—add new tasks with next decimal increment in same phase if needed.

### Immediate Recommended Starting Sequence
1. 0.1 → 0.2 → 0.6 → 0.7 (baseline tooling & migrations)
2. 0.3 → 0.4 → 0.8 → 0.9 (config, crypto tests, logging, health)
3. 1.5 (domain tables) → 1.1 (n8n manager) → 1.2 (WordPress) → 1.3 (Postiz) → 1.10 (output capture)
4. 1.6–1.8 (human loop endpoints) → 1.13 (audit)
5. 0.10 (enhanced MCP boot test) to lock baseline before parity expansion.

### Notes
- Adjust priorities dynamically if new compliance/security requirements emerge.
- Consider adopting Prisma for speed unless raw SQL control is mandated.
- Each domain manager refactor should include: schema validation, error mapping, logging, tests.
- Keep human review latency metrics from day one (pending age > threshold alerts later).

---
Generated: (initial version) – Update as tasks progress.
