# AI Folder Structure - Complete Organization

## Overview

All AI models, datasets, and related files are now organized in a centralized, scalable structure under `backend/ai/`.

## Directory Structure

```
backend/ai/
├── __init__.py                    # Module exports
├── README.md                      # Module documentation
├── models/
│   ├── __init__.py               # Model exports
│   ├── base.py                   # BaseModelService - base class
│   ├── proposal_generator/       # Proposal Generator Model
│   │   ├── __init__.py
│   │   ├── service.py            # ProposalGeneratorService
│   │   ├── datasets/             # All proposal-related data
│   │   │   ├── README.md        # Dataset documentation
│   │   │   ├── proposals/       # Markdown proposal templates
│   │   │   │   └── *.md        # Individual proposal files
│   │   │   └── training/       # CSV training datasets
│   │   │       └── *.csv       # Training data files
│   │   └── model/               # Model files
│   │       ├── README.md        # Model documentation
│   │       └── fyp_model/      # Fine-tuned PEFT adapter
│   │           ├── adapter_config.json
│   │           ├── adapter_model.safetensors
│   │           └── ...
│   └── talent_embedding/         # Talent Embedding Model
│       ├── __init__.py
│       ├── service.py           # TalentEmbeddingService
│       └── datasets/            # Future training data
│           └── README.md        # Dataset documentation
```

## Model Organization

### Proposal Generator (`proposal_generator/`)

**Service**: `service.py` - `ProposalGeneratorService`
- Fine-tuned LLM for generating proposals
- Base model: `unsloth/Llama-3.2-3B-Instruct`
- PEFT adapter: `model/fyp_model/`

**Datasets**:
- `datasets/proposals/` - Markdown proposal templates
- `datasets/training/` - CSV training datasets

**Model Files**:
- `model/fyp_model/` - PEFT adapter weights

### Talent Embedding (`talent_embedding/`)

**Service**: `service.py` - `TalentEmbeddingService`
- SentenceTransformer for embeddings
- Model: `all-MiniLM-L6-v2` (downloaded from HuggingFace)

**Datasets**:
- `datasets/` - Reserved for future training data

## Benefits

1. **Centralized**: All AI-related files in one location
2. **Organized**: Each model has its own folder with clear structure
3. **Scalable**: Easy to add new models following the same pattern
4. **Maintainable**: Clear separation between code, data, and models
5. **Documented**: README files explain each component

## Migration Status

✅ **Completed**:
- Created new folder structure
- Moved service files to model-specific folders
- Updated all imports
- Updated configuration paths
- Created documentation

⏳ **Pending** (Manual Steps):
- Move actual dataset files from `materials/` to new locations
- Move model files from `materials/` to new locations
- Update any external scripts that reference old paths

See `DATASET_MIGRATION_GUIDE.md` for detailed migration instructions.

## Usage Examples

### Proposal Generation
```python
from ai.models.proposal_generator.service import ProposalGeneratorService

service = ProposalGeneratorService()
proposal = service.generate(prompt="...", tone="Professional")
```

### Talent Embeddings
```python
from ai.models.talent_embedding.service import TalentEmbeddingService

service = TalentEmbeddingService()
embedding = service.get_weighted_embedding(text="...")
```

## Configuration

All paths are configured in `backend/config/settings.py`:
- `PROPOSAL_MODEL_PATH` - Path to model files
- `PROPOSAL_DATASETS_DIR` - Path to datasets
- `PROPOSAL_TEMPLATES_DIR` - Path to proposal templates
- `PROPOSAL_TRAINING_DIR` - Path to training CSV files

## Adding New Models

1. Create folder: `ai/models/my_model/`
2. Create `service.py` inheriting from `BaseModelService`
3. Create `datasets/` folder for data
4. Create `model/` folder for model files (if needed)
5. Update `ai/models/__init__.py` to export
6. Add configuration to `config/settings.py`


