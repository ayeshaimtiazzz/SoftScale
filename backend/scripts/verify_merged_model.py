"""Script to verify that a merged model works correctly.

This script tests loading and generating with the merged model to ensure
it works before deploying.

Usage:
    docker exec -it softscale-backend python scripts/verify_merged_model.py
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Lazy imports
try:
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    DEPENDENCIES_AVAILABLE = True
except ImportError as e:
    DEPENDENCIES_AVAILABLE = False
    IMPORT_ERROR = str(e)

from config import settings


def verify_merged_model():
    """Verify that the merged model loads and generates correctly."""
    print("=" * 70)
    print("VERIFYING MERGED MODEL")
    print("=" * 70)
    print()

    if not DEPENDENCIES_AVAILABLE:
        print(f"❌ Missing dependencies: {IMPORT_ERROR}")
        print("Install with: pip install torch transformers")
        return False

    merged_model_path = settings.PROPOSAL_MERGED_MODEL_PATH

    print(f"Checking merged model at: {merged_model_path}")
    print()

    # Check if merged model exists
    if not os.path.exists(merged_model_path):
        print(f"❌ ERROR: Merged model path does not exist: {merged_model_path}")
        print()
        print("💡 Run the merge script first:")
        print("   docker exec -it softscale-backend python scripts/merge_proposal_model.py")
        return False

    # Check for required files
    config_file = os.path.join(merged_model_path, "config.json")
    if not os.path.exists(config_file):
        print(f"❌ ERROR: config.json not found in merged model directory")
        return False

    # Check for model weight files
    import glob
    model_files = glob.glob(os.path.join(merged_model_path, "model*.safetensors"))
    model_files.extend(glob.glob(os.path.join(merged_model_path, "pytorch_model*.bin")))

    print("✅ Merged model directory exists")
    print("✅ config.json found")

    if not model_files:
        print()
        print("❌ ERROR: No model weight files found!")
        print("   The merge process didn't save the model weights properly.")
        print()
        print("💡 Solution:")
        print("   1. Remove the incomplete merged directory:")
        print(f"      docker exec softscale-backend rm -rf {merged_model_path}")
        print("   2. Re-run the merge script:")
        print("      docker exec -it softscale-backend python scripts/merge_proposal_model.py")
        print()
        return False

    print(f"✅ Found {len(model_files)} model weight file(s)")
    for f in model_files[:3]:
        size_mb = os.path.getsize(f) / (1024 * 1024)
        print(f"   - {os.path.basename(f)} ({size_mb:.1f} MB)")
    print()

    # Try to load the model
    print("[VERIFY] Step 1/3: Loading merged model...")
    try:
        model = AutoModelForCausalLM.from_pretrained(
            merged_model_path,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None,
            trust_remote_code=True,
            low_cpu_mem_usage=True
        )
        print("✅ Model loaded successfully")
    except Exception as e:
        print(f"❌ ERROR: Failed to load model: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Load tokenizer
    print("[VERIFY] Step 2/3: Loading tokenizer...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(
            merged_model_path,
            trust_remote_code=True,
            fix_mistral_regex=True  # Fix Mistral tokenizer regex pattern warning
        )
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        print("✅ Tokenizer loaded successfully")
    except Exception as e:
        print(f"❌ ERROR: Failed to load tokenizer: {e}")
        return False

    # Test generation
    print("[VERIFY] Step 3/3: Testing generation...")
    try:
        test_prompt = """<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are an expert business and project proposal writer. Generate professional, compelling, and domain-specific proposals.<|eot_id|><|start_header_id|>user<|end_header_id|>

Write a brief test proposal for a software project.<|eot_id|><|start_header_id|>assistant<|end_header_id|>

"""

        inputs = tokenizer(test_prompt, return_tensors="pt")
        device = next(model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=50,
                temperature=0.7,
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )

        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)

        if len(generated_text) > len(test_prompt):
            print("✅ Generation test passed")
            print(f"   Generated {len(generated_text)} characters")
            print(f"   Preview: {generated_text[:100]}...")
        else:
            print("⚠️  WARNING: Generated text seems too short")
            print(f"   Generated: {generated_text}")
            return False

    except Exception as e:
        print(f"❌ ERROR: Generation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    print()
    print("=" * 70)
    print("✅ VERIFICATION COMPLETE - MERGED MODEL WORKS!")
    print("=" * 70)
    print()
    print("The merged model is ready to use. The service will automatically")
    print("detect and use it for faster inference.")
    print()

    # Clean up
    del model
    del tokenizer
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    return True


if __name__ == "__main__":
    success = verify_merged_model()
    sys.exit(0 if success else 1)

