# Proposal Generator Model - Initial Version

This directory contains the **initial** fine-tuned model files for proposal generation.

## Model Structure

```
initial/
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
- **Version**: Initial/First version

## Model Card

### Model Description

This is the **initial** fine-tuned version of Llama-3.2-3B-Instruct optimized for generating professional proposals. The model uses Parameter-Efficient Fine-Tuning (PEFT) with LoRA adapters, allowing efficient fine-tuning while maintaining the base model's general capabilities.

**Note**: This is the first version of the model. For the latest/improved version, see the `tuned/` directory.

### Model Type

- **Base Architecture**: Llama-3.2-3B-Instruct
- **Fine-tuning Method**: PEFT (LoRA)
- **Task**: Text generation (proposal writing)
- **LoRA Rank (r)**: 16
- **LoRA Alpha**: 32
- **LoRA Dropout**: 0.05

### Usage

The model can be loaded by updating `PROPOSAL_MODEL_PATH` in `config/settings.py` to point to this directory.

**Example:**
```python
from services.proposal_generator_service import ProposalGeneratorService

service = ProposalGeneratorService()
if service.is_available():
    proposal = service.generate(
        prompt="Create a proposal for a web development project",
        tone="Professional"
    )
```

### Model Loading

- The base model is downloaded from HuggingFace on first use (or loaded from local cache)
- Only the adapter weights are stored locally (~100MB+)
- Model files are loaded lazily (on first access)
- Ensure sufficient disk space and memory for model loading

### Technical Specifications

- **Base Model**: unsloth/Llama-3.2-3B-Instruct
- **Adapter Format**: PEFT LoRA
- **Tokenizer**: AutoTokenizer from base model
- **Device**: Auto-detected (GPU if available, CPU otherwise)
- **Precision**: float16 on GPU, float32 on CPU
- **Target Modules**: down_proj, gate_proj, k_proj, o_proj, q_proj, up_proj, v_proj

### Files

- `adapter_config.json`: Configuration for the PEFT adapter
- `adapter_model.safetensors`: Adapter weights in safetensors format
- `special_tokens_map.json`: Mapping of special tokens
- `tokenizer_config.json`: Tokenizer configuration
- `tokenizer.json`: Tokenizer model file

## Notes

- Model files are large (~100MB+), ensure sufficient disk space
- The base model (~6GB) will be downloaded on first use if not cached locally
- GPU is recommended for faster inference but not required
- Model supports multiple tones: Professional, Casual, Persuasive, Formal
- This is the initial version - consider using the `tuned/` version for improved performance

## Related Files

- Service: `../../services/proposal_generator_service.py` - ProposalGeneratorService
- Datasets: `../../datasets/` - Training data and proposal templates
- Configuration: `../../../../config/settings.py` - Model configuration settings
- Tuned Version: `../tuned/` - Updated/improved model version
