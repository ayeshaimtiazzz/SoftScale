-- Migration: Add deal_notes and notifications tables
-- Run this script to add notes and notifications functionality

-- Deal Notes table
CREATE TABLE IF NOT EXISTS deal_notes (
    note_id SERIAL PRIMARY KEY,
    deal_id INTEGER REFERENCES deals(deal_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    deal_id INTEGER REFERENCES deals(deal_id) ON DELETE SET NULL,
    proposal_id INTEGER REFERENCES proposals(proposal_id) ON DELETE SET NULL,
    job_id INTEGER REFERENCES job(job_id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(project_id) ON DELETE SET NULL,

    -- Notification details
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error, deal_update, proposal_sent, etc.
    is_read BOOLEAN DEFAULT FALSE,

    -- Related entity info
    related_entity_type VARCHAR(50), -- deal, proposal, job, project, etc.
    related_entity_id INTEGER,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Job/Project Prospects table - tracks who selected which jobs/projects
CREATE TABLE IF NOT EXISTS job_prospects (
    prospect_id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES job(job_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    talent_id VARCHAR(100), -- freelancer_id or candidate_id
    talent_type VARCHAR(50), -- freelancer or job_seeker
    status VARCHAR(50) DEFAULT 'interested', -- interested, contacted, proposal_sent, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_prospects (
    prospect_id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(project_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    talent_id VARCHAR(100), -- freelancer_id or candidate_id
    talent_type VARCHAR(50), -- freelancer or job_seeker
    status VARCHAR(50) DEFAULT 'interested', -- interested, contacted, proposal_sent, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deal_notes_deal_id ON deal_notes(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_notes_user_id ON deal_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_notes_created_at ON deal_notes(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_deal_id ON notifications(deal_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_job_prospects_job_id ON job_prospects(job_id);
CREATE INDEX IF NOT EXISTS idx_job_prospects_user_id ON job_prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_job_prospects_talent_id ON job_prospects(talent_id);

CREATE INDEX IF NOT EXISTS idx_project_prospects_project_id ON project_prospects(project_id);
CREATE INDEX IF NOT EXISTS idx_project_prospects_user_id ON project_prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_project_prospects_talent_id ON project_prospects(talent_id);

