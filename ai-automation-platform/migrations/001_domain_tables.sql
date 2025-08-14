-- Domain layer tables (Task 1.5)
-- n8n instances
CREATE TABLE IF NOT EXISTS n8n_instances (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text not null,
  status text not null default 'unknown',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_n8n_instances_status ON n8n_instances(status);

-- WordPress sites
CREATE TABLE IF NOT EXISTS wp_sites (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  url text not null,
  status text not null default 'provisioning',
  admin_user text,
  admin_pass_enc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_wp_sites_domain ON wp_sites(domain);

-- Social accounts (Postiz)
CREATE TABLE IF NOT EXISTS social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  username text not null,
  display_name text,
  access_token_enc jsonb,
  refresh_token_enc jsonb,
  status text not null default 'inactive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);

-- Affiliate networks
CREATE TABLE IF NOT EXISTS affiliate_networks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_key_enc jsonb,
  base_url text,
  status text not null default 'inactive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_affiliate_networks_name ON affiliate_networks(name);

-- AI outputs captured from agents / content generation
CREATE TABLE IF NOT EXISTS ai_outputs (
  id bigserial primary key,
  prompt text not null,
  model text,
  output jsonb,
  confidence numeric,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_created_at ON ai_outputs(created_at);

-- Human review queue
CREATE TABLE IF NOT EXISTS human_reviews (
  id bigserial primary key,
  ai_output_id bigint not null references ai_outputs(id) on delete cascade,
  status text not null default 'pending',
  reviewer_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_human_reviews_status ON human_reviews(status);
CREATE INDEX IF NOT EXISTS idx_human_reviews_ai_output ON human_reviews(ai_output_id);

-- Trigger to auto-update updated_at where present
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_wp_sites_updated BEFORE UPDATE ON wp_sites FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_n8n_instances_updated BEFORE UPDATE ON n8n_instances FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_social_accounts_updated BEFORE UPDATE ON social_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_affiliate_networks_updated BEFORE UPDATE ON affiliate_networks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
