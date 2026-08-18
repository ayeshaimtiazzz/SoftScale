"""Script to merge base model and PEFT adapter into a single model for faster inference.

This script merges the LoRA adapter weights into the base model, creating a single
model file that can be loaded directly without needing to load both base model and adapter.

Usage:
    # In Docker (recommended - dependencies are installed there):
    # Note: In Docker, /app is the backend root, so use scripts/ not backend/scripts/
    docker exec -it softscale-backend python scripts/merge_proposal_model.py

    # Or locally (requires dependencies):
    python backend/scripts/merge_proposal_model.py
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Lazy imports - handle missing dependencies gracefully
try:
    import torch
    import gc
    import glob
    import shutil
    from transformers import AutoTokenizer, AutoModelForCausalLM
    from peft import AutoPeftModelForCausalLM
    DEPENDENCIES_AVAILABLE = True
except ImportError as e:
    DEPENDENCIES_AVAILABLE = False
    IMPORT_ERROR = str(e)

from config import settings


def merge_model(
    adapter_path: str = None,
    base_model_path: str = None,
    output_path: str = None,
    base_model_name: str = None
):
    """
    Merge PEFT adapter with base model for faster inference.

    Args:
        adapter_path: Path to PEFT adapter directory (default: from settings)
        base_model_path: Path to local base model (default: from settings)
        output_path: Where to save merged model (default: adapter_path + "-merged")
        base_model_name: HuggingFace model name if base not local (default: from settings)
    """
    # Check dependencies first
    if not DEPENDENCIES_AVAILABLE:
        print("=" * 70)
        print("❌ MISSING DEPENDENCIES")
        print("=" * 70)
        print()
        print(f"Required packages are not installed: {IMPORT_ERROR}")
        print()
        print("Please install the required packages:")
        print()
        print("Option 1: Install specific packages")
        print("  pip install torch transformers peft accelerate")
        print()
        print("Option 2: Install all requirements (recommended)")
        print("  pip install -r backend/requirements.txt")
        print()
        print("Option 3: Run in Docker (recommended - dependencies already installed)")
        print("  docker exec -it softscale-backend python backend/scripts/merge_proposal_model.py")
        print()
        print("Note: This script requires PyTorch, Transformers, and PEFT libraries.")
        print("      If you're running locally, install dependencies first.")
        print("      If using Docker, run the script inside the container.")
        print()
        return False

    print("=" * 70)
    print("MERGE BASE MODEL AND PEFT ADAPTER")
    print("=" * 70)
    print()

    # Use settings defaults if not provided
    if adapter_path is None:
        adapter_path = settings.PROPOSAL_MODEL_PATH
    if base_model_path is None:
        base_model_path = settings.PROPOSAL_BASE_MODEL_PATH
    if base_model_name is None:
        base_model_name = settings.PROPOSAL_BASE_MODEL_NAME
    if output_path is None:
        # Use the merged model path from settings
        output_path = settings.PROPOSAL_MERGED_MODEL_PATH

    print(f"[MERGE] Adapter path: {adapter_path}")
    print(f"[MERGE] Base model path: {base_model_path}")
    print(f"[MERGE] Base model name: {base_model_name}")
    print(f"[MERGE] Output path: {output_path}")
    print()

    # Check if adapter exists
    if not os.path.exists(adapter_path):
        print(f"❌ ERROR: Adapter path does not exist: {adapter_path}")
        return False

    adapter_config = os.path.join(adapter_path, "adapter_config.json")
    if not os.path.exists(adapter_config):
        print(f"❌ ERROR: Adapter config not found: {adapter_config}")
        print("   This doesn't look like a PEFT adapter directory.")
        return False

    # Check if output already exists
    if os.path.exists(output_path):
        # Check if it has model weight files
        existing_model_files = glob.glob(os.path.join(output_path, "model*.safetensors"))
        existing_model_files.extend(glob.glob(os.path.join(output_path, "pytorch_model*.bin")))

        if existing_model_files:
            print(f"⚠️  WARNING: Output path already exists with model files: {output_path}")
            print(f"   Found {len(existing_model_files)} existing model file(s)")
            print("   Existing files will be kept, new model weights will be added.")
            print("   (Config files will be updated if needed)")
            print()
        else:
            # Only config files exist - safe to merge and add model weights
            print(f"ℹ️  Output path exists but only has config files (no model weights)")
            print(f"   Will keep existing config files and add model weight files")
            print(f"   Directory: {output_path}")
            print()

    try:
        print("[MERGE] Step 1/4: Loading PEFT adapter model...")
        print("[MERGE] Note: If adapter was trained with quantization, it will be handled automatically.")
        # AutoPeftModelForCausalLM will load base model automatically
        # It will use local base_model_path if it exists, otherwise download from HuggingFace
        # This handles quantization automatically if the adapter was trained with it
        peft_model = AutoPeftModelForCausalLM.from_pretrained(
            adapter_path,
            device_map="auto" if torch.cuda.is_available() else None,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            trust_remote_code=True,
        )
        print("✅ PEFT model loaded")

        print("[MERGE] Step 2/4: Merging adapter weights into base model...")
        # Merge adapter with base model
        # merge_and_unload() will properly handle quantization if present
        # The merged model will be saved in full precision (or as loaded)
        print("[MERGE] Merging weights (this may take a moment)...")
        import sys
        sys.stdout.flush()

        merged_model = peft_model.merge_and_unload()
        print("✅ Weights merged")
        sys.stdout.flush()

        # Move model to CPU if needed (for saving)
        if torch.cuda.is_available():
            print("[MERGE] Moving model to CPU for saving...")
            merged_model = merged_model.cpu()
            torch.cuda.empty_cache()

        # Verify merged model is ready
        print("[MERGE] Verifying merged model...")
        try:
            # Try to access model parameters to ensure it's valid
            param_count = sum(p.numel() for p in merged_model.parameters())
            print(f"[MERGE] Merged model has {param_count / 1e9:.2f}B parameters")

            # Check if model is quantized
            sample_param = next(merged_model.parameters())
            print(f"[MERGE] Model dtype: {sample_param.dtype}")
            print(f"[MERGE] Model device: {sample_param.device}")

            if hasattr(merged_model, 'hf_quantizer'):
                print("⚠️  WARNING: Model appears to still be quantized!")
                print("[MERGE] Attempting to dequantize...")
                # Try to dequantize if possible
                try:
                    merged_model = merged_model.dequantize()
                    print("✅ Model dequantized")
                except:
                    print("⚠️  Could not dequantize - will try saving anyway")

            print("[MERGE] Merged model is ready")
        except Exception as e:
            print(f"⚠️  Warning checking merged model: {e}")
            print("[MERGE] Continuing with save anyway...")

        # Load tokenizer
        print("[MERGE] Step 3/4: Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(adapter_path, trust_remote_code=True)
        print("✅ Tokenizer loaded")

        print("[MERGE] Step 4/4: Saving merged model...")
        # Create output directory
        os.makedirs(output_path, exist_ok=True)

        # Save merged model with explicit parameters
        print(f"[MERGE] Saving to: {output_path}")
        print("[MERGE] This may take several minutes (saving ~6GB model on CPU)...")
        print("[MERGE] Please wait - do not interrupt the process...")

        try:
            # Flush output to ensure we see the message
            import sys
            sys.stdout.flush()

            # Check model state before saving
            print("[MERGE] Checking model state before save...")
            print(f"[MERGE] Model device: {next(merged_model.parameters()).device}")
            print(f"[MERGE] Model dtype: {next(merged_model.parameters()).dtype}")
            sys.stdout.flush()

            # Save model - this can take time for large models, especially on CPU
            print("[MERGE] Starting model save (this may take 5-15 minutes on CPU)...")
            print("[MERGE] Progress: Converting model to safetensors format...")
            print("[MERGE] NOTE: This is a large model (~6GB). Please be patient.")
            print("[MERGE] If this hangs, check Docker logs or memory usage.")
            sys.stdout.flush()

            # Try saving with explicit error handling
            try:
                # Save with progress indication
                # Use max_shard_size to split into manageable chunks
                print("[MERGE] Saving model weights (this will take several minutes)...")
                sys.stdout.flush()

                merged_model.save_pretrained(
                    output_path,
                    safe_serialization=True,  # Use safetensors format
                    max_shard_size="2GB"  # Smaller shards for reliability
                )
                print("[MERGE] ✅ Model weights saved successfully")
                sys.stdout.flush()
            except RuntimeError as e:
                if "out of memory" in str(e).lower() or "memory" in str(e).lower():
                    print(f"\n❌ ERROR: Out of memory during save!")
                    print("   The model is too large to save in one go.")
                    print("   Try:")
                    print("   1. Increase Docker memory limit")
                    print("   2. Save model in smaller chunks")
                    print("   3. Use a machine with more RAM")
                    raise
                else:
                    raise
            except Exception as save_err:
                print(f"\n❌ ERROR during model save: {save_err}")
                print(f"   Error type: {type(save_err).__name__}")
                raise

            # Immediately verify files exist
            import time
            time.sleep(1)  # Give filesystem a moment
            model_files_check = glob.glob(os.path.join(output_path, "model*.safetensors"))
            if model_files_check:
                print(f"[MERGE] Verified: {len(model_files_check)} model file(s) created")
            else:
                print("[MERGE] ⚠️  WARNING: No model files found immediately after save!")

            # Save tokenizer
            print("[MERGE] Saving tokenizer...")
            sys.stdout.flush()
            tokenizer.save_pretrained(output_path)
            print("[MERGE] ✅ Tokenizer saved")
            print(f"✅ All files saved successfully")
            sys.stdout.flush()
        except KeyboardInterrupt:
            print("\n❌ Save interrupted by user")
            raise
        except Exception as save_error:
            print(f"\n❌ ERROR during save: {save_error}")
            print(f"   Error type: {type(save_error).__name__}")
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Failed to save merged model: {save_error}") from save_error

        # Verify files were saved
        print("[MERGE] Verifying saved files...")
        model_files = glob.glob(os.path.join(output_path, "model*.safetensors"))
        model_files.extend(glob.glob(os.path.join(output_path, "pytorch_model*.bin")))

        if not model_files:
            raise RuntimeError("No model weight files found after saving! Check disk space and permissions.")

        print(f"✅ Found {len(model_files)} model weight file(s)")
        for f in model_files[:3]:  # Show first 3 files
            size_mb = os.path.getsize(f) / (1024 * 1024)
            print(f"   - {os.path.basename(f)} ({size_mb:.1f} MB)")

        print(f"✅ Merged model saved successfully to: {output_path}")

        # Clean up
        del peft_model
        del merged_model
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        print()
        print("=" * 70)
        print("✅ MERGE COMPLETE!")
        print("=" * 70)
        print()
        print(f"📁 Merged model location: {output_path}")
        print()
        print("💡 Benefits:")
        print("   - Faster loading (no need to load base + adapter separately)")
        print("   - Single model file (easier to deploy)")
        print("   - Same quality as PEFT adapter")
        print()
        print("📝 Next steps:")
        print(f"   1. Verify merged model works:")
        print(f"      docker exec -it softscale-backend python scripts/verify_merged_model.py")
        print("   2. Restart your application to use the merged model:")
        print("      docker-compose restart backend")
        print("   3. The service will automatically detect and use the merged model")
        print()

        return True

    except Exception as e:
        print(f"❌ ERROR during merge: {e}")
        import traceback
        traceback.print_exc()

        # Clean up partial files if save failed
        if os.path.exists(output_path):
            print(f"\n⚠️  Checking partial files in: {output_path}")
            try:
                # Only remove if it's empty or only has config files
                files = os.listdir(output_path)
                model_files = [f for f in files if f.endswith(('.safetensors', '.bin'))]
                if not model_files:
                    print("   No model weight files found - merge may have failed")
                    print("   Keeping directory for debugging (check logs above)")
            except:
                pass

        return False


if __name__ == "__main__":
    success = merge_model()
    sys.exit(0 if success else 1)

