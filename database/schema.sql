-- SoftScale Database Schema
-- Run this script to create all necessary tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company table
CREATE TABLE IF NOT EXISTS company (
    company_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    company_description TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    company_size VARCHAR(50),
    domain VARCHAR(100),
    embedding_vector_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Freelancer table
CREATE TABLE IF NOT EXISTS freelancer (
    freelancer_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    gender VARCHAR(20),
    country VARCHAR(100),
    city VARCHAR(100),
    date_of_birth DATE,
    email VARCHAR(255),
    phone_number VARCHAR(50),
    linkedin_url VARCHAR(255),
    degree VARCHAR(100),
    graduation_year INTEGER,
    experience_year INTEGER,
    experience_level VARCHAR(50),
    professional_summary TEXT,
    certifications TEXT,
    portfolio VARCHAR(255),
    skills TEXT,
    domain VARCHAR(100),
    work_preference VARCHAR(50),
    availability VARCHAR(50),
    hourly_rate DECIMAL(10, 2),
    projects TEXT, -- JSON string
    resume_text TEXT,
    embedding_vector_id INTEGER,
    skill_embedding JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job Seeker table
CREATE TABLE IF NOT EXISTS job_seeker (
    candidate_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    gender VARCHAR(20),
    country VARCHAR(100),
    city VARCHAR(100),
    date_of_birth DATE,
    phone_number VARCHAR(50),
    email VARCHAR(255),
    linkedin_url VARCHAR(255),
    education TEXT, -- JSON string
    degree VARCHAR(100),
    graduation_year INTEGER,
    university VARCHAR(255),
    skills TEXT,
    career_objective TEXT,
    domain VARCHAR(100),
    contact_info TEXT,
    expected_salary DECIMAL(10, 2),
    job_type VARCHAR(50),
    experience_level VARCHAR(50),
    past_jobs TEXT, -- JSON string
    resume_text TEXT,
    embedding_vector_id INTEGER,
    skill_embedding JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job table
CREATE TABLE IF NOT EXISTS job (
    job_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES company(company_id) ON DELETE CASCADE,
    job_title VARCHAR(255),
    job_description TEXT,
    job_type VARCHAR(50),
    required_experience VARCHAR(50),
    required_skills TEXT,
    work_mode VARCHAR(50),
    salary DECIMAL(10, 2),
    preferred_domain VARCHAR(100),
    embedding_vector_id INTEGER,
    skill_embedding JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    project_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES company(company_id) ON DELETE CASCADE,
    project_title VARCHAR(255),
    project_description TEXT,
    project_type VARCHAR(50),
    payment_type VARCHAR(50),
    work_mode VARCHAR(50),
    required_experience VARCHAR(50),
    required_skills TEXT,
    team_size INTEGER,
    duration VARCHAR(100),
    domain VARCHAR(100),
    salary INTEGER,
    embedding_vector_id INTEGER,
    skill_embedding JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table for session management
-- Supports idle timeout (8h) and absolute timeout (24h)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_company_user_id ON company(user_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_user_id ON freelancer(user_id);
CREATE INDEX IF NOT EXISTS idx_job_seeker_user_id ON job_seeker(user_id);
CREATE INDEX IF NOT EXISTS idx_job_company_id ON job(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(refresh_token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
