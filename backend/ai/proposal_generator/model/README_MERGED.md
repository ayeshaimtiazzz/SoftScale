# Merged Model Location

The merged model (base model + PEFT adapter combined) is saved in:

```
backend/ai/proposal_generator/model/merged/
```

## Structure

```
backend/ai/proposal_generator/model/
├── tuned/              # PEFT adapter (original fine-tuned weights)
│   ├── adapter_config.json
│   ├── adapter_model.safetensors
│   └── tokenizer files...
│
└── merged/             # Merged model (faster loading)
    ├── config.json
    ├── model.safetensors (or model-*.safetensors)
    └── tokenizer files...
```

## How It Works

1. **Training**: Creates PEFT adapter in `tuned/` folder
2. **Merging**: Combines adapter with base model → saves to `merged/` folder
3. **Inference**: Service automatically uses `merged/` model if available (faster)

## Creating Merged Model

### Option 1: Automatic (Notebook)
The training notebook automatically merges after training and saves to `merged/` folder.

### Option 2: Manual Script
```bash
python backend/scripts/merge_proposal_model.py
```

This will:
- Load adapter from `tuned/` folder
- Merge with base model
- Save merged model to `merged/` folder

## Configuration

The merged model path is configured in `backend/config/settings.py`:

```python
PROPOSAL_MERGED_MODEL_PATH = os.path.join(
    BASE_DIR,
    "ai",
    "proposal_generator",
    "model",
    "merged"
)
```

## Benefits

- **Faster Loading**: Single model loads faster than base + adapter
- **Automatic Detection**: Service finds merged model automatically
- **Same Quality**: Identical results to PEFT adapter
- **Easier Deployment**: Single model file instead of two

