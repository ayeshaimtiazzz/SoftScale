"""Proposal Generator Model Service.

Fine-tuned LLM for generating proposals based on prompts and templates.
"""
import os
import threading
from typing import Optional

# Lazy imports - handle missing dependencies gracefully
try:
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    from peft import PeftModel, AutoPeftModelForCausalLM
    DEPENDENCIES_AVAILABLE = True
except ImportError as e:
    DEPENDENCIES_AVAILABLE = False
    IMPORT_ERROR = str(e)

from config import settings
from ai.base import BaseModelService


class ProposalGeneratorService(BaseModelService):
    """Service for loading and using the fine-tuned proposal generation model.

    Uses a fine-tuned Llama-3.2-3B-Instruct model with PEFT adapter
    for generating professional proposals.

    Model loads in a background thread to prevent blocking API calls.
    """

    _model = None
    _tokenizer = None
    _is_loading = False
    _load_thread = None
    _load_lock = threading.Lock()  # Thread-safe access to loading state

    def _get_model_path(self) -> str:
        """Get the path to the fine-tuned model."""
        # Use the model path from settings (already configured correctly)
        return settings.PROPOSAL_MODEL_PATH

    def __init__(self):
        """Initialize the service and start background model loading."""
        # Don't call parent __init__ which would block
        # Instead, start background loading thread
        with self._load_lock:
            if not self._is_loaded and not self._is_loading and self._load_thread is None:
                print("[MODEL] Starting background model loading (non-blocking)...")
                # Don't set _is_loading here - let _load_model() set it
                # This prevents the race condition where _load_model() sees it's already loading
                self._load_thread = threading.Thread(
                    target=self._load_model_thread,
                    daemon=True,  # Daemon thread won't prevent shutdown
                    name="ProposalModelLoader"
                )
                self._load_thread.start()
                print("[MODEL] Background loading thread started. API calls will not be blocked.")

    def _load_model_thread(self):
        """Load model in background thread (internal method)."""
        try:
            # Call the actual loading method - it will handle its own locking
            self._load_model()
        except Exception as e:
            print(f"[MODEL] ❌ Error in background loading thread: {e}")
            import traceback
            traceback.print_exc()
            with self._load_lock:
                self._is_loaded = False
                self._is_loading = False

    def _load_model(self):
        """Load the fine-tuned model and tokenizer."""
        # Check if dependencies are available
        if not DEPENDENCIES_AVAILABLE:
            print(f"[MODEL] ❌ Required dependencies not installed: {IMPORT_ERROR}")
            print("[MODEL] Install with: pip install torch transformers peft accelerate")
            print("[MODEL] Or: pip install -r backend/requirements.txt")
            with self._load_lock:
                self._is_loaded = False
                self._is_loading = False
            return

        # Thread-safe check for loading state
        with self._load_lock:
            # Check if already loaded
            if self._is_loaded and self._model is not None and self._tokenizer is not None:
                print("[MODEL] Model already loaded, skipping...")
                return

            # Check if another thread is loading (and it's not this thread)
            if self._is_loading:
                current_thread = threading.current_thread()
                if self._load_thread and self._load_thread != current_thread and self._load_thread.is_alive():
                    # Another thread is loading, wait for it or skip
                    print("[MODEL] Model is already loading in another thread...")
                    # If called synchronously, we'll wait outside the lock
                    # For now, return and let caller wait
                    return
                # If we're in the loading thread itself, continue (don't skip)

            # Mark as loading - this is safe because we're in the lock
            self._is_loading = True

        try:
            model_path = self._get_model_path()
            base_model_name = settings.PROPOSAL_BASE_MODEL_NAME
            base_model_path = settings.PROPOSAL_BASE_MODEL_PATH

            print(f"[MODEL] ===== Starting Model Load =====")
            print(f"[MODEL] Model path: {model_path}")
            print(f"[MODEL] Base model path: {base_model_path}")
            print(f"[MODEL] Base model name: {base_model_name}")
            print(f"[MODEL] Model path exists: {os.path.exists(model_path)}")
            print(f"[MODEL] Base model path exists: {os.path.exists(base_model_path)}")

            if not os.path.exists(model_path):
                print(f"[MODEL] ❌ ERROR: Model path not found: {model_path}")
                print(f"[MODEL] Current working directory: {os.getcwd()}")
                print(f"[MODEL] BASE_DIR from settings: {settings.BASE_DIR if hasattr(settings, 'BASE_DIR') else 'N/A'}")
                print("[MODEL] Proposal generation will use placeholder responses.")
                with self._load_lock:
                    self._is_loaded = False
                    self._is_loading = False
                return

            # Check for adapter files
            adapter_config = os.path.join(model_path, "adapter_config.json")
            adapter_model = os.path.join(model_path, "adapter_model.safetensors")
            print(f"[MODEL] Adapter config exists: {os.path.exists(adapter_config)}")
            print(f"[MODEL] Adapter model exists: {os.path.exists(adapter_model)}")

            print(f"[MODEL] Loading proposal generator model from: {model_path}")

            # Check for merged model first (faster loading)
            # Check in the merged folder from settings
            merged_model_path = settings.PROPOSAL_MERGED_MODEL_PATH
            merged_model_loaded = False

            if os.path.exists(merged_model_path) and os.path.exists(
                os.path.join(merged_model_path, "config.json")
            ):
                print("[MODEL] ✓ Found merged model (faster loading)...")
                print(f"[MODEL] Loading merged model from: {merged_model_path}")
                try:
                    # Optimize loading: merged model is already float16, use memory mapping
                    print("[MODEL] Loading merged model with optimizations...")
                    self._model = AutoModelForCausalLM.from_pretrained(
                        merged_model_path,
                        torch_dtype=torch.float16,  # Model is already float16 from merge
                        device_map="auto" if torch.cuda.is_available() else "cpu",
                        trust_remote_code=True,
                        low_cpu_mem_usage=True,
                        use_safetensors=True,  # Use safetensors for faster loading
                        # Additional optimizations
                        offload_folder=None,  # Don't offload, keep in memory
                    )
                    self._tokenizer = AutoTokenizer.from_pretrained(
                        merged_model_path,
                        trust_remote_code=True,
                        use_fast=True,  # Use fast tokenizer if available
                        fix_mistral_regex=True  # Fix Mistral tokenizer regex pattern warning
                    )
                    print("[MODEL] ✓ Loaded merged model (optimized loading)")
                    merged_model_loaded = True
                except Exception as e:
                    print(f"[MODEL] ⚠️  Failed to load merged model: {str(e)[:100]}")
                    print("[MODEL] Falling back to adapter model...")
            else:
                print(f"[MODEL] No merged model found at: {merged_model_path}")
                print("[MODEL] Checking for full model or adapter...")

            # Try to load as full model (if it's already merged or a standalone model)
            if not merged_model_loaded:
                try:
                    print("[MODEL] Attempting to load as full model...")
                    self._model = AutoModelForCausalLM.from_pretrained(
                        model_path,
                        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                        device_map="auto" if torch.cuda.is_available() else None,
                        trust_remote_code=True,
                        low_cpu_mem_usage=True
                    )
                    # Load tokenizer from same directory
                    self._tokenizer = AutoTokenizer.from_pretrained(
                        model_path,
                        trust_remote_code=True,
                        fix_mistral_regex=True  # Fix Mistral tokenizer regex pattern warning
                    )
                    print("[MODEL] ✓ Loaded as full model (no base model needed)")
                except Exception as e:
                    # If that fails, it's a PEFT adapter - load base model + adapter
                    print(f"[MODEL] Not a full model, loading as PEFT adapter...")
                    print(f"[MODEL] Error: {str(e)[:100]}")

                    # Check if local base model exists
                    base_model_path = settings.PROPOSAL_BASE_MODEL_PATH
                    use_local_base = os.path.exists(base_model_path) and os.path.exists(
                        os.path.join(base_model_path, "config.json")
                    )

                    if use_local_base:
                        print(f"[MODEL] ✓ Using local base model from: {base_model_path}")
                        # Load tokenizer from local base model
                        self._tokenizer = AutoTokenizer.from_pretrained(
                            base_model_path,
                            trust_remote_code=True,
                            fix_mistral_regex=True  # Fix Mistral tokenizer regex pattern warning
                        )
                        # Load base model from local path
                        print("[MODEL] Loading base model from local path...")
                        base_model = AutoModelForCausalLM.from_pretrained(
                            base_model_path,
                            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                            device_map="auto" if torch.cuda.is_available() else None,
                            trust_remote_code=True,
                            low_cpu_mem_usage=True
                        )
                        # Load PEFT adapter
                        print("[MODEL] Loading PEFT adapter from tuned directory...")
                        self._model = PeftModel.from_pretrained(
                            base_model,
                            model_path,
                            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
                        )
                    else:
                        print(f"[MODEL] ❌ Local base model not found at: {base_model_path}")
                        print(f"[MODEL] ❌ Cannot load PEFT adapter without local base model.")
                        print(f"[MODEL] Please ensure base model is available locally or use merged model.")
                        print(f"[MODEL] Proposal generation will use placeholder responses.")
                        with self._load_lock:
                            self._is_loaded = False
                            self._is_loading = False
                        return

            # Set padding token if not set
            if self._tokenizer.pad_token is None:
                self._tokenizer.pad_token = self._tokenizer.eos_token

            # Set to evaluation mode
            self._model.eval()

            # Move to CPU if no GPU (for Docker environments)
            if DEPENDENCIES_AVAILABLE and not torch.cuda.is_available():
                self._model = self._model.to("cpu")

            # Thread-safe update of loading state
            with self._load_lock:
                self._is_loaded = True
                self._is_loading = False
            print("[MODEL] ✓ Proposal generator model loaded successfully!")

        except Exception as e:
            print(f"[MODEL] ✗ Error loading proposal generator model: {e}")
            print(f"[MODEL] Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            # Thread-safe update of loading state
            with self._load_lock:
                self._is_loaded = False
                self._is_loading = False
            print("[MODEL] Model will use fallback responses until issue is resolved")

    def is_available(self) -> bool:
        """Check if model is loaded and available (thread-safe)."""
        with self._load_lock:
            return self._is_loaded and self._model is not None and self._tokenizer is not None

    def is_loading(self) -> bool:
        """Check if model is currently loading (thread-safe)."""
        with self._load_lock:
            return self._is_loading

    def ensure_loaded(self, timeout: int = 120):
        """Ensure model is loaded, waiting if necessary or loading synchronously."""
        # If already loaded, return immediately
        if self.is_available():
            return True

        # If loading in background, wait for it
        if self.is_loading():
            print("[MODEL] Waiting for background loading to complete...")
            import time
            waited = 0
            while self.is_loading() and waited < timeout:
                time.sleep(1)
                waited += 1
                if waited % 10 == 0:
                    print(f"[MODEL] Still loading... ({waited}s)")

            if self.is_available():
                return True

        # If still not loaded, force synchronous load
        if not self.is_available():
            print("[MODEL] Force loading model synchronously from merged directory...")
            try:
                self._load_model()
                return self.is_available()
            except Exception as e:
                print(f"[MODEL] Failed to load model: {e}")
                return False

        return False

    def generate(
        self,
        prompt: str,
        tone: str = "Professional",
        max_length: int = 1000,
        temperature: float = 0.7,
        top_p: float = 0.9,
        do_sample: bool = True
    ) -> str:
        """
        Generate a proposal based on the prompt.

        Args:
            prompt: The input prompt for proposal generation
            tone: The desired tone (Professional, Casual, Persuasive, Formal)
            max_length: Maximum length of generated text
            temperature: Sampling temperature (higher = more creative)
            top_p: Nucleus sampling parameter
            do_sample: Whether to use sampling

        Returns:
            Generated proposal text
        """
        if not self.is_available():
            # Return placeholder if model not available
            return self._generate_placeholder(prompt, tone)

        try:
            # Format prompt with tone instruction
            formatted_prompt = self._format_prompt(prompt, tone)

            # Tokenize input (matching notebook - no truncation)
            inputs = self._tokenizer(
                formatted_prompt,
                return_tensors="pt"
            )

            # Move to same device as model (matching notebook: .to(model.device))
            device = next(self._model.parameters()).device
            inputs = inputs.to(device)

            # Generate with settings optimized for low memory usage
            with torch.no_grad():
                # Reduce max tokens for CPU to save memory (CPU is slower anyway)
                if torch.cuda.is_available():
                    optimized_max_tokens = min(max_length, 700)  # GPU can handle more
                else:
                    # CPU: Reduce tokens significantly to save memory and improve speed
                    optimized_max_tokens = min(max_length, 300)  # Reduced from 700 to 300 for CPU
                    print("[GENERATE] CPU mode: Reduced max_tokens to 300 for lower memory usage")

                # Generation parameters optimized for memory efficiency
                generation_kwargs = {
                    **inputs,
                    "max_new_tokens": optimized_max_tokens,
                    "temperature": temperature,
                    "top_p": top_p,
                    "do_sample": do_sample,
                    "repetition_penalty": 1.1,
                    "pad_token_id": self._tokenizer.eos_token_id,
                }

                # GPU optimizations (faster, less CPU memory)
                if torch.cuda.is_available():
                    generation_kwargs.update({
                        "use_cache": True,  # Enable KV cache for faster generation on GPU
                    })
                    print(f"[GENERATE] Using GPU: {torch.cuda.get_device_name(0)}")
                else:
                    # CPU optimizations (save memory and improve performance)
                    generation_kwargs.update({
                        "use_cache": False,  # Disable KV cache to save CPU memory
                        "num_beams": 1,  # Disable beam search (saves memory)
                    })
                    print("[GENERATE] Using CPU (optimized for low memory)")

                    # Force garbage collection before generation to free memory
                    import gc
                    gc.collect()

                outputs = self._model.generate(**generation_kwargs)

            # Decode generated text
            generated_text = self._tokenizer.decode(
                outputs[0],
                skip_special_tokens=True
            )

            # Free memory immediately after decoding (CPU optimization)
            if not torch.cuda.is_available():
                import gc
                del outputs
                gc.collect()

            # Extract only the assistant response (matching notebook extraction)
            if "assistant<|end_header_id|>" in generated_text:
                generated_text = generated_text.split("assistant<|end_header_id|>")[-1].strip()
            elif formatted_prompt in generated_text:
                generated_text = generated_text.split(formatted_prompt, 1)[-1].strip()

            return generated_text

        except Exception as e:
            print(f"Error during proposal generation: {e}")
            import traceback
            traceback.print_exc()
            # Fallback to placeholder
            return self._generate_placeholder(prompt, tone)

    def _format_prompt(self, prompt: str, tone: str) -> str:
        """Format the prompt with tone instruction - matching notebook format with enhanced logic."""
        tone_instruction = {
            "Professional": "You are an expert business and project proposal writer. Generate professional, compelling, and domain-specific proposals that highlight available options and follow industry best practices.",
            "Casual": "You are a friendly proposal writer. Write a casual and approachable proposal that highlights available options.",
            "Persuasive": "You are an expert persuasive proposal writer. Write a compelling and convincing proposal that highlights available options.",
            "Formal": "You are an expert formal proposal writer. Write a formal and official proposal that highlights available options."
        }.get(tone, "You are an expert business and project proposal writer. Generate professional, compelling, and domain-specific proposals that highlight available options and follow industry best practices.")

        # Use system header (not user header) as in notebook
        formatted = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>

{tone_instruction}

### STRICT REQUIREMENTS:
- Every proposal must be clear, well-structured, and professional.
- Use domain-specific vocabulary appropriately.
- Avoid repeating phrases; each proposal should look unique.
- Proposals must include objectives, methodology/approach, expected outcomes, and summary/recommendations.
- Maintain a polished, formal business tone.
- **CRITICAL**: Clearly highlight and compare all available options mentioned in the request.
- **CRITICAL**: Follow proposal writing best practices (executive summary, detailed sections, recommendations, call to action).

Instruction:

{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

"""
        return formatted

    def _generate_placeholder(self, prompt: str, tone: str) -> str:
        """Generate a placeholder response when model is not available."""
        from datetime import datetime

        # Check if model is loading in background
        loading_status = ""
        if self.is_loading():
            loading_status = "\n[Status: Model is loading in background thread. Please try again in a few moments.]"
        elif not self.is_available():
            loading_status = "\n[Status: Model is not available. Check logs for errors.]"

        return f"""Proposal — {tone} Tone
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Prompt: {prompt}

---

[Model Integration Note: The fine-tuned model is being loaded in a background thread or is unavailable.
This is a placeholder response. Once the model is fully loaded, actual AI-generated
proposals will be provided automatically.]{loading_status}

For now, please ensure:
1. The model files are in the correct location
2. Required dependencies are installed: transformers, torch, peft, accelerate
3. Sufficient memory is available for model loading

The model location should be:
backend/ai/proposal_generator/model/
"""

