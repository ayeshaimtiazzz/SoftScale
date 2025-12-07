-- Migration: Add deals table for CRM/Deal Management
-- Run this script to create the deals table

CREATE TABLE IF NOT EXISTS deals (
    deal_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES company(company_id) ON DELETE SET NULL,

    -- Deal Information
    deal_title VARCHAR(255) NOT NULL,
    talent_name VARCHAR(255),
    talent_id VARCHAR(100), -- Can reference freelancer_id or candidate_id
    company_name VARCHAR(255),

    -- Deal Status
    stage VARCHAR(50) DEFAULT 'Prospecting', -- Prospecting, Contacted, Proposal Sent, Negotiation, Closed Won, Closed Lost
    status VARCHAR(50) DEFAULT 'active', -- active, pending, closed

    -- Deal Value
    value DECIMAL(12, 2),
    probability INTEGER, -- 0-100

    -- Dates
    expected_close_date DATE,
    closed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Additional Information
    description TEXT,
    tags TEXT[], -- Array of tags
    lead_source VARCHAR(100), -- talent_match, lead_discovery, manual, etc.

    -- Talent Match Data (if created from talent match)
    match_score DECIMAL(5, 2),
    skills TEXT,
    experience TEXT,
    location VARCHAR(255),
    work_model VARCHAR(50),

    -- Related Entities
    related_job_id INTEGER REFERENCES job(job_id) ON DELETE SET NULL,
    related_project_id INTEGER REFERENCES projects(project_id) ON DELETE SET NULL,

    -- AI Insights (for future use)
    ai_insights JSONB,
    deal_health_score INTEGER, -- 0-100
    recommended_actions TEXT[]
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_talent_id ON deals(talent_id);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at);
