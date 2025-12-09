# AI Models Module

This module centralizes all AI/ML models, LLMs, and embedding services following best practices.

## Structure

```
ai/
├── __init__.py                 # Module exports
├── base.py                     # BaseModelService - base class for all models
├── leads_match/                # Leads matching model
│   ├── __init__.py
│   ├── service.py              # TalentEmbeddingService
│   ├── datasets/               # Training data
│   │   └── embeddings/         # Embeddings datasets
│   └── model/                  # Model files
├── proposal_generator/         # Proposal generation model
│   ├── __init__.py
│   ├── service.py              # ProposalGeneratorService
│   ├── datasets/               # Training data
│   └── model/                  # Model files
└── README.md                   # This file
```

## Best Practices

### 1. **Centralized Location**
All AI/ML models are located in `backend/ai/` for easy discovery and management.

### 2. **Organized by Model**
Each model has its own folder containing:
- `service.py` - The model service class
- `datasets/` - Training data and related files
- `model/` - Model files (if applicable)

### 3. **Consistent Interface**
All model services inherit from `BaseModelService` which provides:
- Singleton pattern for efficient resource management
- `is_available()` method to check model status
- `get_model_info()` for debugging and monitoring

### 4. **Configuration Management**
Model configurations are centralized in `config/settings.py`:
- `EMBED_MODEL_NAME` - Embedding model name
- `PROPOSAL_BASE_MODEL_NAME` - Base LLM model name
- `PROPOSAL_MODEL_PATH` - Path to fine-tuned adapter
- `PROPOSAL_DATASETS_DIR` - Path to datasets
- `PROPOSAL_TEMPLATES_DIR` - Path to proposal templates
- `PROPOSAL_TRAINING_DIR` - Path to training CSV files

### 5. **Graceful Degradation**
All model services handle failures gracefully:
- Return informative error messages
- Provide fallback mechanisms
- Continue operation even if models fail to load

## Available Models

### ProposalGeneratorService
- **Location**: `ai/proposal_generator/service.py`
- **Purpose**: Generate proposals using fine-tuned LLM
- **Model**: Llama-3.2-3B-Instruct (fine-tuned with PEFT)
- **Datasets**:
  - `ai/proposal_generator/datasets/proposals/` - Markdown proposal templates
  - `ai/proposal_generator/datasets/trainings/` - CSV training datasets
- **Model Files**: `ai/proposal_generator/model/` - PEFT adapter weights
- **Usage**:
  ```python
  from services.proposal_generator_service import ProposalGeneratorService

  service = ProposalGeneratorService()
  if service.is_available():
      proposal = service.generate(prompt="...", tone="Professional")
  ```

### TalentEmbeddingService
- **Location**: `ai/leads_match/service.py`
- **Purpose**: Generate embeddings for semantic search and matching
- **Model**: SentenceTransformer (all-MiniLM-L6-v2)
- **Datasets**: `datasets/` - Reserved for future training data
- **Usage**:
  ```python
  from ai.leads_match import TalentEmbeddingService

  service = TalentEmbeddingService()
  if service.is_available():
      embedding = service.get_weighted_embedding(text="...")
      embeddings = service.encode(["text1", "text2"])
  ```

## Adding New Models

To add a new AI model:

1. Create a new folder in `ai/` (e.g., `ai/my_model/`)
2. Create `service.py` inheriting from `BaseModelService`
3. Create `datasets/` folder for training data (if needed)
4. Create `model/` folder for model files (if applicable)
5. Implement required methods:
   - `_load_model()` - Load your model
   - `is_available()` - Check if model is ready
6. Add configuration to `config/settings.py` if needed
7. Export in `ai/my_model/__init__.py` and add to `ai/__init__.py`

Example:
```python
# ai/my_model/service.py
from ai.base import BaseModelService

class MyModelService(BaseModelService):
    def _load_model(self):
        # Load your model here
        self._model = load_my_model()
        self._is_loaded = True

    def is_available(self) -> bool:
        return self._is_loaded and self._model is not None

    def predict(self, input_data):
        # Your model's prediction logic
        return self._model.predict(input_data)
```

## Migration Notes

- Old `ProposalModelService` → New `ProposalGeneratorService`
- Old `utils/embeddings.MODEL` → New `TalentEmbeddingService`
- Old paths in `materials/` → New paths in `ai/`
- All imports should use `from ai.*` instead of scattered locations

See `DATASET_MIGRATION_GUIDE.md` for instructions on migrating datasets and model files.

