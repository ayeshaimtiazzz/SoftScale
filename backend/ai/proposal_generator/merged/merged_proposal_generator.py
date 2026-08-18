"""Merged Model Proposal Generator.

This module provides proposal generation using the merged model (base + adapter combined).
The merged model loads faster and provides the same quality as the PEFT adapter.
"""
import os
import threading
from typing import Optional

# Lazy imports - handle missing dependencies gracefully
try:
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    DEPENDENCIES_AVAILABLE = True
except ImportError as e:
    DEPENDENCIES_AVAILABLE = False
    IMPORT_ERROR = str(e)

from config import settings


class MergedProposalGenerator:
    """Service for generating proposals using the merged model.

    The merged model is a single model file that combines the base model
    and PEFT adapter, providing faster loading and the same generation quality.
    """

    _model = None
    _tokenizer = None
    _is_loading = False
    _is_loaded = False
    _load_thread = None
    _load_lock = threading.Lock()

    def __init__(self):
        """Initialize the merged model generator and start background loading."""
        with self._load_lock:
            if not self._is_loaded and not self._is_loading and self._load_thread is None:
                print("[MERGED_MODEL] Starting background loading of merged model...")
                self._load_thread = threading.Thread(
                    target=self._load_merged_model,
                    daemon=True,
                    name="MergedModelLoader"
                )
                self._load_thread.start()
                print("[MERGED_MODEL] Background loading thread started.")

    def _load_merged_model(self):
        """Load the merged model from the merged folder."""
        if not DEPENDENCIES_AVAILABLE:
            print(f"[MERGED_MODEL] ERROR: Required dependencies not installed: {IMPORT_ERROR}")
            with self._load_lock:
                self._is_loaded = False
                self._is_loading = False
            return

        with self._load_lock:
            if self._is_loaded:
                return
            self._is_loading = True

        try:
            merged_model_path = settings.PROPOSAL_MERGED_MODEL_PATH

            print(f"[MERGED_MODEL] ===== Loading Merged Model =====")
            print(f"[MERGED_MODEL] Merged model path: {merged_model_path}")
            print(f"[MERGED_MODEL] Current working directory: {os.getcwd()}")
            print(f"[MERGED_MODEL] BASE_DIR from settings: {settings.BASE_DIR if hasattr(settings, 'BASE_DIR') else 'N/A'}")
            print(f"[MERGED_MODEL] Path exists: {os.path.exists(merged_model_path)}")

            if not os.path.exists(merged_model_path):
                print(f"[MERGED_MODEL] ERROR: Merged model path not found: {merged_model_path}")
                # Try alternative paths (Docker vs local)
                alternative_paths = []
                if hasattr(settings, 'BASE_DIR'):
                    alternative_paths.append(os.path.join(settings.BASE_DIR, "ai", "proposal_generator", "model", "merged"))
                alternative_paths.extend([
                    "/app/ai/proposal_generator/model/merged",  # Docker path
                    os.path.join(os.getcwd(), "ai", "proposal_generator", "model", "merged"),
                    os.path.join(os.getcwd(), "backend", "ai", "proposal_generator", "model", "merged")
                ])

                for alt_path in alternative_paths:
                    if alt_path and os.path.exists(alt_path) and os.path.exists(os.path.join(alt_path, "config.json")):
                        print(f"[MERGED_MODEL] Found alternative path: {alt_path}")
                        merged_model_path = alt_path
                        break
                else:
                    print(f"[MERGED_MODEL] No valid model path found in any alternative location")
                    print(f"[MERGED_MODEL] Tried paths: {alternative_paths}")
                    with self._load_lock:
                        self._is_loaded = False
                        self._is_loading = False
                    return

            if not os.path.exists(os.path.join(merged_model_path, "config.json")):
                print(f"[MERGED_MODEL] ERROR: config.json not found in merged model directory!")
                if os.path.exists(merged_model_path):
                    try:
                        dir_contents = os.listdir(merged_model_path)
                        print(f"[MERGED_MODEL] Directory contents: {dir_contents[:10]}")  # Show first 10 items
                    except:
                        pass
                with self._load_lock:
                    self._is_loaded = False
                    self._is_loading = False
                return

            print(f"[MERGED_MODEL] Merged model directory found")
            print(f"[MERGED_MODEL] Loading merged model (faster than adapter)...")

            # Check CUDA availability
            cuda_available = torch.cuda.is_available()
            device = "cuda" if cuda_available else "cpu"
            dtype = torch.float16 if cuda_available else torch.float32

            if cuda_available:
                print(f"[MERGED_MODEL] Using GPU: {torch.cuda.get_device_name(0)}")
            else:
                print(f"[MERGED_MODEL] Using CPU (will be slower)")

            # Load merged model (single file, faster loading)
            self._tokenizer = AutoTokenizer.from_pretrained(
                merged_model_path,
                trust_remote_code=True,
                use_fast=True,
                local_files_only=True,
                cache_dir=settings.HF_CACHE_DIR,
            )

            self._model = AutoModelForCausalLM.from_pretrained(
                merged_model_path,
                device_map=device if device == "cuda" else None,
                torch_dtype=dtype,
                trust_remote_code=True,
                low_cpu_mem_usage=True,
                use_safetensors=True,
                local_files_only=True
                ,
                cache_dir=settings.HF_CACHE_DIR
            )

            if device == "cpu":
                self._model = self._model.to("cpu")

            # Set padding token if needed
            if self._tokenizer.pad_token is None:
                self._tokenizer.pad_token = self._tokenizer.eos_token

            self._model.eval()

            with self._load_lock:
                self._is_loaded = True
                self._is_loading = False

            print(f"[MERGED_MODEL] Merged model loaded successfully!")
            print(f"[MERGED_MODEL] Model device: {next(self._model.parameters()).device}")

        except Exception as e:
            print(f"[MERGED_MODEL] ERROR: Error loading merged model: {e}")
            print(f"[MERGED_MODEL] Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()

            # Log more details about the error
            error_str = str(e).lower()
            if "cuda" in error_str:
                print("[MERGED_MODEL] CUDA-related error detected. Model may need CPU mode.")
            if "memory" in error_str or "out of memory" in error_str:
                print("[MERGED_MODEL] Memory-related error detected. May need more RAM or use CPU.")
            if "no such file" in error_str or "not found" in error_str:
                print("[MERGED_MODEL] File not found error. Check model path and files.")
            if "permission" in error_str:
                print("[MERGED_MODEL] Permission error. Check file permissions.")

            with self._load_lock:
                self._is_loaded = False
                self._is_loading = False

    def is_available(self) -> bool:
        """Check if merged model is loaded and available."""
        with self._load_lock:
            return self._is_loaded and self._model is not None and self._tokenizer is not None

    def is_loading(self) -> bool:
        """Check if merged model is currently loading."""
        with self._load_lock:
            return self._is_loading

    def ensure_loaded(self, timeout: int = 120):
        """Ensure merged model is loaded, waiting if necessary."""
        if self.is_available():
            return True

        # Check if model is currently loading in background
        if self.is_loading():
            print("[MERGED_MODEL] Waiting for background loading to complete...")
            import time
            waited = 0
            while self.is_loading() and waited < timeout:
                time.sleep(1)
                waited += 1
                if waited % 10 == 0:
                    print(f"[MERGED_MODEL] Still loading... ({waited}s)")

                # Check if it became available during wait
                if self.is_available():
                    print(f"[MERGED_MODEL] Model loaded after waiting {waited}s")
                    return True

            # Timeout reached - check if it finished loading
            if self.is_available():
                print(f"[MERGED_MODEL] Model loaded (timeout: {timeout}s)")
                return True
            else:
                print(f"[MERGED_MODEL] WARNING: Timeout reached ({timeout}s) but model still not loaded")
                # Don't force load if background thread is still running
                if self.is_loading():
                    print("[MERGED_MODEL] Background thread still running, waiting a bit more...")
                    # Give it a bit more time
                    time.sleep(5)
                    if self.is_available():
                        return True
                return False

        # Model is not loading and not available - force load synchronously
        if not self.is_available():
            print("[MERGED_MODEL] Model not loading, force loading merged model synchronously...")
            try:
                self._load_merged_model()
                # Give it a moment after loading
                import time
                time.sleep(1)
                return self.is_available()
            except Exception as e:
                print(f"[MERGED_MODEL] ERROR during force load: {e}")
                import traceback
                traceback.print_exc()
                return False

        return False

    def generate_proposal(
        self,
        prompt: str,
        tone: str = "Professional",
        max_length: int = 700,
        temperature: float = 0.7,
        top_p: float = 0.9,
        do_sample: bool = True
    ) -> str:
        """
        Generate a proposal using the merged model.

        Args:
            prompt: The enhanced prompt (already formatted with options, template info, etc.)
            tone: The desired tone (Professional, Casual, Persuasive, Formal)
            max_length: Maximum tokens to generate
            temperature: Sampling temperature
            top_p: Nucleus sampling parameter
            do_sample: Whether to use sampling

        Returns:
            Generated proposal text
        """
        if not self.is_available():
            return self._generate_placeholder(prompt, tone)

        try:
            # Format prompt with tone instruction
            formatted_prompt = self._format_prompt(prompt, tone)

            # Tokenize input
            inputs = self._tokenizer(
                formatted_prompt,
                return_tensors="pt"
            )

            # Move to same device as model
            device = next(self._model.parameters()).device
            inputs = inputs.to(device)

            # Generate with optimized settings
            with torch.no_grad():
                if torch.cuda.is_available():
                    optimized_max_tokens = min(max_length, 700)
                else:
                    optimized_max_tokens = min(max_length, 500)
                    print("[MERGED_MODEL] CPU mode: Using optimized max_tokens")

                generation_kwargs = {
                    **inputs,
                    "max_new_tokens": optimized_max_tokens,
                    "temperature": temperature,
                    "top_p": top_p,
                    "do_sample": do_sample,
                    "repetition_penalty": 1.1,
                    "pad_token_id": self._tokenizer.eos_token_id,
                }

                if torch.cuda.is_available():
                    generation_kwargs["use_cache"] = True
                else:
                    generation_kwargs["use_cache"] = False
                    import gc
                    gc.collect()

                outputs = self._model.generate(**generation_kwargs)

            # Decode generated text
            generated_text = self._tokenizer.decode(
                outputs[0],
                skip_special_tokens=True
            )

            # Free memory (CPU optimization)
            if not torch.cuda.is_available():
                import gc
                del outputs
                gc.collect()

            # Extract assistant response - remove prompt and system instructions
            if "assistant<|end_header_id|>" in generated_text:
                generated_text = generated_text.split("assistant<|end_header_id|>")[-1].strip()
            elif formatted_prompt in generated_text:
                generated_text = generated_text.split(formatted_prompt, 1)[-1].strip()

            # Clean up - remove any remaining prompt artifacts
            # Remove any lines that look like instructions or requirements
            lines = generated_text.split('\n')
            cleaned_lines = []
            skip_patterns = ['###', 'STRICT REQUIREMENTS', 'Instruction:', 'PROPOSAL BEST PRACTICES', 'REQUIREMENTS:', 'TEMPLATE INFORMATION', 'PROJECT REQUEST', 'SPECIFICATIONS']

            for line in lines:
                # Skip lines that are clearly part of the prompt/instructions
                if any(pattern in line for pattern in skip_patterns):
                    continue
                # Skip lines that are just separators or metadata
                if line.strip() in ['---', ''] and len(cleaned_lines) > 0:
                    continue
                cleaned_lines.append(line)

            generated_text = '\n'.join(cleaned_lines).strip()

            # If we still have the prompt in the output, try to extract just the proposal part
            if "PROPOSAL BEST PRACTICES" in generated_text or "REQUIREMENTS:" in generated_text:
                # Find where the actual proposal starts (after all instructions)
                proposal_start = max(
                    generated_text.find("Executive Summary"),
                    generated_text.find("1."),
                    generated_text.find("Introduction"),
                    generated_text.find("Overview")
                )
                if proposal_start > 0:
                    generated_text = generated_text[proposal_start:].strip()

            return generated_text

        except Exception as e:
            print(f"[MERGED_MODEL] Error during generation: {e}")
            import traceback
            traceback.print_exc()
            return self._generate_placeholder(prompt, tone)

    def _format_prompt(self, prompt: str, tone: str) -> str:
        """Format the prompt with tone instruction - optimized for merged model."""
        tone_instruction = {
            "Professional": "You are an expert business and project proposal writer. Generate professional, compelling, and domain-specific proposals that highlight available options and follow industry best practices.",
            "Casual": "You are a friendly proposal writer. Write a casual and approachable proposal that highlights available options.",
            "Persuasive": "You are an expert persuasive proposal writer. Write a compelling and convincing proposal that highlights available options.",
            "Formal": "You are an expert formal proposal writer. Write a formal and official proposal that highlights available options."
        }.get(tone, "You are an expert business and project proposal writer. Generate professional, compelling, and domain-specific proposals that highlight available options and follow industry best practices.")

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
        """Generate a placeholder response when merged model is not available."""
        from datetime import datetime

        loading_status = ""
        if self.is_loading():
            loading_status = "The merged model is currently loading. Please try again in a few moments."
        elif not self.is_available():
            loading_status = "The merged model is not available. Please check the server logs for details."

        # Return a simple placeholder without exposing the prompt
        return f"""Proposal — {tone} Tone
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

{loading_status}

Please ensure:
1. The merged model files are in: {settings.PROPOSAL_MERGED_MODEL_PATH}
2. Required dependencies are installed (torch, transformers)
3. Sufficient system resources are available

Once the model is loaded, AI-generated proposals will be provided automatically.
"""


# Singleton instance
_merged_generator = None
_merged_generator_lock = threading.Lock()


def get_merged_proposal_generator() -> MergedProposalGenerator:
    """Get the singleton instance of MergedProposalGenerator."""
    global _merged_generator
    with _merged_generator_lock:
        if _merged_generator is None:
            _merged_generator = MergedProposalGenerator()
        return _merged_generator

