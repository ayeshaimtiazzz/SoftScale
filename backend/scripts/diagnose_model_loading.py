"""Diagnose why the merged model isn't loading."""
import sys
import os

# Add backend to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

def diagnose_model_loading():
    """Diagnose model loading issues."""
    print("="*70)
    print("DIAGNOSING MERGED MODEL LOADING ISSUES")
    print("="*70)

    # Check 1: Dependencies
    print("\n1. Checking Dependencies...")
    try:
        import torch
        print(f"   OK: torch version {torch.__version__}")
        print(f"   CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"   GPU: {torch.cuda.get_device_name(0)}")
    except ImportError as e:
        print(f"   ERROR: torch not installed: {e}")
        return

    try:
        from transformers import AutoTokenizer, AutoModelForCausalLM
        print(f"   OK: transformers installed")
    except ImportError as e:
        print(f"   ERROR: transformers not installed: {e}")
        return

    # Check 2: Settings
    print("\n2. Checking Settings...")
    try:
        from config import settings
        print(f"   BASE_DIR: {settings.BASE_DIR}")
        print(f"   PROPOSAL_MERGED_MODEL_PATH: {settings.PROPOSAL_MERGED_MODEL_PATH}")
    except Exception as e:
        print(f"   ERROR: Could not load settings: {e}")
        return

    # Check 3: Model Path
    print("\n3. Checking Model Path...")
    merged_path = settings.PROPOSAL_MERGED_MODEL_PATH
    print(f"   Expected path: {merged_path}")
    print(f"   Path exists: {os.path.exists(merged_path)}")
    print(f"   Current working directory: {os.getcwd()}")

    if os.path.exists(merged_path):
        print(f"   OK: Model directory exists")
        # Check contents
        try:
            contents = os.listdir(merged_path)
            print(f"   Directory contents ({len(contents)} items):")
            for item in contents[:10]:  # Show first 10
                item_path = os.path.join(merged_path, item)
                is_file = os.path.isfile(item_path)
                size = os.path.getsize(item_path) if is_file else "N/A"
                print(f"     - {item} ({'file' if is_file else 'dir'}, size: {size})")

            # Check for required files
            config_path = os.path.join(merged_path, "config.json")
            print(f"\n   config.json exists: {os.path.exists(config_path)}")

            model_files = [f for f in contents if f.startswith("model") and f.endswith(".safetensors")]
            print(f"   Model weight files: {len(model_files)}")
            if model_files:
                for mf in model_files[:3]:
                    mf_path = os.path.join(merged_path, mf)
                    size_mb = os.path.getsize(mf_path) / (1024 * 1024)
                    print(f"     - {mf} ({size_mb:.1f} MB)")

            tokenizer_files = ["tokenizer.json", "tokenizer_config.json", "special_tokens_map.json"]
            for tf in tokenizer_files:
                tf_path = os.path.join(merged_path, tf)
                print(f"   {tf}: {os.path.exists(tf_path)}")

        except Exception as e:
            print(f"   ERROR listing directory: {e}")
    else:
        print(f"   ERROR: Model directory does not exist!")
        # Try alternative paths
        print("\n   Trying alternative paths...")
        alt_paths = [
            os.path.join(settings.BASE_DIR, "ai", "proposal_generator", "model", "merged"),
            "/app/ai/proposal_generator/model/merged",
            os.path.join(os.getcwd(), "ai", "proposal_generator", "model", "merged"),
            os.path.join(os.getcwd(), "backend", "ai", "proposal_generator", "model", "merged")
        ]
        for alt_path in alt_paths:
            if alt_path and os.path.exists(alt_path):
                print(f"   FOUND: {alt_path}")
                break
        else:
            print("   No alternative paths found")

    # Check 4: Try importing merged generator
    print("\n4. Checking Merged Generator Import...")
    try:
        from ai.proposal_generator.merged.merged_proposal_generator import get_merged_proposal_generator
        print("   OK: Can import merged generator")

        generator = get_merged_proposal_generator()
        print(f"   Generator created: {generator is not None}")
        print(f"   Model available: {generator.is_available()}")
        print(f"   Model loading: {generator.is_loading()}")

    except ImportError as e:
        print(f"   ERROR: Cannot import merged generator: {e}")
        import traceback
        traceback.print_exc()
    except Exception as e:
        print(f"   ERROR: Error creating generator: {e}")
        import traceback
        traceback.print_exc()

    # Check 5: Try loading model directly
    print("\n5. Testing Direct Model Load...")
    if os.path.exists(merged_path) and os.path.exists(os.path.join(merged_path, "config.json")):
        try:
            print("   Attempting to load model directly...")
            from transformers import AutoTokenizer, AutoModelForCausalLM
            import torch

            tokenizer = AutoTokenizer.from_pretrained(merged_path, trust_remote_code=True)
            print("   OK: Tokenizer loaded")

            # Try loading model (this might take time)
            print("   Loading model (this may take 30-60 seconds)...")
            model = AutoModelForCausalLM.from_pretrained(
                merged_path,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None,
                trust_remote_code=True,
                low_cpu_mem_usage=True
            )
            print("   OK: Model loaded successfully!")
            print(f"   Model device: {next(model.parameters()).device}")

        except Exception as e:
            print(f"   ERROR: Failed to load model directly: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("   SKIP: Model path or config.json not found")

    print("\n" + "="*70)
    print("DIAGNOSIS COMPLETE")
    print("="*70)
    print("\nCheck the output above to identify the issue.")
    print("Common issues:")
    print("1. Model files not in expected location")
    print("2. Missing dependencies (torch, transformers)")
    print("3. Insufficient memory")
    print("4. CUDA/GPU issues")
    print("5. File permissions")


if __name__ == "__main__":
    diagnose_model_loading()

