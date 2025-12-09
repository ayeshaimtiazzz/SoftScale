"""Low-memory version of merge script that saves incrementally.

This version saves the model in a way that uses less memory by
processing layers one at a time.

Usage:
    docker exec softscale-backend python scripts/merge_proposal_model_lowmem.py
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Lazy imports
try:
    import torch
    import gc
    from transformers import AutoTokenizer, AutoModelForCausalLM
    from peft import AutoPeftModelForCausalLM
    DEPENDENCIES_AVAILABLE = True
except ImportError as e:
    DEPENDENCIES_AVAILABLE = False
    IMPORT_ERROR = str(e)

from config import settings


def merge_model_lowmem():
    """Merge model with lower memory usage."""
    if not DEPENDENCIES_AVAILABLE:
        print(f"❌ Missing dependencies: {IMPORT_ERROR}")
        return False

    adapter_path = settings.PROPOSAL_MODEL_PATH
    output_path = settings.PROPOSAL_MERGED_MODEL_PATH

    print("=" * 70)
    print("MERGE MODEL (Low Memory Mode)")
    print("=" * 70)
    print()
    print(f"Adapter: {adapter_path}")
    print(f"Output: {output_path}")
    print()

    try:
        print("[MERGE] Loading PEFT model...")
        # Load with device_map to spread across CPU efficiently
        peft_model = AutoPeftModelForCausalLM.from_pretrained(
            adapter_path,
            device_map="cpu",
            torch_dtype=torch.float16,  # Use float16 to reduce memory
            trust_remote_code=True,
            low_cpu_mem_usage=True
        )
        print("✅ PEFT model loaded")

        # Force garbage collection
        gc.collect()

        print("[MERGE] Merging weights...")
        merged_model = peft_model.merge_and_unload()
        del peft_model
        gc.collect()
        print("✅ Weights merged")

        # Convert to float16 to save memory during save
        print("[MERGE] Converting to float16 for efficient saving...")
        merged_model = merged_model.half()
        gc.collect()
        print("✅ Converted to float16")

        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(adapter_path, trust_remote_code=True)

        # Save with smaller shards
        print("[MERGE] Saving model (using smaller shards for low memory)...")
        os.makedirs(output_path, exist_ok=True)

        # Save with very small shards to reduce memory usage
        merged_model.save_pretrained(
            output_path,
            safe_serialization=True,
            max_shard_size="1GB"  # Very small shards
        )

        tokenizer.save_pretrained(output_path)
        print("✅ Model saved successfully")

        # Clean up
        del merged_model
        gc.collect()

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = merge_model_lowmem()
    sys.exit(0 if success else 1)

