"""Service for proposal generation and template management."""
from typing import List, Dict, Optional, Any
from data.proposal_repository import ProposalRepository
from services.proposal_model_service import ProposalModelService
from services.proposal_generator_service import ProposalGeneratorService
from services.proposal_prompt_helper import (
    format_enhanced_prompt,
    build_template_info
)
from config import settings
import os


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
        max_length: int = 500,  # Reduced default for lower memory usage and faster CPU generation (was 200)
        custom_options: Optional[Dict[str, Any]] = None,
        project_info: Optional[Dict[str, Any]] = None,
        candidate_info: Optional[Dict[str, Any]] = None
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

        # Get template info if template_id is provided
        template_info = build_template_info(template_id) if template_id else None

        # Use enhanced prompt formatting that highlights options and follows best practices
        enhanced_prompt = format_enhanced_prompt(
            base_instruction=prompt,
            options=custom_options,
            template_info=template_info,
            candidate_info=candidate_info,
            project_info=project_info,
            specifications=specifications if specifications else None
        )

        # Ensure the prompt is ready for the model (will be formatted by ProposalGeneratorService)
        # The service will add system header and proper formatting

        # Use the fine-tuned model for generation
        try:
            # Check if model is enabled in settings first
            if not getattr(settings, 'ENABLE_PROPOSAL_MODEL', True):
                print("[FALLBACK] Model disabled in settings, using fallback response")
                return ProposalService._generate_fallback_proposal(enhanced_prompt, tone)

            # Jupyter generation logic commented out - using merged model instead
            # Check if Jupyter generation is enabled (alternative method)
            # use_jupyter = os.getenv("USE_JUPYTER_FOR_GENERATION", "false").lower() == "true"
            #
            # if use_jupyter:
            #     print("[MODEL] Using Jupyter for proposal generation...")
            #     try:
            #         from services.jupyter_proposal_service import JupyterProposalService
            #         result = JupyterProposalService.generate_proposal_via_jupyter(
            #             prompt=enhanced_prompt,
            #             tone=tone,
            #             max_tokens=min(max_length, 300)  # Reduced for CPU
            #         )
            #         if result.get("success"):
            #             print(f"[JUPYTER] Proposal generated successfully (device: {result.get('device', 'unknown')})")
            #             return result.get("proposal", "")
            #         else:
            #             print(f"[JUPYTER] Generation failed: {result.get('error')}")
            #             # Fall through to regular generation
            #     except Exception as jupyter_error:
            #         print(f"[JUPYTER] Error using Jupyter: {jupyter_error}")
            #         # Fall through to regular generation

            # Use merged model generator (faster loading, same quality)
            from ai.proposal_generator.model.merged.merged_proposal_generator import get_merged_proposal_generator

            merged_generator = get_merged_proposal_generator()

            # Ensure merged model is loaded (wait for background or load synchronously)
            if not merged_generator.is_available():
                print("[MERGED_MODEL] Merged model not loaded, ensuring it's loaded...")
                merged_generator.ensure_loaded(timeout=120)

            # Check if merged model is available now
            if merged_generator.is_available():
                # Generate using the MERGED MODEL (base + adapter combined)
                try:
                    from config import settings
                    merged_model_path = settings.PROPOSAL_MERGED_MODEL_PATH
                    print(f"[MERGED_MODEL] Using MERGED model for proposal generation")
                    print(f"[MERGED_MODEL] Merged model path: {merged_model_path}")
                    print(f"[MERGED_MODEL] Prompt: {enhanced_prompt[:100]}...")

                    # Use reasonable max_length - notebook uses 700 tokens for good proposals
                    optimized_max_length = min(max_length, 700)  # Match notebook default
                    print(f"[MERGED_MODEL] Using max_length: {optimized_max_length} tokens")

                    # Generate with timing
                    import time
                    start_time = time.time()
                    proposal = merged_generator.generate_proposal(
                        prompt=enhanced_prompt,
                        tone=tone,
                        max_length=optimized_max_length,
                        temperature=0.7,
                        top_p=0.9
                    )
                    elapsed_time = time.time() - start_time
                    print(f"[MERGED_MODEL] Generated proposal in {elapsed_time:.2f} seconds")
                    print(f"[MERGED_MODEL] Generated proposal length: {len(proposal)} characters")
                    if proposal and len(proposal) > 200:
                        print(f"[MERGED_MODEL] First 200 chars: {proposal[:200]}...")
                    return proposal
                except Exception as gen_error:
                    print(f"[MERGED_MODEL] Error during generation: {gen_error}")
                    import traceback
                    traceback.print_exc()
                    # Fallback on generation error
                    return ProposalService._generate_fallback_proposal(enhanced_prompt, tone)
            else:
                # Fallback to placeholder if merged model not available
                print(f"[MERGED_MODEL] Merged model not available - using fallback response")
                is_loading = merged_generator.is_loading() if hasattr(merged_generator, 'is_loading') else False
                print(f"[MERGED_MODEL] Merged model available: {merged_generator.is_available()}, Loading: {is_loading}")
                return ProposalService._generate_fallback_proposal(enhanced_prompt, tone)

        except Exception as e:
            print(f"[ERROR] Error generating proposal with model: {e}")
            import traceback
            traceback.print_exc()
            # Fallback to placeholder on error
            return ProposalService._generate_fallback_proposal(enhanced_prompt, tone)

    @staticmethod
    def _generate_fallback_proposal(prompt: str, tone: str) -> str:
        """Generate a fallback proposal when merged model is unavailable."""
        from datetime import datetime
        from config import settings

        return f"""Proposal — {tone} Tone (Generated using Merged Model)
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Prompt: {prompt}

---

[Note: The merged model (base + adapter combined) is currently being loaded or is unavailable.
This is a fallback response. Please try again in a moment for AI-generated content.]

The proposal generation system is configured to use the merged model for faster loading.
The merged model combines the base Llama-3.2-3B-Instruct model with the fine-tuned adapter
into a single model file for improved performance.

If this message persists, please check:
1. Merged model files are in the correct location: {settings.PROPOSAL_MERGED_MODEL_PATH}
2. Required dependencies are installed (torch, transformers)
3. Sufficient system resources are available
"""
