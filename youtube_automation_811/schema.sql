-- AI Gateway Database Schema
-- This file contains all table definitions for the AI Gateway system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT,
  provider TEXT,           -- e.g., 'openai', 'anthropic', 'azure', 'ollama'
  model TEXT,              -- e.g., 'gpt-4o', 'claude-3-5-sonnet', 'llama3:8b'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_session(id),
  role TEXT CHECK (role IN ('user','assistant','tool','system')),
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge base nodes
CREATE TABLE IF NOT EXISTS kb_node (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE,
  spec JSONB,
  doc_md TEXT
);

-- Knowledge base workflows
CREATE TABLE IF NOT EXISTS kb_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  engine TEXT CHECK (engine IN ('n8n','custom')),
  graph JSONB,
  notes TEXT
);

-- Embeddings for semantic search
CREATE TABLE IF NOT EXISTS embedding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT CHECK (owner_type IN ('node','workflow','snippet')),
  owner_id UUID,
  text TEXT,
  vec vector(1536)  -- Requires pgvector extension
);

-- Provider keys (encrypted)
CREATE TABLE IF NOT EXISTS provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  enc_key TEXT NOT NULL,    -- Encrypted API key
  enc_iv TEXT NOT NULL,     -- Initialization vector
  enc_tag TEXT NOT NULL,    -- Authentication tag
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin keys (legacy table name)
CREATE TABLE IF NOT EXISTS admin_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  secret_enc TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat logs for monitoring and analytics
CREATE TABLE IF NOT EXISTS chat_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip TEXT,
  key_uuid UUID,
  provider TEXT,
  model TEXT,
  ok BOOLEAN NOT NULL DEFAULT false,
  latency_ms INT,
  input_tokens INT,
  output_tokens INT,
  total_tokens INT,
  error TEXT
);

-- Rate limiting configuration
CREATE TABLE IF NOT EXISTS rate_limits (
  scope TEXT PRIMARY KEY,           -- 'global', 'ip:1.2.3.4', 'key:<uuid>', 'byok'
  max_per_min INT,
  max_per_day INT
);

-- Usage counters for rate limiting
CREATE TABLE IF NOT EXISTS chat_usage_counters (
  scope TEXT NOT NULL,
  day TEXT NOT NULL,      -- 'YYYY-MM-DD' or '' (special row aggregates day only)
  minute TEXT NOT NULL,   -- 'YYYY-MM-DD HH24:MI' or '' (for day totals)
  count_min INT NOT NULL DEFAULT 0,
  count_day INT NOT NULL DEFAULT 0,
  PRIMARY KEY(scope, day, minute)
);

-- Seed default rate limits
INSERT INTO rate_limits(scope, max_per_min, max_per_day)
SELECT 'global', 60, 5000
WHERE NOT EXISTS (SELECT 1 FROM rate_limits WHERE scope='global');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_logs_provider ON chat_logs(provider);
CREATE INDEX IF NOT EXISTS idx_chat_logs_ok ON chat_logs(ok);
CREATE INDEX IF NOT EXISTS idx_message_session_id ON message(session_id);
CREATE INDEX IF NOT EXISTS idx_embedding_owner ON embedding(owner_type, owner_id);

