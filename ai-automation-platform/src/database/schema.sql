-- AI Automation Platform Database Schema

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Provider keys table (encrypted API keys)
CREATE TABLE IF NOT EXISTS provider_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    enc_key TEXT NOT NULL,
    enc_iv VARCHAR(255) NOT NULL,
    enc_tag VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat logs table
CREATE TABLE IF NOT EXISTS chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip INET,
    key_uuid UUID REFERENCES provider_keys(id),
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(255) NOT NULL,
    ok BOOLEAN NOT NULL,
    latency_ms INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    config JSONB,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id),
    status VARCHAR(50) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Revenue tracking table
CREATE TABLE IF NOT EXISTS revenue_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(100) NOT NULL, -- 'affiliate', 'course', 'video', 'book'
    product_name VARCHAR(255) NOT NULL,
    niche VARCHAR(100),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    workflow_id UUID REFERENCES workflows(id),
    metadata JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost tracking table
CREATE TABLE IF NOT EXISTS cost_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL, -- 'api', 'hosting', 'tools', 'marketing'
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    workflow_id UUID REFERENCES workflows(id),
    metadata JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15, 6) NOT NULL,
    unit VARCHAR(50),
    metadata JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_logs_provider ON chat_logs(provider);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON workflow_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_records_source ON revenue_records(source);
CREATE INDEX IF NOT EXISTS idx_revenue_records_recorded_at ON revenue_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_cost_records_category ON cost_records(category);
CREATE INDEX IF NOT EXISTS idx_cost_records_recorded_at ON cost_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON system_metrics(metric_name, recorded_at);

-- Insert default admin user (password: admin123)
-- Note: In production, change this password immediately
INSERT INTO admin_users (email, password_hash, role) 
VALUES ('admin@bookaistudio.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Insert demo revenue data
INSERT INTO revenue_records (source, product_name, niche, amount) VALUES
('affiliate', 'AI Course Bundle', 'AI/ML', 299.99),
('video', 'YouTube Revenue - AI Tutorial', 'Education', 45.67),
('course', 'Advanced Automation Masterclass', 'Automation', 199.00),
('book', 'AI for Business Ebook', 'Business', 29.99)
ON CONFLICT DO NOTHING;

-- Insert demo cost data
INSERT INTO cost_records (category, description, amount) VALUES
('api', 'OpenAI API Usage', 25.50),
('hosting', 'VPS Monthly Cost', 49.99),
('tools', 'N8N Cloud Subscription', 19.99),
('marketing', 'Social Media Ads', 150.00)
ON CONFLICT DO NOTHING;
