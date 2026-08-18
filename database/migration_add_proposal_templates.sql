-- Proposal Templates Table
-- Stores proposal templates extracted from materials folder

CREATE TABLE IF NOT EXISTS proposal_templates (
    template_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    prompt TEXT NOT NULL,
    content TEXT, -- Full proposal content/structure
    tags TEXT[], -- Array of tags
    domain VARCHAR(100), -- Domain/industry
    tone VARCHAR(50), -- Professional, Casual, Persuasive, Formal
    complexity VARCHAR(50), -- Simple, Medium, Complex
    source_file VARCHAR(255), -- Original file name
    metadata JSONB, -- Additional metadata (timeline, sections, etc.)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_proposal_templates_category ON proposal_templates(category);
CREATE INDEX IF NOT EXISTS idx_proposal_templates_domain ON proposal_templates(domain);
CREATE INDEX IF NOT EXISTS idx_proposal_templates_active ON proposal_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_proposal_templates_tags ON proposal_templates USING GIN(tags);

