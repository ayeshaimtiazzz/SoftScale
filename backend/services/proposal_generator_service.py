"""Proposal Generator Model Service.

Fine-tuned LLM for generating proposals based on prompts and templates.
"""
import os
import torch
from typing import Optional
from transformers import AutoTokenizer, AutoModelForCausalLM
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

    def _get_model_path(self) -> str:
        """Get the path to the fine-tuned model."""
        # Use the model path from settings (already configured correctly)
        return settings.PROPOSAL_MODEL_PATH

    def _load_model(self):
        """Load the fine-tuned model and tokenizer."""
        try:
            model_path = self._get_model_path()
            base_model_name = settings.PROPOSAL_BASE_MODEL_NAME

            if not os.path.exists(model_path):
                print(f"Warning: Model path not found: {model_path}")
                print("  Proposal generation will use placeholder responses.")
                self._is_loaded = False
                return

            print(f"Loading proposal generator model from: {model_path}")

            # Load tokenizer
            self._tokenizer = AutoTokenizer.from_pretrained(
                base_model_name,
                trust_remote_code=True
            )

            # Set padding token if not set
            if self._tokenizer.pad_token is None:
                self._tokenizer.pad_token = self._tokenizer.eos_token

            # Load base model
            print("Loading base model...")
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None,
                trust_remote_code=True,
                low_cpu_mem_usage=True
            )

            # Load PEFT adapter
            print("Loading PEFT adapter...")
            self._model = PeftModel.from_pretrained(
                base_model,
                model_path,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
            )

            # Set to evaluation mode
            self._model.eval()

            # Move to CPU if no GPU (for Docker environments)
            if not torch.cuda.is_available():
                self._model = self._model.to("cpu")

            self._is_loaded = True
            print("Proposal generator model loaded successfully!")

        except Exception as e:
            print(f"Error loading proposal generator model: {e}")
            import traceback
            traceback.print_exc()
            self._is_loaded = False

    def is_available(self) -> bool:
        """Check if model is loaded and available."""
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
            return self._generate_placeholder(prompt, tone)

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

            # Generate
            with torch.no_grad():
                outputs = self._model.generate(
                    **inputs,
                    max_new_tokens=max_length,
                    temperature=temperature,
                    top_p=top_p,
                    do_sample=do_sample,
                    pad_token_id=self._tokenizer.pad_token_id,
                    eos_token_id=self._tokenizer.eos_token_id,
                    repetition_penalty=1.1
                )

            # Decode generated text
            generated_text = self._tokenizer.decode(
                outputs[0],
                skip_special_tokens=True
            )

            # Extract only the new text (remove input prompt)
            if formatted_prompt in generated_text:
                generated_text = generated_text.split(formatted_prompt, 1)[-1].strip()

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

