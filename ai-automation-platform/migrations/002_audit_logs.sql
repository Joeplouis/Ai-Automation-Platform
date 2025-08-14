-- Audit Logs (Task 1.13)
-- Records immutable events: actor (user/service), action, entity_type, entity_id, metadata json, created_at.

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial primary key,
  actor_id text,
  actor_type text default 'user',
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
