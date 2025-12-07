# Backend Tests

This directory contains all test files for the SoftScale backend.

## Structure

```
tests/
├── __init__.py
├── integration/          # Integration tests for API endpoints
│   ├── __init__.py
│   └── test_refresh_token_endpoints.py
└── unit/                 # Unit tests for individual components
    └── __init__.py
```

## Running Tests

### Integration Tests

Test API endpoints and full request/response cycles:

```bash
# Run refresh token integration tests
python -m pytest tests/integration/test_refresh_token_endpoints.py

# Or run directly
python tests/integration/test_refresh_token_endpoints.py
```

### Unit Tests

Test individual components in isolation:

```bash
# Run all unit tests
python -m pytest tests/unit/

# Run specific unit test
python -m pytest tests/unit/test_specific_component.py
```

### All Tests

```bash
# Run all tests
python -m pytest tests/

# With verbose output
python -m pytest tests/ -v
```

## Test Categories

### Integration Tests
- Test complete API workflows
- Test database interactions
- Test authentication flows
- Test end-to-end scenarios

### Unit Tests
- Test individual functions
- Test service layer logic
- Test utility functions
- Test data transformations

## Requirements

Tests may require additional dependencies. Install them with:

```bash
pip install -r requirements.txt
pip install pytest pytest-cov  # For test framework
```

## Notes

- Integration tests require a running backend server
- Some tests may require database access
- Test data is cleaned up automatically where possible

