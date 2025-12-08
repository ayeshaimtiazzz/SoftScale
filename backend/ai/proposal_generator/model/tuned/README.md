# Proposal Generator Model - Tuned Version

This directory contains the **tuned** (updated/final) fine-tuned model files for proposal generation.

## Model Structure

```
tuned/
├── adapter_config.json          # PEFT adapter configuration
├── adapter_model.safetensors    # PEFT adapter weights
├── special_tokens_map.json      # Special token mappings
├── tokenizer_config.json        # Tokenizer configuration
└── tokenizer.json               # Tokenizer model file
```

## Model Details

- **Base Model**: `unsloth/Llama-3.2-3B-Instruct`
- **Fine-tuning**: PEFT (Parameter-Efficient Fine-Tuning) adapter
- **Type**: LoRA adapter weights
- **Format**: HuggingFace compatible
- **Library**: PEFT 0.11.1
- **Framework**: PyTorch with Transformers
- **Version**: Tuned/Updated version (currently active)

## Model Card

### Model Description

This is the **tuned** (updated/final) fine-tuned version of Llama-3.2-3B-Instruct optimized for generating professional proposals. The model uses Parameter-Efficient Fine-Tuning (PEFT) with LoRA adapters, allowing efficient fine-tuning while maintaining the base model's general capabilities.

**Note**: This is the current active version of the model. The system is configured to use this version by default.

### Model Type

- **Base Architecture**: Llama-3.2-3B-Instruct
- **Fine-tuning Method**: PEFT (LoRA)
- **Task**: Text generation (proposal writing)
- **LoRA Rank (r)**: 16
- **LoRA Alpha**: 32
- **LoRA Dropout**: 0.05

### Usage

The model is loaded automatically by `ProposalGeneratorService` when first accessed (configured in `config/settings.py`).

**Example:**
```python
from services.proposal_generator_service import ProposalGeneratorService

service = ProposalGeneratorService()
if service.is_available():
    proposal = service.generate(
        prompt="Create a proposal for a web development project",
        tone="Professional",
        max_length=500
    )
```

### Model Loading

- The base model is loaded from local filesystem if available (see `PROPOSAL_BASE_MODEL_PATH` in settings)
- Otherwise, the base model is downloaded from HuggingFace on first use
- Only the adapter weights are stored locally (~100MB+)
- Model files are loaded lazily (on first access) or preloaded at startup
- Ensure sufficient disk space and memory for model loading

### Technical Specifications

- **Base Model**: unsloth/Llama-3.2-3B-Instruct
- **Adapter Format**: PEFT LoRA
- **Tokenizer**: AutoTokenizer from base model or local tokenizer files
- **Device**: Auto-detected (GPU if available, CPU otherwise)
- **Precision**: float16 on GPU, float32 on CPU
- **Target Modules**: q_proj, v_proj, k_proj, up_proj, down_proj, gate_proj, o_proj
- **Quantization**: Optional 8-bit quantization (configurable via `USE_QUANTIZATION` setting)

### Files

- `adapter_config.json`: Configuration for the PEFT adapter
- `adapter_model.safetensors`: Adapter weights in safetensors format
- `special_tokens_map.json`: Mapping of special tokens
- `tokenizer_config.json`: Tokenizer configuration
- `tokenizer.json`: Tokenizer model file

## Performance

### Loading Time
- **CPU**: 3-7 minutes (optimized with memory mapping)
- **GPU**: 1-2 minutes (direct GPU loading)

### Inference Time
- **CPU**: 20-60 seconds per request
- **GPU**: 2-5 seconds per request

### Memory Requirements
- **Base Model**: ~6GB (if not using quantization)
- **Adapter**: ~100MB+
- **RAM**: 8GB+ recommended for CPU inference
- **GPU Memory**: 4GB+ recommended for GPU inference

## Configuration

The model path is configured in `config/settings.py`:

```python
PROPOSAL_MODEL_PATH = os.path.join(
    BASE_DIR,
    "ai",
    "proposal_generator",
    "model",
    "tuned"
)
```

To switch to the initial version, update this path to point to `model/initial` instead.

## Notes

- Model files are large (~100MB+), ensure sufficient disk space
- The base model (~6GB) should be stored locally in `ai/proposal_generator/base_model/` for faster loading
- GPU is recommended for faster inference but not required
- Model supports multiple tones: Professional, Casual, Persuasive, Formal
- Supports customizable parameters: `page_count`, `cover_page`, `detail_level`
- This is the current active version - the system uses this by default

## Related Files

- Service: `../../services/proposal_generator_service.py` - ProposalGeneratorService
- Datasets: `../../datasets/` - Training data and proposal templates
- Configuration: `../../../../config/settings.py` - Model configuration settings
- Initial Version: `../initial/` - First version of the model (for reference)

## Troubleshooting

### Model Not Loading
- Check that `PROPOSAL_MODEL_PATH` in `settings.py` points to this directory
- Verify all files exist (adapter_config.json, adapter_model.safetensors, etc.)
- Check that `ENABLE_PROPOSAL_MODEL` is set to `true` in environment variables

### Slow Generation
- Use GPU if available (2-5 seconds vs 20-60 seconds on CPU)
- Enable quantization: `USE_QUANTIZATION=true` (reduces memory and speeds up loading)
- Reduce `max_length` parameter for faster generation

### Memory Issues
- Enable quantization: `USE_QUANTIZATION=true`
- Ensure base model is stored locally (prevents re-downloading)
- Use GPU to offload from CPU RAM
