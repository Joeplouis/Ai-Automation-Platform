-- Baseline schema (Phase 0)
CREATE TABLE IF NOT EXISTS schema_migrations (
  id serial primary key,
  filename text not null unique,
  applied_at timestamptz not null default now()
);

-- Example tables referenced by server (chat_logs, provider_keys, admin_users)
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS provider_keys (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  name text not null,
  enc_key text not null,
  enc_iv text not null,
  enc_tag text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS chat_logs (
  id bigserial primary key,
  ip text,
  key_uuid uuid,
  provider text,
  model text,
  ok boolean,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  error text,
  created_at timestamptz not null default now()
);
