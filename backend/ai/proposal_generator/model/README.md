# Proposal Generator Model

This directory contains the fine-tuned model files for proposal generation.

## Model Structure

```
model/
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

## Model Card

### Model Description

This is a fine-tuned version of Llama-3.2-3B-Instruct optimized for generating professional proposals. The model uses Parameter-Efficient Fine-Tuning (PEFT) with LoRA adapters, allowing efficient fine-tuning while maintaining the base model's general capabilities.

### Model Type

- **Base Architecture**: Llama-3.2-3B-Instruct
- **Fine-tuning Method**: PEFT (LoRA)
- **Task**: Text generation (proposal writing)

### Usage

The model is loaded automatically by `ProposalGeneratorService` when first accessed.

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

- The base model is downloaded from HuggingFace on first use
- Only the adapter weights are stored locally (~100MB+)
- Model files are loaded lazily (on first access)
- Ensure sufficient disk space and memory for model loading

### Technical Specifications

- **Base Model**: unsloth/Llama-3.2-3B-Instruct
- **Adapter Format**: PEFT LoRA
- **Tokenizer**: AutoTokenizer from base model
- **Device**: Auto-detected (GPU if available, CPU otherwise)
- **Precision**: float16 on GPU, float32 on CPU

### Files

- `adapter_config.json`: Configuration for the PEFT adapter
- `adapter_model.safetensors`: Adapter weights in safetensors format
- `special_tokens_map.json`: Mapping of special tokens
- `tokenizer_config.json`: Tokenizer configuration
- `tokenizer.json`: Tokenizer model file

## Notes

- Model files are large (~100MB+), ensure sufficient disk space
- The base model (~6GB) will be downloaded on first use
- GPU is recommended for faster inference but not required
- Model supports multiple tones: Professional, Casual, Persuasive, Formal

## Related Files

- Service: `../service.py` - ProposalGeneratorService
- Datasets: `../datasets/` - Training data and proposal templates
- Configuration: `config/settings.py` - Model configuration settings
