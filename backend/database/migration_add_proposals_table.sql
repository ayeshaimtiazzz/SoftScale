-- Migration: Add proposals table for Proposal-Deal Integration
-- Run this script to create the proposals table and link it to deals

CREATE TABLE IF NOT EXISTS proposals (
    proposal_id SERIAL PRIMARY KEY,
    deal_id INTEGER REFERENCES deals(deal_id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES company(company_id) ON DELETE SET NULL,

    -- Proposal Information
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,

    -- Proposal Metadata
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, accepted, rejected, archived

    -- Related Entities
    talent_id VARCHAR(100), -- Can reference freelancer_id or candidate_id
    talent_name VARCHAR(255),

    -- Related Job/Project (if generated from match)
    related_job_id INTEGER REFERENCES job(job_id) ON DELETE SET NULL,
    related_project_id INTEGER REFERENCES projects(project_id) ON DELETE SET NULL,

    -- Proposal Generation Context
    match_score DECIMAL(5, 2), -- If generated from talent match
    template_id INTEGER, -- Reference to proposal template used
    tone VARCHAR(50) DEFAULT 'Professional', -- Professional, Casual, Persuasive, Formal

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,

    -- Additional Metadata
    metadata JSONB -- Store additional context like page_count, detail_level, etc.
);

-- Proposal versions table for versioning
CREATE TABLE IF NOT EXISTS proposal_versions (
    version_id SERIAL PRIMARY KEY,
    proposal_id INTEGER REFERENCES proposals(proposal_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    change_notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_proposals_deal_id ON proposals(deal_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_company_id ON proposals(company_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_talent_id ON proposals(talent_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at);
CREATE INDEX IF NOT EXISTS idx_proposal_versions_proposal_id ON proposal_versions(proposal_id);

-- Add proposal_id column to deals table for quick reference to latest proposal
ALTER TABLE deals ADD COLUMN IF NOT EXISTS latest_proposal_id INTEGER REFERENCES proposals(proposal_id) ON DELETE SET NULL;

-- Create index for latest_proposal_id
CREATE INDEX IF NOT EXISTS idx_deals_latest_proposal_id ON deals(latest_proposal_id);

