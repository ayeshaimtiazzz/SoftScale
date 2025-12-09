"""Service for proposal generation and template management."""
from typing import List, Dict, Optional
from data.proposal_repository import ProposalRepository
from services.proposal_model_service import ProposalModelService
from services.proposal_generator_service import ProposalGeneratorService
from config import settings


class ProposalService:
    """Service for proposal-related business logic."""

    @staticmethod
    def get_all_templates(
        category: Optional[str] = None,
        domain: Optional[str] = None
    ) -> List[Dict]:
        """Get all proposal templates."""
        templates = ProposalRepository.get_all_templates(category=category, domain=domain)

        # Format templates for frontend
        formatted_templates = []
        for template in templates:
            formatted_templates.append({
                "id": f"tpl-{template['template_id']}",
                "template_id": template["template_id"],
                "title": template["title"],
                "category": template["category"] or "General",
                "description": template["description"] or "",
                "prompt": template["prompt"],
                "tags": template.get("tags", []),
                "domain": template.get("domain"),
                "tone": template.get("tone", "Professional"),
                "complexity": template.get("complexity", "Medium"),
                "metadata": template.get("metadata")
            })

        return formatted_templates

    @staticmethod
    def get_template_by_id(template_id: int) -> Optional[Dict]:
        """Get a specific template by ID."""
        template = ProposalRepository.get_template_by_id(template_id)
        if not template:
            return None

        return {
            "id": f"tpl-{template['template_id']}",
            "template_id": template["template_id"],
            "title": template["title"],
            "category": template["category"] or "General",
            "description": template["description"] or "",
            "prompt": template["prompt"],
            "content": template.get("content", ""),
            "tags": template.get("tags", []),
            "domain": template.get("domain"),
            "tone": template.get("tone", "Professional"),
            "complexity": template.get("complexity", "Medium"),
            "metadata": template.get("metadata")
        }

    @staticmethod
    def get_categories() -> List[str]:
        """Get all available categories."""
        return ProposalRepository.get_categories()

    @staticmethod
    def get_domains() -> List[str]:
        """Get all available domains."""
        return ProposalRepository.get_domains()

    @staticmethod
    def search_templates(query: str) -> List[Dict]:
        """Search templates by query."""
        templates = ProposalRepository.search_templates(query)

        formatted_templates = []
        for template in templates:
            formatted_templates.append({
                "id": f"tpl-{template['template_id']}",
                "template_id": template["template_id"],
                "title": template["title"],
                "category": template["category"] or "General",
                "description": template["description"] or "",
                "prompt": template["prompt"],
                "tags": template.get("tags", []),
                "domain": template.get("domain"),
                "tone": template.get("tone", "Professional"),
                "complexity": template.get("complexity", "Medium")
            })

        return formatted_templates

    @staticmethod
    def generate_proposal(
        prompt: str,
        tone: str = "Professional",
        template_id: Optional[int] = None,
        page_count: Optional[str] = None,
        cover_page: Optional[str] = "without",
        detail_level: Optional[str] = "detailed",
        max_length: int = 200  # Reduced default for faster generation (was 500)
    ) -> str:
        """
        Generate a proposal based on prompt and tone using the fine-tuned model.

        Args:
            prompt: User's proposal request
            tone: Desired tone (Professional, Casual, Persuasive, Formal)
            template_id: Optional template ID to enhance the prompt
            page_count: Page count specification (e.g., "1-page", "2-page")
            cover_page: Whether to include cover page ("with" or "without")
            detail_level: Level of detail ("detailed" or "summarized")
            max_length: Maximum length of generated proposal

        Returns:
            Generated proposal text
        """
        # Build enhanced prompt with specifications
        specifications = []

        if page_count:
            specifications.append(f"Length: {page_count}")

        if cover_page:
            cover_text = "Include a cover page" if cover_page == "with" else "Do not include a cover page"
            specifications.append(cover_text)

        if detail_level:
            detail_text = "Provide a long, detailed proposal" if detail_level == "detailed" else "Provide a concise, summarized proposal"
            specifications.append(detail_text)

        # If template_id is provided, enhance prompt with template context
        if template_id:
            template = ProposalRepository.get_template_by_id(template_id)
            if template:
                # Combine template prompt with user prompt
                base_prompt = f"{template['prompt']}\n\nUser Request: {prompt}"
            else:
                base_prompt = prompt
        else:
            base_prompt = prompt

        # Add specifications to the prompt (matching notebook format)
        if specifications:
            spec_text = "\n".join(specifications)
            enhanced_prompt = f"{base_prompt}\n\nRequirements:\n{spec_text}"
        else:
            enhanced_prompt = base_prompt

        # Ensure the prompt is ready for the model (will be formatted by ProposalGeneratorService)
        # The service will add system header and proper formatting

        # Use the fine-tuned model for generation
        try:
            # Check if model is enabled in settings first
            if not getattr(settings, 'ENABLE_PROPOSAL_MODEL', True):
                print("[FALLBACK] Model disabled in settings, using fallback response")
                return ProposalService._generate_fallback_proposal(enhanced_prompt, tone)

            # Get singleton instance (won't reload if already loaded)
            model_service = ProposalGeneratorService()

            # Quick check: if model is loading, don't wait - return fallback immediately
            if hasattr(model_service, 'is_loading') and model_service.is_loading():
                print("[FALLBACK] Model is currently loading in background, using fallback response")
                return ProposalService._generate_fallback_proposal(enhanced_prompt, tone)

            # Check if model is available (loaded and ready) - this should NOT trigger loading
            # Only check status, don't wait for loading
            if model_service.is_available():
                # Generate using the ACTUAL TRAINED MODEL (TUNED VERSION)
                try:
                    model_path = model_service._get_model_path()
                    print(f"[MODEL] Using TUNED model for proposal generation")
                    print(f"[MODEL] Model path: {model_path}")
                    print(f"[MODEL] Prompt: {enhanced_prompt[:100]}...")

                    # Use reasonable max_length - notebook uses 700 tokens for good proposals
                    optimized_max_length = min(max_length, 700)  # Match notebook default
                    print(f"[MODEL] Using max_length: {optimized_max_length} tokens")

                    # Generate with timing
                    import time
                    start_time = time.time()
                    proposal = model_service.generate(
                        prompt=enhanced_prompt,
                        tone=tone,
                        max_length=optimized_max_length,
                        temperature=0.7,
                        top_p=0.9
                    )
                    elapsed_time = time.time() - start_time
                    print(f"[MODEL] Generated proposal in {elapsed_time:.2f} seconds")
                    print(f"[MODEL] Generated proposal length: {len(proposal)} characters")
                    if proposal and len(proposal) > 200:
                        print(f"[MODEL] First 200 chars: {proposal[:200]}...")
                    return proposal
                except Exception as gen_error:
                    print(f"[ERROR] Error during model generation: {gen_error}")
                    import traceback
                    traceback.print_exc()
                    # Fallback on generation error
                    return ProposalService._generate_fallback_proposal(enhanced_prompt, tone)
            else:
                # Fallback to placeholder if model not available
                print(f"[FALLBACK] Model not available - using fallback response")
                is_loading = model_service.is_loading() if hasattr(model_service, 'is_loading') else False
                print(f"[FALLBACK] Model available: {model_service.is_available()}, Loading: {is_loading}")
                return ProposalService._generate_fallback_proposal(enhanced_prompt, tone)

        except Exception as e:
            print(f"[ERROR] Error generating proposal with model: {e}")
            import traceback
            traceback.print_exc()
            # Fallback to placeholder on error
            return ProposalService._generate_fallback_proposal(enhanced_prompt, tone)

    @staticmethod
    def _generate_fallback_proposal(prompt: str, tone: str) -> str:
        """Generate a fallback proposal when model is unavailable."""
        from datetime import datetime

        return f"""Proposal — {tone} Tone
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Prompt: {prompt}

---

[Note: The AI model is currently being loaded or is unavailable.
This is a fallback response. Please try again in a moment for AI-generated content.]

The proposal generation system is configured to use a fine-tuned Llama-3.2-3B-Instruct model
for generating professional proposals. If this message persists, please check:
1. Model files are in the correct location
2. Required dependencies are installed
3. Sufficient system resources are available
"""
