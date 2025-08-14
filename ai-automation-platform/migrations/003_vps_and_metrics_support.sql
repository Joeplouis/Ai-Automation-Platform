-- Additional domain tables required for tests (VPS, monitoring, tasks, social, affiliate)
-- Focus: Provide minimal schema to satisfy queries in managers and metrics collector.

-- VPS servers
CREATE TABLE IF NOT EXISTS vps_servers (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  provider text,
  server_id text,
  ip_address text,
  hostname text,
  region text,
  size text,
  os text,
  status text not null default 'unknown',
  monitoring_enabled boolean not null default false,
  connection_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_vps_servers_status ON vps_servers(status);
CREATE INDEX IF NOT EXISTS idx_vps_servers_user ON vps_servers(user_id);

-- VPS monitoring data
CREATE TABLE IF NOT EXISTS vps_monitoring (
  id bigserial primary key,
  server_id uuid references vps_servers(id) on delete cascade,
  cpu_usage numeric,
  memory_usage numeric,
  disk_usage numeric,
  network_in numeric,
  network_out numeric,
  uptime numeric,
  load_average numeric,
  recorded_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_vps_monitoring_server ON vps_monitoring(server_id, recorded_at DESC);

-- Task system (minimal for metrics queries)
CREATE TABLE IF NOT EXISTS tasks (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  name text,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS task_executions (
  id bigserial primary key,
  task_id uuid not null,
  status text not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  result jsonb,
  logs text,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_task_executions_task ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions(status);

-- Social posts (subset required by metrics)
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  content text,
  platforms text[] not null default '{}',
  status text not null default 'draft',
  engagement_data jsonb,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);

-- Affiliate products & campaigns (minimal join structure for metrics)
CREATE TABLE IF NOT EXISTS affiliate_products (
  id uuid primary key default gen_random_uuid(),
  network_id uuid,
  name text,
  category text,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS affiliate_campaigns (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references affiliate_products(id) on delete set null,
  status text not null default 'draft',
  clicks int default 0,
  conversions int default 0,
  revenue numeric(10,2) default 0,
  spent numeric(10,2) default 0,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_campaigns_status ON affiliate_campaigns(status);

-- (affiliate_networks already created in earlier migration; avoid duplicate definition here)
