"""
Script to download and save the base model locally.

This downloads the base model once and saves it to:
backend/ai/proposal_generator/base_model/

After this, the model will load from local filesystem (no downloads).

Usage:
    docker exec -it softscale-backend python scripts/download_base_model.py
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

def download_base_model():
    """Download base model and save locally."""
    base_model_name = settings.PROPOSAL_BASE_MODEL_NAME
    base_model_path = settings.PROPOSAL_BASE_MODEL_PATH

    print("=" * 60)
    print("Downloading Base Model for Local Storage")
    print("=" * 60)
    print(f"Model: {base_model_name}")
    print(f"Save to: {base_model_path}")
    print(f"Size: ~6GB (3 billion parameters)")
    print(f"Time: 10-30 minutes (depends on internet speed)")
    print()
    print("After this download, the model will load from local filesystem")
    print("and there will be NO download delays!")
    print()
    print("Starting download...")
    print("=" * 60)

    # Create directory
    os.makedirs(base_model_path, exist_ok=True)

    try:
        # Download tokenizer
        print("\n[1/2] Downloading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(
            base_model_name,
            trust_remote_code=True
        )
        # Save tokenizer locally
        tokenizer.save_pretrained(base_model_path)
        print(f"✓ Tokenizer saved to {base_model_path}")

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

        # Save model locally
        print("\nSaving model to local filesystem...")
        model.save_pretrained(
            base_model_path,
            safe_serialization=True
        )

        print("\n" + "=" * 60)
        print("✓ Base model downloaded and saved locally!")
        print("=" * 60)
        print(f"\nModel saved to: {base_model_path}")
        print("\nNext steps:")
        print("1. Enable model in docker-compose.yml: ENABLE_PROPOSAL_MODEL=true")
        print("2. Restart container: docker-compose restart backend")
        print("3. Model will load from local filesystem (no downloads!)")
        print("4. Loading time: 5-10 minutes (loading into memory)")
        print("5. Generation: 30-60 seconds per request (CPU)")
        print("\nNote: For faster generation (2-5 sec), use GPU.")

        return True

    except Exception as e:
        print(f"\nError downloading model: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = download_base_model()
    sys.exit(0 if success else 1)

