"""
Script to pre-download and cache the base model from HuggingFace.

This should be run ONCE to download the model, then it will be cached
and subsequent loads will be much faster.

Usage:
    docker exec -it softscale-backend python scripts/preload_model.py
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
BASE_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BASE_DIR))

from config import settings
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

def preload_model():
    """Pre-download and cache the base model."""
    base_model_name = settings.PROPOSAL_BASE_MODEL_NAME

    print("=" * 60)
    print("Pre-downloading Proposal Generator Base Model")
    print("=" * 60)
    print(f"Model: {base_model_name}")
    print(f"Size: ~6GB (3 billion parameters)")
    print(f"Time: 10-30 minutes (depends on internet speed)")
    print(f"Cache location: ~/.cache/huggingface/")
    print()
    print("This is a ONE-TIME download. After this, the model will")
    print("be cached and loads will be much faster.")
    print()
    print("Starting download...")
    print("=" * 60)

    try:
        # Download tokenizer
        print("\n[1/2] Downloading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(
            base_model_name,
            trust_remote_code=True
        )
        print("✓ Tokenizer downloaded successfully!")

        # Download base model (this is the slow part)
        print("\n[2/2] Downloading base model (this will take 10-30 minutes)...")
        print("      You can monitor progress above.")
        print("      The model is ~6GB, so be patient!")

        dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            dtype=dtype,
            device_map="auto" if torch.cuda.is_available() else None,
            trust_remote_code=True,
            low_cpu_mem_usage=True
        )

        print("\n" + "=" * 60)
        print("✓ Model downloaded and cached successfully!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Enable model in docker-compose.yml: ENABLE_PROPOSAL_MODEL=true")
        print("2. Restart container: docker-compose restart backend")
        print("3. Model will load at startup (5-10 minutes on CPU)")
        print("4. After loading, generation takes 30-60 seconds per request")
        print("\nNote: Generation is slow on CPU. For faster responses (2-5 sec),")
        print("      use a GPU-enabled environment.")

        return True

    except Exception as e:
        print(f"\n✗ Error downloading model: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = preload_model()
    sys.exit(0 if success else 1)
