"""Proposal Generator Model Service.

Fine-tuned LLM for generating proposals based on prompts and templates.
"""
import os
import torch
import threading
from typing import Optional
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel
from config import settings
from ai.base import BaseModelService


class ProposalGeneratorService(BaseModelService):
    """Service for loading and using the fine-tuned proposal generation model.

    Uses a fine-tuned Llama-3.2-3B-Instruct model with PEFT adapter
    for generating professional proposals.
    """

    _model = None
    _tokenizer = None
    _is_loaded = False  # Instance-level flag (overrides base class)
    _is_loading = False  # Flag to track if model is currently loading
    _lock = threading.Lock()  # Thread lock for model access
    _load_lock = threading.Lock()  # Lock specifically for model loading

    def __init__(self):
        """Initialize the model service."""
        # Call parent init first
        super().__init__()
        # Debug: Print the actual setting value
        print(f"[MODEL] ENABLE_PROPOSAL_MODEL setting value: {settings.ENABLE_PROPOSAL_MODEL}")
        print(f"[MODEL] Environment variable ENABLE_PROPOSAL_MODEL: {os.getenv('ENABLE_PROPOSAL_MODEL', 'NOT SET')}")
        # Only load if not already loaded and model is enabled
        if not self._is_loaded and settings.ENABLE_PROPOSAL_MODEL:
            print("[MODEL] ProposalGeneratorService: Model enabled, will load on first use")
        elif not settings.ENABLE_PROPOSAL_MODEL:
            print("[MODEL] ProposalGeneratorService: Model disabled in settings")

    def _get_model_path(self) -> str:
        """Get the path to the fine-tuned model."""
        # Use the model path from settings (already configured correctly)
        return settings.PROPOSAL_MODEL_PATH

    def _load_model(self):
        """Load the fine-tuned model and tokenizer."""
        # Check if model is enabled in settings
        if not settings.ENABLE_PROPOSAL_MODEL:
            print("Proposal model is disabled in settings, skipping load")
            self._is_loaded = False
            return

        # Prevent concurrent loading attempts
        with self._load_lock:
            if self._is_loading:
                print("Model is already loading, skipping duplicate load attempt")
                return
            if self._is_loaded:
                print("Model is already loaded, skipping")
                return

            self._is_loading = True

        try:
            model_path = self._get_model_path()
            base_model_name = settings.PROPOSAL_BASE_MODEL_NAME
            base_model_path = settings.PROPOSAL_BASE_MODEL_PATH

            print(f"[MODEL LOAD] Model path from settings: {model_path}")
            print(f"[MODEL LOAD] Model path exists: {os.path.exists(model_path)}")
            if os.path.exists(model_path):
                files = os.listdir(model_path)
                print(f"[MODEL LOAD] Files in model directory: {files}")

            if not os.path.exists(model_path):
                print(f"[ERROR] Model adapter path not found: {model_path}")
                print(f"[ERROR] Expected path: {os.path.abspath(model_path)}")
                print("  Proposal generation will use placeholder responses.")
                self._is_loaded = False
                return

            # Verify adapter files exist
            adapter_file = os.path.join(model_path, "adapter_model.safetensors")
            adapter_config = os.path.join(model_path, "adapter_config.json")
            if not os.path.exists(adapter_file):
                print(f"[ERROR] Adapter model file not found: {adapter_file}")
                self._is_loaded = False
                return
            if not os.path.exists(adapter_config):
                print(f"[ERROR] Adapter config file not found: {adapter_config}")
                self._is_loaded = False
                return

            print(f"[MODEL LOAD] Loading proposal generator model from: {model_path}")
            print(f"[MODEL LOAD] Adapter file found: {adapter_file}")
            print(f"[MODEL LOAD] Adapter config found: {adapter_config}")

            # Check if base model is stored locally
            base_model_local = os.path.exists(base_model_path) and os.path.exists(
                os.path.join(base_model_path, "config.json")
            )

            # Load tokenizer - try local first, then adapter directory, then download
            if base_model_local:
                print("Loading tokenizer from local base model...")
                try:
                    self._tokenizer = AutoTokenizer.from_pretrained(
                        base_model_path,
                        trust_remote_code=True,
                        local_files_only=True
                    )
                    print("Tokenizer loaded from local base model!")
                except Exception as e:
                    print(f"Could not load from local base model: {e}")
                    # Try adapter directory
                    tokenizer_path = os.path.join(model_path, "tokenizer.json")
                    if os.path.exists(tokenizer_path):
                        self._tokenizer = AutoTokenizer.from_pretrained(
                            model_path,
                            trust_remote_code=True,
                            local_files_only=True
                        )
                        print("Tokenizer loaded from adapter directory!")
                    else:
                        raise
            else:
                # Try adapter directory tokenizer
                tokenizer_path = os.path.join(model_path, "tokenizer.json")
                if os.path.exists(tokenizer_path):
                    print("Loading tokenizer from adapter directory...")
                    try:
                        self._tokenizer = AutoTokenizer.from_pretrained(
                            model_path,
                            trust_remote_code=True,
                            local_files_only=True
                        )
                        print("Tokenizer loaded from adapter directory!")
                    except Exception as e:
                        print(f"Could not load local tokenizer: {e}")
                        print("Falling back to downloading from HuggingFace...")
                        self._tokenizer = AutoTokenizer.from_pretrained(
                            base_model_name,
                            trust_remote_code=True
                        )
                else:
                    # Load from HuggingFace (will use cache if available)
                    print("Loading tokenizer from HuggingFace (using cache if available)...")
                    self._tokenizer = AutoTokenizer.from_pretrained(
                        base_model_name,
                        trust_remote_code=True
                    )

            # Set padding token if not set
            if self._tokenizer.pad_token is None:
                self._tokenizer.pad_token = self._tokenizer.eos_token

            # Load base model - use local if available, otherwise download
            # Use memory mapping and direct device loading for faster startup
            dtype = torch.float16 if torch.cuda.is_available() else torch.float32
            device_map = "auto" if torch.cuda.is_available() else None

            # Setup quantization if enabled (faster loading, less memory)
            quantization_config = None
            if settings.USE_QUANTIZATION and torch.cuda.is_available():
                print("Using 8-bit quantization for faster loading and less memory...")
                quantization_config = BitsAndBytesConfig(
                    load_in_8bit=True,
                    llm_int8_threshold=6.0
                )

            if base_model_local:
                print("Loading base model from local filesystem...")
                load_kwargs = {
                    "dtype": dtype,
                    "device_map": device_map,
                    "trust_remote_code": True,
                    "local_files_only": True,
                    "low_cpu_mem_usage": True,
                    "torch_dtype": dtype
                }
                if quantization_config:
                    load_kwargs["quantization_config"] = quantization_config

                base_model = AutoModelForCausalLM.from_pretrained(
                    base_model_path,
                    **load_kwargs
                )
                print("Base model loaded from local filesystem!")
            else:
                print("Loading base model from HuggingFace...")
                print("WARNING: This will download ~6GB if not cached. Consider storing base model locally.")
                load_kwargs = {
                    "dtype": dtype,
                    "device_map": device_map,
                    "trust_remote_code": True,
                    "low_cpu_mem_usage": True,
                    "torch_dtype": dtype
                }
                if quantization_config:
                    load_kwargs["quantization_config"] = quantization_config

                base_model = AutoModelForCausalLM.from_pretrained(
                    base_model_name,
                    **load_kwargs
                )
                print("Base model loaded from HuggingFace!")

            # Load PEFT adapter (your trained model)
            print(f"[MODEL LOAD] Loading PEFT adapter from: {model_path}")
            print(f"[MODEL LOAD] This is the TUNED model (updated version)")
            self._model = PeftModel.from_pretrained(
                base_model,
                model_path,
                dtype=dtype
            )
            print(f"[MODEL LOAD] PEFT adapter loaded successfully from tuned model!")

            # Set to evaluation mode (faster inference)
            self._model.eval()

            # Keep on GPU if available (much faster), otherwise move to CPU
            if not torch.cuda.is_available():
                print("No GPU available, moving model to CPU...")
                self._model = self._model.to("cpu")
            else:
                print("Model loaded on GPU - ready for fast inference!")

            self._is_loaded = True
            print("=" * 60)
            print("[MODEL LOAD] Proposal generator model loaded successfully!")
            print(f"[MODEL LOAD] Using TUNED model from: {model_path}")
            print(f"[MODEL LOAD] Model is ready for inference")
            print("=" * 60)

        except Exception as e:
            print(f"Error loading proposal generator model: {e}")
            import traceback
            traceback.print_exc()
            self._is_loaded = False
        finally:
            with self._load_lock:
                self._is_loading = False

    def is_available(self) -> bool:
        """Check if model is loaded and available."""
        # Don't use model if it's currently loading
        if self._is_loading:
            return False
        return self._is_loaded and self._model is not None and self._tokenizer is not None

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
            print("[MODEL] Model not available, returning placeholder")
            print(f"[MODEL] is_loaded: {self._is_loaded}, is_loading: {self._is_loading}")
            print(f"[MODEL] model exists: {self._model is not None}, tokenizer exists: {self._tokenizer is not None}")
            return self._generate_placeholder(prompt, tone)

        # Use lock to ensure thread-safe model access
        model_path = self._get_model_path()
        print(f"[MODEL] Using TUNED model for generation from: {model_path}")
        print("[MODEL] Starting proposal generation with trained model...")
        with self._lock:
            try:
                # Format prompt with tone instruction
                formatted_prompt = self._format_prompt(prompt, tone)

                # Tokenize input
                inputs = self._tokenizer(
                    formatted_prompt,
                    return_tensors="pt",
                    truncation=True,
                    max_length=512  # Limit input length
                )

                # Move to same device as model
                device = next(self._model.parameters()).device
                inputs = {k: v.to(device) for k, v in inputs.items()}

                # Generate with optimized parameters for faster inference
                # Use greedy decoding (faster than sampling) and limit tokens
                with torch.no_grad():
                    outputs = self._model.generate(
                        **inputs,
                        max_new_tokens=min(max_length, 300),  # Reduced to 300 tokens for faster generation
                        temperature=0.7 if do_sample else 0.0,  # Lower temp = faster
                        top_p=top_p if do_sample else 1.0,
                        do_sample=do_sample,
                        pad_token_id=self._tokenizer.pad_token_id,
                        eos_token_id=self._tokenizer.eos_token_id,
                        repetition_penalty=1.1,
                        num_beams=1,  # Greedy decoding (fastest)
                        early_stopping=True,
                        use_cache=True  # Use KV cache for speed
                    )

                # Decode generated text
                generated_text = self._tokenizer.decode(
                    outputs[0],
                    skip_special_tokens=True
                )

                # Extract only the new text (remove input prompt)
                if formatted_prompt in generated_text:
                    generated_text = generated_text.split(formatted_prompt, 1)[-1].strip()

                print(f"[MODEL] Generation complete. Output length: {len(generated_text)} characters")
                return generated_text

            except Exception as e:
                print(f"Error during proposal generation: {e}")
                import traceback
                traceback.print_exc()
                # Fallback to placeholder
                return self._generate_placeholder(prompt, tone)

    def _format_prompt(self, prompt: str, tone: str) -> str:
        """Format the prompt with tone instruction."""
        tone_instruction = {
            "Professional": "Write a professional and formal proposal.",
            "Casual": "Write a friendly and casual proposal.",
            "Persuasive": "Write a persuasive and compelling proposal.",
            "Formal": "Write a formal and official proposal."
        }.get(tone, "Write a professional proposal.")

        formatted = f"""<|begin_of_text|><|start_header_id|>user<|end_header_id|>

{tone_instruction}

{prompt}

<|eot_id|><|start_header_id|>assistant<|end_header_id|>

"""
        return formatted

    def _generate_placeholder(self, prompt: str, tone: str) -> str:
        """Generate a placeholder response when model is not available."""
        from datetime import datetime

        return f"""Proposal — {tone} Tone
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Prompt: {prompt}

---

[Model Integration Note: The fine-tuned model is being loaded or is unavailable.
This is a placeholder response. Once the model is fully loaded, actual AI-generated
proposals will be provided.]

For now, please ensure:
1. The model files are in the correct location
2. Required dependencies are installed: transformers, torch, peft, accelerate
3. Sufficient memory is available for model loading

The model location should be:
backend/ai/proposal_generator/model/
"""

