# Backend Folder Architecture

## Overview
The backend follows a **layered architecture pattern** with clear separation of concerns:
- **Routes** → **Controllers** → **Services** → **Repositories** → **Database**

---

## 📁 Root Structure

```
backend/
├── app.py                    # FastAPI application entry point
├── requirements.txt          # Python dependencies
├── Dockerfile               # Docker container configuration
├── input_pipeline.py        # Data input processing
├── talent.py                 # Legacy talent matching (if any)
│
├── 📁 ai/                    # AI/ML Services
├── 📁 config/                # Configuration
├── 📁 controllers/           # Request handlers (business logic layer)
├── 📁 data/                  # Data access layer (repositories)
├── 📁 database/              # Database schemas & migrations
├── 📁 middleware/            # Middleware (auth, CORS)
├── 📁 models/                # Data models/schemas
├── 📁 routes/                # API route definitions
├── 📁 services/              # Business logic services
├── 📁 scripts/               # Utility scripts
├── 📁 tests/                 # Test files
└── 📁 utils/                 # Utility functions
```

---

## 📂 Detailed Structure

### 1. **`ai/`** - AI/ML Services
Contains AI-powered features and ML models.

```
ai/
├── __init__.py
├── base.py                   # Base AI utilities
├── README.md
│
├── 📁 leads_match/           # Talent/Lead Matching AI
│   ├── service.py            # Matching service
│   ├── datasets/
│   │   └── embeddings/        # FAISS vector indices
│   └── model/                 # Model files
│
└── 📁 proposal_generator/    # Proposal Generation AI
    ├── proposalgenrator.ipynb # Training notebook
    ├── base_model/           # Base LLM model files
    ├── model/
    │   ├── initial/          # Initial PEFT adapter
    │   ├── tuned/            # Fine-tuned adapter
    │   └── merged/           # Merged model (base + adapter)
    ├── datasets/             # Training datasets
    │   ├── proposals/        # Sample proposals
    │   └── trainings/        # CSV training data
    └── merged/               # Production proposal generator
        ├── proposal_generator.py  # Main generator
        ├── domain_templates.py    # Domain-specific templates
        ├── docx_export.py         # DOCX export utility
        └── utils.py               # Helper functions
```

**Purpose**: AI services for proposal generation and talent matching.

---

### 2. **`config/`** - Configuration
Application settings and environment variables.

```
config/
├── __init__.py
└── settings.py               # App configuration (paths, API keys, etc.)
```

**Purpose**: Centralized configuration management.

---

### 3. **`controllers/`** - Request Handlers
Handles HTTP requests, validates input, calls services.

```
controllers/
├── __init__.py
├── auth_controller.py        # Authentication endpoints
├── billing_controller.py     # Billing/subscription endpoints
├── dashboard_controller.py   # Dashboard data endpoints
├── deal_controller.py        # Deal management endpoints
├── job_controller.py         # Job posting endpoints
├── note_controller.py       # Deal notes endpoints
├── notification_controller.py # Notification endpoints
├── profile_controller.py     # User profile endpoints
├── proposal_controller.py   # Proposal generation endpoints
├── talent_controller.py      # Talent matching endpoints
└── user_controller.py       # User management endpoints
```

**Purpose**: Request validation, error handling, response formatting.

---

### 4. **`data/`** - Data Access Layer (Repositories)
Database operations and data persistence.

```
data/
├── __init__.py
├── database.py               # Database connection & utilities
├── user_repository.py        # User CRUD operations
├── profile_repository.py     # Profile CRUD operations
├── job_repository.py         # Job CRUD operations
├── deal_repository.py       # Deal CRUD operations
├── proposal_repository.py   # Proposal CRUD operations
├── billing_repository.py    # Billing/subscription operations
├── notification_repository.py # Notification operations
├── note_repository.py       # Deal notes operations
├── prospect_repository.py  # Prospect/lead operations
├── password_reset_repository.py # Password reset tokens
└── refresh_token_repository.py # Refresh token management
```

**Purpose**: Database queries, transactions, data mapping.

---

### 5. **`database/`** - Database Schemas & Migrations
SQL schemas and migration scripts.

```
database/
├── schema.sql                # Main database schema
├── backups/                  # Database backups
│   └── *.sql
└── migration_*.sql           # Migration scripts
    ├── migration_add_deals_table.sql
    ├── migration_add_proposals_table.sql
    ├── migration_add_proposal_templates.sql
    ├── migration_add_refresh_tokens.sql
    └── migration_add_deal_notes_and_notifications.sql
```

**Purpose**: Database structure definition and version control.

---

### 6. **`middleware/`** - Middleware
Request/response processing middleware.

```
middleware/
├── __init__.py
├── auth.py                   # Authentication middleware
└── cors.py                   # CORS configuration
```

**Purpose**: Authentication, authorization, CORS handling.

---

### 7. **`models/`** - Data Models
Pydantic models for request/response validation.

```
models/
├── __init__.py
├── auth.py                   # Auth models (login, signup)
├── billing.py                # Billing/subscription models
├── deal.py                   # Deal models
├── job.py                    # Job models
├── profile.py                # Profile models
└── user.py                   # User models
```

**Purpose**: Data validation, serialization, type safety.

---

### 8. **`routes/`** - API Routes
FastAPI route definitions.

```
routes/
├── __init__.py               # Route registration
├── api_routes.py             # Main API router aggregation
├── auth_routes.py            # Authentication routes
├── billing_routes.py         # Billing routes
├── deal_routes.py            # Deal routes
├── job_routes.py             # Job routes
├── note_routes.py            # Deal notes routes
├── notification_routes.py    # Notification routes
├── profile_routes.py         # Profile routes
├── proposal_routes.py        # Proposal generation routes
├── talent_routes.py          # Talent matching routes
└── user_routes.py            # User management routes
```

**Purpose**: HTTP endpoint definitions, route registration.

---

### 9. **`services/`** - Business Logic Services
Core business logic and orchestration.

```
services/
├── __init__.py
├── auth_service.py           # Authentication logic
├── billing_service.py        # Billing/subscription logic
├── dashboard_service.py      # Dashboard data aggregation
├── deal_service.py           # Deal management logic
├── job_service.py            # Job posting logic
├── note_service.py           # Deal notes logic
├── notification_service.py   # Notification creation/logic
├── profile_service.py        # Profile management logic
├── proposal_service.py       # Proposal generation orchestration
├── proposal_generator_service.py # Legacy proposal generator
├── proposal_model_service.py    # Model loading service
├── proposal_prompt_helper.py     # Prompt formatting utilities
├── talent_service.py         # Talent matching logic
└── user_service.py          # User management logic
```

**Purpose**: Business rules, data transformation, service orchestration.

---

### 10. **`scripts/`** - Utility Scripts
Helper scripts for maintenance and setup.

```
scripts/
├── backup_database.py        # Database backup utility
├── check_migrations.py       # Migration verification
├── diagnose_model_loading.py # Model loading diagnostics
├── download_base_model.py   # Download base LLM model
├── import_proposal_templates.py # Import templates
├── merge_proposal_model.py   # Merge PEFT adapter with base
├── merge_proposal_model_background.py # Background merge
├── merge_proposal_model_lowmem.py # Low-memory merge
├── preload_model.py         # Preload model in memory
└── verify_merged_model.py    # Verify merged model integrity
```

**Purpose**: Database maintenance, model management, setup tasks.

---

### 11. **`tests/`** - Test Files
Unit and integration tests.

```
tests/
├── __init__.py
├── conftest.py              # Pytest configuration
├── README.md
├── unit/                    # Unit tests
└── integration/            # Integration tests
    └── test_refresh_token_endpoints.py
```

**Purpose**: Automated testing.

---

### 12. **`utils/`** - Utility Functions
Shared utility functions.

```
utils/
├── __init__.py
├── email_service.py         # Email sending utilities
├── embeddings.py            # Text embedding utilities
├── jwt.py                   # JWT token utilities
├── talent_matching.py       # Talent matching algorithms
└── text_processing.py       # Text processing utilities
```

**Purpose**: Reusable helper functions.

---

## 🔄 Request Flow

```
Client Request
    ↓
[routes/] → Route Handler
    ↓
[controllers/] → Request Validation
    ↓
[services/] → Business Logic
    ↓
[data/] → Database Operations
    ↓
Database
```

**Example Flow: Generate Proposal**
1. `routes/proposal_routes.py` → Receives POST request
2. `controllers/proposal_controller.py` → Validates request
3. `services/proposal_service.py` → Orchestrates generation
4. `ai/proposal_generator/merged/proposal_generator.py` → Generates proposal
5. `data/proposal_repository.py` → Saves to database
6. Response returned to client

---

## 🎯 Key Design Principles

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Dependency Injection**: Services depend on repositories, not direct DB access
3. **Single Responsibility**: Each file/module has one clear purpose
4. **DRY (Don't Repeat Yourself)**: Shared logic in services/utils
5. **Type Safety**: Pydantic models for validation
6. **Error Handling**: Centralized error handling in controllers

---

## 📝 Notes

- **`ai/`**: Contains ML models and AI services (proposal generation, talent matching)
- **`merged/`**: Production-ready proposal generator (no model loading required)
- **`model/merged/`**: Merged model files (base + fine-tuned adapter)
- **`database/`**: SQLite database files and migrations
- **`scripts/`**: Run manually for maintenance tasks

---

## 🚀 Entry Point

**`app.py`** - FastAPI application initialization:
- Registers all routes
- Configures middleware (CORS, auth)
- Sets up database connection
- Initializes AI services

