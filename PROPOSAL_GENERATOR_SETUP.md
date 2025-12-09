# Proposal Generator Integration Setup

This document outlines the integration of proposal templates from the `materials` folder with the SoftScale proposal generator feature.

## Completed Steps

### 1. Database Schema ✅
- Created `database/migration_add_proposal_templates.sql`
- Table: `proposal_templates` with fields for title, category, description, prompt, content, tags, domain, tone, complexity, etc.
- Created `database/proposal_templates/` folder for template storage

### 2. Import Script ✅
- Created `backend/scripts/import_proposal_templates.py`
- Parses markdown files from `backend/materials/proposals/`
- Parses CSV datasets from `backend/materials/proposal generator datasets-20251207T102310Z-3-001/proposal generator datasets/`
- Extracts structured data and inserts into database

### 3. Backend Services ✅
- **Repository**: `backend/data/proposal_repository.py` - Database operations
- **Service**: `backend/services/proposal_service.py` - Business logic
- **Controller**: `backend/controllers/proposal_controller.py` - Request handling
- **Routes**: `backend/routes/proposal_routes.py` - API endpoints

### 4. API Endpoints ✅
- `GET /api/proposals/templates` - Get all templates (with optional category/domain filters)
- `GET /api/proposals/templates/{template_id}` - Get specific template
- `GET /api/proposals/templates/search?q=query` - Search templates
- `POST /api/proposals/generate` - Generate proposal from prompt

### 5. Frontend Integration ✅
- Updated `frontend/src/pages/proposal-generation/index.js`
- Fetches templates from API on component mount
- Replaced dummy data with real API calls
- Added loading states and error handling
- Integrated with authentication

## How to Use

### Step 1: Run Database Migration
```bash
# Connect to your PostgreSQL database and run:
psql -U postgres -d talent_match_db -f database/migration_add_proposal_templates.sql
```

### Step 2: Import Templates
```bash
# From the backend directory:
cd backend
python scripts/import_proposal_templates.py
```

This will:
- Parse all `.md` files from `backend/materials/proposals/`
- Parse all `.csv` files from the datasets folder
- Extract templates and insert them into the database

### Step 3: Start the Application
```bash
# Backend should already be running, but if not:
cd backend
uvicorn app:app --reload

# Frontend:
cd frontend
npm start
```

### Step 4: Use the Feature
1. Navigate to Proposal Generation page
2. Templates will load automatically from the database
3. Select a template or enter a custom prompt
4. Choose tone and generate proposal

## Pending: Model Integration (Step 3)

The fine-tuned model integration is pending. The model is located at:
```
backend/materials/proposal generator datasets-20251207T102310Z-3-001/proposal generator datasets/model/fyp_model/
```

### Model Details
- Base Model: `unsloth/Llama-3.2-3B-Instruct`
- Type: Fine-tuned with PEFT (Parameter-Efficient Fine-Tuning)
- Format: HuggingFace adapter model

### Integration Steps (To Do)

1. **Install Required Dependencies**
   ```bash
   pip install transformers torch peft accelerate bitsandbytes
   ```

2. **Create Model Service**
   - Create `backend/services/proposal_model_service.py`
   - Load the fine-tuned model and tokenizer
   - Implement inference function

3. **Update Proposal Service**
   - Replace placeholder in `generate_proposal()` method
   - Call model service for actual generation
   - Handle prompt formatting and response parsing

4. **Add Model Configuration**
   - Add model path to `backend/config/settings.py`
   - Configure GPU/CPU usage
   - Set generation parameters (max_length, temperature, etc.)

### Example Model Integration Code Structure

```python
# backend/services/proposal_model_service.py
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import torch

class ProposalModelService:
    def __init__(self):
        self.model_path = "backend/materials/proposal generator datasets-20251207T102310Z-3-001/proposal generator datasets/model/fyp_model"
        self.base_model = "unsloth/Llama-3.2-3B-Instruct"
        self.tokenizer = None
        self.model = None
        self._load_model()

    def _load_model(self):
        # Load tokenizer and model
        # Load PEFT adapter
        pass

    def generate(self, prompt: str, tone: str = "Professional", max_length: int = 1000):
        # Format prompt with tone
        # Generate proposal
        # Return generated text
        pass
```

## File Structure

```
backend/
├── materials/
│   ├── proposals/                    # Markdown proposal files
│   └── proposal generator datasets/  # CSV datasets and model
│       └── model/
│           └── fyp_model/            # Fine-tuned model (to be integrated)
├── scripts/
│   └── import_proposal_templates.py  # Import script
├── data/
│   └── proposal_repository.py       # Database operations
├── services/
│   └── proposal_service.py          # Business logic
├── controllers/
│   └── proposal_controller.py       # Request handling
└── routes/
    └── proposal_routes.py           # API endpoints

database/
├── migration_add_proposal_templates.sql
└── proposal_templates/              # Template storage folder

frontend/src/pages/proposal-generation/
└── index.js                          # Updated frontend component
```

## Notes

- Templates are stored in the database, not as files (except for the original materials)
- The import script can be run multiple times - it checks for duplicates
- Model integration is the final step and can be done when ready
- The current implementation uses a placeholder for proposal generation until the model is integrated

