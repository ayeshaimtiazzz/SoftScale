-- Migration: Add refresh_tokens table for session management
-- Date: 2024-12-03
-- Description: Adds refresh_tokens table to support token refresh functionality
--              with idle timeout (8h) and absolute timeout (24h)
--
-- This migration is idempotent - it can be run multiple times safely
-- Run this script on your existing database to add refresh token support

-- Create refresh_tokens table
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
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(refresh_token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Optional: Add comment to table for documentation
COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for JWT authentication with idle and absolute timeout support';

