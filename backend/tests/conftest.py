"""Pytest configuration and shared fixtures for tests."""
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Test configuration
BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
TEST_DB_NAME = os.getenv("TEST_DB_NAME", "test_talent_match_db")

